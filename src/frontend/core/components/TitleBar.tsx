import { Minus, Square, X } from "lucide-react";
import { cn } from "@/lib/utils";

// ── Multicolored 4-pointed sparkle star ────────────────────────────────────

export function AnimatedStar({ size = 18 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 20 20"
      aria-hidden
      className="star-icon shrink-0"
    >
      {/* Top arm — Mauve */}
      <polygon points="10,10 7.5,7.5 10,0 12.5,7.5"   fill="#cba6f7" />
      {/* Right arm — Blue */}
      <polygon points="10,10 12.5,7.5 20,10 12.5,12.5" fill="#89b4fa" />
      {/* Bottom arm — Peach */}
      <polygon points="10,10 12.5,12.5 10,20 7.5,12.5" fill="#fab387" />
      {/* Left arm — Green */}
      <polygon points="10,10 7.5,12.5 0,10 7.5,7.5"   fill="#a6e3a1" />
    </svg>
  );
}

// ── Window control button ──────────────────────────────────────────────────

function WinBtn({
  onClick,
  hoverColor,
  title,
  children,
}: {
  onClick: () => void;
  hoverColor: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={cn(
        "flex h-full w-10 items-center justify-center text-muted-foreground transition-colors",
        hoverColor,
      )}
    >
      {children}
    </button>
  );
}

// ── Title bar ──────────────────────────────────────────────────────────────

async function tauriWindow() {
  try {
    const { getCurrentWindow } = await import("@tauri-apps/api/window");
    return getCurrentWindow();
  } catch {
    return null;
  }
}

export function TitleBar() {
  return (
    <div
      className="flex h-8 w-full shrink-0 select-none items-center"
      style={{ background: "hsl(var(--titlebar))" }}
      data-tauri-drag-region
    >
      {/* Brand — not interactive, part of drag region */}
      <div className="flex items-center gap-2 px-3 pointer-events-none">
        <AnimatedStar size={16} />
        <span className="text-xs font-semibold tracking-tight" style={{ color: "hsl(var(--foreground) / 0.65)" }}>
          City of Stars
        </span>
      </div>

      {/* Drag region filler */}
      <div className="flex-1" data-tauri-drag-region />

      {/* Window controls — excluded from drag region */}
      <div className="flex items-stretch h-full">
        <WinBtn
          title="Minimize"
          hoverColor="hover:bg-[hsl(var(--ctp-yellow)/0.25)] hover:text-[hsl(var(--ctp-yellow))]"
          onClick={() => tauriWindow().then((w) => w?.minimize())}
        >
          <Minus className="h-3 w-3" />
        </WinBtn>
        <WinBtn
          title="Maximize"
          hoverColor="hover:bg-[hsl(var(--ctp-green)/0.25)] hover:text-[hsl(var(--ctp-green))]"
          onClick={() => tauriWindow().then((w) => w?.toggleMaximize())}
        >
          <Square className="h-3 w-3" />
        </WinBtn>
        <WinBtn
          title="Close"
          hoverColor="hover:bg-[hsl(var(--ctp-red)/0.30)] hover:text-[hsl(var(--ctp-red))]"
          onClick={() => tauriWindow().then((w) => w?.close())}
        >
          <X className="h-3.5 w-3.5" />
        </WinBtn>
      </div>
    </div>
  );
}
