-- =============================================================================
-- Schools (tenants), school staff memberships and the access helpers that
-- every row-level security policy is built on.
-- =============================================================================

create type public.school_status as enum ('active', 'suspended');

-- `admin` manages everything in a school, including settings and staff.
-- `staff` manages school data (students, grades, attendance, ...) but not
-- settings or staff accounts. New roles (e.g. teacher) can be added later with
-- `alter type ... add value`.
create type public.school_role as enum ('admin', 'staff');

-- Optional feature modules a school can switch on or off. Students and
-- guardians are always available.
create type public.school_module as enum (
  'teachers', 'courses', 'grades', 'attendance', 'notes', 'events'
);

create table public.schools (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 200),
  slug text not null unique check (slug ~ '^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$'),
  status public.school_status not null default 'active',
  -- Customisation
  enabled_modules public.school_module[] not null
    default array['teachers', 'courses', 'grades', 'attendance', 'notes', 'events']::public.school_module[],
  primary_color public.hex_color,
  logo_path text check (char_length(logo_path) <= 1024),
  default_locale public.app_locale not null default 'en',
  timezone text not null default 'UTC',
  -- Free-form settings for future knobs. Validated by the application layer.
  settings jsonb not null default '{}'::jsonb check (jsonb_typeof(settings) = 'object'),
  -- Contact details
  contact_email public.email_address,
  contact_phone text check (char_length(contact_phone) <= 50),
  address text check (char_length(address) <= 500),
  website text check (char_length(website) <= 2048),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create function private.validate_school()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  -- Reject unknown IANA time zones.
  perform now() at time zone new.timezone;
  -- De-duplicate modules so membership checks stay simple.
  new.enabled_modules := array(select distinct unnest(new.enabled_modules) order by 1);
  return new;
exception
  when invalid_parameter_value then
    raise exception using errcode = 'SC010', message = 'invalid_timezone';
end;
$$;

create trigger validate_school before insert or update on public.schools
  for each row execute function private.validate_school();

select private.attach_standard_triggers('public.schools', p_school_scoped => false);

create table public.school_members (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role public.school_role not null default 'staff',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (school_id, user_id)
);

create index school_members_user_idx on public.school_members (user_id);

select private.attach_standard_triggers('public.school_members');

-- -----------------------------------------------------------------------------
-- Access helpers. SECURITY DEFINER so policies can consult membership tables
-- without recursing into their own RLS. Callers should wrap them in a scalar
-- sub-select, e.g. `school_id in (select private.staff_school_ids())`, so the
-- planner evaluates them once per statement instead of once per row.
-- -----------------------------------------------------------------------------

-- Active schools where the current user is staff (any role).
create function private.staff_school_ids()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select m.school_id
  from public.school_members m
  join public.schools s on s.id = m.school_id
  where m.user_id = (select auth.uid())
    and s.status = 'active';
$$;

-- Active schools where the current user is an admin.
create function private.admin_school_ids()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select m.school_id
  from public.school_members m
  join public.schools s on s.id = m.school_id
  where m.user_id = (select auth.uid())
    and m.role = 'admin'
    and s.status = 'active';
$$;

-- Users who share at least one school with the current user.
create function private.colleague_user_ids()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select distinct m.user_id
  from public.school_members m
  where m.school_id in (select private.staff_school_ids());
$$;

-- Platform admins see everything; otherwise the school must be one of the
-- user's staff schools.
create function private.can_manage_school(p_school_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select private.is_platform_admin())
    or p_school_id in (select private.staff_school_ids());
$$;

create function private.can_admin_school(p_school_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select private.is_platform_admin())
    or p_school_id in (select private.admin_school_ids());
$$;

-- -----------------------------------------------------------------------------
-- Guard rails
-- -----------------------------------------------------------------------------

-- Only platform admins (or trusted server-side code) may change a school's
-- identity or lifecycle status.
create function private.guard_school_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user in ('authenticated', 'anon')
     and not (select private.is_platform_admin())
     and (new.slug is distinct from old.slug or new.status is distinct from old.status) then
    raise exception using errcode = '42501', message = 'only_platform_admin_can_change_slug_or_status';
  end if;
  return new;
end;
$$;

create trigger guard_school_update before update on public.schools
  for each row execute function private.guard_school_update();

-- A school must always keep at least one admin, unless a platform admin (or
-- the service role / school deletion cascade) is making the change.
create function private.guard_last_school_admin()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.role <> 'admin'
     or (tg_op = 'UPDATE' and new.role = 'admin')
     or (select private.is_platform_admin())
     or (select auth.uid()) is null
     or not exists (select 1 from public.schools s where s.id = old.school_id) then
    return coalesce(new, old);
  end if;

  if not exists (
    select 1 from public.school_members m
    where m.school_id = old.school_id and m.role = 'admin' and m.id <> old.id
  ) then
    raise exception using errcode = 'SC011', message = 'school_requires_an_admin';
  end if;
  return coalesce(new, old);
end;
$$;

create trigger guard_last_school_admin before update of role or delete on public.school_members
  for each row execute function private.guard_last_school_admin();

-- -----------------------------------------------------------------------------
-- Row-level security
-- -----------------------------------------------------------------------------

alter table public.schools enable row level security;
alter table public.school_members enable row level security;
alter table public.profiles enable row level security;
alter table public.platform_admins enable row level security;
alter table public.audit_log enable row level security;

-- schools
create policy schools_select on public.schools for select to authenticated
  using ((select private.is_platform_admin()) or id in (select private.staff_school_ids()));
create policy schools_insert on public.schools for insert to authenticated
  with check ((select private.is_platform_admin()));
create policy schools_update on public.schools for update to authenticated
  using ((select private.is_platform_admin()) or id in (select private.admin_school_ids()))
  with check ((select private.is_platform_admin()) or id in (select private.admin_school_ids()));
create policy schools_delete on public.schools for delete to authenticated
  using ((select private.is_platform_admin()));

-- school_members: staff see their colleagues; admins manage staff.
create policy school_members_select on public.school_members for select to authenticated
  using (
    (select private.is_platform_admin())
    or user_id = (select auth.uid())
    or school_id in (select private.staff_school_ids())
  );
create policy school_members_insert on public.school_members for insert to authenticated
  with check ((select private.is_platform_admin()) or school_id in (select private.admin_school_ids()));
create policy school_members_update on public.school_members for update to authenticated
  using ((select private.is_platform_admin()) or school_id in (select private.admin_school_ids()))
  with check ((select private.is_platform_admin()) or school_id in (select private.admin_school_ids()));
create policy school_members_delete on public.school_members for delete to authenticated
  using ((select private.is_platform_admin()) or school_id in (select private.admin_school_ids()));

-- profiles: own profile, colleagues' profiles, platform admins see all.
create policy profiles_select on public.profiles for select to authenticated
  using (
    id = (select auth.uid())
    or (select private.is_platform_admin())
    or id in (select private.colleague_user_ids())
  );
create policy profiles_update on public.profiles for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- platform_admins: visible to platform admins only; writes via service role.
create policy platform_admins_select on public.platform_admins for select to authenticated
  using ((select private.is_platform_admin()));

-- audit_log: platform admins see everything, school admins see their school.
create policy audit_log_select on public.audit_log for select to authenticated
  using ((select private.is_platform_admin()) or school_id in (select private.admin_school_ids()));

-- -----------------------------------------------------------------------------
-- Grants (explicit; nothing is exposed to `anon`)
-- -----------------------------------------------------------------------------

grant select, insert, update, delete on public.schools to authenticated;
grant select, insert, update, delete on public.school_members to authenticated;
grant select on public.profiles to authenticated;
grant update (full_name, avatar_url, locale) on public.profiles to authenticated;
grant select on public.platform_admins to authenticated;
grant select on public.audit_log to authenticated;

grant all on public.schools, public.school_members, public.profiles,
  public.platform_admins, public.audit_log to service_role;

grant execute on function
  private.is_platform_admin(),
  private.staff_school_ids(),
  private.admin_school_ids(),
  private.colleague_user_ids(),
  private.can_manage_school(uuid),
  private.can_admin_school(uuid)
to authenticated, service_role;
