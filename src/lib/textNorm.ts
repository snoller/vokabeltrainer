/**
 * Normalisiert Lernerantworten für den Vergleich (Latein oft mit Makronen,
 * Bücher verwenden auch æ / œ).
 */
export function normalizeAnswerForCompare(s: string): string {
  let t = s
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
  t = t.replace(/æ/g, "ae").replace(/œ/g, "oe");
  return t.replace(/\s+/g, " ").trim();
}
