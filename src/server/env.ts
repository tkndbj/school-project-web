import "server-only";
import { z } from "zod";
import { publicEnv } from "@/lib/env";

// Server-only secrets. Importing this module from client code fails the build.
const serverEnvSchema = z.object({
  SUPABASE_SECRET_KEY: z
    .string()
    .min(20)
    .refine((key) => {
      let privileged = key.startsWith("sb_secret_");
      if (!privileged) {
        try {
          privileged =
            JSON.parse(
              atob(key.split(".")[1]!.replace(/-/g, "+").replace(/_/g, "/")),
            ).role === "service_role";
        } catch {
          privileged = false;
        }
      }
      return (
        privileged &&
        (!["production", "staging"].includes(publicEnv.NEXT_PUBLIC_APP_ENV) ||
          !/placeholder|xxxx/i.test(key))
      );
    }, "A real server secret or service_role key is required"),
});

export const serverEnv = serverEnvSchema.parse({
  SUPABASE_SECRET_KEY: process.env.SUPABASE_SECRET_KEY,
});
