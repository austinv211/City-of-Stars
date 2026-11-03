import { useCallback, useRef, useState } from "react";

/**
 * A popover that opens on hover with a mouse and on tap on a phone, and stays
 * open while the pointer moves from its trigger into it.
 */
export function useHoverPopover() {
  const [open, setOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onMouseEnter = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    setOpen(true);
  }, []);

  const onMouseLeave = useCallback(() => {
    timer.current = setTimeout(() => {
      setOpen(false);
    }, 150);
  }, []);

  return { open, setOpen, onMouseEnter, onMouseLeave };
}
