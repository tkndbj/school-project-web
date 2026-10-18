import type { Tables } from "@/lib/supabase/types";
import { StudentGuardiansPanel } from "../../../guardians/components/student-guardians-panel";
import { getStudentGuardians } from "../../../guardians/queries";

export async function StudentGuardiansTab({
  school,
  slug,
  student,
}: {
  school: Tables<"schools">;
  slug: string;
  student: Tables<"students">;
}) {
  const links = await getStudentGuardians(school.id, student.id);
  return (
    <StudentGuardiansPanel
      schoolId={school.id}
      slug={slug}
      studentId={student.id}
      links={links.flatMap((link) =>
        link.guardians
          ? [
              {
                linkId: link.id,
                relationship: link.relationship,
                isPrimary: link.is_primary,
                guardian: link.guardians,
              },
            ]
          : [],
      )}
    />
  );
}
