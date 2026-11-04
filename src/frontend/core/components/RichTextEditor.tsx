import { useEffect, useRef } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Image from "@tiptap/extension-image";
import Highlight from "@tiptap/extension-highlight";
import { Markdown } from "tiptap-markdown";
import { cn } from "@/lib/utils";
import { isSupportedImage } from "@/core/lib/media";
import { useNoteImageUpload } from "@/core/hooks/useNoteImageUpload";
import { NoteColorMark, NoteFontMark, ReadAloud } from "./richtext/extensions";
import { EditorToolbar } from "./richtext/EditorToolbar";

interface Props {
  content: string;
  onChange: (markdown: string) => void;
  placeholder?: string;
  minHeight?: string;
  className?: string;
}

interface MarkdownStorage {
  markdown: { getMarkdown: () => string };
}

/** The image files in a paste or drop, if any. */
const imagesIn = (files: FileList | null | undefined) => Array.from(files ?? []).filter(isSupportedImage);

/**
 * The note editor. Saves Markdown, so notes stay readable anywhere; fonts,
 * colours and read-aloud boxes go in as a few whitelisted HTML tags (see
 * richtext/extensions.ts) and pictures as ordinary Markdown images.
 */
export function RichTextEditor({ content, onChange, placeholder, minHeight = "8rem", className }: Props) {
  // The paste/drop handlers are fixed when the editor is created, so they
  // reach the upload function through a ref.
  const uploadRef = useRef<(files: File[]) => void>(() => undefined);
  const take = (files: FileList | null | undefined) => {
    const images = imagesIn(files);
    if (images.length > 0) uploadRef.current(images);
    return images.length > 0;
  };

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ link: { openOnClick: false, autolink: true } }),
      Placeholder.configure({ placeholder }),
      Image.configure({ inline: false, allowBase64: false }),
      Highlight,
      NoteFontMark,
      NoteColorMark,
      ReadAloud,
      Markdown.configure({ html: true, transformPastedText: true, transformCopiedText: true }),
    ],
    content,
    editorProps: {
      attributes: { class: "outline-none" },
      handlePaste: (_view, event) => take(event.clipboardData?.files),
      handleDrop: (_view, event, _slice, moved) => !moved && take(event.dataTransfer?.files),
    },
    onUpdate: ({ editor: e }) => {
      onChange((e.storage as unknown as MarkdownStorage).markdown.getMarkdown());
    },
  });

  const upload = useNoteImageUpload(editor);
  useEffect(() => {
    uploadRef.current = upload;
  }, [upload]);

  if (!editor) return null;

  return (
    <div
      className={cn(
        "overflow-hidden rounded-md border border-input bg-background text-sm",
        "focus-within:ring-1 focus-within:ring-ring",
        className,
      )}
    >
      <EditorToolbar editor={editor} onUpload={upload} />
      <EditorContent
        editor={editor}
        style={{ minHeight }}
        className={cn(
          "rich-note prose prose-sm max-w-none dark:prose-invert",
          "[&_.ProseMirror]:min-h-[inherit] [&_.ProseMirror]:px-3 [&_.ProseMirror]:py-2 [&_.ProseMirror]:outline-none",
          "[&_.ProseMirror>*:first-child]:mt-0 [&_.ProseMirror>*:last-child]:mb-0",
        )}
      />
    </div>
  );
}
