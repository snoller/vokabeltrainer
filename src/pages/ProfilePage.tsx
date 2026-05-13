import { FormEvent, useEffect, useState } from "react";
import { useProfile } from "@/context/ProfileContext";
import { profileIsLocked, setProfilePassword } from "@/lib/profile";
import { verifyProfilePassword } from "@/lib/profilePwdCrypto";

const MIN_PWD = 4;

export default function ProfilePage() {
  const {
    profiles,
    activeProfileId,
    activeProfile,
    createProfile,
    renameProfile,
    registerSessionUnlock,
  } = useProfile();
  const [editLabel, setEditLabel] = useState(activeProfile?.label ?? "");
  const [newName, setNewName] = useState("");

  const [pwdNew, setPwdNew] = useState("");
  const [pwdNew2, setPwdNew2] = useState("");
  const [pwdCurrent, setPwdCurrent] = useState("");
  const [pwdMsg, setPwdMsg] = useState("");
  const [pwdBusy, setPwdBusy] = useState(false);

  useEffect(() => {
    setEditLabel(activeProfile?.label ?? "");
  }, [activeProfileId, activeProfile?.label]);

  useEffect(() => {
    setPwdNew("");
    setPwdNew2("");
    setPwdCurrent("");
    setPwdMsg("");
  }, [activeProfileId]);

  const onRename = (e: FormEvent) => {
    e.preventDefault();
    if (!activeProfileId) return;
    const t = editLabel.trim() || "Ich";
    renameProfile(activeProfileId, t);
    setEditLabel(t);
  };

  const onCreate = (e: FormEvent) => {
    e.preventDefault();
    const t = newName.trim();
    if (!t) return;
    createProfile(t);
    setNewName("");
  };

  const onPwdSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!activeProfileId || !activeProfile) return;
    setPwdMsg("");
    setPwdBusy(true);

    try {
      if (!profileIsLocked(activeProfile)) {
        const a = pwdNew.trim();
        const b = pwdNew2.trim();
        if (a.length < MIN_PWD || b.length < MIN_PWD) {
          setPwdMsg(`Mindestens ${MIN_PWD} Zeichen.`);
          return;
        }
        if (a !== b) {
          setPwdMsg("Die Einträge stimmen nicht überein.");
          return;
        }
        await setProfilePassword(activeProfileId, a);
        registerSessionUnlock(activeProfileId);
        setPwdNew("");
        setPwdNew2("");
        setPwdMsg("Passwort gespeichert.");
        return;
      }

      const cur = pwdCurrent.trim();
      if (!cur) {
        setPwdMsg("Aktuelles Passwort eingeben.");
        return;
      }
      const okCur = await verifyProfilePassword(
        cur,
        activeProfile.pwdHashHex!,
        activeProfile.pwdSaltHex!
      );
      if (!okCur) {
        setPwdMsg("Aktuelles Passwort falsch.");
        return;
      }

      const next = pwdNew.trim();
      const next2 = pwdNew2.trim();
      if (!next && !next2) {
        await setProfilePassword(activeProfileId, "");
        registerSessionUnlock(activeProfileId);
        setPwdCurrent("");
        setPwdMsg("Passwortschutz entfernt.");
        return;
      }
      if (next.length < MIN_PWD || next2.length < MIN_PWD) {
        setPwdMsg(`Neues Passwort: mindestens ${MIN_PWD} Zeichen oder beide Felder leer zum Entfernen.`);
        return;
      }
      if (next !== next2) {
        setPwdMsg("Neue Einträge stimmen nicht überein.");
        return;
      }

      await setProfilePassword(activeProfileId, next);
      registerSessionUnlock(activeProfileId);
      setPwdNew("");
      setPwdNew2("");
      setPwdCurrent("");
      setPwdMsg("Passwort geändert.");
    } finally {
      setPwdBusy(false);
    }
  };

  const currentLabel = activeProfile?.label ?? "Profil";
  const locked = !!(activeProfile && profileIsLocked(activeProfile));

  const inputStyle = {
    padding: "0.65rem 0.85rem",
    borderRadius: 10,
    border: "1px solid rgba(232, 234, 239, 0.12)",
    background: "var(--bg-deep)",
    color: "var(--ink)",
    fontFamily: "var(--font-ui)",
  } as const;

  const cardBox = {
    marginTop: "1.5rem",
    padding: "1.25rem",
    background: "var(--bg-card)",
    borderRadius: "var(--radius)",
    border: "1px solid rgba(232, 234, 239, 0.08)",
    maxWidth: 420,
    display: "grid" as const,
    gap: "0.75rem",
  };

  return (
    <div>
      <h1 style={{ marginTop: 0 }}>Profil</h1>
      <p style={{ color: "var(--ink-muted)", maxWidth: "52ch", lineHeight: 1.5 }}>
        Name und eigene Kartensammlung nur in diesem Browser – kein Server. Optional kann ein Profil mit einem Passwort geschützt werden
        (einmal pro neuem Tab entsperren).
      </p>

      <form onSubmit={onRename} style={{ ...cardBox, marginTop: "1.25rem" }}>
        <div style={{ fontWeight: 600 }}>Aktives Profil ({currentLabel})</div>
        <label style={{ display: "grid", gap: "0.35rem" }}>
          <span style={{ fontSize: "0.88rem", color: "var(--ink-muted)" }}>Anzeigename</span>
          <input
            value={editLabel}
            onChange={(e) => setEditLabel(e.target.value)}
            placeholder="Name"
            style={inputStyle}
          />
        </label>
        <button
          type="submit"
          style={{
            justifySelf: "start",
            padding: "0.6rem 1.2rem",
            borderRadius: 999,
            border: "none",
            background: "var(--accent)",
            color: "#12151c",
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          Name speichern
        </button>
      </form>

      <form onSubmit={onPwdSubmit} style={cardBox}>
        <div style={{ fontWeight: 600 }}>{locked ? "Passwortschutz ändern oder entfernen" : "Passwortschutz setzen"}</div>
        {!locked ? (
          <>
            <p style={{ margin: 0, fontSize: "0.9rem", color: "var(--ink-muted)", lineHeight: 1.5 }}>
              Nach dem Speichern gilt der Schutz beim nächsten Besuch oder in einem neuen Tab – für diesen Tab entsperren wir direkt.
            </p>
            <label style={{ display: "grid", gap: "0.35rem" }}>
              <span style={{ fontSize: "0.88rem", color: "var(--ink-muted)" }}>Passwort (min. {MIN_PWD} Zeichen)</span>
              <input type="password" value={pwdNew} onChange={(e) => setPwdNew(e.target.value)} style={inputStyle} autoComplete="new-password" />
            </label>
            <label style={{ display: "grid", gap: "0.35rem" }}>
              <span style={{ fontSize: "0.88rem", color: "var(--ink-muted)" }}>Wiederholen</span>
              <input type="password" value={pwdNew2} onChange={(e) => setPwdNew2(e.target.value)} style={inputStyle} autoComplete="new-password" />
            </label>
          </>
        ) : (
          <>
            <p style={{ margin: 0, fontSize: "0.9rem", color: "var(--ink-muted)", lineHeight: 1.5 }}>
              Schutz aktiv. Zum <strong>ändern</strong>: aktuelles Passwort und neues Passwort. Zum{" "}
              <strong>aufheben</strong>: nur aktuelles Passwort, neue Felder leer lassen und speichern.
            </p>
            <label style={{ display: "grid", gap: "0.35rem" }}>
              <span style={{ fontSize: "0.88rem", color: "var(--ink-muted)" }}>Aktuelles Passwort</span>
              <input
                type="password"
                value={pwdCurrent}
                onChange={(e) => setPwdCurrent(e.target.value)}
                style={inputStyle}
                autoComplete="current-password"
              />
            </label>
            <label style={{ display: "grid", gap: "0.35rem" }}>
              <span style={{ fontSize: "0.88rem", color: "var(--ink-muted)" }}>Neues Passwort (optional)</span>
              <input type="password" value={pwdNew} onChange={(e) => setPwdNew(e.target.value)} style={inputStyle} autoComplete="new-password" />
            </label>
            <label style={{ display: "grid", gap: "0.35rem" }}>
              <span style={{ fontSize: "0.88rem", color: "var(--ink-muted)" }}>Neues Passwort wiederholen</span>
              <input type="password" value={pwdNew2} onChange={(e) => setPwdNew2(e.target.value)} style={inputStyle} autoComplete="new-password" />
            </label>
          </>
        )}
        {pwdMsg && (
          <p
            style={{
              margin: 0,
              fontSize: "0.9rem",
              color:
                pwdMsg.includes("falsch") ||
                pwdMsg.includes("berein") ||
                pwdMsg.includes("Mindestens") ||
                pwdMsg.includes("eingeben")
                  ? "var(--danger)"
                  : "var(--success)",
              fontWeight: 600,
            }}
          >
            {pwdMsg}
          </p>
        )}
        <button
          type="submit"
          disabled={pwdBusy}
          style={{
            justifySelf: "start",
            padding: "0.6rem 1.2rem",
            borderRadius: 999,
            border: "none",
            background: pwdBusy ? "var(--bg-raised)" : "var(--bg-raised)",
            color: pwdBusy ? "var(--ink-muted)" : "var(--ink)",
            fontWeight: 700,
            cursor: pwdBusy ? "wait" : "pointer",
            borderWidth: 1,
            borderStyle: "solid",
            borderColor: "rgba(232, 234, 239, 0.2)",
          }}
        >
          {pwdBusy ? "…" : locked ? "Übernehmen" : "Passwort setzen"}
        </button>
      </form>

      <div
        style={{
          marginTop: "1.75rem",
          padding: "1.25rem",
          background: "var(--bg-card)",
          borderRadius: "var(--radius)",
          border: "1px solid rgba(232, 234, 239, 0.08)",
          maxWidth: 480,
        }}
      >
        <div style={{ fontWeight: 600, marginBottom: "0.5rem" }}>Weiteres Profil</div>
        <p style={{ margin: "0 0 1rem", fontSize: "0.9rem", color: "var(--ink-muted)", lineHeight: 1.5 }}>
          Zwischen Profilen wechselst du oben in der Kopfzeile über das Dropdown <strong>Profil</strong>. Aktuell{" "}
          {profiles.length} Profil{profiles.length === 1 ? "" : "e"}.
        </p>

        <form onSubmit={onCreate} style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", alignItems: "center" }}>
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Weiteres Profil (Name)"
            style={{
              flex: "1 1 180px",
              padding: "0.55rem 0.85rem",
              borderRadius: 10,
              border: "1px solid rgba(232, 234, 239, 0.12)",
              background: "var(--bg-deep)",
              color: "var(--ink)",
              fontFamily: "var(--font-ui)",
            }}
          />
          <button
            type="submit"
            disabled={!newName.trim()}
            style={{
              padding: "0.55rem 1rem",
              borderRadius: 999,
              border: "none",
              background: newName.trim() ? "var(--bg-raised)" : "var(--bg-deep)",
              color: newName.trim() ? "var(--ink)" : "var(--ink-muted)",
              fontWeight: 600,
              cursor: newName.trim() ? "pointer" : "not-allowed",
              borderWidth: 1,
              borderStyle: "solid",
              borderColor: "rgba(232, 234, 239, 0.15)",
            }}
          >
            Neues Profil
          </button>
        </form>
      </div>
    </div>
  );
}
