import type { Route } from "next";
import { ArrowLeftIcon, BookOpenIcon } from "lucide-react";
import { getFormatter, getTranslations } from "next-intl/server";
import { ButtonLink } from "@/components/button-link";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { TabLinks } from "@/components/tab-links";
import { AttendanceStatusBadge } from "@/features/attendance/components/attendance-status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  getChild,
  getChildCourses,
  parentCustomFieldsSchema,
} from "@/features/parent/queries";
import { firstParam } from "@/lib/pagination";
import { displayName } from "@/lib/people";
import { todayInTimeZone } from "@/lib/timezone";
import { createServerSupabase } from "@/server/supabase";
import { selectAll } from "@/server/select-all";
import { signMediaUrl } from "@/server/storage";
import { PersonAvatar } from "@/components/person-avatar";

const modules = ["courses", "grades", "attendance", "notes", "events"] as const;
export default async function ChildPage({
  params,
  searchParams,
}: PageProps<"/parent/[studentId]">) {
  const { studentId } = await params;
  const child = await getChild(studentId);
  const t = await getTranslations("parent"),
    labels = await getTranslations("students"),
    common = await getTranslations("common"),
    format = await getFormatter();
  const search = await searchParams;
  const allowedTabs = [
    "profile",
    ...modules.filter((module) => child.enabled_modules.includes(module)),
  ];
  const requested = firstParam(search.tab);
  const tab =
    requested && allowedTabs.includes(requested) ? requested : "profile";
  const base = `/parent/${studentId}` as const;
  const supabase = await createServerSupabase();
  const today = todayInTimeZone(child.school_timezone);
  const month = /^[1-9]\d{3}-(0[1-9]|1[0-2])$/.test(
    firstParam(search.month) ?? "",
  )
    ? firstParam(search.month)!
    : today.slice(0, 7);
  const monthStart = `${month}-01`;
  const monthEnd = new Date(Date.UTC(+month.slice(0, 4), +month.slice(5, 7), 0))
    .toISOString()
    .slice(0, 10);
  const empty = <EmptyState icon={BookOpenIcon} title={t("noRecords")} />;
  let content;
  if (tab === "profile") {
    const { data, error } = await supabase.rpc("guardian_student_profile", {
      p_student_id: studentId,
    });
    if (error) throw error;
    const profile = data[0];
    if (!profile) throw new Error("Guardian profile unavailable");
    const fields = parentCustomFieldsSchema.parse(profile.custom_fields);
    const photo = await signMediaUrl(profile.photo_path);
    content = (
      <Card>
        <CardContent className="space-y-6 pt-6">
          <PersonAvatar
            name={displayName(child)}
            src={photo}
            className="size-20"
          />
          <dl className="grid gap-4 sm:grid-cols-2">
            {[
              [labels("studentNumber"), profile.student_number],
              [labels("gradeLevel"), profile.grade_level],
              [labels("section"), profile.section],
              [
                labels("dateOfBirth"),
                profile.date_of_birth
                  ? format.dateTime(new Date(profile.date_of_birth), {
                      dateStyle: "medium",
                      timeZone: "UTC",
                    })
                  : null,
              ],
              ...fields.map((field) => [
                field.label,
                Array.isArray(field.value)
                  ? field.value.join(", ")
                  : typeof field.value === "boolean"
                    ? common(field.value ? "yes" : "no")
                    : String(field.value ?? ""),
              ]),
            ].map(([label, value], index) => (
              <div key={index}>
                <dt className="text-sm text-muted-foreground">{label}</dt>
                <dd>{value || common("notSet")}</dd>
              </div>
            ))}
          </dl>
        </CardContent>
      </Card>
    );
  } else if (tab === "grades") {
    const data = await selectAll((from, to) =>
      supabase
        .rpc("guardian_student_grades", { p_student_id: studentId })
        .range(from, to),
    );
    content = data.length ? (
      <div className="grid gap-4 sm:grid-cols-2">
        {data.map((grade) => (
          <Card key={grade.grade_id}>
            <CardHeader>
              <CardTitle>{grade.assessment_title}</CardTitle>
              <p className="text-sm text-muted-foreground">
                {grade.course_name}
              </p>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-xl font-semibold">
                {grade.score !== null
                  ? `${format.number(grade.score)} / ${format.number(grade.max_score)}`
                  : ""}{" "}
                {grade.letter}
              </p>
              {grade.assessed_on ? (
                <p className="text-sm text-muted-foreground">
                  {format.dateTime(new Date(grade.assessed_on), {
                    dateStyle: "medium",
                    timeZone: "UTC",
                  })}
                </p>
              ) : null}
              <p className="whitespace-pre-wrap text-sm">{grade.comment}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    ) : (
      empty
    );
  } else if (tab === "attendance") {
    const data = await selectAll((from, to) =>
      supabase
        .rpc("guardian_student_attendance", {
          p_student_id: studentId,
          p_from: monthStart,
          p_to: monthEnd,
        })
        .range(from, to),
    );
    content = (
      <div className="space-y-4">
        <form className="flex items-end gap-3">
          <input type="hidden" name="tab" value="attendance" />
          <label className="space-y-2 text-sm font-medium">
            {t("month")}
            <input
              type="month"
              name="month"
              defaultValue={month}
              required
              className="block rounded-md border bg-background p-2"
            />
          </label>
          <button type="submit" className="rounded-md border px-4 py-2 text-sm">
            {t("show")}
          </button>
        </form>
        {data.length ? (
          <Card>
            <CardContent className="divide-y pt-4">
              {data.map((record) => (
                <div
                  key={record.record_id}
                  className="flex flex-wrap items-center justify-between gap-3 py-3"
                >
                  <div>
                    <p>
                      {format.dateTime(new Date(record.attended_on), {
                        dateStyle: "medium",
                        timeZone: "UTC",
                      })}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {record.course_name ?? t("dailyAttendance")}
                      {record.period ? ` · ${record.period}` : ""}
                    </p>
                    {record.note ? (
                      <p className="whitespace-pre-wrap text-sm">
                        {record.note}
                      </p>
                    ) : null}
                  </div>
                  <AttendanceStatusBadge status={record.status} />
                </div>
              ))}
            </CardContent>
          </Card>
        ) : (
          empty
        )}
      </div>
    );
  } else if (tab === "courses") {
    const courses = await getChildCourses(studentId);
    content = courses.length ? (
      <div className="grid gap-4 sm:grid-cols-2">
        {courses.map((course) => (
          <Card key={course.course_id}>
            <CardHeader>
              <CardTitle>{course.name}</CardTitle>
              <p className="text-sm text-muted-foreground">
                {[course.subject, course.term_name].filter(Boolean).join(" · ")}
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              {course.teachers.map((teacher) => (
                <div key={teacher.id}>
                  <p className="font-medium">
                    {[teacher.title, teacher.first_name, teacher.last_name]
                      .filter(Boolean)
                      .join(" ") || common("unnamed")}
                  </p>
                  {teacher.email ? (
                    <a
                      href={`mailto:${teacher.email}`}
                      className="text-sm text-primary underline"
                    >
                      {teacher.email}
                    </a>
                  ) : null}
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    ) : (
      empty
    );
  } else if (tab === "notes") {
    const before = firstParam(search.before);
    const beforeId = firstParam(search.beforeId);
    const validBefore =
      before &&
      beforeId &&
      !Number.isNaN(Date.parse(before)) &&
      /^[a-f0-9-]{36}$/i.test(beforeId)
        ? before
        : undefined;
    const { data, error } = await supabase.rpc("guardian_student_notes_page", {
      p_student_id: studentId,
      p_before: validBefore,
      p_before_id: validBefore ? beforeId : undefined,
      p_limit: 20,
    });
    if (error) throw error;
    content = data.length ? (
      <div className="space-y-4">
        {data.map((note) => (
          <Card key={note.note_id}>
            <CardHeader>
              <CardTitle>{note.title ?? t("note")}</CardTitle>
              <p className="text-xs text-muted-foreground">
                {format.dateTime(new Date(note.created_at), {
                  dateStyle: "medium",
                  timeZone: child.school_timezone,
                })}{" "}
                {note.teacher_name}
              </p>
            </CardHeader>
            <CardContent className="whitespace-pre-wrap text-sm">
              {note.body}
            </CardContent>
          </Card>
        ))}
        {data.length === 20 ? (
          <ButtonLink
            href={
              `${base}?tab=notes&before=${encodeURIComponent(data.at(-1)!.created_at)}&beforeId=${data.at(-1)!.note_id}` as Route
            }
          >
            {t("olderNotes")}
          </ButtonLink>
        ) : null}
      </div>
    ) : (
      empty
    );
  } else {
    const now = new Date();
    const end = new Date(now.getTime() + 90 * 86400000);
    const data = await selectAll((from, to) =>
      supabase
        .rpc("guardian_student_events", {
          p_student_id: studentId,
          p_from: now.toISOString(),
          p_to: end.toISOString(),
        })
        .range(from, to),
    );
    content = data.length ? (
      <div className="space-y-4">
        {data.map((event) => (
          <Card key={event.event_id}>
            <CardHeader>
              <CardTitle>{event.title}</CardTitle>
              <p className="text-sm text-muted-foreground">
                {format.dateTime(new Date(event.starts_at), {
                  dateStyle: "medium",
                  ...(event.all_day ? {} : { timeStyle: "short" }),
                  timeZone: child.school_timezone,
                })}
                {event.location ? ` · ${event.location}` : ""}
              </p>
            </CardHeader>
            <CardContent className="whitespace-pre-wrap text-sm">
              {event.description}
            </CardContent>
          </Card>
        ))}
      </div>
    ) : (
      empty
    );
  }
  return (
    <>
      <ButtonLink href="/parent" variant="ghost" className="self-start">
        <ArrowLeftIcon />
        {t("title")}
      </ButtonLink>
      <PageHeader
        title={displayName(child)}
        description={`${child.school_name} · ${[child.grade_level, child.section].filter(Boolean).join(" / ")}`}
      />
      <TabLinks
        active={tab}
        tabs={allowedTabs.map((id) => ({
          id,
          label: t(`tabs.${id as "profile"}`),
          href: `${base}?tab=${id}`,
        }))}
      />
      {content}
    </>
  );
}
