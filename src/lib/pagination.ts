export const DEFAULT_PAGE_SIZE = 25;

export type PageParams = { page: number; pageSize: number; from: number; to: number };

/** Parses `?page=` into a safe 1-based page number and a PostgREST range. */
export function parsePage(value: unknown, pageSize = DEFAULT_PAGE_SIZE): PageParams {
  const raw = Array.isArray(value) ? value[0] : value;
  const parsed = Number.parseInt(typeof raw === "string" ? raw : "1", 10);
  const page = Number.isFinite(parsed) && parsed > 0 && parsed < 100_000 ? parsed : 1;
  const from = (page - 1) * pageSize;
  return { page, pageSize, from, to: from + pageSize - 1 };
}

export function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}
