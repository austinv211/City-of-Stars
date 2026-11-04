import { useRef, useState } from "react";
import type { Editor } from "@tiptap/react";
import {
  Bold, Italic, Strikethrough, Code, Heading2, Heading3, List, ListOrdered, Quote, Minus,
  Undo2, Redo2, Type, Palette, Highlighter, ScrollText, ImagePlus, Upload,
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/core/components/ui/popover";
import { Input } from "@/core/components/ui/input";
import { Button } from "@/core/components/ui/button";
import { cn } from "@/lib/utils";
import { isImageUrl } from "@/core/lib/media";
import { NOTE_COLORS, NOTE_FONTS } from "./extensions";

interface Action {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  run: (e: Editor) => void;
  active?: (e: Editor) => boolean;
  enabled?: (e: Editor) => boolean;
}

const chain = (e: Editor) => e.chain().focus();

// Groups are separated by a divider.
const ACTION_GROUPS: Action[][] = [
  [
    { title: "Bold", icon: Bold, run: (e) => chain(e).toggleBold().run(), active: (e) => e.isActive("bold") },
    { title: "Italic", icon: Italic, run: (e) => chain(e).toggleItalic().run(), active: (e) => e.isActive("italic") },
    { title: "Strikethrough", icon: Strikethrough, run: (e) => chain(e).toggleStrike().run(), active: (e) => e.isActive("strike") },
    { title: "Highlight", icon: Highlighter, run: (e) => chain(e).toggleHighlight().run(), active: (e) => e.isActive("highlight") },
    { title: "Inline code", icon: Code, run: (e) => chain(e).toggleCode().run(), active: (e) => e.isActive("code") },
  ],
  [
    { title: "Heading", icon: Heading2, run: (e) => chain(e).toggleHeading({ level: 2 }).run(), active: (e) => e.isActive("heading", { level: 2 }) },
    { title: "Subheading", icon: Heading3, run: (e) => chain(e).toggleHeading({ level: 3 }).run(), active: (e) => e.isActive("heading", { level: 3 }) },
  ],
  [
    { title: "Bullet list", icon: List, run: (e) => chain(e).toggleBulletList().run(), active: (e) => e.isActive("bulletList") },
    { title: "Numbered list", icon: ListOrdered, run: (e) => chain(e).toggleOrderedList().run(), active: (e) => e.isActive("orderedList") },
    { title: "Quote", icon: Quote, run: (e) => chain(e).toggleBlockquote().run(), active: (e) => e.isActive("blockquote") },
    { title: "Read-aloud box", icon: ScrollText, run: (e) => chain(e).toggleReadAloud().run(), active: (e) => e.isActive("readAloud") },
    { title: "Divider", icon: Minus, run: (e) => chain(e).setHorizontalRule().run() },
  ],
];

const HISTORY: Action[] = [
  { title: "Undo", icon: Undo2, run: (e) => chain(e).undo().run(), enabled: (e) => e.can().undo() },
  { title: "Redo", icon: Redo2, run: (e) => chain(e).redo().run(), enabled: (e) => e.can().redo() },
];

const BUTTON_CLASS = cn(
  "flex h-7 w-7 items-center justify-center transition-colors",
  "text-muted-foreground hover:bg-muted hover:text-foreground",
  "disabled:pointer-events-none disabled:opacity-30",
);

function ActionButton({ editor, action }: { editor: Editor; action: Action }) {
  const Icon = action.icon;
  return (
    <button
      type="button"
      title={action.title}
      aria-label={action.title}
      aria-pressed={action.active ? action.active(editor) : undefined}
      disabled={action.enabled ? !action.enabled(editor) : false}
      onClick={() => action.run(editor)}
      className={cn(BUTTON_CLASS, action.active?.(editor) && "bg-muted text-foreground")}
    >
      <Icon className="h-3.5 w-3.5" />
    </button>
  );
}

const Divider = () => <div className="mx-0.5 h-4 w-px shrink-0 bg-border" />;

function MenuButton({ title, icon: Icon, active, children }: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  active?: boolean;
  children: (close: () => void) => React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button type="button" title={title} aria-label={title} className={cn(BUTTON_CLASS, active && "bg-muted text-foreground")}>
          <Icon className="h-3.5 w-3.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-56 p-1">
        {children(() => setOpen(false))}
      </PopoverContent>
    </Popover>
  );
}

const MENU_ITEM = "flex w-full items-center gap-2 px-2 py-1.5 text-left text-sm hover:bg-muted";

function FontMenu({ editor }: { editor: Editor }) {
  return (
    <MenuButton title="Font" icon={Type} active={editor.isActive("noteFont")}>
      {(close) => (
        <>
          <button type="button" className={MENU_ITEM} onClick={() => { chain(editor).setNoteFont(null).run(); close(); }}>
            Default
          </button>
          {NOTE_FONTS.map((f) => (
            <button key={f.id} type="button" className={MENU_ITEM} onClick={() => { chain(editor).setNoteFont(f.id).run(); close(); }}>
              <span data-font={f.id}>{f.label}</span>
            </button>
          ))}
        </>
      )}
    </MenuButton>
  );
}

function ColorMenu({ editor }: { editor: Editor }) {
  return (
    <MenuButton title="Text colour" icon={Palette} active={editor.isActive("noteColor")}>
      {(close) => (
        <>
          <button type="button" className={MENU_ITEM} onClick={() => { chain(editor).setNoteColor(null).run(); close(); }}>
            Default
          </button>
          {NOTE_COLORS.map((c) => (
            <button key={c.id} type="button" className={MENU_ITEM} onClick={() => { chain(editor).setNoteColor(c.id).run(); close(); }}>
              <span data-color={c.id} aria-hidden>●</span>
              <span data-color={c.id}>{c.label}</span>
            </button>
          ))}
        </>
      )}
    </MenuButton>
  );
}

function ImageMenu({ editor, onUpload }: { editor: Editor; onUpload: (files: File[]) => void }) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState("");
  const validUrl = isImageUrl(url);

  return (
    <MenuButton title="Picture or GIF" icon={ImagePlus}>
      {(close) => (
        <div className="space-y-2 p-1">
          <Button variant="outline" size="sm" className="w-full" onClick={() => fileInput.current?.click()}>
            <Upload className="mr-2 h-3.5 w-3.5" />
            Upload picture or GIF
          </Button>
          <input
            ref={fileInput}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            multiple
            hidden
            onChange={(e) => {
              onUpload(Array.from(e.target.files ?? []));
              e.target.value = "";
              close();
            }}
          />
          <form
            className="flex gap-1"
            onSubmit={(e) => {
              e.preventDefault();
              if (!validUrl) return;
              chain(editor).setImage({ src: url.trim() }).run();
              setUrl("");
              close();
            }}
          >
            <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="…or paste an image link" aria-label="Image link" className="h-8 text-xs" />
            <Button type="submit" size="sm" className="h-8" disabled={!validUrl}>Add</Button>
          </form>
          <p className="px-1 text-[11px] text-muted-foreground">You can also paste or drop images straight into the note.</p>
        </div>
      )}
    </MenuButton>
  );
}

export function EditorToolbar({ editor, onUpload }: { editor: Editor; onUpload: (files: File[]) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b border-border px-2 py-1.5">
      <FontMenu editor={editor} />
      <ColorMenu editor={editor} />
      <ImageMenu editor={editor} onUpload={onUpload} />
      {ACTION_GROUPS.map((group) => (
        <div key={group[0].title} className="flex items-center gap-0.5">
          <Divider />
          {group.map((a) => <ActionButton key={a.title} editor={editor} action={a} />)}
        </div>
      ))}
      <Divider />
      {HISTORY.map((a) => <ActionButton key={a.title} editor={editor} action={a} />)}
    </div>
  );
}
