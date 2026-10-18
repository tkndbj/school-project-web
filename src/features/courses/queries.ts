import "server-only";
import { notFound } from "next/navigation";
import { cache } from "react";
import { parsePage } from "@/lib/pagination";
import { displayName } from "@/lib/people";
import { toIlikePattern } from "@/lib/search";
import { selectAll } from "@/server/select-all";
import { createServerSupabase } from "@/server/supabase";

export async function listTerms(schoolId: string) {
  const supabase = await createServerSupabase();
  const data = await selectAll((from, to) =>
    supabase
      .from("academic_terms")
      .select("id, name, starts_on, ends_on")
      .eq("school_id", schoolId)
      .order("starts_on", { ascending: false })
      .order("id")
      .range(from, to),
  );
  return data;
}

export async function listCourses(
  schoolId: string,
  filters: { q?: string; term?: string; page?: string },
) {
  const supabase = await createServerSupabase();
  const { page, pageSize, from, to } = parsePage(filters.page);

  let query = supabase
    .from("courses")
    .select(
      "id, name, code, subject, grade_level, color, academic_terms(name), course_teachers(teachers(id, title, first_name, last_name)), enrollments(count)",
      { count: "exact" },
    )
    .eq("school_id", schoolId);
  const pattern = toIlikePattern(filters.q);
  if (pattern)
    query = query.or(
      `name.ilike.${pattern},code.ilike.${pattern},subject.ilike.${pattern}`,
    );
  if (filters.term) query = query.eq("term_id", filters.term);

  const { data, count, error } = await query
    .order("name")
    .order("id")
    .range(from, to);
  if (error) throw error;

  return {
    rows: data.map((c) => ({
      id: c.id,
      name: c.name,
      code: c.code,
      subject: c.subject,
      gradeLevel: c.grade_level,
      color: c.color,
      termName: c.academic_terms?.name ?? null,
      teachers: c.course_teachers.flatMap((ct) =>
        ct.teachers ? [displayName(ct.teachers)] : [],
      ),
      studentCount:
        (c.enrollments as unknown as { count: number }[])[0]?.count ?? 0,
    })),
    total: count ?? 0,
    page,
    pageSize,
  };
}

export const getCourse = cache(async (schoolId: string, courseId: string) => {
  const supabase = await createServerSupabase();
  const { data } = await supabase
    .from("courses")
    .select("*")
    .eq("school_id", schoolId)
    .eq("id", courseId)
    .maybeSingle();
  if (!data) notFound();
  return data;
});

export async function getCourseTeachers(schoolId: string, courseId: string) {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("course_teachers")
    .select("id, teachers(id, title, first_name, last_name, email, subject)")
    .eq("school_id", schoolId)
    .eq("course_id", courseId);
  if (error) throw error;
  return data.flatMap((row) =>
    row.teachers ? [{ linkId: row.id, teacher: row.teachers }] : [],
  );
}

export async function getCourseEnrollments(schoolId: string, courseId: string) {
  const supabase = await createServerSupabase();
  const data = await selectAll((from, to) =>
    supabase
      .from("enrollments")
      .select(
        "id, enrolled_on, students(id, student_number, first_name, last_name, preferred_name, grade_level, section, status)",
      )
      .eq("school_id", schoolId)
      .eq("course_id", courseId)
      .order("id")
      .range(from, to),
  );
  return data
    .flatMap((row) =>
      row.students
        ? [
            {
              enrollmentId: row.id,
              enrolledOn: row.enrolled_on,
              student: row.students,
            },
          ]
        : [],
    )
    .sort((a, b) =>
      displayName(a.student).localeCompare(displayName(b.student)),
    );
}

export async function getStudentEnrollments(
  schoolId: string,
  studentId: string,
) {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("enrollments")
    .select(
      "id, courses(id, name, code, subject, color, academic_terms(name), course_teachers(teachers(id, title, first_name, last_name)))",
    )
    .eq("school_id", schoolId)
    .eq("student_id", studentId);
  if (error) throw error;
  return data.flatMap((row) =>
    row.courses
      ? [
          {
            enrollmentId: row.id,
            course: {
              id: row.courses.id,
              name: row.courses.name,
              code: row.courses.code,
              subject: row.courses.subject,
              color: row.courses.color,
              termName: row.courses.academic_terms?.name ?? null,
              teachers: row.courses.course_teachers.flatMap((ct) =>
                ct.teachers ? [displayName(ct.teachers)] : [],
              ),
            },
          },
        ]
      : [],
  );
}

export async function searchCourses(schoolId: string, q: string) {
  const supabase = await createServerSupabase();
  let query = supabase
    .from("courses")
    .select("id, name, code, academic_terms(name)")
    .eq("school_id", schoolId);
  const pattern = toIlikePattern(q);
  if (pattern) query = query.or(`name.ilike.${pattern},code.ilike.${pattern}`);
  const { data, error } = await query.order("name").limit(20);
  if (error) throw error;
  return data.map((c) => ({
    id: c.id,
    label: c.code ? `${c.name} (${c.code})` : c.name,
    description: c.academic_terms?.name ?? null,
  }));
}

/** Compact list of all courses for dropdowns. */
export async function listCourseOptions(schoolId: string) {
  const supabase = await createServerSupabase();
  const data = await selectAll((from, to) =>
    supabase
      .from("courses")
      .select("id, name, code")
      .eq("school_id", schoolId)
      .order("name")
      .order("id")
      .range(from, to),
  );
  return data.map((c) => ({
    id: c.id,
    name: c.code ? `${c.name} (${c.code})` : c.name,
  }));
}
