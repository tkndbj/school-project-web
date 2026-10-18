import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DeleteAccountCard } from "@/features/account/components/delete-account-card";
import { ProfileForm } from "@/features/account/components/profile-form";
import { requireUser } from "@/server/auth";
import { createServerSupabase } from "@/server/supabase";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("account");
  return { title: t("title") };
}

export default async function AccountPage() {
  const user = await requireUser("/account");
  const t = await getTranslations("account");
  const supabase = await createServerSupabase();
  const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle();

  return (
    <>
      <PageHeader title={t("title")} description={user.email ?? undefined} />
      <Card>
        <CardHeader>
          <CardTitle>{t("profile")}</CardTitle>
          <CardDescription>{t("profileDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <ProfileForm fullName={profile?.full_name ?? ""} />
        </CardContent>
      </Card>
      <DeleteAccountCard />
    </>
  );
}
