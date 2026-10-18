import "server-only";
import { fail, failWith, ok, type ActionResult } from "@/lib/errors";
import { publicEnv } from "@/lib/env";
import { authorizeSchoolAction } from "./auth";
import { createAdminSupabase, createServerSupabase } from "./supabase";
import { SCHOOL_ROLES } from "@/features/schools/schema";

/**
 * Adds a user to a school, inviting them by email first when no account
 * exists yet (or re-sending the invitation if it was never accepted).
 */
export async function addMemberByEmail(
  schoolId: string,
  email: string,
  role: (typeof SCHOOL_ROLES)[number],
): Promise<ActionResult<{ invited: boolean }>> {
  if (!(await authorizeSchoolAction(schoolId, { adminOnly: true })))
    return failWith("forbidden");
  const admin = createAdminSupabase();
  const { data: found, error: lookupError } = await admin.rpc(
    "admin_find_user_by_email",
    { p_email: email },
  );
  if (lookupError) return fail(lookupError);

  let userId = found?.[0]?.user_id ?? null;
  let invited = false;

  if (!userId || !found?.[0]?.email_confirmed) {
    const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
      redirectTo: new URL(
        "/auth/set-password",
        publicEnv.NEXT_PUBLIC_SITE_URL,
      ).toString(),
    });
    if (error)
      return failWith(error.status === 429 ? "rateLimited" : "unknown", {
        reason: error.code,
      });
    userId = data.user.id;
    invited = true;
  }

  const supabase = await createServerSupabase();
  const { error } = await supabase
    .from("school_members")
    .upsert(
      { school_id: schoolId, user_id: userId, role },
      { onConflict: "school_id,user_id" },
    );
  if (error) return fail(error);
  return ok({ invited });
}
