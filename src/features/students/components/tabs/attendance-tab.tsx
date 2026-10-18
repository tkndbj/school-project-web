import { CalendarCheckIcon } from "lucide-react";
import { getFormatter, getTranslations } from "next-intl/server";
import { EmptyState } from "@/components/empty-state";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Tables } from "@/lib/supabase/types";
import { ATTENDANCE_STATUSES } from "../../../attendance/constants";
import { AttendanceStatusBadge } from "../../../attendance/components/attendance-status-badge";
import { getStudentAttendance } from "../../../attendance/queries";

const WINDOW_DAYS = 90;

export async function StudentAttendanceTab({
  school,
  studentId,
}: {
  school: Tables<"schools">;
  studentId: string;
}) {
  const t = await getTranslations("attendance");
  const format = await getFormatter();
  const since = new Date(new Date().getTime() - WINDOW_DAYS * 86_400_000)
    .toISOString()
    .slice(0, 10);
  const records = await getStudentAttendance(school.id, studentId, since);
  const counts = Object.fromEntries(
    ATTENDANCE_STATUSES.map((s) => [
      s,
      records.filter((r) => r.status === s).length,
    ]),
  );

  return (
    <div className="grid gap-4">
      <Card>
        <CardHeader>
          <CardTitle>{t("summary")}</CardTitle>
          <CardDescription>
            {t("lastDays", { days: WINDOW_DAYS })}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {ATTENDANCE_STATUSES.map((status) => (
            <div key={status} className="rounded-lg border p-3">
              <div className="text-xs text-muted-foreground">
                {t(`statuses.${status}`)}
              </div>
              <div className="text-2xl font-semibold tabular-nums">
                {counts[status]}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
      {records.length === 0 ? (
        <EmptyState icon={CalendarCheckIcon} title={t("noRecords")} />
      ) : (
        <Card className="py-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("date")}</TableHead>
                <TableHead>{t("status")}</TableHead>
                <TableHead className="hidden sm:table-cell">
                  {t("lesson")}
                </TableHead>
                <TableHead className="hidden md:table-cell">
                  {t("note")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {records.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="tabular-nums">
                    {format.dateTime(new Date(r.attended_on), {
                      dateStyle: "medium",
                      timeZone: "UTC",
                    })}
                  </TableCell>
                  <TableCell>
                    <AttendanceStatusBadge status={r.status} />
                    {r.minutes_late ? (
                      <span className="ml-2 text-xs text-muted-foreground">
                        {t("minutesLate", { minutes: r.minutes_late })}
                      </span>
                    ) : null}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    {r.courses?.name ? (
                      <Badge variant="outline">
                        {r.courses.name}
                        {r.period ? ` · ${r.period}` : ""}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">
                        {t("daily")}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="hidden max-w-xs truncate md:table-cell">
                    {r.note}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
