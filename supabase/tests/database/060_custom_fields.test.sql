-- Per-school custom fields: validation, configuration rights and clean-up.
begin;
select plan(13);
select tests.create_fixture();

select tests.authenticate_as(tests.id('staff_a'));
select throws_ok(
  $$ insert into public.custom_field_definitions (school_id, entity, key, label, field_type)
     values (tests.id('school_a'), 'student', 'bus_route', 'Bus route', 'text') $$,
  '42501', null, 'staff (non-admin) cannot define custom fields');
select tests.clear_authentication();

select tests.authenticate_as(tests.id('admin_a'));
select lives_ok(
  $$ insert into public.custom_field_definitions (school_id, entity, key, label, field_type, options) values
     (tests.id('school_a'), 'student', 'bus_route', 'Bus route', 'select', array['North', 'South']),
     (tests.id('school_a'), 'student', 'clubs', 'Clubs', 'multi_select', array['Chess', 'Robotics', 'Drama']),
     (tests.id('school_a'), 'student', 'height_cm', 'Height (cm)', 'number', '{}'),
     (tests.id('school_a'), 'student', 'medical_check', 'Medical check', 'date', '{}') $$,
  'school admin can define custom fields');
select tests.clear_authentication();

select tests.authenticate_as(tests.id('staff_a'));
select lives_ok(
  $$ update public.students set custom_fields =
       '{"bus_route": "North", "clubs": ["Chess", "Drama"], "height_cm": 151.5, "medical_check": "2026-09-01"}'
     where id = tests.id('student_a1') $$,
  'valid custom values are accepted');
select throws_ok(
  $$ update public.students set custom_fields = '{"unknown": 1}' where id = tests.id('student_a1') $$,
  'SC001', 'custom_field_unknown', 'unknown keys are rejected');
select throws_ok(
  $$ update public.students set custom_fields = '{"bus_route": "East"}' where id = tests.id('student_a1') $$,
  'SC001', 'custom_field_invalid_option', 'select values must be one of the options');
select throws_ok(
  $$ update public.students set custom_fields = '{"clubs": ["Chess", "Football"]}' where id = tests.id('student_a1') $$,
  'SC001', 'custom_field_invalid_option', 'multi-select values must be options');
select throws_ok(
  $$ update public.students set custom_fields = '{"height_cm": "tall"}' where id = tests.id('student_a1') $$,
  'SC001', 'custom_field_expected_number', 'numbers are type checked');
select throws_ok(
  $$ update public.students set custom_fields = '{"medical_check": "2026-02-30"}' where id = tests.id('student_a1') $$,
  'SC001', 'custom_field_expected_date', 'dates are validated');
select lives_ok(
  $$ update public.students set custom_fields = custom_fields || '{"height_cm": null}' where id = tests.id('student_a1') $$,
  'null clears a value');
select ok(
  not ((select custom_fields from public.students where id = tests.id('student_a1')) ? 'height_cm'),
  'null values are not stored');
select tests.clear_authentication();
select throws_ok(
  $$ update public.students set custom_fields = '{"bus_route": "North"}' where id = tests.id('student_b1') $$,
  'SC001', 'custom_field_unknown', 'definitions are per school: school B does not have school A fields');

select tests.authenticate_as(tests.id('admin_a'));
select throws_ok(
  $$ update public.custom_field_definitions set field_type = 'text' where key = 'bus_route' $$,
  'SC001', 'custom_field_contract_is_immutable', 'field type cannot be changed after creation');
delete from public.custom_field_definitions where key = 'clubs';
select tests.clear_authentication();

select ok(
  not ((select custom_fields from public.students where id = tests.id('student_a1')) ? 'clubs'),
  'deleting a definition removes its values');

select * from finish();
rollback;
