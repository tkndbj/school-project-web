import { GraduationCapIcon } from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { LocaleSwitcher } from "@/features/account/components/locale-switcher";

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const t = await getTranslations("meta");
  return (
    <div className="flex min-h-svh flex-col bg-muted/40">
      <header className="flex items-center justify-between p-4">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <GraduationCapIcon className="size-5 text-primary" aria-hidden />
          {t("appName")}
        </Link>
        <LocaleSwitcher />
      </header>
      <main className="flex flex-1 items-center justify-center p-4">
        <div className="w-full max-w-sm">{children}</div>
      </main>
    </div>
  );
}
