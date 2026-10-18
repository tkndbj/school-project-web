import { CheckCircle2Icon, CircleDashedIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import type { Enums } from "@/lib/supabase/types";

/** Whether the guardian record is connected to a parent's app account. */
export function GuardianAccountBadge({
  linked,
  method,
}: {
  linked: boolean;
  method: Enums<"guardian_link_method"> | null;
}) {
  const t = useTranslations("guardians");
  return linked ? (
    <Badge variant="secondary" className="gap-1">
      <CheckCircle2Icon className="size-3 text-emerald-600" aria-hidden />
      {method === "invite" ? t("linkedByInvite") : t("linkedByEmail")}
    </Badge>
  ) : (
    <Badge variant="outline" className="gap-1 text-muted-foreground">
      <CircleDashedIcon className="size-3" aria-hidden />
      {t("notLinked")}
    </Badge>
  );
}
