import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { LoginForm } from "@/features/auth/components/login-form";
import { safeNextPath } from "@/lib/navigation";
import { firstParam } from "@/lib/pagination";
import { getCurrentUser } from "@/server/auth";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth");
  return { title: t("signIn") };
}

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const params = await searchParams;
  const next = safeNextPath(firstParam(params.next), "/");
  if (await getCurrentUser()) redirect(next);
  return <LoginForm next={next} callbackError={firstParam(params.error) === "callback"} />;
}
