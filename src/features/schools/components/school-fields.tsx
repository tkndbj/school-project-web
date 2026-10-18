"use client";

import { useTranslations } from "next-intl";
import { useMemo } from "react";
import { useController, type Control, type FieldValues, type Path } from "react-hook-form";
import { SelectField, TextField } from "@/components/forms/fields";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldDescription, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field";
import { locales } from "@/i18n/config";
import { SCHOOL_MODULES } from "../schema";

type SchoolDetailsValues = {
  name: string;
  timezone: string;
  default_locale: string;
  contact_email?: string | null;
  contact_phone?: string | null;
  address?: string | null;
  website?: string | null;
};

function useTimezoneOptions() {
  return useMemo(() => {
    const zones = typeof Intl.supportedValuesOf === "function" ? Intl.supportedValuesOf("timeZone") : ["UTC"];
    return (zones.includes("UTC") ? zones : ["UTC", ...zones]).map((z) => ({ value: z, label: z.replace(/_/g, " ") }));
  }, []);
}

/** Name, locale, time zone and contact details of a school. */
export function SchoolDetailsFields<T extends FieldValues & SchoolDetailsValues>({ control }: { control: Control<T> }) {
  const t = useTranslations("schools");
  const tAccount = useTranslations("account");
  const timezones = useTimezoneOptions();
  const name = (n: keyof SchoolDetailsValues) => n as Path<T>;

  return (
    <>
      <TextField control={control} name={name("name")} label={t("name")} maxLength={200} required />
      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField control={control} name={name("timezone")} label={t("timezone")} options={timezones} />
        <SelectField
          control={control}
          name={name("default_locale")}
          label={t("defaultLocale")}
          options={locales.map((l) => ({ value: l, label: tAccount(`languages.${l}`) }))}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField control={control} name={name("contact_email")} label={t("contactEmail")} type="email" />
        <TextField control={control} name={name("contact_phone")} label={t("contactPhone")} type="tel" />
      </div>
      <TextField control={control} name={name("address")} label={t("address")} />
      <TextField control={control} name={name("website")} label={t("website")} type="url" placeholder="https://" />
    </>
  );
}

/** Checkbox list for the optional feature modules of a school. */
export function ModulesField<T extends FieldValues & { enabled_modules: string[] }>({ control }: { control: Control<T> }) {
  const t = useTranslations("modules");
  const tSchools = useTranslations("schools");
  const { field } = useController({ control, name: "enabled_modules" as Path<T> });
  const selected = new Set<string>(field.value as string[]);

  return (
    <FieldSet>
      <FieldLegend>{tSchools("modules")}</FieldLegend>
      <FieldDescription>{tSchools("modulesDescription")}</FieldDescription>
      <div className="grid gap-3 sm:grid-cols-2">
        {SCHOOL_MODULES.map((module) => (
          <Field key={module} orientation="horizontal">
            <Checkbox
              id={`module-${module}`}
              checked={selected.has(module)}
              onCheckedChange={(checked) => {
                const next = new Set(selected);
                if (checked) next.add(module);
                else next.delete(module);
                field.onChange(SCHOOL_MODULES.filter((m) => next.has(m)));
              }}
            />
            <div className="flex flex-col gap-0.5">
              <FieldLabel htmlFor={`module-${module}`}>{t(`${module}.title`)}</FieldLabel>
              <FieldDescription>{t(`${module}.description`)}</FieldDescription>
            </div>
          </Field>
        ))}
      </div>
    </FieldSet>
  );
}
