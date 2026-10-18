import { PlusIcon, UsersIcon } from "lucide-react";
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
import { GuardianAccountBadge } from "@/features/guardians/components/guardian-account-badge";
import { listGuardians } from "@/features/guardians/queries";
import { schoolPath } from "@/features/school-panel/paths";
import { firstParam } from "@/lib/pagination";
import { displayName } from "@/lib/people";
import { requireSchool } from "@/server/auth";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("schoolNav");
  return { title: t("guardians") };
}

export default async function GuardiansPage({ params, searchParams }: PageProps<"/school/[slug]/guardians">) {
  const { slug } = await params;
  const query = await searchParams;
  const { school } = await requireSchool(slug);
  const t = await getTranslations("guardians");
  const tCommon = await getTranslations("common");
  const filters = { q: firstParam(query.q), linked: firstParam(query.linked), page: firstParam(query.page) };
  const { rows, total, page, pageSize } = await listGuardians(school.id, filters);

  return (
    <>
      <PageHeader
        title={t("title")}
        description={t("description")}
        actions={
          <ButtonLink href={schoolPath(slug, "guardians", "new")}>
            <PlusIcon />
            {t("add")}
          </ButtonLink>
        }
      />
      <div className="flex flex-col gap-2 sm:flex-row">
        <SearchInput placeholder={t("searchPlaceholder")} />
        <UrlSelectFilter
          param="linked"
          label={t("appAccess")}
          allLabel={t("allAccounts")}
          options={[
            { value: "yes", label: t("filterLinked") },
            { value: "no", label: t("filterNotLinked") },
          ]}
        />
      </div>
      {rows.length === 0 ? (
        <EmptyState icon={UsersIcon} title={filters.q || filters.linked ? t("noResults") : t("empty")} />
      ) : (
        <>
          <Card className="py-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("name")}</TableHead>
                  <TableHead className="hidden md:table-cell">{t("contact")}</TableHead>
                  <TableHead>{t("appAccess")}</TableHead>
                  <TableHead className="text-right">{t("children")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((guardian) => (
                  <TableRow key={guardian.id}>
                    <TableCell>
                      <Link href={schoolPath(slug, "guardians", guardian.id)} className="font-medium hover:underline">
                        {displayName(guardian, tCommon("unnamed"))}
                      </Link>
                    </TableCell>
                    <TableCell className="hidden text-muted-foreground md:table-cell">
                      {[guardian.email, guardian.phone].filter(Boolean).join(" · ") || tCommon("notSet")}
                    </TableCell>
                    <TableCell>
                      <GuardianAccountBadge linked={Boolean(guardian.user_id)} method={guardian.link_method} />
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{guardian.childrenCount}</TableCell>
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
