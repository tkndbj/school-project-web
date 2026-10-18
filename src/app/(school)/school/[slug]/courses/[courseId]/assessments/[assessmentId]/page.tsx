import { ArrowLeftIcon } from "lucide-react";
import type { Metadata, Route } from "next";
import { getTranslations } from "next-intl/server";
import { ButtonLink } from "@/components/button-link";
import { DeleteEntityButton } from "@/components/delete-entity-button";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  getCourse,
  getCourseEnrollments,
  listTerms,
} from "@/features/courses/queries";
import { deleteAssessment, updateAssessment } from "@/features/grades/actions";
import { AssessmentForm } from "@/features/grades/components/assessment-form";
import { Gradebook } from "@/features/grades/components/gradebook";
import { getAssessment, getAssessmentGrades } from "@/features/grades/queries";
import { schoolPath } from "@/features/school-panel/paths";
import { displayName } from "@/lib/people";
import { requireModule } from "@/server/auth";

type Props =
  PageProps<"/school/[slug]/courses/[courseId]/assessments/[assessmentId]">;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, courseId, assessmentId } = await params;
  const { school } = await requireModule(slug, "grades");
  return {
    title: (await getAssessment(school.id, courseId, assessmentId)).title,
  };
}

export default async function AssessmentPage({ params }: Props) {
  const { slug, courseId, assessmentId } = await params;
  const { school } = await requireModule(slug, "grades");
  const t = await getTranslations("grades");
  const tCommon = await getTranslations("common");
  const [course, assessment, enrollments, grades, terms] = await Promise.all([
    getCourse(school.id, courseId),
    getAssessment(school.id, courseId, assessmentId),
    getCourseEnrollments(school.id, courseId),
    getAssessmentGrades(school.id, assessmentId),
    listTerms(school.id),
  ]);
  const gradeByStudent = new Map(grades.map((g) => [g.student_id, g]));
  const courseHref =
    `${schoolPath(slug, "courses", courseId)}?tab=assessments` as Route;

  return (
    <>
      <ButtonLink
        href={courseHref}
        variant="ghost"
        size="sm"
        className="-ml-2 w-fit"
      >
        <ArrowLeftIcon />
        {course.name}
      </ButtonLink>
      <PageHeader
        title={assessment.title}
        description={t(`kinds.${assessment.kind}`)}
        actions={
          <Badge variant={assessment.published_at ? "secondary" : "outline"}>
            {assessment.published_at ? t("published") : t("draft")}
          </Badge>
        }
      />
      <Gradebook
        schoolId={school.id}
        assessmentId={assessment.id}
        maxScore={assessment.max_score}
        rows={enrollments.map((e) => {
          const grade = gradeByStudent.get(e.student.id);
          return {
            studentId: e.student.id,
            name: displayName(e.student),
            number: e.student.student_number,
            score: grade?.score ?? null,
            letter: grade?.letter ?? null,
            comment: grade?.comment ?? null,
          };
        })}
      />
      <Card>
        <CardHeader>
          <CardTitle>{t("assessmentSettings")}</CardTitle>
        </CardHeader>
        <CardContent>
          <AssessmentForm
            terms={terms}
            assessment={assessment}
            submitLabel={tCommon("save")}
            onSave={updateAssessment.bind(null, school.id, assessment.id)}
          />
        </CardContent>
      </Card>
      <div className="flex justify-end">
        <DeleteEntityButton
          onDelete={deleteAssessment.bind(null, school.id, assessment.id)}
          redirectTo={courseHref}
          label={t("deleteAssessment")}
          title={t("deleteAssessmentTitle", { name: assessment.title })}
          description={t("deleteAssessmentDescription")}
          successMessage={tCommon("deleted")}
        />
      </div>
    </>
  );
}
