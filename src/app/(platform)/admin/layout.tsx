import { ShieldIcon } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { AppShell } from "@/components/app-shell/app-shell";
import { requirePlatformAdmin } from "@/server/auth";

export default async function PlatformLayout({ children }: { children: React.ReactNode }) {
  await requirePlatformAdmin();
  const t = await getTranslations("platform");

  return (
    <AppShell
      header={
        <div className="flex items-center gap-2 px-2 py-1.5 font-semibold">
          <ShieldIcon className="size-5 shrink-0 text-primary" aria-hidden />
          <span className="truncate group-data-[collapsible=icon]:hidden">{t("title")}</span>
        </div>
      }
      sections={[{ items: [{ href: "/admin", label: t("schools"), icon: "schools" }] }]}
    >
      {children}
    </AppShell>
  );
}
