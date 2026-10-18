"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useErrorMessage } from "@/components/forms/use-error-message";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { setPassword } from "../actions";
import { passwordSchema } from "../schema";

const schema = z
  .object({ password: passwordSchema, confirm: z.string() })
  .refine((v) => v.password === v.confirm, { path: ["confirm"] });

export function SetPasswordForm({ email }: { email: string | null }) {
  const t = useTranslations("auth");
  const errorMessage = useErrorMessage();
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { password: "", confirm: "" },
  });
  const { errors, isSubmitting } = form.formState;

  const onSubmit = form.handleSubmit(async ({ password }) => {
    setFormError(null);
    const result = await setPassword({ password });
    if (!result.ok) {
      setFormError(errorMessage(result.error));
      return;
    }
    router.replace("/");
    router.refresh();
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">{t("setPassword")}</CardTitle>
        <CardDescription>{email ? t("setPasswordFor", { email }) : t("setPasswordDescription")}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} noValidate>
          <FieldGroup>
            {formError ? (
              <Alert variant="destructive">
                <AlertDescription>{formError}</AlertDescription>
              </Alert>
            ) : null}
            <Field data-invalid={!!errors.password}>
              <FieldLabel htmlFor="password">{t("newPassword")}</FieldLabel>
              <Input
                id="password"
                type="password"
                autoComplete="new-password"
                aria-invalid={!!errors.password}
                {...form.register("password")}
              />
              <FieldDescription>{t("passwordRules")}</FieldDescription>
              <FieldError>{errors.password ? t("passwordTooWeak") : null}</FieldError>
            </Field>
            <Field data-invalid={!!errors.confirm}>
              <FieldLabel htmlFor="confirm">{t("confirmPassword")}</FieldLabel>
              <Input
                id="confirm"
                type="password"
                autoComplete="new-password"
                aria-invalid={!!errors.confirm}
                {...form.register("confirm")}
              />
              <FieldError>{errors.confirm ? t("passwordsDoNotMatch") : null}</FieldError>
            </Field>
            <Button type="submit" size="lg" disabled={isSubmitting}>
              {isSubmitting ? <Spinner /> : null}
              {t("savePassword")}
            </Button>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}
