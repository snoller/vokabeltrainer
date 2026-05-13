import type { VocabularyCard } from "@/types";
import { isDue } from "@/lib/srs";
import { languagePairById } from "@/lib/languagePairs";

const DAY_MS = 86_400_000;

/** Auswertungen für die Statistik-Ansicht (aktives Profil, lokale Karten). */
export function computeLibraryStats(cards: VocabularyCard[], now: number) {
  const total = cards.length;

  let dueNow = 0;
  let dueWithin24h = 0;
  let dueBetween24hAnd7d = 0;
  let dueLater = 0;

  let easeSum = 0;
  let easeLow = 0;
  let easeMid = 0;
  let easeHigh = 0;

  let reps0 = 0;
  let reps12 = 0;
  let repsMature = 0;

  const sevenAgo = now - 7 * DAY_MS;
  const thirtyAgo = now - 30 * DAY_MS;
  let added7 = 0;
  let added30 = 0;

  const deadline24 = now + DAY_MS;
  const deadline7 = now + 7 * DAY_MS;

  for (const c of cards) {
    const { dueAt, easeFactor: ef, repetitions: r } = c.srs;

    if (isDue(c, now)) {
      dueNow += 1;
    } else if (dueAt <= deadline24) {
      dueWithin24h += 1;
    } else if (dueAt <= deadline7) {
      dueBetween24hAnd7d += 1;
    } else {
      dueLater += 1;
    }

    easeSum += ef;
    if (ef < 2) easeLow += 1;
    else if (ef <= 2.5) easeMid += 1;
    else easeHigh += 1;

    if (r === 0) reps0 += 1;
    else if (r <= 2) reps12 += 1;
    else repsMature += 1;

    const created = Date.parse(c.createdAt);
    if (!Number.isNaN(created)) {
      if (created >= sevenAgo) added7 += 1;
      if (created >= thirtyAgo) added30 += 1;
    }
  }

  const avgEase = total ? easeSum / total : null;

  const pairCounts = new Map<string, number>();
  for (const c of cards) {
    const pairId = (c.languagePair?.trim() || "__none__") as string;
    pairCounts.set(pairId, (pairCounts.get(pairId) ?? 0) + 1);
  }

  const byLanguage = [...pairCounts.entries()]
    .map(([id, count]) => ({
      id,
      label: id === "__none__" ? "Ohne Sprachwahl" : languagePairById(id)?.label ?? id,
      count,
    }))
    .sort((a, b) => b.count - a.count);

  return {
    total,
    dueNow,
    dueWithin24h,
    dueBetween24hAnd7d,
    dueLater,
    avgEase,
    easeLow,
    easeMid,
    easeHigh,
    reps0,
    reps12,
    repsMature,
    addedLast7Days: added7,
    addedLast30Days: added30,
    byLanguage,
  };
}
