-- Stable tie breakers for Data API range pagination on long histories.

create or replace function public.guardian_student_courses(p_student_id uuid)
returns table (
  course_id uuid,
  name text,
  code text,
  subject text,
  color text,
  term_id uuid,
  term_name text,
  -- [{ id, title, first_name, last_name, email, subject, photo_path }]
  teachers jsonb
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_ctx record;
begin
  v_ctx := private.student_access_context(p_student_id);
  if not ('courses' = any (v_ctx.enabled_modules)) then
    return;
  end if;

  return query
  select
    c.id, c.name, c.code, c.subject, c.color::text, t.id, t.name,
    case when 'teachers' = any (v_ctx.enabled_modules) then
      coalesce((
        select jsonb_agg(jsonb_build_object(
          'id', te.id, 'title', te.title, 'first_name', te.first_name, 'last_name', te.last_name,
          'email', te.email, 'subject', te.subject, 'photo_path', te.photo_path
        ) order by te.last_name, te.first_name)
        from public.course_teachers ct
        join public.teachers te on te.id = ct.teacher_id
        where ct.course_id = c.id
      ), '[]'::jsonb)
    else '[]'::jsonb end
  from public.enrollments e
  join public.courses c on c.id = e.course_id
  left join public.academic_terms t on t.id = c.term_id
  where e.student_id = p_student_id
  order by t.starts_on desc nulls last, c.name, c.id;
end;
$$;

create or replace function public.guardian_student_grades(p_student_id uuid, p_term_id uuid default null)
returns table (
  grade_id uuid,
  assessment_id uuid,
  assessment_title text,
  assessment_kind public.assessment_kind,
  assessed_on date,
  max_score numeric,
  weight numeric,
  score numeric,
  letter text,
  comment text,
  course_id uuid,
  course_name text,
  term_id uuid,
  published_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_ctx record;
begin
  v_ctx := private.student_access_context(p_student_id);
  if not ('grades' = any (v_ctx.enabled_modules)) then
    return;
  end if;

  return query
  select
    g.id, a.id, a.title, a.kind, a.assessed_on, a.max_score, a.weight,
    g.score, g.letter, g.comment, c.id, c.name, coalesce(a.term_id, c.term_id), a.published_at
  from public.grades g
  join public.assessments a on a.id = g.assessment_id
  join public.courses c on c.id = a.course_id
  where g.student_id = p_student_id
    and a.published_at is not null
    and a.published_at <= now()
    and (p_term_id is null or coalesce(a.term_id, c.term_id) = p_term_id)
  order by a.assessed_on desc nulls last, a.published_at desc, g.id;
end;
$$;

create or replace function public.guardian_student_attendance(p_student_id uuid, p_from date, p_to date)
returns table (
  record_id uuid,
  attended_on date,
  status public.attendance_status,
  course_id uuid,
  course_name text,
  period text,
  minutes_late integer,
  note text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_ctx record;
begin
  perform private.assert_date_range(p_from, p_to, 366);
  v_ctx := private.student_access_context(p_student_id);
  if not ('attendance' = any (v_ctx.enabled_modules)) then
    return;
  end if;

  return query
  select ar.id, ar.attended_on, ar.status, c.id, c.name, ar.period, ar.minutes_late, ar.note
  from public.attendance_records ar
  left join public.courses c on c.id = ar.course_id
  where ar.student_id = p_student_id
    and ar.attended_on between p_from and p_to
  order by ar.attended_on desc, ar.period nulls first, ar.id;
end;
$$;

create or replace function public.guardian_student_events(p_student_id uuid, p_from timestamptz, p_to timestamptz)
returns table (
  event_id uuid,
  title text,
  description text,
  location text,
  starts_at timestamptz,
  ends_at timestamptz,
  all_day boolean,
  color text,
  course_id uuid,
  course_name text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_ctx record;
begin
  if p_from is null or p_to is null or p_to < p_from or p_to - p_from > interval '400 days' then
    raise exception using errcode = 'SC020', message = 'invalid_date_range';
  end if;
  v_ctx := private.student_access_context(p_student_id);
  if not ('events' = any (v_ctx.enabled_modules)) then
    return;
  end if;

  return query
  select ev.id, ev.title, ev.description, ev.location, ev.starts_at, ev.ends_at, ev.all_day,
         ev.color::text, c.id, c.name
  from public.events ev
  left join public.courses c on c.id = ev.course_id
  where ev.school_id = v_ctx.school_id
    and ev.visible_to_guardians
    and ev.starts_at < p_to
    and coalesce(ev.ends_at, ev.starts_at) >= p_from
    and (
      ev.course_id is null
      or exists (select 1 from public.enrollments e where e.course_id = ev.course_id and e.student_id = p_student_id)
    )
  order by ev.starts_at, ev.id;
end;
$$;

revoke execute on all functions in schema public, private from public, anon;
