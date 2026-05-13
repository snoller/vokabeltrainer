import { hashProfilePassword, verifyProfilePassword } from "@/lib/profilePwdCrypto";

const ACTIVE_KEY = "vokabeltrainer:v1:activeProfileId";
const PROFILES_KEY = "vokabeltrainer:v1:profiles";
/** Alte Installationen vor Profilen */
export const LEGACY_CARDS_KEY = "vokabeltrainer:v1:cards";

export type Profile = {
  id: string;
  label: string;
  createdAt: string;
  /** PBKDF2-SHA-256 (Hex), optional */
  pwdHashHex?: string;
  /** Zufallssalz (Hex), optional */
  pwdSaltHex?: string;
  /** Separater Backup-Code PBKDF2 (Hex), nur wenn beim Setzen angelegt */
  recoveryHashHex?: string;
  recoverySaltHex?: string;
};

export function cardsStorageKey(profileId: string): string {
  return `vokabeltrainer:v1:cards:${profileId}`;
}

/** Optionaler Passwortschutz (PBKDF2 im Browser gespeichert). */
export function profileIsLocked(p: Profile): boolean {
  const h = p.pwdHashHex;
  const s = p.pwdSaltHex;
  return typeof h === "string" && h.length >= 64 && typeof s === "string" && s.length >= 32;
}

/** Einrichtung „Passwort vergessen“ ohne Passwort möglich, wenn beim Aktivieren des Schutzes angelegt. */
export function profileHasRecoveryBackup(p: Profile): boolean {
  const h = p.recoveryHashHex;
  const s = p.recoverySaltHex;
  return typeof h === "string" && h.length >= 64 && typeof s === "string" && s.length >= 32;
}

/** Zufälliger Backup-Code (nur ASCII, später mit/ohne Bindestriche eingebbar). */
export function generateReadableRecoveryCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(10));
  return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Anzeige z. B. a1b2-c3d4-e5f6-… für leichtere Abschrift. */
export function formatRecoveryCodeForDisplay(hex: string): string {
  const clean = hex.replace(/[^a-fA-F0-9]/g, "").toLowerCase();
  const parts = clean.match(/.{1,4}/g);
  return parts ? parts.join("-") : hex;
}

function normalizeRecoveryCodeInput(raw: string): string {
  return raw.replace(/[^a-fA-F0-9]/g, "").toLowerCase();
}

function safeParseProfiles(raw: string | null): Profile[] {
  if (!raw) return [];
  try {
    const p = JSON.parse(raw) as Profile[];
    return Array.isArray(p) ? p : [];
  } catch {
    return [];
  }
}

export function loadProfiles(): Profile[] {
  try {
    return safeParseProfiles(localStorage.getItem(PROFILES_KEY));
  } catch {
    return [];
  }
}

/** Stabiler Snapshot-String für `useSyncExternalStore` (Bootstrap vor dem ersten Lesen). */
export function getProfilesStorageSnapshot(): string {
  ensureBootstrapProfile();
  try {
    return localStorage.getItem(PROFILES_KEY) ?? "[]";
  } catch {
    return "[]";
  }
}

export function parseProfilesSnapshot(raw: string): Profile[] {
  try {
    return safeParseProfiles(raw);
  } catch {
    return [];
  }
}

function saveProfilesList(list: Profile[]): void {
  localStorage.setItem(PROFILES_KEY, JSON.stringify(list));
}

/** Einmalig: alte globale Karten unter aktivem Default-Profil ablegen */
export function migrateLegacyCardsIfNeeded(): void {
  try {
    const legacy = localStorage.getItem(LEGACY_CARDS_KEY);
    if (legacy === null) return;

    let profiles = loadProfiles();
    let activeId = localStorage.getItem(ACTIVE_KEY);

    if (profiles.length === 0) {
      const id = "default";
      profiles = [{ id, label: "Ich", createdAt: new Date().toISOString() }];
      saveProfilesList(profiles);
      activeId = id;
      localStorage.setItem(ACTIVE_KEY, id);
    }

    if (!activeId) {
      activeId = profiles[0]!.id;
      localStorage.setItem(ACTIVE_KEY, activeId);
    }

    const targetKey = cardsStorageKey(activeId);
    if (!localStorage.getItem(targetKey)) {
      localStorage.setItem(targetKey, legacy);
    }
    localStorage.removeItem(LEGACY_CARDS_KEY);
  } catch {
    /* ignore */
  }
}

/** Erstes Öffnen: ein Profil anlegen */
export function ensureBootstrapProfile(): void {
  migrateLegacyCardsIfNeeded();
  let profiles = loadProfiles();
  let activeId = localStorage.getItem(ACTIVE_KEY);

  if (profiles.length === 0) {
    const id = crypto.randomUUID?.() ?? `p-${Date.now()}`;
    const p: Profile = { id, label: "Ich", createdAt: new Date().toISOString() };
    profiles = [p];
    saveProfilesList(profiles);
    localStorage.setItem(ACTIVE_KEY, id);
    if (!localStorage.getItem(cardsStorageKey(id))) {
      localStorage.setItem(cardsStorageKey(id), "[]");
    }
    return;
  }

  if (!activeId || !profiles.some((x) => x.id === activeId)) {
    activeId = profiles[0]!.id;
    localStorage.setItem(ACTIVE_KEY, activeId);
  }
}

export function getActiveProfileId(): string {
  ensureBootstrapProfile();
  return localStorage.getItem(ACTIVE_KEY) ?? loadProfiles()[0]!.id;
}

export function setActiveProfileId(id: string): void {
  localStorage.setItem(ACTIVE_KEY, id);
  window.dispatchEvent(new Event("vokabeltrainer:profile"));
  window.dispatchEvent(new Event("vokabeltrainer:update"));
}

export function createProfile(label: string): string {
  const trimmed = label.trim() || "Neu";
  migrateLegacyCardsIfNeeded();
  const profiles = loadProfiles();
  const id = crypto.randomUUID?.() ?? `p-${Date.now()}`;
  profiles.push({
    id,
    label: trimmed,
    createdAt: new Date().toISOString(),
  });
  saveProfilesList(profiles);
  localStorage.setItem(cardsStorageKey(id), "[]");
  setActiveProfileId(id);
  return id;
}

export function renameProfile(id: string, label: string): void {
  const trimmed = label.trim();
  if (!trimmed) return;
  const profiles = loadProfiles();
  const i = profiles.findIndex((p) => p.id === id);
  if (i === -1) return;
  profiles[i] = { ...profiles[i]!, label: trimmed };
  saveProfilesList(profiles);
  window.dispatchEvent(new Event("vokabeltrainer:profile"));
}

/** Leeres `plainPassword` entfernt den Schutz inklusive Backup-Codes. */
export async function setProfilePassword(
  id: string,
  plainPassword: string,
  options?: {
    /** Beim ersten Setzen: einmal angezeigter Code (Klartext) wird nur gehasht gespeichert. */
    recoveryPlainShownOnce?: string | null;
  }
): Promise<void> {
  const profiles = loadProfiles();
  const i = profiles.findIndex((p) => p.id === id);
  if (i === -1) return;
  const cur = profiles[i]!;
  const raw = plainPassword.trim();
  const base = (): Pick<Profile, "id" | "label" | "createdAt"> => ({
    id: cur.id,
    label: cur.label,
    createdAt: cur.createdAt,
  });

  if (!raw) {
    profiles[i] = { ...base() };
  } else {
    const { hashHex, saltHex } = await hashProfilePassword(raw);
    let recoveryHashHex = cur.recoveryHashHex;
    let recoverySaltHex = cur.recoverySaltHex;

    const newRecPlain = options?.recoveryPlainShownOnce?.trim();
    if (newRecPlain) {
      const hr = await hashProfilePassword(normalizeRecoveryCodeInput(newRecPlain));
      recoveryHashHex = hr.hashHex;
      recoverySaltHex = hr.saltHex;
    } else if (!(recoveryHashHex && recoverySaltHex)) {
      recoveryHashHex = undefined;
      recoverySaltHex = undefined;
    }

    profiles[i] = {
      ...base(),
      pwdHashHex: hashHex,
      pwdSaltHex: saltHex,
      ...(recoveryHashHex && recoverySaltHex ? { recoveryHashHex, recoverySaltHex } : {}),
    };
  }
  saveProfilesList(profiles);
  window.dispatchEvent(new Event("vokabeltrainer:profile"));
}

/**
 * Vergisst sich Passwort aber hat beim Einrichten den Backup-Code notiert → Schutz wird entfernt (Karten bleiben erhalten).
 * Danach sollte wieder ein Passwort gesetzt werden.
 */
export async function unlockProfileLoginWithRecoveryCode(id: string, recoveryPlain: string): Promise<boolean> {
  const profiles = loadProfiles();
  const i = profiles.findIndex((p) => p.id === id);
  if (i === -1) return false;
  const cur = profiles[i]!;
  if (!profileIsLocked(cur)) return false;
  if (!profileHasRecoveryBackup(cur)) return false;

  const normalized = normalizeRecoveryCodeInput(recoveryPlain.trim());
  if (normalized.length < 8) return false;

  const ok = await verifyProfilePassword(normalized, cur.recoveryHashHex!, cur.recoverySaltHex!);
  if (!ok) return false;

  profiles[i] = { id: cur.id, label: cur.label, createdAt: cur.createdAt };
  saveProfilesList(profiles);
  window.dispatchEvent(new Event("vokabeltrainer:profile"));
  return true;
}

export function getProfileLabel(id: string): string | null {
  const p = loadProfiles().find((x) => x.id === id);
  return p?.label ?? null;
}
