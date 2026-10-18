import { z } from "zod";

// Mirrors supabase/config.toml: minimum 10 characters with lower, upper and digits.
export const passwordSchema = z
  .string()
  .min(10)
  .max(200)
  .regex(/[a-z]/)
  .regex(/[A-Z]/)
  .regex(/[0-9]/);
