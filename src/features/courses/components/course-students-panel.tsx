"use client";

import { UsersIcon, XIcon } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { AsyncSearchPicker } from "@/components/async-search-picker";
import { EmptyState } from "@/components/empty-state";
import { useErrorMessage } from "@/components/forms/use-error-message";
import { NativeSelect } from "@/components/native-select";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { schoolPath } from "../../school-panel/paths";
import { enrollByGrade, enrollStudent, searchStudentsAction, unenroll } from "../actions";

type Row = { enrollmentId: string; studentId: string; name: string; number: string | null; group: string | null };

export function CourseStudentsPanel({
  schoolId,
  slug,
  courseId,
  gradeLevels,
  enrollments,
}: {
  schoolId: string;
  slug: string;
  courseId: string;
  gradeLevels: string[];
  enrollments: Row[];
}) {
  const t = useTranslations("courses");
  const errorMessage = useErrorMessage();
  const [pending, startTransition] = useTransition();
  const [grade, setGrade] = useState(gradeLevels[0] ?? "");
  const [section, setSection] = useState("");

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
      <Card>
        <CardHeader>
          <CardTitle>{t("enrolledStudents", { count: enrollments.length })}</CardTitle>
        </CardHeader>
        <CardContent>
          {enrollments.length === 0 ? (
            <EmptyState icon={UsersIcon} title={t("noStudents")} description={t("noStudentsDescription")} />
          ) : (
            <ul className="divide-y">
              {enrollments.map((row) => (
                <li key={row.enrollmentId} className="flex items-center justify-between gap-2 py-2">
                  <div className="min-w-0">
                    <Link href={schoolPath(slug, "students", row.studentId)} className="font-medium hover:underline">
                      {row.name}
                    </Link>
                    <div className="text-xs text-muted-foreground">{[row.number, row.group].filter(Boolean).join(" · ")}</div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    disabled={pending}
                    aria-label={t("unenroll")}
                    onClick={() =>
                      startTransition(async () => {
                        const result = await unenroll(schoolId, row.enrollmentId);
                        if (!result.ok) toast.error(errorMessage(result.error));
                      })
                    }
                  >
                    <XIcon />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
      <div className="grid h-fit gap-6">
        <Card>
          <CardHeader>
            <CardTitle>{t("addStudent")}</CardTitle>
          </CardHeader>
          <CardContent>
            <AsyncSearchPicker
              search={(q) => searchStudentsAction(schoolId, q)}
              excludeIds={enrollments.map((e) => e.studentId)}
              placeholder={t("searchStudents")}
              onSelect={async (student) => {
                const result = await enrollStudent(schoolId, courseId, student.id);
                if (!result.ok) toast.error(errorMessage(result.error));
              }}
            />
          </CardContent>
        </Card>
        {gradeLevels.length > 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>{t("bulkEnroll")}</CardTitle>
              <CardDescription>{t("bulkEnrollDescription")}</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3">
              <Field>
                <FieldLabel htmlFor="bulk-grade">{t("gradeLevel")}</FieldLabel>
                <NativeSelect id="bulk-grade" value={grade} onChange={(e) => setGrade(e.target.value)}>
                  {gradeLevels.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
              <Field>
                <FieldLabel htmlFor="bulk-section">{t("sectionOptional")}</FieldLabel>
                <Input id="bulk-section" value={section} maxLength={50} onChange={(e) => setSection(e.target.value)} />
              </Field>
              <Button
                disabled={pending || !grade}
                onClick={() =>
                  startTransition(async () => {
                    const result = await enrollByGrade(schoolId, courseId, { grade_level: grade, section });
                    if (!result.ok) return void toast.error(errorMessage(result.error));
                    toast.success(t("bulkEnrolled", { count: result.data.enrolled }));
                  })
                }
              >
                {pending ? <Spinner /> : <UsersIcon />}
                {t("enrollGroup")}
              </Button>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
