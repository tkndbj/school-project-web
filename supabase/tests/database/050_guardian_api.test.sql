-- What a parent can (and cannot) see through the guardian read API.
begin;
select plan(24);
select tests.create_fixture();

insert into public.custom_field_definitions (school_id, entity, key, label, field_type, visible_to_guardians) values
  (tests.id('school_a'), 'student', 'allergies', 'Allergies', 'text', true),
  (tests.id('school_a'), 'student', 'counselor_flag', 'Counselor flag', 'boolean', false);
update public.students set custom_fields = '{"allergies": "Peanuts", "counselor_flag": true}'
where id = tests.id('student_a1');

select tests.authenticate_as(tests.id('parent1'));

-- No direct table access at all.
select is((select count(*)::int from public.students), 0, 'guardians cannot read the students table');
select is((select count(*)::int from public.grades), 0, 'guardians cannot read the grades table');
select is((select count(*)::int from public.student_notes), 0, 'guardians cannot read the notes table');
select throws_ok($$ insert into public.students (school_id, first_name) values (tests.id('school_a'), 'x') $$,
  '42501', null, 'guardians cannot write');

-- Children
select is((select count(*)::int from public.guardian_children()), 1, 'parent1 has exactly one child');
select is((select student_id from public.guardian_children()), tests.id('student_a1'), 'it is student_a1');
select is((select relationship::text from public.guardian_children()), 'mother', 'relationship is returned');

-- Profile with guardian-visible custom fields only
select is((select first_name from public.guardian_student_profile(tests.id('student_a1'))), 'Ada', 'profile');
select is(
  (select custom_fields from public.guardian_student_profile(tests.id('student_a1'))),
  '[{"key": "allergies", "type": "text", "label": "Allergies", "value": "Peanuts"}]'::jsonb,
  'only guardian-visible custom fields are exposed');

-- Other children are off limits
select throws_ok($$ select * from public.guardian_student_profile(tests.id('student_a2')) $$,
  '42501', 'student_not_accessible', 'a sibling account''s child is not accessible');
select throws_ok($$ select * from public.guardian_student_grades(tests.id('student_b1')) $$,
  '42501', 'student_not_accessible', 'another school''s student is not accessible');

-- Grades: published only
select is((select count(*)::int from public.guardian_student_grades(tests.id('student_a1'))), 1,
  'only published grades are visible');
select is((select score from public.guardian_student_grades(tests.id('student_a1'))), 91.00::numeric,
  'the published score');
select is((select count(*)::int from public.guardian_student_grades(tests.id('student_a1'), tests.id('term_a'))), 1,
  'grades can be filtered by term (inherits the course term)');

-- Courses with teachers, no private teacher data
select is((select count(*)::int from public.guardian_student_courses(tests.id('student_a1'))), 1, 'enrolled courses');
select is(
  (select teachers -> 0 ->> 'email' from public.guardian_student_courses(tests.id('student_a1'))),
  'tess@school-a.dev', 'teacher contact email is shared');
select ok(
  not ((select teachers -> 0 from public.guardian_student_courses(tests.id('student_a1'))) ? 'phone'),
  'teacher phone numbers are never shared');

-- Attendance
select is(
  (select count(*)::int from public.guardian_student_attendance(tests.id('student_a1'), current_date - 7, current_date)),
  2, 'attendance records in range');
select throws_ok(
  $$ select * from public.guardian_student_attendance(tests.id('student_a1'), current_date - 400, current_date) $$,
  'SC020', 'invalid_date_range', 'attendance ranges are bounded');
select is(
  (select total::int from public.guardian_student_attendance_summary(tests.id('student_a1'), current_date - 30, current_date)
   where status = 'absent'),
  1, 'attendance summary');

-- Notes: guardian-visible only
select is((select count(*)::int from public.guardian_student_notes(tests.id('student_a1'))), 1,
  'internal notes are hidden');

-- Events: school-wide + own courses, guardian-visible only
select is(
  (select array_agg(title order by starts_at) from public.guardian_student_events(tests.id('student_a1'), now(), now() + interval '30 days')),
  array['Sports day', 'Math olympiad'],
  'events: school-wide and enrolled-course events, excluding staff-only and other courses');
select tests.clear_authentication();

-- Module switches are honoured
update public.schools set enabled_modules = array['attendance']::public.school_module[] where id = tests.id('school_a');
select tests.authenticate_as(tests.id('parent1'));
select is((select count(*)::int from public.guardian_student_grades(tests.id('student_a1'))), 0,
  'disabled grades module returns nothing');
select tests.clear_authentication();

-- Staff can preview the parent view of their own students
select tests.authenticate_as(tests.id('staff_a'));
select is((select count(*)::int from public.guardian_student_attendance(tests.id('student_a1'), current_date - 7, current_date)),
  2, 'staff can preview the guardian view');
select tests.clear_authentication();

select * from finish();
rollback;
