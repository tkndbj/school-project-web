"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import { ColorField, SelectField, TextField } from "@/components/forms/fields";
import { useSubmitAction } from "@/components/forms/use-submit-action";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { FieldGroup } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import type { Tables } from "@/lib/supabase/types";
import { platformUpdateSchoolSchema } from "../../schools/schema";
import { ModulesField, SchoolDetailsFields } from "../../schools/components/school-fields";
import { updateSchool } from "../actions";

type Input = z.input<typeof platformUpdateSchoolSchema>;
type Output = z.output<typeof platformUpdateSchoolSchema>;

export function PlatformSchoolForm({ school }: { school: Tables<"schools"> }) {
  const t = useTranslations("platform");
  const tSchools = useTranslations("schools");
  const form = useForm<Input, unknown, Output>({
    resolver: zodResolver(platformUpdateSchoolSchema),
    defaultValues: {
      name: school.name,
      slug: school.slug,
      status: school.status,
      timezone: school.timezone,
      default_locale: school.default_locale as Input["default_locale"],
      contact_email: school.contact_email ?? "",
      contact_phone: school.contact_phone ?? "",
      address: school.address ?? "",
      website: school.website ?? "",
      primary_color: school.primary_color ?? "",
      enabled_modules: school.enabled_modules,
    },
  });
  const onSubmit = useSubmitAction(form, (values) => updateSchool(school.id, values), { resetOnSuccess: true });

  return (
    <form onSubmit={onSubmit} noValidate>
      <Card>
        <CardHeader>
          <CardTitle>{t("schoolDetails")}</CardTitle>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <SchoolDetailsFields control={form.control} />
            <div className="grid gap-4 sm:grid-cols-3">
              <TextField
                control={form.control}
                name="slug"
                label={tSchools("slug")}
                description={tSchools("slugChangeWarning")}
              />
              <SelectField
                control={form.control}
                name="status"
                label={t("status")}
                options={[
                  { value: "active", label: t("statuses.active") },
                  { value: "suspended", label: t("statuses.suspended") },
                ]}
              />
              <ColorField
                control={form.control}
                name="primary_color"
                label={tSchools("primaryColor")}
                clearLabel={tSchools("useDefaultColor")}
              />
            </div>
            <ModulesField control={form.control} />
          </FieldGroup>
        </CardContent>
        <CardFooter className="justify-end">
          <Button type="submit" disabled={form.formState.isSubmitting || !form.formState.isDirty}>
            {form.formState.isSubmitting ? <Spinner /> : null}
            {tSchools("saveChanges")}
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
