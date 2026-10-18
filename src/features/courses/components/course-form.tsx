"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { ColorField, SelectField, TextareaField, TextField } from "@/components/forms/fields";
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
import { createCourse, updateCourse } from "../actions";
import { courseSchema, type CourseInput, type CourseOutput } from "../schema";

export function CourseForm({
  schoolId,
  slug,
  definitions,
  terms,
  course,
}: {
  schoolId: string;
  slug: string;
  definitions: CustomFieldDefinition[];
  terms: { id: string; name: string }[];
  course?: Tables<"courses">;
}) {
  const t = useTranslations("courses");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const form = useForm<CourseInput, unknown, CourseOutput>({
    resolver: zodResolver(courseSchema),
    defaultValues: {
      name: course?.name ?? "",
      code: course?.code ?? "",
      subject: course?.subject ?? "",
      grade_level: course?.grade_level ?? "",
      description: course?.description ?? "",
      color: course?.color ?? "",
      term_id: course?.term_id ?? "",
      custom_fields: toCustomFieldFormValues(definitions, course?.custom_fields),
    },
  });

  const save = async (values: CourseOutput): Promise<ActionResult<{ id: string }>> => {
    if (!course) return createCourse(schoolId, values);
    const result = await updateCourse(schoolId, course.id, values);
    return result.ok ? { ok: true, data: { id: course.id } } : result;
  };
  const onSubmit = useSubmitAction(form, save, {
    resetOnSuccess: Boolean(course),
    successMessage: course ? undefined : t("created"),
    onSuccess: ({ id }) => {
      if (!course) router.push(schoolPath(slug, "courses", id));
    },
  });

  return (
    <form onSubmit={onSubmit} noValidate>
      <Card>
        <CardContent>
          <FieldGroup>
            <div className="grid gap-4 sm:grid-cols-[1fr_10rem]">
              <TextField control={form.control} name="name" label={t("name")} required />
              <TextField control={form.control} name="code" label={t("code")} />
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <TextField control={form.control} name="subject" label={t("subject")} />
              <TextField control={form.control} name="grade_level" label={t("gradeLevel")} />
              <SelectField
                control={form.control}
                name="term_id"
                label={t("term")}
                placeholder={t("noTerm")}
                options={terms.map((term) => ({ value: term.id, label: term.name }))}
              />
            </div>
            <TextareaField control={form.control} name="description" label={t("description")} rows={3} />
            <ColorField control={form.control} name="color" label={t("color")} clearLabel={tCommon("remove")} className="sm:max-w-xs" />
            <CustomFieldsSection control={form.control} definitions={definitions} />
          </FieldGroup>
        </CardContent>
        <CardFooter className="justify-end">
          <Button type="submit" disabled={form.formState.isSubmitting || (Boolean(course) && !form.formState.isDirty)}>
            {form.formState.isSubmitting ? <Spinner /> : null}
            {course ? tCommon("save") : t("create")}
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
