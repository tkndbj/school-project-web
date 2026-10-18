import { describe, expect, it } from "vitest";
import {
  convertRows,
  IGNORE,
  parseDate,
  STUDENT_TARGETS,
  suggestMapping,
} from "./mapping";

describe("spreadsheet imports", () => {
  it("maps Turkish headings and never maps a target twice", () => {
    expect(
      suggestMapping(
        ["Öğrenci Numarası", "Adı", "Soyadı", "Adı"],
        STUDENT_TARGETS,
      ),
    ).toEqual(["student_number", "first_name", "last_name", IGNORE]);
  });
  it("keeps both guardians and marks the first as primary", () => {
    const rows = convertRows(
      [["Ada", "Anne", "mother", "Baba", "father"]],
      [
        "first_name",
        "guardian1.first_name",
        "guardian1.relationship",
        "guardian2.first_name",
        "guardian2.relationship",
      ],
      STUDENT_TARGETS,
    );
    expect(rows[0]?.data.guardians).toEqual([
      { first_name: "Anne", relationship: "mother", is_primary: true },
      { first_name: "Baba", relationship: "father" },
    ]);
  });
  it("skips invalid dates without silently rolling them forward", () => {
    expect(parseDate("31.02.2026")).toBeUndefined();
    expect(parseDate("20.10.2026")).toBe("2026-10-20");
    expect(
      convertRows([["31.02.2026"]], ["date_of_birth"], STUDENT_TARGETS)[0]
        ?.problems,
    ).toEqual([{ column: "date_of_birth", reason: "invalidDate" }]);
  });
});
