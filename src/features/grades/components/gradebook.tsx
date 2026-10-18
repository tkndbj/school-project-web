"use client";

import { SaveIcon, UsersIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, useState, useTransition } from "react";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { failWith } from "@/lib/errors";
import { saveGradebook } from "../actions";

type Row = {
  studentId: string;
  name: string;
  number: string | null;
  score: number | null;
  letter: string | null;
  comment: string | null;
};
type Draft = { score: string; letter: string; comment: string };

const toDraft = (row: Row): Draft => ({
  score: row.score === null ? "" : String(row.score),
  letter: row.letter ?? "",
  comment: row.comment ?? "",
});

/** Spreadsheet-like grade entry for one assessment. Saves all rows at once. */
export function Gradebook({
  schoolId,
  assessmentId,
  maxScore,
  rows,
}: {
  schoolId: string;
  assessmentId: string;
  maxScore: number;
  rows: Row[];
}) {
  const t = useTranslations("grades");
  const errorMessage = useErrorMessage();
  const [pending, startTransition] = useTransition();
  const initial = useMemo(
    () => Object.fromEntries(rows.map((r) => [r.studentId, toDraft(r)])),
    [rows],
  );
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  // Rows can change after a refresh (e.g. a newly enrolled student); fall back to stored values.
  const draftFor = (studentId: string) =>
    drafts[studentId] ?? initial[studentId]!;

  const changed = rows.filter((r) => {
    const d = draftFor(r.studentId);
    const o = initial[r.studentId]!;
    return (
      d.score !== o.score || d.letter !== o.letter || d.comment !== o.comment
    );
  });
  const invalid = new Set(
    rows
      .filter((r) => {
        const value = draftFor(r.studentId).score.trim().replace(",", ".");
        if (value === "") return false;
        const n = Number(value);
        return !Number.isFinite(n) || n < 0;
      })
      .map((r) => r.studentId),
  );

  function update(studentId: string, patch: Partial<Draft>) {
    setDrafts((current) => ({
      ...current,
      [studentId]: { ...(current[studentId] ?? initial[studentId]!), ...patch },
    }));
  }

  function save() {
    startTransition(async () => {
      const result = await saveGradebook(schoolId, assessmentId, {
        entries: changed.map((r) => ({
          student_id: r.studentId,
          ...draftFor(r.studentId),
        })),
      }).catch(() => failWith("network"));
      if (!result.ok) return void toast.error(errorMessage(result.error));
      setDrafts({});
      toast.success(t("gradesSaved"));
    });
  }

  if (rows.length === 0) {
    return (
      <EmptyState
        icon={UsersIcon}
        title={t("noEnrolledStudents")}
        description={t("noEnrolledStudentsDescription")}
      />
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("gradebook")}</CardTitle>
      </CardHeader>
      <CardContent className="px-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-4">{t("student")}</TableHead>
              <TableHead className="w-32">
                {t("scoreOutOf", { max: maxScore })}
              </TableHead>
              <TableHead className="w-24">{t("letter")}</TableHead>
              <TableHead className="hidden md:table-cell">
                {t("comment")}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => {
              const draft = draftFor(row.studentId);
              const overMax = Number(draft.score.replace(",", ".")) > maxScore;
              return (
                <TableRow key={row.studentId}>
                  <TableCell className="pl-4">
                    <div className="font-medium">{row.name}</div>
                    {row.number ? (
                      <div className="text-xs text-muted-foreground">
                        {row.number}
                      </div>
                    ) : null}
                  </TableCell>
                  <TableCell>
                    <Input
                      disabled={pending}
                      inputMode="decimal"
                      aria-label={t("scoreFor", { name: row.name })}
                      aria-invalid={invalid.has(row.studentId)}
                      value={draft.score}
                      onChange={(e) =>
                        update(row.studentId, { score: e.target.value })
                      }
                      className={cn(
                        "tabular-nums",
                        overMax && "border-amber-500",
                      )}
                      title={overMax ? t("aboveMax") : undefined}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      disabled={pending}
                      maxLength={10}
                      aria-label={t("letterFor", { name: row.name })}
                      value={draft.letter}
                      onChange={(e) =>
                        update(row.studentId, { letter: e.target.value })
                      }
                    />
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <Input
                      disabled={pending}
                      maxLength={2000}
                      aria-label={t("commentFor", { name: row.name })}
                      value={draft.comment}
                      onChange={(e) =>
                        update(row.studentId, { comment: e.target.value })
                      }
                    />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
      <CardFooter className="sticky bottom-0 justify-between gap-2 border-t bg-card">
        <span className="text-sm text-muted-foreground">
          {t("unsavedChanges", { count: changed.length })}
        </span>
        <Button
          onClick={save}
          disabled={pending || changed.length === 0 || invalid.size > 0}
        >
          {pending ? <Spinner /> : <SaveIcon />}
          {t("saveGrades")}
        </Button>
      </CardFooter>
    </Card>
  );
}
