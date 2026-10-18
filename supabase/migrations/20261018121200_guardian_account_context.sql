-- A guardian can be connected to a school before staff links a student.
-- Keep that connection separate from child access so clients can display an
-- accurate waiting state without granting access to unrelated students.
create or replace function public.my_account_context()
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
      ) order by s.name, s.id)
      from public.school_members m
      join public.schools s on s.id = m.school_id
      where m.user_id = (select auth.uid()) and s.status = 'active'
    ), '[]'::jsonb),
    'guardian_schools', coalesce((
      select jsonb_agg(jsonb_build_object(
        'school_id', s.id,
        'school_name', s.name
      ) order by s.name, s.id)
      from public.schools s
      join (
        select distinct g.school_id
        from public.guardians g
        where g.user_id = (select auth.uid())
      ) own_schools on own_schools.school_id = s.id
      where s.status = 'active'
    ), '[]'::jsonb),
    'children_count', (select count(distinct sid) from private.guardian_student_ids() sid)
  );
$$;

revoke all on function public.my_account_context() from public, anon;
grant execute on function public.my_account_context() to authenticated, service_role;
