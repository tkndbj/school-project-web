begin;
select plan(10);
select tests.create_fixture();

select tests.authenticate_as(tests.id('staff_a'));
select throws_ok($$select * from public.school_member_accounts(tests.id('school_a'))$$,
  '42501', 'school_not_accessible', 'staff cannot inspect administrator account status');
select tests.authenticate_as(tests.id('admin_a'));
select is((select count(*)::int from public.school_member_accounts(tests.id('school_a'))), 2,
  'school admin can inspect their school accounts');
select throws_ok($$select * from public.school_member_accounts(tests.id('school_b'))$$,
  '42501', 'school_not_accessible', 'school admin cannot inspect another school accounts');
select tests.clear_authentication();

select throws_ok($$delete from auth.users where id = tests.id('admin_a')$$,
  'SC011', 'school_requires_an_admin', 'privileged account deletion cannot orphan a school');
select throws_ok($$delete from auth.users where id = tests.id('platform')$$,
  '42501', 'platform_admin_cannot_self_delete', 'platform admins cannot self-delete');

insert into public.student_notes (school_id, student_id, body, visible_to_guardians, created_at)
select tests.id('school_a'), tests.id('student_a1'), 'Same timestamp ' || n, true, '2030-01-01T00:00:00Z'
from generate_series(1, 25) n;

select tests.authenticate_as(tests.id('parent1'));
select is((select count(*)::int from public.guardian_student_notes_page(tests.id('student_a1'))), 20,
  'first note page is bounded');
select is((
  select count(*)::int from public.guardian_student_notes_page(
    tests.id('student_a1'), '2030-01-01T00:00:00Z',
    (select note_id from public.guardian_student_notes_page(tests.id('student_a1')) offset 19 limit 1)
  ) where created_at = '2030-01-01T00:00:00Z'
), 5, 'second page retains every note sharing the cursor timestamp');
select throws_ok($$select * from public.guardian_student_notes_page(tests.id('student_a1'), now())$$,
  'SC020', 'invalid_note_cursor', 'incomplete note cursors are rejected');
select throws_ok($$select * from public.guardian_student_notes_page(tests.id('student_a2'))$$,
  '42501', 'student_not_accessible', 'composite cursor API preserves guardian isolation');
select tests.authenticate_as(tests.id('outsider'));
select throws_ok($$select * from public.school_member_accounts(tests.id('school_a'))$$,
  '42501', 'school_not_accessible', 'outsiders cannot inspect school accounts');
select * from finish();
rollback;
