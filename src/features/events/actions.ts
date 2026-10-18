"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { fail, failWith, ok, type ActionResult } from "@/lib/errors";
import { validationFailure } from "@/lib/validation";
import { authorizeSchoolAction } from "@/server/auth";
import { createServerSupabase } from "@/server/supabase";
import { eventSchema, type EventInput } from "./schema";
import { eventInstants } from "./times";

const uuid = z.uuid();

async function prepare(schoolId: string, input: EventInput) {
  if (!uuid.safeParse(schoolId).success)
    return { valid: false as const, failure: failWith("forbidden") };
  const access = await authorizeSchoolAction(schoolId);
  if (!access) return { valid: false as const, failure: failWith("forbidden") };
  const parsed = eventSchema.safeParse(input);
  if (!parsed.success)
    return { valid: false as const, failure: validationFailure(parsed.error) };

  const tz = access.school.timezone;
  const { starts_at, ends_at, all_day, ...rest } = parsed.data;
  try {
    return {
      valid: true as const,
      row: {
        ...rest,
        all_day,
        ...eventInstants({ starts_at, ends_at, all_day }, tz),
      },
    };
  } catch (error) {
    if (error instanceof RangeError)
      return {
        valid: false as const,
        failure: fail({ code: "22007" }, { starts_at: ["invalidDate"] }),
      };
    throw error;
  }
}

export async function createEvent(
  schoolId: string,
  input: EventInput,
): Promise<ActionResult> {
  const prepared = await prepare(schoolId, input);
  if (!prepared.valid) return prepared.failure;
  const supabase = await createServerSupabase();
  const { error } = await supabase
    .from("events")
    .insert({ ...prepared.row, school_id: schoolId });
  if (error) return fail(error);
  refresh();
  return ok();
}

export async function updateEvent(
  schoolId: string,
  eventId: string,
  input: EventInput,
): Promise<ActionResult> {
  if (!uuid.safeParse(eventId).success) return failWith("invalidValue");
  const prepared = await prepare(schoolId, input);
  if (!prepared.valid) return prepared.failure;
  const supabase = await createServerSupabase();
  const { error } = await supabase
    .from("events")
    .update(prepared.row)
    .eq("school_id", schoolId)
    .eq("id", eventId);
  if (error) return fail(error);
  refresh();
  return ok();
}

export async function deleteEvent(
  schoolId: string,
  eventId: string,
): Promise<ActionResult> {
  if (
    ![schoolId, eventId].every((id) => uuid.safeParse(id).success) ||
    !(await authorizeSchoolAction(schoolId))
  ) {
    return failWith("forbidden");
  }
  const supabase = await createServerSupabase();
  const { error } = await supabase
    .from("events")
    .delete()
    .eq("school_id", schoolId)
    .eq("id", eventId);
  if (error) return fail(error);
  refresh();
  return ok();
}
