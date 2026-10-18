"use client";

import { UserRoundIcon, XIcon } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { AsyncSearchPicker } from "@/components/async-search-picker";
import { useErrorMessage } from "@/components/forms/use-error-message";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { schoolPath } from "../../school-panel/paths";
import { searchTeachersAction } from "../../teachers/actions";
import { assignTeacher, unassignTeacher } from "../actions";

export function CourseTeachersPanel({
  schoolId,
  slug,
  courseId,
  teachers,
}: {
  schoolId: string;
  slug: string;
  courseId: string;
  teachers: { linkId: string; teacherId: string; name: string; detail: string | null }[];
}) {
  const t = useTranslations("courses");
  const errorMessage = useErrorMessage();

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>{t("assignedTeachers")}</CardTitle>
        </CardHeader>
        <CardContent>
          {teachers.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("noTeachers")}</p>
          ) : (
            <ul className="divide-y">
              {teachers.map((teacher) => (
                <li key={teacher.linkId} className="flex items-center justify-between gap-2 py-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <UserRoundIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                    <div className="min-w-0">
                      <Link href={schoolPath(slug, "teachers", teacher.teacherId)} className="font-medium hover:underline">
                        {teacher.name}
                      </Link>
                      {teacher.detail ? <div className="truncate text-xs text-muted-foreground">{teacher.detail}</div> : null}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={t("unassignTeacher")}
                    onClick={async () => {
                      const result = await unassignTeacher(schoolId, teacher.linkId);
                      if (!result.ok) toast.error(errorMessage(result.error));
                    }}
                  >
                    <XIcon />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>{t("assignTeacher")}</CardTitle>
        </CardHeader>
        <CardContent>
          <AsyncSearchPicker
            search={(q) => searchTeachersAction(schoolId, q)}
            excludeIds={teachers.map((teacher) => teacher.teacherId)}
            placeholder={t("searchTeachers")}
            onSelect={async (teacher) => {
              const result = await assignTeacher(schoolId, courseId, teacher.id);
              if (!result.ok) toast.error(errorMessage(result.error));
              else toast.success(t("teacherAssigned", { name: teacher.label }));
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
