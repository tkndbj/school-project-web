-- =============================================================================
-- Row-level security for school-owned data tables.
--
-- Staff (admin or staff role) of an active school have full CRUD on that
-- school's data; platform admins (with MFA) have full CRUD everywhere.
-- Guardians have NO direct table access: they read through the curated
-- guardian_* functions (see guardian_access migration), which return exactly
-- the fields a parent may see.
--
-- Custom field definitions are school configuration and therefore admin-only
-- for writes.
-- =============================================================================

do $$
declare
  v_table text;
  v_staff_tables text[] := array[
    'students', 'teachers', 'guardians', 'student_guardians',
    'academic_terms', 'courses', 'course_teachers', 'enrollments',
    'assessments', 'grades', 'attendance_records', 'student_notes', 'events'
  ];
begin
  foreach v_table in array v_staff_tables loop
    execute format('alter table public.%I enable row level security', v_table);

    execute format($p$
      create policy %1$s_select on public.%1$I for select to authenticated
        using ((select private.is_platform_admin()) or school_id in (select private.staff_school_ids()))
    $p$, v_table);
    execute format($p$
      create policy %1$s_insert on public.%1$I for insert to authenticated
        with check ((select private.is_platform_admin()) or school_id in (select private.staff_school_ids()))
    $p$, v_table);
    execute format($p$
      create policy %1$s_update on public.%1$I for update to authenticated
        using ((select private.is_platform_admin()) or school_id in (select private.staff_school_ids()))
        with check ((select private.is_platform_admin()) or school_id in (select private.staff_school_ids()))
    $p$, v_table);
    execute format($p$
      create policy %1$s_delete on public.%1$I for delete to authenticated
        using ((select private.is_platform_admin()) or school_id in (select private.staff_school_ids()))
    $p$, v_table);

    execute format('grant select, insert, update, delete on public.%I to authenticated', v_table);
    execute format('grant all on public.%I to service_role', v_table);
  end loop;
end;
$$;

-- Guardian account links are managed by the linking functions, not by hand:
-- staff can unlink (set user_id to null) but never point a guardian record at
-- an arbitrary account.
create function private.guard_guardian_link()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  -- Inside the SECURITY DEFINER linking functions current_user is the function
  -- owner; the service role is trusted as well. Only API users are restricted.
  if current_user not in ('authenticated', 'anon') then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if new.user_id is not null or new.link_method is not null or new.linked_at is not null then
      raise exception using errcode = '42501', message = 'guardian_link_is_managed';
    end if;
  elsif new.user_id is not null
        and (new.user_id is distinct from old.user_id
             or new.link_method is distinct from old.link_method
             or new.linked_at is distinct from old.linked_at) then
    raise exception using errcode = '42501', message = 'guardian_link_is_managed';
  end if;
  return new;
end;
$$;

create trigger guard_guardian_link before insert or update on public.guardians
  for each row execute function private.guard_guardian_link();

-- custom_field_definitions: readable by staff, writable by school admins.
alter table public.custom_field_definitions enable row level security;

create policy custom_field_definitions_select on public.custom_field_definitions for select to authenticated
  using ((select private.is_platform_admin()) or school_id in (select private.staff_school_ids()));
create policy custom_field_definitions_insert on public.custom_field_definitions for insert to authenticated
  with check ((select private.is_platform_admin()) or school_id in (select private.admin_school_ids()));
create policy custom_field_definitions_update on public.custom_field_definitions for update to authenticated
  using ((select private.is_platform_admin()) or school_id in (select private.admin_school_ids()))
  with check ((select private.is_platform_admin()) or school_id in (select private.admin_school_ids()));
create policy custom_field_definitions_delete on public.custom_field_definitions for delete to authenticated
  using ((select private.is_platform_admin()) or school_id in (select private.admin_school_ids()));

grant select, insert, update, delete on public.custom_field_definitions to authenticated;
grant all on public.custom_field_definitions to service_role;
