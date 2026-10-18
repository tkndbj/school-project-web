"use client";

import { useTranslations } from "next-intl";
import type { FieldPath, FieldValues, UseFormReturn } from "react-hook-form";
import { toast } from "sonner";
import type { ActionResult } from "@/lib/errors";
import { useErrorMessage } from "./use-error-message";

/**
 * Wires a react-hook-form instance to a server action: validates on the client,
 * submits, maps server-side field errors back onto the form and toasts the
 * outcome. Returns a submit handler for <form onSubmit>.
 */
export function useSubmitAction<TInput extends FieldValues, TOutput, TResult>(
  form: UseFormReturn<TInput, unknown, TOutput>,
  action: (values: TOutput) => Promise<ActionResult<TResult>>,
  options: {
    successMessage?: string | false;
    onSuccess?: (data: TResult) => void;
    /** Treat the submitted values as the new baseline (clears the dirty state). */
    resetOnSuccess?: boolean;
  } = {},
) {
  const tCommon = useTranslations("common");
  const errorMessage = useErrorMessage();

  return form.handleSubmit(async (values) => {
    let result: ActionResult<TResult>;
    try {
      result = await action(values);
    } catch {
      // Preserve input on transport failures so the user can retry safely.
      toast.error(errorMessage({ key: "network" }));
      return;
    }
    if (!result.ok) {
      for (const [field, messages] of Object.entries(
        result.fieldErrors ?? {},
      )) {
        form.setError(field as FieldPath<TInput>, { message: messages[0] });
      }
      toast.error(errorMessage(result.error));
      return;
    }
    if (options.resetOnSuccess) form.reset(form.getValues());
    if (options.successMessage !== false)
      toast.success(options.successMessage ?? tCommon("saved"));
    options.onSuccess?.(result.data);
  });
}
