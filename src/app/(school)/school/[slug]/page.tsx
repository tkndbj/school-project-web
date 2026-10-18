import { CalendarDaysIcon, GraduationCapIcon, PlusIcon, UploadIcon } from "lucide-react";
import type { Metadata } from "next";
import { getFormatter, getTranslations } from "next-intl/server";
import { ButtonLink } from "@/components/button-link";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { schoolPath } from "@/features/school-panel/paths";
import { hasModule, requireSchool } from "@/server/auth";
import { createServerSupabase } from "@/server/supabase";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("schoolNav");
  return { title: t("dashboard") };
}

const ATTENDANCE_STATUSES = ["present", "absent", "late", "excused"] as const;

export default async function SchoolDashboardPage({ params }: PageProps<"/school/[slug]">) {
  const { slug } = await params;
  const { school } = await requireSchool(slug);
  const t = await getTranslations("dashboard");
  const tAttendance = await getTranslations("attendance");
  const format = await getFormatter();
  const supabase = await createServerSupabase();

  const [{ data: statsRows, error }, { data: events }] = await Promise.all([
    supabase.rpc("school_dashboard_stats", { p_school_id: school.id }),
    hasModule(school, "events")
      ? supabase
          .from("events")
          .select("id, title, starts_at, all_day, location")
          .eq("school_id", school.id)
          .gte("starts_at", new Date().toISOString())
          .order("starts_at")
          .limit(5)
      : Promise.resolve({ data: [] as { id: string; title: string; starts_at: string; all_day: boolean; location: string | null }[] }),
  ]);
  if (error) throw error;
  const stats = statsRows[0]!;
  const attendanceToday = (stats.attendance_today ?? {}) as Partial<Record<(typeof ATTENDANCE_STATUSES)[number], number>>;

  const cards = [
    { label: t("activeStudents"), value: stats.students_active, hint: t("ofTotal", { total: stats.students_total }) },
    ...(hasModule(school, "teachers") ? [{ label: t("teachers"), value: stats.teachers_total }] : []),
    ...(hasModule(school, "courses") ? [{ label: t("courses"), value: stats.courses_total }] : []),
    {
      label: t("linkedParents"),
      value: stats.guardians_linked,
      hint: t("ofGuardians", { total: stats.guardians_total }),
    },
  ];

  return (
    <>
      <PageHeader
        title={school.name}
        description={t("description")}
        actions={
          <>
            <ButtonLink href={schoolPath(slug, "students", "import")} variant="outline">
              <UploadIcon />
              {t("importStudents")}
            </ButtonLink>
            <ButtonLink href={schoolPath(slug, "students", "new")}>
              <PlusIcon />
              {t("addStudent")}
            </ButtonLink>
          </>
        }
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <Card key={card.label}>
            <CardHeader>
              <CardDescription>{card.label}</CardDescription>
              <CardTitle className="text-3xl tabular-nums">{format.number(card.value)}</CardTitle>
            </CardHeader>
            {card.hint ? <CardContent className="text-xs text-muted-foreground">{card.hint}</CardContent> : null}
          </Card>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {hasModule(school, "attendance") ? (
          <Card>
            <CardHeader>
              <CardTitle>{t("attendanceToday")}</CardTitle>
              <CardDescription>{t("attendanceTodayDescription")}</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {ATTENDANCE_STATUSES.map((status) => (
                <div key={status} className="rounded-lg border p-3">
                  <div className="text-xs text-muted-foreground">{tAttendance(`statuses.${status}`)}</div>
                  <div className="text-2xl font-semibold tabular-nums">{attendanceToday[status] ?? 0}</div>
                </div>
              ))}
              <ButtonLink href={schoolPath(slug, "attendance")} variant="outline" className="col-span-full">
                <GraduationCapIcon />
                {t("takeAttendance")}
              </ButtonLink>
            </CardContent>
          </Card>
        ) : null}
        {hasModule(school, "events") ? (
          <Card>
            <CardHeader>
              <CardTitle>{t("upcomingEvents")}</CardTitle>
            </CardHeader>
            <CardContent>
              {events && events.length > 0 ? (
                <ul className="divide-y">
                  {events.map((event) => (
                    <li key={event.id} className="flex items-start gap-3 py-2">
                      <CalendarDaysIcon className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
                      <div className="min-w-0">
                        <div className="truncate font-medium">{event.title}</div>
                        <div className="text-xs text-muted-foreground">
                          {format.dateTime(new Date(event.starts_at), {
                            dateStyle: "medium",
                            ...(event.all_day ? {} : { timeStyle: "short" }),
                            timeZone: school.timezone,
                          })}
                          {event.location ? ` · ${event.location}` : ""}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">{t("noUpcomingEvents")}</p>
              )}
            </CardContent>
          </Card>
        ) : null}
      </div>
    </>
  );
}
