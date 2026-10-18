import { expect, it } from "vitest";
import { safeNextPath } from "./navigation";

it.each([
  "https://evil.example",
  "//evil.example",
  "/\\evil.example",
  "/\n/evil.example",
  "javascript:alert(1)",
])("rejects open redirects: %s", (value) => {
  expect(safeNextPath(value, "/home")).toBe("/home");
});
it("preserves a same-origin path and query", () => {
  expect(safeNextPath("/school/demo/students?page=2")).toBe(
    "/school/demo/students?page=2",
  );
});
