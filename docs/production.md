# Production operations

The applications share one Supabase Postgres schema. Tenant isolation, guardian
relationships, publication visibility, composite school foreign keys and audit
history are enforced in Postgres, including when a client calls the API directly.
See [database.md](database.md) for the API contract.

## Deployments

Use separate Supabase projects and web deployments for development, staging and
production. Never use real student data in demonstration accounts. Deploy the web
app on a platform supporting Next.js 16 server actions, route handlers and Proxy;
it requires a running Node.js server and cannot use a static export. Use Node 24,
`npm ci`, `npm run build`, then `npm start`. Supply the three public environment
variables at build time and the server secret only to the server runtime.

Both repositories include CI. Keep passing lint, types, unit/widget tests,
database tests and browser smoke tests as merge gates. The browser smoke suite
covers signed-out behaviour; a staging run with seeded accounts must also cover
authenticated school/parent workflows before a release.
Run `npm run test:backend` and, with the staging website running,
`npm run test:authenticated` against the marked demo fixture. The browser check
temporarily changes and restores a demo grade; it never targets real school rows.

Apply forward migrations with the Supabase CLI after reviewing `supabase db push
--dry-run`. Never edit or reapply a migration already recorded on a deployed
project. Deploy the database before clients which use newly introduced functions.
The legacy notes function remains available; updated clients use the composite
cursor function to avoid skipping notes with identical timestamps.

For multiple self-hosted web instances, provide the same
`NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` to each build, keep the instances on the same
release, and use your host's support for deployment skew protection. Configure
reverse-proxy request limits and timeouts rather than accepting unlimited import
uploads. This app deliberately avoids shared caching for student data and returns
private/no-store responses; never put an authenticated response in a shared CDN
cache. Every mutation must continue to authorise the caller and run under their
RLS session. Reserve the service key for account administration.

## Initial administrator and authentication

Provision the real owner accounts with `npm run bootstrap:admins -- --emails=...`
as a trusted operator. Initial passwords are stored in the ignored local owner
credentials file and must be changed on first login. See [vercel.md](vercel.md).
Platform users must enroll and verify TOTP MFA in the web UI before accessing
school data. Create real school administrators through the platform invitation
flow. Configure custom SMTP, the supplied invite/recovery templates, exact
production redirect URLs, rate limits and Google OAuth clients before launch.
Disable public email signup; Google signup may remain enabled for new parents.
Never expose the secret key or database URL in a `NEXT_PUBLIC_` variable or mobile
`dart-define` file. Rotate credentials if they have been exposed.

School administrators can manage their own school settings and staff. Removing
or demoting administrators is serialised per school. Account deletion checks
also run inside the deleting database transaction, so concurrent requests cannot
orphan a school. Platform accounts must be deliberately removed from
`platform_admins` by an operator before their Auth accounts can be deleted.

## Monitoring and recovery

`GET /api/health` is a liveness endpoint; `/api/ready` checks Auth and Data API availability with a five-second timeout. Separately monitor Supabase Auth, API
availability and database connections; a healthy Node process does not prove a
healthy database. Configure external uptime checks and alerts for error rate,
latency, database CPU/connections/disk and storage usage. Server errors emit a
structured digest and route name through `src/instrumentation.ts` without logging
student records or request bodies. Retain logs in your hosting provider and test
alert delivery. Choose a crash reporting service for Flutter before distributing
to real families; it is not configured in this checkout.

Enable Supabase backups/PITR appropriate to your recovery objectives. Database
backups do not restore deleted storage objects: back up the private media bucket
separately and perform a restore drill in staging. Set retention and access rules
for audit logs, backups and application logs. Document who can restore data and
how to revoke access during an incident. Account deletion removes login access;
school-owned student records and audit history follow the school's retention
policy.

## Capacity

Lists use indexed tenant filters and page ranges. Larger registers and
enrolments page through the Data API rather than assuming its 1,000-row response
is complete. Client dropdown/whole-register reads fail explicitly at 10,000 rows;
narrow the class/course selection instead of returning incomplete results.
Attendance accepts 5,000 changed entries and grades accept 2,000 in a single
transaction. Split the operational class/course workload before these limits;
do not increase every limit as a substitute for measuring query plans and UI
performance. Staff data saves send changed rows to avoid overwriting unrelated
students. Two staff members editing the same record use last-write-wins semantics
and the audit history records those writes.

Load-test representative school sizes and concurrency in staging. Inspect slow
queries with EXPLAIN and Supabase's database monitoring. Increase database
capacity, connection pooling or partitioning based on measured demand. This
checkout has not established a production traffic capacity or availability SLA.

## Mobile releases and remaining integrations

Android release builds require `android/key.properties` and a private upload
keystore; they no longer silently use a debug signing key. Configure iOS signing
on macOS and test on real Android/iOS devices. Keep production endpoints on
HTTPS. Google sign-in is optional for password-only testing; native Google
sign-in requires the client IDs and signing fingerprints described in the mobile
README. Review current App Store sign-in requirements before submitting a Google
sign-in release. Supply final icons, store metadata and privacy/retention policies
for the school-owned student data before public distribution.

Push notifications remain disabled until Firebase/APNs and a backend delivery
worker are configured. A stored push token alone does not deliver notifications.
The current app fetches records when screens load or refresh; it does not promise
live background updates or offline editing. No remote deployment, production
secrets, monitoring subscription or store publication is implicit in a passing
local build.
