import { getTranslations } from "next-intl/server";
import { ButtonLink } from "@/components/button-link";

export default async function NotFoundPage() {
  const t = await getTranslations("errors");
  return (
    <main className="mx-auto flex min-h-[50dvh] max-w-lg flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-2xl font-semibold">{t("pageNotFound")}</h1>
      <p className="text-muted-foreground">{t("pageNotFoundDescription")}</p>
      <ButtonLink href="/">{t("goHome")}</ButtonLink>
    </main>
  );
}
