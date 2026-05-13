import type { VocabularyCard } from "@/types";
import { languagePairShortLabel } from "@/lib/languagePairs";

export function formatChapterLessonLine(card: Pick<VocabularyCard, "lesson" | "chapter">): string | null {
  const parts: string[] = [];
  const ch = card.chapter?.trim();
  const le = card.lesson?.trim();
  if (ch) parts.push(`Kapitel: ${ch}`);
  if (le) parts.push(`Lektion: ${le}`);
  return parts.length ? parts.join(" · ") : null;
}

/** Lernen / Scan: Sprach‑Tag + Kap./Lekt. */
export function formatCardMetaLine(card: Pick<VocabularyCard, "lesson" | "chapter" | "languagePair">): string | null {
  const parts: string[] = [];
  const lang = languagePairShortLabel(card.languagePair);
  if (lang) parts.push(lang);
  const sub = formatChapterLessonLine(card);
  if (sub) parts.push(sub);
  return parts.length ? parts.join(" · ") : null;
}
