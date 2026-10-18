import { cookies } from "next/headers";
import type { CSSProperties, ReactNode } from "react";
import { Separator } from "@/components/ui/separator";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { LocaleSwitcher } from "@/features/account/components/locale-switcher";
import { getAccountContext, requireUser } from "@/server/auth";
import { createServerSupabase } from "@/server/supabase";
import { AppSidebar } from "./app-sidebar";
import type { NavSection } from "./nav-icons";
import { UserMenu } from "./user-menu";

/** Number of distinct areas (platform, each school, parent) the user can open. */
export function countAreas(context: Awaited<ReturnType<typeof getAccountContext>>) {
  return (context.is_platform_admin ? 1 : 0) + context.memberships.length + (context.children_count > 0 ? 1 : 0);
}

export async function AppShell({
  header,
  sections,
  children,
  style,
}: {
  header: ReactNode;
  sections: NavSection[];
  children: ReactNode;
  style?: CSSProperties;
}) {
  const user = await requireUser();
  const [context, cookieStore, supabase] = await Promise.all([getAccountContext(), cookies(), createServerSupabase()]);
  const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle();

  return (
    <SidebarProvider defaultOpen={cookieStore.get("sidebar_state")?.value !== "false"} style={style}>
      <AppSidebar header={header} sections={sections} />
      <SidebarInset>
        <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/80">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <div className="flex-1" />
          <LocaleSwitcher />
          <UserMenu name={profile?.full_name ?? null} email={user.email} canSwitchArea={countAreas(context) > 1} />
        </header>
        <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 p-4 md:p-6">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
