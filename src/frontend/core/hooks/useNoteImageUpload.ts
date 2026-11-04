import { useCallback } from "react";
import type { Editor } from "@tiptap/react";
import { toast } from "sonner";
import { useCampaign } from "@/core/context/CampaignContext";
import { mediaProblem, uploadCampaignImage } from "@/core/lib/media";

/**
 * Uploads pictures and GIFs into the current campaign's media and inserts
 * them where the cursor is. Problems (wrong type, too big) are toasted and
 * the rest still go in.
 */
export function useNoteImageUpload(editor: Editor | null) {
  const { campaign } = useCampaign();
  const campaignId = campaign?.id;

  return useCallback(
    (files: File[]) => {
      if (!editor || files.length === 0) return;
      if (!campaignId) {
        toast.error("Pick a campaign before adding pictures.");
        return;
      }
      for (const file of files) {
        const problem = mediaProblem(file);
        if (problem) {
          toast.error(problem);
          continue;
        }
        toast.promise(uploadCampaignImage(campaignId, file), {
          loading: `Uploading ${file.name}…`,
          success: (src) => {
            editor.chain().focus().setImage({ src, alt: file.name }).run();
            return `${file.name} added`;
          },
          error: (err: unknown) => (err instanceof Error ? err.message : "Upload failed"),
        });
      }
    },
    [editor, campaignId],
  );
}
