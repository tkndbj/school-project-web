-- School connection and student access are separate stages of parent onboarding.
begin;
select plan(17);
select tests.create_fixture();

select tests.authenticate_as(tests.id('parent1'));
select is(public.my_account_context() -> 'guardian_schools',
  jsonb_build_array(jsonb_build_object('school_id', tests.id('school_a'), 'school_name', 'School A')),
  'only the guardian''s own school connection is returned');
select is((public.my_account_context() ->> 'children_count')::int, 1,
  'existing child access is preserved');
select tests.clear_authentication();

select tests.authenticate_as(tests.id('outsider'));
select is(public.my_account_context() -> 'guardian_schools', '[]'::jsonb,
  'an unrelated account has no school connections');
select tests.clear_authentication();

delete from public.student_guardians where guardian_id = tests.id('guardian_a1');
select tests.authenticate_as(tests.id('parent1'));
select is(jsonb_array_length(public.my_account_context() -> 'guardian_schools'), 1,
  'school connection remains when no student has been assigned');
select is((public.my_account_context() ->> 'children_count')::int, 0,
  'connected guardian without student has zero children');
select is((select count(*)::int from public.guardian_children()), 0,
  'school connection alone reveals no students');
select throws_ok($$ select * from public.guardian_student_profile(tests.id('student_a2')) $$,
  '42501', 'student_not_accessible', 'connection does not expose another parent''s student');
select is((select count(*)::int from public.students), 0,
  'connected guardian still has no direct student table access');
select tests.clear_authentication();

insert into public.guardians (school_id, first_name) values
  (tests.id('school_a'), 'Code guardian');
insert into tests.ids values ('code_guardian', (select id from public.guardians where first_name = 'Code guardian'));
select tests.authenticate_as(tests.id('admin_a'));
create temp table waiting_invite on commit drop as
  select * from public.create_guardian_invite(tests.id('code_guardian'));
select tests.clear_authentication();
grant select on waiting_invite to authenticated;

select tests.authenticate_as(tests.id('parent1'));
select is((select status from public.redeem_guardian_invite((select code from waiting_invite))),
  'linked', 'a guardian invite without a student can be redeemed');
select is(jsonb_array_length(public.my_account_context() -> 'guardian_schools'), 1,
  'multiple guardian records in one school return one connection');
select is((public.my_account_context() ->> 'children_count')::int, 0,
  'redeeming a school connection never invents student access');
select tests.clear_authentication();

-- Staff assigning a child becomes visible on the next account/children read.
insert into public.student_guardians (school_id, student_id, guardian_id)
values (tests.id('school_a'), tests.id('student_a1'), tests.id('code_guardian'));
select tests.authenticate_as(tests.id('parent1'));
select is((public.my_account_context() ->> 'children_count')::int, 1,
  'assigning the child updates the account context');
select is((select student_id from public.guardian_children()), tests.id('student_a1'),
  'assigning the child reveals only the linked student');
select tests.clear_authentication();

update public.schools set status = 'suspended' where id = tests.id('school_a');
select tests.authenticate_as(tests.id('parent1'));
select is(public.my_account_context() -> 'guardian_schools', '[]'::jsonb,
  'suspended schools do not remain available to guardians');
select is((public.my_account_context() ->> 'children_count')::int, 0,
  'suspended schools do not expose children');
select tests.clear_authentication();

select tests.authenticate_as(tests.id('admin_b'));
select is(public.my_account_context() #>> '{memberships,0,school_id}', tests.id('school_b')::text,
  'school staff membership routing remains unchanged');
select tests.clear_authentication();
select tests.authenticate_as_anon();
select throws_ok($$ select public.my_account_context() $$, '42501', null,
  'anonymous users cannot inspect account connections');
select tests.clear_authentication();

select * from finish();
rollback;
