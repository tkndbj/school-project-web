import type { Tables } from "@/lib/supabase/types";
import { StudentCoursesPanel } from "../../../courses/components/student-courses-panel";
import { getStudentEnrollments } from "../../../courses/queries";

export async function StudentCoursesTab({
  school,
  slug,
  studentId,
}: {
  school: Tables<"schools">;
  slug: string;
  studentId: string;
}) {
  const enrollments = await getStudentEnrollments(school.id, studentId);
  return <StudentCoursesPanel schoolId={school.id} slug={slug} studentId={studentId} enrollments={enrollments} />;
}
