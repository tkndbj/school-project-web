-- Structural security invariants. These guard against future migrations
-- accidentally exposing data.
begin;
select plan(8);

select is(
  (select array_agg(c.relname order by c.relname)
   from pg_class c join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and c.relkind in ('r', 'p') and not c.relrowsecurity),
  null,
  'every table in public has row level security enabled'
);

select is(
  (select array_agg(distinct table_name::text order by table_name::text)
   from information_schema.role_table_grants
   where table_schema = 'public' and grantee = 'anon'),
  null,
  'anon has no privileges on any public table'
);

select is(
  (select array_agg(distinct p.proname::text order by p.proname::text)
   from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public'
     and has_function_privilege('anon', p.oid, 'execute')),
  null,
  'anon cannot execute any public function'
);

select is(
  (select array_agg(n.nspname || '.' || p.proname order by 1)
   from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname in ('public', 'private')
     and p.prosecdef
     and not exists (
       select 1 from unnest(coalesce(p.proconfig, '{}')) cfg where cfg like 'search_path=%'
     )),
  null,
  'every SECURITY DEFINER function pins its search_path'
);

select ok(
  not has_schema_privilege('anon', 'private', 'usage'),
  'anon cannot use the private schema'
);

select is(
  (select array_agg(c.relname::text order by c.relname)
   from pg_class c join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and c.relkind in ('r', 'p')
     and not exists (select 1 from pg_policy pol where pol.polrelid = c.oid)
     and c.relname not in ('guardian_invite_attempts')),
  null,
  'every public table (except internal ones) has at least one policy'
);

select ok(
  not has_column_privilege('authenticated', 'public.guardian_invites', 'code_hash', 'select'),
  'invite code hashes are not readable by API users'
);

select ok(
  not has_function_privilege('authenticated', 'public.admin_find_user_by_email(text)', 'execute'),
  'user lookup by email is reserved for the server (service role)');

select * from finish();
rollback;
