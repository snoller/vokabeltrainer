import type { ReviewQuality } from "@/lib/srs";

/** Kurzer Warnton pro Bewertung (Web Audio, kein externes Asset); iOS: bei erster Tap/Wisch-Geste freigeschaltet */
export function playLearnRatingBlip(q: ReviewQuality): void {
  try {
    const Win = typeof window !== "undefined" ? window : undefined;
    const AC = Win?.AudioContext ?? (Win as Window & { webkitAudioContext?: typeof AudioContext })?.webkitAudioContext;
    if (!AC) return;

    const hz =
      q === "again" ? 150 : q === "hard" ? 220 : q === "good" ? 380 : q === "easy" ? 520 : 340;
    const ctx = new AC();
    if (ctx.state === "suspended") void ctx.resume().catch(() => undefined);

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
    gain.gain.exponentialRampToValueAtTime(0.065, now + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, end);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(end + 0.015);

    const closeAt = Math.round((end + 0.12) * 1000);
    window.setTimeout(() => {
      try {
        void ctx.close();
      } catch {
        /* ignore */
      }
    }, closeAt);
  } catch {
    /* ignore */
  }
}
