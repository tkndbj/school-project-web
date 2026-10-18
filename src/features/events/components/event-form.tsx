"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useForm, useWatch } from "react-hook-form";
import {
  ColorField,
  SelectField,
  SwitchField,
  TextareaField,
  TextField,
} from "@/components/forms/fields";
import { useSubmitAction } from "@/components/forms/use-submit-action";
import { Button } from "@/components/ui/button";
import type { ActionResult } from "@/lib/errors";
import { eventSchema, type EventInput, type EventOutput } from "../schema";

export function EventForm({
  defaults,
  courses,
  action,
  onSaved,
}: {
  defaults: EventInput;
  courses: { id: string; name: string }[];
  action: (input: EventOutput) => Promise<ActionResult>;
  onSaved: () => void;
}) {
  const t = useTranslations("events");
  const common = useTranslations("common");
  const form = useForm<EventInput, unknown, EventOutput>({
    resolver: zodResolver(eventSchema),
    defaultValues: defaults,
  });
  const allDay = useWatch({ control: form.control, name: "all_day" });
  const submit = useSubmitAction(form, action, { onSuccess: onSaved });
  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <fieldset disabled={form.formState.isSubmitting} className="space-y-4">
        <TextField
          control={form.control}
          name="title"
          label={t("eventTitle")}
          maxLength={200}
          required
        />
        <TextareaField
          control={form.control}
          name="description"
          label={t("details")}
          maxLength={10000}
        />
        <TextField
          control={form.control}
          name="location"
          label={t("location")}
          maxLength={500}
        />
        <label className="flex items-center gap-2 text-sm font-medium">
          <input
            type="checkbox"
            checked={allDay}
            onChange={(event) => {
              const checked = event.target.checked;
              form.setValue("all_day", checked, { shouldDirty: true });
              for (const key of ["starts_at", "ends_at"] as const) {
                const value = form.getValues(key);
                if (value)
                  form.setValue(
                    key,
                    checked
                      ? value.slice(0, 10)
                      : `${value.slice(0, 10)}T09:00`,
                    { shouldDirty: true },
                  );
              }
            }}
          />
          {t("allDay")}
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            control={form.control}
            name="starts_at"
            label={t("startsAt")}
            type={allDay ? "date" : "datetime-local"}
          />
          <TextField
            control={form.control}
            name="ends_at"
            label={t("endsAt")}
            type={allDay ? "date" : "datetime-local"}
          />
        </div>
        {courses.length > 0 ? (
          <SelectField
            control={form.control}
            name="course_id"
            label={t("course")}
            placeholder={t("schoolWide")}
            options={courses.map((c) => ({ value: c.id, label: c.name }))}
          />
        ) : null}
        <ColorField
          control={form.control}
          name="color"
          label={t("color")}
          clearLabel={common("remove")}
        />
        <SwitchField
          control={form.control}
          name="visible_to_guardians"
          label={t("visibleToParents")}
        />
        <Button type="submit">
          {form.formState.isSubmitting ? common("loading") : common("save")}
        </Button>
      </fieldset>
    </form>
  );
}
