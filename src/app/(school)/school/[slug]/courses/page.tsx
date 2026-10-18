import { BookOpenIcon, PlusIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { ButtonLink } from "@/components/button-link";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { PaginationControls } from "@/components/pagination-controls";
import { SearchInput } from "@/components/search-input";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { UrlSelectFilter } from "@/components/url-select-filter";
import { listCourses, listTerms } from "@/features/courses/queries";
import { schoolPath } from "@/features/school-panel/paths";
import { firstParam } from "@/lib/pagination";
import { requireModule } from "@/server/auth";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("schoolNav");
  return { title: t("courses") };
}

export default async function CoursesPage({ params, searchParams }: PageProps<"/school/[slug]/courses">) {
  const { slug } = await params;
  const query = await searchParams;
  const { school } = await requireModule(slug, "courses");
  const t = await getTranslations("courses");
  const tCommon = await getTranslations("common");
  const filters = { q: firstParam(query.q), term: firstParam(query.term), page: firstParam(query.page) };
  const [{ rows, total, page, pageSize }, terms] = await Promise.all([
    listCourses(school.id, filters),
    listTerms(school.id),
  ]);

  return (
    <>
      <PageHeader
        title={t("title")}
        description={t("count", { count: total })}
        actions={
          <ButtonLink href={schoolPath(slug, "courses", "new")}>
            <PlusIcon />
            {t("add")}
          </ButtonLink>
        }
      />
      <div className="flex flex-col gap-2 sm:flex-row">
        <SearchInput placeholder={t("searchPlaceholder")} />
        {terms.length > 0 ? (
          <UrlSelectFilter
            param="term"
            label={t("term")}
            allLabel={t("allTerms")}
            options={terms.map((term) => ({ value: term.id, label: term.name }))}
          />
        ) : null}
      </div>
      {rows.length === 0 ? (
        <EmptyState
          icon={BookOpenIcon}
          title={filters.q || filters.term ? t("noResults") : t("empty")}
          description={filters.q || filters.term ? undefined : t("emptyDescription")}
        />
      ) : (
        <>
          <Card className="py-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("name")}</TableHead>
                  <TableHead className="hidden md:table-cell">{t("teachers")}</TableHead>
                  <TableHead className="hidden sm:table-cell">{t("term")}</TableHead>
                  <TableHead className="text-right">{t("students")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((course) => (
                  <TableRow key={course.id}>
                    <TableCell>
                      <Link href={schoolPath(slug, "courses", course.id)} className="flex items-center gap-2 font-medium hover:underline">
                        <span
                          aria-hidden
                          className="size-2.5 shrink-0 rounded-full bg-primary"
                          style={course.color ? { backgroundColor: course.color } : undefined}
                        />
                        {course.name}
                        {course.code ? <span className="font-normal text-muted-foreground">{course.code}</span> : null}
                      </Link>
                    </TableCell>
                    <TableCell className="hidden text-muted-foreground md:table-cell">
                      {course.teachers.join(", ") || tCommon("notSet")}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">{course.termName ?? tCommon("notSet")}</TableCell>
                    <TableCell className="text-right tabular-nums">{course.studentCount}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
          <PaginationControls page={page} pageSize={pageSize} total={total} />
        </>
      )}
    </>
  );
}
