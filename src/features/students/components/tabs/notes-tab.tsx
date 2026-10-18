import { hasModule } from "@/server/auth";
import { createServerSupabase } from "@/server/supabase";
import type { Tables } from "@/lib/supabase/types";
import { displayName } from "@/lib/people";
import { StudentNotesPanel } from "../../../notes/components/student-notes-panel";

export async function StudentNotesTab({ school, studentId }: { school: Tables<"schools">; studentId: string }) {
  const supabase = await createServerSupabase();
  const [{ data: notes, error }, { data: teachers }] = await Promise.all([
    supabase
      .from("student_notes")
      .select("id, title, body, category, visible_to_guardians, created_at, teachers(id, title, first_name, last_name)")
      .eq("school_id", school.id)
      .eq("student_id", studentId)
      .order("created_at", { ascending: false })
      .limit(200),
    hasModule(school, "teachers")
      ? supabase
          .from("teachers")
          .select("id, title, first_name, last_name, staff_number, email")
          .eq("school_id", school.id)
          .order("last_name")
          .limit(500)
      : Promise.resolve({ data: [] }),
  ]);
  if (error) throw error;

  return (
    <StudentNotesPanel
      schoolId={school.id}
      studentId={studentId}
      timezone={school.timezone}
      teachers={(teachers ?? []).map((teacher) => ({ id: teacher.id, name: displayName(teacher) }))}
      notes={notes.map((n) => ({
        id: n.id,
        title: n.title,
        body: n.body,
        category: n.category,
        visibleToGuardians: n.visible_to_guardians,
        createdAt: n.created_at,
        teacherName: n.teachers ? displayName(n.teachers) : null,
      }))}
    />
  );
}
