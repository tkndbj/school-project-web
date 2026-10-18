import "server-only";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { publicEnv } from "@/lib/env";
import type { Database } from "@/lib/supabase/types";
import { serverEnv } from "./env";

/**
 * Supabase client acting as the signed-in user. Every query runs under the
 * user's row-level security policies. Create one per request; never share.
 */
export async function createServerSupabase() {
  const cookieStore = await cookies();
  return createServerClient<Database>(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    publicEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookieOptions: {
        secure: publicEnv.NEXT_PUBLIC_SITE_URL.startsWith("https://"),
        sameSite: "lax",
        path: "/",
      },
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Called from a Server Component, where cookies are read-only. The
            // proxy refreshes the session on every request, so this is safe.
          }
        },
      },
    },
  );
}

/**
 * Privileged client that BYPASSES row-level security. Only for operations the
 * user's own client cannot perform (auth admin API, account deletion), and only
 * after the caller has been authorised explicitly.
 */
export function createAdminSupabase() {
  return createClient<Database>(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    serverEnv.SUPABASE_SECRET_KEY,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    },
  );
}

/** Client authenticated with an explicit access token (mobile app API calls). */
export function createTokenSupabase(accessToken: string) {
  return createClient<Database>(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    publicEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      global: { headers: { Authorization: `Bearer ${accessToken}` } },
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    },
  );
}
