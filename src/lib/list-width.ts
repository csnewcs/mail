/**
 * Shared helpers for the message list ↔ detail separator.
 *
 * The separator position is stored as a RATIO of the list+detail container
 * (a fraction in [0, 1]), not an absolute pixel width. Storing a ratio keeps
 * the separator proportional when the window (or sidebar) is resized, so the
 * reading pane never gets squeezed out of existence.
 *
 * This module is intentionally framework/server agnostic so it can be imported
 * by the server and client component. Keep it free of `$lib/server` imports.
 */

/** Fraction of the container occupied by the message list. Keep in sync with
 *  the `--list-basis` fallback in `layout.css` (`section.mail-list-pane`). */
export const DEFAULT_LIST_RATIO = 0.4

/** Pixel floors enforced per-viewport by the CSS `clamp()`; mirrored here so the
 *  drag/keyboard math agrees with what the browser ultimately renders. */
export const MIN_LIST_PX = 280
export const MIN_DETAIL_PX = 360

// Coarse guard against corrupt cookie values only. The real, viewport-accurate
// floors live in the CSS clamp() and the drag math — not here — so this range is
// deliberately generous to avoid snapping a freshly dragged ratio on reload.
const MIN_RATIO = 0.05
const MAX_RATIO = 0.95

export function clampRatio(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_LIST_RATIO
  return Math.min(MAX_RATIO, Math.max(MIN_RATIO, value))
}

export function parseListRatio(raw: string | null | undefined): number {
  return clampRatio(Number(raw))
}
