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

/** Konfirmatorische Fläche _hinter_ der Karte, sichtbar wenn die Karte wegfliegt */
export function ratingLearnConfirmBackdrop(quality: ReviewQuality): { background: string } {
  const { angle, fill } = ampelOverlay(quality);
  const [fr, fg, fb] = fill;
  return {
    background: `linear-gradient(${angle}deg, rgba(${fr},${fg},${fb},0.5) 0%, rgba(${fr},${fg},${fb},0.22) 42%, rgba(${fr},${fg},${fb},0.06) 72%, transparent 100%)`,
  };
}

/** Kurzer Rand beim Tippen auf die Bewertungsbuttons (Karte bleibt deckend) */
export function ratingTapConfirmOutline(quality: ReviewQuality): {
  outline: string;
  outlineOffset: string;
} {
  const { rim } = ampelOverlay(quality);
  const [r, g, b] = rim;
  return {
    outline: `3px solid rgba(${r},${g},${b},0.82)`,
    outlineOffset: "4px",
  };
}

export const LEARN_CARD_FLY_MS = 340;
