"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import type { PickerItem } from "@/components/async-search-picker";
import { fail, failWith, ok, type ActionResult } from "@/lib/errors";
import { displayName } from "@/lib/people";
import { validationFailure } from "@/lib/validation";
import { authorizeSchoolAction } from "@/server/auth";
import { createServerSupabase } from "@/server/supabase";
import { getCustomFieldDefinitions } from "../custom-fields/queries";
import { toCustomFieldPayload } from "../custom-fields/values";
import { searchStudents } from "../students/queries";
import { bulkEnrollSchema, courseSchema, type CourseInput } from "./schema";
import { searchCourses } from "./queries";

const uuid = z.uuid();

async function authorize(schoolId: string, ...otherIds: string[]) {
  if (![schoolId, ...otherIds].every((id) => uuid.safeParse(id).success)) return false;
  return Boolean(await authorizeSchoolAction(schoolId));
}

async function toRow(schoolId: string, input: CourseInput) {
  const parsed = courseSchema.safeParse(input);
  if (!parsed.success) return { valid: false as const, failure: validationFailure(parsed.error) };
  const definitions = await getCustomFieldDefinitions(schoolId, "course");
  const { custom_fields, ...fields } = parsed.data;
  return { valid: true as const, row: { ...fields, custom_fields: toCustomFieldPayload(definitions, custom_fields) } };
}

export async function createCourse(schoolId: string, input: CourseInput): Promise<ActionResult<{ id: string }>> {
  if (!(await authorize(schoolId))) return failWith("forbidden");
  const result = await toRow(schoolId, input);
  if (!result.valid) return result.failure;
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("courses")
    .insert({ ...result.row, school_id: schoolId })
    .select("id")
    .single();
  if (error) return fail(error, error.code === "23505" ? { code: ["taken"] } : undefined);
  return ok({ id: data.id });
}

export async function updateCourse(schoolId: string, courseId: string, input: CourseInput): Promise<ActionResult> {
  if (!(await authorize(schoolId, courseId))) return failWith("forbidden");
  const result = await toRow(schoolId, input);
  if (!result.valid) return result.failure;
  const supabase = await createServerSupabase();
  const { error } = await supabase.from("courses").update(result.row).eq("school_id", schoolId).eq("id", courseId);
  if (error) return fail(error, error.code === "23505" ? { code: ["taken"] } : undefined);
  refresh();
  return ok();
}

export async function deleteCourse(schoolId: string, courseId: string): Promise<ActionResult> {
  if (!(await authorize(schoolId, courseId))) return failWith("forbidden");
  const supabase = await createServerSupabase();
  const { error } = await supabase.from("courses").delete().eq("school_id", schoolId).eq("id", courseId);
  return error ? fail(error) : ok();
}

export async function assignTeacher(schoolId: string, courseId: string, teacherId: string): Promise<ActionResult> {
  if (!(await authorize(schoolId, courseId, teacherId))) return failWith("forbidden");
  const supabase = await createServerSupabase();
  const { error } = await supabase
    .from("course_teachers")
    .upsert({ school_id: schoolId, course_id: courseId, teacher_id: teacherId }, { onConflict: "course_id,teacher_id" });
  if (error) return fail(error);
  refresh();
  return ok();
}

export async function unassignTeacher(schoolId: string, linkId: string): Promise<ActionResult> {
  if (!(await authorize(schoolId, linkId))) return failWith("forbidden");
  const supabase = await createServerSupabase();
  const { error } = await supabase.from("course_teachers").delete().eq("school_id", schoolId).eq("id", linkId);
  if (error) return fail(error);
  refresh();
  return ok();
}

export async function enrollStudent(schoolId: string, courseId: string, studentId: string): Promise<ActionResult> {
  if (!(await authorize(schoolId, courseId, studentId))) return failWith("forbidden");
  const supabase = await createServerSupabase();
  const { error } = await supabase
    .from("enrollments")
    .upsert({ school_id: schoolId, course_id: courseId, student_id: studentId }, { onConflict: "course_id,student_id" });
  if (error) return fail(error);
  refresh();
  return ok();
}

/** Enrols every active student of a grade (and optionally a section). Idempotent. */
export async function enrollByGrade(
  schoolId: string,
  courseId: string,
  input: z.input<typeof bulkEnrollSchema>,
): Promise<ActionResult<{ enrolled: number }>> {
  if (!(await authorize(schoolId, courseId))) return failWith("forbidden");
  const parsed = bulkEnrollSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);

  const supabase = await createServerSupabase();
  const { data, error } = await supabase.rpc("enroll_student_group", {
    p_course_id: courseId,
    p_grade_level: parsed.data.grade_level,
    p_section: parsed.data.section ?? undefined,
  });
  if (error) return fail(error);
  refresh();
  return ok({ enrolled: data });
}

export async function unenroll(schoolId: string, enrollmentId: string): Promise<ActionResult> {
  if (!(await authorize(schoolId, enrollmentId))) return failWith("forbidden");
  const supabase = await createServerSupabase();
  const { error } = await supabase.from("enrollments").delete().eq("school_id", schoolId).eq("id", enrollmentId);
  if (error) return fail(error);
  refresh();
  return ok();
}

export async function searchCoursesAction(schoolId: string, q: string): Promise<ActionResult<PickerItem[]>> {
  if (!(await authorize(schoolId))) return failWith("forbidden");
  return ok(await searchCourses(schoolId, q.slice(0, 100)));
}

export async function searchStudentsAction(schoolId: string, q: string): Promise<ActionResult<PickerItem[]>> {
  if (!(await authorize(schoolId))) return failWith("forbidden");
  const students = await searchStudents(schoolId, q.slice(0, 100));
  return ok(
    students.map((s) => ({
      id: s.id,
      label: displayName(s),
      description: [s.student_number, [s.grade_level, s.section].filter(Boolean).join(" / ")].filter(Boolean).join(" · "),
    })),
  );
}
