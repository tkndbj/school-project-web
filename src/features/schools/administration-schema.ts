import { z } from "zod";
import { requiredText } from "@/lib/validation";

export const termSchema = z
  .object({
    name: requiredText(100),
    starts_on: z.iso.date(),
    ends_on: z.iso.date(),
  })
  .refine(
    (value) =>
      !value.starts_on || !value.ends_on || value.ends_on >= value.starts_on,
    { path: ["ends_on"], message: "endBeforeStart" },
  );
export const FIELD_ENTITIES = [
  "student",
  "teacher",
  "guardian",
  "course",
] as const;
export const FIELD_TYPES = [
  "text",
  "long_text",
  "number",
  "boolean",
  "date",
  "select",
  "multi_select",
  "url",
  "email",
  "phone",
] as const;
export const definitionSchema = z
  .object({
    entity: z.enum(FIELD_ENTITIES),
    key: z
      .string()
      .trim()
      .regex(/^[a-z][a-z0-9_]{0,62}$/),
    label: requiredText(200),
    field_type: z.enum(FIELD_TYPES),
    options_text: z.string().max(10000),
    visible_to_guardians: z.boolean(),
    sort_order: z
      .union([z.string().trim(), z.number()])
      .transform(Number)
      .pipe(z.number().int().min(-10000).max(10000)),
  })
  .refine(
    (value) =>
      !["select", "multi_select"].includes(value.field_type) ||
      value.options_text.split("\n").some((option) => option.trim()),
    { path: ["options_text"], message: "optionRequired" },
  );
