import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { SetPasswordForm } from "@/features/auth/components/set-password-form";
import { requireUser } from "@/server/auth";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth");
  return { title: t("setPassword") };
}

export default async function SetPasswordPage() {
  const user = await requireUser("/auth/set-password");
  return <SetPasswordForm email={user.email} />;
}
