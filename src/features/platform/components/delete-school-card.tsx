"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { useErrorMessage } from "@/components/forms/use-error-message";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { deleteSchool } from "../actions";

/** Irreversible: deletes the school and every record that belongs to it. */
export function DeleteSchoolCard({ schoolId, schoolName }: { schoolId: string; schoolName: string }) {
  const t = useTranslations("platform");
  const errorMessage = useErrorMessage();
  const router = useRouter();
  const [confirmation, setConfirmation] = useState("");

  return (
    <Card className="border-destructive/30">
      <CardHeader>
        <CardTitle>{t("deleteSchool")}</CardTitle>
        <CardDescription>{t("deleteSchoolDescription")}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-end">
        <Field className="sm:max-w-sm">
          <FieldLabel htmlFor="confirm-school-name">{t("typeSchoolName", { name: schoolName })}</FieldLabel>
          <Input
            id="confirm-school-name"
            value={confirmation}
            autoComplete="off"
            onChange={(e) => setConfirmation(e.target.value)}
          />
        </Field>
        <ConfirmDialog
          trigger={
            <Button variant="destructive" disabled={confirmation.trim() !== schoolName}>
              {t("deleteSchool")}
            </Button>
          }
          title={t("deleteSchoolConfirmTitle", { name: schoolName })}
          description={t("deleteSchoolConfirmDescription")}
          confirmLabel={t("deleteSchool")}
          onConfirm={async () => {
            const result = await deleteSchool(schoolId);
            if (!result.ok) {
              toast.error(errorMessage(result.error));
              return false;
            }
            toast.success(t("schoolDeleted"));
            router.replace("/admin");
            router.refresh();
            return true;
          }}
        />
      </CardContent>
    </Card>
  );
}
