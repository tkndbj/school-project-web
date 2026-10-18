import { getFormatter, getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/page-header";
import { PaginationControls } from "@/components/pagination-controls";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { firstParam, parsePage } from "@/lib/pagination";
import { requireSchoolAdmin } from "@/server/auth";
import { createServerSupabase } from "@/server/supabase";

export default async function AuditPage({
  params,
  searchParams,
}: PageProps<"/school/[slug]/audit">) {
  const { slug } = await params;
  const { school } = await requireSchoolAdmin(slug);
  const t = await getTranslations("audit"),
    format = await getFormatter();
  const { page, pageSize, from, to } = parsePage(
    firstParam((await searchParams).page),
  );
  const supabase = await createServerSupabase();
  const { data, count, error } = await supabase
    .from("audit_log")
    .select("id, occurred_at, actor_id, table_name, record_id, action", {
      count: "exact",
    })
    .eq("school_id", school.id)
    .order("occurred_at", { ascending: false })
    .order("id", { ascending: false })
    .range(from, to);
  if (error) throw error;
  return (
    <>
      <PageHeader title={t("title")} description={t("description")} />
      <Card>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                {["when", "action", "table", "record", "actor"].map((key) => (
                  <TableHead key={key}>{t(key as "when")}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="whitespace-nowrap">
                    {format.dateTime(new Date(row.occurred_at), {
                      dateStyle: "short",
                      timeStyle: "short",
                      timeZone: school.timezone,
                    })}
                  </TableCell>
                  <TableCell>
                    {t(`actions.${row.action as "INSERT"}`)}
                  </TableCell>
                  <TableCell>{row.table_name}</TableCell>
                  <TableCell
                    className="max-w-40 truncate font-mono text-xs"
                    title={row.record_id ?? ""}
                  >
                    {row.record_id}
                  </TableCell>
                  <TableCell
                    className="max-w-40 truncate font-mono text-xs"
                    title={row.actor_id ?? ""}
                  >
                    {row.actor_id ?? t("system")}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <PaginationControls page={page} pageSize={pageSize} total={count ?? 0} />
    </>
  );
}
