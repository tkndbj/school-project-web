"use client";

import { useTranslations } from "next-intl";
import { useCallback } from "react";
import type { AppError } from "@/lib/errors";

/** Translates an AppError returned by a server action into a user-facing message. */
export function useErrorMessage() {
  const t = useTranslations("errors");
  return useCallback(
    (error: AppError) => {
      if (error.key === "customField" || error.key === "importFormat") {
        return t(error.key, { detail: error.detail ?? "" });
      }
      return t(error.key);
    },
    [t],
  );
}
