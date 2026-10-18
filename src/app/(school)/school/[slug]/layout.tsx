import { getTranslations } from "next-intl/server";
import { AppShell } from "@/components/app-shell/app-shell";
import type { NavItem, NavSection } from "@/components/app-shell/nav-icons";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { initials } from "@/lib/people";
import { schoolPath } from "@/features/school-panel/paths";
import { brandStyle } from "@/lib/color";
import type { SchoolModule } from "@/lib/supabase/types";
import { hasModule, requireSchool } from "@/server/auth";
import { signMediaUrl } from "@/server/storage";

export default async function SchoolLayout({ children, params }: LayoutProps<"/school/[slug]">) {
  const { slug } = await params;
  const { school, role, isPlatformAdmin } = await requireSchool(slug);
  const t = await getTranslations("schoolNav");
  const tRoles = await getTranslations("roles");
  const logoUrl = await signMediaUrl(school.logo_path);

  const moduleItem = (module: SchoolModule, item: NavItem) => (hasModule(school, module) ? [item] : []);
  const sections: NavSection[] = [
    {
      items: [
        { href: schoolPath(slug), label: t("dashboard"), icon: "dashboard", exact: true },
        { href: schoolPath(slug, "students"), label: t("students"), icon: "students" },
        { href: schoolPath(slug, "guardians"), label: t("guardians"), icon: "guardians" },
        ...moduleItem("teachers", { href: schoolPath(slug, "teachers"), label: t("teachers"), icon: "teachers" }),
        ...moduleItem("courses", { href: schoolPath(slug, "courses"), label: t("courses"), icon: "courses" }),
        ...moduleItem("attendance", { href: schoolPath(slug, "attendance"), label: t("attendance"), icon: "attendance" }),
        ...moduleItem("events", { href: schoolPath(slug, "events"), label: t("events"), icon: "events" }),
      ],
    },
    ...(role === "admin"
      ? [
          {
            label: t("administration"),
            items: [
              { href: schoolPath(slug, "settings"), label: t("settings"), icon: "settings" as const },
              { href: schoolPath(slug, "audit"), label: t("audit"), icon: "audit" as const },
            ],
          },
        ]
      : []),
  ];

  return (
    <AppShell
      style={brandStyle(school.primary_color)}
      sections={sections}
      header={
        <div className="flex items-center gap-2 px-1 py-1.5">
          <Avatar className="size-8 rounded-lg after:rounded-lg">
            {logoUrl ? <AvatarImage src={logoUrl} alt="" className="rounded-lg object-contain" /> : null}
            <AvatarFallback className="rounded-lg bg-primary text-primary-foreground">{initials(school.name)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 group-data-[collapsible=icon]:hidden">
            <div className="truncate text-sm font-semibold">{school.name}</div>
            <div className="truncate text-xs text-muted-foreground">
              {isPlatformAdmin ? tRoles("platform") : tRoles(role)}
            </div>
          </div>
        </div>
      }
    >
      {children}
    </AppShell>
  );
}
