import type { Nodes, Paragraph, Parent, Root } from "mdast";
import { NOTE_COLORS, NOTE_FONTS, READ_ALOUD_CLOSE, READ_ALOUD_OPEN } from "./extensions";

/**
 * Turns the note editor's extra formatting back into elements, without
 * parsing HTML.
 *
 * Fonts, colours, highlights and underline are saved as a handful of inline
 * tags (`<span data-font="epic">`, `<mark>`, `<u>`). Each tag the editor can
 * write is listed below as an exact string; matching tags become elements
 * and every other piece of HTML is dropped. Read-aloud boxes are saved as a
 * Markdown container (`:::read-aloud` ... `:::`, see extensions.ts), which
 * wraps the blocks between its fences in an `<aside>`.
 *
 * RichText still runs rehype-sanitize afterwards, as a second line of defence.
 */

interface Element {
  tagName: string;
  properties: Record<string, string>;
  close: string;
}

const span = (attribute: "dataFont" | "dataColor", html: string, value: string): [string, Element] => [
  `<span ${html}="${value}">`,
  { tagName: "span", properties: { [attribute]: value }, close: "</span>" },
];

/** Every opening tag the editor writes, mapped to the element it stands for. */
const OPEN_TAGS = new Map<string, Element>([
  ...NOTE_FONTS.map((f) => span("dataFont", "data-font", f.id)),
  ...NOTE_COLORS.map((c) => span("dataColor", "data-color", c.id)),
  ["<mark>", { tagName: "mark", properties: {}, close: "</mark>" }],
  ["<u>", { tagName: "u", properties: {}, close: "</u>" }],
]);

/** An mdast node that remark-rehype turns into the given element. */
function elementNode(tagName: string, properties: Record<string, string>, children: Nodes[]) {
  return { type: "noteElement", data: { hName: tagName, hProperties: properties }, children } as unknown as Nodes;
}

const hasChildren = (node: Nodes): node is Nodes & Parent => "children" in node;

/**
 * Rebuilds a run of inline nodes, nesting whatever sits between a known
 * opening tag and its closing tag inside that element. An unclosed tag wraps
 * the rest of the run; any other HTML is dropped.
 */
function rebuildInline(children: Nodes[]): Nodes[] {
  const root = { children: [] as Nodes[] };
  const open: { close: string; children: Nodes[] }[] = [root as { close: string; children: Nodes[] }];
  const top = () => open[open.length - 1];

  for (const child of children) {
    if (child.type === "html") {
      const tag = OPEN_TAGS.get(child.value);
      if (tag) {
        const element = elementNode(tag.tagName, tag.properties, []);
        top().children.push(element);
        open.push({ close: tag.close, children: (element as Nodes & Parent).children });
      } else if (open.length > 1 && child.value === top().close) {
        open.pop();
      }
      continue;
    }
    if (hasChildren(child)) child.children = rebuildInline(child.children as Nodes[]) as typeof child.children;
    top().children.push(child);
  }
  return root.children;
}

const fenceText = (node: Nodes) =>
  node.type === "paragraph" && node.children.length === 1 && node.children[0].type === "text"
    ? node.children[0].value.trim()
    : null;

/**
 * Rebuilds a run of block nodes: read-aloud fences wrap the blocks between
 * them, block-level HTML is dropped, and paragraphs and other containers have
 * their own children rebuilt.
 */
function rebuildBlocks(children: Nodes[]): Nodes[] {
  const out: Nodes[] = [];
  for (let i = 0; i < children.length; i++) {
    const child = children[i];
    if (child.type === "html") continue;

    if (fenceText(child) === READ_ALOUD_OPEN) {
      const end = children.findIndex((c, j) => j > i && fenceText(c) === READ_ALOUD_CLOSE);
      if (end !== -1) {
        const inner = rebuildBlocks(children.slice(i + 1, end));
        out.push(elementNode("aside", { dataCallout: "read-aloud" }, inner));
        i = end;
        continue;
      }
    }

    if (child.type === "paragraph" || child.type === "heading" || child.type === "tableCell") {
      (child as Paragraph).children = rebuildInline(child.children) as Paragraph["children"];
    } else if (hasChildren(child)) {
      child.children = rebuildBlocks(child.children as Nodes[]) as typeof child.children;
    }
    out.push(child);
  }
  return out;
}

/** The remark plugin. */
export function remarkNoteMarkup() {
  return (tree: Root) => {
    tree.children = rebuildBlocks(tree.children) as Root["children"];
  };
}
