import { expect, it } from "vitest";
import { allDayLastDate, eventInstants } from "./times";

it.each([
  ["2026-03-08", 23],
  ["2026-11-01", 25],
])("all-day event on %s spans its school calendar day", (date, hours) => {
  const range = eventInstants(
    { starts_at: date, ends_at: null, all_day: true },
    "America/New_York",
  );
  expect(
    (Date.parse(range.ends_at!) - Date.parse(range.starts_at)) / 3600000,
  ).toBe(hours);
  expect(allDayLastDate(range.ends_at!, "America/New_York")).toBe(date);
});
it("keeps the selected last day for a multi-day event", () => {
  const range = eventInstants(
    { starts_at: "2026-10-20", ends_at: "2026-10-22", all_day: true },
    "Europe/Istanbul",
  );
  expect(range.ends_at).toBe("2026-10-22T21:00:00.000Z");
  expect(allDayLastDate(range.ends_at!, "Europe/Istanbul")).toBe("2026-10-22");
});
