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

  it("writes fonts and colours as known tags and read-aloud boxes as a container, and reads them back", () => {
    const e = makeEditor('<p>The <span data-font="epic">Spire</span> glows <span data-color="gold">gold</span></p>');
    e.commands.setContent(
      e.getHTML() +
        '<aside data-callout="read-aloud"><p>You smell <strong>salt</strong>.</p><ul><li><p>one</p></li></ul></aside><p>after</p>',
    );
    const md = markdownOf(e);
    expect(md).toContain('<span data-font="epic">Spire</span>');
    expect(md).toContain('<span data-color="gold">gold</span>');
    expect(md).toContain(":::read-aloud\n\nYou smell **salt**.\n\n- one\n\n:::");
    expect(md).not.toContain("<aside");

    const html = makeEditor(md).getHTML();
    expect(html).toContain('data-font="epic"');
    expect(html).toContain('data-color="gold"');
    expect(html).toMatch(
      /<aside data-callout="read-aloud"><p>You smell <strong>salt<\/strong>\.<\/p><ul[^>]*><li><p>one<\/p><\/li><\/ul><\/aside><p>after<\/p>/,
    );
  });

  it("still opens notes saved with an html read-aloud box, and saves them in the new form", () => {
    const md = markdownOf(makeEditor('<aside data-callout="read-aloud">\n<p>Old box</p>\n</aside>'));
    expect(md).toContain(":::read-aloud\n\nOld box\n\n:::");
  });
});

describe("RichText", () => {
  it("renders what the editor writes", () => {
    const e = makeEditor(
      '<p>Read <span data-font="hand"><span data-color="blood">this <strong>now</strong></span></span>, <mark>marked</mark> and <u>underlined</u></p>' +
        '<aside data-callout="read-aloud"><p>Boxed <em>text</em></p><ul><li><p>a point</p></li></ul></aside>' +
        '<p><img src="https://x.test/a.gif"></p>',
    );
    const { container } = render(<RichText>{markdownOf(e)}</RichText>);
    expect(container.querySelector('span[data-font="hand"] span[data-color="blood"]')?.textContent).toBe("this ");
    expect(container.querySelector('strong span[data-color="blood"]')?.textContent).toBe("now");
    expect(container.querySelector("mark")?.textContent).toBe("marked");
    expect(container.querySelector("u")?.textContent).toBe("underlined");
    const box = container.querySelector('aside[data-callout="read-aloud"]');
    expect(box?.querySelector("em")?.textContent).toBe("text");
    expect(box?.querySelector("li")?.textContent).toBe("a point");
    expect(container.querySelector("img")?.getAttribute("src")).toBe("https://x.test/a.gif");
    expect(container.textContent).not.toContain(":::");
  });

  it("never renders html, only the editor's own tags", () => {
    const { container } = render(
      <RichText>
        {[
          '<span data-font="evil" onclick="alert(1)">alpha</span>',
          '<span data-font="epic" onclick="alert(1)">bravo</span>',
          '<span style="color:red">charlie</span> <b onmouseover="x()">delta</b>',
          "",
          "<script>alert(1)</script>",
          "",
          '<img src="x" onerror="alert(1)">',
          "",
          '<aside data-callout="read-aloud"><p>legacy box</p></aside>',
          "",
          "[link](javascript:alert(1))",
        ].join("\n")}
      </RichText>,
    );
    expect(container.querySelector("span")).toBeNull();
    expect(container.querySelector("b")).toBeNull();
    expect(container.querySelector("script")).toBeNull();
    expect(container.querySelector("img")).toBeNull();
    expect(container.querySelector("aside")).toBeNull();
    expect(container.querySelector("[onclick], [onerror], [onmouseover], [style]")).toBeNull();
    expect(container.querySelector("a")?.getAttribute("href") ?? null).toBeNull();
    // The words inside dropped inline tags still show.
    for (const word of ["alpha", "bravo", "charlie", "delta"]) expect(container.textContent).toContain(word);
  });

  it("leaves an unclosed fence as text", () => {
    const { container } = render(<RichText>{":::read-aloud\n\nno end"}</RichText>);
    expect(container.querySelector("aside")).toBeNull();
    expect(container.textContent).toContain("no end");
  });
});

describe("RichText sources and sizes", () => {
  it("keeps single newlines in SRD text as line breaks", () => {
    const { container } = render(
      <RichText source="srd">{"You choose:\n**Audible Alarm.** A handbell rings."}</RichText>,
    );
    expect(container.querySelector("br")).not.toBeNull();
    expect(container.querySelector("strong")?.textContent).toBe("Audible Alarm.");
  });

  it("joins single newlines in notes, as Markdown does", () => {
    const { container } = render(<RichText>{"one\ntwo"}</RichText>);
    expect(container.querySelector("br")).toBeNull();
  });

  it("does not read HTML in SRD text", () => {
    const { container } = render(<RichText source="srd">{'<span data-font="epic">x</span>'}</RichText>);
    expect(container.querySelector("span")).toBeNull();
  });

  it("marks its size and clamp for the stylesheet", () => {
    const { container } = render(
      <RichText size="xs" clamp={2}>
        text
      </RichText>,
    );
    const box = container.firstElementChild as HTMLElement;
    expect(box.dataset.size).toBe("xs");
    expect(box.hasAttribute("data-clamped")).toBe(true);
    expect(box.style.getPropertyValue("--rich-clamp")).toBe("2");
  });
});
