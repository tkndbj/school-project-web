import "server-only";

/** PostgREST caps responses (max_rows = 1000); page through larger result sets. */
export const PAGE_SIZE = 1000;

export async function selectAll<T>(
  fetchPage: (
    from: number,
    to: number,
  ) => PromiseLike<{ data: T[] | null; error: unknown }>,
  maxRows = 10_000,
): Promise<T[]> {
  const rows: T[] = [];
  if (!Number.isSafeInteger(maxRows) || maxRows < 1)
    throw new RangeError("Invalid row limit");
  for (let from = 0; from <= maxRows; from += PAGE_SIZE) {
    const { data, error } = await fetchPage(
      from,
      Math.min(from + PAGE_SIZE - 1, maxRows),
    );
    if (error) throw error;
    if (rows.length + (data?.length ?? 0) > maxRows)
      throw new RangeError(
        "Too many records. Narrow the selection and try again.",
      );
    rows.push(...(data ?? []));
    if (!data || data.length < PAGE_SIZE) break;
  }
  return rows;
}
