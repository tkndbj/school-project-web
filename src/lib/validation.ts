import { z } from "zod";

// Validation helpers shared by client forms and server actions. Every schema is
// parsed on the server again before anything reaches the database.
//
// Error messages are stable keys ("tooLong:100") instead of English text; the
// form field components translate them (see components/forms/fields.tsx).

z.config({
  customError: (issue) => {
    switch (issue.code) {
      case "too_big":
        return issue.origin === "string" ? `tooLong:${issue.maximum}` : `tooBig:${issue.maximum}`;
      case "too_small":
        if (issue.origin === "string") return Number(issue.minimum) <= 1 ? "required" : `tooShort:${issue.minimum}`;
        return `tooSmall:${issue.minimum}`;
      case "invalid_format":
        return issue.format === "email" ? "invalidEmail" : "invalidFormat";
      case "invalid_type":
        return issue.input === undefined || issue.input === null ? "required" : "invalid";
      default:
        return "invalid";
    }
  },
});

const blankToNull = (value: string | null | undefined) => (value == null || value === "" ? null : value);

// Optional fields accept "", null or undefined (form inputs give ""; database
// rows give null) and always produce `string | null`.

/** Optional free text: trimmed, empty input stored as null. */
export const optionalText = (max: number) => z.string().trim().max(max).nullish().transform(blankToNull);

/** Required free text (trimmed). */
export const requiredText = (max: number) => z.string().trim().min(1).max(max);

export const optionalEmail = () =>
  z.string().trim().toLowerCase().max(320).nullish().transform(blankToNull).pipe(z.email().nullable());

/** Optional ISO calendar date (YYYY-MM-DD), as produced by <input type="date">. */
export const optionalDate = () => z.string().trim().nullish().transform(blankToNull).pipe(z.iso.date().nullable());

export const optionalEnum = <const T extends readonly [string, ...string[]]>(values: T) =>
  z
    .union([z.enum(values), z.literal("")])
    .nullish()
    .transform((v): T[number] | null => (v ? v : null));

export const optionalHexColor = () =>
  z.string().trim().nullish().transform(blankToNull).pipe(z.string().regex(/^#[0-9a-fA-F]{6}$/).nullable());

export const optionalUrl = () =>
  z
    .string()
    .trim()
    .max(2048)
    .nullish()
    .transform(blankToNull)
    .pipe(z.url({ protocol: /^https?$/ }).nullable());

/** Optional non-negative decimal entered as text (e.g. a score). */
export const optionalNumber = (options: { min?: number; max?: number } = {}) =>
  z
    .union([z.number(), z.string().trim()])
    .nullish()
    .transform((v) => (v == null || v === "" ? null : typeof v === "number" ? v : Number(v.replace(",", "."))))
    .pipe(
      z
        .number()
        .min(options.min ?? Number.NEGATIVE_INFINITY)
        .max(options.max ?? Number.POSITIVE_INFINITY)
        .nullable(),
    );

export const uuid = () => z.uuid();

export const slugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(1)
  .max(63)
  .regex(/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/);

/** Turns a display name into a URL slug ("Atatürk Lisesi" -> "ataturk-lisesi"). */
export function slugify(value: string): string {
  return value
    .toLocaleLowerCase("tr")
    .replace(/ı/g, "i")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 63)
    .replace(/-+$/g, "");
}

/** Server-action result for input that failed schema validation. */
export function validationFailure(error: z.ZodError) {
  return { ok: false as const, error: { key: "invalidValue" as const }, fieldErrors: fieldErrors(error) };
}

/** Flattens a ZodError into { field: [messageKey] } for form display. */
export function fieldErrors(error: z.ZodError): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_";
    (out[key] ??= []).push(issue.message);
  }
  return out;
}
