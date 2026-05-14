import type { ReviewQuality } from "@/lib/srs";

/** Mindestfingerweg (Pixel), damit keine Klicks wie Wischen gewertet werden */
export const LEARN_SWIPE_MIN_PX = 52;

/**
 * Unterhalb davon keine Ampeltönung beim Ziehen; darüber schon Hinweisfarben (bewerten tut die App weiter erst ab {@link LEARN_SWIPE_MIN_PX}).
 */
export const LEARN_SWIPE_TINT_HINT_MIN_PX = 26;

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

/** Gleiche Richtungslogik wie `qualityFromSwipeVector`, aber ab kleinerem Weg — nur für sichtbare Farbhilfe beim Ziehen. */
export function qualityHintFromSwipeWhileDragging(dx: number, dy: number): ReviewQuality | null {
  const ax = Math.abs(dx);
  const ay = Math.abs(dy);
  const m = Math.max(ax, ay);
  if (m < LEARN_SWIPE_TINT_HINT_MIN_PX) return null;
  if (ax >= ay) {
    return dx >= 0 ? "easy" : "again";
  }
  return dy <= 0 ? "good" : "hard";
}
