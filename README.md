# School Platform — web and shared backend

School administrators and staff manage student records, guardians, teachers,
courses, assessments, grades, attendance, notes and events. Parents see their
linked children, published grades, attendance, shared notes, courses and events.
School administrators also manage branding, modules, custom fields, academic
terms, staff accounts and audit history. Platform administration requires MFA.

The Flutter companion is `../school-project`; both clients use the same Supabase
schema and permission rules. English and Turkish are supported.

## Production setup

Deploy this repository on Vercel with Node.js 24. Follow
[the Vercel deployment guide](docs/vercel.md) for environment variables, Auth,
SMTP, owner accounts, monitoring and the mobile HTTPS endpoint.

Apply the versioned Supabase migrations once, after reviewing the CLI dry run.
Then provision the real product-owner accounts with:

```text
npm ci
npm run bootstrap:admins -- --emails=owner1@your-domain,owner2@your-domain
```

The operator command requires the real hosted URL and server secret in ignored
`.env.local`. Initial passwords are saved only in ignored
`.production-admin-credentials.json`. Owners must change them and enroll MFA.
Create schools from the platform administration panel; there is no automatic
sample school or student data. School administrators invite staff and parents.

Google sign-in is optional and hidden until explicitly enabled. Email/password
accounts work for both staff and parents; invitation/recovery delivery requires
production SMTP. Read [production operations](docs/production.md) before launch.

## Local development and isolated integration tests

Copy `.env.example` to ignored `.env.local` and configure a development
Supabase project. Run `npm run dev`. For a local backend, install Docker and
run `npx supabase start` first.

Automated integration fixtures require `ALLOW_TEST_FIXTURES=true` and are
refused in production. On an isolated local backend use `npm run test:seed`,
`npm run test:backend`, and, with the website running,
`npm run test:authenticated`. Hosted test seeding additionally requires
`npm run test:seed -- --allow-hosted`. Never enable this on the live project.

## Verify the shared flow in an isolated test project

1. Admin: open `/school/demo-for-testing/students`, create/edit a student and link
   a guardian email or generate an invite code in the Guardians tab.
2. Courses: enrol the student, assign a teacher, create an assessment and save a
   score. Keep it in draft initially.
3. Parent: sign in with the linked account or redeem the code at `/parent`.
   Confirm that draft grades and staff-only notes are absent.
4. Admin: publish the assessment, save daily attendance, share a note and create
   a parent-visible event. Refresh the parent's corresponding screens and verify
   that the new records appear.
5. Sign in as the other demo parent and confirm that the first child is absent.
6. Admin: test school settings, staff invitations, academic terms, custom fields,
   CSV/XLSX imports and the audit page. Staff accounts cannot open settings/audit.

## Validation and production builds

```text
npm run lint
npm run typecheck
npm test
npm run build
npm run start
npm run test:e2e
```

Browser tests use the production server and desktop/phone viewports. Install its
browser once with `npx playwright install chromium`. Authenticated testing needs
the configured backend and demo accounts; signed-out browser smoke tests
run without production credentials.

With a local Supabase stack running:

```text
npm run db:test
npm run db:lint
npm run db:types
```

Keep `package-lock.json` committed and use `npm ci` for repeatable installations.
See [the database contract](docs/database.md) and
[production operations and release requirements](docs/production.md).
