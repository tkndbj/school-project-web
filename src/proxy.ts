import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Runs before every page request:
//   1. refreshes the Supabase session cookie (single place that can write it),
//   2. sets a per-request nonce-based Content-Security-Policy,
//   3. redirects signed-out users away from private areas (optimistic check;
//      real authorisation happens in the data access layer and the database).

const PROTECTED_PREFIXES = [
  "/admin",
  "/school",
  "/parent",
  "/account",
  "/home",
  "/auth/mfa",
  "/auth/set-password",
];

function buildCsp(nonce: string) {
  const supabase = new URL(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://localhost",
  ).origin;
  const supabaseWs = supabase.replace(/^http/, "ws");
  const isDev = process.env.NODE_ENV === "development";
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""}`,
    // Inline style attributes are needed for per-school brand colours.
    "style-src 'self' 'unsafe-inline'",
    `img-src 'self' blob: data: ${supabase} https://*.googleusercontent.com`,
    "font-src 'self'",
    `connect-src 'self' ${supabase} ${supabaseWs}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    ...(["production", "staging"].includes(
      process.env.NEXT_PUBLIC_APP_ENV ?? "",
    )
      ? ["upgrade-insecure-requests"]
      : []),
  ].join("; ");
}

export async function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const csp = buildCsp(nonce);

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  let response = NextResponse.next({ request: { headers: requestHeaders } });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookieOptions: {
        secure:
          process.env.NEXT_PUBLIC_SITE_URL?.startsWith("https://") ?? false,
        sameSite: "lax",
        path: "/",
      },
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet)
            request.cookies.set(name, value);
          // Forward the refreshed cookie to Server Components in this request.
          requestHeaders.set("cookie", request.headers.get("cookie") ?? "");
          response = NextResponse.next({
            request: { headers: requestHeaders },
          });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  // Verifies the JWT (refreshing it when needed). Do not put code between the
  // client creation and this call.
  const { data } = await supabase.auth.getClaims();
  const signedIn = Boolean(data?.claims?.sub);

  const { pathname, search } = request.nextUrl;
  if (
    !signedIn &&
    PROTECTED_PREFIXES.some(
      (p) => pathname === p || pathname.startsWith(`${p}/`),
    )
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    url.searchParams.set("next", `${pathname}${search}`);
    const redirect = NextResponse.redirect(url);
    // Carry over any cookies the refresh attempt wrote (e.g. clearing a dead session).
    for (const cookie of response.cookies.getAll())
      redirect.cookies.set(cookie);
    redirect.headers.set("Content-Security-Policy", csp);
    return redirect;
  }

  response.headers.set("Content-Security-Policy", csp);
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

export const config = {
  matcher: [
    {
      source:
        "/((?!api|_next/static|_next/image|favicon.ico|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
