import assert from "node:assert/strict";
import fs from "node:fs";
import { createHmac, randomBytes, randomUUID } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";
import { chromium, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

if (fs.existsSync(".env.local")) process.loadEnvFile(".env.local");
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const base = process.env.WEB_TEST_BASE_URL || process.env.NEXT_PUBLIC_SITE_URL;
if (
  process.env.APP_ENV !== "test" ||
  process.env.ALLOW_TEST_FIXTURES !== "true" ||
  process.env.VERCEL_ENV === "production" ||
  ![url, base].every(
    (value) =>
      value && ["localhost", "127.0.0.1"].includes(new URL(value).hostname),
  )
)
  throw Error(
    "Password recovery integration is restricted to isolated local test services.",
  );

const options = {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
};
const admin = createClient(url, process.env.SUPABASE_SECRET_KEY, options);
const client = () =>
  createClient(url, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, options);
const messages = JSON.parse(fs.readFileSync("messages/en.json", "utf8"));
const password = () => randomBytes(24).toString("base64url") + "aA1!";
let browser,
  userId,
  phase = "create isolated account";

function checked(result) {
  if (result.error) throw Error("auth_operation_failed");
  return result.data;
}

// RFC 6238, SHA-1 / six digits / 30 seconds. Used only for this test factor.
function totp(secret, counter = Math.floor(Date.now() / 30000)) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const bytes = [];
  let bits = 0,
    value = 0;
  for (const character of secret.toUpperCase().replace(/=+$/, "")) {
    const digit = alphabet.indexOf(character);
    assert.ok(digit >= 0);
    value = (value << 5) | digit;
    bits += 5;
    if (bits >= 8) {
      bits -= 8;
      bytes.push((value >>> bits) & 255);
      value &= (1 << bits) - 1;
    }
  }
  const time = Buffer.alloc(8);
  time.writeBigUInt64BE(BigInt(counter));
  const digest = createHmac("sha1", Buffer.from(bytes)).update(time).digest();
  const offset = digest[digest.length - 1] & 15;
  return String((digest.readUInt32BE(offset) & 0x7fffffff) % 1000000).padStart(
    6,
    "0",
  );
}

async function recoveryHash(email) {
  const link = checked(
    await admin.auth.admin.generateLink({ type: "recovery", email }),
  );
  assert.ok(link.properties.hashed_token);
  return link.properties.hashed_token;
}

async function openRecovery(email) {
  const context = await browser.newContext({ locale: "en-US" });
  const page = await context.newPage();
  const link = new URL("/auth/confirm", base);
  link.searchParams.set("type", "recovery");
  link.searchParams.set("token_hash", await recoveryHash(email));
  await page.goto(link.toString());
  return { context, page };
}

async function savePassword(page, nextPassword) {
  await page.locator("#password").fill(nextPassword);
  await page.locator("#confirm").fill(nextPassword);
  await page
    .getByRole("button", { name: messages.auth.savePassword, exact: true })
    .click();
  await page.waitForURL((target) => !target.pathname.startsWith("/auth/"), {
    timeout: 30000,
  });
  await expect(
    page.getByText(messages.errors.unknown, { exact: true }),
  ).toHaveCount(0);
}

async function main() {
  const email = `password-recovery-${randomUUID()}@test.school.example`;
  const initialPassword = password();
  userId = checked(
    await admin.auth.admin.createUser({
      email,
      password: initialPassword,
      email_confirm: true,
    }),
  ).user.id;
  browser = await chromium.launch({ headless: true });

  phase = "recovery without MFA";
  const first = await openRecovery(email);
  await first.page.waitForURL(
    (target) => target.pathname === "/auth/set-password",
    { timeout: 30000 },
  );
  const firstPassword = password();
  await savePassword(first.page, firstPassword);
  await first.context.close();

  phase = "enroll isolated authenticator";
  const enrolledClient = client();
  checked(
    await enrolledClient.auth.signInWithPassword({
      email,
      password: firstPassword,
    }),
  );
  const factor = checked(
    await enrolledClient.auth.mfa.enroll({
      factorType: "totp",
      friendlyName: "Password recovery integration",
    }),
  );
  const enrollmentCounter = Math.floor(Date.now() / 30000);
  checked(
    await enrolledClient.auth.mfa.challengeAndVerify({
      factorId: factor.id,
      code: totp(factor.totp.secret, enrollmentCounter),
    }),
  );

  phase = "Auth rejects a password update before MFA";
  const recoveredClient = client();
  checked(
    await recoveredClient.auth.verifyOtp({
      type: "recovery",
      token_hash: await recoveryHash(email),
    }),
  );
  const denied = await recoveredClient.auth.updateUser({
    password: password(),
  });
  assert.equal(denied.error?.code, "insufficient_aal");
  checked(await recoveredClient.auth.signOut({ scope: "local" }));

  phase = "browser routes recovery through existing MFA";
  const second = await openRecovery(email);
  await second.page.waitForURL(
    (target) =>
      target.pathname === "/auth/mfa" &&
      target.searchParams.get("next") === "/auth/set-password",
    { timeout: 30000 },
  );
  await expect(second.page.locator("#code")).toBeVisible({ timeout: 15000 });
  await expect(
    second.page.getByAltText(messages.auth.mfaQrAlt, { exact: true }),
  ).toHaveCount(0);

  // A verified TOTP must not be reused from the enrollment step.
  if (Math.floor(Date.now() / 30000) <= enrollmentCounter)
    await delay((enrollmentCounter + 1) * 30000 - Date.now() + 1000);
  await second.page.locator("#code").fill(totp(factor.totp.secret));
  await second.page
    .getByRole("button", { name: messages.auth.mfaVerify, exact: true })
    .click();
  await second.page.waitForURL(
    (target) => target.pathname === "/auth/set-password",
    { timeout: 30000 },
  );

  phase = "password update succeeds after MFA";
  const finalPassword = password();
  await savePassword(second.page, finalPassword);
  await second.context.close();
  const login = client();
  checked(
    await login.auth.signInWithPassword({ email, password: finalPassword }),
  );
  checked(await login.auth.signOut({ scope: "local" }));
  console.log(
    "PASS password recovery: ordinary setup succeeds; MFA-protected recovery requires the existing authenticator, returns to password setup, and accepts the new password.",
  );
}

main()
  .catch(() => {
    console.error(
      `Password recovery integration failed during: ${phase}. No passwords, tokens or factor secrets printed.`,
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      if (browser) await browser.close();
      if (userId) checked(await admin.auth.admin.deleteUser(userId));
    } catch {
      console.error("Isolated password-recovery test cleanup failed.");
      process.exitCode = 1;
    }
  });
