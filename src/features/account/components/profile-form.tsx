"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { useErrorMessage } from "@/components/forms/use-error-message";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { updateProfile } from "../actions";

export function ProfileForm({ fullName }: { fullName: string }) {
  const t = useTranslations("account");
  const tCommon = useTranslations("common");
  const errorMessage = useErrorMessage();
  const router = useRouter();
  const [value, setValue] = useState(fullName);
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="flex flex-col gap-4 sm:flex-row sm:items-end"
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(async () => {
          const result = await updateProfile({ full_name: value });
          if (!result.ok) toast.error(errorMessage(result.error));
          else {
            toast.success(tCommon("saved"));
            router.refresh();
          }
        });
      }}
    >
      <Field className="sm:max-w-sm">
        <FieldLabel htmlFor="full_name">{t("fullName")}</FieldLabel>
        <Input id="full_name" autoComplete="name" maxLength={200} value={value} onChange={(e) => setValue(e.target.value)} />
      </Field>
      <Button type="submit" disabled={pending || value === fullName}>
        {pending ? <Spinner /> : null}
        {tCommon("save")}
      </Button>
    </form>
  );
}
