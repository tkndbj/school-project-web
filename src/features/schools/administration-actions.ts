"use server";

import { refresh } from "next/cache";
import type { z } from "zod";
import { z as schema } from "zod";
import { fail, failWith, ok, type ActionResult } from "@/lib/errors";
import { validationFailure } from "@/lib/validation";
import { authorizeSchoolAction } from "@/server/auth";
import { createServerSupabase } from "@/server/supabase";
import { definitionSchema, termSchema } from "./administration-schema";

async function allowed(schoolId: string, id?: string) {
  return (
    schema.uuid().safeParse(schoolId).success &&
    (!id || schema.uuid().safeParse(id).success) &&
    Boolean(await authorizeSchoolAction(schoolId, { adminOnly: true }))
  );
}
export async function saveTerm(
  schoolId: string,
  id: string | null,
  input: z.input<typeof termSchema>,
): Promise<ActionResult> {
  if (!(await allowed(schoolId, id ?? undefined))) return failWith("forbidden");
  const parsed = termSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);
  const supabase = await createServerSupabase();
  const { error } = id
    ? await supabase
        .from("academic_terms")
        .update(parsed.data)
        .eq("school_id", schoolId)
        .eq("id", id)
    : await supabase
        .from("academic_terms")
        .insert({ ...parsed.data, school_id: schoolId });
  if (error) return fail(error);
  refresh();
  return ok();
}
export async function deleteTerm(
  schoolId: string,
  id: string,
): Promise<ActionResult> {
  if (!(await allowed(schoolId, id))) return failWith("forbidden");
  const supabase = await createServerSupabase();
  const { error } = await supabase
    .from("academic_terms")
    .delete()
    .eq("school_id", schoolId)
    .eq("id", id);
  if (error) return fail(error);
  refresh();
  return ok();
}
export async function saveDefinition(
  schoolId: string,
  id: string | null,
  input: z.input<typeof definitionSchema>,
): Promise<ActionResult> {
  if (!(await allowed(schoolId, id ?? undefined))) return failWith("forbidden");
  const parsed = definitionSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);
  const { options_text, ...rest } = parsed.data;
  const options = ["select", "multi_select"].includes(rest.field_type)
    ? [
        ...new Set(
          options_text
            .split("\n")
            .map((option) => option.trim())
            .filter(Boolean),
        ),
      ]
    : [];
  if (options.length > 200 || options.some((option) => option.length > 500))
    return failWith("invalidValue");
  const supabase = await createServerSupabase();
  // Existing definitions keep their storage contract; the database also makes
  // the entity, key and type immutable for every client.
  const { error } = id
    ? await supabase
        .from("custom_field_definitions")
        .update({
          label: rest.label,
          options,
          visible_to_guardians: rest.visible_to_guardians,
          sort_order: rest.sort_order,
        })
        .eq("school_id", schoolId)
        .eq("id", id)
    : await supabase
        .from("custom_field_definitions")
        .insert({ ...rest, options, school_id: schoolId });
  if (error) return fail(error);
  refresh();
  return ok();
}
export async function deleteDefinition(
  schoolId: string,
  id: string,
): Promise<ActionResult> {
  if (!(await allowed(schoolId, id))) return failWith("forbidden");
  const supabase = await createServerSupabase();
  const { error } = await supabase
    .from("custom_field_definitions")
    .delete()
    .eq("school_id", schoolId)
    .eq("id", id);
  if (error) return fail(error);
  refresh();
  return ok();
}
