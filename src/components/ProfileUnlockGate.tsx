import { type ChangeEvent, type FormEvent, useState } from "react";
import { useProfile } from "@/context/ProfileContext";
import { profileHasRecoveryBackup, profileIsLocked } from "@/lib/profile";

export default function ProfileUnlockGate() {
  const {
    activeProfileLockedOut,
    activeProfile,
    activeProfileId,
    profiles,
    unlockActiveWithPassword,
    recoverActiveWithRecoveryCode,
    switchProfile,
    createProfile,
  } = useProfile();
  const [pwd, setPwd] = useState("");
  const [recoverCode, setRecoverCode] = useState("");
  const [newProfileLabel, setNewProfileLabel] = useState("");
  const [mode, setMode] = useState<"password" | "recovery">("password");
  const [err, setErr] = useState(false);
  const [busy, setBusy] = useState(false);

  if (!activeProfileLockedOut || !activeProfile) return null;

  const label = activeProfile.label ?? "Profil";
  const showRecoveryToggle = profileHasRecoveryBackup(activeProfile);

  const otherUnlockedProfiles = profiles.filter(
    (p) => p.id !== activeProfileId && !profileIsLocked(p)
  );

  const canSubmitPwd = mode === "password" && !!pwd.trim();
  const canSubmitRecovery = mode === "recovery" && !!recoverCode.trim();

  const onSubmitPwd = async (e: FormEvent) => {
    e.preventDefault();
    if (mode !== "password") return;
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

  const onSubmitRecover = async (e: FormEvent) => {
    e.preventDefault();
    if (mode !== "recovery") return;
    setErr(false);
    setBusy(true);
    const ok = await recoverActiveWithRecoveryCode(recoverCode);
    setBusy(false);
    if (!ok) {
      setErr(true);
      return;
    }
    setRecoverCode("");
  };

  const onSwitchOther = (e: ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    if (id) switchProfile(id);
    e.target.value = "";
  };

  const onCreateNewProfile = () => {
    if (busy) return;
    setErr(false);
    const name = newProfileLabel.trim();
    createProfile(name || `Neu ${profiles.length + 1}`);
    setNewProfileLabel("");
    setPwd("");
    setRecoverCode("");
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
        onSubmit={mode === "recovery" ? onSubmitRecover : onSubmitPwd}
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
          anderer Browser fragt erneut.
        </p>

        {showRecoveryToggle && (
          <div role="tablist" aria-label="Entsperrmodus" style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            <button
              type="button"
              role="tab"
              aria-selected={mode === "password"}
              onClick={() => {
                setMode("password");
                setErr(false);
              }}
              disabled={busy}
              style={{
                flex: "1 1 auto",
                minWidth: 120,
                padding: "0.5rem 0.75rem",
                borderRadius: 999,
                border: mode === "password" ? "1px solid rgba(201, 162, 39, 0.55)" : "1px solid rgba(232,234,239,0.14)",
                background: mode === "password" ? "rgba(201,162,39,0.18)" : "var(--bg-raised)",
                color: mode === "password" ? "var(--accent)" : "var(--ink-muted)",
                fontWeight: 600,
                cursor: busy ? "not-allowed" : "pointer",
                fontFamily: "var(--font-ui)",
              }}
            >
              Passwort
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === "recovery"}
              onClick={() => {
                setMode("recovery");
                setErr(false);
              }}
              disabled={busy}
              style={{
                flex: "1 1 auto",
                minWidth: 120,
                padding: "0.5rem 0.75rem",
                borderRadius: 999,
                border: mode === "recovery" ? "1px solid rgba(201, 162, 39, 0.55)" : "1px solid rgba(232,234,239,0.14)",
                background: mode === "recovery" ? "rgba(201,162,39,0.18)" : "var(--bg-raised)",
                color: mode === "recovery" ? "var(--accent)" : "var(--ink-muted)",
                fontWeight: 600,
                cursor: busy ? "not-allowed" : "pointer",
                fontFamily: "var(--font-ui)",
              }}
            >
              Backup-Code
            </button>
          </div>
        )}

        {mode === "password" ? (
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
        ) : (
          <>
            <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--ink-muted)", lineHeight: 1.45 }}>
              Der Code beim Aktivieren des Schutzes. Bei Treffer wird der Passwortschutz&nbsp;
              <strong>entfernt</strong>; deine Karten bleiben erhalten — setze dann unter&nbsp;Profil ein neues Passwort.
            </p>
            <label style={{ display: "grid", gap: "0.35rem" }}>
              <span style={{ fontSize: "0.88rem", color: "var(--ink-muted)" }}>Wiederherstellungs-/Backup-Code</span>
              <input
                type="text"
                value={recoverCode}
                onChange={(e) => {
                  setRecoverCode(e.target.value);
                  setErr(false);
                }}
                spellCheck={false}
                autoCapitalize="off"
                autoComplete="off"
                autoFocus={mode === "recovery"}
                disabled={busy}
                placeholder="z. B. a1b2-c3d4-… oder ohne Minuszeichen"
                style={{
                  padding: "0.7rem 0.85rem",
                  borderRadius: 10,
                  border: err ? "1px solid rgba(224,122,122,0.55)" : "1px solid rgba(232, 234, 239, 0.12)",
                  background: "var(--bg-deep)",
                  color: "var(--ink)",
                  fontFamily: "ui-monospace, monospace",
                  fontSize: "0.95rem",
                }}
              />
            </label>
          </>
        )}
        {err && (
          <p style={{ margin: 0, color: "var(--danger)", fontSize: "0.9rem", fontWeight: 600 }}>
            {mode === "password"
              ? "Passwort falsch – bitte erneut versuchen."
              : "Backup-Code passt nicht. Prüfen, ob Groß-/Kleinschreibung und alle Zeichen korrekt sind."}
          </p>
        )}
        <button
          type="submit"
          disabled={busy || (mode === "password" ? !canSubmitPwd : !canSubmitRecovery)}
          style={{
            padding: "0.65rem 1rem",
            borderRadius: 999,
            border: "none",
            background:
              busy || (mode === "password" ? !canSubmitPwd : !canSubmitRecovery)
                ? "var(--bg-raised)"
                : "var(--accent)",
            color:
              busy || (mode === "password" ? !canSubmitPwd : !canSubmitRecovery)
                ? "var(--ink-muted)"
                : "#12151c",
            fontWeight: 700,
            cursor:
              busy || (mode === "password" ? !canSubmitPwd : !canSubmitRecovery)
                ? "not-allowed"
                : "pointer",
          }}
        >
          {busy ? "…" : mode === "password" ? "Entsperren" : "Schutz mit Backup-Code aufheben"}
        </button>

        <div style={{ paddingTop: "0.35rem", borderTop: "1px solid rgba(232,234,239,0.08)" }}>
          <p style={{ margin: "0 0 0.5rem", fontSize: "0.88rem", color: "var(--ink-muted)", lineHeight: 1.45, fontWeight: 600 }}>
            Neues Profil ohne Passwort
          </p>
          <p style={{ margin: "0 0 0.75rem", fontSize: "0.82rem", color: "var(--ink-muted)", lineHeight: 1.45 }}>
            Wenn du das Passwort hier nicht eingeben willst oder dich unsicher bist: leeres weiteres&nbsp;Profil, das 
            geschützte <strong>{label}</strong> bleibt lokal bestehen&nbsp;– du kannst später in der Kopfzeile wieder wechseln.
          </p>
          <label style={{ display: "grid", gap: "0.35rem", marginBottom: "0.6rem" }}>
            <span style={{ fontSize: "0.88rem", color: "var(--ink-muted)" }}>Profilname (optional)</span>
            <input
              type="text"
              value={newProfileLabel}
              onChange={(e) => setNewProfileLabel(e.target.value)}
              disabled={busy}
              placeholder={`z.\u202fB. Schuljahr`}
              autoComplete="off"
              style={{
                padding: "0.55rem 0.65rem",
                borderRadius: 10,
                border: "1px solid rgba(232, 234, 239, 0.12)",
                background: "var(--bg-deep)",
                color: "var(--ink)",
                fontFamily: "var(--font-ui)",
              }}
            />
          </label>
          <button
            type="button"
            disabled={busy}
            onClick={onCreateNewProfile}
            style={{
              width: "100%",
              padding: "0.6rem 1rem",
              borderRadius: 999,
              border: "1px solid rgba(232, 234, 239, 0.2)",
              background: busy ? "var(--bg-deep)" : "var(--bg-raised)",
              color: "var(--ink)",
              fontWeight: 700,
              cursor: busy ? "not-allowed" : "pointer",
              fontFamily: "var(--font-ui)",
            }}
          >
            Neues Profil anlegen und wechseln
          </button>
        </div>

        {!showRecoveryToggle && (
          <p style={{ margin: 0, fontSize: "0.82rem", color: "var(--ink-muted)", lineHeight: 1.45 }}>
            Ohne beim Einrichten erzeugten <strong>Backup-Code</strong> gibt es keine technische Zurücksetzung des Passwortes (nur
            lokal, kein Server). Passwort bei Verlust mitnehmen oder in einem Passwortmanager speichern.
          </p>
        )}

        {otherUnlockedProfiles.length > 0 && (
          <div style={{ paddingTop: "0.35rem", borderTop: "1px solid rgba(232,234,239,0.08)" }}>
            <label style={{ display: "grid", gap: "0.35rem", fontSize: "0.88rem", color: "var(--ink-muted)" }}>
              Anderes Profil ohne Passwort nutzen (dieses geschützte Profil bleibt bestehen).
              <select
                defaultValue=""
                onChange={onSwitchOther}
                aria-label="Anderes offenes Profil wählen"
                style={{
                  padding: "0.55rem 0.65rem",
                  borderRadius: 10,
                  border: "1px solid rgba(232, 234, 239, 0.12)",
                  background: "var(--bg-deep)",
                  color: "var(--ink)",
                  fontFamily: "var(--font-ui)",
                  fontSize: "0.92rem",
                }}
              >
                <option value="">Profil auswählen …</option>
                {otherUnlockedProfiles.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        )}

        <p style={{ margin: 0, fontSize: "0.82rem", color: "var(--ink-muted)", lineHeight: 1.45 }}>
          Nur gegen neugierige Blicke auf diesem Gerät gedacht — wer den Speicher des Browsers bearbeitet, kann Daten umsichtig anders erreichen.&nbsp;
          Notfall: lokale Daten der Seite löschen zerstört <strong>alle</strong> Profile und Sammlungen in diesem Browser.
        </p>
      </form>
    </div>
  );
}
