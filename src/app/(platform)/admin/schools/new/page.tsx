import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/page-header";
import { CreateSchoolForm } from "@/features/platform/components/create-school-form";
import { requirePlatformAdmin } from "@/server/auth";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("platform");
  return { title: t("newSchool") };
}

export default async function NewSchoolPage() {
  await requirePlatformAdmin();
  const t = await getTranslations("platform");
  return (
    <>
      <PageHeader title={t("newSchool")} description={t("newSchoolDescription")} />
      <CreateSchoolForm />
    </>
  );
}
