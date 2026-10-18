"use client";

import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { useErrorMessage } from "@/components/forms/use-error-message";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { redeemInvite } from "../actions";

export function InviteForm() {
  const t = useTranslations("parent"),
    errorMessage = useErrorMessage();
  const [code, setCode] = useState("");
  const [pending, startTransition] = useTransition();
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("linkChild")}</CardTitle>
        <CardDescription>{t("linkDescription")}</CardDescription>
      </CardHeader>
      <CardContent>
        <form
          className="flex flex-wrap items-end gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            startTransition(async () => {
              try {
                const result = await redeemInvite({ code });
                if (!result.ok)
                  return void toast.error(errorMessage(result.error));
                toast.success(t("linked"));
                setCode("");
              } catch {
                toast.error(errorMessage({ key: "network" }));
              }
            });
          }}
        >
          <label className="flex-1 space-y-2 text-sm font-medium">
            {t("inviteCode")}
            <Input
              value={code}
              onChange={(event) => setCode(event.target.value)}
              required
              maxLength={64}
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              disabled={pending}
            />
          </label>
          <Button type="submit" disabled={pending || !code.trim()}>
            {t("linkChild")}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
