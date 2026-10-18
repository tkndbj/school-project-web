# Vercel production deployment

Import `tkndbj/school-project-web` into Vercel, select the Next.js preset and
Node.js 24. The repository supplies `vercel.json`; the build is `npm run build`
with a locked `npm ci` installation. Deploy the `main` branch.

Set these variables for the **Production** environment before building:

| Variable                               | Value                                                                      |
| -------------------------------------- | -------------------------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`             | Your hosted project origin, without `/rest/v1/`                            |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Its publishable key                                                        |
| `SUPABASE_SECRET_KEY`                  | Its server secret; mark sensitive and keep server-only                     |
| `NEXT_PUBLIC_GOOGLE_AUTH_ENABLED`      | `false`, until Google is configured                                        |
| `NEXT_PUBLIC_SITE_URL`                 | Your HTTPS domain, or omit to use Vercel's production domain automatically |

Vercel's environment determines production/staging validation. Keep system
environment variables enabled. Local HTTP and placeholder keys are rejected in
deployments. Do not copy `APP_ENV=development` from local tooling to a production
host. Do not add database passwords, signing keys or administrator passwords to
public variables. Database credentials are operator-only and are not needed by
the deployed website.

Use a separate Supabase staging project for Preview deployments. Restrict access
to previews with Vercel Deployment Protection. Never enable test fixtures on the
production project. Database migrations are applied deliberately before client
deployment, rather than from every Vercel preview build.

## Authentication

After Vercel assigns the real HTTPS domain:

1. Set Supabase Auth's Site URL to that domain. Add its `/auth/confirm`,
   `/auth/callback` and `/auth/set-password` paths to the redirect allow-list.
2. Configure your SMTP sender and copy the invitation/recovery templates from
   `supabase/templates`. Supabase's default mail service is not a production SMTP
   service. Verify invitation and recovery delivery using your own account.
3. Disable public email signups. Staff and parents receive school invitations;
   parents can sign in with email/password. If enabling Google for parents,
   configure the Google provider and OAuth redirect URL first, then enable the
   web flag and supply the mobile OAuth client IDs.
4. The owner accounts are provisioned through `npm run bootstrap:admins --
--emails=owner1@your-domain,owner2@your-domain`. Only trusted operators with the
   server secret may run this command. New account credentials are written to
   ignored `.production-admin-credentials.json`. Change the initial password at
   `/auth/set-password`, then enroll TOTP MFA. SQL policies require MFA for every
   platform data operation; a browser redirect alone does not grant access.
5. Create real schools from `/admin`, invite their administrators, and let the
   schools enter their students and guardian contacts. Production starts empty;
   no school or student records are automatically seeded.

## Monitoring and releases

Monitor `/api/health` for process liveness and `/api/ready` for a bounded Auth/API
readiness check. Readiness returns only a status and never backend details.
Configure Vercel error/latency alerts and Supabase CPU, storage, connection and
backup alerts. Enable backups/PITR to match recovery requirements and test a
restore in a separate project. Private Storage objects require separate backup.

Keep GitHub checks as required branch protection checks. Merge only after mobile,
web, database and real Auth/API integration tests pass. The integration job creates
its fixture inside an isolated local Supabase stack, never in production.

Rollback a web deployment through Vercel. Keep database changes forward-compatible
with the previous mobile release; do not automatically roll back or reset a live
database. See [production.md](production.md) for measured limits and recovery.

## Mobile connection

Copy the final HTTPS web domain to `WEB_BASE_URL` in the mobile project's ignored
`env/prod.json`, along with the real public Supabase values. Run its production
configuration validator before creating signed builds. The debug phone build
used a local Wi-Fi address and must be replaced for public distribution.
