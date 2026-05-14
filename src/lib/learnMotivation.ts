import { getActiveProfileId } from "@/lib/profile";

/** Kein Streak, kein täglicher Zwang — nur Kumulation und letzte geleerte Schlange */

export type LastLearnSessionSummary = {
  endedAtMs: number;
  /** Bewertungen in dieser Lerneinheit (kann höher sein als queuedAtStart, z. B. bei „nochmal“). */
  reviewsInSession: number;
  /** Fällige Karten zu Beginn dieses Besuchs auf der Learn-Seite. */
  queuedAtStart: number;
};

export type LearnMotivationState = {
  totalReviews: number;
  lastEmptiedQueue?: LastLearnSessionSummary;
};

const EVENT = "vokabeltrainer:learnMotivation";

function motivationKey(profileId: string): string {
  return `vokabeltrainer:v1:learnMotivation:${profileId}`;
}

function dispatchMotivation(): void {
  window.dispatchEvent(new Event(EVENT));
}

export function subscribeLearnMotivation(cb: () => void): () => void {
  window.addEventListener(EVENT, cb);
  window.addEventListener("storage", cb);
  window.addEventListener("vokabeltrainer:profile", cb);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener("storage", cb);
    window.removeEventListener("vokabeltrainer:profile", cb);
  };
}

/** Snapshot-String für `useSyncExternalStore` */
export function getLearnMotivationSnapshot(): string {
  try {
    return JSON.stringify(loadLearnMotivationForProfile(getActiveProfileId()));
  } catch {
    return JSON.stringify({ totalReviews: 0 });
  }
}

function parseState(raw: string | null): LearnMotivationState {
  if (!raw) return { totalReviews: 0 };
  try {
    const x = JSON.parse(raw) as LearnMotivationState;
    const total = typeof x.totalReviews === "number" && x.totalReviews >= 0 ? Math.floor(x.totalReviews) : 0;
    let lastEmptied: LastLearnSessionSummary | undefined;
    const l = x.lastEmptiedQueue;
    if (l && typeof l.endedAtMs === "number" && typeof l.reviewsInSession === "number") {
      lastEmptied = {
        endedAtMs: l.endedAtMs,
        reviewsInSession: Math.max(0, Math.floor(l.reviewsInSession)),
        queuedAtStart: Math.max(
          0,
          typeof l.queuedAtStart === "number" ? Math.floor(l.queuedAtStart) : l.reviewsInSession
        ),
      };
    }
    return { totalReviews: total, lastEmptiedQueue: lastEmptied };
  } catch {
    return { totalReviews: 0 };
  }
}

export function loadLearnMotivationForProfile(profileId: string): LearnMotivationState {
  try {
    return parseState(localStorage.getItem(motivationKey(profileId)));
  } catch {
    return { totalReviews: 0 };
  }
}

function saveLearnMotivationForProfile(profileId: string, state: LearnMotivationState): void {
  try {
    localStorage.setItem(motivationKey(profileId), JSON.stringify(state));
    dispatchMotivation();
  } catch {
    /* ignore */
  }
}

/**
 * Aufzurufen, sobald eine Bewertung in die Kartenliste geschrieben wurde.
 * Bei `completedEmptiedQueue === true`: Nutzer:in hat keine fälligen Karten mehr.
 */
export function recordLearnMotivationReview(opts: {
  profileId: string;
  completedEmptiedQueue: boolean;
  sessionReviewsSoFar: number;
  queuedAtSessionStart: number;
}): void {
  const cur = loadLearnMotivationForProfile(opts.profileId);
  const next: LearnMotivationState = {
    totalReviews: cur.totalReviews + 1,
    lastEmptiedQueue: cur.lastEmptiedQueue,
  };

  if (opts.completedEmptiedQueue && opts.sessionReviewsSoFar > 0) {
    next.lastEmptiedQueue = {
      endedAtMs: Date.now(),
      reviewsInSession: opts.sessionReviewsSoFar,
      queuedAtStart: Math.max(1, opts.queuedAtSessionStart),
    };
  }

  saveLearnMotivationForProfile(opts.profileId, next);
}
