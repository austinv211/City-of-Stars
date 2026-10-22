import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * A dialog that is a bottom sheet on phones and a centred modal from `md` up.
 *
 * Implemented as one Radix dialog whose content is repositioned by CSS, not as
 * two components swapped by a breakpoint hook. Both shapes are
 * `DialogPrimitive.Content` underneath, so the difference is purely position,
 * size and animation — which means no JS, no remount on resize, and no
 * wrong-shape flash on first paint.
 *
 * (A drag-to-dismiss library such as vaul would add a little native feel on
 * touch. Skipped deliberately: it is a second dependency and a second styling
 * surface for something this already does, and Sheet/Dialog here share the
 * project's tokens. Worth revisiting only if the feel is actually lacking.)
 *
 * Fixes two long-standing problems with ui/dialog.tsx while it is at it:
 *   - no `max-h` or overflow, so long bodies were clipped unless each caller
 *     remembered `max-h-[90vh] overflow-y-auto` (most did, individually)
 *   - `p-6` at every width, which costs 48px of a 360px screen
 */

const ResponsiveDialog = DialogPrimitive.Root;
const ResponsiveDialogTrigger = DialogPrimitive.Trigger;
const ResponsiveDialogClose = DialogPrimitive.Close;

const ResponsiveDialogContent = React.forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & {
    /** Widen past the default `md:max-w-lg`, e.g. "md:max-w-2xl". */
    widthClassName?: string;
  }
>(({ className, widthClassName, children, ...props }, ref) => (
  <DialogPrimitive.Portal>
    <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm data-[state=closed]:animate-out data-[state=open]:animate-in data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        // Shared
        "fixed z-50 flex flex-col gap-4 overflow-hidden border border-border/70 bg-card shadow-elevated duration-200",
        // Phone: bottom sheet, full width, capped so it never swallows the screen
        "inset-x-0 bottom-0 max-h-[85dvh] p-4 pb-[max(1rem,var(--safe-bottom))]",
        "data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom",
        // md+: centred modal
        "md:inset-x-auto md:bottom-auto md:left-1/2 md:top-1/2 md:max-h-[90vh] md:w-full md:-translate-x-1/2 md:-translate-y-1/2 md:p-6 md:pb-6",
        "md:data-[state=closed]:slide-out-to-left-1/2 md:data-[state=closed]:slide-out-to-top-[48%] md:data-[state=open]:slide-in-from-left-1/2 md:data-[state=open]:slide-in-from-top-[48%]",
        "md:data-[state=closed]:zoom-out-95 md:data-[state=open]:zoom-in-95",
        widthClassName ?? "md:max-w-lg",
        "data-[state=closed]:animate-out data-[state=open]:animate-in data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
        className,
      )}
      {...props}
    >
      {/* Grab handle — a touch affordance, meaningless with a mouse. */}
      <div
        aria-hidden="true"
        className="mx-auto h-1 w-10 shrink-0 rounded-full bg-muted-foreground/30 md:hidden"
      />
      {children}
      <DialogPrimitive.Close className="absolute right-4 top-4 p-1 text-muted-foreground opacity-70 transition-all hover:bg-destructive/15 hover:text-destructive hover:opacity-100 focus:outline-none focus:ring-1 focus:ring-primary disabled:pointer-events-none">
        <X className="h-4 w-4" />
        <span className="sr-only">Close</span>
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPrimitive.Portal>
));
ResponsiveDialogContent.displayName = "ResponsiveDialogContent";

/** Scrollable body. Keeps the header and footer pinned on a short screen. */
const ResponsiveDialogBody = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    data-scroll-container
    className={cn("-mx-1 min-h-0 flex-1 overflow-y-auto px-1", className)}
    {...props}
  />
);
ResponsiveDialogBody.displayName = "ResponsiveDialogBody";

const ResponsiveDialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex shrink-0 flex-col space-y-1.5 border-b border-border/40 pb-2 pr-8 text-left",
      className,
    )}
    {...props}
  />
);
ResponsiveDialogHeader.displayName = "ResponsiveDialogHeader";

const ResponsiveDialogFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      // Stacked and full-width on a phone (easier to hit), inline from sm up.
      "flex shrink-0 flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-0 sm:space-x-2",
      className,
    )}
    {...props}
  />
);
ResponsiveDialogFooter.displayName = "ResponsiveDialogFooter";

const ResponsiveDialogTitle = React.forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn(
      "bg-gradient-to-r from-primary to-secondary bg-clip-text text-lg font-semibold leading-none tracking-tight text-transparent",
      className,
    )}
    {...props}
  />
));
ResponsiveDialogTitle.displayName = DialogPrimitive.Title.displayName;

const ResponsiveDialogDescription = React.forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
));
ResponsiveDialogDescription.displayName = DialogPrimitive.Description.displayName;

export {
  ResponsiveDialog,
  ResponsiveDialogTrigger,
  ResponsiveDialogClose,
  ResponsiveDialogContent,
  ResponsiveDialogBody,
  ResponsiveDialogHeader,
  ResponsiveDialogFooter,
  ResponsiveDialogTitle,
  ResponsiveDialogDescription,
};
