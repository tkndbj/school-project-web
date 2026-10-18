"use client";

import { CheckCircle2Icon, DownloadIcon, FileSpreadsheetIcon, UploadIcon } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { useErrorMessage } from "@/components/forms/use-error-message";
import { NativeSelect } from "@/components/native-select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Spinner } from "@/components/ui/spinner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type { CustomFieldDefinition } from "../../custom-fields/values";
import { importStudentsBatch, importTeachersBatch, type ImportBatchResult } from "../actions";
import {
  chunk,
  convertRows,
  customTarget,
  IGNORE,
  STUDENT_TARGETS,
  suggestMapping,
  TEACHER_TARGETS,
  type ConvertedRow,
} from "../mapping";
import { ImportFileError, MAX_IMPORT_ROWS, parseSpreadsheet, type ParsedSheet } from "../parse-file";

const BATCH_SIZE = 500;

type RowError = { row: number; message: string };
type Summary = { inserted: number; updated: number; failed: number; errors: RowError[] };

export function ImportWizard({
  schoolId,
  kind,
  definitions,
  doneHref,
}: {
  schoolId: string;
  kind: "students" | "teachers";
  definitions: CustomFieldDefinition[];
  doneHref: string;
}) {
  const t = useTranslations("imports");
  const tTargets = useTranslations("importTargets");
  const tErrors = useTranslations("errors");
  const errorMessage = useErrorMessage();
  const fileInput = useRef<HTMLInputElement>(null);

  const targets = kind === "students" ? STUDENT_TARGETS : TEACHER_TARGETS;
  const [fileName, setFileName] = useState<string | null>(null);
  const [sheet, setSheet] = useState<ParsedSheet | null>(null);
  const [mapping, setMapping] = useState<string[]>([]);
  const [progress, setProgress] = useState<number | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [parsing, setParsing] = useState(false);

  const targetOptions = useMemo(
    () => [
      ...targets.map((target) => ({ value: target.key, label: tTargets(target.key.replace(".", "_") as "first_name") })),
      ...definitions.map((d) => ({ value: customTarget(d.key), label: `${d.label} (${t("customField")})` })),
    ],
    [targets, definitions, t, tTargets],
  );

  const converted: ConvertedRow[] = useMemo(
    () => (sheet ? convertRows(sheet.rows, mapping, targets, definitions) : []),
    [sheet, mapping, targets, definitions],
  );
  const withProblems = converted.filter((r) => r.problems.length > 0);
  const ready = converted.filter((r) => r.problems.length === 0 && Object.keys(r.data).length > 0);
  const mappedCount = mapping.filter((m) => m !== IGNORE).length;

  async function onFile(file: File) {
    setParsing(true);
    setSummary(null);
    try {
      const parsed = await parseSpreadsheet(file);
      setSheet(parsed);
      setFileName(file.name);
      setMapping(suggestMapping(parsed.headers, targets, definitions));
    } catch (error) {
      const reason = error instanceof ImportFileError ? error.reason : "unreadable";
      toast.error(t(`fileErrors.${reason}`, { max: MAX_IMPORT_ROWS }));
    } finally {
      setParsing(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  async function runImport() {
    const action = kind === "students" ? importStudentsBatch : importTeachersBatch;
    const batches = chunk(ready, BATCH_SIZE);
    const result: Summary = {
      inserted: 0,
      updated: 0,
      failed: withProblems.length,
      errors: withProblems.map((r) => ({
        row: r.sourceRow,
        message: r.problems.map((p) => t(`problems.${p.reason}`, { column: tTargets(p.column.replace(".", "_") as "first_name") })).join(", "),
      })),
    };
    setProgress(0);

    for (const [i, batch] of batches.entries()) {
      const response = await action(
        schoolId,
        batch.map((r) => r.data),
        i === batches.length - 1,
      );
      if (!response.ok) {
        toast.error(errorMessage(response.error));
        result.failed += batch.length;
        result.errors.push(...batch.map((r) => ({ row: r.sourceRow, message: errorMessage(response.error) })));
      } else {
        const data: ImportBatchResult = response.data;
        result.inserted += data.inserted;
        result.updated += data.updated;
        result.failed += data.failed;
        result.errors.push(
          ...data.errors.map((e) => ({
            row: batch[e.index]?.sourceRow ?? 0,
            message: describeDbError(e.code, e.message, e.detail),
          })),
        );
      }
      setProgress(Math.round(((i + 1) / batches.length) * 100));
    }
    result.errors.sort((a, b) => a.row - b.row);
    setSummary(result);
    setProgress(null);
  }

  function describeDbError(code: string, message: string, detail?: string) {
    switch (code) {
      case "23505":
        return tErrors("duplicate");
      case "23514":
        return message.includes("identifiable") ? tErrors("missingIdentifier") : tErrors("invalidValue");
      case "SC001":
        return tErrors("customField", { detail: detail ?? "" });
      case "SC030":
        return tErrors("importFormat", { detail: detail ?? message });
      case "22P02":
      case "22007":
      case "22008":
        return tErrors("invalidValue");
      default:
        return message;
    }
  }

  function downloadErrors() {
    if (!summary) return;
    const lines = [["row", "error"], ...summary.errors.map((e) => [String(e.row), e.message])];
    const csv = lines.map((l) => l.map((v) => `"${v.replace(/"/g, '""')}"`).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `import-errors-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // ------------------------------------------------------------------ results
  if (summary) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2Icon className="size-5 text-emerald-600" aria-hidden />
            {t("finished")}
          </CardTitle>
          <CardDescription>
            {t("summary", { inserted: summary.inserted, updated: summary.updated, failed: summary.failed })}
          </CardDescription>
        </CardHeader>
        {summary.errors.length > 0 ? (
          <CardContent className="space-y-3">
            <div className="max-h-80 overflow-y-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-20">{t("row")}</TableHead>
                    <TableHead>{t("problem")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {summary.errors.slice(0, 500).map((e, i) => (
                    <TableRow key={`${e.row}-${i}`}>
                      <TableCell className="tabular-nums">{e.row}</TableCell>
                      <TableCell>{e.message}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <Button variant="outline" onClick={downloadErrors}>
              <DownloadIcon />
              {t("downloadErrors")}
            </Button>
          </CardContent>
        ) : null}
        <CardFooter className="gap-2">
          <Link href={doneHref as Route} className={buttonVariants()}>
            {t("done")}
          </Link>
          <Button
            variant="outline"
            onClick={() => {
              setSummary(null);
              setSheet(null);
              setFileName(null);
            }}
          >
            {t("importAnother")}
          </Button>
        </CardFooter>
      </Card>
    );
  }

  // ------------------------------------------------------------------- upload
  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle>{t("step1")}</CardTitle>
          <CardDescription>{t(kind === "students" ? "step1StudentsDescription" : "step1TeachersDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <input
            ref={fileInput}
            type="file"
            accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            className="sr-only"
            tabIndex={-1}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void onFile(file);
            }}
          />
          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const file = e.dataTransfer.files[0];
              if (file) void onFile(file);
            }}
            className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-8 text-center transition-colors hover:bg-muted/50 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
          >
            {parsing ? <Spinner className="size-6" /> : <FileSpreadsheetIcon className="size-8 text-muted-foreground" aria-hidden />}
            <span className="font-medium">{fileName ?? t("chooseFile")}</span>
            <span className="text-xs text-muted-foreground">{t("fileHint", { max: MAX_IMPORT_ROWS })}</span>
          </button>
        </CardContent>
      </Card>

      {sheet ? (
        <Card>
          <CardHeader>
            <CardTitle>{t("step2")}</CardTitle>
            <CardDescription>{t("step2Description", { rows: converted.length })}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {sheet.headers.map((header, column) => (
                <div key={`${header}-${column}`} className="space-y-1.5 rounded-lg border p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-medium" title={header}>
                      {header}
                    </span>
                    {mapping[column] !== IGNORE ? <Badge variant="secondary">{t("mapped")}</Badge> : null}
                  </div>
                  <p className="truncate text-xs text-muted-foreground">
                    {sheet.rows
                      .slice(0, 3)
                      .map((r) => (r[column] instanceof Date ? (r[column] as Date).toISOString().slice(0, 10) : r[column]))
                      .filter((v) => v !== null && v !== undefined && v !== "")
                      .join(" · ") || "—"}
                  </p>
                  <NativeSelect
                    aria-label={t("mapColumn", { column: header })}
                    value={mapping[column] ?? IGNORE}
                    onChange={(e) => {
                      const value = e.target.value;
                      setMapping((current) =>
                        current.map((m, i) => (i === column ? value : m === value && value !== IGNORE ? IGNORE : m)),
                      );
                    }}
                  >
                    <option value={IGNORE}>{t("ignoreColumn")}</option>
                    {targetOptions.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </NativeSelect>
                </div>
              ))}
            </div>
            {withProblems.length > 0 ? (
              <Alert>
                <AlertTitle>{t("problemsTitle", { count: withProblems.length })}</AlertTitle>
                <AlertDescription>{t("problemsDescription")}</AlertDescription>
              </Alert>
            ) : null}
            {kind === "students" ? (
              <p className="text-sm text-muted-foreground">{t("upsertHint")}</p>
            ) : (
              <p className="text-sm text-muted-foreground">{t("upsertHintTeachers")}</p>
            )}
          </CardContent>
          <CardFooter className="flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
            <span className={cn("text-sm", mappedCount === 0 ? "text-destructive" : "text-muted-foreground")}>
              {mappedCount === 0 ? t("nothingMapped") : t("readyCount", { count: ready.length })}
            </span>
            <Button onClick={runImport} disabled={progress !== null || ready.length === 0}>
              {progress !== null ? <Spinner /> : <UploadIcon />}
              {t("startImport", { count: ready.length })}
            </Button>
          </CardFooter>
          {progress !== null ? (
            <CardContent>
              <Progress value={progress} aria-label={t("progress")} />
            </CardContent>
          ) : null}
        </Card>
      ) : null}
    </div>
  );
}
