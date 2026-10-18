-- Gradebook and attendance register saves.
begin;
select plan(14);
select tests.create_fixture();

select tests.authenticate_as(tests.id('staff_a'));

-- Gradebook
select is(
  public.save_grades(tests.id('assessment_published'), jsonb_build_array(
    jsonb_build_object('student_id', tests.id('student_a1'), 'score', '77.5'),
    jsonb_build_object('student_id', tests.id('student_a2'), 'letter', 'B+', 'comment', 'Good')
  )),
  2, 'gradebook upserts filled rows');
select is((select score from public.grades where assessment_id = tests.id('assessment_published') and student_id = tests.id('student_a1')),
  77.50::numeric, 'existing grade updated');
select is(
  public.save_grades(tests.id('assessment_published'), jsonb_build_array(
    jsonb_build_object('student_id', tests.id('student_a2'), 'score', null, 'letter', '', 'comment', '')
  )),
  0, 'clearing a row stores nothing');
select is((select count(*)::int from public.grades where assessment_id = tests.id('assessment_published') and student_id = tests.id('student_a2')),
  0, 'and deletes the grade');
select throws_ok(
  $$ select public.save_grades(tests.id('assessment_published'),
       jsonb_build_array(jsonb_build_object('student_id', tests.id('student_b1'), 'score', 10))) $$,
  '23503', null, 'grades for another school''s student are impossible');
select throws_ok(
  $$ select public.save_grades(tests.id('assessment_published'),
       jsonb_build_array(jsonb_build_object('student_id', tests.id('student_a1'), 'score', -1))) $$,
  '23514', null, 'negative scores are rejected');

-- Attendance register
select is(
  public.save_attendance(tests.id('school_a'), current_date, jsonb_build_array(
    jsonb_build_object('student_id', tests.id('student_a1'), 'status', 'late', 'minutes_late', 10),
    jsonb_build_object('student_id', tests.id('student_a2'), 'status', 'present', 'minutes_late', 10)
  )),
  2, 'daily register saved');
select is(
  (select minutes_late from public.attendance_records where student_id = tests.id('student_a2') and attended_on = current_date),
  null, 'minutes late only kept for late students');
select is(
  public.save_attendance(tests.id('school_a'), current_date, jsonb_build_array(
    jsonb_build_object('student_id', tests.id('student_a1'), 'status', 'present')
  )),
  1, 're-saving updates in place');
select is(
  (select count(*)::int from public.attendance_records where student_id = tests.id('student_a1') and attended_on = current_date),
  1, 'no duplicate daily records');
select is(
  public.save_attendance(tests.id('school_a'), current_date, jsonb_build_array(
    jsonb_build_object('student_id', tests.id('student_a1'), 'status', 'absent')
  ), tests.id('course_a1'), '1'),
  1, 'per-lesson attendance is a separate slot');
select tests.clear_authentication();

-- Group enrolment
update public.students set grade_level = '5' where school_id = tests.id('school_a');
select tests.authenticate_as(tests.id('staff_a'));
select is(public.enroll_student_group(tests.id('course_a1'), '5'), 1,
  'group enrolment adds only students not yet enrolled (student_a1 already is)');
select is(public.enroll_student_group(tests.id('course_a1'), '5'), 0, 'group enrolment is idempotent');
select tests.clear_authentication();

select tests.authenticate_as(tests.id('admin_b'));
select throws_ok(
  $$ select public.save_attendance(tests.id('school_a'), current_date, '[]'::jsonb) $$,
  '42501', null, 'cannot save attendance for another school');
select tests.clear_authentication();

select * from finish();
rollback;
