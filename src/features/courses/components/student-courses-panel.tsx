"use client";

import { BookOpenIcon, PlusIcon, XIcon } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { AsyncSearchPicker } from "@/components/async-search-picker";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { EmptyState } from "@/components/empty-state";
import { useErrorMessage } from "@/components/forms/use-error-message";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { schoolPath } from "../../school-panel/paths";
import { enrollStudent, searchCoursesAction, unenroll } from "../actions";

type Enrollment = {
  enrollmentId: string;
  course: { id: string; name: string; code: string | null; termName: string | null; teachers: string[]; color: string | null };
};

export function StudentCoursesPanel({
  schoolId,
  slug,
  studentId,
  enrollments,
}: {
  schoolId: string;
  slug: string;
  studentId: string;
  enrollments: Enrollment[];
}) {
  const t = useTranslations("courses");
  const errorMessage = useErrorMessage();
  const [open, setOpen] = useState(false);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle>{t("enrolledCourses")}</CardTitle>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger
            render={
              <Button size="sm">
                <PlusIcon />
                {t("enrollInCourse")}
              </Button>
            }
          />
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{t("enrollInCourse")}</DialogTitle>
            </DialogHeader>
            <AsyncSearchPicker
              autoFocus
              search={(q) => searchCoursesAction(schoolId, q)}
              excludeIds={enrollments.map((e) => e.course.id)}
              placeholder={t("searchPlaceholder")}
              onSelect={async (course) => {
                const result = await enrollStudent(schoolId, course.id, studentId);
                if (!result.ok) return toast.error(errorMessage(result.error));
                toast.success(t("enrolled", { course: course.label }));
                setOpen(false);
              }}
            />
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {enrollments.length === 0 ? (
          <EmptyState icon={BookOpenIcon} title={t("noEnrollments")} />
        ) : (
          <ul className="divide-y">
            {enrollments.map(({ enrollmentId, course }) => (
              <li key={enrollmentId} className="flex items-center justify-between gap-2 py-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span
                    aria-hidden
                    className="size-2.5 shrink-0 rounded-full bg-primary"
                    style={course.color ? { backgroundColor: course.color } : undefined}
                  />
                  <div className="min-w-0">
                    <Link href={schoolPath(slug, "courses", course.id)} className="font-medium hover:underline">
                      {course.name}
                      {course.code ? <span className="text-muted-foreground"> · {course.code}</span> : null}
                    </Link>
                    <div className="truncate text-sm text-muted-foreground">
                      {[course.termName, course.teachers.join(", ")].filter(Boolean).join(" · ")}
                    </div>
                  </div>
                </div>
                <ConfirmDialog
                  trigger={
                    <Button variant="ghost" size="icon-sm" aria-label={t("unenroll")}>
                      <XIcon />
                    </Button>
                  }
                  title={t("unenrollTitle", { course: course.name })}
                  description={t("unenrollDescription")}
                  confirmLabel={t("unenroll")}
                  onConfirm={async () => {
                    const result = await unenroll(schoolId, enrollmentId);
                    if (!result.ok) toast.error(errorMessage(result.error));
                    return result.ok;
                  }}
                />
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
