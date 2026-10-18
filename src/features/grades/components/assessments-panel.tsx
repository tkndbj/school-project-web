"use client";

import { ClipboardListIcon, PlusIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useFormatter, useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { EmptyState } from "@/components/empty-state";
import { useErrorMessage } from "@/components/forms/use-error-message";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { Enums } from "@/lib/supabase/types";
import { schoolPath } from "../../school-panel/paths";
import { createAssessment, setAssessmentPublished } from "../actions";
import { AssessmentForm } from "./assessment-form";

type AssessmentRow = {
  id: string;
  title: string;
  kind: Enums<"assessment_kind">;
  max_score: number;
  assessed_on: string | null;
  published_at: string | null;
  gradedCount: number;
};

export function AssessmentsPanel({
  schoolId,
  slug,
  courseId,
  assessments,
  terms,
}: {
  schoolId: string;
  slug: string;
  courseId: string;
  assessments: AssessmentRow[];
  terms: { id: string; name: string }[];
}) {
  const t = useTranslations("grades");
  const tCommon = useTranslations("common");
  const format = useFormatter();
  const router = useRouter();
  const errorMessage = useErrorMessage();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <div className="grid gap-4">
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger
            render={
              <Button>
                <PlusIcon />
                {t("newAssessment")}
              </Button>
            }
          />
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>{t("newAssessment")}</DialogTitle>
            </DialogHeader>
            <AssessmentForm
              terms={terms}
              submitLabel={tCommon("create")}
              onSave={(values) => createAssessment(schoolId, courseId, values)}
              onSaved={({ id }) => {
                setOpen(false);
                router.push(schoolPath(slug, "courses", courseId, "assessments", id));
              }}
            />
          </DialogContent>
        </Dialog>
      </div>
      {assessments.length === 0 ? (
        <EmptyState icon={ClipboardListIcon} title={t("noAssessments")} description={t("noAssessmentsDescription")} />
      ) : (
        <Card className="py-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("assessment")}</TableHead>
                <TableHead className="hidden sm:table-cell">{t("date")}</TableHead>
                <TableHead className="hidden md:table-cell text-right">{t("maxScore")}</TableHead>
                <TableHead className="text-right">{t("graded")}</TableHead>
                <TableHead>{t("published")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {assessments.map((a) => (
                <TableRow key={a.id}>
                  <TableCell>
                    <Link
                      href={schoolPath(slug, "courses", courseId, "assessments", a.id)}
                      className="font-medium hover:underline"
                    >
                      {a.title}
                    </Link>
                    <div className="text-xs text-muted-foreground">{t(`kinds.${a.kind}`)}</div>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    {a.assessed_on ? format.dateTime(new Date(a.assessed_on), { dateStyle: "medium", timeZone: "UTC" }) : tCommon("notSet")}
                  </TableCell>
                  <TableCell className="hidden text-right tabular-nums md:table-cell">{format.number(a.max_score)}</TableCell>
                  <TableCell className="text-right tabular-nums">{a.gradedCount}</TableCell>
                  <TableCell>
                    <Switch
                      checked={Boolean(a.published_at)}
                      disabled={pending}
                      aria-label={t("publishToParents")}
                      onCheckedChange={(checked) =>
                        startTransition(async () => {
                          const result = await setAssessmentPublished(schoolId, a.id, checked);
                          if (!result.ok) toast.error(errorMessage(result.error));
                          else toast.success(checked ? t("publishedToast") : t("unpublishedToast"));
                        })
                      }
                    />
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
