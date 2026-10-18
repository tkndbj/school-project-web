"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useErrorMessage } from "@/components/forms/use-error-message";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { requestPasswordReset } from "../actions";

const schema = z.object({ email: z.email() });

export function ForgotPasswordForm() {
  const t = useTranslations("auth");
  const errorMessage = useErrorMessage();
  const [sent, setSent] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const form = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema), defaultValues: { email: "" } });
  const { errors, isSubmitting } = form.formState;

  const onSubmit = form.handleSubmit(async (values) => {
    setFormError(null);
    const result = await requestPasswordReset(values);
    if (!result.ok) setFormError(errorMessage(result.error));
    else setSent(true);
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">{t("resetPassword")}</CardTitle>
        <CardDescription>{t("resetPasswordDescription")}</CardDescription>
      </CardHeader>
      <CardContent>
        {sent ? (
          <Alert>
            <AlertDescription>{t("resetEmailSent")}</AlertDescription>
          </Alert>
        ) : (
          <form onSubmit={onSubmit} noValidate>
            <FieldGroup>
              {formError ? (
                <Alert variant="destructive">
                  <AlertDescription>{formError}</AlertDescription>
                </Alert>
              ) : null}
              <Field data-invalid={!!errors.email}>
                <FieldLabel htmlFor="email">{t("email")}</FieldLabel>
                <Input id="email" type="email" autoComplete="email" aria-invalid={!!errors.email} {...form.register("email")} />
                <FieldError>{errors.email ? t("emailInvalid") : null}</FieldError>
              </Field>
              <Button type="submit" size="lg" disabled={isSubmitting}>
                {isSubmitting ? <Spinner /> : null}
                {t("sendResetLink")}
              </Button>
            </FieldGroup>
          </form>
        )}
        <p className="mt-4 text-center text-sm">
          <Link href="/login" className="text-muted-foreground underline-offset-4 hover:underline">
            {t("backToSignIn")}
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
