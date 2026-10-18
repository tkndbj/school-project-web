import { ArrowLeftIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { ButtonLink } from "@/components/button-link";
import { DeleteEntityButton } from "@/components/delete-entity-button";
import { PageHeader } from "@/components/page-header";
import { PhotoUpload } from "@/components/photo-upload";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCustomFieldDefinitions } from "@/features/custom-fields/queries";
import { schoolPath } from "@/features/school-panel/paths";
import { deleteTeacher, setTeacherPhoto } from "@/features/teachers/actions";
import { TeacherForm } from "@/features/teachers/components/teacher-form";
import { getTeacher, getTeacherCourses } from "@/features/teachers/queries";
import { ageFromBirthDate, displayName } from "@/lib/people";
import { hasModule, requireModule } from "@/server/auth";
import { signMediaUrl } from "@/server/storage";

export async function generateMetadata({ params }: PageProps<"/school/[slug]/teachers/[teacherId]">): Promise<Metadata> {
  const { slug, teacherId } = await params;
  const { school } = await requireModule(slug, "teachers");
  return { title: displayName(await getTeacher(school.id, teacherId)) };
}

export default async function TeacherPage({ params }: PageProps<"/school/[slug]/teachers/[teacherId]">) {
  const { slug, teacherId } = await params;
  const { school } = await requireModule(slug, "teachers");
  const t = await getTranslations("teachers");
  const [teacher, definitions, courses] = await Promise.all([
    getTeacher(school.id, teacherId),
    getCustomFieldDefinitions(school.id, "teacher"),
    hasModule(school, "courses") ? getTeacherCourses(school.id, teacherId) : Promise.resolve([]),
  ]);
  const photoUrl = await signMediaUrl(teacher.photo_path);
  const name = displayName(teacher);
  const age = ageFromBirthDate(teacher.date_of_birth);

  return (
    <>
      <ButtonLink href={schoolPath(slug, "teachers")} variant="ghost" size="sm" className="-ml-2 w-fit">
        <ArrowLeftIcon />
        {t("title")}
      </ButtonLink>
      <PageHeader
        title={name}
        description={[teacher.subject, age !== null ? t("age", { age }) : null].filter(Boolean).join(" · ")}
      />
      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>{t("photo")}</CardTitle>
            </CardHeader>
            <CardContent>
              <PhotoUpload
                name={name}
                currentUrl={photoUrl}
                folder={`${school.id}/teachers/${teacher.id}`}
                onUploaded={setTeacherPhoto.bind(null, school.id, teacher.id)}
              />
            </CardContent>
          </Card>
          <TeacherForm schoolId={school.id} slug={slug} definitions={definitions} teacher={teacher} />
        </div>
        {hasModule(school, "courses") ? (
          <Card className="h-fit">
            <CardHeader>
              <CardTitle>{t("courses")}</CardTitle>
            </CardHeader>
            <CardContent>
              {courses.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("noCourses")}</p>
              ) : (
                <ul className="space-y-2 text-sm">
                  {courses.map((course) => (
                    <li key={course.id}>
                      <Link href={schoolPath(slug, "courses", course.id)} className="font-medium hover:underline">
                        {course.name}
                      </Link>
                      {course.academic_terms?.name ? (
                        <span className="text-muted-foreground"> · {course.academic_terms.name}</span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        ) : null}
      </div>
      <div className="flex justify-end">
        <DeleteEntityButton
          onDelete={deleteTeacher.bind(null, school.id, teacher.id)}
          redirectTo={schoolPath(slug, "teachers")}
          label={t("delete")}
          title={t("deleteTitle", { name })}
          description={t("deleteDescription")}
          successMessage={t("deleted")}
        />
      </div>
    </>
  );
}
