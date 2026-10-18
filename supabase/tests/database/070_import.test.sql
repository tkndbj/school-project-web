-- Bulk import of students (with guardians) and teachers.
begin;
select plan(14);
select tests.create_fixture();

select tests.authenticate_as(tests.id('staff_a'));

create temp table result on commit drop as
select public.import_students(tests.id('school_a'), $json$[
  {"student_number": "A-100", "first_name": "Marie", "last_name": "Curie", "date_of_birth": "2015-11-07",
   "gender": "female", "grade_level": "5", "section": "B",
   "guardians": [{"first_name": "Pierre", "email": "pierre@test.dev", "relationship": "father", "is_primary": true}]},
  {"first_name": "No Number"},
  {"student_number": "A-001", "grade_level": "6"},
  {"student_number": "A-101", "date_of_birth": "not-a-date"},
  {"student_number": "A-102", "favourite_color": "blue"},
  {"student_number": "A-103", "first_name": "Bad", "email": "not-an-email"},
  {"student_number": "A-104", "first_name": "Linked", "guardians": [{"email": "PARENT1@test.dev"}]}
]$json$) as r;

select is((select (r ->> 'inserted')::int from result), 3, 'three new students inserted');
select is((select (r ->> 'updated')::int from result), 1, 'existing student matched by number is updated');
select is((select (r ->> 'failed')::int from result), 3, 'three rows failed');
select is(
  (select array_agg((e ->> 'index')::int order by (e ->> 'index')::int) from result, jsonb_array_elements(r -> 'errors') e),
  array[3, 4, 5], 'errors point at the failing row indexes');
select is(
  (select e ->> 'message' from result, jsonb_array_elements(r -> 'errors') e where (e ->> 'index')::int = 4),
  'import_unknown_column', 'unknown columns are reported');

select is((select grade_level from public.students where student_number = 'A-001'), '6', 'update applied');
select is((select first_name from public.students where student_number = 'A-001'), 'Ada',
  'columns absent from the row are left untouched on update');
select is((select count(*)::int from public.students where student_number = 'A-101'), 0, 'failed rows are not written');

select is(
  (select g.first_name from public.guardians g
   join public.student_guardians sg on sg.guardian_id = g.id
   join public.students s on s.id = sg.student_id
   where s.student_number = 'A-100'),
  'Pierre', 'guardians are created and linked to the student');
select is(
  (select count(*)::int from public.student_guardians sg join public.students s on s.id = sg.student_id
   where s.student_number = 'A-104' and sg.guardian_id = tests.id('guardian_a1')),
  1, 'existing guardians are matched by email instead of duplicated');

-- Re-running the same import is idempotent for numbered rows.
select is(
  (public.import_students(tests.id('school_a'), '[{"student_number": "A-100", "first_name": "Marie"}]') ->> 'updated')::int,
  1, 're-import updates instead of duplicating');

select throws_ok(
  $$ select public.import_students(tests.id('school_b'), '[{"first_name": "x"}]') $$,
  '42501', 'school_not_accessible', 'cannot import into another school');

select is(
  (public.import_teachers(tests.id('school_a'), '[
     {"staff_number": "T-1", "first_name": "Nikola", "last_name": "Tesla", "subject": "Physics"},
     {"staff_number": "T-1", "email": "nikola@test.dev"}
   ]') ->> 'inserted')::int,
  1, 'teacher import upserts on staff number');
select is((select email::text from public.teachers where staff_number = 'T-1'), 'nikola@test.dev',
  'second row updated the same teacher');

select tests.clear_authentication();
select * from finish();
rollback;
