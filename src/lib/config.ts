import { z } from "zod";
import { isPublicSupabaseKey } from "./supabase/keys";

const origin = z.url().refine((value) => {
  const url = new URL(value);
  return (
    ["http:", "https:"].includes(url.protocol) &&
    !url.username &&
    !url.password &&
    !url.search &&
    !url.hash &&
    url.pathname === "/"
  );
}, "Use an HTTP(S) origin without credentials, query parameters or a path");

export const publicEnvSchema = z
  .object({
    NEXT_PUBLIC_APP_ENV: z
      .enum(["development", "test", "staging", "production"])
      .default("development"),
    NEXT_PUBLIC_SUPABASE_URL: origin,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z
      .string()
      .min(20)
      .refine(isPublicSupabaseKey, "Use a publishable or anon key"),
    NEXT_PUBLIC_SITE_URL: origin,
    NEXT_PUBLIC_GOOGLE_AUTH_ENABLED: z
      .enum(["true", "false"])
      .default("false")
      .transform((value) => value === "true"),
  })
  .superRefine((values, ctx) => {
    if (!["production", "staging"].includes(values.NEXT_PUBLIC_APP_ENV)) return;
    for (const key of [
      "NEXT_PUBLIC_SUPABASE_URL",
      "NEXT_PUBLIC_SITE_URL",
    ] as const) {
      const url = new URL(values[key]);
      if (
        url.protocol !== "https:" ||
        ["localhost", "127.0.0.1", "::1"].includes(url.hostname) ||
        url.hostname.endsWith(".example") ||
        url.hostname.endsWith(".example.com")
      ) {
        ctx.addIssue({
          code: "custom",
          path: [key],
          message: "Deployments require a real public HTTPS origin",
        });
      }
    }
    if (/placeholder|xxxx/i.test(values.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY))
      ctx.addIssue({
        code: "custom",
        path: ["NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"],
        message: "Placeholder keys cannot be deployed",
      });
  });
