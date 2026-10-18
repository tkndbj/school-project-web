"use client";

import { LanguagesIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { isLocale, locales } from "@/i18n/config";
import { setLocale } from "../actions";

export function LocaleSwitcher() {
  const t = useTranslations("account");
  const locale = useLocale();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="ghost" size="sm" disabled={pending} aria-label={t("language")}>
            <LanguagesIcon />
            {locale.toUpperCase()}
          </Button>
        }
      />
      <DropdownMenuContent align="end">
        <DropdownMenuRadioGroup
          value={locale}
          onValueChange={(value) => {
            if (!isLocale(value)) return;
            startTransition(async () => {
              await setLocale(value);
              router.refresh();
            });
          }}
        >
          {locales.map((l) => (
            <DropdownMenuRadioItem key={l} value={l}>
              {t(`languages.${l}`)}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
