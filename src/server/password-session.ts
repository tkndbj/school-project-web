import "server-only";
import { redirect } from "next/navigation";
import { requireUser } from "./auth";
import { createServerSupabase } from "./supabase";

export const PASSWORD_MFA_PATH = "/auth/mfa?next=/auth/set-password";

/** Recovery confirms email ownership; an enrolled factor must still be verified. */
export async function requirePasswordChangeSession() {
  const user = await requireUser("/auth/set-password");
  const supabase = await createServerSupabase();
  // Fetch current factor enrollment from Auth, including factors added since
  // this JWT was issued. Cookie-cached user metadata can be stale.
  const { data, error } = await supabase.auth.getUser();
  if (error || data.user?.id !== user.id)
    redirect("/login?next=%2Fauth%2Fset-password");

  if (
    user.aal !== "aal2" &&
    data.user.factors?.some((factor) => factor.status === "verified")
  )
    redirect(PASSWORD_MFA_PATH);

  return { user, supabase };
}
