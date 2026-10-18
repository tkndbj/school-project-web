import { createBrowserClient } from "@supabase/ssr";
import { publicEnv } from "@/lib/env";
import type { Database } from "./types";

let browserClient: ReturnType<typeof createBrowserClient<Database>> | undefined;

/** Supabase client for Client Components. Uses the signed-in user's session. */
export function getBrowserSupabase() {
  browserClient ??= createBrowserClient<Database>(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    publicEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookieOptions: {
        secure: publicEnv.NEXT_PUBLIC_SITE_URL.startsWith("https://"),
        sameSite: "lax",
        path: "/",
      },
    },
  );
  return browserClient;
}
