"use client";

import { Trash2Icon } from "lucide-react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { useErrorMessage } from "@/components/forms/use-error-message";
import { Button } from "@/components/ui/button";
import type { ActionResult } from "@/lib/errors";

/** Delete button with confirmation; navigates to `redirectTo` afterwards. */
export function DeleteEntityButton({
  onDelete,
  redirectTo,
  label,
  title,
  description,
  successMessage,
}: {
  /** Usually a server action bound to the record, e.g. deleteTeacher.bind(null, schoolId, id). */
  onDelete: () => Promise<ActionResult>;
  redirectTo: string;
  label: string;
  title: string;
  description: string;
  successMessage: string;
}) {
  const errorMessage = useErrorMessage();
  const router = useRouter();

  return (
    <ConfirmDialog
      trigger={
        <Button variant="destructive">
          <Trash2Icon />
          {label}
        </Button>
      }
      title={title}
      description={description}
      confirmLabel={label}
      onConfirm={async () => {
        const result = await onDelete();
        if (!result.ok) {
          toast.error(errorMessage(result.error));
          return false;
        }
        toast.success(successMessage);
        router.replace(redirectTo as Route);
        router.refresh();
        return true;
      }}
    />
  );
}
