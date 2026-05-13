export const LANGUAGE_PAIR_PRESETS = [
  {
    id: "latin-de",
    label: "Latein → Deutsch",
    shortLabel: "La → DE",
    hint: "Latein → Deutsch. front = Lemma oder Flexionsform wie im Buch (Makronen übernehmen, wenn gedruckt); back = deutsche Übersetzung oder Bedeutung.",
    placeholderFront: "Latein (Lemma, Kasus oder Form wie im Buch …)",
    placeholderBack: "Deutsche Übersetzung oder Bedeutung",
    inputLabelFront: "Vorderseite (Latein)",
    inputLabelBack: "Übersetzung (Deutsch)",
  },
  {
    id: "en-de",
    label: "Englisch → Deutsch",
    shortLabel: "EN → DE",
    hint: "Englisch → Deutsch",
    placeholderFront: "Englisches Wort oder Ausdruck",
    placeholderBack: "Deutsche Übersetzung",
    inputLabelFront: "Vorderseite (Englisch)",
    inputLabelBack: "Übersetzung (Deutsch)",
  },
  {
    id: "fr-de",
    label: "Französisch → Deutsch",
    shortLabel: "FR → DE",
    hint: "Französisch → Deutsch",
    placeholderFront: "Französisches Wort oder Ausdruck",
    placeholderBack: "Deutsche Übersetzung",
    inputLabelFront: "Vorderseite (Französisch)",
    inputLabelBack: "Übersetzung (Deutsch)",
  },
  {
    id: "es-de",
    label: "Spanisch → Deutsch",
    shortLabel: "ES → DE",
    hint: "Spanisch → Deutsch. front = spanisches Wort, Redewendung oder Satz wie im Lehrwerk; back = deutsche Übersetzung oder Bedeutung (inkl. Hinweis zu ser/estar, Subjuntivo, wenn sinnvoll).",
    placeholderFront: "Spanisches Wort oder Ausdruck",
    placeholderBack: "Deutsche Übersetzung",
    inputLabelFront: "Vorderseite (Spanisch)",
    inputLabelBack: "Übersetzung (Deutsch)",
  },
] as const;

export type LanguagePairId = (typeof LANGUAGE_PAIR_PRESETS)[number]["id"];

export type LanguagePairPreset = (typeof LANGUAGE_PAIR_PRESETS)[number];

export const DEFAULT_LANGUAGE_PAIR_ID: LanguagePairId = "latin-de";

export function languagePairById(id: string | undefined): LanguagePairPreset | undefined {
  if (!id) return undefined;
  return LANGUAGE_PAIR_PRESETS.find((p) => p.id === id);
}

export function languagePairShortLabel(id?: string): string | null {
  const p = languagePairById(id);
  return p?.shortLabel ?? null;
}

export const LIBRARY_LANG_EDITOR_KEY = "vokabeltrainer:v1:libraryLangEditor";
export const LIBRARY_LANG_FILTER_KEY = "vokabeltrainer:v1:libraryLangFilter";

const STORAGE_EDITOR = LIBRARY_LANG_EDITOR_KEY;
const STORAGE_FILTER = LIBRARY_LANG_FILTER_KEY;

export const LIBRARY_FILTER_ALL = "__all__";

export function getLibraryLangEditor(): string {
  try {
    const v = localStorage.getItem(STORAGE_EDITOR)?.trim();
    if (v && LANGUAGE_PAIR_PRESETS.some((p) => p.id === v)) return v;
    return DEFAULT_LANGUAGE_PAIR_ID;
  } catch {
    return DEFAULT_LANGUAGE_PAIR_ID;
  }
}

export function setLibraryLangEditor(id: string): void {
  if (!LANGUAGE_PAIR_PRESETS.some((p) => p.id === id)) return;
  try {
    localStorage.setItem(STORAGE_EDITOR, id);
    window.dispatchEvent(new Event("vokabeltrainer:libraryLang"));
  } catch {
    /* ignore */
  }
}

export function getLibraryLangFilter(): string {
  try {
    const v = localStorage.getItem(STORAGE_FILTER)?.trim();
    if (v === LIBRARY_FILTER_ALL) return LIBRARY_FILTER_ALL;
    if (v && LANGUAGE_PAIR_PRESETS.some((p) => p.id === v)) return v;
    return LIBRARY_FILTER_ALL;
  } catch {
    return LIBRARY_FILTER_ALL;
  }
}

export function setLibraryLangFilter(id: string): void {
  if (id !== LIBRARY_FILTER_ALL && !LANGUAGE_PAIR_PRESETS.some((p) => p.id === id)) return;
  try {
    localStorage.setItem(STORAGE_FILTER, id);
    window.dispatchEvent(new Event("vokabeltrainer:libraryLang"));
  } catch {
    /* ignore */
  }
}
