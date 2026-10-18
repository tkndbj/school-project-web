import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/page-header";
import { PhotoUpload } from "@/components/photo-upload";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { listTerms } from "@/features/courses/queries";
import { MembersCard } from "@/features/platform/components/members-card";
import { getSchoolMembers } from "@/features/platform/queries";
import { setSchoolLogo } from "@/features/schools/actions";
import { AdministrationPanels } from "@/features/schools/components/administration-panels";
import { SettingsForm } from "@/features/schools/components/settings-form";
import { requireSchoolAdmin } from "@/server/auth";
import { selectAll } from "@/server/select-all";
import { signMediaUrl } from "@/server/storage";
import { createServerSupabase } from "@/server/supabase";

export default async function SettingsPage({
  params,
}: PageProps<"/school/[slug]/settings">) {
  const { slug } = await params;
  const { school } = await requireSchoolAdmin(slug);
  const t = await getTranslations("settings");
  const supabase = await createServerSupabase();
  const [members, terms, definitions, logo] = await Promise.all([
    getSchoolMembers(school.id),
    listTerms(school.id),
    selectAll((from, to) =>
      supabase
        .from("custom_field_definitions")
        .select("*")
        .eq("school_id", school.id)
        .order("entity")
        .order("sort_order")
        .order("id")
        .range(from, to),
    ),
    signMediaUrl(school.logo_path),
  ]);
  return (
    <>
      <PageHeader title={t("title")} description={t("description")} />
      <SettingsForm school={school} />
      <Card>
        <CardHeader>
          <CardTitle>{t("logo")}</CardTitle>
        </CardHeader>
        <CardContent>
          <PhotoUpload
            name={school.name}
            currentUrl={logo}
            folder={`${school.id}/branding`}
            onUploaded={setSchoolLogo.bind(null, school.id)}
          />
        </CardContent>
      </Card>
      <MembersCard schoolId={school.id} members={members} schoolAdmin />
      <AdministrationPanels
        schoolId={school.id}
        terms={terms}
        definitions={definitions}
      />
    </>
  );
}
