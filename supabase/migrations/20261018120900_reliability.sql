-- Serialize administrator removals per school. The check must run after the
-- lock is acquired so two concurrent removals cannot each observe the other.
create or replace function private.guard_last_school_admin()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if old.role <> 'admin' or (tg_op = 'UPDATE' and new.role = 'admin')
     or (select private.is_platform_admin()) or (select auth.uid()) is null then
    return coalesce(new, old);
  end if;
  perform 1 from public.schools where id = old.school_id for no key update;
  if not found then return coalesce(new, old); end if;
  if not exists (
    select 1 from public.school_members m
    where m.school_id = old.school_id and m.role = 'admin' and m.id <> old.id
  ) then
    raise exception using errcode = 'SC011', message = 'school_requires_an_admin';
  end if;
  return coalesce(new, old);
end;
$$;

-- Auth deletion uses the privileged Auth API, so its final invariant must be
-- enforced inside the deleting transaction, including concurrent deletions.
create function private.guard_auth_user_deletion()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_school_id uuid;
begin
  if exists (select 1 from public.platform_admins where user_id = old.id) then
    raise exception using errcode = '42501', message = 'platform_admin_cannot_self_delete';
  end if;
  for v_school_id in
    select s.id from public.schools s
    join public.school_members m on m.school_id = s.id
    where m.user_id = old.id and m.role = 'admin'
    order by s.id for no key update of s
  loop
    if not exists (
      select 1 from public.school_members m
      where m.school_id = v_school_id and m.role = 'admin' and m.user_id <> old.id
    ) then
      raise exception using errcode = 'SC011', message = 'school_requires_an_admin';
    end if;
  end loop;
  return old;
end;
$$;
create trigger guard_auth_user_deletion before delete on auth.users
for each row execute function private.guard_auth_user_deletion();

-- Return account status in one authorised query, without one Auth API call
-- per colleague or exposing any other auth.users columns.
create function public.school_member_accounts(p_school_id uuid)
returns table (id uuid, user_id uuid, role public.school_role, email text,
  full_name text, pending boolean, last_sign_in_at timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not private.can_admin_school(p_school_id) then
    raise exception using errcode = '42501', message = 'school_not_accessible';
  end if;
  return query
  select m.id, m.user_id, m.role, u.email::text, p.full_name,
    u.email_confirmed_at is null and u.last_sign_in_at is null, u.last_sign_in_at
  from public.school_members m
  join auth.users u on u.id = m.user_id
  left join public.profiles p on p.id = m.user_id
  where m.school_id = p_school_id
  order by m.created_at, m.id;
end;
$$;

-- Composite keyset cursors keep notes with equal timestamps from being
-- skipped (all inserts in a transaction can have the same created_at).
create index student_notes_guardian_cursor_idx
on public.student_notes (student_id, created_at desc, id desc)
where visible_to_guardians;

create function public.guardian_student_notes_page(
  p_student_id uuid, p_before timestamptz default null,
  p_before_id uuid default null, p_limit integer default 20
)
returns table (note_id uuid, title text, body text, category text,
  created_at timestamptz, teacher_name text)
language plpgsql stable security definer set search_path = '' as $$
declare v_ctx record;
begin
  v_ctx := private.student_access_context(p_student_id);
  if not ('notes' = any(v_ctx.enabled_modules)) then return; end if;
  if (p_before is null) <> (p_before_id is null) then
    raise exception using errcode = 'SC020', message = 'invalid_note_cursor';
  end if;
  return query
  select n.id, n.title, n.body, n.category, n.created_at,
    nullif(concat_ws(' ', te.title, te.first_name, te.last_name), '')
  from public.student_notes n
  left join public.teachers te on te.id = n.teacher_id
  where n.student_id = p_student_id and n.visible_to_guardians
    and (p_before is null or (n.created_at, n.id) < (p_before, p_before_id))
  order by n.created_at desc, n.id desc
  limit least(greatest(coalesce(p_limit, 20), 1), 100);
end;
$$;

grant execute on function public.school_member_accounts(uuid),
  public.guardian_student_notes_page(uuid, timestamptz, uuid, integer)
to authenticated, service_role;
revoke execute on all functions in schema public, private from public, anon;
