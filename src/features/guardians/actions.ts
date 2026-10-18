"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import type { PickerItem } from "@/components/async-search-picker";
import { fail, failWith, ok, type ActionResult } from "@/lib/errors";
import { validationFailure } from "@/lib/validation";
import { authorizeSchoolAction } from "@/server/auth";
import { createServerSupabase } from "@/server/supabase";
import { createAdminSupabase } from "@/server/supabase";
import { publicEnv } from "@/lib/env";
import { getCustomFieldDefinitions } from "../custom-fields/queries";
import { toCustomFieldPayload } from "../custom-fields/values";
import { searchGuardians } from "./queries";
import {
  guardianLinkSchema,
  guardianSchema,
  newGuardianForStudentSchema,
  type GuardianInput,
} from "./schema";

const uuid = z.uuid();

/** Invite a parent's real email/password account without granting staff access. */
export async function inviteGuardianAccount(
  schoolId: string,
  guardianId: string,
): Promise<ActionResult> {
  if (!(await authorize(schoolId, guardianId))) return failWith("forbidden");
  const supabase = await createServerSupabase();
  const { data: guardian, error } = await supabase
    .from("guardians")
    .select("email")
    .eq("school_id", schoolId)
    .eq("id", guardianId)
    .maybeSingle();
  if (error) return fail(error);
  if (!guardian?.email) return failWith("invalidValue");
  const admin = createAdminSupabase();
  const { data: accounts, error: lookupError } = await admin.rpc(
    "admin_find_user_by_email",
    { p_email: guardian.email },
  );
  if (lookupError) return fail(lookupError);
  // Existing confirmed accounts sign in normally; their verified email links records.
  if (accounts[0]?.email_confirmed) return ok();
  const { error: inviteError } = await admin.auth.admin.inviteUserByEmail(
    guardian.email,
    {
      redirectTo: new URL(
        "/auth/set-password",
        publicEnv.NEXT_PUBLIC_SITE_URL,
      ).toString(),
    },
  );
  if (inviteError)
    return failWith(inviteError.status === 429 ? "rateLimited" : "unknown");
  refresh();
  return ok();
}

async function authorize(schoolId: string, ...otherIds: string[]) {
  if (![schoolId, ...otherIds].every((id) => uuid.safeParse(id).success))
    return false;
  return Boolean(await authorizeSchoolAction(schoolId));
}

function duplicateEmail(error: { code?: string }) {
  return error.code === "23505" ? { email: ["taken"] } : undefined;
}

export async function createGuardian(
  schoolId: string,
  input: GuardianInput,
): Promise<ActionResult<{ id: string }>> {
  if (!(await authorize(schoolId))) return failWith("forbidden");
  const parsed = guardianSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);
  const definitions = await getCustomFieldDefinitions(schoolId, "guardian");
  const { custom_fields, ...fields } = parsed.data;

  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("guardians")
    .insert({
      ...fields,
      custom_fields: toCustomFieldPayload(definitions, custom_fields),
      school_id: schoolId,
    })
    .select("id")
    .single();
  if (error) return fail(error, duplicateEmail(error));
  return ok({ id: data.id });
}

export async function updateGuardian(
  schoolId: string,
  guardianId: string,
  input: GuardianInput,
): Promise<ActionResult> {
  if (!(await authorize(schoolId, guardianId))) return failWith("forbidden");
  const parsed = guardianSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);
  const definitions = await getCustomFieldDefinitions(schoolId, "guardian");
  const { custom_fields, ...fields } = parsed.data;

  const supabase = await createServerSupabase();
  const { error } = await supabase
    .from("guardians")
    .update({
      ...fields,
      custom_fields: toCustomFieldPayload(definitions, custom_fields),
    })
    .eq("school_id", schoolId)
    .eq("id", guardianId);
  if (error) return fail(error, duplicateEmail(error));
  refresh();
  return ok();
}

export async function deleteGuardian(
  schoolId: string,
  guardianId: string,
): Promise<ActionResult> {
  if (!(await authorize(schoolId, guardianId))) return failWith("forbidden");
  const supabase = await createServerSupabase();
  const { error } = await supabase
    .from("guardians")
    .delete()
    .eq("school_id", schoolId)
    .eq("id", guardianId);
  return error ? fail(error) : ok();
}

export async function linkGuardianToStudent(
  schoolId: string,
  studentId: string,
  guardianId: string,
  input: z.input<typeof guardianLinkSchema>,
): Promise<ActionResult> {
  if (!(await authorize(schoolId, studentId, guardianId)))
    return failWith("forbidden");
  const parsed = guardianLinkSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);

  const supabase = await createServerSupabase();
  const { error } = await supabase.from("student_guardians").upsert(
    {
      school_id: schoolId,
      student_id: studentId,
      guardian_id: guardianId,
      ...parsed.data,
    },
    { onConflict: "student_id,guardian_id" },
  );
  if (error) return fail(error);
  refresh();
  return ok();
}

export async function createGuardianForStudent(
  schoolId: string,
  studentId: string,
  input: z.input<typeof newGuardianForStudentSchema>,
): Promise<ActionResult<{ guardianId: string; linkedAccount: boolean }>> {
  if (!(await authorize(schoolId, studentId))) return failWith("forbidden");
  const parsed = newGuardianForStudentSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);
  const { relationship, is_primary, ...guardian } = parsed.data;

  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("guardians")
    .insert({ ...guardian, school_id: schoolId })
    .select("id, user_id")
    .single();
  if (error) return fail(error, duplicateEmail(error));

  const { error: linkError } = await supabase.from("student_guardians").insert({
    school_id: schoolId,
    student_id: studentId,
    guardian_id: data.id,
    relationship,
    is_primary,
  });
  if (linkError) return fail(linkError);
  refresh();
  return ok({ guardianId: data.id, linkedAccount: Boolean(data.user_id) });
}

export async function unlinkGuardianFromStudent(
  schoolId: string,
  linkId: string,
): Promise<ActionResult> {
  if (!(await authorize(schoolId, linkId))) return failWith("forbidden");
  const supabase = await createServerSupabase();
  const { error } = await supabase
    .from("student_guardians")
    .delete()
    .eq("school_id", schoolId)
    .eq("id", linkId);
  if (error) return fail(error);
  refresh();
  return ok();
}

/** Disconnects the parent's app account from this guardian record. */
export async function unlinkGuardianAccount(
  schoolId: string,
  guardianId: string,
): Promise<ActionResult> {
  if (!(await authorize(schoolId, guardianId))) return failWith("forbidden");
  const supabase = await createServerSupabase();
  const { error } = await supabase
    .from("guardians")
    .update({ user_id: null, link_method: null, linked_at: null })
    .eq("school_id", schoolId)
    .eq("id", guardianId);
  if (error) return fail(error);
  refresh();
  return ok();
}

export async function createGuardianInvite(
  schoolId: string,
  guardianId: string,
): Promise<ActionResult<{ code: string; expiresAt: string }>> {
  if (!(await authorize(schoolId, guardianId))) return failWith("forbidden");
  const supabase = await createServerSupabase();
  const { data, error } = await supabase.rpc("create_guardian_invite", {
    p_guardian_id: guardianId,
    p_valid_days: 14,
  });
  if (error) return fail(error);
  const invite = data[0];
  if (!invite) return failWith("unknown");
  refresh();
  return ok({ code: invite.code, expiresAt: invite.expires_at });
}

export async function revokeGuardianInvite(
  schoolId: string,
  inviteId: string,
): Promise<ActionResult> {
  if (!(await authorize(schoolId, inviteId))) return failWith("forbidden");
  const supabase = await createServerSupabase();
  const { error } = await supabase
    .from("guardian_invites")
    .update({ revoked_at: new Date().toISOString() })
    .eq("school_id", schoolId)
    .eq("id", inviteId)
    .is("redeemed_at", null);
  if (error) return fail(error);
  refresh();
  return ok();
}

/** Picker search for linking an existing guardian to a student. */
export async function searchGuardiansAction(
  schoolId: string,
  q: string,
): Promise<ActionResult<PickerItem[]>> {
  if (!(await authorize(schoolId))) return failWith("forbidden");
  return ok(await searchGuardians(schoolId, q.slice(0, 100)));
}
