import "server-only";
import { notFound } from "next/navigation";
import { cache } from "react";
import { parsePage } from "@/lib/pagination";
import { toIlikePattern } from "@/lib/search";
import type { Enums } from "@/lib/supabase/types";
import { signMediaUrls } from "@/server/storage";
import { createServerSupabase } from "@/server/supabase";
import { STUDENT_STATUSES } from "./schema";

export type StudentListFilters = {
  q?: string;
  status?: string;
  grade?: string;
  page?: string;
};

export async function listStudents(schoolId: string, filters: StudentListFilters) {
  const supabase = await createServerSupabase();
  const { page, pageSize, from, to } = parsePage(filters.page);

  let query = supabase
    .from("students")
    .select("id, student_number, first_name, last_name, preferred_name, grade_level, section, status, photo_path", {
      count: "exact",
    })
    .eq("school_id", schoolId);

  const pattern = toIlikePattern(filters.q);
  if (pattern) {
    query = query.or(`first_name.ilike.${pattern},last_name.ilike.${pattern},student_number.ilike.${pattern}`);
  }
  if (filters.status && (STUDENT_STATUSES as readonly string[]).includes(filters.status)) {
    query = query.eq("status", filters.status as Enums<"student_status">);
  }
  if (filters.grade) query = query.eq("grade_level", filters.grade.slice(0, 50));

  const { data, count, error } = await query
    .order("last_name", { ascending: true, nullsFirst: false })
    .order("first_name", { ascending: true, nullsFirst: false })
    .order("id")
    .range(from, to);
  if (error) throw error;

  const photos = await signMediaUrls(data.map((s) => s.photo_path));
  return {
    rows: data.map((s) => ({ ...s, photoUrl: s.photo_path ? (photos.get(s.photo_path) ?? null) : null })),
    total: count ?? 0,
    page,
    pageSize,
  };
}

/** Grade level / section groups of active students (aggregated in the database). */
export const listStudentGroups = cache(async (schoolId: string) => {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase.rpc("school_student_groups", { p_school_id: schoolId });
  if (error) throw error;
  return data;
});

/** Distinct grade levels in use, for filter dropdowns. */
export async function listGradeLevels(schoolId: string): Promise<string[]> {
  return [...new Set((await listStudentGroups(schoolId)).map((g) => g.grade_level))];
}

/** Sections within a grade level. */
export async function listSections(schoolId: string, gradeLevel: string): Promise<string[]> {
  return (await listStudentGroups(schoolId))
    .filter((g) => g.grade_level === gradeLevel && g.section)
    .map((g) => g.section!);
}

export const getStudent = cache(async (schoolId: string, studentId: string) => {
  const supabase = await createServerSupabase();
  const { data } = await supabase
    .from("students")
    .select("*")
    .eq("school_id", schoolId)
    .eq("id", studentId)
    .maybeSingle();
  if (!data) notFound();
  return data;
});

/** Light-weight search used by pickers (enrol student, link guardian...). */
export async function searchStudents(schoolId: string, q: string, limit = 20) {
  const supabase = await createServerSupabase();
  let query = supabase
    .from("students")
    .select("id, student_number, first_name, last_name, grade_level, section")
    .eq("school_id", schoolId)
    .eq("status", "active");
  const pattern = toIlikePattern(q);
  if (pattern) {
    query = query.or(`first_name.ilike.${pattern},last_name.ilike.${pattern},student_number.ilike.${pattern}`);
  }
  const { data, error } = await query.order("last_name").order("first_name").limit(limit);
  if (error) throw error;
  return data;
}
