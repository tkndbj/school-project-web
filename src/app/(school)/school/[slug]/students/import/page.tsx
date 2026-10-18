import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/page-header";
import { getCustomFieldDefinitions } from "@/features/custom-fields/queries";
import { ImportWizard } from "@/features/imports/components/import-wizard";
import { schoolPath } from "@/features/school-panel/paths";
import { requireSchool } from "@/server/auth";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("imports");
  return { title: t("studentsTitle") };
}

export default async function ImportStudentsPage({ params }: PageProps<"/school/[slug]/students/import">) {
  const { slug } = await params;
  const { school } = await requireSchool(slug);
  const t = await getTranslations("imports");
  const definitions = await getCustomFieldDefinitions(school.id, "student");

  return (
    <>
      <PageHeader title={t("studentsTitle")} description={t("studentsDescription")} />
      <ImportWizard
        schoolId={school.id}
        kind="students"
        definitions={definitions}
        doneHref={schoolPath(slug, "students")}
      />
    </>
  );
}
