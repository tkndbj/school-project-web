"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { fail, failWith, ok, type ActionResult } from "@/lib/errors";
import type { Json } from "@/lib/supabase/types";
import { authorizeSchoolAction } from "@/server/auth";
import { createServerSupabase } from "@/server/supabase";

export type ImportBatchResult = {
  inserted: number;
  updated: number;
  failed: number;
  errors: { index: number; code: string; message: string; detail?: string }[];
};

const batchSchema = z.array(z.record(z.string(), z.json())).min(1).max(500);

const resultSchema = z.object({
  inserted: z.number(),
  updated: z.number(),
  failed: z.number(),
  errors: z.array(
    z.object({ index: z.number(), code: z.string(), message: z.string(), detail: z.string().optional() }),
  ),
});

async function runImport(
  fn: "import_students" | "import_teachers",
  schoolId: string,
  rows: unknown,
  isLastBatch: boolean,
): Promise<ActionResult<ImportBatchResult>> {
  if (!z.uuid().safeParse(schoolId).success || !(await authorizeSchoolAction(schoolId))) {
    return failWith("forbidden");
  }
  const parsed = batchSchema.safeParse(rows);
  if (!parsed.success) return failWith("importFormat", { detail: "batch" });

  const supabase = await createServerSupabase();
  // Validated as a JSON array of objects above; the database checks every field.
  const { data, error } = await supabase.rpc(fn, { p_school_id: schoolId, p_rows: parsed.data as Json });
  if (error) return fail(error);
  if (isLastBatch) refresh();
  return ok(resultSchema.parse(data));
}

/** Imports up to 500 student rows (see public.import_students for the row format). */
export async function importStudentsBatch(schoolId: string, rows: Record<string, unknown>[], isLastBatch: boolean) {
  return runImport("import_students", schoolId, rows, isLastBatch);
}

export async function importTeachersBatch(schoolId: string, rows: Record<string, unknown>[], isLastBatch: boolean) {
  return runImport("import_teachers", schoolId, rows, isLastBatch);
}
