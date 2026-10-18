import { z } from "zod";
import { optionalHexColor, optionalText, requiredText } from "@/lib/validation";
import { customFieldsInput } from "../students/schema";

export const courseSchema = z.object({
  name: requiredText(200),
  code: optionalText(64),
  subject: optionalText(200),
  grade_level: optionalText(50),
  description: optionalText(5000),
  color: optionalHexColor(),
  term_id: z
    .union([z.uuid(), z.literal("")])
    .nullish()
    .transform((v) => v || null),
  custom_fields: customFieldsInput,
});

export const bulkEnrollSchema = z.object({
  grade_level: requiredText(50),
  section: optionalText(50),
});

export type CourseInput = z.input<typeof courseSchema>;
export type CourseOutput = z.output<typeof courseSchema>;
