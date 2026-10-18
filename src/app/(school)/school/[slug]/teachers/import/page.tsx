import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/page-header";
import { getCustomFieldDefinitions } from "@/features/custom-fields/queries";
import { ImportWizard } from "@/features/imports/components/import-wizard";
import { schoolPath } from "@/features/school-panel/paths";
import { requireModule } from "@/server/auth";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("imports");
  return { title: t("teachersTitle") };
}

export default async function ImportTeachersPage({ params }: PageProps<"/school/[slug]/teachers/import">) {
  const { slug } = await params;
  const { school } = await requireModule(slug, "teachers");
  const t = await getTranslations("imports");
  const definitions = await getCustomFieldDefinitions(school.id, "teacher");

  return (
    <>
      <PageHeader title={t("teachersTitle")} description={t("teachersDescription")} />
      <ImportWizard
        schoolId={school.id}
        kind="teachers"
        definitions={definitions}
        doneHref={schoolPath(slug, "teachers")}
      />
    </>
  );
}
