import { describe, expect, it, vi } from "vitest";
import { selectAll } from "./select-all";

describe("paged database reads", () => {
  it("reads beyond PostgREST's first 1,000 rows", async () => {
    const all = Array.from({ length: 1001 }, (_, i) => i);
    const fetch = vi.fn(async (from: number, to: number) => ({
      data: all.slice(from, to + 1),
      error: null,
    }));
    expect(await selectAll(fetch)).toHaveLength(1001);
    expect(fetch.mock.calls).toEqual([
      [0, 999],
      [1000, 1999],
    ]);
  });
  it("propagates a failed page instead of returning partial data", async () => {
    const error = new Error("offline");
    await expect(selectAll(async () => ({ data: null, error }))).rejects.toBe(
      error,
    );
  });
  it("fails explicitly when a configured limit would truncate data", async () => {
    const all = Array.from({ length: 1001 }, (_, i) => i);
    await expect(
      selectAll(
        async (from, to) => ({ data: all.slice(from, to + 1), error: null }),
        1000,
      ),
    ).rejects.toThrow("Too many records");
  });
});
