"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { failWith, ok, type ActionResult } from "@/lib/errors";
import { publicEnv } from "@/lib/env";
import { safeNextPath } from "@/lib/navigation";
import { createServerSupabase } from "@/server/supabase";
import { passwordSchema } from "./schema";

const signInSchema = z.object({
  email: z.email().max(320),
  password: z.string().min(1).max(200),
  next: z.string().optional(),
});

export async function signInWithPassword(
  input: z.input<typeof signInSchema>,
): Promise<ActionResult<{ redirectTo: string }>> {
  const parsed = signInSchema.safeParse(input);
  if (!parsed.success) return failWith("invalidValue");

  const supabase = await createServerSupabase();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email.trim().toLowerCase(),
    password: parsed.data.password,
  });
  if (error) {
    // Never reveal whether the account exists.
    return failWith(
      error.status === 429 ? "rateLimited" : "invalidCredentials",
      { reason: error.code },
    );
  }
  return ok({ redirectTo: safeNextPath(parsed.data.next, "/") });
}

export async function signInWithGoogle(
  next?: string,
): Promise<ActionResult<{ url: string }>> {
  if (!publicEnv.NEXT_PUBLIC_GOOGLE_AUTH_ENABLED) return failWith("forbidden");
  const supabase = await createServerSupabase();
  const callback = new URL("/auth/callback", publicEnv.NEXT_PUBLIC_SITE_URL);
  callback.searchParams.set("next", safeNextPath(next, "/"));

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: callback.toString(),
      queryParams: { prompt: "select_account" },
    },
  });
  if (error || !data.url) return failWith("unknown", { reason: error?.code });
  return ok({ url: data.url });
}

const emailSchema = z.object({ email: z.email().max(320) });

export async function requestPasswordReset(
  input: z.input<typeof emailSchema>,
): Promise<ActionResult> {
  const parsed = emailSchema.safeParse(input);
  if (!parsed.success) return failWith("invalidValue");

  const supabase = await createServerSupabase();
  const { error } = await supabase.auth.resetPasswordForEmail(
    parsed.data.email.trim().toLowerCase(),
    {
      redirectTo: new URL(
        "/auth/set-password",
        publicEnv.NEXT_PUBLIC_SITE_URL,
      ).toString(),
    },
  );
  if (error?.status === 429) return failWith("rateLimited");
  // Success is reported even for unknown emails to avoid account enumeration.
  return ok();
}

const setPasswordSchema = z.object({ password: passwordSchema });

export async function setPassword(
  input: z.input<typeof setPasswordSchema>,
): Promise<ActionResult> {
  const parsed = setPasswordSchema.safeParse(input);
  if (!parsed.success) return failWith("invalidValue");

  const supabase = await createServerSupabase();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims?.sub) return failWith("forbidden");

  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });
  if (error) {
    const key =
      error.code === "weak_password"
        ? "weakPassword"
        : error.code === "same_password"
          ? "samePassword"
          : "unknown";
    return failWith(key, { reason: error.code });
  }
  return ok();
}

export async function signOut() {
  const supabase = await createServerSupabase();
  await supabase.auth.signOut();
  redirect("/login");
}
