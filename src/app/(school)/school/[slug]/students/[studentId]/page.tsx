import { ArrowLeftIcon } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ButtonLink } from "@/components/button-link";
import { PageHeader } from "@/components/page-header";
import { PersonAvatar } from "@/components/person-avatar";
import { TabLinks } from "@/components/tab-links";
import { Badge } from "@/components/ui/badge";
import { schoolPath } from "@/features/school-panel/paths";
import { StudentAttendanceTab } from "@/features/students/components/tabs/attendance-tab";
import { StudentCoursesTab } from "@/features/students/components/tabs/courses-tab";
import { StudentGradesTab } from "@/features/students/components/tabs/grades-tab";
import { StudentGuardiansTab } from "@/features/students/components/tabs/guardians-tab";
import { StudentNotesTab } from "@/features/students/components/tabs/notes-tab";
import { StudentProfileTab } from "@/features/students/components/tabs/profile-tab";
import { getStudent } from "@/features/students/queries";
import { firstParam } from "@/lib/pagination";
import { ageFromBirthDate, displayName } from "@/lib/people";
import type { SchoolModule } from "@/lib/supabase/types";
import { hasModule, requireSchool } from "@/server/auth";
import { signMediaUrl } from "@/server/storage";

type TabId = "profile" | "guardians" | "courses" | "grades" | "attendance" | "notes";
const MODULE_TABS: Partial<Record<TabId, SchoolModule>> = {
  courses: "courses",
  grades: "grades",
  attendance: "attendance",
  notes: "notes",
};

export async function generateMetadata({ params }: PageProps<"/school/[slug]/students/[studentId]">): Promise<Metadata> {
  const { slug, studentId } = await params;
  const { school } = await requireSchool(slug);
  return { title: displayName(await getStudent(school.id, studentId)) };
}

export default async function StudentPage({ params, searchParams }: PageProps<"/school/[slug]/students/[studentId]">) {
  const { slug, studentId } = await params;
  const { school } = await requireSchool(slug);
  const t = await getTranslations("students");
  const student = await getStudent(school.id, studentId);
  const photoUrl = await signMediaUrl(student.photo_path);
  const name = displayName(student);
  const age = ageFromBirthDate(student.date_of_birth);

  const tabs = (["profile", "guardians", "courses", "grades", "attendance", "notes"] as const)
    .filter((id) => !MODULE_TABS[id] || hasModule(school, MODULE_TABS[id]))
    .map((id) => ({ id, label: t(`tabs.${id}`), href: `${schoolPath(slug, "students", studentId)}?tab=${id}` }));
  const requested = firstParam((await searchParams).tab);
  const active: TabId = tabs.find((tab) => tab.id === requested)?.id ?? "profile";

  return (
    <>
      <ButtonLink href={schoolPath(slug, "students")} variant="ghost" size="sm" className="-ml-2 w-fit">
        <ArrowLeftIcon />
        {t("title")}
      </ButtonLink>
      <PageHeader
        title={
          <span className="flex items-center gap-3">
            <PersonAvatar name={name} src={photoUrl} size="lg" />
            {name}
          </span>
        }
        description={[
          student.student_number ? t("numberLabel", { number: student.student_number }) : null,
          [student.grade_level, student.section].filter(Boolean).join(" / ") || null,
          age !== null ? t("age", { age }) : null,
        ]
          .filter(Boolean)
          .join(" · ")}
        actions={<Badge variant={student.status === "active" ? "secondary" : "outline"}>{t(`statuses.${student.status}`)}</Badge>}
      />
      <TabLinks tabs={tabs} active={active} />
      {active === "profile" ? <StudentProfileTab school={school} slug={slug} student={student} photoUrl={photoUrl} /> : null}
      {active === "guardians" ? <StudentGuardiansTab school={school} slug={slug} student={student} /> : null}
      {active === "courses" ? <StudentCoursesTab school={school} slug={slug} studentId={student.id} /> : null}
      {active === "grades" ? <StudentGradesTab school={school} studentId={student.id} /> : null}
      {active === "attendance" ? <StudentAttendanceTab school={school} studentId={student.id} /> : null}
      {active === "notes" ? <StudentNotesTab school={school} studentId={student.id} /> : null}
    </>
  );
}
