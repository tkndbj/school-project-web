import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { SetPasswordForm } from "@/features/auth/components/set-password-form";
import { requirePasswordChangeSession } from "@/server/password-session";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth");
  return { title: t("setPassword") };
}

export default async function SetPasswordPage() {
  const { user } = await requirePasswordChangeSession();
  return <SetPasswordForm email={user.email} />;
}
