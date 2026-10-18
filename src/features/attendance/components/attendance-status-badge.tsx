import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { AttendanceStatus } from "../constants";

const STYLES: Record<AttendanceStatus, string> = {
  present: "bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-100",
  absent: "bg-red-100 text-red-900 dark:bg-red-900/40 dark:text-red-100",
  late: "bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-100",
  excused: "bg-sky-100 text-sky-900 dark:bg-sky-900/40 dark:text-sky-100",
};

export function AttendanceStatusBadge({ status, className }: { status: AttendanceStatus; className?: string }) {
  const t = useTranslations("attendance");
  return (
    <Badge variant="secondary" className={cn("border-transparent", STYLES[status], className)}>
      {t(`statuses.${status}`)}
    </Badge>
  );
}
