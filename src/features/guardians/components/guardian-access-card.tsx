"use client";

import { CopyIcon, KeyRoundIcon, MailIcon, UnlinkIcon } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { useErrorMessage } from "@/components/forms/use-error-message";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import type { Enums } from "@/lib/supabase/types";
import {
  createGuardianInvite,
  revokeGuardianInvite,
  unlinkGuardianAccount,
  inviteGuardianAccount,
} from "../actions";
import { failWith } from "@/lib/errors";
import { GuardianAccountBadge } from "./guardian-account-badge";

type Invite = {
  id: string;
  expires_at: string;
  created_at: string;
  redeemed_at: string | null;
  revoked_at: string | null;
};

/** App-account connection of a guardian: link status, invite codes, unlinking. */
export function GuardianAccessCard({
  schoolId,
  guardianId,
  linked,
  linkMethod,
  linkedAt,
  hasEmail,
  invites,
}: {
  schoolId: string;
  guardianId: string;
  linked: boolean;
  linkMethod: Enums<"guardian_link_method"> | null;
  linkedAt: string | null;
  hasEmail: boolean;
  invites: Invite[];
}) {
  const t = useTranslations("guardians");
  const format = useFormatter();
  const errorMessage = useErrorMessage();
  const [pending, startTransition] = useTransition();
  const [code, setCode] = useState<{ code: string; expiresAt: string } | null>(
    null,
  );
  const now = new Date();
  const active = invites.filter(
    (i) => !i.redeemed_at && !i.revoked_at && new Date(i.expires_at) > now,
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {t("appAccess")}
          <GuardianAccountBadge linked={linked} method={linkMethod} />
        </CardTitle>
        <CardDescription>
          {linked && linkedAt
            ? t("linkedSince", {
                date: format.dateTime(new Date(linkedAt), {
                  dateStyle: "medium",
                }),
              })
            : hasEmail
              ? t("notLinkedWithEmail")
              : t("notLinkedNoEmail")}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {code ? (
          <Alert>
            <KeyRoundIcon />
            <AlertTitle>{t("inviteCodeTitle")}</AlertTitle>
            <AlertDescription className="space-y-2">
              <p>{t("inviteCodeShownOnce")}</p>
              <div className="flex flex-wrap items-center gap-2">
                <code className="rounded-md bg-muted px-3 py-1.5 font-mono text-lg tracking-widest text-foreground">
                  {code.code}
                </code>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    await navigator.clipboard.writeText(code.code);
                    toast.success(t("copied"));
                  }}
                >
                  <CopyIcon />
                  {t("copy")}
                </Button>
              </div>
              <p className="text-xs">
                {t("inviteExpires", {
                  date: format.dateTime(new Date(code.expiresAt), {
                    dateStyle: "medium",
                  }),
                })}
              </p>
            </AlertDescription>
          </Alert>
        ) : null}
        <div className="flex flex-wrap gap-2">
          {hasEmail ? (
            <Button
              variant="outline"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  const result = await inviteGuardianAccount(
                    schoolId,
                    guardianId,
                  ).catch(() => failWith("network"));
                  if (!result.ok)
                    return void toast.error(errorMessage(result.error));
                  toast.success(t("emailAccessReady"));
                })
              }
            >
              <MailIcon />
              {t("inviteByEmail")}
            </Button>
          ) : null}
          {!linked ? (
            <Button
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  const result = await createGuardianInvite(
                    schoolId,
                    guardianId,
                  );
                  if (!result.ok)
                    return void toast.error(errorMessage(result.error));
                  setCode(result.data);
                })
              }
            >
              {pending ? <Spinner /> : <KeyRoundIcon />}
              {active.length > 0 ? t("regenerateInvite") : t("createInvite")}
            </Button>
          ) : (
            <ConfirmDialog
              trigger={
                <Button variant="outline">
                  <UnlinkIcon />
                  {t("unlinkAccount")}
                </Button>
              }
              title={t("unlinkAccountTitle")}
              description={t("unlinkAccountDescription")}
              confirmLabel={t("unlinkAccount")}
              onConfirm={async () => {
                const result = await unlinkGuardianAccount(
                  schoolId,
                  guardianId,
                );
                if (!result.ok) toast.error(errorMessage(result.error));
                return result.ok;
              }}
            />
          )}
          {active.map((invite) => (
            <Button
              key={invite.id}
              variant="ghost"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  const result = await revokeGuardianInvite(
                    schoolId,
                    invite.id,
                  );
                  if (!result.ok)
                    return void toast.error(errorMessage(result.error));
                  setCode(null);
                  toast.success(t("inviteRevoked"));
                })
              }
            >
              {t("revokeInvite", {
                date: format.dateTime(new Date(invite.expires_at), {
                  dateStyle: "short",
                }),
              })}
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
