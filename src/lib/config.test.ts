import { describe, expect, it } from "vitest";
import { publicEnvSchema } from "./config";

const config = {
  NEXT_PUBLIC_APP_ENV: "production",
  NEXT_PUBLIC_SITE_URL: "https://school-platform.vercel.app",
  NEXT_PUBLIC_SUPABASE_URL: "https://realproject.supabase.co",
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
    "sb_publishable_valid_public_key_for_test",
};
describe("deployment configuration", () => {
  it("disables unconfigured Google authentication", () => {
    expect(publicEnvSchema.parse(config).NEXT_PUBLIC_GOOGLE_AUTH_ENABLED).toBe(
      false,
    );
  });
  it.each([
    "http://school-platform.vercel.app",
    "https://localhost",
    "https://school.example.com",
  ])("rejects insecure or example production origin %s", (url) => {
    expect(
      publicEnvSchema.safeParse({ ...config, NEXT_PUBLIC_SITE_URL: url })
        .success,
    ).toBe(false);
  });
  it("rejects API paths and embedded URL credentials", () => {
    expect(
      publicEnvSchema.safeParse({
        ...config,
        NEXT_PUBLIC_SUPABASE_URL: config.NEXT_PUBLIC_SUPABASE_URL + "/rest/v1/",
      }).success,
    ).toBe(false);
    expect(
      publicEnvSchema.safeParse({
        ...config,
        NEXT_PUBLIC_SITE_URL:
          "https://user:password@school-platform.vercel.app",
      }).success,
    ).toBe(false);
  });
  it("rejects privileged and placeholder browser keys", () => {
    for (const key of [
      "sb_secret_must_never_reach_browser",
      "sb_publishable_xxxxxxxxxxxxxxxxxxxx",
    ])
      expect(
        publicEnvSchema.safeParse({
          ...config,
          NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: key,
        }).success,
      ).toBe(false);
  });
});
