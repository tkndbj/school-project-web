import { selectAll } from "@/server/select-all";
import "server-only";
import { notFound } from "next/navigation";
import { cache } from "react";
import { createServerSupabase } from "@/server/supabase";

export async function listCourseAssessments(
  schoolId: string,
  courseId: string,
) {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("assessments")
    .select(
      "id, title, kind, max_score, weight, assessed_on, published_at, grades(count)",
    )
    .eq("school_id", schoolId)
    .eq("course_id", courseId)
    .order("assessed_on", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data.map((a) => ({
    ...a,
    gradedCount: (a.grades as unknown as { count: number }[])[0]?.count ?? 0,
  }));
}

export const getAssessment = cache(
  async (schoolId: string, courseId: string, assessmentId: string) => {
    const supabase = await createServerSupabase();
    const { data } = await supabase
      .from("assessments")
      .select("*")
      .eq("school_id", schoolId)
      .eq("course_id", courseId)
      .eq("id", assessmentId)
      .maybeSingle();
    if (!data) notFound();
    return data;
  },
);

export async function getAssessmentGrades(
  schoolId: string,
  assessmentId: string,
) {
  const supabase = await createServerSupabase();
  const data = await selectAll((from, to) =>
    supabase
      .from("grades")
      .select("id, student_id, score, letter, comment")
      .eq("school_id", schoolId)
      .eq("assessment_id", assessmentId)
      .order("id")
      .range(from, to),
  );
  return data;
}

/** All grades of a student (staff view: includes unpublished assessments). */
export async function getStudentGrades(schoolId: string, studentId: string) {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("grades")
    .select(
      "id, score, letter, comment, assessments(id, title, kind, max_score, assessed_on, published_at, courses(id, name))",
    )
    .eq("school_id", schoolId)
    .eq("student_id", studentId);
  if (error) throw error;
  return data
    .flatMap((g) =>
      g.assessments ? [{ ...g, assessment: g.assessments }] : [],
    )
    .sort((a, b) =>
      (b.assessment.assessed_on ?? "").localeCompare(
        a.assessment.assessed_on ?? "",
      ),
    );
}
