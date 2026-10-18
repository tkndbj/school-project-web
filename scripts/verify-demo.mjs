import assert from "node:assert/strict";
import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";

if (fs.existsSync(".env.local")) process.loadEnvFile(".env.local");
if (
  process.env.APP_ENV === "production" ||
  process.env.VERCEL_ENV === "production"
)
  throw Error("Test fixtures are forbidden in production.");
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const fixture = JSON.parse(fs.readFileSync(".demo-credentials.json", "utf8"));
assert.equal(
  fixture.project,
  url,
  "Demo credentials must belong to this project",
);
const clients = [];
function checked(result) {
  if (result.error) throw Error(result.error.code ?? "Backend request failed");
  return result.data;
}
async function signedIn(kind) {
  const db = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const account = fixture.accounts[kind];
  assert.ok(account, `Missing ${kind} account; run setup:demo first`);
  checked(await db.auth.signInWithPassword(account));
  clients.push(db);
  return db;
}
try {
  const anonymous = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const signup = await anonymous.auth.signUp({
    email: "uninvited@demo.school.example",
    password: "TestOnlyUninvitedAccount12!",
  });
  assert.equal(
    signup.error?.code,
    "signup_disabled",
    "Public registration is disabled while invited email login remains enabled",
  );
  const parent = await signedIn("parent"),
    other = await signedIn("otherParent"),
    staff = await signedIn("staff");
  const children = checked(await parent.rpc("guardian_children"));
  const otherChildren = checked(await other.rpc("guardian_children"));
  assert.equal(children.length, 1, "Parent sees their linked demo child");
  assert.equal(
    otherChildren.length,
    1,
    "Other parent sees their linked demo child",
  );
  assert.notEqual(
    children[0].student_id,
    otherChildren[0].student_id,
    "Parents are isolated",
  );
  const child = children[0];
  const denied = await parent.rpc("guardian_student_profile", {
    p_student_id: otherChildren[0].student_id,
  });
  assert.equal(denied.error?.code, "42501", "Other parent's profile is denied");
  assert.equal(
    checked(await parent.from("students").select("id")).length,
    0,
    "Parent has no direct student table access",
  );
  const grades = checked(
    await parent.rpc("guardian_student_grades", {
      p_student_id: child.student_id,
    }),
  );
  assert.ok(
    grades.some(
      (grade) => grade.assessment_title === "Published demo assessment",
    ),
  );
  assert.ok(
    grades.every((grade) => grade.assessment_title !== "Draft demo assessment"),
    "Draft grade is hidden",
  );
  const notes = checked(
    await parent.rpc("guardian_student_notes_page", {
      p_student_id: child.student_id,
    }),
  );
  assert.ok(notes.some((note) => note.title === "Welcome to the demo"));
  assert.ok(
    notes.every((note) => note.title !== "Staff-only demo note"),
    "Private note is hidden",
  );
  assert.ok(
    checked(
      await parent.rpc("guardian_student_courses", {
        p_student_id: child.student_id,
      }),
    ).some((course) => course.code === "DEMO-MATH"),
  );
  const context = checked(await staff.rpc("my_account_context"));
  assert.ok(
    context.memberships.some((member) => member.school_id === child.school_id),
  );
  const members = await staff.rpc("school_member_accounts", {
    p_school_id: child.school_id,
  });
  assert.equal(
    members.error?.code,
    "42501",
    "Staff cannot inspect administrator-only account metadata",
  );
  console.log(
    "PASS hosted demo: authentication, linking, parent isolation, publication, private notes, courses and staff restrictions.",
  );
} finally {
  await Promise.allSettled(clients.map((client) => client.auth.signOut()));
}
if (process.env.ALLOW_TEST_FIXTURES !== "true")
  throw Error(
    "Set ALLOW_TEST_FIXTURES=true only for an isolated test project.",
  );
