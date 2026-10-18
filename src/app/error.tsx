"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("errors");
  return (
    <main
      className="mx-auto flex min-h-[50dvh] max-w-lg flex-col items-center justify-center gap-4 p-6 text-center"
      role="alert"
    >
      <h1 className="text-2xl font-semibold">{t("unexpected")}</h1>
      <p className="text-muted-foreground">{t("unexpectedDescription")}</p>
      <Button onClick={reset}>{t("tryAgain")}</Button>
    </main>
  );
}
