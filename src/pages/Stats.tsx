import { Link } from "react-router-dom";
import type { ReactNode } from "react";
import { useMemo, useSyncExternalStore } from "react";
import { getCardsStorageSnapshot, parseCardsSnapshot } from "@/lib/storage";
import { computeLibraryStats } from "@/lib/stats";

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

function tile(big: ReactNode, small: string, accent?: boolean) {
  return (
    <div
      style={{
        padding: "1.25rem",
        background: "var(--bg-card)",
        borderRadius: "var(--radius)",
        border:
          accent
            ? "1px solid rgba(201, 162, 39, 0.25)"
            : "1px solid rgba(232, 234, 239, 0.06)",
      }}
    >
      <div
        style={{
          fontSize: "2rem",
          fontFamily: "var(--font-display)",
          fontWeight: 700,
          color: accent ? "var(--accent)" : undefined,
        }}
      >
        {big}
      </div>
      <div style={{ color: "var(--ink-muted)", fontSize: "0.9rem" }}>{small}</div>
    </div>
  );
}

function sectionTitle(text: string) {
  return (
    <h2 style={{ fontSize: "1.1rem", fontWeight: 700, margin: "2rem 0 0.75rem", color: "var(--ink)" }}>
      {text}
    </h2>
  );
}

export default function Stats() {
  const raw = useSyncExternalStore(subscribe, getCardsStorageSnapshot, () => "[]");
  const cards = useMemo(() => parseCardsSnapshot(raw), [raw]);
  const now = Date.now();
  const s = useMemo(() => computeLibraryStats(cards, now), [cards, now]);

  const avgStr = s.avgEase != null ? s.avgEase.toFixed(2).replace(".", ",") : "—";

  return (
    <div className="stagger">
      <h1 className="animate-in" style={{ marginTop: 0, fontSize: "clamp(1.75rem, 4vw, 2.35rem)" }}>
        Statistik
      </h1>
      <p style={{ color: "var(--ink-muted)", maxWidth: "56ch", marginBottom: "1.5rem" }}>
        Kennzahlen für das <strong>aktive Profil</strong> (nur dieses Gerät, lokale Daten). Sie aktualisieren sich,
        wenn du Karten lernst oder die Bibliothek änderst.
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
          gap: "1rem",
        }}
      >
        {tile(s.total, "Karten gesamt")}
        {tile(s.dueNow, "fällig jetzt", true)}
        {tile(s.dueWithin24h, "in den nächsten 24 Std.")}
        {tile(s.dueBetween24hAnd7d, "in 2–7 Tagen")}
        {tile(s.dueLater, "später als 7 Tage")}
      </div>

      {sectionTitle("Neue Karten")}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
          gap: "1rem",
        }}
      >
        {tile(s.addedLast7Days, "angelegt (7 Tage)")}
        {tile(s.addedLast30Days, "angelegt (30 Tage)")}
      </div>

      {sectionTitle("Wiederholungen (SM-2)")}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
          gap: "1rem",
        }}
      >
        {tile(s.reps0, "noch nie richtig beantwortet")}
        {tile(s.reps12, "1–2 erfolgreiche Wiederholungen")}
        {tile(s.repsMature, "3+ Wiederholungen")}
        {tile(avgStr, "Ø Leichtigkeit (ease)")}
      </div>

      {sectionTitle("Leichtigkeit (Ease-Faktor)")}
      <p style={{ color: "var(--ink-muted)", fontSize: "0.92rem", margin: "0 0 0.75rem" }}>
        Grobe Verteilung: {"<"} 2 (schwierig), 2–2,5, {">"} 2,5 (eher leicht).
      </p>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
          gap: "1rem",
        }}
      >
        {tile(s.easeLow, "< 2")}
        {tile(s.easeMid, "2 – 2,5")}
        {tile(s.easeHigh, "> 2,5")}
      </div>

      {sectionTitle("Nach Sprachpaar")}
      {s.byLanguage.length === 0 ? (
        <p style={{ color: "var(--ink-muted)" }}>Noch keine Karten in diesem Profil.</p>
      ) : (
        <div
          style={{
            background: "var(--bg-card)",
            borderRadius: "var(--radius)",
            border: "1px solid rgba(232, 234, 239, 0.06)",
            overflow: "hidden",
          }}
        >
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.95rem" }}>
            <thead>
              <tr style={{ textAlign: "left", color: "var(--ink-muted)" }}>
                <th style={{ padding: "0.75rem 1rem", fontWeight: 600 }}>Sprache</th>
                <th style={{ padding: "0.75rem 1rem", fontWeight: 600, textAlign: "right" }}>Karten</th>
              </tr>
            </thead>
            <tbody>
              {s.byLanguage.map((row) => (
                <tr key={row.id} style={{ borderTop: "1px solid rgba(232, 234, 239, 0.06)" }}>
                  <td style={{ padding: "0.65rem 1rem" }}>{row.label}</td>
                  <td style={{ padding: "0.65rem 1rem", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                    {row.count}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p style={{ marginTop: "2rem", color: "var(--ink-muted)", fontSize: "0.92rem" }}>
        <Link to="/lernen" style={{ color: "var(--accent)" }}>
          Zum Lernen
        </Link>
        {" · "}
        <Link to="/bibliothek" style={{ color: "var(--accent)" }}>
          Zur Bibliothek
        </Link>
      </p>
    </div>
  );
}
