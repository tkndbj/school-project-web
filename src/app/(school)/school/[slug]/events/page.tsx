import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/page-header";
import { PaginationControls } from "@/components/pagination-controls";
import { TabLinks } from "@/components/tab-links";
import { listCourseOptions } from "@/features/courses/queries";
import { EventsPanel } from "@/features/events/components/events-panel";
import { schoolPath } from "@/features/school-panel/paths";
import { firstParam, parsePage } from "@/lib/pagination";
import { hasModule, requireModule } from "@/server/auth";
import { createServerSupabase } from "@/server/supabase";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("schoolNav");
  return { title: t("events") };
}

export default async function EventsPage({
  params,
  searchParams,
}: PageProps<"/school/[slug]/events">) {
  const { slug } = await params;
  const { school } = await requireModule(slug, "events");
  const t = await getTranslations("events");
  const paramsQuery = await searchParams;
  const view = firstParam(paramsQuery.view) === "past" ? "past" : "upcoming";
  const { page, pageSize, from, to } = parsePage(firstParam(paramsQuery.page));
  const now = new Date().toISOString();

  const supabase = await createServerSupabase();
  let query = supabase
    .from("events")
    .select(
      "id, title, description, location, starts_at, ends_at, all_day, color, visible_to_guardians, course_id, courses(name)",
      { count: "exact" },
    )
    .eq("school_id", school.id);
  query =
    view === "upcoming"
      ? query.or(`starts_at.gte.${now},ends_at.gte.${now}`).order("starts_at")
      : query
          .lt("starts_at", now)
          .or(`ends_at.is.null,ends_at.lt.${now}`)
          .order("starts_at", { ascending: false });
  const [{ data: events, count, error }, courses] = await Promise.all([
    query.order("id").range(from, to),
    hasModule(school, "courses")
      ? listCourseOptions(school.id)
      : Promise.resolve([]),
  ]);
  if (error) throw error;

  const base = schoolPath(slug, "events");
  return (
    <>
      <PageHeader title={t("title")} description={t("description")} />
      <TabLinks
        active={view}
        tabs={[
          { id: "upcoming", label: t("upcoming"), href: base },
          { id: "past", label: t("past"), href: `${base}?view=past` },
        ]}
      />
      <PaginationControls page={page} pageSize={pageSize} total={count ?? 0} />
      <EventsPanel
        schoolId={school.id}
        timezone={school.timezone}
        courses={courses}
        events={events.map((e) => ({
          ...e,
          courseName: e.courses?.name ?? null,
        }))}
      />
    </>
  );
}
