"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { fail, failWith, ok, type ActionResult } from "@/lib/errors";
import { validationFailure } from "@/lib/validation";
import { authorizeSchoolAction } from "@/server/auth";
import { createServerSupabase } from "@/server/supabase";
import { assessmentSchema, gradebookSchema, type AssessmentInput, type GradebookInput } from "./schema";

const uuid = z.uuid();

async function authorize(schoolId: string, ...otherIds: string[]) {
  if (![schoolId, ...otherIds].every((id) => uuid.safeParse(id).success)) return false;
  return Boolean(await authorizeSchoolAction(schoolId));
}

function toRow(input: z.output<typeof assessmentSchema>, previousPublishedAt: string | null = null) {
  const { published, ...fields } = input;
  return { ...fields, published_at: published ? (previousPublishedAt ?? new Date().toISOString()) : null };
}

export async function createAssessment(
  schoolId: string,
  courseId: string,
  input: AssessmentInput,
): Promise<ActionResult<{ id: string }>> {
  if (!(await authorize(schoolId, courseId))) return failWith("forbidden");
  const parsed = assessmentSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);

  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("assessments")
    .insert({ ...toRow(parsed.data), school_id: schoolId, course_id: courseId })
    .select("id")
    .single();
  if (error) return fail(error);
  return ok({ id: data.id });
}

export async function updateAssessment(
  schoolId: string,
  assessmentId: string,
  input: AssessmentInput,
): Promise<ActionResult> {
  if (!(await authorize(schoolId, assessmentId))) return failWith("forbidden");
  const parsed = assessmentSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);

  const supabase = await createServerSupabase();
  const { data: current } = await supabase
    .from("assessments")
    .select("published_at")
    .eq("school_id", schoolId)
    .eq("id", assessmentId)
    .maybeSingle();
  if (!current) return failWith("notFound");
  const { error } = await supabase
    .from("assessments")
    .update(toRow(parsed.data, current.published_at))
    .eq("school_id", schoolId)
    .eq("id", assessmentId);
  if (error) return fail(error);
  refresh();
  return ok();
}

export async function setAssessmentPublished(
  schoolId: string,
  assessmentId: string,
  published: boolean,
): Promise<ActionResult> {
  if (!(await authorize(schoolId, assessmentId))) return failWith("forbidden");
  const supabase = await createServerSupabase();
  const { error } = await supabase
    .from("assessments")
    .update({ published_at: published ? new Date().toISOString() : null })
    .eq("school_id", schoolId)
    .eq("id", assessmentId);
  if (error) return fail(error);
  refresh();
  return ok();
}

export async function deleteAssessment(schoolId: string, assessmentId: string): Promise<ActionResult> {
  if (!(await authorize(schoolId, assessmentId))) return failWith("forbidden");
  const supabase = await createServerSupabase();
  const { error } = await supabase.from("assessments").delete().eq("school_id", schoolId).eq("id", assessmentId);
  return error ? fail(error) : ok();
}

/** Saves the whole gradebook of an assessment atomically (see public.save_grades). */
export async function saveGradebook(
  schoolId: string,
  assessmentId: string,
  input: GradebookInput,
): Promise<ActionResult<{ saved: number }>> {
  if (!(await authorize(schoolId, assessmentId))) return failWith("forbidden");
  const parsed = gradebookSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);

  const supabase = await createServerSupabase();
  const { data, error } = await supabase.rpc("save_grades", {
    p_assessment_id: assessmentId,
    p_entries: parsed.data.entries,
  });
  if (error) return fail(error);
  refresh();
  return ok({ saved: data });
}
