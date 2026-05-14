import type { ReviewQuality } from "@/lib/srs";

let sharedCtx: AudioContext | null = null;

function getSharedAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (sharedCtx != null && sharedCtx.state !== "closed") return sharedCtx;
  const Win = window;
  const AC =
    Win.AudioContext ?? (Win as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  sharedCtx = new AC();
  return sharedCtx;
}

/** Kurzer Warnton pro Bewertung (Web Audio, kein externes Asset); gemeinsamer Kontext + resume für iOS/Safari */
export function playLearnRatingBlip(q: ReviewQuality): void {
  void playLearnRatingBlipAsync(q);
}

async function playLearnRatingBlipAsync(q: ReviewQuality): Promise<void> {
  try {
    const ctx = getSharedAudioContext();
    if (!ctx) return;
    if (ctx.state === "suspended" || ctx.state === "interrupted") {
      await ctx.resume().catch(() => undefined);
    }
    if (ctx.state === "closed") {
      sharedCtx = null;
      return;
    }

    const hz =
      q === "again" ? 150 : q === "hard" ? 220 : q === "good" ? 380 : q === "easy" ? 520 : 340;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = q === "easy" ? "sine" : "triangle";
    osc.frequency.setValueAtTime(hz, now);
    const end = q === "easy" ? now + 0.05 : now + 0.06;
    if (q === "easy") {
      osc.frequency.exponentialRampToValueAtTime(hz * 1.55, now + 0.045);
    }

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.1, now + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, end);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(end + 0.015);

    osc.onended = () => {
      try {
        osc.disconnect();
        gain.disconnect();
      } catch {
        /* ignore */
      }
    };
  } catch {
    /* ignore */
  }
}
