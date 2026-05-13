import { useProfile } from "@/context/ProfileContext";
import { profileIsLocked } from "@/lib/profile";

export default function ProfileHeaderSelect() {
  const { profiles, activeProfileId, switchProfile } = useProfile();

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", minWidth: 0 }}>
      <label htmlFor="header-profile-select" style={{ fontSize: "0.82rem", color: "var(--ink-muted)", flexShrink: 0 }}>
        Profil
      </label>
      <select
        id="header-profile-select"
        value={activeProfileId}
        aria-label="Profil wechseln"
        onChange={(e) => switchProfile(e.target.value)}
        style={{
          minWidth: "min(200px, 42vw)",
          maxWidth: "220px",
          padding: "0.45rem 0.65rem",
          borderRadius: 10,
          border: "1px solid rgba(232, 234, 239, 0.15)",
          background: "var(--bg-raised)",
          color: "var(--ink)",
          fontFamily: "var(--font-ui)",
          fontSize: "0.92rem",
          fontWeight: 600,
          cursor: "pointer",
        }}
      >
        {profiles.map((p) => {
          const locked = profileIsLocked(p);
          return (
            <option key={p.id} value={p.id}>
              {p.label}
              {locked ? " · geschützt" : ""}
            </option>
          );
        })}
      </select>
    </div>
  );
}
