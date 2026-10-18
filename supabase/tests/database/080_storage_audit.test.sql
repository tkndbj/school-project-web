-- Media access rules, audit trail and push token ownership.
begin;
select plan(13);
select tests.create_fixture();

insert into storage.objects (bucket_id, name) values
  ('school-media', tests.id('school_a') || '/students/' || tests.id('student_a1') || '/photo.jpg'),
  ('school-media', tests.id('school_a') || '/students/' || tests.id('student_a2') || '/photo.jpg'),
  ('school-media', tests.id('school_a') || '/teachers/' || tests.id('teacher_a1') || '/photo.jpg'),
  ('school-media', tests.id('school_a') || '/branding/logo.png'),
  ('school-media', tests.id('school_b') || '/students/' || tests.id('student_b1') || '/photo.jpg');

-- Guardian
select tests.authenticate_as(tests.id('parent1'));
select is(
  (select array_agg(split_part(name, '/', 2) order by name) from storage.objects),
  (select array_agg(k order by k) from unnest(array['branding', 'students', 'teachers']) k),
  'a parent sees their child''s photo, the child''s teacher and the school logo, nothing else');
select is(
  (select count(*)::int from storage.objects where name like '%' || tests.id('student_a2') || '%'), 0,
  'a parent cannot see another child''s photo');
select throws_ok(
  $$ insert into storage.objects (bucket_id, name)
     values ('school-media', tests.id('school_a') || '/students/' || tests.id('student_a1') || '/x.jpg') $$,
  '42501', null, 'parents cannot upload');
select tests.clear_authentication();

-- Staff
select tests.authenticate_as(tests.id('staff_a'));
select is((select count(*)::int from storage.objects), 4, 'staff see all media of their school only');
select lives_ok(
  $$ insert into storage.objects (bucket_id, name)
     values ('school-media', tests.id('school_a') || '/students/' || tests.id('student_a1') || '/new.jpg') $$,
  'staff can upload student photos');
select throws_ok(
  $$ insert into storage.objects (bucket_id, name) values ('school-media', tests.id('school_a') || '/branding/logo2.png') $$,
  '42501', null, 'non-admin staff cannot change branding');
select throws_ok(
  $$ insert into storage.objects (bucket_id, name) values ('school-media', tests.id('school_a') || '/random/file.png') $$,
  '42501', null, 'unknown path layouts are rejected');
select throws_ok(
  $$ insert into storage.objects (bucket_id, name)
     values ('school-media', tests.id('school_b') || '/students/' || tests.id('student_b1') || '/x.jpg') $$,
  '42501', null, 'staff cannot upload into another school');
select tests.clear_authentication();

-- Audit trail
select tests.authenticate_as(tests.id('staff_a'));
update public.students set first_name = 'Augusta' where id = tests.id('student_a1');
select tests.clear_authentication();
select is(
  (select jsonb_build_object('actor', actor_id, 'old', old_data, 'new', new_data)
   from public.audit_log where record_id = tests.id('student_a1') and action = 'UPDATE'
   order by id desc limit 1),
  jsonb_build_object('actor', tests.id('staff_a'), 'old', '{"first_name": "Ada"}'::jsonb, 'new', '{"first_name": "Augusta"}'::jsonb),
  'updates are audited with the actor and only the changed columns');

select tests.authenticate_as(tests.id('admin_a'));
select ok((select count(*) from public.audit_log) > 0, 'school admins can read their audit log');
select is((select count(*)::int from public.audit_log where school_id <> tests.id('school_a')), 0,
  'and only their own school''s entries');
select tests.clear_authentication();

-- Push tokens move with the signed-in user
select tests.authenticate_as(tests.id('parent1'));
select public.register_push_token('device-token-1', 'android');
select tests.clear_authentication();
select tests.authenticate_as(tests.id('parent2'));
select public.register_push_token('device-token-1', 'android', 'tr');
select is((select count(*)::int from public.push_tokens), 1, 'the device token now belongs to the latest user');
select tests.clear_authentication();
select tests.authenticate_as(tests.id('parent1'));
select is((select count(*)::int from public.push_tokens), 0, 'and is no longer visible to the previous user');
select tests.clear_authentication();

select * from finish();
rollback;
