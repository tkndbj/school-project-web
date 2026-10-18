import type { Route } from "next";

/** Builds a typed URL inside a school panel: schoolPath("abc", "students", id) -> /school/abc/students/<id>. */
export function schoolPath(slug: string, ...segments: string[]): Route {
  return [`/school/${encodeURIComponent(slug)}`, ...segments.map(encodeURIComponent)].join("/") as Route;
}
