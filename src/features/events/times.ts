import { utcToWallTime, wallTimeToUtc } from "@/lib/timezone";
import type { EventOutput } from "./schema";

function offsetDate(date: string, days: number): string {
  const parsed = new Date(`${date}T00:00:00Z`);
  if (
    !Number.isFinite(parsed.getTime()) ||
    parsed.toISOString().slice(0, 10) !== date
  )
    throw new RangeError("Invalid calendar date");
  parsed.setUTCDate(parsed.getUTCDate() + days);
  return parsed.toISOString().slice(0, 10);
}

/** Date inputs for all-day events include the final day; storage uses an exclusive end. */
export function eventInstants(
  input: Pick<EventOutput, "starts_at" | "ends_at" | "all_day">,
  timezone: string,
) {
  const start = input.all_day ? input.starts_at.slice(0, 10) : input.starts_at;
  const end = input.all_day
    ? offsetDate(input.ends_at?.slice(0, 10) ?? start, 1)
    : input.ends_at;
  return {
    starts_at: wallTimeToUtc(start, timezone).toISOString(),
    ends_at: end ? wallTimeToUtc(end, timezone).toISOString() : null,
  };
}

export function allDayLastDate(exclusiveEnd: string, timezone: string): string {
  return offsetDate(utcToWallTime(exclusiveEnd, timezone).slice(0, 10), -1);
}
