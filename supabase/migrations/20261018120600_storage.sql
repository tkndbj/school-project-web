-- =============================================================================
-- File storage: one private bucket for school media (photos, logos).
--
-- Object paths: {school_id}/{kind}/{entity_id}/{file}
--   kind = 'students' | 'teachers'  (entity_id = the student/teacher id)
--   kind = 'branding'               (entity_id = 'logo' or any label)
--
-- Files are never public; clients request short-lived signed URLs, which
-- requires SELECT access under the policies below.
-- =============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('school-media', 'school-media', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create function private.try_uuid(p_value text)
returns uuid
language sql
immutable
set search_path = ''
as $$
  select case
    when p_value ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then p_value::uuid
  end;
$$;

create function private.media_school_id(p_name text)
returns uuid
language sql
immutable
set search_path = ''
as $$
  select private.try_uuid(split_part(p_name, '/', 1));
$$;

create function private.media_kind(p_name text)
returns text
language sql
immutable
set search_path = ''
as $$
  select nullif(split_part(p_name, '/', 2), '');
$$;

create function private.guardian_can_read_media(p_name text)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_school_id uuid := private.media_school_id(p_name);
  v_entity_id uuid := private.try_uuid(split_part(p_name, '/', 3));
begin
  if v_school_id is null then
    return false;
  end if;

  case private.media_kind(p_name)
    when 'branding' then
      return exists (
        select 1 from public.students st
        where st.school_id = v_school_id
          and st.id in (select private.guardian_student_ids())
      );
    when 'students' then
      return v_entity_id in (select private.guardian_student_ids());
    when 'teachers' then
      return exists (
        select 1
        from public.course_teachers ct
        join public.enrollments e on e.course_id = ct.course_id
        where ct.school_id = v_school_id
          and ct.teacher_id = v_entity_id
          and e.student_id in (select private.guardian_student_ids())
      );
    else
      return false;
  end case;
end;
$$;

-- Staff may write student/teacher media; branding is admin-only.
create function private.can_write_media(p_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(case private.media_kind(p_name)
    when 'students' then
      private.try_uuid(split_part(p_name, '/', 3)) is not null
      and private.can_manage_school(private.media_school_id(p_name))
    when 'teachers' then
      private.try_uuid(split_part(p_name, '/', 3)) is not null
      and private.can_manage_school(private.media_school_id(p_name))
    when 'branding' then
      private.can_admin_school(private.media_school_id(p_name))
    else false
  end, false);
$$;

grant execute on function
  private.try_uuid(text),
  private.media_school_id(text),
  private.media_kind(text),
  private.guardian_can_read_media(text),
  private.can_write_media(text)
to authenticated, service_role;

create policy school_media_select on storage.objects for select to authenticated
  using (
    bucket_id = 'school-media'
    and (
      (select private.is_platform_admin())
      or private.media_school_id(name) in (select private.staff_school_ids())
      or private.guardian_can_read_media(name)
    )
  );

create policy school_media_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'school-media' and private.can_write_media(name));

create policy school_media_update on storage.objects for update to authenticated
  using (bucket_id = 'school-media' and private.can_write_media(name))
  with check (bucket_id = 'school-media' and private.can_write_media(name));

create policy school_media_delete on storage.objects for delete to authenticated
  using (bucket_id = 'school-media' and private.can_write_media(name));
