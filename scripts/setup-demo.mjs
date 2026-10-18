import fs from "node:fs";
import path from "node:path";
import { randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

if (fs.existsSync(".env.local")) process.loadEnvFile(".env.local");
if (
  process.env.APP_ENV === "production" ||
  process.env.VERCEL_ENV === "production"
)
  throw Error("Test fixtures are forbidden in production.");
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secret = process.env.SUPABASE_SECRET_KEY;
if (!url || !secret || /xxxx|placeholder/.test(secret))
  throw Error(
    "Configure .env.local with a Supabase project and server secret first.",
  );
const local = ["localhost", "127.0.0.1"].includes(new URL(url).hostname);
if (!local && !process.argv.includes("--allow-hosted"))
  throw Error(
    "Hosted demo creation requires --allow-hosted. Use a dedicated test project.",
  );
const db = createClient(url, secret, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const { count: ownerCount, error: ownerCheckError } = await db
  .from("platform_admins")
  .select("user_id", { count: "exact", head: true });
if (ownerCheckError || ownerCount)
  throw Error(
    "A project with platform owners cannot be seeded with test data.",
  );
const credentialFile = path.resolve(".demo-credentials.json");
const previous = fs.existsSync(credentialFile)
  ? JSON.parse(fs.readFileSync(credentialFile, "utf8"))
  : null;
if (previous && previous.project !== url)
  throw Error(
    "Credentials belong to a different project. Move that file aside before creating another demo.",
  );
const credentials = previous ?? { project: url, accounts: {} };
function checked(result) {
  if (result.error)
    throw Error(
      `Demo setup failed: ${result.error.code ?? "database"} ${result.error.message}`,
    );
  return result.data;
}
async function ensure(table, filters, values) {
  let query = db.from(table).select("*");
  for (const [key, value] of Object.entries(filters))
    query = value === null ? query.is(key, null) : query.eq(key, value);
  const row = checked(await query.maybeSingle());
  return (
    row ??
    checked(
      await db
        .from(table)
        .insert({ ...filters, ...values })
        .select("*")
        .single(),
    )
  );
}
async function account(kind, email) {
  const found = checked(
    await db.rpc("admin_find_user_by_email", { p_email: email }),
  );
  let id = found?.[0]?.user_id;
  if (!id) {
    const password = `${randomBytes(24).toString("base64url")}aA1!`;
    const result = await db.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: `Demo ${kind}` },
    });
    checked(result);
    id = result.data.user.id;
    credentials.accounts[kind] = { email, password };
    // Persist immediately so an interrupted setup never loses generated passwords.
    fs.writeFileSync(
      credentialFile,
      JSON.stringify(credentials, null, 2) + "\n",
      { mode: 0o600 },
    );
  }
  return id;
}
const school = await ensure(
  "schools",
  { slug: "demo-for-testing" },
  {
    name: "Demo School",
    timezone: "Europe/Istanbul",
    settings: { demo_fixture: true },
    default_locale: "en",
  },
);
if (school.settings?.demo_fixture !== true)
  throw Error(
    "The demo slug is already owned by a real school; no records were changed.",
  );
const admin = await account("admin", "admin@demo.school.example");
const staff = await account("staff", "staff@demo.school.example");
await account("parent", "parent@demo.school.example");
await account("otherParent", "other-parent@demo.school.example");
for (const [user_id, role] of [
  [admin, "admin"],
  [staff, "staff"],
])
  await ensure("school_members", { school_id: school.id, user_id }, { role });
const term = await ensure(
  "academic_terms",
  { school_id: school.id, name: "Demo term" },
  { starts_on: "2026-01-01", ends_on: "2030-12-31" },
);
const course = await ensure(
  "courses",
  { school_id: school.id, code: "DEMO-MATH", term_id: term.id },
  { name: "Mathematics", subject: "Mathematics", grade_level: "5" },
);
const teacher = await ensure(
  "teachers",
  { school_id: school.id, staff_number: "DEMO-T01" },
  {
    first_name: "Deniz",
    last_name: "Yılmaz",
    subject: "Mathematics",
    email: "teacher@demo.school.example",
  },
);
await ensure(
  "course_teachers",
  { school_id: school.id, course_id: course.id, teacher_id: teacher.id },
  {},
);
const today = new Intl.DateTimeFormat("en-CA", {
  timeZone: school.timezone,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
}).format(new Date());
const students = [];
for (const [number, first_name, email] of [
  ["DEMO-001", "Ada", "parent@demo.school.example"],
  ["DEMO-002", "Mert", "other-parent@demo.school.example"],
]) {
  const student = await ensure(
    "students",
    { school_id: school.id, student_number: number },
    {
      first_name,
      last_name: "Demo",
      grade_level: "5",
      section: "A",
      status: "active",
    },
  );
  const guardian = await ensure(
    "guardians",
    { school_id: school.id, email },
    { first_name: "Demo", last_name: "Parent" },
  );
  await ensure(
    "student_guardians",
    { school_id: school.id, student_id: student.id, guardian_id: guardian.id },
    { relationship: "guardian", is_primary: true },
  );
  await ensure(
    "enrollments",
    { school_id: school.id, course_id: course.id, student_id: student.id },
    {},
  );
  await ensure(
    "attendance_records",
    {
      school_id: school.id,
      student_id: student.id,
      attended_on: today,
      course_id: null,
      period: null,
    },
    { status: "present" },
  );
  await ensure(
    "student_notes",
    {
      school_id: school.id,
      student_id: student.id,
      title: "Welcome to the demo",
    },
    {
      body: "This is a note shared with the student's parent.",
      visible_to_guardians: true,
      teacher_id: teacher.id,
    },
  );
  await ensure(
    "student_notes",
    {
      school_id: school.id,
      student_id: student.id,
      title: "Staff-only demo note",
    },
    { body: "Parents must never see this note.", visible_to_guardians: false },
  );
  students.push(student);
}
for (const [title, published] of [
  ["Published demo assessment", true],
  ["Draft demo assessment", false],
]) {
  const assessment = await ensure(
    "assessments",
    { school_id: school.id, course_id: course.id, title },
    {
      kind: "exam",
      max_score: 100,
      assessed_on: today,
      published_at: published ? new Date().toISOString() : null,
      term_id: term.id,
    },
  );
  for (const student of students)
    await ensure(
      "grades",
      {
        school_id: school.id,
        assessment_id: assessment.id,
        student_id: student.id,
      },
      {
        score: 85,
        comment: published ? "Well done." : "Unpublished grade: staff only.",
      },
    );
}
await ensure(
  "events",
  { school_id: school.id, title: "Demo school event" },
  {
    starts_at: new Date(Date.now() + 86400000).toISOString(),
    description: "A school event visible to parents.",
    visible_to_guardians: true,
  },
);
if (process.argv.includes("--with-platform")) {
  const platform = await account("platform", "platform@demo.school.example");
  await ensure("platform_admins", { user_id: platform }, {});
}
credentials.schoolSlug = school.slug;
fs.writeFileSync(credentialFile, JSON.stringify(credentials, null, 2) + "\n", {
  mode: 0o600,
});
console.log(`Demo school ready: /school/${school.slug}`);
console.log(
  `Passwords are stored only in ${credentialFile}. Do not commit or share that file.`,
);
if (process.env.ALLOW_TEST_FIXTURES !== "true")
  throw Error(
    "Set ALLOW_TEST_FIXTURES=true only for an isolated test project.",
  );
