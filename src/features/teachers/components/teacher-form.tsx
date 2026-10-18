"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { SelectField, TextareaField, TextField } from "@/components/forms/fields";
import { useSubmitAction } from "@/components/forms/use-submit-action";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { FieldGroup } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import type { ActionResult } from "@/lib/errors";
import type { Tables } from "@/lib/supabase/types";
import { CustomFieldsSection } from "../../custom-fields/components/custom-fields-section";
import { toCustomFieldFormValues, type CustomFieldDefinition } from "../../custom-fields/values";
import { schoolPath } from "../../school-panel/paths";
import { GENDERS } from "../../students/schema";
import { createTeacher, updateTeacher } from "../actions";
import { teacherSchema, type TeacherInput, type TeacherOutput } from "../schema";

export function TeacherForm({
  schoolId,
  slug,
  definitions,
  teacher,
}: {
  schoolId: string;
  slug: string;
  definitions: CustomFieldDefinition[];
  teacher?: Tables<"teachers">;
}) {
  const t = useTranslations("teachers");
  const tCommon = useTranslations("common");
  const tGender = useTranslations("gender");
  const router = useRouter();

  const form = useForm<TeacherInput, unknown, TeacherOutput>({
    resolver: zodResolver(teacherSchema),
    defaultValues: {
      staff_number: teacher?.staff_number ?? "",
      title: teacher?.title ?? "",
      first_name: teacher?.first_name ?? "",
      last_name: teacher?.last_name ?? "",
      email: teacher?.email ?? "",
      phone: teacher?.phone ?? "",
      date_of_birth: teacher?.date_of_birth ?? "",
      gender: teacher?.gender ?? "",
      subject: teacher?.subject ?? "",
      bio: teacher?.bio ?? "",
      custom_fields: toCustomFieldFormValues(definitions, teacher?.custom_fields),
    },
  });

  const save = async (values: TeacherOutput): Promise<ActionResult<{ id: string }>> => {
    if (!teacher) return createTeacher(schoolId, values);
    const result = await updateTeacher(schoolId, teacher.id, values);
    return result.ok ? { ok: true, data: { id: teacher.id } } : result;
  };
  const onSubmit = useSubmitAction(form, save, {
    resetOnSuccess: Boolean(teacher),
    successMessage: teacher ? undefined : t("created"),
    onSuccess: ({ id }) => {
      if (!teacher) router.push(schoolPath(slug, "teachers", id));
    },
  });

  return (
    <form onSubmit={onSubmit} noValidate>
      <Card>
        <CardContent>
          <FieldGroup>
            <div className="grid gap-4 sm:grid-cols-[8rem_1fr_1fr]">
              <TextField control={form.control} name="title" label={t("titleField")} placeholder={t("titlePlaceholder")} />
              <TextField control={form.control} name="first_name" label={t("firstName")} autoComplete="off" />
              <TextField control={form.control} name="last_name" label={t("lastName")} autoComplete="off" />
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <TextField control={form.control} name="staff_number" label={t("staffNumber")} autoComplete="off" />
              <TextField control={form.control} name="subject" label={t("subject")} />
              <SelectField
                control={form.control}
                name="gender"
                label={t("gender")}
                placeholder={tCommon("notSet")}
                options={GENDERS.map((g) => ({ value: g, label: tGender(g) }))}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <TextField control={form.control} name="email" label={t("email")} type="email" />
              <TextField control={form.control} name="phone" label={t("phone")} type="tel" />
              <TextField control={form.control} name="date_of_birth" label={t("dateOfBirth")} type="date" />
            </div>
            <TextareaField control={form.control} name="bio" label={t("bio")} rows={3} />
            <CustomFieldsSection control={form.control} definitions={definitions} />
          </FieldGroup>
        </CardContent>
        <CardFooter className="justify-end">
          <Button type="submit" disabled={form.formState.isSubmitting || (Boolean(teacher) && !form.formState.isDirty)}>
            {form.formState.isSubmitting ? <Spinner /> : null}
            {teacher ? tCommon("save") : t("create")}
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
