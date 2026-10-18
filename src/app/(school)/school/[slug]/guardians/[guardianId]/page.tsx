import { ArrowLeftIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { ButtonLink } from "@/components/button-link";
import { DeleteEntityButton } from "@/components/delete-entity-button";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCustomFieldDefinitions } from "@/features/custom-fields/queries";
import { deleteGuardian } from "@/features/guardians/actions";
import { GuardianAccessCard } from "@/features/guardians/components/guardian-access-card";
import { GuardianForm } from "@/features/guardians/components/guardian-form";
import { getGuardian, getGuardianChildren, getGuardianInvites } from "@/features/guardians/queries";
import { schoolPath } from "@/features/school-panel/paths";
import { displayName } from "@/lib/people";
import { requireSchool } from "@/server/auth";

export async function generateMetadata({ params }: PageProps<"/school/[slug]/guardians/[guardianId]">): Promise<Metadata> {
  const { slug, guardianId } = await params;
  const { school } = await requireSchool(slug);
  return { title: displayName(await getGuardian(school.id, guardianId)) };
}

export default async function GuardianPage({ params }: PageProps<"/school/[slug]/guardians/[guardianId]">) {
  const { slug, guardianId } = await params;
  const { school } = await requireSchool(slug);
  const t = await getTranslations("guardians");
  const tRel = await getTranslations("relationships");
  const [guardian, definitions, children, invites] = await Promise.all([
    getGuardian(school.id, guardianId),
    getCustomFieldDefinitions(school.id, "guardian"),
    getGuardianChildren(school.id, guardianId),
    getGuardianInvites(school.id, guardianId),
  ]);
  const name = displayName(guardian);

  return (
    <>
      <ButtonLink href={schoolPath(slug, "guardians")} variant="ghost" size="sm" className="-ml-2 w-fit">
        <ArrowLeftIcon />
        {t("title")}
      </ButtonLink>
      <PageHeader title={name} description={guardian.email ?? guardian.phone ?? undefined} />
      <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <div className="grid gap-6">
          <GuardianAccessCard
            schoolId={school.id}
            guardianId={guardian.id}
            linked={Boolean(guardian.user_id)}
            linkMethod={guardian.link_method}
            linkedAt={guardian.linked_at}
            hasEmail={Boolean(guardian.email)}
            invites={invites}
          />
          <GuardianForm schoolId={school.id} slug={slug} definitions={definitions} guardian={guardian} />
        </div>
        <Card className="h-fit">
          <CardHeader>
            <CardTitle>{t("children")}</CardTitle>
          </CardHeader>
          <CardContent>
            {children.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("noChildren")}</p>
            ) : (
              <ul className="space-y-3">
                {children.map((link) =>
                  link.students ? (
                    <li key={link.id} className="flex flex-wrap items-center gap-2 text-sm">
                      <Link href={schoolPath(slug, "students", link.students.id)} className="font-medium hover:underline">
                        {displayName(link.students)}
                      </Link>
                      {link.relationship ? <Badge variant="outline">{tRel(link.relationship)}</Badge> : null}
                      {link.is_primary ? <Badge variant="secondary">{t("primary")}</Badge> : null}
                    </li>
                  ) : null,
                )}
              </ul>
            )}
            <p className="mt-4 text-xs text-muted-foreground">{t("linkChildrenHint")}</p>
          </CardContent>
        </Card>
      </div>
      <div className="flex justify-end">
        <DeleteEntityButton
          onDelete={deleteGuardian.bind(null, school.id, guardian.id)}
          redirectTo={schoolPath(slug, "guardians")}
          label={t("delete")}
          title={t("deleteTitle", { name })}
          description={t("deleteDescription")}
          successMessage={t("deleted")}
        />
      </div>
    </>
  );
}
