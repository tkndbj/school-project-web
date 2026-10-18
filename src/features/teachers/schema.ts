import { z } from "zod";
import { optionalDate, optionalEmail, optionalEnum, optionalText } from "@/lib/validation";
import { customFieldsInput, GENDERS } from "../students/schema";

// Every field is optional; a teacher record only needs one identifying value.
export const teacherSchema = z
  .object({
    staff_number: optionalText(64),
    title: optionalText(50),
    first_name: optionalText(100),
    last_name: optionalText(100),
    email: optionalEmail(),
    phone: optionalText(50),
    date_of_birth: optionalDate(),
    gender: optionalEnum(GENDERS),
    subject: optionalText(200),
    bio: optionalText(5000),
    custom_fields: customFieldsInput,
  })
  .refine((v) => v.first_name || v.last_name || v.staff_number || v.email, {
    path: ["first_name"],
    message: "missingIdentifier",
  });

export type TeacherInput = z.input<typeof teacherSchema>;
export type TeacherOutput = z.output<typeof teacherSchema>;
