"use client";

import { CheckIcon, SearchIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import type { ActionResult } from "@/lib/errors";
import { cn } from "@/lib/utils";

export type PickerItem = { id: string; label: string; description?: string | null };

/**
 * Debounced search box with a selectable result list. `search` is usually a
 * server action; results already in `excludeIds` are shown as selected.
 */
export function AsyncSearchPicker({
  search,
  onSelect,
  excludeIds = [],
  placeholder,
  autoFocus,
}: {
  search: (q: string) => Promise<ActionResult<PickerItem[]>>;
  onSelect: (item: PickerItem) => void;
  excludeIds?: string[];
  placeholder: string;
  autoFocus?: boolean;
}) {
  const t = useTranslations("common");
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<PickerItem[]>([]);
  const [loading, setLoading] = useState(false);
  const request = useRef(0);
  const runSearch = useEffectEvent((q: string) => search(q));

  useEffect(() => {
    const id = ++request.current;
    const timer = setTimeout(async () => {
      setLoading(true);
      const result = await runSearch(query);
      if (id !== request.current) return; // a newer search superseded this one
      setLoading(false);
      setItems(result.ok ? result.data : []);
    }, 250);
    return () => clearTimeout(timer);
  }, [query]);

  const excluded = new Set(excludeIds);

  return (
    <div className="flex flex-col gap-2">
      <div className="relative">
        <SearchIcon aria-hidden className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          aria-label={placeholder}
          autoFocus={autoFocus}
          className="pl-8"
        />
        {loading ? <Spinner className="absolute top-1/2 right-2.5 -translate-y-1/2" /> : null}
      </div>
      <ul className="max-h-64 overflow-y-auto rounded-lg border" role="listbox" aria-label={placeholder}>
        {items.length === 0 && !loading ? (
          <li className="p-3 text-center text-sm text-muted-foreground">{t("noMatches")}</li>
        ) : null}
        {items.map((item) => {
          const isExcluded = excluded.has(item.id);
          return (
            <li key={item.id} role="option" aria-selected={isExcluded}>
              <button
                type="button"
                disabled={isExcluded}
                onClick={() => onSelect(item)}
                className={cn(
                  "flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-muted focus-visible:bg-muted focus-visible:outline-none disabled:cursor-default disabled:opacity-60",
                )}
              >
                <span className="min-w-0">
                  <span className="block truncate font-medium">{item.label}</span>
                  {item.description ? (
                    <span className="block truncate text-xs text-muted-foreground">{item.description}</span>
                  ) : null}
                </span>
                {isExcluded ? <CheckIcon className="size-4 text-primary" aria-hidden /> : null}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
