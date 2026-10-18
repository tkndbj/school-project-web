"use server";

import { addMemberByEmail } from "@/server/members";

import { refresh } from "next/cache";
import { z } from "zod";
import { fail, failWith, ok, type ActionResult } from "@/lib/errors";
import { validationFailure } from "@/lib/validation";
import { authorizePlatformAction } from "@/server/auth";
import { createServerSupabase } from "@/server/supabase";
import {
  createSchoolSchema,
  inviteMemberSchema,
  platformUpdateSchoolSchema,
  SCHOOL_ROLES,
} from "../schools/schema";

// Platform (master) admin operations. Data changes go through the admin's own
// session so RLS applies and the audit log records the actor; only the auth
// admin API (creating/inviting accounts) uses the privileged client.

export async function createSchool(
  input: z.input<typeof createSchoolSchema>,
): Promise<ActionResult<{ id: string; adminInvitationFailed: boolean }>> {
  if (!(await authorizePlatformAction())) return failWith("forbidden");
  const parsed = createSchoolSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);
  const { first_admin_email, ...school } = parsed.data;

  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("schools")
    .insert(school)
    .select("id")
    .single();
  if (error)
    return fail(
      error,
      error.code === "23505" ? { slug: ["taken"] } : undefined,
    );

  let adminInvitationFailed = false;
  if (first_admin_email) {
    const invited = await addMemberByEmail(data.id, first_admin_email, "admin");
    adminInvitationFailed = !invited.ok;
  }
  refresh();
  return ok({ id: data.id, adminInvitationFailed });
}

export async function updateSchool(
  schoolId: string,
  input: z.input<typeof platformUpdateSchoolSchema>,
): Promise<ActionResult> {
  if (!(await authorizePlatformAction())) return failWith("forbidden");
  const parsed = platformUpdateSchoolSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);

  const supabase = await createServerSupabase();
  const { error } = await supabase
    .from("schools")
    .update(parsed.data)
    .eq("id", schoolId);
  if (error)
    return fail(
      error,
      error.code === "23505" ? { slug: ["taken"] } : undefined,
    );
  refresh();
  return ok();
}

export async function deleteSchool(schoolId: string): Promise<ActionResult> {
  if (!(await authorizePlatformAction())) return failWith("forbidden");
  const id = z.uuid().safeParse(schoolId);
  if (!id.success) return failWith("invalidValue");
  const supabase = await createServerSupabase();
  const { error } = await supabase.from("schools").delete().eq("id", id.data);
  return error ? fail(error) : ok();
}

export async function inviteMember(
  input: z.input<typeof inviteMemberSchema>,
): Promise<ActionResult<{ invited: boolean }>> {
  if (!(await authorizePlatformAction())) return failWith("forbidden");
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

export async function changeMemberRole(
  memberId: string,
  role: (typeof SCHOOL_ROLES)[number],
): Promise<ActionResult> {
  if (!(await authorizePlatformAction())) return failWith("forbidden");
  const parsed = z
    .object({ memberId: z.uuid(), role: z.enum(SCHOOL_ROLES) })
    .safeParse({ memberId, role });
  if (!parsed.success) return validationFailure(parsed.error);

  const supabase = await createServerSupabase();
  const { error } = await supabase
    .from("school_members")
    .update({ role })
    .eq("id", parsed.data.memberId);
  if (error) return fail(error);
  refresh();
  return ok();
}

export async function removeMember(memberId: string): Promise<ActionResult> {
  if (!(await authorizePlatformAction())) return failWith("forbidden");
  const id = z.uuid().safeParse(memberId);
  if (!id.success) return failWith("invalidValue");
  const supabase = await createServerSupabase();
  const { error } = await supabase
    .from("school_members")
    .delete()
    .eq("id", id.data);
  if (error) return fail(error);
  refresh();
  return ok();
}
