"use client";

import { useTranslations } from "next-intl";
import { useId, type ComponentProps, type ReactNode } from "react";
import {
  useController,
  type Control,
  type FieldPath,
  type FieldValues,
} from "react-hook-form";
import { NativeSelect } from "@/components/native-select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

// React Hook Form bindings for the shadcn field primitives. Validation messages
// arrive as stable keys from src/lib/validation.ts and are translated here.

export function useValidationMessage() {
  const t = useTranslations("validation");
  return (message: string | undefined) => {
    if (!message) return undefined;
    const [key, param] = message.split(":");
    if (!t.has(key as never)) return t("invalid");
    return t(key as "tooLong", { value: param ?? "" });
  };
}

type BaseProps<T extends FieldValues> = {
  control: Control<T>;
  name: FieldPath<T>;
  label: ReactNode;
  description?: ReactNode;
  className?: string;
};

function FieldMessage({ message }: { message?: string }) {
  const translate = useValidationMessage();
  const text = translate(message);
  return text ? <FieldError>{text}</FieldError> : null;
}

export function TextField<T extends FieldValues>({
  control,
  name,
  label,
  description,
  className,
  ...inputProps
}: BaseProps<T> &
  Omit<
    ComponentProps<"input">,
    "name" | "value" | "defaultValue" | "onChange" | "onBlur"
  >) {
  const id = useId();
  const {
    field: { ref: inputRef, ...field },
    fieldState,
  } = useController({ control, name });
  return (
    <Field data-invalid={!!fieldState.error} className={className}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Input
        id={id}
        {...inputProps}
        name={field.name}
        ref={inputRef}
        value={(field.value as string | number | null | undefined) ?? ""}
        onChange={(e) => field.onChange(e.target.value)}
        onBlur={field.onBlur}
        aria-invalid={!!fieldState.error}
      />
      {description ? <FieldDescription>{description}</FieldDescription> : null}
      <FieldMessage message={fieldState.error?.message} />
    </Field>
  );
}

export function TextareaField<T extends FieldValues>({
  control,
  name,
  label,
  description,
  className,
  ...props
}: BaseProps<T> &
  Omit<
    ComponentProps<"textarea">,
    "name" | "value" | "defaultValue" | "onChange" | "onBlur"
  >) {
  const id = useId();
  const {
    field: { ref: inputRef, ...field },
    fieldState,
  } = useController({ control, name });
  return (
    <Field data-invalid={!!fieldState.error} className={className}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Textarea
        id={id}
        {...props}
        name={field.name}
        ref={inputRef}
        value={(field.value as string | null | undefined) ?? ""}
        onChange={(e) => field.onChange(e.target.value)}
        onBlur={field.onBlur}
        aria-invalid={!!fieldState.error}
      />
      {description ? <FieldDescription>{description}</FieldDescription> : null}
      <FieldMessage message={fieldState.error?.message} />
    </Field>
  );
}

export type SelectOption = { value: string; label: string };

export function SelectField<T extends FieldValues>({
  control,
  name,
  label,
  description,
  className,
  options,
  placeholder,
  disabled,
}: BaseProps<T> & {
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
}) {
  const id = useId();
  const {
    field: { ref: inputRef, ...field },
    fieldState,
  } = useController({ control, name });
  return (
    <Field data-invalid={!!fieldState.error} className={className}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <NativeSelect
        id={id}
        name={field.name}
        ref={inputRef}
        value={(field.value as string | null | undefined) ?? ""}
        onChange={(e) => field.onChange(e.target.value)}
        onBlur={field.onBlur}
        disabled={disabled}
        aria-invalid={!!fieldState.error}
      >
        {placeholder !== undefined ? (
          <option value="">{placeholder}</option>
        ) : null}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </NativeSelect>
      {description ? <FieldDescription>{description}</FieldDescription> : null}
      <FieldMessage message={fieldState.error?.message} />
    </Field>
  );
}

/** Optional brand colour: swatch picker + hex text, clearable (null = default theme). */
export function ColorField<T extends FieldValues>({
  control,
  name,
  label,
  description,
  className,
  clearLabel,
}: BaseProps<T> & { clearLabel: string }) {
  const id = useId();
  const {
    field: { ref: inputRef, ...field },
    fieldState,
  } = useController({ control, name });
  const value = (field.value as string | null | undefined) ?? "";
  const valid = /^#[0-9a-fA-F]{6}$/.test(value);
  return (
    <Field data-invalid={!!fieldState.error} className={className}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <div className="flex items-center gap-2">
        <input
          type="color"
          aria-label={typeof label === "string" ? label : undefined}
          className="h-8 w-10 shrink-0 cursor-pointer rounded-md border border-input bg-transparent p-0.5"
          value={valid ? value : "#1d4ed8"}
          onChange={(e) => field.onChange(e.target.value)}
        />
        <Input
          id={id}
          name={field.name}
          ref={inputRef}
          value={value}
          placeholder="#1d4ed8"
          maxLength={7}
          onChange={(e) => field.onChange(e.target.value)}
          onBlur={field.onBlur}
          aria-invalid={!!fieldState.error}
          className="font-mono"
        />
        {value ? (
          <button
            type="button"
            className="shrink-0 text-xs text-muted-foreground underline-offset-4 hover:underline"
            onClick={() => field.onChange("")}
          >
            {clearLabel}
          </button>
        ) : null}
      </div>
      {description ? <FieldDescription>{description}</FieldDescription> : null}
      <FieldMessage message={fieldState.error?.message} />
    </Field>
  );
}

export function CheckboxField<T extends FieldValues>({
  control,
  name,
  label,
  description,
  className,
}: BaseProps<T>) {
  const id = useId();
  const { field } = useController({ control, name });
  return (
    <Field orientation="horizontal" className={className}>
      <Checkbox
        id={id}
        checked={!!field.value}
        onCheckedChange={(checked) => field.onChange(checked === true)}
      />
      <FieldContent>
        <FieldLabel htmlFor={id}>{label}</FieldLabel>
        {description ? (
          <FieldDescription>{description}</FieldDescription>
        ) : null}
      </FieldContent>
    </Field>
  );
}

export function SwitchField<T extends FieldValues>({
  control,
  name,
  label,
  description,
  className,
}: BaseProps<T>) {
  const id = useId();
  const { field } = useController({ control, name });
  return (
    <Field orientation="horizontal" className={className}>
      <FieldContent>
        <FieldLabel htmlFor={id}>{label}</FieldLabel>
        {description ? (
          <FieldDescription>{description}</FieldDescription>
        ) : null}
      </FieldContent>
      <Switch
        id={id}
        checked={!!field.value}
        onCheckedChange={(checked) => field.onChange(checked)}
      />
    </Field>
  );
}
