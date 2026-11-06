import type { CSSProperties } from "react";
import ReactMarkdown from "react-markdown";
import remarkBreaks from "remark-breaks";
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

type Plugins = NonNullable<Parameters<typeof ReactMarkdown>[0]["rehypePlugins"]>;

type Source = "note" | "srd";

/**
 * Where the text came from decides how it is parsed.
 *
 * - `note`: written in the RichTextEditor. Markdown plus the few HTML tags
 *   the editor uses for fonts, colours and read-aloud boxes.
 * - `srd`: rules text from the SRD and players' own descriptions. Plain
 *   Markdown, where a single newline is a line break, not a space.
 */
const SOURCES: Record<Source, { remark: Plugins; rehype: Plugins }> = {
  note: {
    remark: [remarkGfm],
    rehype: [rehypeRaw, [rehypeSanitize, schema]],
  },
  srd: {
    remark: [remarkGfm, remarkBreaks],
    rehype: [[rehypeSanitize, schema]],
  },
};

/**
 * How much room the text has. Spacing and heading sizes scale with it
 * (see `.rich-note[data-size]` in globals.scss).
 *
 * - `xs`: card and list previews, popovers, tooltips.
 * - `sm`: panels and dialogs. The default.
 * - `base`: a page given over to the text, like session notes.
 */
export type RichTextSize = "xs" | "sm" | "base";

const SIZE_CLASS: Record<RichTextSize, string> = {
  xs: "prose-sm text-xs",
  sm: "prose-sm",
  base: "prose-base",
};

interface Props {
  children: string | null | undefined;
  className?: string;
  source?: Source;
  size?: RichTextSize;
  /** Cut the text off after this many lines, with an ellipsis. */
  clamp?: number;
}

/** Read-only view of rich text: notes from the RichTextEditor, or SRD text. */
export function RichText({ children, className, source = "note", size = "sm", clamp }: Props) {
  const plugins = SOURCES[source];
  const clampStyle = clamp ? ({ "--rich-clamp": clamp } as CSSProperties) : undefined;
  return (
    <div
      className={cn("rich-note prose max-w-none dark:prose-invert", SIZE_CLASS[size], className)}
      data-size={size}
      data-clamped={clamp ? "" : undefined}
      style={clampStyle}
    >
      <ReactMarkdown remarkPlugins={plugins.remark} rehypePlugins={plugins.rehype}>
        {children ?? ""}
      </ReactMarkdown>
    </div>
  );
}
