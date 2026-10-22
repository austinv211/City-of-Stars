import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

/**
 * Setup for the jsdom (`component`) project only. The `unit` project runs in
 * node and loads none of this.
 */

afterEach(() => {
  cleanup();
});

/**
 * jsdom does not implement matchMedia, and useMediaQuery is now reachable from
 * most of the shell. Without this every component test that renders anything
 * inside AppShell throws on import.
 *
 * The default is "nothing matches", which lands components in their phone-first
 * layout. A test that needs a different viewport overrides `matches` itself.
 */
if (!window.matchMedia) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(), // deprecated, but Radix still probes for it
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

// Radix uses both of these for positioning and focus management; jsdom has
// neither, and they throw rather than no-op.
if (!window.ResizeObserver) {
  window.ResizeObserver = class {
    observe() {
      /* no-op */
    }
    unobserve() {
      /* no-op */
    }
    disconnect() {
      /* no-op */
    }
  };
}

if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = vi.fn();
}
