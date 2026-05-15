import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import type { Profile } from "@/lib/profile";
import {
  createProfile as createProfileApi,
  getActiveProfileId,
  profileIsLocked,
  renameProfile as renameProfileApi,
  getProfilesStorageSnapshot,
  parseProfilesSnapshot,
  setActiveProfileId,
  unlockProfileLoginWithRecoveryCode,
} from "@/lib/profile";
import { verifyProfilePassword } from "@/lib/profilePwdCrypto";
import { addUnlockedProfile, getUnlockedProfileIds } from "@/lib/sessionUnlock";
import { ensureStarterDeckIfEmpty } from "@/lib/starterVocab";

function subscribeProfile(cb: () => void) {
  window.addEventListener("vokabeltrainer:profile", cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener("vokabeltrainer:profile", cb);
    window.removeEventListener("storage", cb);
  };
}

function snapshotActiveId(): string {
  return getActiveProfileId();
}

type Ctx = {
  profiles: Profile[];
  activeProfileId: string;
  activeProfile: Profile | undefined;
  /** Aktives Profil hat Passwort und ist in dieser Sitzung noch nicht entsperrt */
  activeProfileLockedOut: boolean;
  unlockActiveWithPassword: (password: string) => Promise<boolean>;
  /** Backup-Code (beim Aktivieren notiert): Schutz entfernen ohne Login-Passwort. */
  recoverActiveWithRecoveryCode: (recoveryPlain: string) => Promise<boolean>;
  /** Nach erfolgreicher Passwort-Änderung die Sitzung als entsperrt markieren */
  registerSessionUnlock: (profileId: string) => void;
  switchProfile: (id: string) => void;
  createProfile: (label: string) => void;
  renameProfile: (id: string, label: string) => void;
};

const ProfileContext = createContext<Ctx | null>(null);

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const [unlockTick, setUnlockTick] = useState(0);

  const profilesRaw = useSyncExternalStore(
    subscribeProfile,
    getProfilesStorageSnapshot,
    getProfilesStorageSnapshot
  );
  const profiles = useMemo(() => parseProfilesSnapshot(profilesRaw), [profilesRaw]);
  const activeProfileId = useSyncExternalStore(subscribeProfile, snapshotActiveId, snapshotActiveId);

  const activeProfile = useMemo(
    () => profiles.find((p) => p.id === activeProfileId),
    [profiles, activeProfileId]
  );

  const sessionUnlockedIds = useMemo(() => new Set(getUnlockedProfileIds()), [unlockTick]);

  const registerSessionUnlock = useCallback((profileId: string) => {
    addUnlockedProfile(profileId);
    setUnlockTick((t) => t + 1);
  }, []);

  const activeProfileLockedOut = !!(
    activeProfile &&
    profileIsLocked(activeProfile) &&
    !sessionUnlockedIds.has(activeProfile.id)
  );

  useEffect(() => {
    if (activeProfileLockedOut) return;
    if (!activeProfileId) return;
    ensureStarterDeckIfEmpty(activeProfileId);
  }, [activeProfileId, activeProfileLockedOut]);

  const recoverActiveWithRecoveryCodeCb = useCallback(
    async (recoveryPlain: string) => {
      if (!activeProfile) return false;
      const ok = await unlockProfileLoginWithRecoveryCode(activeProfile.id, recoveryPlain);
      if (ok) registerSessionUnlock(activeProfile.id);
      return ok;
    },
    [activeProfile, registerSessionUnlock]
  );

  const unlockActiveWithPassword = useCallback(
    async (password: string) => {
      if (!activeProfile) return false;
      if (!profileIsLocked(activeProfile)) {
        registerSessionUnlock(activeProfile.id);
        return true;
      }
      const ok = await verifyProfilePassword(
        password,
        activeProfile.pwdHashHex!,
        activeProfile.pwdSaltHex!
      );
      if (ok) registerSessionUnlock(activeProfile.id);
      return ok;
    },
    [activeProfile, registerSessionUnlock]
  );

  const switchProfile = useCallback(
    (id: string) => {
      if (!profiles.some((p) => p.id === id)) return;
      setActiveProfileId(id);
    },
    [profiles]
  );

  const createProfile = useCallback((label: string) => {
    createProfileApi(label);
  }, []);

  const renameProfile = useCallback((id: string, label: string) => {
    renameProfileApi(id, label);
  }, []);

  const value = useMemo(
    () => ({
      profiles,
      activeProfileId,
      activeProfile,
      activeProfileLockedOut,
      unlockActiveWithPassword,
      recoverActiveWithRecoveryCode: recoverActiveWithRecoveryCodeCb,
      registerSessionUnlock,
      switchProfile,
      createProfile,
      renameProfile,
    }),
    [
      profiles,
      activeProfileId,
      activeProfile,
      activeProfileLockedOut,
      unlockActiveWithPassword,
      recoverActiveWithRecoveryCodeCb,
      registerSessionUnlock,
      switchProfile,
      createProfile,
      renameProfile,
    ]
  );

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}

export function useProfile(): Ctx {
  const c = useContext(ProfileContext);
  if (!c) throw new Error("useProfile nur innerhalb ProfileProvider");
  return c;
}
