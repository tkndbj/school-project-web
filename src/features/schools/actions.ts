"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { fail, failWith, ok, type ActionResult } from "@/lib/errors";
import { validationFailure } from "@/lib/validation";
import { authorizeSchoolAction } from "@/server/auth";
import { addMemberByEmail } from "@/server/members";
import { createServerSupabase } from "@/server/supabase";
import {
  inviteMemberSchema,
  platformUpdateSchoolSchema,
  SCHOOL_ROLES,
} from "./schema";

const schoolSettingsSchema = platformUpdateSchoolSchema.omit({
  slug: true,
  status: true,
});

export async function updateSchoolSettings(
  schoolId: string,
  input: z.input<typeof schoolSettingsSchema>,
): Promise<ActionResult> {
  if (
    !z.uuid().safeParse(schoolId).success ||
    !(await authorizeSchoolAction(schoolId, { adminOnly: true }))
  )
    return failWith("forbidden");
  const parsed = schoolSettingsSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("schools")
    .update(parsed.data)
    .eq("id", schoolId)
    .select("id")
    .maybeSingle();
  if (error) return fail(error);
  if (!data) return failWith("notFound");
  refresh();
  return ok();
}

export async function setSchoolLogo(
  schoolId: string,
  path: string | null,
): Promise<ActionResult> {
  if (
    !z.uuid().safeParse(schoolId).success ||
    !(await authorizeSchoolAction(schoolId, { adminOnly: true }))
  )
    return failWith("forbidden");
  if (
    path !== null &&
    (path.length > 1024 ||
      !path.startsWith(`${schoolId}/branding/`) ||
      path.includes(".."))
  )
    return failWith("invalidValue");
  const supabase = await createServerSupabase();
  const { error } = await supabase
    .from("schools")
    .update({ logo_path: path })
    .eq("id", schoolId);
  if (error) return fail(error);
  refresh();
  return ok();
}

export async function inviteSchoolMember(
  input: z.input<typeof inviteMemberSchema>,
): Promise<ActionResult<{ invited: boolean }>> {
  const parsed = inviteMemberSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);
  const result = await addMemberByEmail(
    parsed.data.school_id,
    parsed.data.email,
    parsed.data.role,
  );
  if (result.ok) refresh();
  return result;
}

export async function changeSchoolMemberRole(
  schoolId: string,
  memberId: string,
  role: (typeof SCHOOL_ROLES)[number],
): Promise<ActionResult> {
  if (
    !z
      .object({
        schoolId: z.uuid(),
        memberId: z.uuid(),
        role: z.enum(SCHOOL_ROLES),
      })
      .safeParse({ schoolId, memberId, role }).success ||
    !(await authorizeSchoolAction(schoolId, { adminOnly: true }))
  )
    return failWith("forbidden");
  const supabase = await createServerSupabase();
  const { error } = await supabase
    .from("school_members")
    .update({ role })
    .eq("school_id", schoolId)
    .eq("id", memberId);
  if (error) return fail(error);
  refresh();
  return ok();
}

export async function removeSchoolMember(
  schoolId: string,
  memberId: string,
): Promise<ActionResult> {
  if (
    ![schoolId, memberId].every((id) => z.uuid().safeParse(id).success) ||
    !(await authorizeSchoolAction(schoolId, { adminOnly: true }))
  )
    return failWith("forbidden");
  const supabase = await createServerSupabase();
  const { error } = await supabase
    .from("school_members")
    .delete()
    .eq("school_id", schoolId)
    .eq("id", memberId);
  if (error) return fail(error);
  refresh();
  return ok();
}
