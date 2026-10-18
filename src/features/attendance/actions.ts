"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { fail, failWith, ok, type ActionResult } from "@/lib/errors";
import { optionalText, validationFailure } from "@/lib/validation";
import { authorizeSchoolAction } from "@/server/auth";
import { createServerSupabase } from "@/server/supabase";
import { ATTENDANCE_STATUSES } from "./constants";

const registerSchema = z.object({
  date: z.iso.date(),
  course_id: z
    .union([z.uuid(), z.literal("")])
    .nullish()
    .transform((v) => v || null),
  period: optionalText(50),
  entries: z
    .array(
      z.object({
        student_id: z.uuid(),
        status: z.enum(ATTENDANCE_STATUSES).nullable(),
        minutes_late: z.number().int().min(0).max(1440).nullable(),
        note: optionalText(2000),
      }),
    )
    .max(5000),
});

export async function saveRegister(
  schoolId: string,
  input: z.input<typeof registerSchema>,
): Promise<ActionResult<{ saved: number }>> {
  if (!z.uuid().safeParse(schoolId).success || !(await authorizeSchoolAction(schoolId))) {
    return failWith("forbidden");
  }
  const parsed = registerSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);

  const supabase = await createServerSupabase();
  const { data, error } = await supabase.rpc("save_attendance", {
    p_school_id: schoolId,
    p_date: parsed.data.date,
    p_entries: parsed.data.entries,
    p_course_id: parsed.data.course_id ?? undefined,
    p_period: parsed.data.period ?? undefined,
  });
  if (error) return fail(error);
  refresh();
  return ok({ saved: data });
}
