import { z } from "zod";
import { optionalEmail, optionalEnum, optionalText } from "@/lib/validation";
import { customFieldsInput } from "../students/schema";

export const RELATIONSHIPS = ["mother", "father", "guardian", "grandparent", "sibling", "other"] as const;

export const guardianSchema = z
  .object({
    first_name: optionalText(100),
    last_name: optionalText(100),
    email: optionalEmail(),
    phone: optionalText(50),
    address: optionalText(500),
    custom_fields: customFieldsInput,
  })
  .refine((v) => v.first_name || v.last_name || v.email || v.phone, {
    path: ["first_name"],
    message: "missingIdentifier",
  });

export const guardianLinkSchema = z.object({
  relationship: optionalEnum(RELATIONSHIPS),
  is_primary: z.boolean().default(false),
});

export const newGuardianForStudentSchema = z
  .object({
    first_name: optionalText(100),
    last_name: optionalText(100),
    email: optionalEmail(),
    phone: optionalText(50),
    relationship: optionalEnum(RELATIONSHIPS),
    is_primary: z.boolean().default(false),
  })
  .refine((v) => v.first_name || v.last_name || v.email || v.phone, {
    path: ["first_name"],
    message: "missingIdentifier",
  });

export type GuardianInput = z.input<typeof guardianSchema>;
export type GuardianOutput = z.output<typeof guardianSchema>;
