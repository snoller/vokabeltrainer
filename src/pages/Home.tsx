import { Link } from "react-router-dom";
import { useMemo, useSyncExternalStore } from "react";
import type { LearnMotivationState } from "@/lib/learnMotivation";
import { getLearnMotivationSnapshot, subscribeLearnMotivation } from "@/lib/learnMotivation";
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
  const motivationRaw = useSyncExternalStore(
    subscribeLearnMotivation,
    getLearnMotivationSnapshot,
    () => JSON.stringify({ totalReviews: 0 } satisfies LearnMotivationState)
  );
  const motivation = useMemo((): LearnMotivationState => {
    try {
      const x = JSON.parse(motivationRaw) as LearnMotivationState;
      const total = typeof x.totalReviews === "number" && Number.isFinite(x.totalReviews) ? Math.max(0, Math.floor(x.totalReviews)) : 0;
      return { totalReviews: total, lastEmptiedQueue: x.lastEmptiedQueue };
    } catch {
      return { totalReviews: 0 };
    }
  }, [motivationRaw]);

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

      {(motivation.totalReviews > 0 || motivation.lastEmptiedQueue) && (
        <section
          style={{
            padding: "1rem 1.15rem",
            marginBottom: "1.75rem",
            borderRadius: "var(--radius)",
            border: "1px solid rgba(201, 162, 39, 0.2)",
            background: "rgba(201, 162, 39, 0.06)",
            maxWidth: "54ch",
          }}
        >
          <div style={{ fontWeight: 700, marginBottom: "0.5rem", color: "var(--ink)", fontSize: "0.95rem" }}>
            Dein Überblick
          </div>
          {motivation.totalReviews > 0 && (
            <p style={{ margin: "0 0 0.5rem", fontSize: "0.92rem", color: "var(--ink)", lineHeight: 1.5 }}>
              Insgesamt <strong>{motivation.totalReviews}</strong>{" "}
              {motivation.totalReviews === 1 ? "Bewertung" : "Bewertungen"} beim Lernen – unabhängig davon,
              wie oft du Pausen machst.
            </p>
          )}
          {motivation.lastEmptiedQueue ? (
            <p style={{ margin: 0, fontSize: "0.88rem", color: "var(--ink-muted)", lineHeight: 1.5 }}>
              <strong style={{ color: "var(--ink)" }}>Letzte Lerneinheit:</strong>{" "}
              {motivation.lastEmptiedQueue.reviewsInSession}{" "}
              {motivation.lastEmptiedQueue.reviewsInSession === 1 ? "Bewertung" : "Bewertungen"}, bis nichts mehr
              fällig war (zu Beginn dieser Runde waren{" "}
              <strong>{motivation.lastEmptiedQueue.queuedAtStart}</strong>{" "}
              {motivation.lastEmptiedQueue.queuedAtStart === 1 ? "Karte" : "Karten"} dran).
            </p>
          ) : motivation.totalReviews > 0 ? (
            <p style={{ margin: 0, fontSize: "0.88rem", color: "var(--ink-muted)", lineHeight: 1.5 }}>
              Sobald du einmal bis zum leeren »fällig«-Stapel durcharbeitest, erscheint hier eine kurze Zusammenfassung –
              ohne Tagesstress und ohne Serien-Streifen.
            </p>
          ) : null}
        </section>
      )}

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
