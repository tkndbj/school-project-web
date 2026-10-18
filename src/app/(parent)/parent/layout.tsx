import { getTranslations } from "next-intl/server";
import { AppShell } from "@/components/app-shell/app-shell";
import { requireUser } from "@/server/auth";

export default async function ParentLayout({
  children,
}: LayoutProps<"/parent">) {
  await requireUser("/parent");
  const t = await getTranslations("parent");
  return (
    <AppShell
      header={<span className="px-2 font-semibold">{t("title")}</span>}
      sections={[
        {
          items: [
            {
              href: "/parent",
              label: t("title"),
              icon: "students",
              exact: true,
            },
          ],
        },
      ]}
    >
      {children}
    </AppShell>
  );
}
