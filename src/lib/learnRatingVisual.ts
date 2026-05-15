import { LEARN_SWIPE_MIN_PX, LEARN_SWIPE_TINT_HINT_MIN_PX } from "@/lib/learnSwipeRating";
import type { ReviewQuality } from "@/lib/srs";

/**
 * Einheitliche Ampel: easy (rechts) kühl‑türkis, good (oben) warmes Gelbgrün,
 * hard gelb, again Korall‑Rosé — easy/good bewusst getrennt, nicht zwei „fast gleiche“ Grüns.
 */
function ampelOverlay(quality: ReviewQuality): {
  angle: number;
  fill: [number, number, number];
  rim: [number, number, number];
} {
  switch (quality) {
    case "easy":
      return { angle: 226, fill: [42, 178, 156], rim: [58, 194, 172] };
    case "good":
      return { angle: 178, fill: [124, 188, 76], rim: [142, 204, 90] };
    case "hard":
      return { angle: 174, fill: [218, 168, 68], rim: [236, 190, 86] };
    case "again":
      return { angle: 138, fill: [200, 128, 128], rim: [212, 150, 148] };
    default:
      return { angle: 226, fill: [42, 178, 156], rim: [58, 194, 172] };
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
 * Intensität der Ampel beim Ziehen: erste Wege zwischen TINT-HINT und Bewertungsminimum dezent,
 * danach analog zum Bewertungsweg kräftiger.
 */
export function swipeDragHintIntensity(dx: number, dy: number): number {
  const m = Math.max(Math.abs(dx), Math.abs(dy));
  const t0 = LEARN_SWIPE_TINT_HINT_MIN_PX;
  const t1 = LEARN_SWIPE_MIN_PX;
  if (m <= t0) return 0;
  if (m < t1) {
    const u = (m - t0) / (t1 - t0);
    return Math.min(1, 0.12 + u * 0.48);
  }
  const over = m - t1;
  return Math.min(1, 0.6 + Math.min(1, over / 72) * 0.4);
}

/** Eck-Tönung beim Ziehen — kräftiger als der Loslass-Flash, da Text darunter liegt. */
export function ratingSwipeDragOverlay(quality: ReviewQuality, intensity: number): {
  background: string;
  boxShadow: string;
} {
  const t = Math.max(0, Math.min(1, intensity));
  const { angle, fill, rim } = ampelOverlay(quality);
  const [fr, fg, fb] = fill;
  const [rr, rg, rb] = rim;
  const g0 = 0.1 + 0.4 * t;
  const g1 = 0.05 + 0.16 * t;
  const eA = 0.34 + 0.38 * t;
  return {
    background: `linear-gradient(${angle}deg, rgba(${fr},${fg},${fb},${g0}) 0%, rgba(${fr},${fg},${fb},${g1}) 44%, transparent 70%)`,
    boxShadow: `inset 0 0 0 2px rgba(${rr},${rg},${rb},${eA})`,
  };
}

export const LEARN_CARD_FLY_MS = 340;
export const LEARN_RATING_DOCK_LINGER_MS = 1180;

/**
 * Kleine fixe Ampel-Kugel (unten mittig): kräftige Füllfarbe + Rand,
 * damit die Bewertung nach dem Wegwischen auch ohne Karten-Overlay gut erkennbar ist.
 */
export function ratingSwipeDockDotStyle(quality: ReviewQuality): {
  background: string;
  boxShadow: string;
} {
  const { fill, rim } = ampelOverlay(quality);
  const [fr, fg, fb] = fill;
  const [rr, rg, rb] = rim;
  return {
    background: `rgb(${fr},${fg},${fb})`,
    boxShadow: [
      `0 0 0 2px rgba(${rr},${rg},${rb},0.95)`,
      `0 3px 12px rgba(0,0,0,0.35)`,
      `0 0 20px rgba(${fr},${fg},${fb},0.55)`,
    ].join(", "),
  };
}

/** Kurzer Vollbild-Puls nach Wisch-Bewertung — gleiche Ampel wie Kugel/Karte */
export function ratingSwipeScreenPulseBackground(quality: ReviewQuality): string {
  const { angle, fill } = ampelOverlay(quality);
  const [fr, fg, fb] = fill;
  return [
    `radial-gradient(ellipse 135% 92% at 50% 44%, rgba(${fr},${fg},${fb},0.44) 0%, rgba(${fr},${fg},${fb},0.15) 52%, transparent 74%)`,
    `linear-gradient(${angle}deg, rgba(${fr},${fg},${fb},0.22) 0%, transparent 56%)`,
  ].join(", ");
}
