"use client";

import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { useErrorMessage } from "@/components/forms/use-error-message";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { deleteMyAccount } from "../actions";

export function DeleteAccountCard() {
  const t = useTranslations("account");
  const errorMessage = useErrorMessage();

  return (
    <Card className="border-destructive/30">
      <CardHeader>
        <CardTitle>{t("deleteTitle")}</CardTitle>
        <CardDescription>{t("deleteDescription")}</CardDescription>
      </CardHeader>
      <CardContent>
        <ConfirmDialog
          trigger={<Button variant="destructive">{t("deleteButton")}</Button>}
          title={t("deleteConfirmTitle")}
          description={t("deleteConfirmDescription")}
          confirmLabel={t("deleteButton")}
          onConfirm={async () => {
            const result = await deleteMyAccount();
            // On success the action redirects to the sign-in page.
            if (!result.ok) toast.error(errorMessage(result.error));
            return result.ok;
          }}
        />
      </CardContent>
    </Card>
  );
}
