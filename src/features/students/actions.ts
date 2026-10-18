"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { fail, failWith, ok, type ActionResult } from "@/lib/errors";
import { validationFailure } from "@/lib/validation";
import { authorizeSchoolAction } from "@/server/auth";
import { MEDIA_BUCKET } from "@/server/storage";
import { createServerSupabase } from "@/server/supabase";
import { getCustomFieldDefinitions } from "../custom-fields/queries";
import { toCustomFieldPayload } from "../custom-fields/values";
import { studentSchema, type StudentInput } from "./schema";

const ids = z.object({ schoolId: z.uuid(), studentId: z.uuid() });

async function toRow(schoolId: string, input: StudentInput) {
  const parsed = studentSchema.safeParse(input);
  if (!parsed.success) return { valid: false as const, failure: validationFailure(parsed.error) };
  const definitions = await getCustomFieldDefinitions(schoolId, "student");
  const { custom_fields, ...fields } = parsed.data;
  return { valid: true as const, row: { ...fields, custom_fields: toCustomFieldPayload(definitions, custom_fields) } };
}

export async function createStudent(schoolId: string, input: StudentInput): Promise<ActionResult<{ id: string }>> {
  if (!z.uuid().safeParse(schoolId).success || !(await authorizeSchoolAction(schoolId))) return failWith("forbidden");
  const result = await toRow(schoolId, input);
  if (!result.valid) return result.failure;

  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("students")
    .insert({ ...result.row, school_id: schoolId })
    .select("id")
    .single();
  if (error) return fail(error, error.code === "23505" ? { student_number: ["taken"] } : undefined);
  return ok({ id: data.id });
}

export async function updateStudent(schoolId: string, studentId: string, input: StudentInput): Promise<ActionResult> {
  if (!ids.safeParse({ schoolId, studentId }).success || !(await authorizeSchoolAction(schoolId))) {
    return failWith("forbidden");
  }
  const result = await toRow(schoolId, input);
  if (!result.valid) return result.failure;

  const supabase = await createServerSupabase();
  const { error } = await supabase.from("students").update(result.row).eq("school_id", schoolId).eq("id", studentId);
  if (error) return fail(error, error.code === "23505" ? { student_number: ["taken"] } : undefined);
  refresh();
  return ok();
}

export async function deleteStudent(schoolId: string, studentId: string): Promise<ActionResult> {
  if (!ids.safeParse({ schoolId, studentId }).success || !(await authorizeSchoolAction(schoolId))) {
    return failWith("forbidden");
  }
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("students")
    .delete()
    .eq("school_id", schoolId)
    .eq("id", studentId)
    .select("photo_path")
    .maybeSingle();
  if (error) return fail(error);
  if (data?.photo_path) await supabase.storage.from(MEDIA_BUCKET).remove([data.photo_path]);
  return ok();
}

/** Stores the path of a photo the browser uploaded (or clears it) and removes the previous file. */
export async function setStudentPhoto(schoolId: string, studentId: string, path: string | null): Promise<ActionResult> {
  if (!ids.safeParse({ schoolId, studentId }).success || !(await authorizeSchoolAction(schoolId))) {
    return failWith("forbidden");
  }
  if (path !== null && !path.startsWith(`${schoolId}/students/${studentId}/`)) return failWith("invalidValue");

  const supabase = await createServerSupabase();
  const { data: current } = await supabase
    .from("students")
    .select("photo_path")
    .eq("school_id", schoolId)
    .eq("id", studentId)
    .maybeSingle();
  const { error } = await supabase
    .from("students")
    .update({ photo_path: path })
    .eq("school_id", schoolId)
    .eq("id", studentId);
  if (error) return fail(error);
  if (current?.photo_path && current.photo_path !== path) {
    await supabase.storage.from(MEDIA_BUCKET).remove([current.photo_path]);
  }
  refresh();
  return ok();
}
