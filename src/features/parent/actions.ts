"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { fail, failWith, ok, type ActionResult } from "@/lib/errors";
import { getCurrentUser } from "@/server/auth";
import { createServerSupabase } from "@/server/supabase";

export async function redeemInvite(input: {
  code: string;
}): Promise<ActionResult<{ schoolName: string | null }>> {
  if (!(await getCurrentUser())) return failWith("forbidden");
  const parsed = z
    .object({ code: z.string().trim().min(1).max(64) })
    .safeParse(input);
  if (!parsed.success) return failWith("invalidValue");
  const supabase = await createServerSupabase();
  const { data, error } = await supabase.rpc("redeem_guardian_invite", {
    p_code: parsed.data.code,
  });
  if (error) return fail(error);
  const result = data[0];
  if (result?.status !== "linked")
    return failWith(
      result?.status === "rate_limited" ? "rateLimited" : "invalidValue",
    );
  refresh();
  return ok({ schoolName: result.school_name });
}
