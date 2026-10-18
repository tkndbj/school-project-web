import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/page-header";
import { getCustomFieldDefinitions } from "@/features/custom-fields/queries";
import { TeacherForm } from "@/features/teachers/components/teacher-form";
import { requireModule } from "@/server/auth";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("teachers");
  return { title: t("add") };
}

export default async function NewTeacherPage({ params }: PageProps<"/school/[slug]/teachers/new">) {
  const { slug } = await params;
  const { school } = await requireModule(slug, "teachers");
  const t = await getTranslations("teachers");
  const definitions = await getCustomFieldDefinitions(school.id, "teacher");
  return (
    <>
      <PageHeader title={t("add")} description={t("addDescription")} />
      <TeacherForm schoolId={school.id} slug={slug} definitions={definitions} />
    </>
  );
}
