import "server-only";
import { notFound } from "next/navigation";
import { cache } from "react";
import { parsePage } from "@/lib/pagination";
import { displayName } from "@/lib/people";
import { toIlikePattern } from "@/lib/search";
import { signMediaUrls } from "@/server/storage";
import { createServerSupabase } from "@/server/supabase";

const FILTER = (p: string) =>
  `first_name.ilike.${p},last_name.ilike.${p},staff_number.ilike.${p},email.ilike.${p},subject.ilike.${p}`;

export async function listTeachers(schoolId: string, filters: { q?: string; page?: string }) {
  const supabase = await createServerSupabase();
  const { page, pageSize, from, to } = parsePage(filters.page);
  let query = supabase
    .from("teachers")
    .select("id, staff_number, title, first_name, last_name, email, phone, subject, photo_path, course_teachers(count)", {
      count: "exact",
    })
    .eq("school_id", schoolId);
  const pattern = toIlikePattern(filters.q);
  if (pattern) query = query.or(FILTER(pattern));
  const { data, count, error } = await query
    .order("last_name", { nullsFirst: false })
    .order("first_name", { nullsFirst: false })
    .order("id")
    .range(from, to);
  if (error) throw error;
  const photos = await signMediaUrls(data.map((t) => t.photo_path));
  return {
    rows: data.map((t) => ({
      ...t,
      photoUrl: t.photo_path ? (photos.get(t.photo_path) ?? null) : null,
      courseCount: (t.course_teachers as unknown as { count: number }[])[0]?.count ?? 0,
    })),
    total: count ?? 0,
    page,
    pageSize,
  };
}

export const getTeacher = cache(async (schoolId: string, teacherId: string) => {
  const supabase = await createServerSupabase();
  const { data } = await supabase
    .from("teachers")
    .select("*")
    .eq("school_id", schoolId)
    .eq("id", teacherId)
    .maybeSingle();
  if (!data) notFound();
  return data;
});

export async function getTeacherCourses(schoolId: string, teacherId: string) {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("course_teachers")
    .select("id, courses(id, name, code, academic_terms(name))")
    .eq("school_id", schoolId)
    .eq("teacher_id", teacherId);
  if (error) throw error;
  return data.flatMap((row) => (row.courses ? [row.courses] : []));
}

export async function searchTeachers(schoolId: string, q: string) {
  const supabase = await createServerSupabase();
  let query = supabase
    .from("teachers")
    .select("id, title, first_name, last_name, staff_number, email, subject")
    .eq("school_id", schoolId);
  const pattern = toIlikePattern(q);
  if (pattern) query = query.or(FILTER(pattern));
  const { data, error } = await query.order("last_name").limit(20);
  if (error) throw error;
  return data.map((t) => ({ id: t.id, label: displayName(t), description: t.subject ?? t.email }));
}
