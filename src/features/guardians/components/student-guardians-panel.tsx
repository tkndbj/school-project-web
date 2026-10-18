"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { LinkIcon, PlusIcon, UnlinkIcon, UsersIcon } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import type { z } from "zod";
import { AsyncSearchPicker, type PickerItem } from "@/components/async-search-picker";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { EmptyState } from "@/components/empty-state";
import { CheckboxField, SelectField, TextField } from "@/components/forms/fields";
import { useErrorMessage } from "@/components/forms/use-error-message";
import { useSubmitAction } from "@/components/forms/use-submit-action";
import { NativeSelect } from "@/components/native-select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { displayName } from "@/lib/people";
import type { Enums } from "@/lib/supabase/types";
import { schoolPath } from "../../school-panel/paths";
import {
  createGuardianForStudent,
  linkGuardianToStudent,
  searchGuardiansAction,
  unlinkGuardianFromStudent,
} from "../actions";
import { newGuardianForStudentSchema, RELATIONSHIPS } from "../schema";
import { GuardianAccountBadge } from "./guardian-account-badge";

type GuardianLink = {
  linkId: string;
  relationship: Enums<"guardian_relationship"> | null;
  isPrimary: boolean;
  guardian: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    email: string | null;
    phone: string | null;
    user_id: string | null;
    link_method: Enums<"guardian_link_method"> | null;
  };
};

export function StudentGuardiansPanel({
  schoolId,
  slug,
  studentId,
  links,
}: {
  schoolId: string;
  slug: string;
  studentId: string;
  links: GuardianLink[];
}) {
  const t = useTranslations("guardians");
  const tRel = useTranslations("relationships");
  const errorMessage = useErrorMessage();

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle>{t("studentGuardians")}</CardTitle>
        <AddGuardianDialog schoolId={schoolId} studentId={studentId} linkedIds={links.map((l) => l.guardian.id)} />
      </CardHeader>
      <CardContent>
        {links.length === 0 ? (
          <EmptyState icon={UsersIcon} title={t("noGuardians")} description={t("noGuardiansDescription")} />
        ) : (
          <ul className="divide-y">
            {links.map((link) => (
              <li key={link.linkId} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={schoolPath(slug, "guardians", link.guardian.id)}
                      className="font-medium hover:underline"
                    >
                      {displayName(link.guardian)}
                    </Link>
                    {link.relationship ? <Badge variant="outline">{tRel(link.relationship)}</Badge> : null}
                    {link.isPrimary ? <Badge variant="secondary">{t("primary")}</Badge> : null}
                    <GuardianAccountBadge linked={Boolean(link.guardian.user_id)} method={link.guardian.link_method} />
                  </div>
                  <div className="truncate text-sm text-muted-foreground">
                    {[link.guardian.email, link.guardian.phone].filter(Boolean).join(" · ") || t("noContact")}
                  </div>
                </div>
                <ConfirmDialog
                  trigger={
                    <Button variant="ghost" size="sm">
                      <UnlinkIcon />
                      {t("unlinkFromStudent")}
                    </Button>
                  }
                  title={t("unlinkFromStudentTitle")}
                  description={t("unlinkFromStudentDescription", { name: displayName(link.guardian) })}
                  confirmLabel={t("unlinkFromStudent")}
                  onConfirm={async () => {
                    const result = await unlinkGuardianFromStudent(schoolId, link.linkId);
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

type NewInput = z.input<typeof newGuardianForStudentSchema>;
type NewOutput = z.output<typeof newGuardianForStudentSchema>;

function AddGuardianDialog({
  schoolId,
  studentId,
  linkedIds,
}: {
  schoolId: string;
  studentId: string;
  linkedIds: string[];
}) {
  const t = useTranslations("guardians");
  const tRel = useTranslations("relationships");
  const tCommon = useTranslations("common");
  const errorMessage = useErrorMessage();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<PickerItem | null>(null);
  const [relationship, setRelationship] = useState<(typeof RELATIONSHIPS)[number] | "">("");
  const [isPrimary, setIsPrimary] = useState(false);
  const [linking, setLinking] = useState(false);
  const relationshipOptions = RELATIONSHIPS.map((r) => ({ value: r, label: tRel(r) }));

  const form = useForm<NewInput, unknown, NewOutput>({
    resolver: zodResolver(newGuardianForStudentSchema),
    defaultValues: { first_name: "", last_name: "", email: "", phone: "", relationship: "", is_primary: false },
  });
  const onCreate = useSubmitAction(form, (values) => createGuardianForStudent(schoolId, studentId, values), {
    successMessage: false,
    onSuccess: ({ linkedAccount }) => {
      toast.success(linkedAccount ? t("createdAndLinkedAccount") : t("created"));
      form.reset();
      setOpen(false);
    },
  });

  async function linkExisting() {
    if (!selected) return;
    setLinking(true);
    const result = await linkGuardianToStudent(schoolId, studentId, selected.id, {
      relationship: relationship || null,
      is_primary: isPrimary,
    });
    setLinking(false);
    if (!result.ok) return toast.error(errorMessage(result.error));
    toast.success(t("linked"));
    setSelected(null);
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button size="sm">
            <PlusIcon />
            {t("addGuardian")}
          </Button>
        }
      />
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("addGuardian")}</DialogTitle>
          <DialogDescription>{t("addGuardianDescription")}</DialogDescription>
        </DialogHeader>
        <Tabs defaultValue="new">
          <TabsList className="w-full">
            <TabsTrigger value="new">{t("newGuardian")}</TabsTrigger>
            <TabsTrigger value="existing">{t("existingGuardian")}</TabsTrigger>
          </TabsList>
          <TabsContent value="new">
            <form onSubmit={onCreate} noValidate>
              <FieldGroup>
                <div className="grid gap-4 sm:grid-cols-2">
                  <TextField control={form.control} name="first_name" label={t("firstName")} />
                  <TextField control={form.control} name="last_name" label={t("lastName")} />
                </div>
                <TextField
                  control={form.control}
                  name="email"
                  label={t("email")}
                  type="email"
                  description={t("emailLinkHint")}
                />
                <TextField control={form.control} name="phone" label={t("phone")} type="tel" />
                <SelectField
                  control={form.control}
                  name="relationship"
                  label={t("relationship")}
                  placeholder={tCommon("notSet")}
                  options={relationshipOptions}
                />
                <CheckboxField control={form.control} name="is_primary" label={t("primaryContact")} />
                <Button type="submit" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting ? <Spinner /> : <PlusIcon />}
                  {t("createAndLink")}
                </Button>
              </FieldGroup>
            </form>
          </TabsContent>
          <TabsContent value="existing">
            <FieldGroup>
              {selected ? (
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div className="min-w-0">
                    <div className="truncate font-medium">{selected.label}</div>
                    {selected.description ? (
                      <div className="truncate text-xs text-muted-foreground">{selected.description}</div>
                    ) : null}
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setSelected(null)}>
                    {tCommon("change")}
                  </Button>
                </div>
              ) : (
                <AsyncSearchPicker
                  search={(q) => searchGuardiansAction(schoolId, q)}
                  onSelect={setSelected}
                  excludeIds={linkedIds}
                  placeholder={t("searchPlaceholder")}
                />
              )}
              <Field>
                <FieldLabel htmlFor="existing-relationship">{t("relationship")}</FieldLabel>
                <NativeSelect
                  id="existing-relationship"
                  value={relationship}
                  onChange={(e) => setRelationship(e.target.value as (typeof RELATIONSHIPS)[number] | "")}
                >
                  <option value="">{tCommon("notSet")}</option>
                  {relationshipOptions.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
              <Field orientation="horizontal">
                <Checkbox id="existing-primary" checked={isPrimary} onCheckedChange={(c) => setIsPrimary(c === true)} />
                <FieldLabel htmlFor="existing-primary">{t("primaryContact")}</FieldLabel>
              </Field>
              <Button onClick={linkExisting} disabled={!selected || linking}>
                {linking ? <Spinner /> : <LinkIcon />}
                {t("link")}
              </Button>
            </FieldGroup>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
