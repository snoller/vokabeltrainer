import type { ReviewQuality } from "@/lib/srs";

/** Sanfter Kanten-/Scheinschimmer auf der Karte */
export function ratingFlashOverlay(quality: ReviewQuality): { background: string; boxShadow: string } {
  switch (quality) {
    case "again":
      return {
        background: "linear-gradient(135deg, rgba(224,90,90,0.22) 0%, transparent 55%)",
        boxShadow: "inset 0 0 0 2px rgba(224,122,122,0.42)",
      };
    case "hard":
      return {
        background: "linear-gradient(160deg, rgba(130,148,185,0.28) 0%, transparent 55%)",
        boxShadow: "inset 0 0 0 2px rgba(152,164,188,0.45)",
      };
    case "good":
      return {
        background: "linear-gradient(200deg, rgba(201,162,39,0.28) 0%, transparent 55%)",
        boxShadow: "inset 0 0 0 2px rgba(201,162,39,0.45)",
      };
    case "easy":
    default:
      return {
        background: "linear-gradient(220deg, rgba(74,164,126,0.32) 0%, transparent 55%)",
        boxShadow: "inset 0 0 0 2px rgba(91,185,140,0.5)",
      };
  }
}

export const LEARN_CARD_FLY_MS = 340;
