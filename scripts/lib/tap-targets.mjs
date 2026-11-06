/**
 * Interactive elements whose tap area is under `min` px, as readable labels.
 *
 * Runs in the page (pass it to `page.evaluate`), so it must stay
 * self-contained. The tap area is the element's box grown by its ::after:
 * on touch screens globals.scss gives small buttons, tabs and links an
 * invisible ::after that reaches out to 44px, so a control can look compact
 * and still be easy to hit.
 *
 * @param {number} [min=44]
 * @returns {string[]}
 */
export function findSmallTapTargets(min = 44) {
  const px = (value) => Number.parseFloat(value) || 0;
  const bad = [];
  for (const el of document.querySelectorAll("button, a[href], [role='button'], [role='tab']")) {
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue; // not rendered

    const after = getComputedStyle(el, "::after");
    const reach =
      after.content !== "none" && after.position === "absolute"
        ? {
            x: -Math.min(0, px(after.left)) - Math.min(0, px(after.right)),
            y: -Math.min(0, px(after.top)) - Math.min(0, px(after.bottom)),
          }
        : { x: 0, y: 0 };

    const width = r.width + reach.x;
    const height = r.height + reach.y;
    if (width < min - 0.5 || height < min - 0.5) {
      const name = el.getAttribute("aria-label") ?? (el.textContent ?? "").trim().slice(0, 24);
      bad.push(`"${name}" ${String(Math.round(width))}x${String(Math.round(height))}`);
    }
  }
  return bad;
}
