import "server-only";
import { failWith, ok, type ActionResult } from "@/lib/errors";
import { createAdminSupabase } from "@/server/supabase";

/**
 * Permanently deletes an auth user. Shared by the web account page and the
 * mobile API (DELETE /api/account). The caller must already have verified that
 * `userId` is the authenticated user.
 *
 * Refused for platform admins (remove them via SQL deliberately) and for the
 * last admin of a school, which would otherwise leave the school unmanaged.
 * Guardian records keep existing (the school's data) and are simply unlinked.
 */
export async function deleteAccount(userId: string): Promise<ActionResult> {
  const admin = createAdminSupabase();

  const { data: platformAdmin } = await admin
    .from("platform_admins")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();
  if (platformAdmin) return failWith("forbidden", { reason: "platform_admin_cannot_self_delete" });

  const { data: adminMemberships, error: membershipError } = await admin
    .from("school_members")
    .select("school_id")
    .eq("user_id", userId)
    .eq("role", "admin");
  if (membershipError) return failWith("unknown", { reason: membershipError.message });

  for (const { school_id } of adminMemberships ?? []) {
    const { count } = await admin
      .from("school_members")
      .select("id", { count: "exact", head: true })
      .eq("school_id", school_id)
      .eq("role", "admin")
      .neq("user_id", userId);
    if (!count) return failWith("schoolRequiresAdmin", { reason: "last_school_admin" });
  }

  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) return failWith("unknown", { reason: error.code });
  return ok();
}
