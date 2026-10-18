"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import type { z } from "zod";
import { ConfirmDialog } from "@/components/confirm-dialog";
import {
  SelectField,
  SwitchField,
  TextareaField,
  TextField,
} from "@/components/forms/fields";
import { useErrorMessage } from "@/components/forms/use-error-message";
import { useSubmitAction } from "@/components/forms/use-submit-action";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Tables } from "@/lib/supabase/types";
import {
  deleteDefinition,
  deleteTerm,
  saveDefinition,
  saveTerm,
} from "../administration-actions";
import {
  definitionSchema,
  FIELD_ENTITIES,
  FIELD_TYPES,
  termSchema,
} from "../administration-schema";

type Term = Pick<
  Tables<"academic_terms">,
  "id" | "name" | "starts_on" | "ends_on"
>;
type Definition = Tables<"custom_field_definitions">;

function TermForm({
  schoolId,
  term,
  close,
}: {
  schoolId: string;
  term: Term | null;
  close: () => void;
}) {
  const t = useTranslations("settings"),
    common = useTranslations("common");
  const form = useForm<
    z.input<typeof termSchema>,
    unknown,
    z.output<typeof termSchema>
  >({
    resolver: zodResolver(termSchema),
    defaultValues: term ?? { name: "", starts_on: "", ends_on: "" },
  });
  const submit = useSubmitAction(
    form,
    saveTerm.bind(null, schoolId, term?.id ?? null),
    { onSuccess: close },
  );
  return (
    <form onSubmit={submit} noValidate>
      <fieldset className="space-y-4" disabled={form.formState.isSubmitting}>
        <TextField control={form.control} name="name" label={t("name")} />
        <TextField
          control={form.control}
          name="starts_on"
          label={t("startsOn")}
          type="date"
        />
        <TextField
          control={form.control}
          name="ends_on"
          label={t("endsOn")}
          type="date"
        />
        <Button type="submit">{common("save")}</Button>
      </fieldset>
    </form>
  );
}
function DefinitionForm({
  schoolId,
  definition,
  close,
}: {
  schoolId: string;
  definition: Definition | null;
  close: () => void;
}) {
  const t = useTranslations("settings"),
    common = useTranslations("common");
  const form = useForm<
    z.input<typeof definitionSchema>,
    unknown,
    z.output<typeof definitionSchema>
  >({
    resolver: zodResolver(definitionSchema),
    defaultValues: definition
      ? {
          ...definition,
          sort_order: String(definition.sort_order),
          options_text: definition.options.join("\n"),
        }
      : {
          entity: "student",
          key: "",
          label: "",
          field_type: "text",
          options_text: "",
          visible_to_guardians: false,
          sort_order: "0",
        },
  });
  const fieldType = useWatch({ control: form.control, name: "field_type" });
  const submit = useSubmitAction(
    form,
    saveDefinition.bind(null, schoolId, definition?.id ?? null),
    { onSuccess: close },
  );
  return (
    <form onSubmit={submit} noValidate>
      <fieldset className="space-y-4" disabled={form.formState.isSubmitting}>
        <SelectField
          control={form.control}
          name="entity"
          label={t("entity")}
          options={FIELD_ENTITIES.map((entity) => ({
            value: entity,
            label: t(`entities.${entity}`),
          }))}
          disabled={!!definition}
        />
        <TextField
          control={form.control}
          name="key"
          label={t("key")}
          description={t("keyHint")}
          disabled={!!definition}
        />
        <TextField control={form.control} name="label" label={t("label")} />
        <SelectField
          control={form.control}
          name="field_type"
          label={t("fieldType")}
          options={FIELD_TYPES.map((type) => ({
            value: type,
            label: t(`types.${type}`),
          }))}
          disabled={!!definition}
        />
        {["select", "multi_select"].includes(fieldType) ? (
          <TextareaField
            control={form.control}
            name="options_text"
            label={t("options")}
            description={t("optionsHint")}
          />
        ) : null}
        <TextField
          control={form.control}
          name="sort_order"
          label={t("sortOrder")}
          type="number"
          min={-10000}
          max={10000}
        />
        <SwitchField
          control={form.control}
          name="visible_to_guardians"
          label={t("visibleToParents")}
        />
        <Button type="submit">{common("save")}</Button>
      </fieldset>
    </form>
  );
}
export function AdministrationPanels({
  schoolId,
  terms,
  definitions,
}: {
  schoolId: string;
  terms: Term[];
  definitions: Definition[];
}) {
  const t = useTranslations("settings"),
    common = useTranslations("common"),
    errorMessage = useErrorMessage();
  const [editingTerm, setEditingTerm] = useState<Term | "new" | null>(null);
  const [editingDefinition, setEditingDefinition] = useState<
    Definition | "new" | null
  >(null);
  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>{t("terms")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button onClick={() => setEditingTerm("new")}>{t("newTerm")}</Button>
          {terms.map((term) => (
            <div
              key={term.id}
              className="flex flex-wrap items-center justify-between gap-2 border-b py-3"
            >
              <div>
                <p className="font-medium">{term.name}</p>
                <p className="text-xs text-muted-foreground">
                  {term.starts_on} – {term.ends_on}
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setEditingTerm(term)}>
                  {common("edit")}
                </Button>
                <ConfirmDialog
                  trigger={<Button variant="ghost">{common("delete")}</Button>}
                  title={t("deleteTerm")}
                  description={t("deleteTermDescription")}
                  onConfirm={async () => {
                    const result = await deleteTerm(schoolId, term.id);
                    if (!result.ok) toast.error(errorMessage(result.error));
                    return result.ok;
                  }}
                />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>{t("customFields")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button onClick={() => setEditingDefinition("new")}>
            {t("newField")}
          </Button>
          {definitions.map((definition) => (
            <div
              key={definition.id}
              className="flex flex-wrap items-center justify-between gap-2 border-b py-3"
            >
              <div>
                <p className="font-medium">{definition.label}</p>
                <p className="text-xs text-muted-foreground">
                  {t(`entities.${definition.entity}`)} ·{" "}
                  {t(`types.${definition.field_type}`)} · {definition.key}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setEditingDefinition(definition)}
                >
                  {common("edit")}
                </Button>
                <ConfirmDialog
                  trigger={<Button variant="ghost">{common("delete")}</Button>}
                  title={t("deleteField")}
                  description={t("deleteFieldDescription")}
                  onConfirm={async () => {
                    const result = await deleteDefinition(
                      schoolId,
                      definition.id,
                    );
                    if (!result.ok) toast.error(errorMessage(result.error));
                    return result.ok;
                  }}
                />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
      <Dialog
        open={editingTerm !== null}
        onOpenChange={(open) => !open && setEditingTerm(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("terms")}</DialogTitle>
          </DialogHeader>
          {editingTerm ? (
            <TermForm
              key={editingTerm === "new" ? "new" : editingTerm.id}
              schoolId={schoolId}
              term={editingTerm === "new" ? null : editingTerm}
              close={() => setEditingTerm(null)}
            />
          ) : null}
        </DialogContent>
      </Dialog>
      <Dialog
        open={editingDefinition !== null}
        onOpenChange={(open) => !open && setEditingDefinition(null)}
      >
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("customFields")}</DialogTitle>
          </DialogHeader>
          {editingDefinition ? (
            <DefinitionForm
              key={editingDefinition === "new" ? "new" : editingDefinition.id}
              schoolId={schoolId}
              definition={
                editingDefinition === "new" ? null : editingDefinition
              }
              close={() => setEditingDefinition(null)}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
