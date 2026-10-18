"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { SelectField, SwitchField, TextareaField, TextField } from "@/components/forms/fields";
import { useSubmitAction } from "@/components/forms/use-submit-action";
import { Button } from "@/components/ui/button";
import { FieldGroup } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import type { ActionResult } from "@/lib/errors";
import type { Tables } from "@/lib/supabase/types";
import { ASSESSMENT_KINDS, assessmentSchema, type AssessmentInput, type AssessmentOutput } from "../schema";

export function AssessmentForm<TResult>({
  terms,
  assessment,
  onSave,
  onSaved,
  submitLabel,
}: {
  terms: { id: string; name: string }[];
  assessment?: Tables<"assessments">;
  onSave: (values: AssessmentOutput) => Promise<ActionResult<TResult>>;
  onSaved?: (data: TResult) => void;
  submitLabel: string;
}) {
  const t = useTranslations("grades");
  const form = useForm<AssessmentInput, unknown, AssessmentOutput>({
    resolver: zodResolver(assessmentSchema),
    defaultValues: {
      title: assessment?.title ?? "",
      kind: assessment?.kind ?? "exam",
      description: assessment?.description ?? "",
      max_score: assessment ? String(assessment.max_score) : "100",
      weight: assessment?.weight !== null && assessment?.weight !== undefined ? String(assessment.weight) : "",
      assessed_on: assessment?.assessed_on ?? new Date().toISOString().slice(0, 10),
      term_id: assessment?.term_id ?? "",
      published: Boolean(assessment?.published_at),
    },
  });
  const onSubmit = useSubmitAction(form, onSave, { resetOnSuccess: Boolean(assessment), onSuccess: onSaved });

  return (
    <form onSubmit={onSubmit} noValidate>
      <FieldGroup>
        <TextField control={form.control} name="title" label={t("assessmentTitle")} required />
        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField
            control={form.control}
            name="kind"
            label={t("kind")}
            options={ASSESSMENT_KINDS.map((k) => ({ value: k, label: t(`kinds.${k}`) }))}
          />
          <TextField control={form.control} name="assessed_on" label={t("date")} type="date" />
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <TextField control={form.control} name="max_score" label={t("maxScore")} inputMode="decimal" />
          <TextField control={form.control} name="weight" label={t("weight")} inputMode="decimal" />
          <SelectField
            control={form.control}
            name="term_id"
            label={t("term")}
            placeholder={t("courseTerm")}
            options={terms.map((term) => ({ value: term.id, label: term.name }))}
          />
        </div>
        <TextareaField control={form.control} name="description" label={t("description")} rows={2} />
        <SwitchField
          control={form.control}
          name="published"
          label={t("publishToParents")}
          description={t("publishDescription")}
        />
        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? <Spinner /> : null}
          {submitLabel}
        </Button>
      </FieldGroup>
    </form>
  );
}
