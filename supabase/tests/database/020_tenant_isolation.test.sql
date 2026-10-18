-- Staff of one school can never read or write another school's data.
begin;
select plan(21);
select tests.create_fixture();

-- ---------------------------------------------------------------- staff of A
select tests.authenticate_as(tests.id('staff_a'));

select is((select count(*)::int from public.students), 2, 'staff_a sees only school A students');
select is((select count(*)::int from public.schools), 1, 'staff_a sees only school A');
select is((select count(*)::int from public.students where school_id = tests.id('school_b')), 0,
  'staff_a cannot read school B students');

select lives_ok(
  $$ insert into public.students (school_id, first_name) values (tests.id('school_a'), 'New') $$,
  'staff_a can create a student in school A');

select throws_ok(
  $$ insert into public.students (school_id, first_name) values (tests.id('school_b'), 'Intruder') $$,
  '42501', null, 'staff_a cannot create a student in school B');

update public.students set first_name = 'Hacked' where id = tests.id('student_b1');
select is((select count(*)::int from public.students where first_name = 'Hacked'), 0,
  'staff_a cannot update school B students (silently filtered)');

delete from public.students where id = tests.id('student_b1');

select lives_ok(
  $$ update public.students set first_name = 'Ada Updated' where id = tests.id('student_a1') $$,
  'staff_a can update school A students');

select throws_ok(
  $$ update public.students set school_id = tests.id('school_b') where id = tests.id('student_a1') $$,
  '42501', null, 'rows cannot be moved to another school');

update public.schools set name = 'Renamed by staff' where id = tests.id('school_a');
select tests.clear_authentication();
select isnt((select name from public.schools where id = tests.id('school_a')), 'Renamed by staff',
  'staff (non-admin) cannot update school settings');
select is((select count(*)::int from public.students where id = tests.id('student_b1')), 1,
  'school B student survived the delete attempt by staff_a');

-- ------------------------------------------------- composite FK guarantees
select throws_ok(
  $$ insert into public.grades (school_id, assessment_id, student_id, score)
     values (tests.id('school_a'), tests.id('assessment_published'), tests.id('student_b1'), 10) $$,
  '23503', null, 'a grade cannot reference a student of another school (even as superuser)');

-- ---------------------------------------------------------------- admin of A
select tests.authenticate_as(tests.id('admin_a'));
select lives_ok(
  $$ update public.schools set name = 'School A (renamed)', primary_color = '#1E40AF' where id = tests.id('school_a') $$,
  'school admin can update branding');
select throws_ok(
  $$ update public.schools set slug = 'renamed' where id = tests.id('school_a') $$,
  '42501', 'only_platform_admin_can_change_slug_or_status', 'school admins cannot change the school slug');
select throws_ok(
  $$ update public.schools set status = 'suspended' where id = tests.id('school_a') $$,
  '42501', 'only_platform_admin_can_change_slug_or_status', 'school admins cannot change the school status');
select throws_ok(
  $$ update public.schools set timezone = 'Mars/Olympus' where id = tests.id('school_a') $$,
  'SC010', 'invalid_timezone', 'invalid time zones are rejected');
select throws_ok(
  $$ delete from public.school_members where user_id = tests.id('admin_a') $$,
  'SC011', 'school_requires_an_admin', 'the last school admin cannot be removed');
select lives_ok(
  $$ update public.school_members set role = 'admin' where user_id = tests.id('staff_a') $$,
  'admin can promote staff');
select lives_ok(
  $$ delete from public.school_members where user_id = tests.id('admin_a') $$,
  'an admin can leave once another admin exists');
select tests.clear_authentication();

-- ------------------------------------------------------------------ outsider
select tests.authenticate_as(tests.id('outsider'));
select is((select count(*)::int from public.students), 0, 'an unrelated user sees no students');
select is((select count(*)::int from public.schools), 0, 'an unrelated user sees no schools');
select tests.clear_authentication();

-- --------------------------------------------------------------- suspension
update public.schools set status = 'suspended' where id = tests.id('school_b');
select tests.authenticate_as(tests.id('admin_b'));
select is((select count(*)::int from public.students), 0, 'staff of a suspended school lose access');
select tests.clear_authentication();

select * from finish();
rollback;
