import { supabase } from "@/lib/supabase";

const BUCKET = "campaign-media";
export const MAX_MEDIA_BYTES = 10 * 1024 * 1024;
const EXTENSIONS: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
};

export const isSupportedImage = (file: File) => file.type in EXTENSIONS;

/** Why a file can't go into a note, or null if it can. Matches the bucket's own limits. */
export function mediaProblem(file: File): string | null {
  if (!isSupportedImage(file)) return "Only PNG, JPEG, WebP and GIF images can go in notes.";
  if (file.size > MAX_MEDIA_BYTES) return "That image is over 10 MB.";
  return null;
}

/** Uploads a picture or GIF for a campaign's notes and returns its public URL. */
export async function uploadCampaignImage(campaignId: string, file: File): Promise<string> {
  const problem = mediaProblem(file);
  if (problem) throw new Error(problem);

  const path = `${campaignId}/${crypto.randomUUID()}.${EXTENSIONS[file.type]}`;
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { contentType: file.type, cacheControl: "31536000", upsert: false });
  if (error) throw new Error(error.message);
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

/** A pasted link we can show as an image: http(s) and ending like a picture. */
export function isImageUrl(text: string): boolean {
  try {
    const url = new URL(text.trim());
    return /^https?:$/.test(url.protocol) && /\.(png|jpe?g|webp|gif)$/i.test(url.pathname);
  } catch {
    return false;
  }
}
