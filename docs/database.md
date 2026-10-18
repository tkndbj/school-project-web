# Database & API contract

The Supabase Postgres database is the single source of truth for both the web
app (this repo) and the Flutter app (`school-project`). All business rules that
protect data — tenant isolation, roles, what parents may see — are enforced
**in the database**, so every client gets them for free and a client bug can
never leak another school's data.

Migrations: `supabase/migrations` · Tests: `supabase/tests/database` (pgTAP).

## Roles

| Who                            | How identified                                         | Access                                                        |
| ------------------------------ | ------------------------------------------------------ | ------------------------------------------------------------- |
| Platform admin (product owner) | row in `platform_admins` **and** an MFA (AAL2) session | everything, web only                                          |
| School admin                   | `school_members.role = 'admin'`                        | full CRUD on their school, settings, staff, custom fields     |
| School staff                   | `school_members.role = 'staff'`                        | full CRUD on their school's data, no settings/staff           |
| Guardian (parent)              | `guardians.user_id = auth.uid()`                       | **read-only through `guardian_*` functions**; no table access |

A suspended school (`schools.status = 'suspended'`) is invisible to its staff and parents.

After sign-in, call `my_account_context()` to route the user:

```jsonc
{
  "user_id": "uuid",
  "is_platform_admin": false,           // MFA still required before data access
  "memberships": [{ "school_id", "school_name", "slug", "role", "logo_path",
                    "primary_color", "default_locale", "timezone", "enabled_modules": [] }],
  "children_count": 2
}
```

## Tables (staff API, RLS-protected)

`schools`, `school_members`, `profiles`, `students`, `teachers`, `guardians`,
`student_guardians`, `custom_field_definitions`, `academic_terms`, `courses`,
`course_teachers`, `enrollments`, `assessments`, `grades`, `attendance_records`,
`student_notes`, `events`, `guardian_invites` (no code hash), `audit_log` (read-only),
`push_tokens` (own rows).

Rules worth knowing:

- Every school-owned row has `school_id`; it is immutable, and composite foreign
  keys guarantee children reference parents of the same school.
- Almost every attribute is optional. A person record needs one identifying value
  (name or number; for guardians also email/phone).
- `students.notes` is staff-only. `student_notes.visible_to_guardians`,
  `events.visible_to_guardians` and `assessments.published_at` control what parents see.
- `attendance_records`: `course_id = null` means daily attendance; one record per
  (student, date, course, period).
- `custom_fields` (jsonb) on students/teachers/guardians/courses is validated against
  `custom_field_definitions` for the school. Unknown keys and wrong types are rejected;
  `null` deletes a value. Deleting a definition removes its values everywhere.
- `guardians.user_id/link_method/linked_at` are managed by the system. Staff can only
  unlink (set all three to null).

## Functions (RPC)

| Function                                                                           | Caller                                 | Purpose                                                                                         |
| ---------------------------------------------------------------------------------- | -------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `my_account_context()`                                                             | any signed-in user                     | routing info (see above)                                                                        |
| `is_platform_admin_account()`                                                      | any                                    | true if the account is a platform admin (MFA not checked)                                       |
| `link_my_guardian_records()`                                                       | any                                    | re-run email linking after sign-in; returns count                                               |
| `redeem_guardian_invite(p_code)`                                                   | parent                                 | returns `{status: linked \| invalid \| already_linked \| rate_limited, school_id, school_name}` |
| `create_guardian_invite(p_guardian_id, p_valid_days = 14)`                         | staff                                  | returns `{invite_id, code, expires_at}`; the code is shown once                                 |
| `guardian_children()`                                                              | parent                                 | the user's children with school branding and enabled modules                                    |
| `guardian_student_profile(p_student_id)`                                           | parent / staff preview                 | profile + guardian-visible custom fields                                                        |
| `guardian_student_courses(p_student_id)`                                           | parent                                 | enrolled courses with teachers (name, title, email, subject, photo)                             |
| `guardian_student_grades(p_student_id, p_term_id?)`                                | parent                                 | published grades only                                                                           |
| `guardian_student_attendance(p_student_id, p_from, p_to)`                          | parent                                 | max 366 days                                                                                    |
| `guardian_student_attendance_summary(p_student_id, p_from, p_to)`                  | parent                                 | counts per status                                                                               |
| `guardian_student_notes(p_student_id, p_before?, p_limit = 20)`                    | parent                                 | guardian-visible notes, keyset paginated                                                        |
| `guardian_student_notes_page(p_student_id, p_before?, p_before_id?, p_limit = 20)` | parent                                 | composite timestamp/id cursor; updated clients use this to retain notes with equal timestamps   |
| `guardian_student_events(p_student_id, p_from, p_to)`                              | parent                                 | school-wide + enrolled-course events, max 400 days                                              |
| `school_dashboard_stats(p_school_id)`                                              | staff                                  | counts + today's attendance                                                                     |
| `import_students(p_school_id, p_rows)` / `import_teachers(...)`                    | staff                                  | ≤ 1000 rows per call, upsert by number, per-row errors                                          |
| `save_grades(p_assessment_id, p_entries)`                                          | staff                                  | gradebook save in one transaction; empty entry deletes the grade                                |
| `save_attendance(p_school_id, p_date, p_entries, p_course_id?, p_period?)`         | staff                                  | attendance register save; entry without status deletes the record                               |
| `platform_school_overview()`                                                       | platform admin (MFA)                   | per-school counts                                                                               |
| `register_push_token(p_token, p_platform, p_locale?)`                              | any                                    | FCM device token registration                                                                   |
| `school_student_groups(p_school_id)`                                               | staff                                  | database aggregate for grade/section filters                                                    |
| `enroll_student_group(p_course_id, p_grade_level, p_section?)`                     | staff                                  | atomic, idempotent class enrolment                                                              |
| `school_member_accounts(p_school_id)`                                              | school admin / platform admin with MFA | bounded account metadata without per-member Auth API calls                                      |
| `admin_find_user_by_email(p_email)`                                                | service role only                      | web server: find an account when inviting staff                                                 |

Guardian functions return nothing for modules the school has disabled.

## Storage

Bucket `school-media` (private, ≤ 5 MB, JPEG/PNG/WebP). Paths:

```
{school_id}/students/{student_id}/{file}
{school_id}/teachers/{teacher_id}/{file}
{school_id}/branding/{file}
```

Staff write student/teacher media; only admins write branding. Parents can read
their children's photos, their children's teachers' photos and their school's
branding. Always use signed URLs.

## Error codes

Errors raised by the database use these SQLSTATEs. The `message` is a stable,
machine-readable key; clients translate it.

| SQLSTATE          | Meaning                                     | Example messages                                                                                                                                                               |
| ----------------- | ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `42501`           | not allowed                                 | `student_not_accessible`, `school_not_accessible`, `guardian_link_is_managed`, `only_platform_admin_can_change_slug_or_status`, `platform_admin_required`, `not_authenticated` |
| `SC001`           | invalid custom field (`detail` = field key) | `custom_field_unknown`, `custom_field_invalid_option`, `custom_field_expected_number`, ...                                                                                     |
| `SC010`           | invalid school setting                      | `invalid_timezone`                                                                                                                                                             |
| `SC011`           | membership rule                             | `school_requires_an_admin`                                                                                                                                                     |
| `SC020`           | invalid argument                            | `invalid_date_range`, `invalid_invite_validity`                                                                                                                                |
| `SC030`           | import format                               | `import_unknown_column` (`detail` = column), `import_batch_too_large`, ...                                                                                                     |
| `23505`           | unique violation                            | duplicate student/staff number, duplicate guardian email                                                                                                                       |
| `23514` / `23502` | check / not-null violation                  | e.g. `students_identifiable`                                                                                                                                                   |

## HTTP endpoints (web app)

Operations that need the Supabase secret key are served by the Next.js app:

| Method & path         | Auth                                   | Purpose                                                                                                                                                  |
| --------------------- | -------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DELETE /api/account` | `Authorization: Bearer <access token>` | Permanently deletes the caller's account (required by app stores). Platform admins and the last admin of a school are refused with `409`. Returns `204`. |

## Changing the schema

1. `supabase migration new <name>` and write SQL (never edit applied migrations).
2. New tables: enable RLS, add policies, `grant` explicitly to `authenticated`/`service_role`.
3. New functions: `set search_path = ''`, then end the migration with
   `revoke execute on all functions in schema public, private from public, anon;`
   and grant what is needed to `authenticated`.
4. Add pgTAP tests, run `npm run db:test`, regenerate types with `npm run db:types`.
