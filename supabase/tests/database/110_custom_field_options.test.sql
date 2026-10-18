begin;
select plan(2);
select tests.create_fixture();
select tests.authenticate_as(tests.id('admin_a'));
insert into public.custom_field_definitions(school_id, entity, key, label, field_type, options)
values (tests.id('school_a'), 'student', 'demo_choice', 'Choice', 'select', array['A', 'B']);
select throws_ok($$update public.custom_field_definitions set options = array['A'] where school_id = tests.id('school_a') and key = 'demo_choice'$$,
  'SC001', 'custom_field_options_cannot_be_removed', 'choice removal cannot invalidate existing record contracts');
select lives_ok($$update public.custom_field_definitions set options = array['A', 'B', 'C'] where school_id = tests.id('school_a') and key = 'demo_choice'$$,
  'new choices can be added');
select * from finish();
rollback;
