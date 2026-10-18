import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/page-header";
import { getCustomFieldDefinitions } from "@/features/custom-fields/queries";
import { GuardianForm } from "@/features/guardians/components/guardian-form";
import { requireSchool } from "@/server/auth";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("guardians");
  return { title: t("add") };
}

export default async function NewGuardianPage({ params }: PageProps<"/school/[slug]/guardians/new">) {
  const { slug } = await params;
  const { school } = await requireSchool(slug);
  const t = await getTranslations("guardians");
  const definitions = await getCustomFieldDefinitions(school.id, "guardian");
  return (
    <>
      <PageHeader title={t("add")} description={t("addDescription")} />
      <GuardianForm schoolId={school.id} slug={slug} definitions={definitions} />
    </>
  );
}
