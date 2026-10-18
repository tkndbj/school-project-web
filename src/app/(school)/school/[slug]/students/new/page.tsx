import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/page-header";
import { getCustomFieldDefinitions } from "@/features/custom-fields/queries";
import { StudentForm } from "@/features/students/components/student-form";
import { requireSchool } from "@/server/auth";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("students");
  return { title: t("add") };
}

export default async function NewStudentPage({ params }: PageProps<"/school/[slug]/students/new">) {
  const { slug } = await params;
  const { school } = await requireSchool(slug);
  const t = await getTranslations("students");
  const definitions = await getCustomFieldDefinitions(school.id, "student");

  return (
    <>
      <PageHeader title={t("add")} description={t("addDescription")} />
      <StudentForm schoolId={school.id} slug={slug} definitions={definitions} />
    </>
  );
}
