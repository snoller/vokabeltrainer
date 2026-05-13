export interface VocabularyCard {
  id: string;
  front: string;
  /** Target language / translation */
  back: string;
  /** Optional hint (e.g. article, context) */
  hint?: string;
  /** Freitext, z. B. „5“ oder „Lektion 5“ */
  lesson?: string;
  /** Freitext, z. B. „12“ oder „Kap. Verb“ */
  chapter?: string;
  /** Bibliothek/Scan: z. B. `latin-de` – gleiche IDs wie LANGUAGE_PAIR_PRESETS */
  languagePair?: string;
  /** ISO date created */
  createdAt: string;
  srs: import("./srs").SrsState;
}
