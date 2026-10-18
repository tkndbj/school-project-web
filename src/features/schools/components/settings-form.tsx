"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import { ColorField } from "@/components/forms/fields";
import { useSubmitAction } from "@/components/forms/use-submit-action";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { Tables } from "@/lib/supabase/types";
import { platformUpdateSchoolSchema } from "../schema";
import { updateSchoolSettings } from "../actions";
import { ModulesField, SchoolDetailsFields } from "./school-fields";

const schema = platformUpdateSchoolSchema.omit({ slug: true, status: true });
export function SettingsForm({ school }: { school: Tables<"schools"> }) {
  const t = useTranslations("schools"),
    common = useTranslations("common");
  const form = useForm<
    z.input<typeof schema>,
    unknown,
    z.output<typeof schema>
  >({
    resolver: zodResolver(schema),
    defaultValues: {
      ...school,
      default_locale: school.default_locale === "tr" ? "tr" : "en",
    },
  });
  const submit = useSubmitAction(
    form,
    updateSchoolSettings.bind(null, school.id),
    { resetOnSuccess: true },
  );
  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={submit} noValidate>
          <fieldset
            className="space-y-6"
            disabled={form.formState.isSubmitting}
          >
            <SchoolDetailsFields control={form.control} />
            <ColorField
              control={form.control}
              name="primary_color"
              label={t("primaryColor")}
              clearLabel={t("useDefaultColor")}
            />
            <ModulesField control={form.control} />
            <Button type="submit">
              {form.formState.isSubmitting ? common("loading") : common("save")}
            </Button>
          </fieldset>
        </form>
      </CardContent>
    </Card>
  );
}
