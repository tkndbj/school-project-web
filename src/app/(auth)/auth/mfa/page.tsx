import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { MfaForm } from "@/features/auth/components/mfa-form";
import { safeNextPath } from "@/lib/navigation";
import { firstParam } from "@/lib/pagination";
import { requireUser } from "@/server/auth";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth");
  return { title: t("mfaTitle") };
}

export default async function MfaPage({ searchParams }: PageProps<"/auth/mfa">) {
  const user = await requireUser("/auth/mfa");
  const next = safeNextPath(firstParam((await searchParams).next), "/");
  if (user.aal === "aal2") redirect(next);
  return <MfaForm next={next} />;
}
