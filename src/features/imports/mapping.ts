// Spreadsheet import: column auto-mapping and row conversion. Pure functions,
// shared by the import wizard (browser) and unit tests. The database validates
// everything again (see public.import_students / import_teachers).

import type { CustomFieldDefinition } from "../custom-fields/values";

export type CellValue = string | number | boolean | Date | null | undefined;
export type SheetRow = CellValue[];

export type ImportTarget = {
  key: string;
  /** Lower-case, accent-free header spellings (English and Turkish) that map to this target. */
  synonyms: string[];
  kind?:
    "text" | "date" | "gender" | "studentStatus" | "relationship" | "boolean";
};

export const IGNORE = "__ignore__";
const CUSTOM_PREFIX = "custom:";

export const STUDENT_TARGETS: ImportTarget[] = [
  {
    key: "student_number",
    synonyms: [
      "student number",
      "student no",
      "number",
      "no",
      "id",
      "ogrenci no",
      "ogrenci numarasi",
      "okul no",
      "numara",
    ],
  },
  {
    key: "first_name",
    synonyms: [
      "first name",
      "firstname",
      "given name",
      "name",
      "ad",
      "adi",
      "isim",
    ],
  },
  {
    key: "last_name",
    synonyms: [
      "last name",
      "lastname",
      "surname",
      "family name",
      "soyad",
      "soyadi",
    ],
  },
  {
    key: "preferred_name",
    synonyms: ["preferred name", "nickname", "tercih edilen ad", "lakap"],
  },
  {
    key: "date_of_birth",
    kind: "date",
    synonyms: [
      "date of birth",
      "dob",
      "birth date",
      "birthday",
      "dogum tarihi",
    ],
  },
  { key: "gender", kind: "gender", synonyms: ["gender", "sex", "cinsiyet"] },
  {
    key: "grade_level",
    synonyms: [
      "grade",
      "grade level",
      "year",
      "class",
      "sinif",
      "sinif seviyesi",
    ],
  },
  { key: "section", synonyms: ["section", "group", "sube", "grup"] },
  { key: "email", synonyms: ["email", "e-mail", "mail", "e posta", "eposta"] },
  {
    key: "phone",
    synonyms: ["phone", "telephone", "mobile", "telefon", "cep telefonu"],
  },
  { key: "address", synonyms: ["address", "adres"] },
  {
    key: "enrolled_on",
    kind: "date",
    synonyms: ["enrolled on", "enrollment date", "start date", "kayit tarihi"],
  },
  { key: "status", kind: "studentStatus", synonyms: ["status", "durum"] },
  {
    key: "notes",
    synonyms: ["notes", "note", "comments", "notlar", "aciklama"],
  },
  ...guardianTargets(1),
  ...guardianTargets(2),
];

export const TEACHER_TARGETS: ImportTarget[] = [
  {
    key: "staff_number",
    synonyms: [
      "staff number",
      "staff no",
      "employee number",
      "number",
      "id",
      "sicil no",
      "personel no",
    ],
  },
  { key: "title", synonyms: ["title", "unvan"] },
  {
    key: "first_name",
    synonyms: ["first name", "firstname", "name", "ad", "adi", "isim"],
  },
  {
    key: "last_name",
    synonyms: ["last name", "lastname", "surname", "soyad", "soyadi"],
  },
  { key: "email", synonyms: ["email", "e-mail", "mail", "e posta", "eposta"] },
  { key: "phone", synonyms: ["phone", "telephone", "mobile", "telefon"] },
  {
    key: "date_of_birth",
    kind: "date",
    synonyms: ["date of birth", "dob", "birth date", "dogum tarihi"],
  },
  { key: "gender", kind: "gender", synonyms: ["gender", "sex", "cinsiyet"] },
  { key: "subject", synonyms: ["subject", "branch", "brans", "ders"] },
  { key: "bio", synonyms: ["bio", "about", "biography", "hakkinda"] },
];

function guardianTargets(n: 1 | 2): ImportTarget[] {
  const p = `guardian${n}`;
  const tr = n === 1 ? ["veli", "veli 1", "veli1"] : ["veli 2", "veli2"];
  const en =
    n === 1
      ? ["guardian", "parent", "guardian 1", "parent 1"]
      : ["guardian 2", "parent 2"];
  const variants = (suffixesEn: string[], suffixesTr: string[]) => [
    ...en.flatMap((base) => suffixesEn.map((s) => `${base} ${s}`)),
    ...tr.flatMap((base) => suffixesTr.map((s) => `${base} ${s}`)),
  ];
  return [
    {
      key: `${p}.first_name`,
      synonyms: variants(["first name", "name"], ["adi", "ad"]),
    },
    {
      key: `${p}.last_name`,
      synonyms: variants(["last name", "surname"], ["soyadi", "soyad"]),
    },
    {
      key: `${p}.email`,
      synonyms: variants(
        ["email", "e-mail", "mail"],
        ["e posta", "eposta", "email"],
      ),
    },
    {
      key: `${p}.phone`,
      synonyms: variants(["phone", "mobile"], ["telefon", "cep"]),
    },
    {
      key: `${p}.relationship`,
      kind: "relationship",
      synonyms: variants(
        ["relationship", "relation"],
        ["yakinlik", "yakinligi"],
      ),
    },
  ];
}

/** Lower-case, strips accents (incl. Turkish dotless i) and punctuation. */
export function normalizeHeader(header: string): string {
  return header
    .toLocaleLowerCase("tr")
    .replace(/ı/g, "i")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function customTarget(key: string) {
  return `${CUSTOM_PREFIX}${key}`;
}

/** Suggests a target for every column; each target is used at most once. */
export function suggestMapping(
  headers: string[],
  targets: ImportTarget[],
  definitions: Pick<CustomFieldDefinition, "key" | "label">[] = [],
): string[] {
  const used = new Set<string>();
  return headers.map((header) => {
    const normalized = normalizeHeader(header);
    const builtIn = targets.find(
      (t) =>
        !used.has(t.key) &&
        (t.synonyms.includes(normalized) ||
          normalizeHeader(t.key) === normalized),
    );
    const custom = builtIn
      ? undefined
      : definitions.find(
          (d) =>
            !used.has(customTarget(d.key)) &&
            (normalizeHeader(d.label) === normalized ||
              normalizeHeader(d.key) === normalized),
        );
    const target =
      builtIn?.key ?? (custom ? customTarget(custom.key) : undefined);
    if (!target) return IGNORE;
    used.add(target);
    return target;
  });
}

// ---------------------------------------------------------------- converters

const pad = (n: number) => String(n).padStart(2, "0");

/** Accepts ISO dates, DD.MM.YYYY, DD/MM/YYYY, DD-MM-YYYY and spreadsheet Date cells. */
export function parseDate(value: CellValue): string | null | undefined {
  if (value === null || value === undefined || value === "") return null;
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return undefined;
    return `${value.getUTCFullYear()}-${pad(value.getUTCMonth() + 1)}-${pad(value.getUTCDate())}`;
  }
  const text = String(value).trim();
  let match = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(text);
  if (match) return validDate(+match[1]!, +match[2]!, +match[3]!);
  match = /^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/.exec(text);
  if (match) return validDate(+match[3]!, +match[2]!, +match[1]!);
  return undefined; // unparseable
}

function validDate(
  year: number,
  month: number,
  day: number,
): string | undefined {
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  )
    return undefined;
  return `${year}-${pad(month)}-${pad(day)}`;
}

const GENDER_VALUES: Record<string, string> = {
  f: "female",
  female: "female",
  girl: "female",
  woman: "female",
  k: "female",
  kadin: "female",
  kiz: "female",
  m: "male",
  male: "male",
  boy: "male",
  man: "male",
  e: "male",
  erkek: "male",
  other: "other",
  diger: "other",
};

const STATUS_VALUES: Record<string, string> = {
  active: "active",
  aktif: "active",
  inactive: "inactive",
  pasif: "inactive",
  graduated: "graduated",
  mezun: "graduated",
  transferred: "transferred",
  nakil: "transferred",
  "nakil gitti": "transferred",
};

const RELATIONSHIP_VALUES: Record<string, string> = {
  mother: "mother",
  mom: "mother",
  anne: "mother",
  father: "father",
  dad: "father",
  baba: "father",
  guardian: "guardian",
  vasi: "guardian",
  veli: "guardian",
  grandparent: "grandparent",
  grandmother: "grandparent",
  grandfather: "grandparent",
  babaanne: "grandparent",
  anneanne: "grandparent",
  dede: "grandparent",
  sibling: "sibling",
  brother: "sibling",
  sister: "sibling",
  kardes: "sibling",
  abi: "sibling",
  abla: "sibling",
  other: "other",
  diger: "other",
};

function lookup(
  table: Record<string, string>,
  value: CellValue,
): string | null | undefined {
  if (value === null || value === undefined || value === "") return null;
  return table[normalizeHeader(String(value))] ?? undefined;
}

function text(value: CellValue): string | null {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return parseDate(value) ?? null;
  const s = String(value).trim();
  return s === "" ? null : s;
}

function convertCustomValue(
  def: Pick<CustomFieldDefinition, "field_type" | "options">,
  value: CellValue,
) {
  if (value === null || value === undefined || value === "") return null;
  switch (def.field_type) {
    case "number": {
      if (typeof value === "number") return value;
      const n = Number(String(value).trim().replace(",", "."));
      return Number.isFinite(n) ? n : String(value);
    }
    case "boolean": {
      if (typeof value === "boolean") return value;
      const v = normalizeHeader(String(value));
      if (["yes", "y", "true", "1", "evet", "e", "x"].includes(v)) return true;
      if (["no", "n", "false", "0", "hayir", "h"].includes(v)) return false;
      return String(value);
    }
    case "date":
      return parseDate(value) ?? String(value);
    case "multi_select":
      return String(value)
        .split(/[;,]/)
        .map((s) => s.trim())
        .filter(Boolean);
    default:
      return text(value);
  }
}

export type ConvertedRow = {
  /** 1-based spreadsheet row number (header is row 1). */
  sourceRow: number;
  data: Record<string, unknown>;
  /** Problems detected before sending (the row is skipped). */
  problems: {
    column: string;
    reason:
      "invalidDate" | "invalidGender" | "invalidStatus" | "invalidRelationship";
  }[];
};

/**
 * Turns sheet rows into import payloads according to `mapping` (one target per
 * column). Guardian columns become a `guardians` array; custom fields go into
 * `custom_fields`. Completely empty rows are dropped.
 */
export function convertRows(
  rows: SheetRow[],
  mapping: string[],
  targets: ImportTarget[],
  definitions: Pick<
    CustomFieldDefinition,
    "key" | "field_type" | "options"
  >[] = [],
  firstDataRow = 2,
): ConvertedRow[] {
  const targetByKey = new Map(targets.map((t) => [t.key, t]));
  const defByKey = new Map(definitions.map((d) => [d.key, d]));
  const converted: ConvertedRow[] = [];

  rows.forEach((row, index) => {
    if (
      row.every(
        (cell) =>
          cell === null || cell === undefined || String(cell).trim() === "",
      )
    )
      return;

    const data: Record<string, unknown> = {};
    const custom: Record<string, unknown> = {};
    const guardians: Record<string, Record<string, unknown>> = {};
    const problems: ConvertedRow["problems"] = [];

    mapping.forEach((targetKey, column) => {
      if (targetKey === IGNORE) return;
      const value = row[column];

      if (targetKey.startsWith(CUSTOM_PREFIX)) {
        const def = defByKey.get(targetKey.slice(CUSTOM_PREFIX.length));
        if (!def) return;
        const v = convertCustomValue(def, value);
        if (v !== null && !(Array.isArray(v) && v.length === 0))
          custom[def.key] = v;
        return;
      }

      const target = targetByKey.get(targetKey);
      if (!target) return;
      let converted: unknown;
      switch (target.kind) {
        case "date":
          converted = parseDate(value);
          if (converted === undefined)
            problems.push({ column: targetKey, reason: "invalidDate" });
          break;
        case "gender":
          converted = lookup(GENDER_VALUES, value);
          if (converted === undefined)
            problems.push({ column: targetKey, reason: "invalidGender" });
          break;
        case "studentStatus":
          converted = lookup(STATUS_VALUES, value);
          if (converted === undefined)
            problems.push({ column: targetKey, reason: "invalidStatus" });
          break;
        case "relationship":
          converted = lookup(RELATIONSHIP_VALUES, value);
          if (converted === undefined)
            problems.push({ column: targetKey, reason: "invalidRelationship" });
          break;
        default:
          converted =
            targetKey === "email" || targetKey.endsWith(".email")
              ? (text(value)?.toLowerCase() ?? null)
              : text(value);
      }
      if (converted === null || converted === undefined) return;

      const dot = targetKey.indexOf(".");
      if (dot > 0) {
        const group = targetKey.slice(0, dot);
        (guardians[group] ??= {})[targetKey.slice(dot + 1)] = converted;
      } else {
        data[targetKey] = converted;
      }
    });

    if (Object.keys(custom).length > 0) data.custom_fields = custom;
    const guardianList = Object.keys(guardians)
      .sort()
      .map((group, i): Record<string, unknown> => ({
        ...guardians[group],
        ...(i === 0 ? { is_primary: true } : {}),
      }))
      .filter((g) => g.first_name || g.last_name || g.email || g.phone);
    if (guardianList.length > 0) data.guardians = guardianList;

    converted.push({ sourceRow: index + firstDataRow, data, problems });
  });

  return converted;
}

/** Splits an array into chunks of at most `size` items. */
export function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size)
    chunks.push(items.slice(i, i + size));
  return chunks;
}
