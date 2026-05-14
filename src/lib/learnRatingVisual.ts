import { LEARN_SWIPE_MIN_PX } from "@/lib/learnSwipeRating";
import type { ReviewQuality } from "@/lib/srs";

/**
 * Einheitliche Ampel-Logik (intuitiv): easy/good = Grün, hard = Gelb, again = weiches Rot
 * (kein Knallrot — eher warmes Korall-Rosé).
 */
function ampelOverlay(quality: ReviewQuality): {
  angle: number;
  fill: [number, number, number];
  rim: [number, number, number];
} {
  switch (quality) {
    case "easy":
      return { angle: 218, fill: [56, 168, 118], rim: [72, 186, 130] };
    case "good":
      return { angle: 204, fill: [108, 176, 98], rim: [124, 192, 110] };
    case "hard":
      return { angle: 174, fill: [218, 168, 68], rim: [236, 190, 86] };
    case "again":
      return { angle: 138, fill: [200, 128, 128], rim: [212, 150, 148] };
    default:
      return { angle: 218, fill: [56, 168, 118], rim: [72, 186, 130] };
  }
}

/** Kurzer Blitz nach Loslassen / Tipp — gleiche Ampel wie beim Wischen */
export function ratingFlashOverlay(quality: ReviewQuality): { background: string; boxShadow: string } {
  const { angle, fill, rim } = ampelOverlay(quality);
  const [fr, fg, fb] = fill;
  const [rr, rg, rb] = rim;
  return {
    background: `linear-gradient(${angle}deg, rgba(${fr},${fg},${fb},0.28) 0%, transparent 55%)`,
    boxShadow: `inset 0 0 0 2px rgba(${rr},${rg},${rb},0.44)`,
  };
}

/**
 * Sichtbarkeit der ziehen-Vorschau sobald die Wischrichtung eine Bewertung träfe (ab Mindestweg).
 * Kurze Wege nach dem Schwellwert = dezent, längere Züge = kräftiger.
 */
export function swipeDragHintIntensity(dx: number, dy: number): number {
  const m = Math.max(Math.abs(dx), Math.abs(dy));
  const over = Math.max(0, m - LEARN_SWIPE_MIN_PX);
  return Math.min(1, 0.18 + Math.min(1, over / 72) * 0.75);
}

/** Eck-Tönung beim Ziehen — dieselbe Ampel wie `ratingFlashOverlay`, mit Wisch-Stärke. */
export function ratingSwipeDragOverlay(quality: ReviewQuality, intensity: number): {
  background: string;
  boxShadow: string;
} {
  const t = Math.max(0, Math.min(1, intensity));
  const { angle, fill, rim } = ampelOverlay(quality);
  const [fr, fg, fb] = fill;
  const [rr, rg, rb] = rim;
  const gA = 0.065 + 0.22 * t;
  const eA = 0.26 + 0.36 * t;
  return {
    background: `linear-gradient(${angle}deg, rgba(${fr},${fg},${fb},${gA}) 0%, transparent 58%)`,
    boxShadow: `inset 0 0 0 1px rgba(${rr},${rg},${rb},${eA})`,
  };
}

export const LEARN_CARD_FLY_MS = 340;
