import { supabase } from "@/lib/supabase";

const BUCKET = "monster-portraits";

/**
 * Upload a monster image and return its public URL, or null on failure.
 * Storage policy: a user may write only under their own id's folder.
 * `key` names the file; leave it out for a fresh name each time, which also
 * sidesteps a cached old image at the same URL.
 */
export async function uploadMonsterPortrait(
  userId: string,
  file: File,
  key: string = crypto.randomUUID(),
): Promise<string | null> {
  const ext = file.name.split(".").pop() ?? "jpg";
  const path = `${userId}/${key}.${ext}`;
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { upsert: true, contentType: file.type });
  if (error) return null;
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}
