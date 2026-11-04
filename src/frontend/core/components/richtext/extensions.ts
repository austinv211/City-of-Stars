import { Mark, Node } from "@tiptap/core";
import "./fonts";

/**
 * The extra formatting notes support beyond Markdown: a handful of fonts and
 * colours, and boxed "read aloud" text for the DM.
 *
 * Each is stored as a data attribute drawn from a fixed list (never inline
 * CSS), so the reader can sanitise strictly: anything outside these lists is
 * dropped. Markdown has no syntax for them, so tiptap-markdown writes them as
 * inline HTML; older app versions show the words without the styling.
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
  addCommands() {
    return {
      toggleReadAloud:
        () =>
        ({ commands }) =>
          commands.toggleWrap(this.name),
    };
  },
});
