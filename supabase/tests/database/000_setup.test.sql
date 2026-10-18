-- Shared helpers for the database test-suite. This file runs first (files are
-- executed in name order) and is intentionally NOT wrapped in a transaction, so
-- the helpers persist for the other test files.

create extension if not exists pgtap with schema extensions;

create schema if not exists tests;
grant usage on schema tests to anon, authenticated, service_role;

-- Creates an auth user. Verified email by default, like a Google sign-in.
create or replace function tests.create_user(p_email text, p_verified boolean default true)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid := gen_random_uuid();
begin
  insert into auth.users (id, email, email_confirmed_at, raw_user_meta_data, created_at, updated_at)
  values (
    v_id, p_email, case when p_verified then now() end,
    jsonb_build_object('full_name', split_part(p_email, '@', 1)), now(), now()
  );
  return v_id;
end;
$$;

-- Switches the session to the `authenticated` role as the given user.
create or replace function tests.authenticate_as(p_user_id uuid, p_aal text default 'aal1')
returns void
language plpgsql
as $$
begin
  perform set_config('request.jwt.claims',
    jsonb_build_object('sub', p_user_id, 'role', 'authenticated', 'aal', p_aal)::text, true);
  execute 'set local role authenticated';
end;
$$;

create or replace function tests.authenticate_as_anon()
returns void
language plpgsql
as $$
begin
  perform set_config('request.jwt.claims', jsonb_build_object('role', 'anon')::text, true);
  execute 'set local role anon';
end;
$$;

create or replace function tests.clear_authentication()
returns void
language plpgsql
as $$
begin
  perform set_config('request.jwt.claims', '', true);
  execute 'reset role';
end;
$$;

-- Named fixture ids, populated inside each test transaction by tests.create_fixture().
create table if not exists tests.ids (name text primary key, id uuid not null);
grant select on tests.ids to anon, authenticated, service_role;

create or replace function tests.id(p_name text)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select i.id from tests.ids i where i.name = p_name;
$$;

-- Builds a two-school world used by most tests:
--   school_a: admin_a, staff_a | students student_a1 (guardian parent1), student_a2 (guardian parent2)
--   school_b: admin_b          | student_b1
--   platform: platform admin account; outsider: a signed-in user with no relation to anything.
create or replace function tests.create_fixture()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v record;
begin
  delete from tests.ids;

  insert into tests.ids (name, id) values
    ('platform', tests.create_user('platform@test.dev')),
    ('admin_a', tests.create_user('admin.a@test.dev')),
    ('staff_a', tests.create_user('staff.a@test.dev')),
    ('admin_b', tests.create_user('admin.b@test.dev')),
    ('parent1', tests.create_user('parent1@test.dev')),
    ('parent2', tests.create_user('parent2@test.dev')),
    ('outsider', tests.create_user('outsider@test.dev'));

  insert into public.platform_admins (user_id) values (tests.id('platform'));

  insert into public.schools (name, slug, timezone) values ('School A', 'school-a', 'Europe/Istanbul')
  returning id into v;
  insert into tests.ids values ('school_a', v.id);
  insert into public.schools (name, slug) values ('School B', 'school-b') returning id into v;
  insert into tests.ids values ('school_b', v.id);

  insert into public.school_members (school_id, user_id, role) values
    (tests.id('school_a'), tests.id('admin_a'), 'admin'),
    (tests.id('school_a'), tests.id('staff_a'), 'staff'),
    (tests.id('school_b'), tests.id('admin_b'), 'admin');

  insert into public.students (school_id, student_number, first_name, last_name, photo_path)
  values (tests.id('school_a'), 'A-001', 'Ada', 'Lovelace', tests.id('school_a') || '/students/placeholder/photo.jpg')
  returning id into v;
  insert into tests.ids values ('student_a1', v.id);
  insert into public.students (school_id, student_number, first_name, last_name)
  values (tests.id('school_a'), 'A-002', 'Alan', 'Turing') returning id into v;
  insert into tests.ids values ('student_a2', v.id);
  insert into public.students (school_id, student_number, first_name, last_name)
  values (tests.id('school_b'), 'B-001', 'Grace', 'Hopper') returning id into v;
  insert into tests.ids values ('student_b1', v.id);

  insert into public.guardians (school_id, first_name, email)
  values (tests.id('school_a'), 'Parent One', 'Parent1@Test.dev') returning id into v;
  insert into tests.ids values ('guardian_a1', v.id);
  insert into public.guardians (school_id, first_name, email)
  values (tests.id('school_a'), 'Parent Two', 'parent2@test.dev') returning id into v;
  insert into tests.ids values ('guardian_a2', v.id);

  insert into public.student_guardians (school_id, student_id, guardian_id, relationship, is_primary) values
    (tests.id('school_a'), tests.id('student_a1'), tests.id('guardian_a1'), 'mother', true),
    (tests.id('school_a'), tests.id('student_a2'), tests.id('guardian_a2'), 'father', true);

  insert into public.teachers (school_id, first_name, last_name, email, phone)
  values (tests.id('school_a'), 'Tess', 'Teacher', 'tess@school-a.dev', '+90 555 000 0000') returning id into v;
  insert into tests.ids values ('teacher_a1', v.id);

  insert into public.academic_terms (school_id, name, starts_on, ends_on)
  values (tests.id('school_a'), 'Fall', current_date - 30, current_date + 60) returning id into v;
  insert into tests.ids values ('term_a', v.id);

  insert into public.courses (school_id, term_id, name, code)
  values (tests.id('school_a'), tests.id('term_a'), 'Mathematics', 'MATH') returning id into v;
  insert into tests.ids values ('course_a1', v.id);
  insert into public.courses (school_id, name) values (tests.id('school_a'), 'Art') returning id into v;
  insert into tests.ids values ('course_a2', v.id);

  insert into public.course_teachers (school_id, course_id, teacher_id)
  values (tests.id('school_a'), tests.id('course_a1'), tests.id('teacher_a1'));
  insert into public.enrollments (school_id, course_id, student_id) values
    (tests.id('school_a'), tests.id('course_a1'), tests.id('student_a1')),
    (tests.id('school_a'), tests.id('course_a2'), tests.id('student_a2'));

  insert into public.assessments (school_id, course_id, title, assessed_on, published_at)
  values (tests.id('school_a'), tests.id('course_a1'), 'Midterm', current_date - 5, now() - interval '1 day')
  returning id into v;
  insert into tests.ids values ('assessment_published', v.id);
  insert into public.assessments (school_id, course_id, title, assessed_on)
  values (tests.id('school_a'), tests.id('course_a1'), 'Quiz (draft)', current_date - 1) returning id into v;
  insert into tests.ids values ('assessment_draft', v.id);

  insert into public.grades (school_id, assessment_id, student_id, score) values
    (tests.id('school_a'), tests.id('assessment_published'), tests.id('student_a1'), 91),
    (tests.id('school_a'), tests.id('assessment_draft'), tests.id('student_a1'), 40);

  insert into public.attendance_records (school_id, student_id, attended_on, status) values
    (tests.id('school_a'), tests.id('student_a1'), current_date - 2, 'present'),
    (tests.id('school_a'), tests.id('student_a1'), current_date - 1, 'absent');

  insert into public.student_notes (school_id, student_id, teacher_id, body, visible_to_guardians) values
    (tests.id('school_a'), tests.id('student_a1'), tests.id('teacher_a1'), 'Great progress this week.', true),
    (tests.id('school_a'), tests.id('student_a1'), tests.id('teacher_a1'), 'Internal: discuss with counselor.', false);

  insert into public.events (school_id, course_id, title, starts_at, visible_to_guardians) values
    (tests.id('school_a'), null, 'Sports day', now() + interval '3 days', true),
    (tests.id('school_a'), null, 'Staff meeting', now() + interval '4 days', false),
    (tests.id('school_a'), tests.id('course_a1'), 'Math olympiad', now() + interval '5 days', true),
    (tests.id('school_a'), tests.id('course_a2'), 'Art exhibition', now() + interval '6 days', true);
end;
$$;

grant execute on all functions in schema tests to anon, authenticated, service_role;

select plan(1);
select pass('test helpers installed');
select * from finish();
