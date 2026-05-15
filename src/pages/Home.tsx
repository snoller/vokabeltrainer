import { Link } from "react-router-dom";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
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

function readStandalone(): boolean {
  if (typeof window === "undefined") return false;
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return (
    window.matchMedia("(display-mode: standalone)").matches || nav.standalone === true
  );
}

/** Chrome/Edge u. a. auf Android; iOS Safari feuert das nicht */
interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: string }>;
}

export default function Home() {
  const [standalone] = useState(readStandalone);
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as InstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

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

      {!standalone && (
        <section
          style={{
            marginTop: "2.5rem",
            padding: "1.15rem 1.2rem",
            maxWidth: "54ch",
            borderRadius: "var(--radius)",
            border: "1px solid rgba(232, 234, 239, 0.1)",
            background: "var(--bg-card)",
          }}
          aria-labelledby="home-pwa-heading"
        >
          <h2
            id="home-pwa-heading"
            style={{
              margin: "0 0 0.6rem",
              fontSize: "1.05rem",
              fontFamily: "var(--font-display)",
              fontWeight: 700,
              color: "var(--ink)",
            }}
          >
            Auf dem Handy wie eine App
          </h2>
          <p style={{ margin: "0 0 0.85rem", fontSize: "0.93rem", color: "var(--ink-muted)", lineHeight: 1.55 }}>
            Du kannst die Seite auf dem Startbildschirm ablegen – dann öffnet sie ohne Browser-Leiste wie eine eigene App.
          </p>
          {installPrompt && (
            <div style={{ marginBottom: "0.9rem" }}>
              <button
                type="button"
                onClick={() => {
                  void (async () => {
                    await installPrompt.prompt();
                    await installPrompt.userChoice;
                    setInstallPrompt(null);
                  })();
                }}
                style={{
                  padding: "0.65rem 1.1rem",
                  borderRadius: 999,
                  border: "1px solid rgba(201, 162, 39, 0.55)",
                  background: "rgba(201, 162, 39, 0.14)",
                  color: "var(--accent)",
                  fontWeight: 700,
                  fontSize: "0.9rem",
                  cursor: "pointer",
                  fontFamily: "var(--font-ui)",
                }}
              >
                App installieren / Startbildschirm
              </button>
              <span style={{ display: "block", marginTop: "0.4rem", fontSize: "0.78rem", color: "var(--ink-muted)" }}>
                Nur wenn der Browser eine Installation anbietet (üblich: Chrome auf Android).
              </span>
            </div>
          )}
          <ul
            style={{
              margin: 0,
              paddingLeft: "1.25rem",
              fontSize: "0.92rem",
              color: "var(--ink-muted)",
              lineHeight: 1.6,
            }}
          >
            <li style={{ marginBottom: "0.45rem" }}>
              <strong style={{ color: "var(--ink)" }}>iPhone / iPad (Safari):</strong> unten oder oben auf{" "}
              <strong>Teilen</strong> (Quadrat mit Pfeil), dann <strong>Zum Home-Bildschirm</strong> und{" "}
              <strong>Hinzufügen</strong>. Von Apple keine automatische Hilfe-Schaltfläche vorgesehen – so gehen alle Websites.
            </li>
            <li>
              <strong style={{ color: "var(--ink)" }}>Android (Chrome oder Edge):</strong> Menü über{" "}
              <strong>drei Punkte</strong>, dann etwa <strong>App installieren</strong> oder{" "}
              <strong>Zum Startbildschirm hinzufügen</strong>, je nach Gerät und Version – oder den Button weiter oben, falls er angezeigt wird.
            </li>
          </ul>
          <p style={{ margin: "0.75rem 0 0", fontSize: "0.82rem", color: "var(--ink-muted)", lineHeight: 1.45 }}>
            Die Adresse sollte per <strong style={{ color: "var(--ink)" }}>HTTPS</strong> erreichbar sein (öffentliche Seite). Lokal
            auf dem Rechner reicht <code style={{ fontSize: "0.9em" }}>localhost</code> zum Ausprobieren.
          </p>
        </section>
      )}

      {standalone && (
        <p
          style={{
            marginTop: "2rem",
            fontSize: "0.88rem",
            color: "var(--ink-muted)",
            maxWidth: "54ch",
          }}
        >
          Du nutzt die App offenbar schon im <strong style={{ color: "var(--ink)" }}>Vollbild-Modus</strong> (vom
          Startbildschirm geöffnet).
        </p>
      )}
    </div>
  );
}
