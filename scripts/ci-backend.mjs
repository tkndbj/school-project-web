import fs from "node:fs";
process.loadEnvFile(".env.ci");
const api = process.env.API_URL;
if (!api || !["127.0.0.1", "localhost"].includes(new URL(api).hostname))
  throw Error("CI must use the isolated local backend");
const key = process.env.PUBLISHABLE_KEY ?? process.env.ANON_KEY;
const secret = process.env.SECRET_KEY ?? process.env.SERVICE_ROLE_KEY;
if (!key || !secret)
  throw Error("Local Supabase status did not return the API keys");
console.log(`::add-mask::${secret}`);
fs.writeFileSync(
  ".env.local",
  [
    "APP_ENV=test",
    "ALLOW_TEST_FIXTURES=true",
    `NEXT_PUBLIC_SUPABASE_URL=${api}`,
    `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=${key}`,
    `SUPABASE_SECRET_KEY=${secret}`,
    "NEXT_PUBLIC_SITE_URL=http://localhost:3000",
    "NEXT_PUBLIC_GOOGLE_AUTH_ENABLED=false",
    "",
  ].join("\n"),
  { mode: 0o600 },
);
