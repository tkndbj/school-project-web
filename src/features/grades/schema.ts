import { z } from "zod";
import { optionalDate, optionalNumber, optionalText, requiredText } from "@/lib/validation";

export const ASSESSMENT_KINDS = ["exam", "quiz", "homework", "project", "participation", "term_grade", "other"] as const;

export const assessmentSchema = z.object({
  title: requiredText(200),
  kind: z.enum(ASSESSMENT_KINDS),
  description: optionalText(5000),
  max_score: z
    .union([z.number(), z.string().trim()])
    .transform((v) => (typeof v === "number" ? v : Number(v.replace(",", "."))))
    .pipe(z.number().gt(0).max(100000)),
  weight: optionalNumber({ min: 0, max: 10000 }),
  assessed_on: optionalDate(),
  term_id: z
    .union([z.uuid(), z.literal("")])
    .nullish()
    .transform((v) => v || null),
  published: z.boolean(),
});

export const gradeEntrySchema = z.object({
  student_id: z.uuid(),
  score: optionalNumber({ min: 0, max: 100000 }),
  letter: optionalText(10),
  comment: optionalText(2000),
});

export const gradebookSchema = z.object({ entries: z.array(gradeEntrySchema).max(2000) });

export type AssessmentInput = z.input<typeof assessmentSchema>;
export type AssessmentOutput = z.output<typeof assessmentSchema>;
export type GradebookInput = z.input<typeof gradebookSchema>;
