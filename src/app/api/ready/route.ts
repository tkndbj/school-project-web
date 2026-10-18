import { NextResponse } from "next/server";
import { publicEnv } from "@/lib/env";
import { createAdminSupabase } from "@/server/supabase";

export const dynamic = "force-dynamic";
let recent: { at: number; ready: boolean } | undefined;

/** Readiness is separate from process liveness and never returns backend details. */
export async function GET() {
  if (!recent || Date.now() - recent.at > 15000) {
    const signal = AbortSignal.timeout(5000);
    let ready = false;
    try {
      const [database, auth] = await Promise.all([
        createAdminSupabase()
          .from("schools")
          .select("id")
          .limit(0)
          .abortSignal(signal),
        fetch(new URL("/auth/v1/health", publicEnv.NEXT_PUBLIC_SUPABASE_URL), {
          headers: { apikey: publicEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY },
          signal,
          cache: "no-store",
        }),
      ]);
      ready = !database.error && auth.ok;
      await auth.body?.cancel();
    } catch {
      ready = false;
    }
    recent = { at: Date.now(), ready };
  }
  return NextResponse.json(
    { status: recent.ready ? "ready" : "unavailable" },
    {
      status: recent.ready ? 200 : 503,
      headers: { "Cache-Control": "no-store" },
    },
  );
}
