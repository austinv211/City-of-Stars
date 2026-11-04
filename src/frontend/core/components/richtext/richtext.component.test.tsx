import { afterEach, describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Highlight from "@tiptap/extension-highlight";
import { Markdown } from "tiptap-markdown";
import { RichText } from "../RichText";
import { NoteColorMark, NoteFontMark, ReadAloud } from "./extensions";

let editor: Editor | null = null;

/** The same extension set the RichTextEditor uses, minus the React bits. */
function makeEditor(content: string) {
  editor = new Editor({
    extensions: [
      StarterKit,
      Image,
      Highlight,
      NoteFontMark,
      NoteColorMark,
      ReadAloud,
      Markdown.configure({ html: true }),
    ],
    content,
  });
  return editor;
}

const markdownOf = (e: Editor) =>
  (e.storage as unknown as { markdown: { getMarkdown: () => string } }).markdown.getMarkdown();

afterEach(() => {
  editor?.destroy();
  editor = null;
});

describe("note editor markdown", () => {
  it("keeps plain markdown plain", () => {
    const md = markdownOf(makeEditor("**Bold** and a [link](https://example.com)\n\n![map](https://x.test/map.png)"));
    expect(md).toContain("**Bold**");
    expect(md).toContain("![map](https://x.test/map.png)");
    expect(md).not.toContain("<");
  });

  it("writes fonts, colours and read-aloud boxes as html and reads them back", () => {
    const e = makeEditor("<p>The <span data-font=\"epic\">Spire</span> glows <span data-color=\"gold\">gold</span></p>");
    e.commands.setContent(
      e.getHTML() + '<aside data-callout="read-aloud"><p>You smell <strong>salt</strong>.</p></aside>',
    );
    const md = markdownOf(e);
    expect(md).toContain('<span data-font="epic">Spire</span>');
    expect(md).toContain('<span data-color="gold">gold</span>');
    expect(md).toContain('<aside data-callout="read-aloud">');

    const reopened = makeEditor(md);
    const html = reopened.getHTML();
    expect(html).toContain('data-font="epic"');
    expect(html).toContain('data-color="gold"');
    expect(html).toContain('<aside data-callout="read-aloud"><p>You smell <strong>salt</strong>.</p></aside>');
  });
});

describe("RichText", () => {
  it("renders the editor's formatting", () => {
    const { container } = render(
      <RichText>
        {'Read <span data-font="hand">this</span>\n\n<aside data-callout="read-aloud"><p>Boxed</p></aside>\n\n![gif](https://x.test/a.gif)'}
      </RichText>,
    );
    expect(container.querySelector('span[data-font="hand"]')?.textContent).toBe("this");
    expect(container.querySelector('aside[data-callout="read-aloud"]')?.textContent).toBe("Boxed");
    expect(container.querySelector("img")?.getAttribute("src")).toBe("https://x.test/a.gif");
  });

  it("strips anything the editor would not have written", () => {
    const { container } = render(
      <RichText>
        {'<span data-font="evil" onclick="alert(1)" style="color:red">x</span><script>alert(1)</script><img src="javascript:alert(1)">'}
      </RichText>,
    );
    const span = container.querySelector("span");
    expect(span?.getAttribute("data-font")).toBeNull();
    expect(span?.getAttribute("onclick")).toBeNull();
    expect(span?.getAttribute("style")).toBeNull();
    expect(container.querySelector("script")).toBeNull();
    expect(container.querySelector("img")?.getAttribute("src") ?? null).toBeNull();
  });
});
