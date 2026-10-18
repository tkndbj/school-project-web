import type { Json, Tables } from "@/lib/supabase/types";

export type CustomFieldDefinition = Pick<
  Tables<"custom_field_definitions">,
  "id" | "key" | "label" | "field_type" | "options" | "visible_to_guardians" | "sort_order"
>;

export type CustomFieldFormValues = Record<string, string | boolean | string[] | undefined | null>;

/**
 * Converts raw form state into the jsonb shape the database validates:
 * numbers as numbers, booleans as booleans, multi-selects as arrays, and blank
 * values as null (which the database drops). Unknown keys are discarded.
 * Invalid numbers are passed through as text so the database reports them.
 */
export function toCustomFieldPayload(
  definitions: ReadonlyArray<Pick<CustomFieldDefinition, "key" | "field_type" | "options">>,
  values: CustomFieldFormValues | null | undefined,
): Record<string, Json> {
  const payload: Record<string, Json> = {};
  for (const def of definitions) {
    const raw = values?.[def.key];
    switch (def.field_type) {
      case "boolean":
        payload[def.key] = raw === true || raw === "true" ? true : raw === false || raw === "false" ? false : null;
        break;
      case "number": {
        const text = typeof raw === "string" ? raw.trim().replace(",", ".") : "";
        const num = Number(text);
        payload[def.key] = text === "" ? null : Number.isFinite(num) ? num : text;
        break;
      }
      case "multi_select": {
        const list = Array.isArray(raw) ? raw.filter((v) => def.options.includes(v)) : [];
        payload[def.key] = list.length > 0 ? list : null;
        break;
      }
      default: {
        const text = typeof raw === "string" ? raw.trim() : "";
        payload[def.key] = text === "" ? null : text;
      }
    }
  }
  return payload;
}

/** Converts stored jsonb values into form state (inverse of toCustomFieldPayload). */
export function toCustomFieldFormValues(
  definitions: ReadonlyArray<Pick<CustomFieldDefinition, "key" | "field_type">>,
  stored: Json | null | undefined,
): CustomFieldFormValues {
  const source = stored && typeof stored === "object" && !Array.isArray(stored) ? stored : {};
  const values: CustomFieldFormValues = {};
  for (const def of definitions) {
    const value = (source as Record<string, Json | undefined>)[def.key];
    switch (def.field_type) {
      case "boolean":
        values[def.key] = value === true;
        break;
      case "multi_select":
        values[def.key] = Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : [];
        break;
      default:
        values[def.key] = value === null || value === undefined ? "" : String(value);
    }
  }
  return values;
}
