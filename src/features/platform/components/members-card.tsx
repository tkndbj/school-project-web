"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { MailIcon, Trash2Icon } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import type { z } from "zod";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { SelectField, TextField } from "@/components/forms/fields";
import { useErrorMessage } from "@/components/forms/use-error-message";
import { useSubmitAction } from "@/components/forms/use-submit-action";
import { NativeSelect } from "@/components/native-select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { inviteMemberSchema, SCHOOL_ROLES } from "../../schools/schema";
import { changeMemberRole, inviteMember, removeMember } from "../actions";
import type { SchoolMemberRow } from "../queries";
import {
  changeSchoolMemberRole,
  inviteSchoolMember,
  removeSchoolMember,
} from "../../schools/actions";

type InviteInput = z.input<typeof inviteMemberSchema>;
type InviteOutput = z.output<typeof inviteMemberSchema>;

export function MembersCard({
  schoolId,
  members,
  schoolAdmin = false,
}: {
  schoolId: string;
  members: SchoolMemberRow[];
  schoolAdmin?: boolean;
}) {
  const t = useTranslations("platform");
  const tRoles = useTranslations("roles");
  const format = useFormatter();
  const errorMessage = useErrorMessage();
  const [pending, startTransition] = useTransition();

  const form = useForm<InviteInput, unknown, InviteOutput>({
    resolver: zodResolver(inviteMemberSchema),
    defaultValues: { school_id: schoolId, email: "", role: "admin" },
  });
  const onInvite = useSubmitAction(
    form,
    schoolAdmin ? inviteSchoolMember : inviteMember,
    {
      successMessage: false,
      onSuccess: ({ invited }) => {
        toast.success(invited ? t("invitationSent") : t("memberAdded"));
        form.reset({
          school_id: schoolId,
          email: "",
          role: form.getValues("role"),
        });
      },
    },
  );

  const roleOptions = SCHOOL_ROLES.map((r) => ({ value: r, label: tRoles(r) }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("schoolAccounts")}</CardTitle>
        <CardDescription>{t("schoolAccountsDescription")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <form
          onSubmit={onInvite}
          noValidate
          className="grid gap-4 sm:grid-cols-[1fr_10rem_auto] sm:items-end"
        >
          <TextField
            control={form.control}
            name="email"
            label={t("adminEmail")}
            type="email"
            autoComplete="off"
          />
          <SelectField
            control={form.control}
            name="role"
            label={t("role")}
            options={roleOptions}
          />
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? <Spinner /> : <MailIcon />}
            {t("invite")}
          </Button>
        </form>

        {members.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("noMembers")}</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("account")}</TableHead>
                <TableHead className="w-36">{t("role")}</TableHead>
                <TableHead className="hidden md:table-cell">
                  {t("lastSignIn")}
                </TableHead>
                <TableHead className="w-12">
                  <span className="sr-only">{t("actions")}</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((member) => (
                <TableRow key={member.id}>
                  <TableCell>
                    <div className="font-medium">
                      {member.fullName ?? member.email}
                    </div>
                    {member.fullName ? (
                      <div className="text-xs text-muted-foreground">
                        {member.email}
                      </div>
                    ) : null}
                    {member.pending ? (
                      <Badge variant="outline" className="mt-1">
                        {t("invitationPending")}
                      </Badge>
                    ) : null}
                  </TableCell>
                  <TableCell>
                    <NativeSelect
                      aria-label={t("role")}
                      value={member.role}
                      disabled={pending}
                      onChange={(e) => {
                        const role = e.target
                          .value as (typeof SCHOOL_ROLES)[number];
                        startTransition(async () => {
                          const result = await (schoolAdmin
                            ? changeSchoolMemberRole(schoolId, member.id, role)
                            : changeMemberRole(member.id, role));
                          if (!result.ok)
                            toast.error(errorMessage(result.error));
                        });
                      }}
                    >
                      {roleOptions.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </NativeSelect>
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground md:table-cell">
                    {member.lastSignInAt
                      ? format.relativeTime(new Date(member.lastSignInAt))
                      : t("never")}
                  </TableCell>
                  <TableCell>
                    <ConfirmDialog
                      trigger={
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={t("removeMember")}
                        >
                          <Trash2Icon />
                        </Button>
                      }
                      title={t("removeMemberTitle")}
                      description={t("removeMemberDescription", {
                        name: member.fullName ?? member.email ?? "",
                      })}
                      confirmLabel={t("removeMember")}
                      onConfirm={async () => {
                        const result = await (schoolAdmin
                          ? removeSchoolMember(schoolId, member.id)
                          : removeMember(member.id));
                        if (!result.ok) toast.error(errorMessage(result.error));
                        return result.ok;
                      }}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
