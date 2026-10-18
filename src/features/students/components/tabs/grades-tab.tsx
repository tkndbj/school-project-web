import { NotebookTabsIcon } from "lucide-react";
import { getFormatter, getTranslations } from "next-intl/server";
import { EmptyState } from "@/components/empty-state";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { Tables } from "@/lib/supabase/types";
import { getStudentGrades } from "../../../grades/queries";

export async function StudentGradesTab({ school, studentId }: { school: Tables<"schools">; studentId: string }) {
  const t = await getTranslations("grades");
  const tCommon = await getTranslations("common");
  const format = await getFormatter();
  const grades = await getStudentGrades(school.id, studentId);

  if (grades.length === 0) return <EmptyState icon={NotebookTabsIcon} title={t("noGrades")} />;

  return (
    <Card className="py-0">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("course")}</TableHead>
            <TableHead>{t("assessment")}</TableHead>
            <TableHead className="hidden sm:table-cell">{t("date")}</TableHead>
            <TableHead className="text-right">{t("result")}</TableHead>
            <TableHead className="hidden md:table-cell">{t("visibility")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {grades.map((grade) => (
            <TableRow key={grade.id}>
              <TableCell>{grade.assessment.courses?.name ?? tCommon("notSet")}</TableCell>
              <TableCell>
                <div className="font-medium">{grade.assessment.title}</div>
                <div className="text-xs text-muted-foreground">{t(`kinds.${grade.assessment.kind}`)}</div>
              </TableCell>
              <TableCell className="hidden sm:table-cell">
                {grade.assessment.assessed_on
                  ? format.dateTime(new Date(grade.assessment.assessed_on), { dateStyle: "medium", timeZone: "UTC" })
                  : tCommon("notSet")}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {grade.score !== null ? `${format.number(grade.score)} / ${format.number(grade.assessment.max_score)}` : null}
                {grade.letter ? <span className="ml-2 font-medium">{grade.letter}</span> : null}
              </TableCell>
              <TableCell className="hidden md:table-cell">
                <Badge variant={grade.assessment.published_at ? "secondary" : "outline"}>
                  {grade.assessment.published_at ? t("published") : t("draft")}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}
