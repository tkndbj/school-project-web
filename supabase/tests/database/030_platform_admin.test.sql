-- Platform admins have global access, but only with a multi-factor session.
begin;
select plan(12);
select tests.create_fixture();

select tests.authenticate_as(tests.id('platform'), 'aal1');
select is((select count(*)::int from public.schools), 0, 'platform admin without MFA sees no schools');
select ok(public.is_platform_admin_account(), 'the app can still detect that MFA is required');
select throws_ok($$ select * from public.platform_school_overview() $$, '42501', null,
  'platform overview requires MFA');
select tests.clear_authentication();

select tests.authenticate_as(tests.id('platform'), 'aal2');
select is((select count(*)::int from public.schools), 2, 'platform admin with MFA sees every school');
select is((select count(*)::int from public.students), 3, 'platform admin with MFA sees every student');
select lives_ok(
  $$ insert into public.schools (name, slug) values ('School C', 'school-c') $$,
  'platform admin can create schools');
select lives_ok(
  $$ update public.schools set slug = 'school-b-renamed', status = 'suspended' where id = tests.id('school_b') $$,
  'platform admin can change slug and status');
select is((select count(*)::int from public.platform_school_overview()), 3, 'overview lists all schools');
select tests.clear_authentication();

select tests.authenticate_as(tests.id('admin_a'), 'aal2');
select throws_ok(
  $$ insert into public.schools (name, slug) values ('Rogue', 'rogue') $$,
  '42501', null, 'school admins cannot create schools');
select tests.clear_authentication();

-- Account context used by the apps for routing.
select tests.authenticate_as(tests.id('staff_a'));
select is(
  (select public.my_account_context() -> 'memberships' -> 0 ->> 'role'), 'staff',
  'account context lists school memberships with role');
select tests.clear_authentication();
select tests.authenticate_as(tests.id('parent1'));
select is((select (public.my_account_context() ->> 'children_count')::int), 1, 'account context counts children');
select tests.clear_authentication();
select tests.authenticate_as(tests.id('platform'));
select ok((select (public.my_account_context() ->> 'is_platform_admin')::boolean), 'account context flags platform admins');
select tests.clear_authentication();

select * from finish();
rollback;
