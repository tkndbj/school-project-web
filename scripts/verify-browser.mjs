import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { chromium, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
const project = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
process.loadEnvFile(path.join(project, ".env.local"));
if (
  process.env.APP_ENV === "production" ||
  process.env.VERCEL_ENV === "production"
)
  throw Error("Test fixtures are forbidden in production.");
const fixture = JSON.parse(
  fs.readFileSync(path.join(project, ".demo-credentials.json"), "utf8"),
);
const messages = JSON.parse(
  fs.readFileSync(path.join(project, "messages/en.json"), "utf8"),
);
const base = process.env.WEB_TEST_BASE_URL || "http://localhost:3000";
let step = "initialization",
  browser;
const checked = (result) => {
  if (result.error) throw Error("backend_request");
  return result.data;
};

async function main() {
  assert.equal(fixture.project, process.env.NEXT_PUBLIC_SUPABASE_URL);
  assert.equal(fixture.schoolSlug, "demo-for-testing");
  const adminApi = createClient(
    fixture.project,
    process.env.SUPABASE_SECRET_KEY,
    {
      auth: { persistSession: false, autoRefreshToken: false },
    },
  );
  const school = checked(
    await adminApi
      .from("schools")
      .select("id,settings")
      .eq("slug", fixture.schoolSlug)
      .single(),
  );
  assert.equal(school.settings.demo_fixture, true);
  const students = checked(
    await adminApi
      .from("students")
      .select("id,student_number")
      .eq("school_id", school.id)
      .order("student_number"),
  );
  const child = students.find(
    (student) => student.student_number === "DEMO-001",
  );
  const otherChild = students.find(
    (student) => student.student_number === "DEMO-002",
  );
  const course = checked(
    await adminApi
      .from("courses")
      .select("id")
      .eq("school_id", school.id)
      .eq("code", "DEMO-MATH")
      .single(),
  );
  const assessment = checked(
    await adminApi
      .from("assessments")
      .select("id")
      .eq("course_id", course.id)
      .eq("title", "Published demo assessment")
      .single(),
  );
  const original = checked(
    await adminApi
      .from("grades")
      .select("score")
      .eq("assessment_id", assessment.id)
      .eq("student_id", child.id)
      .single(),
  ).score;
  browser = await chromium.launch({ headless: true });
  const errors = [];
  function watch(page) {
    page.on("pageerror", () => errors.push(`${step}: browser exception`));
    page.on("console", (message) => {
      if (message.type() === "error")
        errors.push(`${step}: browser console error`);
    });
  }
  async function visit(page, route) {
    step = route;
    const response = await page.goto(base + route);
    assert.equal(response.status(), 200, "page_http_status");
    await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
    await expect(
      page.getByText(messages.errors.unexpected, { exact: true }),
    ).toHaveCount(0);
    assert.ok(!page.url().includes("/login"), "authenticated_session");
    assert.equal(errors.length, 0, "no_browser_errors");
  }
  async function login(kind, viewport) {
    step = `${kind} sign-in`;
    const context = await browser.newContext({ locale: "en-US", viewport });
    const page = await context.newPage();
    watch(page);
    await page.goto(base + "/login");
    await page.locator("#email").fill(fixture.accounts[kind].email);
    await page.locator("#password").fill(fixture.accounts[kind].password);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await page.waitForURL((url) => !url.pathname.startsWith("/login"), {
      timeout: 30000,
    });
    return { context, page };
  }
  const admin = await login("admin", { width: 1365, height: 900 });
  const root = `/school/${fixture.schoolSlug}`;
  for (const suffix of [
    "",
    "/students",
    "/teachers",
    "/guardians",
    "/courses",
    "/attendance",
    "/events",
    "/settings",
    "/audit",
    "/students/new",
    `/students/${child.id}`,
    `/courses/${course.id}`,
  ])
    await visit(admin.page, root + suffix);
  const gradeRoute = `${root}/courses/${course.id}/assessments/${assessment.id}`;
  await visit(admin.page, gradeRoute);
  const parent = await login("parent", { width: 390, height: 844 });
  await visit(parent.page, "/parent");
  await expect(
    parent.page.getByText("Ada Demo", { exact: true }),
  ).toBeVisible();
  await expect(parent.page.getByText("Mert Demo", { exact: true })).toHaveCount(
    0,
  );
  for (const tab of [
    "profile",
    "courses",
    "grades",
    "attendance",
    "notes",
    "events",
  ])
    await visit(parent.page, `/parent/${child.id}?tab=${tab}`);
  await visit(parent.page, `/parent/${child.id}?tab=grades`);
  await expect(
    parent.page.getByText("Published demo assessment", { exact: true }),
  ).toBeVisible();
  await expect(
    parent.page.getByText("Draft demo assessment", { exact: true }),
  ).toHaveCount(0);
  await visit(parent.page, `/parent/${child.id}?tab=notes`);
  await expect(
    parent.page.getByText("Welcome to the demo", { exact: true }),
  ).toBeVisible();
  await expect(
    parent.page.getByText("Staff-only demo note", { exact: true }),
  ).toHaveCount(0);
  // Exercise a real Server Action and verify its result through the parent's UI.
  const score = original === 86 ? "87" : "86";
  let changed = false;
  try {
    step = "save grade through school browser";
    await admin.page
      .getByLabel("Score for Ada Demo", { exact: true })
      .fill(score);
    await admin.page
      .getByRole("button", { name: messages.grades.saveGrades, exact: true })
      .click();
    await expect(
      admin.page.getByText(messages.grades.gradesSaved, { exact: true }).last(),
    ).toBeVisible();
    changed = true;
    await visit(parent.page, `/parent/${child.id}?tab=grades`);
    await expect(
      parent.page.getByText(`${score} / 100`, { exact: true }),
    ).toBeVisible();
  } finally {
    // Restore the fixture using the same UI, even if the parent assertion fails.
    if (changed) {
      step = "restore demo grade";
      await admin.page
        .getByLabel("Score for Ada Demo", { exact: true })
        .fill(String(original));
      await admin.page
        .getByRole("button", { name: messages.grades.saveGrades, exact: true })
        .click();
      await expect(
        admin.page
          .getByText(messages.grades.gradesSaved, { exact: true })
          .last(),
      ).toBeVisible();
    }
  }
  assert.equal(errors.length, 0, "no_browser_errors");
  step = "cross-parent profile denial";
  await parent.page.goto(base + `/parent/${otherChild.id}`);
  await expect(
    parent.page.getByRole("heading", {
      name: messages.errors.pageNotFound,
      exact: true,
    }),
  ).toBeVisible();
  await expect(parent.page.getByText("Mert Demo", { exact: true })).toHaveCount(
    0,
  );
  console.log(
    "PASS authenticated browser: 13 school screens, 6 child tabs on phone viewport, private records hidden, cross-parent access denied, grade save visible to parent. Demo score restored.",
  );
}
main()
  .catch((error) => {
    let detail = String(error.message ?? "");
    for (const account of Object.values(fixture.accounts))
      detail = detail.split(account.password).join("[redacted]");
    console.error(detail.slice(0, 1500));
    console.error(
      `Authenticated browser verification failed at: ${step}. No credentials printed.`,
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    if (browser) await browser.close();
  });
if (process.env.ALLOW_TEST_FIXTURES !== "true")
  throw Error(
    "Set ALLOW_TEST_FIXTURES=true only for an isolated test project.",
  );
