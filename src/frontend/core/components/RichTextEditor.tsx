import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { Markdown } from "tiptap-markdown";
import {
  Bold, Italic, Strikethrough, Code, Heading2, Heading3,
  List, ListOrdered, Quote, Minus, Undo2, Redo2,
} from "lucide-react";
import { cn } from "@/lib/utils";

function ToolbarBtn({
  title, onClick, active, disabled, children,
}: {
  title: string;
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "h-6 w-6 flex items-center justify-center rounded transition-colors",
        "text-muted-foreground hover:bg-muted hover:text-foreground",
        "disabled:opacity-30 disabled:pointer-events-none",
        active && "bg-muted text-foreground",
      )}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <div className="w-px h-4 bg-border mx-0.5 shrink-0" />;
}

interface Props {
  content: string;
  onChange: (markdown: string) => void;
  placeholder?: string;
  minHeight?: string;
  className?: string;
}

export function RichTextEditor({
  content,
  onChange,
  placeholder,
  minHeight = "8rem",
  className,
}: Props) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder }),
      Markdown.configure({
        html: false,
        transformPastedText: true,
        transformCopiedText: true,
      }),
    ],
    content,
    editorProps: {
      attributes: { class: "outline-none" },
    },
    onUpdate: ({ editor }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      onChange((editor.storage as any).markdown.getMarkdown());
    },
  });

  if (!editor) return null;

  const chain = () => editor.chain().focus();

  return (
    <div
      className={cn(
        "rounded-md border border-input bg-background text-sm overflow-hidden",
        "focus-within:ring-1 focus-within:ring-ring",
        className,
      )}
    >
      {/* Toolbar */}
      <div
        className="flex items-center gap-0.5 px-2 py-1.5 flex-wrap"
        style={{ borderBottom: "1px solid hsl(var(--border))" }}
      >
        <ToolbarBtn title="Bold" onClick={() => chain().toggleBold().run()} active={editor.isActive("bold")}>
          <Bold className="h-3.5 w-3.5" />
        </ToolbarBtn>
        <ToolbarBtn title="Italic" onClick={() => chain().toggleItalic().run()} active={editor.isActive("italic")}>
          <Italic className="h-3.5 w-3.5" />
        </ToolbarBtn>
        <ToolbarBtn title="Strikethrough" onClick={() => chain().toggleStrike().run()} active={editor.isActive("strike")}>
          <Strikethrough className="h-3.5 w-3.5" />
        </ToolbarBtn>
        <ToolbarBtn title="Inline code" onClick={() => chain().toggleCode().run()} active={editor.isActive("code")}>
          <Code className="h-3.5 w-3.5" />
        </ToolbarBtn>

        <Divider />

        <ToolbarBtn title="Heading 2" onClick={() => chain().toggleHeading({ level: 2 }).run()} active={editor.isActive("heading", { level: 2 })}>
          <Heading2 className="h-3.5 w-3.5" />
        </ToolbarBtn>
        <ToolbarBtn title="Heading 3" onClick={() => chain().toggleHeading({ level: 3 }).run()} active={editor.isActive("heading", { level: 3 })}>
          <Heading3 className="h-3.5 w-3.5" />
        </ToolbarBtn>

        <Divider />

        <ToolbarBtn title="Bullet list" onClick={() => chain().toggleBulletList().run()} active={editor.isActive("bulletList")}>
          <List className="h-3.5 w-3.5" />
        </ToolbarBtn>
        <ToolbarBtn title="Numbered list" onClick={() => chain().toggleOrderedList().run()} active={editor.isActive("orderedList")}>
          <ListOrdered className="h-3.5 w-3.5" />
        </ToolbarBtn>
        <ToolbarBtn title="Blockquote" onClick={() => chain().toggleBlockquote().run()} active={editor.isActive("blockquote")}>
          <Quote className="h-3.5 w-3.5" />
        </ToolbarBtn>
        <ToolbarBtn title="Horizontal rule" onClick={() => chain().setHorizontalRule().run()}>
          <Minus className="h-3.5 w-3.5" />
        </ToolbarBtn>

        <Divider />

        <ToolbarBtn title="Undo" onClick={() => chain().undo().run()} disabled={!editor.can().undo()}>
          <Undo2 className="h-3.5 w-3.5" />
        </ToolbarBtn>
        <ToolbarBtn title="Redo" onClick={() => chain().redo().run()} disabled={!editor.can().redo()}>
          <Redo2 className="h-3.5 w-3.5" />
        </ToolbarBtn>
      </div>

      {/* Content */}
      <EditorContent
        editor={editor}
        style={{ minHeight }}
        className={cn(
          "prose prose-sm dark:prose-invert max-w-none",
          "[&_.ProseMirror]:outline-none [&_.ProseMirror]:px-3 [&_.ProseMirror]:py-2",
          `[&_.ProseMirror]:min-h-[${minHeight}]`,
          "[&_.ProseMirror>*:first-child]:mt-0",
          "[&_.ProseMirror>*:last-child]:mb-0",
        )}
      />
    </div>
  );
}
