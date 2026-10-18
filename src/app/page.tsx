import { CalendarCheckIcon, GraduationCapIcon, ShieldCheckIcon, SmartphoneIcon } from "lucide-react";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ButtonLink } from "@/components/button-link";
import { LocaleSwitcher } from "@/features/account/components/locale-switcher";
import { getCurrentUser, getHomePath } from "@/server/auth";

export default async function LandingPage() {
  if (await getCurrentUser()) redirect(await getHomePath());

  const t = await getTranslations("landing");
  const tMeta = await getTranslations("meta");
  const features = [
    { icon: GraduationCapIcon, title: t("featureSchoolsTitle"), body: t("featureSchoolsBody") },
    { icon: CalendarCheckIcon, title: t("featureParentsTitle"), body: t("featureParentsBody") },
    { icon: SmartphoneIcon, title: t("featureMobileTitle"), body: t("featureMobileBody") },
    { icon: ShieldCheckIcon, title: t("featurePrivacyTitle"), body: t("featurePrivacyBody") },
  ];

  return (
    <div className="flex min-h-svh flex-col">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between p-4">
        <span className="flex items-center gap-2 font-semibold">
          <GraduationCapIcon className="size-5 text-primary" aria-hidden />
          {tMeta("appName")}
        </span>
        <div className="flex items-center gap-2">
          <LocaleSwitcher />
          <ButtonLink href="/login" variant="outline">
            {t("signIn")}
          </ButtonLink>
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-16 px-4 py-16">
        <section className="mx-auto max-w-2xl space-y-6 text-center">
          <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl">{t("headline")}</h1>
          <p className="text-lg text-muted-foreground text-balance">{t("subheadline")}</p>
          <ButtonLink href="/login" size="lg">
            {t("getStarted")}
          </ButtonLink>
        </section>
        <section className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {features.map(({ icon: Icon, title, body }) => (
            <div key={title} className="space-y-2 rounded-xl border p-5">
              <Icon className="size-5 text-primary" aria-hidden />
              <h2 className="font-medium">{title}</h2>
              <p className="text-sm text-muted-foreground">{body}</p>
            </div>
          ))}
        </section>
      </main>
      <footer className="border-t py-6 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} {tMeta("appName")}
      </footer>
    </div>
  );
}
