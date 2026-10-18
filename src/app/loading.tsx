import { getTranslations } from "next-intl/server";
import { Spinner } from "@/components/ui/spinner";

export default async function LoadingPage() {
  const t = await getTranslations("common");
  return (
    <div
      className="flex min-h-48 items-center justify-center gap-3"
      role="status"
    >
      <Spinner />
      {t("loading")}
    </div>
  );
}
