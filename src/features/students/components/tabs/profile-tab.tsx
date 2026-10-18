import { getTranslations } from "next-intl/server";
import { DeleteEntityButton } from "@/components/delete-entity-button";
import { PhotoUpload } from "@/components/photo-upload";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { displayName } from "@/lib/people";
import type { Tables } from "@/lib/supabase/types";
import { getCustomFieldDefinitions } from "../../../custom-fields/queries";
import { schoolPath } from "../../../school-panel/paths";
import { deleteStudent, setStudentPhoto } from "../../actions";
import { StudentForm } from "../student-form";

export async function StudentProfileTab({
  school,
  slug,
  student,
  photoUrl,
}: {
  school: Tables<"schools">;
  slug: string;
  student: Tables<"students">;
  photoUrl: string | null;
}) {
  const t = await getTranslations("students");
  const definitions = await getCustomFieldDefinitions(school.id, "student");
  const name = displayName(student);

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle>{t("photo")}</CardTitle>
        </CardHeader>
        <CardContent>
          <PhotoUpload
            name={name}
            currentUrl={photoUrl}
            folder={`${school.id}/students/${student.id}`}
            onUploaded={setStudentPhoto.bind(null, school.id, student.id)}
          />
        </CardContent>
      </Card>
      <StudentForm schoolId={school.id} slug={slug} definitions={definitions} student={student} />
      <div className="flex justify-end">
        <DeleteEntityButton
          onDelete={deleteStudent.bind(null, school.id, student.id)}
          redirectTo={schoolPath(slug, "students")}
          label={t("delete")}
          title={t("deleteTitle", { name })}
          description={t("deleteDescription")}
          successMessage={t("deleted")}
        />
      </div>
    </div>
  );
}
