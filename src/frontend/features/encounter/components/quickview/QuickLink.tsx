import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useQuickView, type QuickViewSubject } from "../../context/QuickViewContext";

/**
 * A name or ability that opens the quick view. Outside the encounter screen
 * (no quick view) it's plain text. Clicks don't reach the card underneath.
 */
export function QuickLink({
  subject,
  label,
  className,
  children,
}: {
  subject: QuickViewSubject | null;
  /** Accessible name when the visible text isn't enough, e.g. "About Grizzle". */
  label?: string;
  className?: string;
  children: ReactNode;
}) {
  const quickView = useQuickView();
  if (!quickView || !subject) return <span className={className}>{children}</span>;
  return (
    <button
      type="button"
      aria-label={label}
      className={cn(
        "min-w-0 truncate text-left underline decoration-dotted decoration-1 underline-offset-2 hover:text-primary focus-visible:text-primary",
        className,
      )}
      onClick={(e) => {
        e.stopPropagation();
        quickView.open(subject);
      }}
    >
      {children}
    </button>
  );
}
