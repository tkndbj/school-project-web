-- =============================================================================
-- Operational API: bulk imports, dashboard statistics, platform overview,
-- push notification tokens and data-retention housekeeping.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Bulk import
--
-- Imports run as SECURITY INVOKER, so row-level security applies exactly as it
-- does for single-row writes. Each row is processed in its own subtransaction:
-- a bad row is reported and skipped, never aborting the batch. Rows that carry
-- a student/staff number are upserted on it (only keys present in the row are
-- overwritten), which makes re-importing the same spreadsheet safe.
-- -----------------------------------------------------------------------------

create function private.assert_import_batch(p_school_id uuid, p_rows jsonb)
returns void
language plpgsql
stable
set search_path = ''
as $$
begin
  if not private.can_manage_school(p_school_id) then
    raise exception using errcode = '42501', message = 'school_not_accessible';
  end if;
  if p_rows is null or jsonb_typeof(p_rows) <> 'array' then
    raise exception using errcode = 'SC030', message = 'import_rows_must_be_an_array';
  end if;
  if jsonb_array_length(p_rows) > 1000 then
    raise exception using errcode = 'SC030', message = 'import_batch_too_large';
  end if;
end;
$$;

create function private.import_error(p_index integer, p_sqlstate text, p_message text, p_detail text)
returns jsonb
language sql
immutable
set search_path = ''
as $$
  select jsonb_strip_nulls(jsonb_build_object(
    'index', p_index, 'code', p_sqlstate, 'message', p_message, 'detail', nullif(p_detail, '')
  ));
$$;

-- p_rows: [{ student_number?, first_name?, last_name?, preferred_name?, date_of_birth?, gender?,
--            grade_level?, section?, email?, phone?, address?, enrolled_on?, status?, notes?,
--            custom_fields?: {}, guardians?: [{ first_name?, last_name?, email?, phone?,
--            relationship?, is_primary? }] }]
-- Returns { inserted, updated, failed, errors: [{ index, code, message, detail? }] }
create function public.import_students(p_school_id uuid, p_rows jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  c_allowed constant text[] := array[
    'student_number', 'first_name', 'last_name', 'preferred_name', 'date_of_birth', 'gender',
    'grade_level', 'section', 'email', 'phone', 'address', 'enrolled_on', 'status', 'notes',
    'custom_fields', 'guardians'
  ];
  c_guardian_allowed constant text[] := array[
    'first_name', 'last_name', 'email', 'phone', 'relationship', 'is_primary'
  ];
  v_row jsonb;
  v_index integer;
  v_rec public.students;
  v_student_id uuid;
  v_inserted boolean;
  v_guardian jsonb;
  v_grec public.guardians;
  v_guardian_id uuid;
  v_unknown text;
  v_inserted_count integer := 0;
  v_updated_count integer := 0;
  v_errors jsonb := '[]'::jsonb;
  v_state text;
  v_message text;
  v_detail text;
begin
  perform private.assert_import_batch(p_school_id, p_rows);

  for v_row, v_index in
    select value, (ordinality - 1)::integer from jsonb_array_elements(p_rows) with ordinality
  loop
    begin
      if jsonb_typeof(v_row) <> 'object' then
        raise exception using errcode = 'SC030', message = 'import_row_must_be_an_object';
      end if;
      select k into v_unknown from jsonb_object_keys(v_row) k where k <> all (c_allowed) limit 1;
      if v_unknown is not null then
        raise exception using errcode = 'SC030', message = 'import_unknown_column', detail = v_unknown;
      end if;

      v_rec := jsonb_populate_record(null::public.students, v_row - 'guardians');

      insert into public.students as s (
        school_id, student_number, first_name, last_name, preferred_name, date_of_birth, gender,
        grade_level, section, email, phone, address, enrolled_on, status, notes, custom_fields
      ) values (
        p_school_id, v_rec.student_number, v_rec.first_name, v_rec.last_name, v_rec.preferred_name,
        v_rec.date_of_birth, v_rec.gender, v_rec.grade_level, v_rec.section, v_rec.email, v_rec.phone,
        v_rec.address, v_rec.enrolled_on, coalesce(v_rec.status, 'active'), v_rec.notes,
        coalesce(v_rec.custom_fields, '{}'::jsonb)
      )
      on conflict (school_id, student_number) do update set
        first_name     = case when v_row ? 'first_name'     then excluded.first_name     else s.first_name end,
        last_name      = case when v_row ? 'last_name'      then excluded.last_name      else s.last_name end,
        preferred_name = case when v_row ? 'preferred_name' then excluded.preferred_name else s.preferred_name end,
        date_of_birth  = case when v_row ? 'date_of_birth'  then excluded.date_of_birth  else s.date_of_birth end,
        gender         = case when v_row ? 'gender'         then excluded.gender         else s.gender end,
        grade_level    = case when v_row ? 'grade_level'    then excluded.grade_level    else s.grade_level end,
        section        = case when v_row ? 'section'        then excluded.section        else s.section end,
        email          = case when v_row ? 'email'          then excluded.email          else s.email end,
        phone          = case when v_row ? 'phone'          then excluded.phone          else s.phone end,
        address        = case when v_row ? 'address'        then excluded.address        else s.address end,
        enrolled_on    = case when v_row ? 'enrolled_on'    then excluded.enrolled_on    else s.enrolled_on end,
        status         = case when v_row ? 'status'         then excluded.status         else s.status end,
        notes          = case when v_row ? 'notes'          then excluded.notes          else s.notes end,
        custom_fields  = s.custom_fields || excluded.custom_fields
      returning s.id, (xmax = 0) into v_student_id, v_inserted;

      if v_row ? 'guardians' then
        if jsonb_typeof(v_row -> 'guardians') <> 'array' then
          raise exception using errcode = 'SC030', message = 'import_guardians_must_be_an_array';
        end if;

        for v_guardian in select value from jsonb_array_elements(v_row -> 'guardians') loop
          if jsonb_typeof(v_guardian) <> 'object' then
            raise exception using errcode = 'SC030', message = 'import_guardian_must_be_an_object';
          end if;
          select k into v_unknown from jsonb_object_keys(v_guardian) k where k <> all (c_guardian_allowed) limit 1;
          if v_unknown is not null then
            raise exception using errcode = 'SC030', message = 'import_unknown_column', detail = 'guardians.' || v_unknown;
          end if;

          v_grec := jsonb_populate_record(null::public.guardians, v_guardian - 'relationship' - 'is_primary');
          v_guardian_id := null;

          -- Re-use an existing guardian of this school with the same email.
          if v_grec.email is not null then
            update public.guardians g set
              first_name = coalesce(v_grec.first_name, g.first_name),
              last_name  = coalesce(v_grec.last_name, g.last_name),
              phone      = coalesce(v_grec.phone, g.phone)
            where g.school_id = p_school_id and lower(g.email) = lower(v_grec.email)
            returning g.id into v_guardian_id;
          end if;

          if v_guardian_id is null then
            insert into public.guardians (school_id, first_name, last_name, email, phone)
            values (p_school_id, v_grec.first_name, v_grec.last_name, v_grec.email, v_grec.phone)
            returning id into v_guardian_id;
          end if;

          insert into public.student_guardians as sg (school_id, student_id, guardian_id, relationship, is_primary)
          values (
            p_school_id, v_student_id, v_guardian_id,
            (v_guardian ->> 'relationship')::public.guardian_relationship,
            coalesce((v_guardian ->> 'is_primary')::boolean, false)
          )
          on conflict (student_id, guardian_id) do update set
            relationship = coalesce(excluded.relationship, sg.relationship),
            is_primary = case when v_guardian ? 'is_primary' then excluded.is_primary else sg.is_primary end;
        end loop;
      end if;

      if v_inserted then
        v_inserted_count := v_inserted_count + 1;
      else
        v_updated_count := v_updated_count + 1;
      end if;
    exception when others then
      get stacked diagnostics v_state = returned_sqlstate, v_message = message_text, v_detail = pg_exception_detail;
      v_errors := v_errors || private.import_error(v_index, v_state, v_message, v_detail);
    end;
  end loop;

  return jsonb_build_object(
    'inserted', v_inserted_count,
    'updated', v_updated_count,
    'failed', jsonb_array_length(v_errors),
    'errors', v_errors
  );
end;
$$;

-- p_rows: [{ staff_number?, title?, first_name?, last_name?, email?, phone?, date_of_birth?,
--            gender?, subject?, bio?, custom_fields?: {} }]
create function public.import_teachers(p_school_id uuid, p_rows jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  c_allowed constant text[] := array[
    'staff_number', 'title', 'first_name', 'last_name', 'email', 'phone', 'date_of_birth',
    'gender', 'subject', 'bio', 'custom_fields'
  ];
  v_row jsonb;
  v_index integer;
  v_rec public.teachers;
  v_inserted boolean;
  v_unknown text;
  v_inserted_count integer := 0;
  v_updated_count integer := 0;
  v_errors jsonb := '[]'::jsonb;
  v_state text;
  v_message text;
  v_detail text;
begin
  perform private.assert_import_batch(p_school_id, p_rows);

  for v_row, v_index in
    select value, (ordinality - 1)::integer from jsonb_array_elements(p_rows) with ordinality
  loop
    begin
      if jsonb_typeof(v_row) <> 'object' then
        raise exception using errcode = 'SC030', message = 'import_row_must_be_an_object';
      end if;
      select k into v_unknown from jsonb_object_keys(v_row) k where k <> all (c_allowed) limit 1;
      if v_unknown is not null then
        raise exception using errcode = 'SC030', message = 'import_unknown_column', detail = v_unknown;
      end if;

      v_rec := jsonb_populate_record(null::public.teachers, v_row);

      insert into public.teachers as t (
        school_id, staff_number, title, first_name, last_name, email, phone, date_of_birth,
        gender, subject, bio, custom_fields
      ) values (
        p_school_id, v_rec.staff_number, v_rec.title, v_rec.first_name, v_rec.last_name, v_rec.email,
        v_rec.phone, v_rec.date_of_birth, v_rec.gender, v_rec.subject, v_rec.bio,
        coalesce(v_rec.custom_fields, '{}'::jsonb)
      )
      on conflict (school_id, staff_number) do update set
        title         = case when v_row ? 'title'         then excluded.title         else t.title end,
        first_name    = case when v_row ? 'first_name'    then excluded.first_name    else t.first_name end,
        last_name     = case when v_row ? 'last_name'     then excluded.last_name     else t.last_name end,
        email         = case when v_row ? 'email'         then excluded.email         else t.email end,
        phone         = case when v_row ? 'phone'         then excluded.phone         else t.phone end,
        date_of_birth = case when v_row ? 'date_of_birth' then excluded.date_of_birth else t.date_of_birth end,
        gender        = case when v_row ? 'gender'        then excluded.gender        else t.gender end,
        subject       = case when v_row ? 'subject'       then excluded.subject       else t.subject end,
        bio           = case when v_row ? 'bio'           then excluded.bio           else t.bio end,
        custom_fields = t.custom_fields || excluded.custom_fields
      returning (xmax = 0) into v_inserted;

      if v_inserted then
        v_inserted_count := v_inserted_count + 1;
      else
        v_updated_count := v_updated_count + 1;
      end if;
    exception when others then
      get stacked diagnostics v_state = returned_sqlstate, v_message = message_text, v_detail = pg_exception_detail;
      v_errors := v_errors || private.import_error(v_index, v_state, v_message, v_detail);
    end;
  end loop;

  return jsonb_build_object(
    'inserted', v_inserted_count,
    'updated', v_updated_count,
    'failed', jsonb_array_length(v_errors),
    'errors', v_errors
  );
end;
$$;

-- -----------------------------------------------------------------------------
-- Bulk entry (gradebook, attendance register). One transaction per save; RLS
-- applies (SECURITY INVOKER).
-- -----------------------------------------------------------------------------

-- p_entries: [{ student_id, score?, letter?, comment? }]. An entry without any
-- value deletes the student's grade. Returns the number of grades stored.
create function public.save_grades(p_assessment_id uuid, p_entries jsonb)
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_school_id uuid;
  v_saved integer;
begin
  select a.school_id into v_school_id from public.assessments a where a.id = p_assessment_id;
  if v_school_id is null or not private.can_manage_school(v_school_id) then
    raise exception using errcode = '42501', message = 'assessment_not_accessible';
  end if;
  if jsonb_typeof(p_entries) <> 'array' or jsonb_array_length(p_entries) > 2000 then
    raise exception using errcode = 'SC030', message = 'invalid_entries';
  end if;

  with entries as (
    select
      (e ->> 'student_id')::uuid as student_id,
      nullif(e ->> 'score', '')::numeric as score,
      nullif(btrim(e ->> 'letter'), '') as letter,
      nullif(btrim(e ->> 'comment'), '') as comment
    from jsonb_array_elements(p_entries) e
  ),
  removed as (
    delete from public.grades g
    using entries x
    where g.assessment_id = p_assessment_id
      and g.student_id = x.student_id
      and x.score is null and x.letter is null and x.comment is null
  )
  insert into public.grades (school_id, assessment_id, student_id, score, letter, comment)
  select v_school_id, p_assessment_id, x.student_id, x.score, x.letter, x.comment
  from entries x
  where x.score is not null or x.letter is not null or x.comment is not null
  on conflict (assessment_id, student_id) do update set
    score = excluded.score,
    letter = excluded.letter,
    comment = excluded.comment;
  get diagnostics v_saved = row_count;
  return v_saved;
end;
$$;

-- Saves an attendance register for one date (and optionally one course/period).
-- p_entries: [{ student_id, status?, minutes_late?, note? }]; an entry without a
-- status deletes that student's record. Returns the number of records stored.
create function public.save_attendance(
  p_school_id uuid,
  p_date date,
  p_entries jsonb,
  p_course_id uuid default null,
  p_period text default null
)
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_saved integer;
begin
  if not private.can_manage_school(p_school_id) then
    raise exception using errcode = '42501', message = 'school_not_accessible';
  end if;
  if p_date is null or jsonb_typeof(p_entries) <> 'array' or jsonb_array_length(p_entries) > 5000 then
    raise exception using errcode = 'SC030', message = 'invalid_entries';
  end if;

  with entries as (
    select
      (e ->> 'student_id')::uuid as student_id,
      nullif(e ->> 'status', '')::public.attendance_status as status,
      nullif(e ->> 'minutes_late', '')::integer as minutes_late,
      nullif(btrim(e ->> 'note'), '') as note
    from jsonb_array_elements(p_entries) e
  ),
  removed as (
    delete from public.attendance_records ar
    using entries x
    where ar.school_id = p_school_id
      and ar.student_id = x.student_id
      and ar.attended_on = p_date
      and ar.course_id is not distinct from p_course_id
      and ar.period is not distinct from nullif(btrim(p_period), '')
      and x.status is null
  )
  insert into public.attendance_records (school_id, student_id, attended_on, status, course_id, period, minutes_late, note)
  select p_school_id, x.student_id, p_date, x.status, p_course_id, nullif(btrim(p_period), ''),
         case when x.status = 'late' then x.minutes_late end, x.note
  from entries x
  where x.status is not null
  on conflict on constraint attendance_records_unique_slot do update set
    status = excluded.status,
    minutes_late = excluded.minutes_late,
    note = excluded.note;
  get diagnostics v_saved = row_count;
  return v_saved;
end;
$$;

-- -----------------------------------------------------------------------------
-- Dashboards
-- -----------------------------------------------------------------------------

create function public.school_dashboard_stats(p_school_id uuid)
returns table (
  students_active bigint,
  students_total bigint,
  teachers_total bigint,
  courses_total bigint,
  guardians_total bigint,
  guardians_linked bigint,
  attendance_today jsonb,
  upcoming_events bigint
)
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  v_today date;
begin
  if not private.can_manage_school(p_school_id) then
    raise exception using errcode = '42501', message = 'school_not_accessible';
  end if;
  select (now() at time zone s.timezone)::date into v_today from public.schools s where s.id = p_school_id;

  return query
  select
    (select count(*) from public.students st where st.school_id = p_school_id and st.status = 'active'),
    (select count(*) from public.students st where st.school_id = p_school_id),
    (select count(*) from public.teachers t where t.school_id = p_school_id),
    (select count(*) from public.courses c where c.school_id = p_school_id),
    (select count(*) from public.guardians g where g.school_id = p_school_id),
    (select count(*) from public.guardians g where g.school_id = p_school_id and g.user_id is not null),
    (
      select coalesce(jsonb_object_agg(x.status, x.total), '{}'::jsonb)
      from (
        select ar.status, count(*) as total
        from public.attendance_records ar
        where ar.school_id = p_school_id and ar.attended_on = v_today and ar.course_id is null
        group by ar.status
      ) x
    ),
    (
      select count(*) from public.events e
      where e.school_id = p_school_id and e.starts_at between now() and now() + interval '30 days'
    );
end;
$$;

-- Enrols every active student of a grade (optionally one section) in a course.
-- Idempotent; returns the number of new enrolments.
create function public.enroll_student_group(p_course_id uuid, p_grade_level text, p_section text default null)
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_school_id uuid;
  v_count integer;
begin
  select c.school_id into v_school_id from public.courses c where c.id = p_course_id;
  if v_school_id is null or not private.can_manage_school(v_school_id) then
    raise exception using errcode = '42501', message = 'course_not_accessible';
  end if;

  insert into public.enrollments (school_id, course_id, student_id)
  select v_school_id, p_course_id, s.id
  from public.students s
  where s.school_id = v_school_id
    and s.status = 'active'
    and s.grade_level = p_grade_level
    and (nullif(btrim(p_section), '') is null or s.section = btrim(p_section))
  on conflict (course_id, student_id) do nothing;
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- Distinct grade level / section groups of active students (filters, registers).
create function public.school_student_groups(p_school_id uuid)
returns table (grade_level text, section text, student_count bigint)
language sql
stable
security invoker
set search_path = ''
as $$
  select s.grade_level, s.section, count(*)
  from public.students s
  where s.school_id = p_school_id and s.status = 'active' and s.grade_level is not null
  group by s.grade_level, s.section
  order by s.grade_level, s.section nulls first;
$$;

create function public.platform_school_overview()
returns table (
  school_id uuid,
  name text,
  slug text,
  status public.school_status,
  created_at timestamptz,
  staff_count bigint,
  students_count bigint,
  guardians_linked_count bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not (select private.is_platform_admin()) then
    raise exception using errcode = '42501', message = 'platform_admin_required';
  end if;

  return query
  select
    s.id, s.name, s.slug, s.status, s.created_at,
    (select count(*) from public.school_members m where m.school_id = s.id),
    (select count(*) from public.students st where st.school_id = s.id),
    (select count(*) from public.guardians g where g.school_id = s.id and g.user_id is not null)
  from public.schools s
  order by s.name;
end;
$$;

-- -----------------------------------------------------------------------------
-- Account context: which interfaces the signed-in user may use. Apps call this
-- right after sign-in to route the user (platform / school / parent).
-- -----------------------------------------------------------------------------

create function public.my_account_context()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'user_id', (select auth.uid()),
    'is_platform_admin', exists (select 1 from public.platform_admins pa where pa.user_id = (select auth.uid())),
    'memberships', coalesce((
      select jsonb_agg(jsonb_build_object(
        'school_id', s.id,
        'school_name', s.name,
        'slug', s.slug,
        'role', m.role,
        'logo_path', s.logo_path,
        'primary_color', s.primary_color,
        'default_locale', s.default_locale,
        'timezone', s.timezone,
        'enabled_modules', to_jsonb(s.enabled_modules)
      ) order by s.name)
      from public.school_members m
      join public.schools s on s.id = m.school_id
      where m.user_id = (select auth.uid()) and s.status = 'active'
    ), '[]'::jsonb),
    'children_count', (select count(distinct sid) from private.guardian_student_ids() sid)
  );
$$;

-- -----------------------------------------------------------------------------
-- Push notification tokens (FCM). One row per device token.
-- -----------------------------------------------------------------------------

create type public.device_platform as enum ('ios', 'android', 'web');

create table public.push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  token text not null unique check (char_length(token) between 1 and 4096),
  platform public.device_platform not null,
  locale public.app_locale,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create index push_tokens_user_idx on public.push_tokens (user_id);

alter table public.push_tokens enable row level security;

create policy push_tokens_select on public.push_tokens for select to authenticated
  using (user_id = (select auth.uid()));
create policy push_tokens_delete on public.push_tokens for delete to authenticated
  using (user_id = (select auth.uid()));

grant select, delete on public.push_tokens to authenticated;
grant all on public.push_tokens to service_role;

-- A device token moves to whoever signed in on that device most recently.
create function public.register_push_token(
  p_token text,
  p_platform public.device_platform,
  p_locale public.app_locale default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then
    raise exception using errcode = '42501', message = 'not_authenticated';
  end if;

  insert into public.push_tokens (user_id, token, platform, locale)
  values ((select auth.uid()), p_token, p_platform, p_locale)
  on conflict (token) do update set
    user_id = excluded.user_id,
    platform = excluded.platform,
    locale = excluded.locale,
    last_seen_at = now();
end;
$$;

-- -----------------------------------------------------------------------------
-- Server-side helpers (service role only)
-- -----------------------------------------------------------------------------

-- Used by the web server when the platform admin adds a school admin by email.
create function public.admin_find_user_by_email(p_email text)
returns table (user_id uuid, email_confirmed boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select u.id, u.email_confirmed_at is not null
  from auth.users u
  where lower(u.email) = lower(p_email) and u.deleted_at is null
  order by u.created_at
  limit 1;
$$;

-- -----------------------------------------------------------------------------
-- Housekeeping (schedule with pg_cron in production; see docs/operations.md)
-- -----------------------------------------------------------------------------

create function private.run_retention(
  p_audit_retention interval default interval '2 years',
  p_push_token_retention interval default interval '270 days'
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.audit_log where occurred_at < now() - p_audit_retention;
  delete from public.guardian_invite_attempts where attempted_at < now() - interval '7 days';
  delete from public.guardian_invites
  where coalesce(redeemed_at, revoked_at, expires_at) < now() - interval '90 days';
  delete from public.push_tokens where last_seen_at < now() - p_push_token_retention;
end;
$$;

-- -----------------------------------------------------------------------------
-- Grants
-- -----------------------------------------------------------------------------

grant execute on function
  private.assert_import_batch(uuid, jsonb),
  private.import_error(integer, text, text, text)
to authenticated, service_role;

grant execute on function
  public.is_platform_admin_account(),
  public.import_students(uuid, jsonb),
  public.import_teachers(uuid, jsonb),
  public.save_grades(uuid, jsonb),
  public.save_attendance(uuid, date, jsonb, uuid, text),
  public.school_dashboard_stats(uuid),
  public.school_student_groups(uuid),
  public.enroll_student_group(uuid, text, text),
  public.platform_school_overview(),
  public.my_account_context(),
  public.register_push_token(text, public.device_platform, public.app_locale)
to authenticated, service_role;

grant execute on function private.run_retention(interval, interval) to service_role;
revoke execute on function public.admin_find_user_by_email(text) from authenticated;
grant execute on function public.admin_find_user_by_email(text) to service_role;
