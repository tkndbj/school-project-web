import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/page-header";
import { CourseForm } from "@/features/courses/components/course-form";
import { listTerms } from "@/features/courses/queries";
import { getCustomFieldDefinitions } from "@/features/custom-fields/queries";
import { requireModule } from "@/server/auth";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("courses");
  return { title: t("add") };
}

export default async function NewCoursePage({ params }: PageProps<"/school/[slug]/courses/new">) {
  const { slug } = await params;
  const { school } = await requireModule(slug, "courses");
  const t = await getTranslations("courses");
  const [definitions, terms] = await Promise.all([getCustomFieldDefinitions(school.id, "course"), listTerms(school.id)]);
  return (
    <>
      <PageHeader title={t("add")} />
      <CourseForm schoolId={school.id} slug={slug} definitions={definitions} terms={terms} />
    </>
  );
}
