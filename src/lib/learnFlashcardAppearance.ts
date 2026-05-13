export type LearnFlashcardAppearance = "paper" | "dark";

export const LEARN_FLASHCARD_STORAGE_KEY = "vokabeltrainer:v1:learnFlashcardAppearance";

export function getLearnFlashcardAppearance(): LearnFlashcardAppearance {
  try {
    const v = localStorage.getItem(LEARN_FLASHCARD_STORAGE_KEY);
    if (v === "dark") return "dark";
    return "paper";
  } catch {
    return "paper";
  }
}

export function setLearnFlashcardAppearance(mode: LearnFlashcardAppearance): void {
  try {
    localStorage.setItem(LEARN_FLASHCARD_STORAGE_KEY, mode);
    window.dispatchEvent(new Event("vokabeltrainer:learnCardLook"));
  } catch {
    /* ignore */
  }
}
