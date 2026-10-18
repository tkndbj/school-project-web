import fs from "node:fs";
import path from "node:path";
import { randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

if (fs.existsSync(".env.local")) process.loadEnvFile(".env.local");
const argument = process.argv.find((value) => value.startsWith("--emails="));
const emails = [
  ...new Set(
    (argument?.slice(9) ?? process.env.PLATFORM_ADMIN_EMAILS ?? "")
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  ),
];
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secret = process.env.SUPABASE_SECRET_KEY;
const file = path.resolve(".production-admin-credentials.json");
const checked = (result) => {
  if (result.error) throw Error(result.error.code ?? "backend_request_failed");
  return result.data;
};

async function main() {
  if (
    !emails.length ||
    emails.some(
      (email) =>
        !z.email().safeParse(email).success || email.endsWith(".example"),
    )
  )
    throw Error("Supply the real owner's emails with --emails=email1,email2");
  if (
    !url?.startsWith("https://") ||
    !secret ||
    /placeholder|xxxx/.test(secret)
  )
    throw Error("Hosted server configuration is required");
  const credentials = fs.existsSync(file)
    ? JSON.parse(fs.readFileSync(file, "utf8"))
    : { project: url, accounts: {} };
  if (credentials.project !== url) throw Error("credentials_project_mismatch");
  const db = createClient(url, secret, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const ids = [];
  for (const email of emails) {
    const found = checked(
      await db.rpc("admin_find_user_by_email", { p_email: email }),
    )[0];
    if (found && !found.email_confirmed)
      throw Error(
        "Existing owner account must verify its email before an administrator grant",
      );
    if (found) ids.push(found.user_id);
  }
  const existing = checked(await db.from("platform_admins").select("user_id"));
  if (existing.some((admin) => !ids.includes(admin.user_id)))
    throw Error(
      "Unexpected platform administrator exists; review before making changes",
    );
  for (const email of emails) {
    let account = checked(
      await db.rpc("admin_find_user_by_email", { p_email: email }),
    )[0];
    if (!account) {
      const password = randomBytes(32).toString("base64url") + "aA1!";
      const created = checked(
        await db.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: { full_name: "Platform administrator" },
        }),
      );
      account = { user_id: created.user.id };
      credentials.accounts[email] = { email, password };
      fs.writeFileSync(file, JSON.stringify(credentials, null, 2) + "\n", {
        mode: 0o600,
      });
    }
    checked(
      await db.from("platform_admins").upsert({ user_id: account.user_id }),
    );
  }
  console.log(
    `Configured ${emails.length} owner administrator accounts. Database MFA enforcement remains mandatory.`,
  );
  if (Object.keys(credentials.accounts).length)
    console.log(
      `Initial credentials are stored only in ${file}. Rotate them on first login; never commit this file.`,
    );
}
main().catch((error) => {
  console.error(`Administrator provisioning stopped: ${error.message}`);
  process.exitCode = 1;
});
