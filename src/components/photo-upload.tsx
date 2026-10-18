"use client";

import { CameraIcon, Trash2Icon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { useErrorMessage } from "@/components/forms/use-error-message";
import { PersonAvatar } from "@/components/person-avatar";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import type { ActionResult } from "@/lib/errors";
import { ACCEPTED_IMAGE_TYPES, MAX_UPLOAD_BYTES, resizeImage } from "@/lib/images";
import { getBrowserSupabase } from "@/lib/supabase/client";

/**
 * Uploads a resized photo straight to Supabase Storage under `folder` (the
 * storage policies authorise the user), then records it via `onUploaded`.
 */
export function PhotoUpload({
  name,
  currentUrl,
  folder,
  onUploaded,
}: {
  name: string;
  currentUrl: string | null;
  /** e.g. `${schoolId}/students/${studentId}` */
  folder: string;
  onUploaded: (path: string | null) => Promise<ActionResult>;
}) {
  const t = useTranslations("media");
  const errorMessage = useErrorMessage();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<string | null>(currentUrl);

  async function upload(file: File) {
    if (!(ACCEPTED_IMAGE_TYPES as readonly string[]).includes(file.type)) return toast.error(t("unsupportedType"));
    if (file.size > MAX_UPLOAD_BYTES * 4) return toast.error(t("tooLarge"));

    setBusy(true);
    try {
      const blob = await resizeImage(file);
      const path = `${folder}/${crypto.randomUUID()}.webp`;
      const { error } = await getBrowserSupabase()
        .storage.from("school-media")
        .upload(path, blob, { contentType: "image/webp", upsert: false });
      if (error) throw error;
      const result = await onUploaded(path);
      if (!result.ok) {
        await getBrowserSupabase().storage.from("school-media").remove([path]);
        toast.error(errorMessage(result.error));
        return;
      }
      setPreview(URL.createObjectURL(blob));
      toast.success(t("uploaded"));
    } catch {
      toast.error(t("uploadFailed"));
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  async function remove() {
    setBusy(true);
    const result = await onUploaded(null);
    setBusy(false);
    if (!result.ok) return toast.error(errorMessage(result.error));
    setPreview(null);
  }

  return (
    <div className="flex items-center gap-4">
      <PersonAvatar name={name} src={preview} size="lg" className="size-16" />
      <div className="flex flex-wrap gap-2">
        <input
          ref={input}
          type="file"
          accept={ACCEPTED_IMAGE_TYPES.join(",")}
          className="sr-only"
          tabIndex={-1}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void upload(file);
          }}
        />
        <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => input.current?.click()}>
          {busy ? <Spinner /> : <CameraIcon />}
          {preview ? t("change") : t("upload")}
        </Button>
        {preview ? (
          <Button type="button" variant="ghost" size="sm" disabled={busy} onClick={remove}>
            <Trash2Icon />
            {t("remove")}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
