import type { ReviewQuality } from "@/lib/srs";

/** Mindestfingerweg (Pixel), damit keine Klicks wie Wischen gewertet werden */
export const LEARN_SWIPE_MIN_PX = 52;

/** Wenn sich die scrollbare Fläche stärker bewegt, war es sehr wahrscheinlich Scroll — kein Rating */
export const LEARN_SCROLL_SUPPRESS_PIXELS = 20;

/** Rechts=easy · Links=again · Hoch=good · Runter=hard */
export function qualityFromSwipeVector(dx: number, dy: number): ReviewQuality | null {
  const ax = Math.abs(dx);
  const ay = Math.abs(dy);
  if (ax < LEARN_SWIPE_MIN_PX && ay < LEARN_SWIPE_MIN_PX) return null;

  if (ax >= ay) {
    return dx >= 0 ? "easy" : "again";
  }
  /* vy < 0: Finger nach oben gezogen */
  return dy <= 0 ? "good" : "hard";
}
