import { BuildingIcon, PlusIcon } from "lucide-react";
import type { Metadata, Route } from "next";
import Link from "next/link";
import { getFormatter, getTranslations } from "next-intl/server";
import { ButtonLink } from "@/components/button-link";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requirePlatformAdmin } from "@/server/auth";
import { createServerSupabase } from "@/server/supabase";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("platform");
  return { title: t("schools") };
}

export default async function PlatformHomePage() {
  await requirePlatformAdmin();
  const t = await getTranslations("platform");
  const format = await getFormatter();
  const supabase = await createServerSupabase();
  const { data: schools, error } = await supabase.rpc("platform_school_overview");
  if (error) throw error;

  const totals = schools.reduce(
    (acc, s) => ({
      schools: acc.schools + 1,
      students: acc.students + s.students_count,
      parents: acc.parents + s.guardians_linked_count,
    }),
    { schools: 0, students: 0, parents: 0 },
  );

  return (
    <>
      <PageHeader
        title={t("schools")}
        description={t("schoolsDescription")}
        actions={
          <ButtonLink href="/admin/schools/new">
            <PlusIcon />
            {t("newSchool")}
          </ButtonLink>
        }
      />
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: t("totalSchools"), value: totals.schools },
          { label: t("totalStudents"), value: totals.students },
          { label: t("totalParents"), value: totals.parents },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">{stat.label}</CardTitle>
            </CardHeader>
            <CardContent className="text-3xl font-semibold tabular-nums">{format.number(stat.value)}</CardContent>
          </Card>
        ))}
      </div>
      {schools.length === 0 ? (
        <EmptyState
          icon={BuildingIcon}
          title={t("noSchools")}
          description={t("noSchoolsDescription")}
          action={<ButtonLink href="/admin/schools/new">{t("newSchool")}</ButtonLink>}
        />
      ) : (
        <Card className="py-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("school")}</TableHead>
                <TableHead>{t("status")}</TableHead>
                <TableHead className="text-right">{t("staff")}</TableHead>
                <TableHead className="text-right">{t("students")}</TableHead>
                <TableHead className="text-right">{t("linkedParents")}</TableHead>
                <TableHead className="hidden md:table-cell">{t("created")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {schools.map((school) => (
                <TableRow key={school.school_id}>
                  <TableCell>
                    <Link href={`/admin/schools/${school.school_id}` as Route} className="font-medium hover:underline">
                      {school.name}
                    </Link>
                    <div className="text-xs text-muted-foreground">{school.slug}</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={school.status === "active" ? "secondary" : "destructive"}>
                      {t(`statuses.${school.status}`)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{school.staff_count}</TableCell>
                  <TableCell className="text-right tabular-nums">{school.students_count}</TableCell>
                  <TableCell className="text-right tabular-nums">{school.guardians_linked_count}</TableCell>
                  <TableCell className="hidden text-muted-foreground md:table-cell">
                    {format.dateTime(new Date(school.created_at), { dateStyle: "medium" })}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </>
  );
}
