"use client";

import { EyeIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useController, type Control, type FieldValues, type Path } from "react-hook-form";
import { NativeSelect } from "@/components/native-select";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldDescription, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { CustomFieldDefinition } from "../values";

/**
 * Renders the school's custom fields for an entity. Values live under the
 * `custom_fields` key of the form as raw input state; convert them with
 * toCustomFieldPayload() before saving.
 */
export function CustomFieldsSection<T extends FieldValues>({
  control,
  definitions,
  title,
}: {
  control: Control<T>;
  definitions: CustomFieldDefinition[];
  title?: string;
}) {
  const t = useTranslations("customFields");
  if (definitions.length === 0) return null;

  return (
    <FieldSet>
      <FieldLegend>{title ?? t("sectionTitle")}</FieldLegend>
      <div className="grid gap-4 sm:grid-cols-2">
        {definitions.map((def) => (
          <CustomFieldInput key={def.id} control={control} definition={def} />
        ))}
      </div>
    </FieldSet>
  );
}

function CustomFieldInput<T extends FieldValues>({
  control,
  definition,
}: {
  control: Control<T>;
  definition: CustomFieldDefinition;
}) {
  const t = useTranslations("customFields");
  const tCommon = useTranslations("common");
  const { field } = useController({ control, name: `custom_fields.${definition.key}` as Path<T> });
  const id = `cf-${definition.key}`;
  const label = (
    <span className="inline-flex items-center gap-1.5">
      {definition.label}
      {definition.visible_to_guardians ? (
        <EyeIcon className="size-3.5 text-muted-foreground" aria-label={t("visibleToGuardians")} />
      ) : null}
    </span>
  );

  switch (definition.field_type) {
    case "boolean":
      return (
        <Field orientation="horizontal">
          <Checkbox id={id} checked={field.value === true} onCheckedChange={(c) => field.onChange(c === true)} />
          <FieldLabel htmlFor={id}>{label}</FieldLabel>
        </Field>
      );
    case "select":
      return (
        <Field>
          <FieldLabel htmlFor={id}>{label}</FieldLabel>
          <NativeSelect id={id} value={(field.value as string) ?? ""} onChange={(e) => field.onChange(e.target.value)}>
            <option value="">{tCommon("notSet")}</option>
            {definition.options.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </NativeSelect>
        </Field>
      );
    case "multi_select": {
      const selected = new Set((field.value as string[] | undefined) ?? []);
      return (
        <FieldSet className="sm:col-span-2">
          <FieldLegend variant="label">{label}</FieldLegend>
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            {definition.options.map((option) => (
              <Field key={option} orientation="horizontal" className="w-auto">
                <Checkbox
                  id={`${id}-${option}`}
                  checked={selected.has(option)}
                  onCheckedChange={(checked) => {
                    const next = new Set(selected);
                    if (checked) next.add(option);
                    else next.delete(option);
                    field.onChange(definition.options.filter((o) => next.has(o)));
                  }}
                />
                <FieldLabel htmlFor={`${id}-${option}`} className="font-normal">
                  {option}
                </FieldLabel>
              </Field>
            ))}
          </div>
        </FieldSet>
      );
    }
    case "long_text":
      return (
        <Field className="sm:col-span-2">
          <FieldLabel htmlFor={id}>{label}</FieldLabel>
          <Textarea
            id={id}
            maxLength={10000}
            value={(field.value as string) ?? ""}
            onChange={(e) => field.onChange(e.target.value)}
          />
        </Field>
      );
    default: {
      const inputType = { number: "text", date: "date", email: "email", phone: "tel", url: "url", text: "text" }[
        definition.field_type
      ];
      return (
        <Field>
          <FieldLabel htmlFor={id}>{label}</FieldLabel>
          <Input
            id={id}
            type={inputType}
            inputMode={definition.field_type === "number" ? "decimal" : undefined}
            maxLength={1000}
            value={(field.value as string) ?? ""}
            onChange={(e) => field.onChange(e.target.value)}
          />
          {definition.field_type === "url" ? <FieldDescription>https://…</FieldDescription> : null}
        </Field>
      );
    }
  }
}
