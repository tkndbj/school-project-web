// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import en from "../../../../messages/en.json";
import { saveRegister } from "../actions";
import { AttendanceRegister } from "./attendance-register";

vi.mock("../actions", () => ({ saveRegister: vi.fn() }));
afterEach(cleanup);
beforeEach(() => vi.mocked(saveRegister).mockReset());

it("marks only unmarked students and saves only changed rows", async () => {
  vi.mocked(saveRegister).mockResolvedValue({ ok: true, data: { saved: 1 } });
  render(
    <NextIntlClientProvider locale="en" messages={en} timeZone="UTC">
      <AttendanceRegister
        schoolId="school"
        date="2026-10-20"
        courseId={null}
        period={null}
        rows={[
          {
            studentId: "present",
            name: "Ada",
            number: null,
            status: "present",
            minutesLate: null,
            note: null,
          },
          {
            studentId: "absent",
            name: "Mert",
            number: null,
            status: "absent",
            minutesLate: null,
            note: null,
          },
          {
            studentId: "unmarked",
            name: "Deniz",
            number: null,
            status: null,
            minutesLate: null,
            note: null,
          },
        ]}
      />
    </NextIntlClientProvider>,
  );
  fireEvent.click(
    screen.getByRole("button", { name: "Mark remaining students present" }),
  );
  const mert = screen.getByRole("radiogroup", { name: "Attendance for Mert" });
  expect(
    within(mert)
      .getByRole("radio", { name: "Absent" })
      .getAttribute("aria-checked"),
  ).toBe("true");
  fireEvent.click(screen.getByRole("button", { name: "Save" }));
  await waitFor(() => expect(saveRegister).toHaveBeenCalledTimes(1));
  expect(vi.mocked(saveRegister).mock.calls[0]?.[1].entries).toEqual([
    { student_id: "unmarked", status: "present", minutes_late: null, note: "" },
  ]);
});

it("preserves the draft and allows retry after a transport failure", async () => {
  vi.mocked(saveRegister).mockRejectedValueOnce(new Error("offline"));
  render(
    <NextIntlClientProvider locale="en" messages={en} timeZone="UTC">
      <AttendanceRegister
        schoolId="school"
        date="2026-10-20"
        courseId={null}
        period={null}
        rows={[
          {
            studentId: "student",
            name: "Ada",
            number: null,
            status: null,
            minutesLate: null,
            note: null,
          },
        ]}
      />
    </NextIntlClientProvider>,
  );
  fireEvent.click(screen.getByRole("radio", { name: "Present" }));
  fireEvent.click(screen.getByRole("button", { name: "Save" }));
  await waitFor(() => expect(vi.mocked(saveRegister)).toHaveBeenCalledTimes(1));
  await waitFor(() =>
    expect(
      screen.getByRole("button", { name: "Save" }).hasAttribute("disabled"),
    ).toBe(false),
  );
  expect(
    screen.getByRole("radio", { name: "Present" }).getAttribute("aria-checked"),
  ).toBe("true");
});
