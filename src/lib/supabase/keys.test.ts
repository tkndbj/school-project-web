import { expect, it } from "vitest";
import { isPublicSupabaseKey } from "./keys";

it("never accepts a secret or legacy service-role key in client config", () => {
  const jwt = (role: string) =>
    `header.${btoa(JSON.stringify({ role }))}.signature`;
  expect(isPublicSupabaseKey("sb_publishable_test")).toBe(true);
  expect(isPublicSupabaseKey(jwt("anon"))).toBe(true);
  expect(isPublicSupabaseKey("sb_secret_do_not_ship")).toBe(false);
  expect(isPublicSupabaseKey(jwt("service_role"))).toBe(false);
});
