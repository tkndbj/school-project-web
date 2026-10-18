import { ArrowLeftIcon } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ButtonLink } from "@/components/button-link";
import { DeleteEntityButton } from "@/components/delete-entity-button";
import { PageHeader } from "@/components/page-header";
import { TabLinks } from "@/components/tab-links";
import { deleteCourse } from "@/features/courses/actions";
import { CourseForm } from "@/features/courses/components/course-form";
import { CourseStudentsPanel } from "@/features/courses/components/course-students-panel";
import { CourseTeachersPanel } from "@/features/courses/components/course-teachers-panel";
import { getCourse, getCourseEnrollments, getCourseTeachers, listTerms } from "@/features/courses/queries";
import { getCustomFieldDefinitions } from "@/features/custom-fields/queries";
import { AssessmentsPanel } from "@/features/grades/components/assessments-panel";
import { listCourseAssessments } from "@/features/grades/queries";
import { listGradeLevels } from "@/features/students/queries";
import { schoolPath } from "@/features/school-panel/paths";
import { firstParam } from "@/lib/pagination";
import { displayName } from "@/lib/people";
import { hasModule, requireModule } from "@/server/auth";

export async function generateMetadata({ params }: PageProps<"/school/[slug]/courses/[courseId]">): Promise<Metadata> {
  const { slug, courseId } = await params;
  const { school } = await requireModule(slug, "courses");
  return { title: (await getCourse(school.id, courseId)).name };
}

export default async function CoursePage({ params, searchParams }: PageProps<"/school/[slug]/courses/[courseId]">) {
  const { slug, courseId } = await params;
  const { school } = await requireModule(slug, "courses");
  const t = await getTranslations("courses");
  const course = await getCourse(school.id, courseId);
  const base = schoolPath(slug, "courses", courseId);

  const tabs = [
    { id: "students", label: t("tabs.students") },
    ...(hasModule(school, "grades") ? [{ id: "assessments", label: t("tabs.assessments") }] : []),
    ...(hasModule(school, "teachers") ? [{ id: "teachers", label: t("tabs.teachers") }] : []),
    { id: "details", label: t("tabs.details") },
  ].map((tab) => ({ ...tab, href: `${base}?tab=${tab.id}` }));
  const requested = firstParam((await searchParams).tab);
  const active = tabs.find((tab) => tab.id === requested)?.id ?? "students";

  return (
    <>
      <ButtonLink href={schoolPath(slug, "courses")} variant="ghost" size="sm" className="-ml-2 w-fit">
        <ArrowLeftIcon />
        {t("title")}
      </ButtonLink>
      <PageHeader title={course.name} description={[course.code, course.subject].filter(Boolean).join(" · ") || undefined} />
      <TabLinks tabs={tabs} active={active} />
      {active === "students" ? <StudentsTab schoolId={school.id} slug={slug} courseId={courseId} /> : null}
      {active === "assessments" ? <AssessmentsTab schoolId={school.id} slug={slug} courseId={courseId} /> : null}
      {active === "teachers" ? <TeachersTab schoolId={school.id} slug={slug} courseId={courseId} /> : null}
      {active === "details" ? (
        <DetailsTab schoolId={school.id} slug={slug} course={course} deleteLabels={{
          label: t("delete"),
          title: t("deleteTitle", { name: course.name }),
          description: t("deleteDescription"),
          success: t("deleted"),
        }} />
      ) : null}
    </>
  );
}

async function StudentsTab({ schoolId, slug, courseId }: { schoolId: string; slug: string; courseId: string }) {
  const [enrollments, grades] = await Promise.all([getCourseEnrollments(schoolId, courseId), listGradeLevels(schoolId)]);
  return (
    <CourseStudentsPanel
      schoolId={schoolId}
      slug={slug}
      courseId={courseId}
      gradeLevels={grades}
      enrollments={enrollments.map((e) => ({
        enrollmentId: e.enrollmentId,
        studentId: e.student.id,
        name: displayName(e.student),
        number: e.student.student_number,
        group: [e.student.grade_level, e.student.section].filter(Boolean).join(" / ") || null,
      }))}
    />
  );
}

async function AssessmentsTab({ schoolId, slug, courseId }: { schoolId: string; slug: string; courseId: string }) {
  const [assessments, terms] = await Promise.all([listCourseAssessments(schoolId, courseId), listTerms(schoolId)]);
  return <AssessmentsPanel schoolId={schoolId} slug={slug} courseId={courseId} assessments={assessments} terms={terms} />;
}

async function TeachersTab({ schoolId, slug, courseId }: { schoolId: string; slug: string; courseId: string }) {
  const teachers = await getCourseTeachers(schoolId, courseId);
  return (
    <CourseTeachersPanel
      schoolId={schoolId}
      slug={slug}
      courseId={courseId}
      teachers={teachers.map((row) => ({
        linkId: row.linkId,
        teacherId: row.teacher.id,
        name: displayName(row.teacher),
        detail: row.teacher.subject ?? row.teacher.email,
      }))}
    />
  );
}

async function DetailsTab({
  schoolId,
  slug,
  course,
  deleteLabels,
}: {
  schoolId: string;
  slug: string;
  course: Awaited<ReturnType<typeof getCourse>>;
  deleteLabels: { label: string; title: string; description: string; success: string };
}) {
  const [definitions, terms] = await Promise.all([getCustomFieldDefinitions(schoolId, "course"), listTerms(schoolId)]);
  return (
    <div className="grid gap-6">
      <CourseForm schoolId={schoolId} slug={slug} definitions={definitions} terms={terms} course={course} />
      <div className="flex justify-end">
        <DeleteEntityButton
          onDelete={deleteCourse.bind(null, schoolId, course.id)}
          redirectTo={schoolPath(slug, "courses")}
          label={deleteLabels.label}
          title={deleteLabels.title}
          description={deleteLabels.description}
          successMessage={deleteLabels.success}
        />
      </div>
    </div>
  );
}
