// Maps database / API errors to stable, translatable keys (see docs/database.md).
// Shared by server actions and client components.

export type AppErrorKey =
  | "forbidden"
  | "notFound"
  | "duplicate"
  | "invalidReference"
  | "missingIdentifier"
  | "invalidValue"
  | "customField"
  | "invalidTimezone"
  | "schoolRequiresAdmin"
  | "invalidRange"
  | "importFormat"
  | "rateLimited"
  | "invalidCredentials"
  | "weakPassword"
  | "samePassword"
  | "network"
  | "unknown";

export type AppError = {
  key: AppErrorKey;
  /** Machine-readable reason from the database (message), e.g. "custom_field_unknown". */
  reason?: string;
  /** Extra context, e.g. the custom field key or column name. */
  detail?: string;
};

export type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: AppError; fieldErrors?: Record<string, string[]> };

type PostgrestLikeError = { code?: string; message?: string; details?: string | null };

export function toAppError(error: unknown): AppError {
  if (!error || typeof error !== "object") return { key: "unknown" };
  const { code, message, details } = error as PostgrestLikeError;
  const reason = message || undefined;
  const detail = details || undefined;

  switch (code) {
    case "42501":
    case "PGRST301":
      return { key: "forbidden", reason, detail };
    case "PGRST116":
      return { key: "notFound", reason };
    case "23505":
      return { key: "duplicate", reason, detail };
    case "23503":
      return { key: "invalidReference", reason, detail };
    case "23514":
      return reason?.includes("identifiable")
        ? { key: "missingIdentifier", reason }
        : { key: "invalidValue", reason, detail };
    case "23502":
    case "22P02":
    case "22007":
    case "22008":
    case "22023":
      return { key: "invalidValue", reason, detail };
    case "SC001":
      return { key: "customField", reason, detail };
    case "SC010":
      return { key: "invalidTimezone", reason };
    case "SC011":
      return { key: "schoolRequiresAdmin", reason };
    case "SC020":
      return { key: "invalidRange", reason };
    case "SC030":
      return { key: "importFormat", reason, detail };
    default:
      if (message?.toLowerCase().includes("fetch failed")) return { key: "network" };
      return { key: "unknown", reason };
  }
}

export function ok<T>(data: T): ActionResult<T>;
export function ok(): ActionResult<void>;
export function ok<T>(data?: T): ActionResult<T | void> {
  return { ok: true, data };
}

export function fail(error: unknown, fieldErrors?: Record<string, string[]>): ActionResult<never> {
  return { ok: false, error: toAppError(error), fieldErrors };
}

export function failWith(key: AppErrorKey, extra?: Omit<AppError, "key">): ActionResult<never> {
  return { ok: false, error: { key, ...extra } };
}
