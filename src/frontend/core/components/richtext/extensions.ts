import { Mark, Node } from "@tiptap/core";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import container from "markdown-it-container";
import "./fonts";

/** The parts of prosemirror-markdown's serializer state a node's serialize uses. */
interface MarkdownState {
  write: (text: string) => void;
  renderContent: (node: ProseMirrorNode) => void;
  closeBlock: (node: ProseMirrorNode) => void;
}

/**
 * The extra formatting notes support beyond Markdown: a handful of fonts and
 * colours, and boxed "read aloud" text for the DM.
 *
 * Each is stored as a data attribute drawn from a fixed list (never inline
 * CSS), so the reader can sanitise strictly: anything outside these lists is
 * dropped. Markdown has no syntax for them, so tiptap-markdown writes fonts,
 * colours, highlights and underline as a few fixed inline tags, and read-aloud
 * boxes as a Markdown container. The reader rebuilds exactly those
 * (noteMarkup.ts) and never parses HTML; older app versions show the words
 * without the styling.
 */

export const NOTE_FONTS = [
  { id: "epic", label: "Epic" },
  { id: "tome", label: "Old tome" },
  { id: "hand", label: "Handwritten" },
  { id: "typewriter", label: "Typewriter" },
  { id: "arcane", label: "Arcane" },
] as const;

export const NOTE_COLORS = [
  { id: "gold", label: "Gold" },
  { id: "arcane", label: "Arcane blue" },
  { id: "blood", label: "Blood red" },
  { id: "verdant", label: "Verdant" },
  { id: "violet", label: "Violet" },
  { id: "ash", label: "Ash" },
] as const;

export type NoteFont = (typeof NOTE_FONTS)[number]["id"];
export type NoteColor = (typeof NOTE_COLORS)[number]["id"];

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    noteFont: { setNoteFont: (font: NoteFont | null) => ReturnType };
    noteColor: { setNoteColor: (color: NoteColor | null) => ReturnType };
    readAloud: { toggleReadAloud: () => ReturnType };
  }
}

/** Mark config for a span carrying one data-* attribute, stored as `value`. */
function dataSpan(attr: string) {
  return {
    addAttributes: () => ({
      value: {
        default: null,
        parseHTML: (el: HTMLElement) => el.getAttribute(attr),
        renderHTML: (attrs: Record<string, unknown>) => ({ [attr]: attrs.value }),
      },
    }),
    parseHTML: () => [{ tag: `span[${attr}]` }],
    renderHTML: ({ HTMLAttributes }: { HTMLAttributes: Record<string, unknown> }) =>
      ["span", HTMLAttributes, 0] as const,
  };
}

export const NoteFontMark = Mark.create({
  name: "noteFont",
  ...dataSpan("data-font"),
  addCommands() {
    return {
      setNoteFont:
        (font) =>
        ({ commands }) =>
          font ? commands.setMark(this.name, { value: font }) : commands.unsetMark(this.name),
    };
  },
});

export const NoteColorMark = Mark.create({
  name: "noteColor",
  ...dataSpan("data-color"),
  addCommands() {
    return {
      setNoteColor:
        (color) =>
        ({ commands }) =>
          color ? commands.setMark(this.name, { value: color }) : commands.unsetMark(this.name),
    };
  },
});

/**
 * A read-aloud box is saved as a Markdown container, not HTML, so the reader
 * never has to parse HTML blocks (see noteMarkup.ts):
 *
 *     :::read-aloud
 *
 *     You smell **salt**.
 *
 *     :::
 */
export const READ_ALOUD_OPEN = ":::read-aloud";
export const READ_ALOUD_CLOSE = ":::";

/** Boxed text the DM reads out, like the shaded boxes in a printed adventure. */
export const ReadAloud = Node.create({
  name: "readAloud",
  group: "block",
  content: "block+",
  defining: true,
  parseHTML() {
    return [{ tag: 'aside[data-callout="read-aloud"]' }];
  },
  renderHTML() {
    return ["aside", { "data-callout": "read-aloud" }, 0];
  },
  addStorage() {
    return {
      markdown: {
        serialize(state: MarkdownState, node: ProseMirrorNode) {
          state.write(`${READ_ALOUD_OPEN}\n\n`);
          state.renderContent(node);
          // renderContent leaves its last block closed, so this lands after
          // a blank line.
          state.write(READ_ALOUD_CLOSE);
          state.closeBlock(node);
        },
        parse: {
          // markdown-it renders the container as the <aside> parseHTML reads.
          setup(md: Parameters<typeof container>[0]) {
            md.use(container, "read-aloud", {
              render: (tokens: { nesting: number }[], idx: number) =>
                tokens[idx].nesting === 1 ? '<aside data-callout="read-aloud">\n' : "</aside>\n",
            });
          },
        },
      },
    };
  },
  addCommands() {
    return {
      toggleReadAloud:
        () =>
        ({ commands }) =>
          commands.toggleWrap(this.name),
    };
  },
});
