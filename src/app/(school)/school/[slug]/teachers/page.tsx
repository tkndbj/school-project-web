import { PlusIcon, UploadIcon, UserRoundIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { ButtonLink } from "@/components/button-link";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { PaginationControls } from "@/components/pagination-controls";
import { PersonAvatar } from "@/components/person-avatar";
import { SearchInput } from "@/components/search-input";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { schoolPath } from "@/features/school-panel/paths";
import { listTeachers } from "@/features/teachers/queries";
import { firstParam } from "@/lib/pagination";
import { displayName } from "@/lib/people";
import { requireModule } from "@/server/auth";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("schoolNav");
  return { title: t("teachers") };
}

export default async function TeachersPage({ params, searchParams }: PageProps<"/school/[slug]/teachers">) {
  const { slug } = await params;
  const query = await searchParams;
  const { school } = await requireModule(slug, "teachers");
  const t = await getTranslations("teachers");
  const tCommon = await getTranslations("common");
  const q = firstParam(query.q);
  const { rows, total, page, pageSize } = await listTeachers(school.id, { q, page: firstParam(query.page) });

  return (
    <>
      <PageHeader
        title={t("title")}
        description={t("count", { count: total })}
        actions={
          <>
            <ButtonLink href={schoolPath(slug, "teachers", "import")} variant="outline">
              <UploadIcon />
              {t("import")}
            </ButtonLink>
            <ButtonLink href={schoolPath(slug, "teachers", "new")}>
              <PlusIcon />
              {t("add")}
            </ButtonLink>
          </>
        }
      />
      <SearchInput placeholder={t("searchPlaceholder")} />
      {rows.length === 0 ? (
        <EmptyState
          icon={UserRoundIcon}
          title={q ? t("noResults") : t("empty")}
          description={q ? undefined : t("emptyDescription")}
        />
      ) : (
        <>
          <Card className="py-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("name")}</TableHead>
                  <TableHead className="hidden sm:table-cell">{t("subject")}</TableHead>
                  <TableHead className="hidden md:table-cell">{t("email")}</TableHead>
                  <TableHead className="text-right">{t("courses")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((teacher) => {
                  const name = displayName(teacher, tCommon("unnamed"));
                  return (
                    <TableRow key={teacher.id}>
                      <TableCell>
                        <Link
                          href={schoolPath(slug, "teachers", teacher.id)}
                          className="flex items-center gap-3 font-medium hover:underline"
                        >
                          <PersonAvatar name={name} src={teacher.photoUrl} size="sm" />
                          {name}
                        </Link>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">{teacher.subject ?? tCommon("notSet")}</TableCell>
                      <TableCell className="hidden md:table-cell">{teacher.email ?? tCommon("notSet")}</TableCell>
                      <TableCell className="text-right tabular-nums">{teacher.courseCount}</TableCell>
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
