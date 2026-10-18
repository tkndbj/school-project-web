"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import type { z } from "zod";
import { TextField } from "@/components/forms/fields";
import { useSubmitAction } from "@/components/forms/use-submit-action";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FieldGroup } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { slugify } from "@/lib/validation";
import { createSchoolSchema, SCHOOL_MODULES } from "../../schools/schema";
import {
  ModulesField,
  SchoolDetailsFields,
} from "../../schools/components/school-fields";
import { createSchool } from "../actions";

type Input = z.input<typeof createSchoolSchema>;
type Output = z.output<typeof createSchoolSchema>;

export function CreateSchoolForm() {
  const t = useTranslations("platform");
  const tSchools = useTranslations("schools");
  const locale = useLocale();
  const router = useRouter();
  const form = useForm<Input, unknown, Output>({
    resolver: zodResolver(createSchoolSchema),
    defaultValues: {
      name: "",
      slug: "",
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
      default_locale: locale,
      contact_email: "",
      contact_phone: "",
      address: "",
      website: "",
      enabled_modules: [...SCHOOL_MODULES],
      first_admin_email: "",
    },
  });

  const onSubmit = useSubmitAction(form, createSchool, {
    successMessage: t("schoolCreated"),
    onSuccess: ({ id, adminInvitationFailed }) => {
      if (adminInvitationFailed) toast.warning(t("adminInvitationFailed"));
      router.push(`/admin/schools/${id}` as Route);
    },
  });

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle>{t("schoolDetails")}</CardTitle>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <SchoolDetailsFields control={form.control} />
            <TextField
              control={form.control}
              name="slug"
              label={tSchools("slug")}
              description={tSchools("slugDescription")}
              // Suggest a slug from the name the first time the field is focused.
              onFocus={() => {
                if (!form.getValues("slug"))
                  form.setValue("slug", slugify(form.getValues("name")));
              }}
            />
          </FieldGroup>
        </CardContent>
      </Card>
      <Card>
        <CardContent>
          <ModulesField control={form.control} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>{t("firstAdmin")}</CardTitle>
          <CardDescription>{t("firstAdminDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <TextField
            control={form.control}
            name="first_admin_email"
            label={t("adminEmail")}
            type="email"
          />
        </CardContent>
        <CardFooter className="justify-end">
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? <Spinner /> : null}
            {t("createSchool")}
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
