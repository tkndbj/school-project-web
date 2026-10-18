import { describe, expect, it } from "vitest";
import { todayInTimeZone, utcToWallTime, wallTimeToUtc } from "./timezone";

describe("school wall-clock time", () => {
  it("round-trips Istanbul times independently of the host zone", () => {
    expect(
      wallTimeToUtc("2026-10-20T09:00", "Europe/Istanbul").toISOString(),
    ).toBe("2026-10-20T06:00:00.000Z");
    expect(utcToWallTime("2026-10-20T06:00:00Z", "Europe/Istanbul")).toBe(
      "2026-10-20T09:00",
    );
  });
  it("uses the school's date across UTC midnight", () => {
    expect(
      todayInTimeZone("Europe/Istanbul", new Date("2026-10-19T22:30:00Z")),
    ).toBe("2026-10-20");
  });
  it.each([
    "2026-02-30T09:00",
    "2026-13-01T09:00",
    "2026-10-20T25:00",
    "2026-10-20T09:60",
  ])("rejects invalid calendar input %s", (value) => {
    expect(() => wallTimeToUtc(value, "UTC")).toThrow(RangeError);
  });
  it("rejects a local time inside a daylight-saving gap", () => {
    expect(() => wallTimeToUtc("2026-03-08T02:30", "America/New_York")).toThrow(
      RangeError,
    );
  });
  it("chooses the earlier occurrence during a repeated hour", () => {
    expect(
      wallTimeToUtc("2026-11-01T01:30", "America/New_York").toISOString(),
    ).toBe("2026-11-01T05:30:00.000Z");
  });
  it("handles date-only events at school midnight", () => {
    expect(wallTimeToUtc("2026-10-20", "Europe/Istanbul").toISOString()).toBe(
      "2026-10-19T21:00:00.000Z",
    );
  });
});
