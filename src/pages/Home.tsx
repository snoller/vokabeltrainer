import { Link } from "react-router-dom";
import { useMemo, useSyncExternalStore } from "react";
import { getCardsStorageSnapshot, parseCardsSnapshot } from "@/lib/storage";
import { isDue } from "@/lib/srs";

function subscribe(cb: () => void) {
  window.addEventListener("storage", cb);
  window.addEventListener("vokabeltrainer:update", cb);
  window.addEventListener("vokabeltrainer:profile", cb);
  return () => {
    window.removeEventListener("storage", cb);
    window.removeEventListener("vokabeltrainer:update", cb);
    window.removeEventListener("vokabeltrainer:profile", cb);
  };
}

export default function Home() {
  const raw = useSyncExternalStore(subscribe, getCardsStorageSnapshot, () => "[]");
  const cards = useMemo(() => parseCardsSnapshot(raw), [raw]);
  const now = Date.now();

  const stats = useMemo(() => {
    const due = cards.filter((c) => isDue(c, now)).length;
    return { total: cards.length, due };
  }, [cards, now]);

  return (
    <div className="stagger">
      <h1 className="animate-in" style={{ marginTop: 0, fontSize: "clamp(1.75rem, 4vw, 2.35rem)" }}>
        Willkommen
      </h1>
      <p style={{ color: "var(--ink-muted)", maxWidth: "52ch", marginBottom: "2rem" }}>
        Karten mit <strong>Spaced Repetition (SM-2)</strong>: schwierige Vokabeln kommen schneller wieder,
        sichere erst später – für <strong>Latein</strong>, Englisch und andere Sprachen gleichermaßen.
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
          gap: "1rem",
          marginBottom: "2rem",
        }}
      >
        <div
          style={{
            padding: "1.25rem",
            background: "var(--bg-card)",
            borderRadius: "var(--radius)",
            border: "1px solid rgba(232, 234, 239, 0.06)",
          }}
        >
          <div style={{ fontSize: "2rem", fontFamily: "var(--font-display)", fontWeight: 700 }}>{stats.total}</div>
          <div style={{ color: "var(--ink-muted)", fontSize: "0.9rem" }}>Karten gesamt</div>
        </div>
        <div
          style={{
            padding: "1.25rem",
            background: "var(--bg-card)",
            borderRadius: "var(--radius)",
            border: "1px solid rgba(201, 162, 39, 0.25)",
          }}
        >
          <div style={{ fontSize: "2rem", fontFamily: "var(--font-display)", fontWeight: 700, color: "var(--accent)" }}>
            {stats.due}
          </div>
          <div style={{ color: "var(--ink-muted)", fontSize: "0.9rem" }}>fällig jetzt</div>
        </div>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem" }}>
        <Link
          to="/lernen"
          style={{
            display: "inline-flex",
            alignItems: "center",
            padding: "0.75rem 1.35rem",
            background: "var(--accent)",
            color: "#12151c",
            borderRadius: 999,
            fontWeight: 700,
            textDecoration: "none",
          }}
        >
          Lernen starten
        </Link>
        <Link
          to="/bibliothek"
          style={{
            display: "inline-flex",
            alignItems: "center",
            padding: "0.75rem 1.35rem",
            background: "var(--bg-raised)",
            color: "var(--ink)",
            borderRadius: 999,
            border: "1px solid rgba(232, 234, 239, 0.12)",
            fontWeight: 600,
            textDecoration: "none",
          }}
        >
          Karten verwalten
        </Link>
        <Link
          to="/scan"
          style={{
            display: "inline-flex",
            alignItems: "center",
            padding: "0.75rem 1.35rem",
            background: "transparent",
            color: "var(--accent)",
            borderRadius: 999,
            border: "1px solid var(--accent-dim)",
            fontWeight: 600,
            textDecoration: "none",
          }}
        >
          Aus Schulbuch-Foto
        </Link>
      </div>
    </div>
  );
}
