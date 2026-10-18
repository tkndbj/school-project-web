"use client";

import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function PaginationControls({ page, pageSize, total }: { page: number; pageSize: number; total: number }) {
  const t = useTranslations("common");
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  const hrefFor = (target: number) => {
    const params = new URLSearchParams(searchParams);
    if (target <= 1) params.delete("page");
    else params.set("page", String(target));
    const query = params.toString();
    return `${pathname}${query ? `?${query}` : ""}` as Route;
  };

  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);

  return (
    <nav aria-label={t("pagination")} className="flex items-center justify-between gap-2 text-sm text-muted-foreground">
      <span>{t("showingRange", { from, to, total })}</span>
      <div className="flex items-center gap-1">
        <Link
          aria-disabled={page <= 1}
          tabIndex={page <= 1 ? -1 : undefined}
          className={cn(buttonVariants({ variant: "outline", size: "sm" }), page <= 1 && "pointer-events-none opacity-50")}
          href={hrefFor(page - 1)}
        >
          <ChevronLeftIcon />
          {t("previous")}
        </Link>
        <span className="px-2 tabular-nums">
          {page} / {pageCount}
        </span>
        <Link
          aria-disabled={page >= pageCount}
          tabIndex={page >= pageCount ? -1 : undefined}
          className={cn(buttonVariants({ variant: "outline", size: "sm" }), page >= pageCount && "pointer-events-none opacity-50")}
          href={hrefFor(page + 1)}
        >
          {t("next")}
          <ChevronRightIcon />
        </Link>
      </div>
    </nav>
  );
}
