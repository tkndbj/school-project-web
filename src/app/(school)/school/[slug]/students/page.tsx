import { GraduationCapIcon, PlusIcon, UploadIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { ButtonLink } from "@/components/button-link";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { PaginationControls } from "@/components/pagination-controls";
import { PersonAvatar } from "@/components/person-avatar";
import { SearchInput } from "@/components/search-input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { UrlSelectFilter } from "@/components/url-select-filter";
import { schoolPath } from "@/features/school-panel/paths";
import { listGradeLevels, listStudents } from "@/features/students/queries";
import { STUDENT_STATUSES } from "@/features/students/schema";
import { firstParam } from "@/lib/pagination";
import { displayName } from "@/lib/people";
import { requireSchool } from "@/server/auth";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("schoolNav");
  return { title: t("students") };
}

export default async function StudentsPage({ params, searchParams }: PageProps<"/school/[slug]/students">) {
  const { slug } = await params;
  const query = await searchParams;
  const { school } = await requireSchool(slug);
  const t = await getTranslations("students");
  const tCommon = await getTranslations("common");

  const filters = {
    q: firstParam(query.q),
    status: firstParam(query.status),
    grade: firstParam(query.grade),
    page: firstParam(query.page),
  };
  const [{ rows, total, page, pageSize }, grades] = await Promise.all([
    listStudents(school.id, filters),
    listGradeLevels(school.id),
  ]);
  const filtered = Boolean(filters.q || filters.status || filters.grade);

  return (
    <>
      <PageHeader
        title={t("title")}
        description={t("count", { count: total })}
        actions={
          <>
            <ButtonLink href={schoolPath(slug, "students", "import")} variant="outline">
              <UploadIcon />
              {t("import")}
            </ButtonLink>
            <ButtonLink href={schoolPath(slug, "students", "new")}>
              <PlusIcon />
              {t("add")}
            </ButtonLink>
          </>
        }
      />
      <div className="flex flex-col gap-2 sm:flex-row">
        <SearchInput placeholder={t("searchPlaceholder")} />
        <UrlSelectFilter
          param="status"
          label={t("status")}
          allLabel={t("allStatuses")}
          options={STUDENT_STATUSES.map((s) => ({ value: s, label: t(`statuses.${s}`) }))}
        />
        {grades.length > 0 ? (
          <UrlSelectFilter
            param="grade"
            label={t("gradeLevel")}
            allLabel={t("allGrades")}
            options={grades.map((g) => ({ value: g, label: g }))}
          />
        ) : null}
      </div>
      {rows.length === 0 ? (
        <EmptyState
          icon={GraduationCapIcon}
          title={filtered ? t("noResults") : t("empty")}
          description={filtered ? t("noResultsDescription") : t("emptyDescription")}
          action={
            filtered ? null : (
              <ButtonLink href={schoolPath(slug, "students", "import")}>{t("import")}</ButtonLink>
            )
          }
        />
      ) : (
        <>
          <Card className="py-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("name")}</TableHead>
                  <TableHead>{t("studentNumber")}</TableHead>
                  <TableHead className="hidden sm:table-cell">{t("gradeLevel")}</TableHead>
                  <TableHead className="hidden md:table-cell">{t("status")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((student) => {
                  const name = displayName(student, tCommon("unnamed"));
                  return (
                    <TableRow key={student.id}>
                      <TableCell>
                        <Link
                          href={schoolPath(slug, "students", student.id)}
                          className="flex items-center gap-3 font-medium hover:underline"
                        >
                          <PersonAvatar name={name} src={student.photoUrl} size="sm" />
                          {name}
                        </Link>
                      </TableCell>
                      <TableCell className="tabular-nums">{student.student_number ?? tCommon("notSet")}</TableCell>
                      <TableCell className="hidden sm:table-cell">
                        {[student.grade_level, student.section].filter(Boolean).join(" / ") || tCommon("notSet")}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <Badge variant={student.status === "active" ? "secondary" : "outline"}>
                          {t(`statuses.${student.status}`)}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>
          <PaginationControls page={page} pageSize={pageSize} total={total} />
        </>
      )}
    </>
  );
}
