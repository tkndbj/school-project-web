import type { Route } from "next";

/**
 * Returns a same-origin path for post-login redirects, or the fallback.
 * Rejects absolute URLs, protocol-relative URLs and backslash tricks so the
 * `next` parameter can never be used as an open redirect.
 */
export function safeNextPath(next: unknown, fallback: Route = "/"): Route {
  if (typeof next !== "string" || next.length === 0 || next.length > 2048) return fallback;
  if (!next.startsWith("/") || next.startsWith("//") || next.includes("\\")) return fallback;
  try {
    const url = new URL(next, "http://localhost");
    if (url.origin !== "http://localhost") return fallback;
    return `${url.pathname}${url.search}${url.hash}` as Route;
  } catch {
    return fallback;
  }
}
