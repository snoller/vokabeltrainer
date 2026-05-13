/** Spaced repetition: classic SM-2 (SuperMemo 2) intervals in minutes for short-term, then days. */

export type ReviewQuality =
  | "again"
  | "hard"
  | "good"
  | "easy";

/** Map UX buttons to SM-2 quality 0–5 */
export function qualityToSm2(q: ReviewQuality): number {
  switch (q) {
    case "again":
      return 0;
    case "hard":
      return 3;
    case "good":
      return 4;
    case "easy":
      return 5;
    default:
      return 4;
  }
}

const MIN_EASE = 1.3;
const MS_PER_MIN = 60_000;
const MS_PER_DAY = 86_400_000;

export interface SrsState {
  easeFactor: number;
  intervalDays: number;
  repetitions: number;
  dueAt: number; // epoch ms
  /** Last interval shown in learning (minutes), for “learn” steps */
  lastIntervalMinutes?: number;
}

export function defaultSrsState(now: number): SrsState {
  return {
    easeFactor: 2.5,
    intervalDays: 0,
    repetitions: 0,
    dueAt: now,
  };
}

/** Next review after user rates with `quality` (SM-2). */
export function scheduleNext(
  prev: SrsState,
  quality: ReviewQuality,
  now: number
): SrsState {
  const q = qualityToSm2(quality);
  let ease = prev.easeFactor;
  let reps = prev.repetitions;
  let intervalDays = prev.intervalDays;

  if (q < 3) {
    reps = 0;
    intervalDays = 0;
    const minutes =
      quality === "again" ? 1 : quality === "hard" ? 5 : 10;
    return {
      easeFactor: Math.max(MIN_EASE, ease - 0.2),
      intervalDays: 0,
      repetitions: 0,
      dueAt: now + minutes * MS_PER_MIN,
      lastIntervalMinutes: minutes,
    };
  }

  ease = ease + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));
  ease = Math.max(MIN_EASE, ease);

  if (reps === 0) {
    intervalDays = 1;
  } else if (reps === 1) {
    intervalDays = 6;
  } else {
    intervalDays = Math.round(intervalDays * ease);
  }
  reps += 1;

  const dueAt = now + intervalDays * MS_PER_DAY;

  return {
    easeFactor: ease,
    intervalDays,
    repetitions: reps,
    dueAt,
    lastIntervalMinutes: undefined,
  };
}

export function isDue(card: { srs: SrsState }, now: number): boolean {
  return card.srs.dueAt <= now;
}

export function formatIntervalGerman(s: SrsState, now: number): string {
  const diff = s.dueAt - now;
  if (diff <= 0) return "jetzt";
  const mins = Math.round(diff / MS_PER_MIN);
  if (mins < 60) return `${mins} Min`;
  const hours = Math.round(diff / (60 * MS_PER_MIN));
  if (hours < 48) return `${hours} Std`;
  const days = Math.round(diff / MS_PER_DAY);
  if (days < 14) return `${days} Tag${days === 1 ? "" : "e"}`;
  const weeks = Math.round(days / 7);
  return `${weeks} Wo.`;
}
