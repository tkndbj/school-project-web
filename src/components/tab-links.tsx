import type { Route } from "next";
import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * Server-rendered tab navigation backed by the URL (?tab=...), so each tab is
 * deep-linkable and only its own data is loaded.
 */
export function TabLinks({ tabs, active }: { tabs: { id: string; label: string; href: string }[]; active: string }) {
  return (
    <nav className="-mx-1 overflow-x-auto border-b" aria-label="Tabs">
      <ul className="flex min-w-max gap-1 px-1">
        {tabs.map((tab) => (
          <li key={tab.id}>
            <Link
              href={tab.href as Route}
              aria-current={tab.id === active ? "page" : undefined}
              className={cn(
                "-mb-px inline-flex h-9 items-center border-b-2 px-3 text-sm font-medium transition-colors",
                tab.id === active
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {tab.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
