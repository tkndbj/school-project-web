import { NextResponse, type NextRequest } from "next/server";
import { deleteAccount } from "@/features/account/delete-account";
import { createTokenSupabase } from "@/server/supabase";

// Account deletion for the mobile app (required by the App Store / Play Store).
// Contract: DELETE /api/account with `Authorization: Bearer <access token>`.
//   204 deleted · 401 invalid token · 403 platform admin · 409 last school admin
export async function DELETE(request: NextRequest) {
  const header = request.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ")
    ? header.slice("Bearer ".length).trim()
    : "";
  if (!token)
    return NextResponse.json({ error: "missing_token" }, { status: 401 });

  const supabase = createTokenSupabase(token);
  const { data, error } = await supabase.auth.getUser(token);
  const userId = data?.user?.id;
  if (error || !userId)
    return NextResponse.json({ error: "invalid_token" }, { status: 401 });

  const result = await deleteAccount(userId);
  if (result.ok) return new NextResponse(null, { status: 204 });

  const reason = result.error.reason ?? result.error.key;
  const status =
    result.error.key === "schoolRequiresAdmin"
      ? 409
      : result.error.key === "forbidden"
        ? 403
        : 500;
  return NextResponse.json({ error: reason }, { status });
}
