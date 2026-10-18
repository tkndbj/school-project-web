"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { fail, failWith, ok, type ActionResult } from "@/lib/errors";
import { isLocale, localeCookieName, type Locale } from "@/i18n/config";
import { getCurrentUser } from "@/server/auth";
import { createServerSupabase } from "@/server/supabase";
import { deleteAccount } from "./delete-account";

export async function setLocale(locale: Locale): Promise<ActionResult> {
  if (!isLocale(locale)) return failWith("invalidValue");
  (await cookies()).set(localeCookieName, locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });

  const user = await getCurrentUser();
  if (user) {
    const supabase = await createServerSupabase();
    await supabase.from("profiles").update({ locale }).eq("id", user.id);
  }
  return ok();
}

const profileSchema = z.object({ full_name: z.string().trim().max(200) });

export async function updateProfile(input: z.input<typeof profileSchema>): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return failWith("forbidden");
  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) return failWith("invalidValue");

  const supabase = await createServerSupabase();
  const { error } = await supabase
    .from("profiles")
    .update({ full_name: parsed.data.full_name || null })
    .eq("id", user.id);
  return error ? fail(error) : ok();
}

export async function deleteMyAccount(): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return failWith("forbidden");
  const result = await deleteAccount(user.id);
  if (!result.ok) return result;

  const supabase = await createServerSupabase();
  await supabase.auth.signOut();
  redirect("/login");
}
