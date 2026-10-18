import type { CellValue, SheetRow } from "./mapping";

export const MAX_IMPORT_ROWS = 10_000;
export const MAX_IMPORT_BYTES = 10 * 1024 * 1024;

export type ParsedSheet = { headers: string[]; rows: SheetRow[] };

/** Reads a CSV or Excel (.xlsx) file in the browser. The first row must hold the column names. */
export async function parseSpreadsheet(file: File): Promise<ParsedSheet> {
  if (file.size > MAX_IMPORT_BYTES) throw new ImportFileError("tooLarge");
  const name = file.name.toLowerCase();

  let data: CellValue[][];
  if (name.endsWith(".xlsx")) {
    const { readSheet } = await import("read-excel-file/browser");
    data = (await readSheet(file)) as CellValue[][];
  } else if (name.endsWith(".csv") || name.endsWith(".txt") || file.type === "text/csv") {
    const Papa = (await import("papaparse")).default;
    const text = await file.text();
    const result = Papa.parse<string[]>(text.replace(/^﻿/, ""), { skipEmptyLines: "greedy" });
    data = result.data;
  } else {
    throw new ImportFileError("unsupported");
  }

  const [headerRow, ...rows] = data;
  if (!headerRow || headerRow.length === 0) throw new ImportFileError("empty");
  if (rows.length > MAX_IMPORT_ROWS) throw new ImportFileError("tooManyRows");

  const headers = headerRow.map((h, i) => (h === null || h === undefined || String(h).trim() === "" ? `#${i + 1}` : String(h).trim()));
  return { headers, rows };
}

export class ImportFileError extends Error {
  constructor(readonly reason: "tooLarge" | "unsupported" | "empty" | "tooManyRows") {
    super(reason);
  }
}
