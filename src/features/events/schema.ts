import { z } from "zod";
import { optionalHexColor, optionalText, requiredText } from "@/lib/validation";

const wallTime = z.union([
  z.iso.date(),
  z.iso.datetime({ local: true, precision: -1 }),
]);

/** Times are wall-clock values in the school's time zone; converted to UTC on the server. */
export const eventSchema = z
  .object({
    title: requiredText(200),
    description: optionalText(10000),
    location: optionalText(500),
    all_day: z.boolean(),
    starts_at: wallTime,
    ends_at: z
      .union([wallTime, z.literal("")])
      .nullish()
      .transform((v) => v || null),
    course_id: z
      .union([z.uuid(), z.literal("")])
      .nullish()
      .transform((v) => v || null),
    color: optionalHexColor(),
    visible_to_guardians: z.boolean(),
  })
  .refine((v) => !v.ends_at || v.ends_at >= v.starts_at, {
    path: ["ends_at"],
    message: "endBeforeStart",
  });

export type EventInput = z.input<typeof eventSchema>;
export type EventOutput = z.output<typeof eventSchema>;
