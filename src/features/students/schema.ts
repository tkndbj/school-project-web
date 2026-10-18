import { z } from "zod";
import { optionalDate, optionalEmail, optionalEnum, optionalText } from "@/lib/validation";

export const STUDENT_STATUSES = ["active", "inactive", "graduated", "transferred"] as const;
export const GENDERS = ["female", "male", "other", "undisclosed"] as const;

// Raw custom field form state; converted against the school's definitions on the server.
export const customFieldsInput = z
  .record(z.string(), z.union([z.string(), z.boolean(), z.array(z.string()), z.null()]).optional())
  .default({});

export const studentSchema = z
  .object({
    student_number: optionalText(64),
    first_name: optionalText(100),
    last_name: optionalText(100),
    preferred_name: optionalText(100),
    date_of_birth: optionalDate(),
    gender: optionalEnum(GENDERS),
    grade_level: optionalText(50),
    section: optionalText(50),
    email: optionalEmail(),
    phone: optionalText(50),
    address: optionalText(500),
    enrolled_on: optionalDate(),
    status: z.enum(STUDENT_STATUSES),
    notes: optionalText(10000),
    custom_fields: customFieldsInput,
  })
  .refine((v) => v.first_name || v.last_name || v.student_number, {
    path: ["first_name"],
    message: "missingIdentifier",
  });

export type StudentInput = z.input<typeof studentSchema>;
export type StudentOutput = z.output<typeof studentSchema>;
