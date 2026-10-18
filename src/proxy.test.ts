import { NextRequest } from "next/server";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { proxy } from "./proxy";

const claims = vi.hoisted(() => vi.fn());
vi.mock("@supabase/ssr", () => ({
  createServerClient: (
    _url: string,
    _key: string,
    options: {
      cookies: {
        setAll: (
          cookies: { name: string; value: string; options: object }[],
        ) => void;
      };
    },
  ) => ({ auth: { getClaims: () => claims(options) } }),
}));
beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://test.supabase.co");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_test");
});
afterEach(() => vi.unstubAllEnvs());
it("forwards refreshed auth cookies to the same server request", async () => {
  claims.mockImplementationOnce((options) => {
    options.cookies.setAll([
      {
        name: "sb-test-auth-token",
        value: "refreshed",
        options: { path: "/", httpOnly: true },
      },
    ]);
    return { data: { claims: { sub: "user-id" } } };
  });
  const result = await proxy(
    new NextRequest("http://localhost:3000/parent", {
      headers: { cookie: "sb-test-auth-token=expired" },
    }),
  );
  expect(result.headers.get("x-middleware-request-cookie")).toContain(
    "sb-test-auth-token=refreshed",
  );
  expect(result.cookies.get("sb-test-auth-token")?.value).toBe("refreshed");
  expect(result.headers.get("cache-control")).toBe("private, no-store");
});
