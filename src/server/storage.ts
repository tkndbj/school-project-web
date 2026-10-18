import "server-only";
import { createServerSupabase } from "./supabase";

export const MEDIA_BUCKET = "school-media";

/**
 * Creates short-lived signed URLs for private media, using the caller's own
 * permissions (storage RLS decides what they may see). Returns path -> URL.
 */
export async function signMediaUrls(
  paths: ReadonlyArray<string | null | undefined>,
  expiresInSeconds = 60 * 60,
): Promise<Map<string, string>> {
  const unique = [...new Set(paths.filter((p): p is string => !!p))];
  const urls = new Map<string, string>();
  if (unique.length === 0) return urls;

  const supabase = await createServerSupabase();
  const { data } = await supabase.storage.from(MEDIA_BUCKET).createSignedUrls(unique, expiresInSeconds);
  for (const item of data ?? []) {
    if (item.path && item.signedUrl) urls.set(item.path, item.signedUrl);
  }
  return urls;
}

export async function signMediaUrl(path: string | null | undefined): Promise<string | null> {
  if (!path) return null;
  return (await signMediaUrls([path])).get(path) ?? null;
}
