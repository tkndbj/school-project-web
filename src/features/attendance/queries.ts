import "server-only";
import { displayName } from "@/lib/people";
import { selectAll } from "@/server/select-all";
import { createServerSupabase } from "@/server/supabase";

export async function getStudentAttendance(
  schoolId: string,
  studentId: string,
  sinceDate: string,
) {
  const supabase = await createServerSupabase();
  const data = await selectAll((from, to) =>
    supabase
      .from("attendance_records")
      .select(
        "id, attended_on, status, period, minutes_late, note, courses(name)",
      )
      .eq("school_id", schoolId)
      .eq("student_id", studentId)
      .gte("attended_on", sinceDate)
      .order("attended_on", { ascending: false })
      .order("id")
      .range(from, to),
  );
  return data;
}

export type RegisterFilters = {
  date: string;
  grade?: string;
  section?: string;
  courseId?: string;
  period?: string;
};

/**
 * Students on an attendance register (by course enrolment, or by grade/section
 * for daily attendance) together with the records already saved for that slot.
 */
export async function getRegister(schoolId: string, filters: RegisterFilters) {
  const supabase = await createServerSupabase();

  type RegisterStudent = {
    id: string;
    student_number: string | null;
    first_name: string | null;
    last_name: string | null;
    preferred_name: string | null;
  };
  let students: RegisterStudent[];
  if (filters.courseId) {
    const rows = await selectAll((from, to) =>
      supabase
        .from("enrollments")
        .select(
          "students!inner(id, student_number, first_name, last_name, preferred_name, status)",
        )
        .eq("school_id", schoolId)
        .eq("course_id", filters.courseId!)
        .eq("students.status", "active")
        .order("id")
        .range(from, to),
    );
    students = rows.flatMap((row) => (row.students ? [row.students] : []));
  } else {
    students = await selectAll((from, to) => {
      let query = supabase
        .from("students")
        .select("id, student_number, first_name, last_name, preferred_name")
        .eq("school_id", schoolId)
        .eq("status", "active");
      if (filters.grade) query = query.eq("grade_level", filters.grade);
      if (filters.section) query = query.eq("section", filters.section);
      return query.order("id").range(from, to);
    });
  }

  // Query builders are mutable: build a fresh one for every page.
  const savedRecords = () => {
    let query = supabase
      .from("attendance_records")
      .select("student_id, status, minutes_late, note")
      .eq("school_id", schoolId)
      .eq("attended_on", filters.date);
    query = filters.courseId
      ? query.eq("course_id", filters.courseId)
      : query.is("course_id", null);
    return filters.period
      ? query.eq("period", filters.period)
      : query.is("period", null);
  };
  const saved = await selectAll((from, to) =>
    savedRecords().order("id").range(from, to),
  );
  const byStudent = new Map(saved.map((r) => [r.student_id, r]));

  return students
    .map((s) => ({
      studentId: s.id,
      name: displayName(s),
      number: s.student_number,
      status: byStudent.get(s.id)?.status ?? null,
      minutesLate: byStudent.get(s.id)?.minutes_late ?? null,
      note: byStudent.get(s.id)?.note ?? null,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}
