"use client";

import { CheckCheckIcon, SaveIcon, UsersIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { EmptyState } from "@/components/empty-state";
import { useErrorMessage } from "@/components/forms/use-error-message";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { failWith } from "@/lib/errors";
import { saveRegister } from "../actions";
import { ATTENDANCE_STATUSES, type AttendanceStatus } from "../constants";

type Row = {
  studentId: string;
  name: string;
  number: string | null;
  status: AttendanceStatus | null;
  minutesLate: number | null;
  note: string | null;
};
type Entry = {
  status: AttendanceStatus | null;
  minutesLate: string;
  note: string;
};

const ACTIVE: Record<AttendanceStatus, string> = {
  present:
    "bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-600/90",
  absent: "bg-red-600 text-white border-red-600 hover:bg-red-600/90",
  late: "bg-amber-500 text-white border-amber-500 hover:bg-amber-500/90",
  excused: "bg-sky-600 text-white border-sky-600 hover:bg-sky-600/90",
};

export function AttendanceRegister({
  schoolId,
  date,
  courseId,
  period,
  rows,
}: {
  schoolId: string;
  date: string;
  courseId: string | null;
  period: string | null;
  rows: Row[];
}) {
  const t = useTranslations("attendance");
  const errorMessage = useErrorMessage();
  const [pending, startTransition] = useTransition();
  const stored = Object.fromEntries(
    rows.map((row) => [
      row.studentId,
      {
        status: row.status,
        minutesLate: row.minutesLate === null ? "" : String(row.minutesLate),
        note: row.note ?? "",
      },
    ]),
  );
  const [entries, setEntries] = useState<Record<string, Entry>>({});
  const entryFor = (id: string): Entry =>
    entries[id] ?? stored[id] ?? { status: null, minutesLate: "", note: "" };
  const changed = rows.filter(
    (row) =>
      entries[row.studentId] &&
      JSON.stringify(entries[row.studentId]) !==
        JSON.stringify(stored[row.studentId]),
  );
  const dirty = changed.length > 0;

  function update(id: string, patch: Partial<Entry>) {
    setEntries((current) => ({
      ...current,
      [id]: { ...entryFor(id), ...current[id], ...patch },
    }));
  }

  function markAllPresent() {
    setEntries((current) =>
      Object.fromEntries(
        rows.map((r) => [
          r.studentId,
          {
            ...entryFor(r.studentId),
            ...current[r.studentId],
            status: entryFor(r.studentId).status ?? "present",
          },
        ]),
      ),
    );
  }

  function save() {
    startTransition(async () => {
      const result = await saveRegister(schoolId, {
        date,
        course_id: courseId,
        period,
        entries: changed.map((r) => {
          const e = entryFor(r.studentId);
          const minutes = Number(e.minutesLate);
          return {
            student_id: r.studentId,
            status: e.status,
            minutes_late:
              e.status === "late" && e.minutesLate !== "" ? minutes : null,
            note: e.note,
          };
        }),
      }).catch(() => failWith("network"));
      if (!result.ok) return void toast.error(errorMessage(result.error));
      setEntries({});
      toast.success(t("saved", { count: result.data.saved }));
    });
  }

  if (rows.length === 0)
    return <EmptyState icon={UsersIcon} title={t("noStudents")} />;

  const marked = rows.filter((r) => entryFor(r.studentId).status).length;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle>{t("register", { marked, total: rows.length })}</CardTitle>
        <Button
          variant="outline"
          size="sm"
          onClick={markAllPresent}
          disabled={pending}
        >
          <CheckCheckIcon />
          {t("markRemainingPresent")}
        </Button>
      </CardHeader>
      <CardContent className="px-0">
        <ul className="divide-y">
          {rows.map((row) => {
            const entry = entryFor(row.studentId);
            return (
              <li
                key={row.studentId}
                className="grid gap-2 px-4 py-3 md:grid-cols-[1fr_auto_14rem] md:items-center"
              >
                <div className="min-w-0">
                  <div className="truncate font-medium">{row.name}</div>
                  {row.number ? (
                    <div className="text-xs text-muted-foreground">
                      {row.number}
                    </div>
                  ) : null}
                </div>
                <div
                  role="radiogroup"
                  aria-label={t("statusFor", { name: row.name })}
                  className="flex flex-wrap gap-1"
                >
                  {ATTENDANCE_STATUSES.map((status) => {
                    const selected = entry.status === status;
                    return (
                      <button
                        key={status}
                        type="button"
                        disabled={pending}
                        role="radio"
                        aria-checked={selected}
                        onClick={() =>
                          update(row.studentId, {
                            status: selected ? null : status,
                          })
                        }
                        className={cn(
                          "h-8 rounded-md border px-2.5 text-xs font-medium transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
                          selected
                            ? ACTIVE[status]
                            : "bg-background hover:bg-muted",
                        )}
                      >
                        {t(`statuses.${status}`)}
                      </button>
                    );
                  })}
                </div>
                <div className="flex gap-2">
                  {entry.status === "late" ? (
                    <Input
                      disabled={pending}
                      inputMode="numeric"
                      className="w-20"
                      placeholder={t("minutes")}
                      aria-label={t("minutesLateFor", { name: row.name })}
                      value={entry.minutesLate}
                      onChange={(e) =>
                        update(row.studentId, {
                          minutesLate: e.target.value
                            .replace(/\D/g, "")
                            .slice(0, 4),
                        })
                      }
                    />
                  ) : null}
                  <Input
                    disabled={pending}
                    placeholder={t("note")}
                    aria-label={t("noteFor", { name: row.name })}
                    maxLength={2000}
                    value={entry.note}
                    onChange={(e) =>
                      update(row.studentId, { note: e.target.value })
                    }
                  />
                </div>
              </li>
            );
          })}
        </ul>
      </CardContent>
      <CardFooter className="sticky bottom-0 justify-end gap-2 border-t bg-card">
        {dirty ? (
          <span className="mr-auto text-sm text-muted-foreground">
            {t("unsaved", { count: changed.length })}
          </span>
        ) : null}
        <Button onClick={save} disabled={pending || !dirty}>
          {pending ? <Spinner /> : <SaveIcon />}
          {t("save")}
        </Button>
      </CardFooter>
    </Card>
  );
}
