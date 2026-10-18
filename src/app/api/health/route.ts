export const dynamic = "force-dynamic";

/** Liveness only; never exposes credentials or makes privileged data queries. */
export function GET() {
  return Response.json(
    { status: "ok" },
    { headers: { "Cache-Control": "no-store" } },
  );
}
