-- =============================================================================
-- Foundation: schemas, extensions, shared types, utility triggers, audit log,
-- user profiles and platform administrators.
--
-- Conventions used across all migrations:
--   * Every table lives in `public` (exposed through the Data API) and has RLS
--     enabled. Nothing is reachable without an explicit GRANT + policy
--     (`auto_expose_new_tables = false` in config.toml).
--   * Helper functions that policies depend on live in `private`, which is NOT
--     exposed through the Data API.
--   * SECURITY DEFINER functions always pin `search_path = ''` and fully
--     qualify every object they reference.
--   * Application errors use custom SQLSTATEs (class SC) so clients can map
--     them to translated messages. See docs/database.md.
-- =============================================================================

-- Supabase grants the API roles full access to new objects in `public` by
-- default. Opt out so every table/function must be granted explicitly.
-- (PostgreSQL also grants EXECUTE on every new function to PUBLIC; that
-- built-in default cannot be revoked per schema, so the final migration of each
-- release revokes it explicitly. The schema security test enforces this.)
alter default privileges for role postgres in schema public revoke all on tables from anon, authenticated;
alter default privileges for role postgres in schema public revoke all on sequences from anon, authenticated;
alter default privileges for role postgres in schema public revoke execute on functions from anon, authenticated;

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated, service_role;

create extension if not exists pg_trgm with schema extensions;

-- -----------------------------------------------------------------------------
-- Shared types
-- -----------------------------------------------------------------------------

create domain public.email_address as text
  check (char_length(value) <= 320 and value ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$');

create domain public.hex_color as text
  check (value ~ '^#[0-9a-fA-F]{6}$');

-- Supported UI locales. Add a language by replacing this check constraint.
create domain public.app_locale as text
  check (value in ('en', 'tr'));

create type public.gender as enum ('female', 'male', 'other', 'undisclosed');

-- -----------------------------------------------------------------------------
-- Utility trigger functions
-- -----------------------------------------------------------------------------

create function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- Rows never move between schools. Composite foreign keys already prevent
-- cross-school references; this closes the remaining gap of re-parenting a row.
create function private.prevent_school_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.school_id is distinct from old.school_id then
    raise exception using
      errcode = '42501',
      message = 'school_id is immutable';
  end if;
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- Audit log
-- -----------------------------------------------------------------------------

create table public.audit_log (
  id bigint generated always as identity primary key,
  occurred_at timestamptz not null default now(),
  school_id uuid,
  actor_id uuid,
  actor_role text,
  table_name text not null,
  record_id uuid,
  action text not null check (action in ('INSERT', 'UPDATE', 'DELETE')),
  -- INSERT: full new row. UPDATE: only the changed columns (old and new values).
  -- DELETE: full old row.
  old_data jsonb,
  new_data jsonb
);

comment on table public.audit_log is
  'Append-only change history for every school-owned table. Written by private.audit_row_change().';

create index audit_log_school_occurred_idx on public.audit_log (school_id, occurred_at desc);
create index audit_log_record_idx on public.audit_log (record_id, occurred_at desc);
create index audit_log_occurred_brin_idx on public.audit_log using brin (occurred_at);

create function private.audit_row_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_old jsonb;
  v_new jsonb;
  v_row jsonb;
  v_school_id uuid;
  v_changed_old jsonb := '{}'::jsonb;
  v_changed_new jsonb := '{}'::jsonb;
  v_key text;
  v_claims jsonb := nullif(current_setting('request.jwt.claims', true), '')::jsonb;
begin
  if tg_op in ('UPDATE', 'DELETE') then v_old := to_jsonb(old); end if;
  if tg_op in ('INSERT', 'UPDATE') then v_new := to_jsonb(new); end if;
  v_row := coalesce(v_new, v_old);

  if tg_op = 'UPDATE' then
    for v_key in select jsonb_object_keys(v_new) loop
      if v_key <> 'updated_at' and (v_new -> v_key) is distinct from (v_old -> v_key) then
        v_changed_old := v_changed_old || jsonb_build_object(v_key, v_old -> v_key);
        v_changed_new := v_changed_new || jsonb_build_object(v_key, v_new -> v_key);
      end if;
    end loop;
    if v_changed_new = '{}'::jsonb then
      return null; -- no-op update, nothing to record
    end if;
    v_old := v_changed_old;
    v_new := v_changed_new;
  end if;

  v_school_id := case
    when tg_table_name = 'schools' then (v_row ->> 'id')::uuid
    else (v_row ->> 'school_id')::uuid
  end;

  insert into public.audit_log (school_id, actor_id, actor_role, table_name, record_id, action, old_data, new_data)
  values (
    v_school_id,
    (v_claims ->> 'sub')::uuid,
    coalesce(v_claims ->> 'role', current_user),
    tg_table_name,
    (v_row ->> 'id')::uuid,
    tg_op,
    v_old,
    v_new
  );
  return null;
end;
$$;

-- Attach the standard triggers (updated_at, immutable school_id, audit) to a table.
create function private.attach_standard_triggers(p_table regclass, p_school_scoped boolean default true)
returns void
language plpgsql
set search_path = ''
as $$
begin
  execute format(
    'create trigger set_updated_at before update on %s for each row execute function private.set_updated_at()',
    p_table);
  if p_school_scoped then
    execute format(
      'create trigger prevent_school_change before update of school_id on %s for each row execute function private.prevent_school_change()',
      p_table);
  end if;
  execute format(
    'create trigger audit_row_change after insert or update or delete on %s for each row execute function private.audit_row_change()',
    p_table);
end;
$$;

-- -----------------------------------------------------------------------------
-- Profiles (one per auth user; created automatically on sign-up)
-- -----------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  full_name text check (char_length(full_name) <= 200),
  avatar_url text check (char_length(avatar_url) <= 2048),
  locale public.app_locale not null default 'en',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on column public.profiles.email is 'Mirror of auth.users.email, maintained by trigger. Read-only for clients.';

create trigger set_updated_at before update on public.profiles
  for each row execute function private.set_updated_at();

-- -----------------------------------------------------------------------------
-- Platform administrators (the product owner's accounts)
-- Managed with SQL / service role only. See docs/operations.md.
-- -----------------------------------------------------------------------------

create table public.platform_admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

-- Platform admins have access to every school, so the second factor is not
-- optional: the session must be at Authenticator Assurance Level 2 (MFA).
create function private.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(auth.jwt() ->> 'aal', 'aal1') = 'aal2'
    and exists (
      select 1 from public.platform_admins pa
      where pa.user_id = (select auth.uid())
    );
$$;

-- True when the user is a platform admin, regardless of MFA status. Used only to
-- tell the web app that it must ask for MFA; never to grant data access.
create function public.is_platform_admin_account()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.platform_admins pa
    where pa.user_id = (select auth.uid())
  );
$$;
