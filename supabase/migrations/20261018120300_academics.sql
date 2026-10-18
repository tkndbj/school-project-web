-- =============================================================================
-- Academics: terms, courses, teaching assignments, enrollments, assessments,
-- grades, attendance, staff notes about students and school events.
-- Every child table carries `school_id` and references its parents through
-- composite (school_id, id) foreign keys, so cross-school references are
-- impossible at the database level.
-- =============================================================================

create type public.assessment_kind as enum (
  'exam', 'quiz', 'homework', 'project', 'participation', 'term_grade', 'other'
);

create type public.attendance_status as enum ('present', 'absent', 'late', 'excused');

-- -----------------------------------------------------------------------------
-- Terms
-- -----------------------------------------------------------------------------

create table public.academic_terms (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 100),
  starts_on date not null,
  ends_on date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (school_id, id),
  unique (school_id, name),
  check (ends_on >= starts_on)
);

create index academic_terms_school_dates_idx on public.academic_terms (school_id, starts_on desc);

select private.attach_standard_triggers('public.academic_terms');

-- -----------------------------------------------------------------------------
-- Courses
-- -----------------------------------------------------------------------------

create table public.courses (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools (id) on delete cascade,
  term_id uuid,
  name text not null check (char_length(name) between 1 and 200),
  code text check (char_length(code) between 1 and 64),
  subject text check (char_length(subject) <= 200),
  grade_level text check (char_length(grade_level) <= 50),
  description text check (char_length(description) <= 5000),
  color public.hex_color,
  custom_fields jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (school_id, id),
  foreign key (school_id, term_id) references public.academic_terms (school_id, id) on delete set null (term_id)
);

create unique index courses_school_term_code_key on public.courses (school_id, term_id, code) nulls not distinct
  where code is not null;
create index courses_school_name_idx on public.courses (school_id, name);
create index courses_term_idx on public.courses (term_id) where term_id is not null;

select private.attach_standard_triggers('public.courses');
create trigger validate_custom_fields before insert or update of custom_fields on public.courses
  for each row execute function private.validate_custom_fields('course');

create table public.course_teachers (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null,
  course_id uuid not null,
  teacher_id uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (course_id, teacher_id),
  foreign key (school_id, course_id) references public.courses (school_id, id) on delete cascade,
  foreign key (school_id, teacher_id) references public.teachers (school_id, id) on delete cascade
);

create index course_teachers_teacher_idx on public.course_teachers (teacher_id);
create index course_teachers_school_idx on public.course_teachers (school_id);

select private.attach_standard_triggers('public.course_teachers');

create table public.enrollments (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null,
  course_id uuid not null,
  student_id uuid not null,
  enrolled_on date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (course_id, student_id),
  foreign key (school_id, course_id) references public.courses (school_id, id) on delete cascade,
  foreign key (school_id, student_id) references public.students (school_id, id) on delete cascade
);

create index enrollments_student_idx on public.enrollments (student_id);
create index enrollments_school_idx on public.enrollments (school_id);

select private.attach_standard_triggers('public.enrollments');

-- -----------------------------------------------------------------------------
-- Assessments and grades
-- -----------------------------------------------------------------------------

create table public.assessments (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null,
  course_id uuid not null,
  term_id uuid,
  title text not null check (char_length(title) between 1 and 200),
  kind public.assessment_kind not null default 'exam',
  description text check (char_length(description) <= 5000),
  max_score numeric(10, 2) not null default 100 check (max_score > 0),
  weight numeric(7, 3) check (weight >= 0),
  assessed_on date,
  -- Grades become visible to guardians only once the assessment is published.
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (school_id, id),
  foreign key (school_id, course_id) references public.courses (school_id, id) on delete cascade,
  foreign key (school_id, term_id) references public.academic_terms (school_id, id) on delete set null (term_id)
);

create index assessments_course_idx on public.assessments (course_id, assessed_on desc);
create index assessments_school_idx on public.assessments (school_id, assessed_on desc);
create index assessments_term_idx on public.assessments (term_id) where term_id is not null;

select private.attach_standard_triggers('public.assessments');

create table public.grades (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null,
  assessment_id uuid not null,
  student_id uuid not null,
  score numeric(10, 2) check (score >= 0),
  letter text check (char_length(letter) between 1 and 10),
  comment text check (char_length(comment) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (assessment_id, student_id),
  foreign key (school_id, assessment_id) references public.assessments (school_id, id) on delete cascade,
  foreign key (school_id, student_id) references public.students (school_id, id) on delete cascade,
  constraint grades_has_value check (coalesce(score::text, letter, comment) is not null)
);

create index grades_student_idx on public.grades (student_id);
create index grades_school_idx on public.grades (school_id);

select private.attach_standard_triggers('public.grades');

-- -----------------------------------------------------------------------------
-- Attendance (daily when course_id is null, per lesson otherwise)
-- -----------------------------------------------------------------------------

create table public.attendance_records (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null,
  student_id uuid not null,
  attended_on date not null,
  status public.attendance_status not null,
  course_id uuid,
  period text check (char_length(period) between 1 and 50),
  minutes_late integer check (minutes_late between 0 and 1440),
  note text check (char_length(note) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (school_id, student_id) references public.students (school_id, id) on delete cascade,
  foreign key (school_id, course_id) references public.courses (school_id, id) on delete cascade,
  constraint attendance_records_unique_slot
    unique nulls not distinct (student_id, attended_on, course_id, period)
);

create index attendance_records_school_date_idx on public.attendance_records (school_id, attended_on desc);
create index attendance_records_student_date_idx on public.attendance_records (student_id, attended_on desc);
create index attendance_records_course_date_idx on public.attendance_records (course_id, attended_on desc)
  where course_id is not null;

select private.attach_standard_triggers('public.attendance_records');

-- -----------------------------------------------------------------------------
-- Notes about students (teacher notes)
-- -----------------------------------------------------------------------------

create table public.student_notes (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null,
  student_id uuid not null,
  teacher_id uuid,
  author_id uuid default auth.uid() references auth.users (id) on delete set null,
  title text check (char_length(title) <= 200),
  body text not null check (char_length(body) between 1 and 10000),
  category text check (char_length(category) <= 100),
  visible_to_guardians boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (school_id, student_id) references public.students (school_id, id) on delete cascade,
  foreign key (school_id, teacher_id) references public.teachers (school_id, id) on delete set null (teacher_id)
);

create index student_notes_student_idx on public.student_notes (student_id, created_at desc);
create index student_notes_school_idx on public.student_notes (school_id, created_at desc);
create index student_notes_teacher_idx on public.student_notes (teacher_id) where teacher_id is not null;

select private.attach_standard_triggers('public.student_notes');

-- -----------------------------------------------------------------------------
-- Events (school-wide when course_id is null)
-- -----------------------------------------------------------------------------

create table public.events (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools (id) on delete cascade,
  course_id uuid,
  title text not null check (char_length(title) between 1 and 200),
  description text check (char_length(description) <= 10000),
  location text check (char_length(location) <= 500),
  starts_at timestamptz not null,
  ends_at timestamptz,
  all_day boolean not null default false,
  color public.hex_color,
  visible_to_guardians boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (school_id, course_id) references public.courses (school_id, id) on delete cascade,
  check (ends_at is null or ends_at >= starts_at)
);

create index events_school_starts_idx on public.events (school_id, starts_at);
create index events_course_idx on public.events (course_id) where course_id is not null;

select private.attach_standard_triggers('public.events');

-- -----------------------------------------------------------------------------
-- Removing a custom field definition removes its values from every record.
-- -----------------------------------------------------------------------------

create function private.purge_custom_field_values()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Nothing to clean up when the whole school is being deleted.
  if not exists (select 1 from public.schools s where s.id = old.school_id) then
    return old;
  end if;

  case old.entity
    when 'student' then
      update public.students set custom_fields = custom_fields - old.key
      where school_id = old.school_id and custom_fields ? old.key;
    when 'teacher' then
      update public.teachers set custom_fields = custom_fields - old.key
      where school_id = old.school_id and custom_fields ? old.key;
    when 'guardian' then
      update public.guardians set custom_fields = custom_fields - old.key
      where school_id = old.school_id and custom_fields ? old.key;
    when 'course' then
      update public.courses set custom_fields = custom_fields - old.key
      where school_id = old.school_id and custom_fields ? old.key;
  end case;
  return old;
end;
$$;

create trigger purge_custom_field_values after delete on public.custom_field_definitions
  for each row execute function private.purge_custom_field_values();
