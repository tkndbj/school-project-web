import { ExternalLinkIcon } from "lucide-react";
import type { Metadata, Route } from "next";
import { getTranslations } from "next-intl/server";
import { ButtonLink } from "@/components/button-link";
import { PageHeader } from "@/components/page-header";
import { DeleteSchoolCard } from "@/features/platform/components/delete-school-card";
import { MembersCard } from "@/features/platform/components/members-card";
import { PlatformSchoolForm } from "@/features/platform/components/platform-school-form";
import { getPlatformSchool, getSchoolMembers } from "@/features/platform/queries";

export async function generateMetadata({ params }: PageProps<"/admin/schools/[schoolId]">): Promise<Metadata> {
  const school = await getPlatformSchool((await params).schoolId);
  return { title: school.name };
}

export default async function PlatformSchoolPage({ params }: PageProps<"/admin/schools/[schoolId]">) {
  const { schoolId } = await params;
  const t = await getTranslations("platform");
  const [school, members] = await Promise.all([getPlatformSchool(schoolId), getSchoolMembers(schoolId)]);

  return (
    <>
      <PageHeader
        title={school.name}
        description={school.slug}
        actions={
          <ButtonLink href={`/school/${school.slug}` as Route} variant="outline">
            <ExternalLinkIcon />
            {t("openSchoolPanel")}
          </ButtonLink>
        }
      />
      <PlatformSchoolForm school={school} />
      <MembersCard schoolId={school.id} members={members} />
      <DeleteSchoolCard schoolId={school.id} schoolName={school.name} />
    </>
  );
}
