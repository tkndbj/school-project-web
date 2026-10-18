import { UsersIcon } from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { PersonAvatar } from "@/components/person-avatar";
import { Card, CardContent } from "@/components/ui/card";
import { InviteForm } from "@/features/parent/components/invite-form";
import { getChildren } from "@/features/parent/queries";
import { displayName } from "@/lib/people";
import { signMediaUrls } from "@/server/storage";

export default async function ParentPage() {
  const t = await getTranslations("parent");
  const children = await getChildren();
  const photos = await signMediaUrls(children.map((child) => child.photo_path));
  return (
    <>
      <PageHeader title={t("title")} description={t("description")} />
      {children.length ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {children.map((child) => (
            <Link
              key={child.student_id}
              href={`/parent/${child.student_id}`}
              className="rounded-xl outline-offset-4 focus-visible:outline-2 focus-visible:outline-primary"
            >
              <Card className="h-full transition-colors hover:bg-muted/50">
                <CardContent className="flex items-center gap-4 pt-5">
                  <PersonAvatar
                    name={displayName(child)}
                    src={child.photo_path ? photos.get(child.photo_path) : null}
                  />
                  <div className="min-w-0">
                    <div className="truncate font-semibold">
                      {displayName(child)}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {child.school_name}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {[child.grade_level, child.section]
                        .filter(Boolean)
                        .join(" / ")}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={UsersIcon}
          title={t("empty")}
          description={t("emptyDescription")}
        />
      )}
      <InviteForm />
    </>
  );
}
