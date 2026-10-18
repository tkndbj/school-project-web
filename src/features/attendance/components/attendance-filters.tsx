"use client";

import type { Route } from "next";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useTransition } from "react";
import { NativeSelect } from "@/components/native-select";
import { Card, CardContent } from "@/components/ui/card";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

/** Date / group selection for the attendance register, stored in the URL. */
export function AttendanceFilters(props: {
  date: string;
  grade: string;
  section: string;
  courseId: string;
  period: string;
  grades: string[];
  sections: string[];
  courses: { id: string; name: string }[];
}) {
  const t = useTranslations("attendance");
  const router = useRouter();
  const pathname = usePathname();
  const [, startTransition] = useTransition();

  function navigate(patch: Partial<Record<"date" | "grade" | "section" | "course" | "period", string>>) {
    const next = {
      date: props.date,
      grade: props.grade,
      section: props.section,
      course: props.courseId,
      period: props.period,
      ...patch,
    };
    const params = new URLSearchParams(Object.entries(next).filter(([, v]) => v) as [string, string][]);
    startTransition(() => router.replace(`${pathname}?${params.toString()}` as Route));
  }

  return (
    <Card>
      <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Field>
          <FieldLabel htmlFor="att-date">{t("date")}</FieldLabel>
          <Input id="att-date" type="date" value={props.date} onChange={(e) => e.target.value && navigate({ date: e.target.value })} />
        </Field>
        <Field>
          <FieldLabel htmlFor="att-grade">{t("gradeLevel")}</FieldLabel>
          <NativeSelect
            id="att-grade"
            value={props.grade}
            onChange={(e) => navigate({ grade: e.target.value, section: "", course: "", period: "" })}
          >
            <option value="">{t("choose")}</option>
            {props.grades.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field>
          <FieldLabel htmlFor="att-section">{t("section")}</FieldLabel>
          <NativeSelect
            id="att-section"
            value={props.section}
            disabled={!props.grade || props.sections.length === 0}
            onChange={(e) => navigate({ section: e.target.value })}
          >
            <option value="">{t("allSections")}</option>
            {props.sections.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </NativeSelect>
        </Field>
        {props.courses.length > 0 ? (
          <>
            <Field>
              <FieldLabel htmlFor="att-course">{t("orCourse")}</FieldLabel>
              <NativeSelect
                id="att-course"
                value={props.courseId}
                onChange={(e) => navigate({ course: e.target.value, grade: "", section: "" })}
              >
                <option value="">{t("dailyAttendance")}</option>
                {props.courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <Field>
              <FieldLabel htmlFor="att-period">{t("period")}</FieldLabel>
              <Input
                id="att-period"
                defaultValue={props.period}
                disabled={!props.courseId}
                placeholder={t("periodPlaceholder")}
                maxLength={50}
                onBlur={(e) => e.target.value !== props.period && navigate({ period: e.target.value.trim() })}
              />
            </Field>
          </>
        ) : null}
      </CardContent>
    </Card>
  );
}
