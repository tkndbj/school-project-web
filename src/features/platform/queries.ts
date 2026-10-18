import { selectAll } from "@/server/select-all";
import "server-only";
import { notFound } from "next/navigation";
import { authorizeSchoolAction, requirePlatformAdmin } from "@/server/auth";
import { createServerSupabase } from "@/server/supabase";

export type SchoolMemberRow = {
  id: string;
  userId: string;
  role: "admin" | "staff";
  email: string | null;
  fullName: string | null;
  /** Invitation sent but never accepted. */
  pending: boolean;
  lastSignInAt: string | null;
};

export async function getPlatformSchool(schoolId: string) {
  await requirePlatformAdmin();
  const supabase = await createServerSupabase();
  const { data: school } = await supabase
    .from("schools")
    .select("*")
    .eq("id", schoolId)
    .maybeSingle();
  if (!school) notFound();
  return school;
}

export async function getSchoolMembers(
  schoolId: string,
): Promise<SchoolMemberRow[]> {
  if (!(await authorizeSchoolAction(schoolId, { adminOnly: true }))) notFound();
  const supabase = await createServerSupabase();
  const data = await selectAll((from, to) =>
    supabase
      .rpc("school_member_accounts", { p_school_id: schoolId })
      .range(from, to),
  );
  return data.map((member) => ({
    id: member.id,
    userId: member.user_id,
    role: member.role,
    email: member.email,
    fullName: member.full_name,
    pending: member.pending,
    lastSignInAt: member.last_sign_in_at,
  }));
}
