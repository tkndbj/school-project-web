-- =============================================================================
-- People: students, teachers, guardians and per-school custom fields.
--
-- Nearly every attribute is optional: schools differ wildly in what they track.
-- The only rule is that a record must carry at least one identifying value.
-- Schools add their own attributes through custom field definitions; values
-- are stored in each row's `custom_fields` jsonb and validated by trigger.
-- =============================================================================

create type public.student_status as enum ('active', 'inactive', 'graduated', 'transferred');

create type public.guardian_relationship as enum (
  'mother', 'father', 'guardian', 'grandparent', 'sibling', 'other'
);

create type public.custom_field_entity as enum ('student', 'teacher', 'guardian', 'course');

create type public.custom_field_type as enum (
  'text', 'long_text', 'number', 'boolean', 'date', 'select', 'multi_select', 'email', 'phone', 'url'
);

-- -----------------------------------------------------------------------------
-- Custom field definitions
-- -----------------------------------------------------------------------------

create table public.custom_field_definitions (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools (id) on delete cascade,
  entity public.custom_field_entity not null,
  key text not null check (key ~ '^[a-z][a-z0-9_]{0,62}$'),
  label text not null check (char_length(label) between 1 and 200),
  field_type public.custom_field_type not null,
  options text[] not null default '{}' check (cardinality(options) <= 200),
  visible_to_guardians boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (school_id, entity, key),
  constraint custom_field_options_only_for_selects
    check (field_type in ('select', 'multi_select') or cardinality(options) = 0)
);

select private.attach_standard_triggers('public.custom_field_definitions');

-- The storage contract of a field (entity, key, type) is immutable once created;
-- relabel freely, but create a new field to change its meaning.
create function private.guard_custom_field_definition()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.entity is distinct from old.entity
     or new.key is distinct from old.key
     or new.field_type is distinct from old.field_type then
    raise exception using errcode = 'SC001', message = 'custom_field_contract_is_immutable';
  end if;
  return new;
end;
$$;

create trigger guard_custom_field_definition before update on public.custom_field_definitions
  for each row execute function private.guard_custom_field_definition();

-- Validates `custom_fields` against the school's definitions. TG_ARGV[0] is the
-- custom_field_entity of the table. Null values are dropped to keep rows compact.
create function private.validate_custom_fields()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_entity public.custom_field_entity := tg_argv[0]::public.custom_field_entity;
  v_defs jsonb;
  v_def jsonb;
  v_key text;
  v_value jsonb;
  v_text text;
  v_max_length integer;
  v_clean jsonb := '{}'::jsonb;
begin
  if new.custom_fields is null or new.custom_fields = '{}'::jsonb then
    new.custom_fields := '{}'::jsonb;
    return new;
  end if;

  if jsonb_typeof(new.custom_fields) <> 'object' then
    raise exception using errcode = 'SC001', message = 'custom_fields_must_be_an_object';
  end if;

  select coalesce(jsonb_object_agg(d.key, jsonb_build_object('type', d.field_type, 'options', to_jsonb(d.options))), '{}'::jsonb)
  into v_defs
  from public.custom_field_definitions d
  where d.school_id = new.school_id and d.entity = v_entity;

  for v_key, v_value in select * from jsonb_each(new.custom_fields) loop
    v_def := v_defs -> v_key;
    if v_def is null then
      raise exception using errcode = 'SC001', message = 'custom_field_unknown', detail = v_key;
    end if;

    continue when jsonb_typeof(v_value) = 'null';

    case v_def ->> 'type'
      when 'text', 'long_text', 'email', 'phone', 'url' then
        if jsonb_typeof(v_value) <> 'string' then
          raise exception using errcode = 'SC001', message = 'custom_field_expected_text', detail = v_key;
        end if;
        v_text := v_value #>> '{}';
        v_max_length := case when v_def ->> 'type' = 'long_text' then 10000 else 1000 end;
        if char_length(v_text) > v_max_length then
          raise exception using errcode = 'SC001', message = 'custom_field_too_long', detail = v_key;
        end if;
        if v_def ->> 'type' = 'email' and v_text !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
          raise exception using errcode = 'SC001', message = 'custom_field_invalid_email', detail = v_key;
        end if;
        if v_def ->> 'type' = 'url' and v_text !~* '^https?://' then
          raise exception using errcode = 'SC001', message = 'custom_field_invalid_url', detail = v_key;
        end if;
      when 'number' then
        if jsonb_typeof(v_value) <> 'number' then
          raise exception using errcode = 'SC001', message = 'custom_field_expected_number', detail = v_key;
        end if;
      when 'boolean' then
        if jsonb_typeof(v_value) <> 'boolean' then
          raise exception using errcode = 'SC001', message = 'custom_field_expected_boolean', detail = v_key;
        end if;
      when 'date' then
        if jsonb_typeof(v_value) <> 'string' or (v_value #>> '{}') !~ '^\d{4}-\d{2}-\d{2}$' then
          raise exception using errcode = 'SC001', message = 'custom_field_expected_date', detail = v_key;
        end if;
        begin
          perform (v_value #>> '{}')::date;
        exception when others then
          raise exception using errcode = 'SC001', message = 'custom_field_expected_date', detail = v_key;
        end;
      when 'select' then
        if jsonb_typeof(v_value) <> 'string' or not ((v_def -> 'options') ? (v_value #>> '{}')) then
          raise exception using errcode = 'SC001', message = 'custom_field_invalid_option', detail = v_key;
        end if;
      when 'multi_select' then
        if jsonb_typeof(v_value) <> 'array'
           or exists (
             select 1 from jsonb_array_elements(v_value) e
             where jsonb_typeof(e) <> 'string' or not ((v_def -> 'options') ? (e #>> '{}'))
           ) then
          raise exception using errcode = 'SC001', message = 'custom_field_invalid_option', detail = v_key;
        end if;
    end case;

    v_clean := v_clean || jsonb_build_object(v_key, v_value);
  end loop;

  new.custom_fields := v_clean;
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- Students
-- -----------------------------------------------------------------------------

create table public.students (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools (id) on delete cascade,
  student_number text check (char_length(student_number) between 1 and 64),
  first_name text check (char_length(first_name) between 1 and 100),
  last_name text check (char_length(last_name) between 1 and 100),
  preferred_name text check (char_length(preferred_name) between 1 and 100),
  date_of_birth date check (date_of_birth between '1900-01-01' and '2200-01-01'),
  gender public.gender,
  grade_level text check (char_length(grade_level) <= 50),
  section text check (char_length(section) <= 50),
  email public.email_address,
  phone text check (char_length(phone) <= 50),
  address text check (char_length(address) <= 500),
  photo_path text check (char_length(photo_path) <= 1024),
  enrolled_on date,
  status public.student_status not null default 'active',
  notes text check (char_length(notes) <= 10000),
  custom_fields jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (school_id, id),
  -- NULL student numbers are allowed and never collide.
  unique (school_id, student_number),
  constraint students_identifiable check (coalesce(first_name, last_name, student_number) is not null)
);

comment on column public.students.notes is 'Internal staff notes. Never shown to guardians.';

create index students_school_name_idx on public.students (school_id, last_name, first_name);
create index students_school_grade_idx on public.students (school_id, grade_level, section);
create index students_name_trgm_idx on public.students
  using gin ((coalesce(first_name, '') || ' ' || coalesce(last_name, '') || ' ' || coalesce(student_number, '')) extensions.gin_trgm_ops);

select private.attach_standard_triggers('public.students');
create trigger validate_custom_fields before insert or update of custom_fields on public.students
  for each row execute function private.validate_custom_fields('student');

-- -----------------------------------------------------------------------------
-- Teachers (and other staff records; these are directory entries, not logins)
-- -----------------------------------------------------------------------------

create table public.teachers (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools (id) on delete cascade,
  staff_number text check (char_length(staff_number) between 1 and 64),
  title text check (char_length(title) <= 50),
  first_name text check (char_length(first_name) between 1 and 100),
  last_name text check (char_length(last_name) between 1 and 100),
  email public.email_address,
  phone text check (char_length(phone) <= 50),
  date_of_birth date check (date_of_birth between '1900-01-01' and '2200-01-01'),
  gender public.gender,
  subject text check (char_length(subject) <= 200),
  bio text check (char_length(bio) <= 5000),
  photo_path text check (char_length(photo_path) <= 1024),
  -- Reserved for future teacher logins.
  user_id uuid references auth.users (id) on delete set null,
  custom_fields jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (school_id, id),
  unique (school_id, staff_number),
  constraint teachers_identifiable check (coalesce(first_name, last_name, staff_number, email) is not null)
);

create index teachers_school_name_idx on public.teachers (school_id, last_name, first_name);
create index teachers_user_idx on public.teachers (user_id) where user_id is not null;

select private.attach_standard_triggers('public.teachers');
create trigger validate_custom_fields before insert or update of custom_fields on public.teachers
  for each row execute function private.validate_custom_fields('teacher');

-- -----------------------------------------------------------------------------
-- Guardians (parents) and their links to students
-- -----------------------------------------------------------------------------

create type public.guardian_link_method as enum ('email', 'invite');

create table public.guardians (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools (id) on delete cascade,
  first_name text check (char_length(first_name) between 1 and 100),
  last_name text check (char_length(last_name) between 1 and 100),
  email public.email_address,
  phone text check (char_length(phone) <= 50),
  address text check (char_length(address) <= 500),
  -- The app account this guardian record is linked to (see guardian_access migration).
  user_id uuid references auth.users (id) on delete set null,
  link_method public.guardian_link_method,
  linked_at timestamptz,
  custom_fields jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (school_id, id),
  constraint guardians_identifiable check (coalesce(first_name, last_name, email, phone) is not null),
  constraint guardians_link_consistent check (
    (user_id is null and link_method is null and linked_at is null)
    or (user_id is not null and link_method is not null and linked_at is not null)
  )
);

create unique index guardians_school_email_key on public.guardians (school_id, lower(email)) where email is not null;
create index guardians_email_idx on public.guardians (lower(email)) where email is not null and user_id is null;
create index guardians_user_idx on public.guardians (user_id) where user_id is not null;
create index guardians_school_name_idx on public.guardians (school_id, last_name, first_name);

select private.attach_standard_triggers('public.guardians');
create trigger validate_custom_fields before insert or update of custom_fields on public.guardians
  for each row execute function private.validate_custom_fields('guardian');

create table public.student_guardians (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null,
  student_id uuid not null,
  guardian_id uuid not null,
  relationship public.guardian_relationship,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (student_id, guardian_id),
  foreign key (school_id, student_id) references public.students (school_id, id) on delete cascade,
  foreign key (school_id, guardian_id) references public.guardians (school_id, id) on delete cascade
);

create index student_guardians_guardian_idx on public.student_guardians (guardian_id);
create index student_guardians_school_idx on public.student_guardians (school_id);

select private.attach_standard_triggers('public.student_guardians');
