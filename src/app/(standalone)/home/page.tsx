import { BuildingIcon, ChevronRightIcon, HeartHandshakeIcon, ShieldIcon } from "lucide-react";
import type { Metadata, Route } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { getAccountContext } from "@/server/auth";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("home");
  return { title: t("title") };
}

// Area chooser for users with more than one role (e.g. a teacher who is also a parent).
export default async function HomePage() {
  const t = await getTranslations("home");
  const tRoles = await getTranslations("roles");
  const context = await getAccountContext();

  const areas: { href: string; title: string; subtitle: string; icon: typeof BuildingIcon; badge?: string }[] = [];
  if (context.is_platform_admin) {
    areas.push({ href: "/admin", title: t("platformTitle"), subtitle: t("platformSubtitle"), icon: ShieldIcon });
  }
  for (const m of context.memberships) {
    areas.push({
      href: `/school/${m.slug}`,
      title: m.school_name,
      subtitle: t("schoolSubtitle"),
      icon: BuildingIcon,
      badge: tRoles(m.role),
    });
  }
  areas.push({
    href: "/parent",
    title: t("parentTitle"),
    subtitle: context.children_count > 0 ? t("parentSubtitle", { count: context.children_count }) : t("parentEmpty"),
    icon: HeartHandshakeIcon,
  });

  return (
    <>
      <PageHeader title={t("title")} description={t("description")} />
      <ul className="grid gap-3">
        {areas.map((area) => (
          <li key={area.href}>
            <Link
              href={area.href as Route}
              className="flex items-center gap-4 rounded-xl border p-4 transition-colors hover:bg-muted/50 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
            >
              <area.icon className="size-5 shrink-0 text-primary" aria-hidden />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 font-medium">
                  <span className="truncate">{area.title}</span>
                  {area.badge ? <Badge variant="secondary">{area.badge}</Badge> : null}
                </div>
                <p className="text-sm text-muted-foreground">{area.subtitle}</p>
              </div>
              <ChevronRightIcon className="size-4 text-muted-foreground" aria-hidden />
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
