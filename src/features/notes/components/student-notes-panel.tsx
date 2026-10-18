"use client";

import { EyeIcon, EyeOffIcon, NotebookPenIcon, Trash2Icon } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { EmptyState } from "@/components/empty-state";
import { useErrorMessage } from "@/components/forms/use-error-message";
import { NativeSelect } from "@/components/native-select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { addStudentNote, deleteStudentNote, setNoteVisibility } from "../actions";

type Note = {
  id: string;
  title: string | null;
  body: string;
  category: string | null;
  visibleToGuardians: boolean;
  createdAt: string;
  teacherName: string | null;
};

export function StudentNotesPanel({
  schoolId,
  studentId,
  timezone,
  teachers,
  notes,
}: {
  schoolId: string;
  studentId: string;
  timezone: string;
  teachers: { id: string; name: string }[];
  notes: Note[];
}) {
  const t = useTranslations("notes");
  const tCommon = useTranslations("common");
  const format = useFormatter();
  const errorMessage = useErrorMessage();
  const [pending, startTransition] = useTransition();
  const [draft, setDraft] = useState({ title: "", body: "", teacher_id: "", visible_to_guardians: false });

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!draft.body.trim()) return;
    startTransition(async () => {
      const result = await addStudentNote(schoolId, studentId, { ...draft, category: null });
      if (!result.ok) return void toast.error(errorMessage(result.error));
      toast.success(t("added"));
      setDraft({ title: "", body: "", teacher_id: draft.teacher_id, visible_to_guardians: false });
    });
  }

  return (
    <div className="grid gap-4">
      <Card>
        <CardHeader>
          <CardTitle>{t("addNote")}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit}>
            <FieldGroup>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="note-title">{t("noteTitle")}</FieldLabel>
                  <Input
                    id="note-title"
                    maxLength={200}
                    value={draft.title}
                    onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                  />
                </Field>
                {teachers.length > 0 ? (
                  <Field>
                    <FieldLabel htmlFor="note-teacher">{t("teacher")}</FieldLabel>
                    <NativeSelect
                      id="note-teacher"
                      value={draft.teacher_id}
                      onChange={(e) => setDraft({ ...draft, teacher_id: e.target.value })}
                    >
                      <option value="">{tCommon("notSet")}</option>
                      {teachers.map((teacher) => (
                        <option key={teacher.id} value={teacher.id}>
                          {teacher.name}
                        </option>
                      ))}
                    </NativeSelect>
                  </Field>
                ) : null}
              </div>
              <Field>
                <FieldLabel htmlFor="note-body">{t("body")}</FieldLabel>
                <Textarea
                  id="note-body"
                  rows={4}
                  maxLength={10000}
                  required
                  value={draft.body}
                  onChange={(e) => setDraft({ ...draft, body: e.target.value })}
                />
              </Field>
              <Field orientation="horizontal">
                <div className="flex flex-1 flex-col gap-0.5">
                  <FieldLabel htmlFor="note-visible">{t("visibleToParents")}</FieldLabel>
                  <FieldDescription>{t("visibleToParentsDescription")}</FieldDescription>
                </div>
                <Switch
                  id="note-visible"
                  checked={draft.visible_to_guardians}
                  onCheckedChange={(checked) => setDraft({ ...draft, visible_to_guardians: checked })}
                />
              </Field>
              <div className="flex justify-end">
                <Button type="submit" disabled={pending || !draft.body.trim()}>
                  {pending ? <Spinner /> : <NotebookPenIcon />}
                  {t("addNote")}
                </Button>
              </div>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>

      {notes.length === 0 ? (
        <EmptyState icon={NotebookPenIcon} title={t("empty")} />
      ) : (
        <ul className="grid gap-3">
          {notes.map((note) => (
            <li key={note.id}>
              <Card>
                <CardContent className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      {note.title ? <div className="font-medium">{note.title}</div> : null}
                      <div className="text-xs text-muted-foreground">
                        {format.dateTime(new Date(note.createdAt), { dateStyle: "medium", timeStyle: "short", timeZone: timezone })}
                        {note.teacherName ? ` · ${note.teacherName}` : ""}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <Badge variant={note.visibleToGuardians ? "secondary" : "outline"}>
                        {note.visibleToGuardians ? t("sharedWithParents") : t("staffOnly")}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        disabled={pending}
                        aria-label={note.visibleToGuardians ? t("hideFromParents") : t("shareWithParents")}
                        onClick={() =>
                          startTransition(async () => {
                            const result = await setNoteVisibility(schoolId, note.id, !note.visibleToGuardians);
                            if (!result.ok) toast.error(errorMessage(result.error));
                          })
                        }
                      >
                        {note.visibleToGuardians ? <EyeOffIcon /> : <EyeIcon />}
                      </Button>
                      <ConfirmDialog
                        trigger={
                          <Button variant="ghost" size="icon-sm" aria-label={tCommon("delete")}>
                            <Trash2Icon />
                          </Button>
                        }
                        title={t("deleteTitle")}
                        confirmLabel={tCommon("delete")}
                        onConfirm={async () => {
                          const result = await deleteStudentNote(schoolId, note.id);
                          if (!result.ok) toast.error(errorMessage(result.error));
                          return result.ok;
                        }}
                      />
                    </div>
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{note.body}</p>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
