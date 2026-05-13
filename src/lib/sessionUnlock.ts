const KEY = "vokabeltrainer:v1:unlockedProfiles";

export function getUnlockedProfileIds(): string[] {
  try {
    const raw = sessionStorage.getItem(KEY);
    const p = raw ? JSON.parse(raw) : [];
    return Array.isArray(p) ? p.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export function addUnlockedProfile(id: string): void {
  const s = new Set(getUnlockedProfileIds());
  s.add(id);
  sessionStorage.setItem(KEY, JSON.stringify([...s]));
}
