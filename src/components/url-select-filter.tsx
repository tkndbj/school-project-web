"use client";

import type { Route } from "next";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { NativeSelect } from "@/components/native-select";

/** A filter dropdown bound to a URL search parameter (resets pagination). */
export function UrlSelectFilter({
  param,
  label,
  allLabel,
  options,
  className,
}: {
  param: string;
  label: string;
  allLabel: string;
  options: { value: string; label: string }[];
  className?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  return (
    <div className={className ?? "w-full sm:w-44"}>
      <NativeSelect
        aria-label={label}
        value={searchParams.get(param) ?? ""}
        disabled={pending}
        onChange={(e) => {
          const params = new URLSearchParams(searchParams);
          if (e.target.value) params.set(param, e.target.value);
          else params.delete(param);
          params.delete("page");
          const query = params.toString();
          startTransition(() => router.replace(`${pathname}${query ? `?${query}` : ""}` as Route));
        }}
      >
        <option value="">{allLabel}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </NativeSelect>
    </div>
  );
}
