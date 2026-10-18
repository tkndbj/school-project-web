import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/page-header";
import { AttendanceFilters } from "@/features/attendance/components/attendance-filters";
import { AttendanceRegister } from "@/features/attendance/components/attendance-register";
import { getRegister } from "@/features/attendance/queries";
import { listCourseOptions } from "@/features/courses/queries";
import { listGradeLevels, listSections } from "@/features/students/queries";
import { firstParam } from "@/lib/pagination";
import { todayInTimeZone } from "@/lib/timezone";
import { hasModule, requireModule } from "@/server/auth";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("schoolNav");
  return { title: t("attendance") };
}

export default async function AttendancePage({ params, searchParams }: PageProps<"/school/[slug]/attendance">) {
  const { slug } = await params;
  const query = await searchParams;
  const { school } = await requireModule(slug, "attendance");
  const t = await getTranslations("attendance");

  const requestedDate = firstParam(query.date);
  const date = requestedDate && /^\d{4}-\d{2}-\d{2}$/.test(requestedDate) ? requestedDate : todayInTimeZone(school.timezone);
  const grade = firstParam(query.grade)?.slice(0, 50) || undefined;
  const section = firstParam(query.section)?.slice(0, 50) || undefined;
  const courseParam = firstParam(query.course);
  const courseId = courseParam && /^[0-9a-f-]{36}$/i.test(courseParam) ? courseParam : undefined;
  const period = firstParam(query.period)?.slice(0, 50) || undefined;

  const [grades, sections, courses] = await Promise.all([
    listGradeLevels(school.id),
    grade ? listSections(school.id, grade) : Promise.resolve([]),
    hasModule(school, "courses") ? listCourseOptions(school.id) : Promise.resolve([]),
  ]);
  const hasSelection = Boolean(courseId || grade);
  const register = hasSelection ? await getRegister(school.id, { date, grade, section, courseId, period }) : [];

  return (
    <>
      <PageHeader title={t("title")} description={t("description")} />
      <AttendanceFilters
        date={date}
        grade={grade ?? ""}
        section={section ?? ""}
        courseId={courseId ?? ""}
        period={period ?? ""}
        grades={grades}
        sections={sections}
        courses={courses}
      />
      {hasSelection ? (
        <AttendanceRegister
          key={`${date}|${grade}|${section}|${courseId}|${period}`}
          schoolId={school.id}
          date={date}
          courseId={courseId ?? null}
          period={period ?? null}
          rows={register}
        />
      ) : (
        <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">{t("chooseGroup")}</p>
      )}
    </>
  );
}
