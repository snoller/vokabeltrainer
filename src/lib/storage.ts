import type { VocabularyCard } from "@/types";
import { getActiveProfileId, cardsStorageKey } from "@/lib/profile";
import { defaultSrsState } from "@/lib/srs";

/** Für `useSyncExternalStore`: immer derselbe String bei unveränderten Daten (keine neuen Arrays pro Aufruf). */
export function getCardsStorageSnapshot(): string {
  try {
    const key = cardsStorageKey(getActiveProfileId());
    return localStorage.getItem(key) ?? "[]";
  } catch {
    return "[]";
  }
}

export function parseCardsSnapshot(raw: string): VocabularyCard[] {
  try {
    const parsed = JSON.parse(raw) as VocabularyCard[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function loadCards(): VocabularyCard[] {
  return parseCardsSnapshot(getCardsStorageSnapshot());
}

export function saveCards(cards: VocabularyCard[]): void {
  const key = cardsStorageKey(getActiveProfileId());
  localStorage.setItem(key, JSON.stringify(cards));
}

export function newCardId(): string {
  return crypto.randomUUID?.() ?? `c-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function optStr(s: string | undefined): string | undefined {
  const t = s?.trim();
  return t ? t : undefined;
}

export function createCard(input: {
  front: string;
  back: string;
  hint?: string;
  lesson?: string;
  chapter?: string;
  languagePair?: string;
}): VocabularyCard {
  const now = Date.now();
  return {
    id: newCardId(),
    front: input.front.trim(),
    back: input.back.trim(),
    hint: optStr(input.hint),
    lesson: optStr(input.lesson),
    chapter: optStr(input.chapter),
    languagePair: optStr(input.languagePair),
    createdAt: new Date(now).toISOString(),
    srs: defaultSrsState(now),
  };
}
