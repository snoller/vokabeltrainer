import { FormEvent, useState } from "react";
import { useProfile } from "@/context/ProfileContext";

export default function ProfileUnlockGate() {
  const { activeProfileLockedOut, activeProfile, unlockActiveWithPassword } = useProfile();
  const [pwd, setPwd] = useState("");
  const [err, setErr] = useState(false);
  const [busy, setBusy] = useState(false);

  if (!activeProfileLockedOut) return null;

  const label = activeProfile?.label ?? "Profil";

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErr(false);
    setBusy(true);
    const ok = await unlockActiveWithPassword(pwd);
    setBusy(false);
    if (!ok) {
      setErr(true);
      return;
    }
    setPwd("");
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="profile-unlock-title"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 10000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1.5rem",
        background: "rgba(8, 10, 14, 0.88)",
        backdropFilter: "blur(8px)",
      }}
    >
      <form
        onSubmit={onSubmit}
        style={{
          width: "100%",
          maxWidth: 400,
          padding: "1.75rem",
          borderRadius: "var(--radius)",
          background: "var(--bg-card)",
          border: "1px solid rgba(232, 234, 239, 0.12)",
          boxShadow: "0 28px 64px rgba(0,0,0,0.45)",
          display: "grid",
          gap: "1rem",
        }}
      >
        <h2 id="profile-unlock-title" style={{ margin: 0, fontSize: "1.25rem" }}>
          Profil gesperrt
        </h2>
        <p style={{ margin: 0, color: "var(--ink-muted)", fontSize: "0.95rem", lineHeight: 1.5 }}>
          <strong>{label}</strong> ist passwortgeschützt. Für diese Browsersitzung brauchst du das Passwort einmal – ein neuer Tab oder ein
          anderen Browser fragt erneut.
        </p>
        <label style={{ display: "grid", gap: "0.35rem" }}>
          <span style={{ fontSize: "0.88rem", color: "var(--ink-muted)" }}>Passwort</span>
          <input
            type="password"
            value={pwd}
            onChange={(e) => {
              setPwd(e.target.value);
              setErr(false);
            }}
            autoComplete="current-password"
            autoFocus
            disabled={busy}
            style={{
              padding: "0.7rem 0.85rem",
              borderRadius: 10,
              border: err ? "1px solid rgba(224,122,122,0.55)" : "1px solid rgba(232, 234, 239, 0.12)",
              background: "var(--bg-deep)",
              color: "var(--ink)",
              fontFamily: "var(--font-ui)",
            }}
          />
        </label>
        {err && (
          <p style={{ margin: 0, color: "var(--danger)", fontSize: "0.9rem", fontWeight: 600 }}>
            Passwort falsch – bitte erneut versuchen.
          </p>
        )}
        <button
          type="submit"
          disabled={busy || !pwd}
          style={{
            padding: "0.65rem 1rem",
            borderRadius: 999,
            border: "none",
            background: pwd && !busy ? "var(--accent)" : "var(--bg-raised)",
            color: pwd && !busy ? "#12151c" : "var(--ink-muted)",
            fontWeight: 700,
            cursor: pwd && !busy ? "pointer" : "not-allowed",
          }}
        >
          {busy ? "…" : "Entsperren"}
        </button>
        <p style={{ margin: 0, fontSize: "0.82rem", color: "var(--ink-muted)", lineHeight: 1.45 }}>
          Nur ein Schutz gegen neugierige Blicks auf diesem Gerät. Daten sind lokal gespeichert – wer den Speicher oder die Entwicklertools kennt,
          kann trotzdem ran. Bei vergessenem Passwort gibt es keine Wiederherstellung; du müsstest die App-Daten des Browsers löschen.
        </p>
      </form>
    </div>
  );
}
