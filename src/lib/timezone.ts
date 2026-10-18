// Conversions between UTC instants and wall-clock times in an IANA time zone,
// using only Intl (no tz database shipped to the client). Wall-clock values use
// the <input type="datetime-local"> format "YYYY-MM-DDTHH:mm".

const pad = (n: number) => String(n).padStart(2, "0");

function partsIn(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((p) => p.type === type)?.value);
  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour: get("hour"),
    minute: get("minute"),
    second: get("second"),
  };
}

/** Offset of `timeZone` from UTC at `date`, in milliseconds (positive east of Greenwich). */
export function timeZoneOffsetMs(date: Date, timeZone: string): number {
  const p = partsIn(date, timeZone);
  const asUtc = Date.UTC(
    p.year,
    p.month - 1,
    p.day,
    p.hour,
    p.minute,
    p.second,
  );
  return asUtc - Math.floor(date.getTime() / 1000) * 1000;
}

/** "2026-10-20T09:00" in `timeZone` -> UTC Date. */
export function wallTimeToUtc(wallTime: string, timeZone: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?$/.exec(wallTime);
  if (!match) throw new RangeError(`Invalid wall time: ${wallTime}`);
  const [, y, mo, d, h = "0", mi = "0"] = match;
  const asDate = new Date(0);
  asDate.setUTCFullYear(+y!, +mo! - 1, +d!);
  asDate.setUTCHours(+h, +mi, 0, 0);
  const normalized = `${y}-${mo}-${d}T${h.padStart(2, "0")}:${mi.padStart(2, "0")}`;
  if (+y! < 1 || asDate.toISOString().slice(0, 16) !== normalized)
    throw new RangeError("Invalid calendar date");
  const asUtc = asDate.getTime();
  // Check both sides of transitions. Gaps are rejected; repeated wall times
  // consistently choose the earlier instant, rather than shifting the input.
  const offsets = new Set(
    [-2, -1, 0, 1, 2].map((days) =>
      timeZoneOffsetMs(new Date(asUtc + days * 86400000), timeZone),
    ),
  );
  const candidates = [...offsets]
    .map((offset) => new Date(asUtc - offset))
    .filter((date) => utcToWallTime(date, timeZone) === normalized)
    .sort((a, b) => a.getTime() - b.getTime());
  if (!candidates[0])
    throw new RangeError(
      "This local time does not exist in the school's time zone",
    );
  return candidates[0];
}

/** UTC instant -> "YYYY-MM-DDTHH:mm" in `timeZone`. */
export function utcToWallTime(
  instant: string | Date,
  timeZone: string,
): string {
  const p = partsIn(
    typeof instant === "string" ? new Date(instant) : instant,
    timeZone,
  );
  return `${p.year}-${pad(p.month)}-${pad(p.day)}T${pad(p.hour)}:${pad(p.minute)}`;
}

/** Today's calendar date ("YYYY-MM-DD") in `timeZone`. */
export function todayInTimeZone(timeZone: string, now = new Date()): string {
  return utcToWallTime(now, timeZone).slice(0, 10);
}
