import type { VocabularyCard } from "@/types";
import { LANGUAGE_PAIR_PRESETS, type LanguagePairId } from "@/lib/languagePairs";
import { cardsStorageKey } from "@/lib/profile";
import { createCard, parseCardsSnapshot } from "@/lib/storage";

const FLAG_PREFIX = "vokabeltrainer:v1:starterDeckApplied";

function flagKey(profileId: string): string {
  return `${FLAG_PREFIX}:${profileId}`;
}

/** Je 10 sehr einfache Paare pro Sprachrichtung → Deutsch (Lesen/Abfrage). */
const STARTER_ROWS: Record<
  LanguagePairId,
  readonly { front: string; back: string; hint?: string }[]
> = {
  "latin-de": [
    { front: "salvē", back: "hallo; sei gegrüßt", hint: "Begrüßung" },
    { front: "māter", back: "die Mutter", hint: "f." },
    { front: "pater", back: "der Vater", hint: "m." },
    { front: "discipulus", back: "der Schüler", hint: "Schule" },
    { front: "magistra", back: "die Lehrerin", hint: "Femininum" },
    { front: "rosa", back: "die Rose", hint: "f." },
    { front: "lūna", back: "der Mond", hint: "f." },
    { front: "puella", back: "das Mädchen", hint: "f." },
    { front: "scribere", back: "schreiben", hint: "Infinitiv" },
    { front: "et", back: "und", hint: "Konjunktion" },
  ],
  "en-de": [
    { front: "hello", back: "hallo" },
    { front: "thank you", back: "danke" },
    { front: "please", back: "bitte" },
    { front: "good morning", back: "guten Morgen" },
    { front: "water", back: "das Wasser", hint: "Neutral" },
    { front: "friend", back: "der Freund / die Freundin", hint: "Person" },
    { front: "book", back: "das Buch" },
    { front: "school", back: "die Schule", hint: "Ort" },
    { front: "cat", back: "die Katze" },
    { front: "apple", back: "der Apfel", hint: "Obst" },
  ],
  "fr-de": [
    { front: "bonjour", back: "guten Tag; hallo", hint: "Begrüßung" },
    { front: "merci", back: "danke" },
    { front: "s'il vous plaît", back: "bitte (höflich)" },
    { front: "au revoir", back: "auf Wiedersehen" },
    { front: "l'eau", back: "das Wasser", hint: "fém." },
    { front: "la maison", back: "das Haus" },
    { front: "ami / amie", back: "Freund / Freundin" },
    { front: "école", back: "die Schule", hint: "fém." },
    { front: "chat", back: "die Katze (m.)", hint: "Tier" },
    { front: "pain", back: "das Brot", hint: "m." },
  ],
  "es-de": [
    { front: "hola", back: "hallo" },
    { front: "gracias", back: "danke" },
    { front: "por favor", back: "bitte" },
    { front: "buenos días", back: "guten Tag (Morgen)" },
    { front: "adiós", back: "auf Wiedersehen" },
    { front: "agua", back: "das Wasser", hint: "f." },
    { front: "casa", back: "das Haus" },
    { front: "amigo / amiga", back: "Freund / Freundin" },
    { front: "libro", back: "das Buch", hint: "m." },
    { front: "escuela", back: "die Schule", hint: "f." },
  ],
};

function readCardsRaw(profileId: string): string {
  try {
    return localStorage.getItem(cardsStorageKey(profileId)) ?? "[]";
  } catch {
    return "[]";
  }
}

/**
 * Wenn noch keine Karten existieren, einmalig Starter-Vokabel für alle Preset-Sprachen einfügen.
 * Bereits befüllte Bibliotheken oder bereits gesetzter Flag bleiben unberührt.
 */
export function ensureStarterDeckIfEmpty(profileId: string): void {
  try {
    if (!profileId) return;
    if (localStorage.getItem(flagKey(profileId)) === "1") return;

    const raw = readCardsRaw(profileId);
    const existing = parseCardsSnapshot(raw);
    if (existing.length > 0) {
      localStorage.setItem(flagKey(profileId), "1");
      return;
    }

    const appended: VocabularyCard[] = [];

    for (const preset of LANGUAGE_PAIR_PRESETS) {
      const rows = STARTER_ROWS[preset.id];
      for (const row of rows) {
        appended.push(
          createCard({
            front: row.front,
            back: row.back,
            hint: row.hint,
            lesson: "Demo",
            chapter: "Starter",
            languagePair: preset.id,
          })
        );
      }
    }

    localStorage.setItem(cardsStorageKey(profileId), JSON.stringify(appended));
    localStorage.setItem(flagKey(profileId), "1");
    window.dispatchEvent(new Event("vokabeltrainer:update"));
  } catch {
    /* ignore */
  }
}
