"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import type { Route } from "next";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { failWith } from "@/lib/errors";
import { publicEnv } from "@/lib/env";
import { useErrorMessage } from "@/components/forms/use-error-message";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { signInWithGoogle, signInWithPassword } from "../actions";
import { GoogleIcon } from "./google-icon";

const schema = z.object({ email: z.email(), password: z.string().min(1) });
type Values = z.infer<typeof schema>;

export function LoginForm({
  next,
  callbackError,
}: {
  next: string;
  callbackError: boolean;
}) {
  const t = useTranslations("auth");
  const errorMessage = useErrorMessage();
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(
    callbackError ? t("callbackFailed") : null,
  );
  const [googlePending, startGoogle] = useTransition();
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "" },
  });
  const { errors, isSubmitting } = form.formState;

  const onSubmit = form.handleSubmit(async (values) => {
    setFormError(null);
    const result = await signInWithPassword({ ...values, next }).catch(() =>
      failWith("network"),
    );
    if (!result.ok) {
      setFormError(errorMessage(result.error));
      return;
    }
    router.replace(result.data.redirectTo as Route);
    router.refresh();
  });

  const onGoogle = () =>
    startGoogle(async () => {
      setFormError(null);
      const result = await signInWithGoogle(next).catch(() =>
        failWith("network"),
      );
      if (!result.ok) {
        setFormError(errorMessage(result.error));
        return;
      }
      window.location.assign(result.data.url);
    });

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-xl">
          <h1>{t("welcome")}</h1>
        </CardTitle>
        <CardDescription>{t("signInDescription")}</CardDescription>
      </CardHeader>
      <CardContent>
        <FieldGroup>
          {formError ? (
            <Alert variant="destructive">
              <AlertDescription>{formError}</AlertDescription>
            </Alert>
          ) : null}
          {publicEnv.NEXT_PUBLIC_GOOGLE_AUTH_ENABLED ? (
            <Button
              type="button"
              variant="outline"
              size="lg"
              onClick={onGoogle}
              disabled={googlePending}
            >
              {googlePending ? <Spinner /> : <GoogleIcon />}
              {t("continueWithGoogle")}
            </Button>
          ) : null}
          <p className="text-center text-xs text-muted-foreground">
            {t("parentsHint")}
          </p>
          <FieldSeparator>{t("staffSignIn")}</FieldSeparator>
          <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
            <Field data-invalid={!!errors.email}>
              <FieldLabel htmlFor="email">{t("email")}</FieldLabel>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                aria-invalid={!!errors.email}
                {...form.register("email")}
              />
              <FieldError>{errors.email ? t("emailInvalid") : null}</FieldError>
            </Field>
            <Field data-invalid={!!errors.password}>
              <div className="flex items-center justify-between">
                <FieldLabel htmlFor="password">{t("password")}</FieldLabel>
                <Link
                  href="/auth/forgot-password"
                  className="text-xs text-muted-foreground underline-offset-4 hover:underline"
                >
                  {t("forgotPassword")}
                </Link>
              </div>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                aria-invalid={!!errors.password}
                {...form.register("password")}
              />
              <FieldError>
                {errors.password ? t("passwordRequired") : null}
              </FieldError>
            </Field>
            <Button type="submit" size="lg" disabled={isSubmitting}>
              {isSubmitting ? <Spinner /> : null}
              {t("signIn")}
            </Button>
          </form>
        </FieldGroup>
      </CardContent>
    </Card>
  );
}
