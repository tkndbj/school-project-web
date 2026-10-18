import { z } from "zod";
import { locales } from "@/i18n/config";
import {
  optionalEmail,
  optionalHexColor,
  optionalText,
  optionalUrl,
  requiredText,
  slugSchema,
} from "@/lib/validation";

export const SCHOOL_MODULES = ["teachers", "courses", "grades", "attendance", "notes", "events"] as const;
export const SCHOOL_ROLES = ["admin", "staff"] as const;

export const schoolDetailsSchema = z.object({
  name: requiredText(200),
  timezone: z.string().trim().min(1).max(64),
  default_locale: z.enum(locales),
  contact_email: optionalEmail(),
  contact_phone: optionalText(50),
  address: optionalText(500),
  website: optionalUrl(),
});

export const schoolBrandingSchema = z.object({
  primary_color: optionalHexColor(),
});

export const schoolModulesSchema = z.object({
  enabled_modules: z.array(z.enum(SCHOOL_MODULES)),
});

export const createSchoolSchema = schoolDetailsSchema.extend({
  slug: slugSchema,
  enabled_modules: z.array(z.enum(SCHOOL_MODULES)),
  first_admin_email: optionalEmail(),
});

export const platformUpdateSchoolSchema = schoolDetailsSchema.extend({
  slug: slugSchema,
  status: z.enum(["active", "suspended"]),
  enabled_modules: z.array(z.enum(SCHOOL_MODULES)),
  primary_color: optionalHexColor(),
});

export const inviteMemberSchema = z.object({
  school_id: z.uuid(),
  email: z.email().max(320).transform((v) => v.trim().toLowerCase()),
  role: z.enum(SCHOOL_ROLES),
});

export type SchoolDetailsInput = z.input<typeof schoolDetailsSchema>;
