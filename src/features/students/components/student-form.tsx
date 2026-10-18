"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { SelectField, TextareaField, TextField } from "@/components/forms/fields";
import { useSubmitAction } from "@/components/forms/use-submit-action";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { FieldGroup, FieldLegend, FieldSet } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import type { ActionResult } from "@/lib/errors";
import type { Tables } from "@/lib/supabase/types";
import { CustomFieldsSection } from "../../custom-fields/components/custom-fields-section";
import { toCustomFieldFormValues, type CustomFieldDefinition } from "../../custom-fields/values";
import { schoolPath } from "../../school-panel/paths";
import { createStudent, updateStudent } from "../actions";
import { GENDERS, STUDENT_STATUSES, studentSchema, type StudentInput, type StudentOutput } from "../schema";

export function StudentForm({
  schoolId,
  slug,
  definitions,
  student,
}: {
  schoolId: string;
  slug: string;
  definitions: CustomFieldDefinition[];
  student?: Tables<"students">;
}) {
  const t = useTranslations("students");
  const tCommon = useTranslations("common");
  const tGender = useTranslations("gender");
  const router = useRouter();

  const form = useForm<StudentInput, unknown, StudentOutput>({
    resolver: zodResolver(studentSchema),
    defaultValues: {
      student_number: student?.student_number ?? "",
      first_name: student?.first_name ?? "",
      last_name: student?.last_name ?? "",
      preferred_name: student?.preferred_name ?? "",
      date_of_birth: student?.date_of_birth ?? "",
      gender: student?.gender ?? "",
      grade_level: student?.grade_level ?? "",
      section: student?.section ?? "",
      email: student?.email ?? "",
      phone: student?.phone ?? "",
      address: student?.address ?? "",
      enrolled_on: student?.enrolled_on ?? "",
      status: student?.status ?? "active",
      notes: student?.notes ?? "",
      custom_fields: toCustomFieldFormValues(definitions, student?.custom_fields),
    },
  });

  const save = async (values: StudentOutput): Promise<ActionResult<{ id: string }>> => {
    if (!student) return createStudent(schoolId, values);
    const result = await updateStudent(schoolId, student.id, values);
    return result.ok ? { ok: true, data: { id: student.id } } : result;
  };

  const onSubmit = useSubmitAction(form, save, {
    resetOnSuccess: Boolean(student),
    successMessage: student ? undefined : t("created"),
    onSuccess: ({ id }) => {
      if (!student) router.push(schoolPath(slug, "students", id));
    },
  });

  return (
    <form onSubmit={onSubmit} noValidate>
      <Card>
        {!student ? (
          <CardHeader>
            <CardTitle>{t("details")}</CardTitle>
          </CardHeader>
        ) : null}
        <CardContent>
          <FieldGroup>
            <div className="grid gap-4 sm:grid-cols-3">
              <TextField control={form.control} name="first_name" label={t("firstName")} autoComplete="off" />
              <TextField control={form.control} name="last_name" label={t("lastName")} autoComplete="off" />
              <TextField control={form.control} name="preferred_name" label={t("preferredName")} autoComplete="off" />
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <TextField control={form.control} name="student_number" label={t("studentNumber")} autoComplete="off" />
              <TextField control={form.control} name="date_of_birth" label={t("dateOfBirth")} type="date" />
              <SelectField
                control={form.control}
                name="gender"
                label={t("gender")}
                placeholder={tCommon("notSet")}
                options={GENDERS.map((g) => ({ value: g, label: tGender(g) }))}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-4">
              <TextField control={form.control} name="grade_level" label={t("gradeLevel")} />
              <TextField control={form.control} name="section" label={t("section")} />
              <TextField control={form.control} name="enrolled_on" label={t("enrolledOn")} type="date" />
              <SelectField
                control={form.control}
                name="status"
                label={t("status")}
                options={STUDENT_STATUSES.map((s) => ({ value: s, label: t(`statuses.${s}`) }))}
              />
            </div>
            <FieldSet>
              <FieldLegend>{t("contact")}</FieldLegend>
              <div className="grid gap-4 sm:grid-cols-2">
                <TextField control={form.control} name="email" label={t("email")} type="email" />
                <TextField control={form.control} name="phone" label={t("phone")} type="tel" />
              </div>
              <TextField control={form.control} name="address" label={t("address")} />
            </FieldSet>
            <CustomFieldsSection control={form.control} definitions={definitions} />
            <TextareaField
              control={form.control}
              name="notes"
              label={t("internalNotes")}
              description={t("internalNotesDescription")}
              rows={3}
            />
          </FieldGroup>
        </CardContent>
        <CardFooter className="justify-end gap-2">
          <Button type="submit" disabled={form.formState.isSubmitting || (Boolean(student) && !form.formState.isDirty)}>
            {form.formState.isSubmitting ? <Spinner /> : null}
            {student ? tCommon("save") : t("create")}
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
