"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { fail, failWith, ok, type ActionResult } from "@/lib/errors";
import { optionalText, validationFailure } from "@/lib/validation";
import { authorizeSchoolAction } from "@/server/auth";
import { createServerSupabase } from "@/server/supabase";

const uuid = z.uuid();

const noteSchema = z.object({
  title: optionalText(200),
  body: z.string().trim().min(1).max(10000),
  category: optionalText(100),
  teacher_id: z
    .union([z.uuid(), z.literal("")])
    .nullish()
    .transform((v) => v || null),
  visible_to_guardians: z.boolean(),
});

async function authorize(schoolId: string, ...otherIds: string[]) {
  if (![schoolId, ...otherIds].every((id) => uuid.safeParse(id).success)) return false;
  return Boolean(await authorizeSchoolAction(schoolId));
}

export async function addStudentNote(
  schoolId: string,
  studentId: string,
  input: z.input<typeof noteSchema>,
): Promise<ActionResult> {
  if (!(await authorize(schoolId, studentId))) return failWith("forbidden");
  const parsed = noteSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);

  const supabase = await createServerSupabase();
  const { error } = await supabase
    .from("student_notes")
    .insert({ ...parsed.data, school_id: schoolId, student_id: studentId });
  if (error) return fail(error);
  refresh();
  return ok();
}

export async function setNoteVisibility(schoolId: string, noteId: string, visible: boolean): Promise<ActionResult> {
  if (!(await authorize(schoolId, noteId))) return failWith("forbidden");
  const supabase = await createServerSupabase();
  const { error } = await supabase
    .from("student_notes")
    .update({ visible_to_guardians: visible })
    .eq("school_id", schoolId)
    .eq("id", noteId);
  if (error) return fail(error);
  refresh();
  return ok();
}

export async function deleteStudentNote(schoolId: string, noteId: string): Promise<ActionResult> {
  if (!(await authorize(schoolId, noteId))) return failWith("forbidden");
  const supabase = await createServerSupabase();
  const { error } = await supabase.from("student_notes").delete().eq("school_id", schoolId).eq("id", noteId);
  if (error) return fail(error);
  refresh();
  return ok();
}
