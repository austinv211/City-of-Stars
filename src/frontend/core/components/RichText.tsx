import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import { cn } from "@/lib/utils";
import { NOTE_COLORS, NOTE_FONTS } from "./richtext/extensions";
import "./richtext/fonts";

/**
 * GitHub's sanitising schema plus exactly what the note editor writes:
 * spans with a known font or colour, highlights, underline, and read-aloud
 * boxes. Any other attribute value is stripped, and scripts, styles and
 * event handlers never survive.
 */
const schema = {
  ...defaultSchema,
  tagNames: [...(defaultSchema.tagNames ?? []), "aside", "mark", "u", "span"],
  attributes: {
    ...defaultSchema.attributes,
    span: [
      ["dataFont", ...NOTE_FONTS.map((f) => f.id)],
      ["dataColor", ...NOTE_COLORS.map((c) => c.id)],
    ],
    aside: [["dataCallout", "read-aloud"]],
  },
};

const REHYPE_PLUGINS = [rehypeRaw, [rehypeSanitize, schema]] as Parameters<typeof ReactMarkdown>[0]["rehypePlugins"];
const REMARK_PLUGINS = [remarkGfm];

interface Props {
  children: string | null | undefined;
  className?: string;
}

/** Read-only view of a note written in the RichTextEditor. */
export function RichText({ children, className }: Props) {
  return (
    <div className={cn("rich-note prose prose-sm max-w-none dark:prose-invert", className)}>
      <ReactMarkdown remarkPlugins={REMARK_PLUGINS} rehypePlugins={REHYPE_PLUGINS}>
        {children ?? ""}
      </ReactMarkdown>
    </div>
  );
}
