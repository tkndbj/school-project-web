import { GraduationCapIcon } from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { countAreas } from "@/components/app-shell/app-shell";
import { UserMenu } from "@/components/app-shell/user-menu";
import { LocaleSwitcher } from "@/features/account/components/locale-switcher";
import { getAccountContext, requireUser } from "@/server/auth";
import { createServerSupabase } from "@/server/supabase";

// Signed-in pages that do not belong to one specific area (area chooser, account).
export default async function StandaloneLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const t = await getTranslations("meta");
  const supabase = await createServerSupabase();
  const [context, { data: profile }] = await Promise.all([
    getAccountContext(),
    supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle(),
  ]);

  return (
    <div className="flex min-h-svh flex-col">
      <header className="border-b">
        <div className="mx-auto flex h-14 w-full max-w-4xl items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <GraduationCapIcon className="size-5 text-primary" aria-hidden />
            {t("appName")}
          </Link>
          <div className="flex items-center gap-1">
            <LocaleSwitcher />
            <UserMenu name={profile?.full_name ?? null} email={user.email} canSwitchArea={countAreas(context) > 1} />
          </div>
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 p-4 md:p-6">{children}</main>
    </div>
  );
}
