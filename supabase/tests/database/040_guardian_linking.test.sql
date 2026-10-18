-- Linking parent accounts to guardian records: verified-email matching and invite codes.
begin;
select plan(23);
select tests.create_fixture();

-- ------------------------------------------------------- email matching
select is((select user_id from public.guardians where id = tests.id('guardian_a1')), tests.id('parent1'),
  'guardian created after the account is linked by (case-insensitive) verified email');
select is((select link_method::text from public.guardians where id = tests.id('guardian_a1')), 'email',
  'link method is recorded');

with g as (
  insert into public.guardians (school_id, first_name, email)
  values (tests.id('school_a'), 'Late', 'late.parent@test.dev') returning id
)
insert into tests.ids select 'late_parent_guardian', id from g;
select is((select user_id from public.guardians where id = tests.id('late_parent_guardian')), null,
  'no account yet: guardian stays unlinked');
insert into tests.ids values ('late_parent', tests.create_user('late.parent@test.dev'));
select is((select user_id from public.guardians where id = tests.id('late_parent_guardian')), tests.id('late_parent'),
  'account created after the guardian record is linked on sign-up');

insert into tests.ids values ('unverified', tests.create_user('unverified@test.dev', false));
insert into public.guardians (school_id, first_name, email) values (tests.id('school_a'), 'Unverified', 'unverified@test.dev');
select is((select user_id from public.guardians where email = 'unverified@test.dev'), null,
  'unverified emails never link');
update auth.users set email_confirmed_at = now() where id = tests.id('unverified');
select is((select user_id from public.guardians where email = 'unverified@test.dev'), tests.id('unverified'),
  'linking happens once the email is verified');

update auth.users set email = 'changed@test.dev' where id = tests.id('unverified');
select is((select user_id from public.guardians where email = 'unverified@test.dev'), null,
  'changing the account email removes email-based links');

update public.guardians set email = 'someone.else@test.dev' where id = tests.id('late_parent_guardian');
select is((select user_id from public.guardians where id = tests.id('late_parent_guardian')), null,
  'school changing the guardian email drops the old email-based link');

-- ---------------------------------------------- staff cannot forge links
select tests.authenticate_as(tests.id('staff_a'));
select throws_ok(
  $$ update public.guardians set user_id = tests.id('outsider'), link_method = 'invite', linked_at = now()
     where id = tests.id('guardian_a2') $$,
  '42501', 'guardian_link_is_managed', 'staff cannot point a guardian at an arbitrary account');
select throws_ok(
  $$ insert into public.guardians (school_id, first_name, user_id, link_method, linked_at)
     values (tests.id('school_a'), 'Forged', tests.id('outsider'), 'invite', now()) $$,
  '42501', 'guardian_link_is_managed', 'staff cannot create pre-linked guardians');
select lives_ok(
  $$ update public.guardians set user_id = null, link_method = null, linked_at = null where id = tests.id('guardian_a2') $$,
  'staff can unlink a guardian account');

-- ----------------------------------------------------------- invite codes
insert into public.guardians (school_id, first_name) values (tests.id('school_a'), 'Invited parent');
select tests.clear_authentication();
insert into tests.ids values ('invited_guardian', (select id from public.guardians where first_name = 'Invited parent'));
insert into public.student_guardians (school_id, student_id, guardian_id)
values (tests.id('school_a'), tests.id('student_a2'), tests.id('invited_guardian'));

select tests.authenticate_as(tests.id('admin_b'));
select throws_ok(
  $$ select * from public.create_guardian_invite(tests.id('invited_guardian')) $$,
  '42501', null, 'staff of another school cannot create invites');
select tests.clear_authentication();

select tests.authenticate_as(tests.id('staff_a'));
create temp table invite on commit drop as
  select * from public.create_guardian_invite(tests.id('invited_guardian'), 7);
select matches((select code from invite), '^[0-9A-HJKMNP-TV-Z]{5}-[0-9A-HJKMNP-TV-Z]{5}$', 'invite code format');
select is((select count(*)::int from public.guardian_invites where guardian_id = tests.id('invited_guardian')), 1,
  'invite is stored');
select tests.clear_authentication();
grant select on invite to authenticated;

select tests.authenticate_as(tests.id('outsider'));
select is((select status from public.redeem_guardian_invite('WRONG-CODE0')), 'invalid', 'wrong code is rejected');
select is(
  (select status from public.redeem_guardian_invite(lower(replace((select code from invite), '-', ' ')))),
  'linked', 'valid code links the account (formatting and case are forgiven)');
select is((select count(*)::int from public.guardian_children()), 1, 'the parent now sees the linked child');
select is((select status from public.redeem_guardian_invite((select code from invite))), 'invalid',
  'codes are single-use');
select tests.clear_authentication();

select is((select link_method::text from public.guardians where id = tests.id('invited_guardian')), 'invite',
  'invite link method recorded');

-- Issuing a new invite revokes the previous active one.
select tests.authenticate_as(tests.id('staff_a'));
select lives_ok($$ select * from public.create_guardian_invite(tests.id('guardian_a2')) $$, 'first invite');
select lives_ok($$ select * from public.create_guardian_invite(tests.id('guardian_a2')) $$, 'second invite');
select tests.clear_authentication();
select is(
  (select count(*)::int from public.guardian_invites where guardian_id = tests.id('guardian_a2') and revoked_at is null),
  1, 'only the newest invite stays active');

-- Brute force protection: 10 failures per hour, then every attempt is refused.
select tests.authenticate_as(tests.id('staff_a'));
create temp table invite2 on commit drop as
  select * from public.create_guardian_invite(tests.id('late_parent_guardian'));
select tests.clear_authentication();
grant select on invite2 to authenticated;

insert into tests.ids values ('guesser', tests.create_user('guesser@test.dev'));
select tests.authenticate_as(tests.id('guesser'));
select count(*) from generate_series(1, 10) i, lateral public.redeem_guardian_invite('AAAAA-AAAA' || i % 10);
select is(
  (select status from public.redeem_guardian_invite((select code from invite2))),
  'rate_limited', 'after 10 failed attempts even a valid code is refused');
select tests.clear_authentication();

select * from finish();
rollback;
