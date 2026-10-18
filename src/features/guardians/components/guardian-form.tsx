"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { TextField } from "@/components/forms/fields";
import { useSubmitAction } from "@/components/forms/use-submit-action";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { FieldGroup } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import type { ActionResult } from "@/lib/errors";
import type { Tables } from "@/lib/supabase/types";
import { CustomFieldsSection } from "../../custom-fields/components/custom-fields-section";
import { toCustomFieldFormValues, type CustomFieldDefinition } from "../../custom-fields/values";
import { schoolPath } from "../../school-panel/paths";
import { createGuardian, updateGuardian } from "../actions";
import { guardianSchema, type GuardianInput, type GuardianOutput } from "../schema";

export function GuardianForm({
  schoolId,
  slug,
  definitions,
  guardian,
}: {
  schoolId: string;
  slug: string;
  definitions: CustomFieldDefinition[];
  guardian?: Tables<"guardians">;
}) {
  const t = useTranslations("guardians");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const form = useForm<GuardianInput, unknown, GuardianOutput>({
    resolver: zodResolver(guardianSchema),
    defaultValues: {
      first_name: guardian?.first_name ?? "",
      last_name: guardian?.last_name ?? "",
      email: guardian?.email ?? "",
      phone: guardian?.phone ?? "",
      address: guardian?.address ?? "",
      custom_fields: toCustomFieldFormValues(definitions, guardian?.custom_fields),
    },
  });

  const save = async (values: GuardianOutput): Promise<ActionResult<{ id: string }>> => {
    if (!guardian) return createGuardian(schoolId, values);
    const result = await updateGuardian(schoolId, guardian.id, values);
    return result.ok ? { ok: true, data: { id: guardian.id } } : result;
  };
  const onSubmit = useSubmitAction(form, save, {
    resetOnSuccess: Boolean(guardian),
    successMessage: guardian ? undefined : t("created"),
    onSuccess: ({ id }) => {
      if (!guardian) router.push(schoolPath(slug, "guardians", id));
    },
  });

  return (
    <form onSubmit={onSubmit} noValidate>
      <Card>
        <CardContent>
          <FieldGroup>
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField control={form.control} name="first_name" label={t("firstName")} autoComplete="off" />
              <TextField control={form.control} name="last_name" label={t("lastName")} autoComplete="off" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField
                control={form.control}
                name="email"
                label={t("email")}
                type="email"
                description={t("emailLinkHint")}
              />
              <TextField control={form.control} name="phone" label={t("phone")} type="tel" />
            </div>
            <TextField control={form.control} name="address" label={t("address")} />
            <CustomFieldsSection control={form.control} definitions={definitions} />
          </FieldGroup>
        </CardContent>
        <CardFooter className="justify-end">
          <Button type="submit" disabled={form.formState.isSubmitting || (Boolean(guardian) && !form.formState.isDirty)}>
            {form.formState.isSubmitting ? <Spinner /> : null}
            {guardian ? tCommon("save") : t("create")}
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
