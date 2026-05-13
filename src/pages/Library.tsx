import { FormEvent, useEffect, useMemo, useState, useSyncExternalStore, type CSSProperties } from "react";
import type { VocabularyCard } from "@/types";
import { formatChapterLessonLine } from "@/lib/cardMeta";
import {
  LANGUAGE_PAIR_PRESETS,
  LIBRARY_FILTER_ALL,
  LIBRARY_LANG_EDITOR_KEY,
  LIBRARY_LANG_FILTER_KEY,
  languagePairById,
  getLibraryLangEditor,
  getLibraryLangFilter,
  setLibraryLangEditor,
  setLibraryLangFilter,
} from "@/lib/languagePairs";
import { createCard, getCardsStorageSnapshot, parseCardsSnapshot, saveCards } from "@/lib/storage";
import { isDue } from "@/lib/srs";

function subscribe(cb: () => void) {
  window.addEventListener("storage", cb);
  window.addEventListener("vokabeltrainer:update", cb);
  window.addEventListener("vokabeltrainer:profile", cb);
  window.addEventListener("vokabeltrainer:libraryLang", cb);
  return () => {
    window.removeEventListener("storage", cb);
    window.removeEventListener("vokabeltrainer:update", cb);
    window.removeEventListener("vokabeltrainer:profile", cb);
    window.removeEventListener("vokabeltrainer:libraryLang", cb);
  };
}

function notify() {
  window.dispatchEvent(new Event("vokabeltrainer:update"));
}

const inputStyle: CSSProperties = {
  width: "100%",
  padding: "0.65rem 0.85rem",
  borderRadius: 10,
  border: "1px solid rgba(232, 234, 239, 0.12)",
  background: "var(--bg-deep)",
  color: "var(--ink)",
  fontFamily: "var(--font-ui)",
  fontSize: "1rem",
};

const pillPassive: CSSProperties = {
  padding: "0.55rem 0.95rem",
  borderRadius: 999,
  border: "1px solid rgba(232, 234, 239, 0.14)",
  background: "var(--bg-raised)",
  color: "var(--ink-muted)",
  fontWeight: 600,
  fontSize: "0.92rem",
  cursor: "pointer",
  fontFamily: "var(--font-ui)",
  lineHeight: 1.2,
};

const pillActive: CSSProperties = {
  ...pillPassive,
  background: "rgba(201, 162, 39, 0.22)",
  border: "1px solid rgba(201, 162, 39, 0.55)",
  color: "var(--accent)",
};

function LangChipRow({
  value,
  onChange,
  options,
  ariaLabel,
}: {
  value: string;
  onChange: (id: string) => void;
  options: { id: string; label: string; title?: string }[];
  ariaLabel: string;
}) {
  return (
    <div role="radiogroup" aria-label={ariaLabel} style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
      {options.map((opt) => {
        const active = opt.id === value;
        return (
          <button
            key={opt.id}
            type="button"
            role="radio"
            aria-checked={active}
            title={opt.title ?? opt.label}
            onClick={() => onChange(opt.id)}
            style={active ? pillActive : pillPassive}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

export default function Library() {
  const raw = useSyncExternalStore(subscribe, getCardsStorageSnapshot, () => "[]");
  const cards = useMemo(() => parseCardsSnapshot(raw), [raw]);
  const [front, setFront] = useState("");
  const [back, setBack] = useState("");
  const [hint, setHint] = useState("");
  const [lesson, setLesson] = useState("");
  const [chapter, setChapter] = useState("");

  const [editorPairId, setEditorPairId] = useState(getLibraryLangEditor);
  const [filterId, setFilterId] = useState(getLibraryLangFilter);

  useEffect(() => {
    const sync = () => {
      setEditorPairId(getLibraryLangEditor());
      setFilterId(getLibraryLangFilter());
    };
    const onStorage = (e: StorageEvent) => {
      if (e.key === LIBRARY_LANG_EDITOR_KEY || e.key === LIBRARY_LANG_FILTER_KEY) sync();
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const editorPreset = languagePairById(editorPairId) ?? LANGUAGE_PAIR_PRESETS[0]!;

  const visibleCards = useMemo(() => {
    if (filterId === LIBRARY_FILTER_ALL) return cards;
    return cards.filter((c) => c.languagePair === filterId);
  }, [cards, filterId]);

  const filterOptions = [
    { id: LIBRARY_FILTER_ALL, label: "Alle", title: "Alle Sprachen und ältere Karten ohne Zuordnung" },
    ...LANGUAGE_PAIR_PRESETS.map((p) => ({
      id: p.id,
      label: p.shortLabel,
      title: p.label,
    })),
  ];

  const editorOptions = LANGUAGE_PAIR_PRESETS.map((p) => ({
    id: p.id,
    label: p.shortLabel,
    title: `${p.label} – neue manuelle Einträge und Beschriftung`,
  }));

  const onAdd = (e: FormEvent) => {
    e.preventDefault();
    if (!front.trim() || !back.trim()) return;
    const card = createCard({
      front,
      back,
      hint,
      lesson,
      chapter,
      languagePair: editorPairId,
    });
    saveCards([card, ...cards]);
    setFront("");
    setBack("");
    setHint("");
    setLesson("");
    setChapter("");
    notify();
  };

  const remove = (id: string) => {
    saveCards(cards.filter((c) => c.id !== id));
    notify();
  };

  const now = Date.now();

  return (
    <div>
      <h1 style={{ marginTop: 0 }}>Bibliothek</h1>

      <section
        style={{
          marginBottom: "1.35rem",
          padding: "1.35rem clamp(1rem, 2vw, 1.75rem)",
          background:
            "linear-gradient(155deg, rgba(201, 162, 39, 0.14) 0%, transparent 52%), var(--bg-card)",
          borderRadius: "var(--radius)",
          border: "1px solid rgba(201, 162, 39, 0.22)",
          display: "grid",
          gap: "1rem",
          boxShadow: "0 12px 32px rgba(0, 0, 0, 0.22)",
        }}
      >
        <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "1.1rem", color: "var(--ink)" }}>
          Sprachen
        </div>

        <div>
          <div style={{ fontSize: "0.82rem", textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--ink-muted)", marginBottom: "0.5rem", fontWeight: 700 }}>
            Neue Karte anlegen als
          </div>
          <LangChipRow
            ariaLabel="Sprachrichtung für neue Karten"
            value={editorPairId}
            options={editorOptions}
            onChange={(id) => {
              setEditorPairId(id);
              setLibraryLangEditor(id);
            }}
          />
          <p style={{ margin: "0.55rem 0 0", fontSize: "0.92rem", color: "var(--ink-muted)", lineHeight: 1.45 }}>
            Felder sind auf <strong style={{ color: "var(--accent)" }}>{editorPreset.label}</strong> ausgerichtet. Die
            Karte wird so in der Datenbank dieser Richtung zugeordnet.
          </p>
        </div>

        <div style={{ borderTop: "1px solid rgba(232, 234, 239, 0.08)", paddingTop: "0.85rem" }}>
          <div style={{ fontSize: "0.82rem", textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--ink-muted)", marginBottom: "0.5rem", fontWeight: 700 }}>
            Liste filtern nach
          </div>
          <LangChipRow
            ariaLabel="Bibliotheksliste nach Sprache filtern"
            value={filterId}
            options={filterOptions}
            onChange={(id) => {
              setFilterId(id);
              setLibraryLangFilter(id);
            }}
          />
          <p style={{ margin: "0.55rem 0 0", fontSize: "0.88rem", color: "var(--ink-muted)", lineHeight: 1.45 }}>
            „Alle“ zeigt auch ältere Karten ohne gespeicherte Sprach‑Zuordnung. Ein Sprach‑Filter zeigt nur Karten dieser
            Richtung (u. a. vom Foto‑Scan oder manuell zugeordnet).
          </p>
        </div>
      </section>

      <form
        onSubmit={onAdd}
        style={{
          display: "grid",
          gap: "0.75rem",
          marginBottom: "2rem",
          padding: "1.25rem",
          background: "var(--bg-card)",
          borderRadius: "var(--radius)",
          border: "1px solid rgba(232, 234, 239, 0.08)",
        }}
      >
        <div style={{ fontWeight: 600 }}>Neue Karte</div>

        <label style={{ display: "grid", gap: "0.35rem" }}>
          <span style={{ fontWeight: 600, fontSize: "0.9rem" }}>{editorPreset.inputLabelFront}</span>
          <input
            required
            value={front}
            onChange={(e) => setFront(e.target.value)}
            placeholder={editorPreset.placeholderFront}
            aria-label={editorPreset.inputLabelFront}
            style={inputStyle}
          />
        </label>
        <label style={{ display: "grid", gap: "0.35rem" }}>
          <span style={{ fontWeight: 600, fontSize: "0.9rem" }}>{editorPreset.inputLabelBack}</span>
          <input
            required
            value={back}
            onChange={(e) => setBack(e.target.value)}
            placeholder={editorPreset.placeholderBack}
            aria-label={editorPreset.inputLabelBack}
            style={inputStyle}
          />
        </label>
        <input
          value={hint}
          onChange={(e) => setHint(e.target.value)}
          placeholder="Optional: Hinweis (Kasus, Genus, Konjugation …)"
          style={inputStyle}
        />
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
            gap: "0.75rem",
          }}
        >
          <input
            value={chapter}
            onChange={(e) => setChapter(e.target.value)}
            placeholder="Optional: Kapitel (z. B. 12)"
            style={inputStyle}
          />
          <input
            value={lesson}
            onChange={(e) => setLesson(e.target.value)}
            placeholder="Optional: Lektion (z. B. 5)"
            style={inputStyle}
          />
        </div>
        <button
          type="submit"
          style={{
            justifySelf: "start",
            padding: "0.65rem 1.25rem",
            borderRadius: 999,
            border: "none",
            background: "var(--accent)",
            color: "#12151c",
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          Hinzufügen
        </button>
      </form>

      <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
        {cards.length === 0 && <p style={{ color: "var(--ink-muted)" }}>Keine Karten gespeichert.</p>}
        {cards.length > 0 && visibleCards.length === 0 && (
          <p style={{ color: "var(--ink-muted)" }}>Mit diesem Filter keine Karten. „Alle“ wählen oder andere Sprache.</p>
        )}
        {visibleCards.map((c) => (
          <CardRow key={c.id} card={c} now={now} onDelete={() => remove(c.id)} />
        ))}
      </div>
    </div>
  );
}

function CardRow({ card, now, onDelete }: { card: VocabularyCard; now: number; onDelete: () => void }) {
  const due = isDue(card, now);
  const chapterLesson = formatChapterLessonLine(card);
  const lp = languagePairById(card.languagePair);
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr auto",
        gap: "0.75rem",
        alignItems: "start",
        padding: "1rem 1.1rem",
        background: "var(--bg-raised)",
        borderRadius: 12,
        border: "1px solid rgba(232, 234, 239, 0.06)",
      }}
    >
      <div>
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "baseline", gap: "0.5rem" }}>
          {lp && (
            <span
              title={lp.label}
              style={{
                fontSize: "0.72rem",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                padding: "0.2rem 0.55rem",
                borderRadius: 6,
                background: "rgba(201, 162, 39, 0.15)",
                color: "var(--accent)",
                border: "1px solid rgba(201, 162, 39, 0.3)",
              }}
            >
              {lp.shortLabel}
            </span>
          )}
          <div style={{ fontFamily: "var(--font-display)", fontWeight: 600 }}>{card.front}</div>
        </div>
        <div style={{ color: "var(--success)", marginTop: "0.25rem" }}>{card.back}</div>
        {chapterLesson && (
          <div style={{ color: "var(--accent)", fontSize: "0.82rem", marginTop: "0.3rem", opacity: 0.95 }}>{chapterLesson}</div>
        )}
        {card.hint && (
          <div style={{ color: "var(--ink-muted)", fontSize: "0.88rem", marginTop: "0.35rem" }}>{card.hint}</div>
        )}
        <div style={{ fontSize: "0.82rem", color: "var(--ink-muted)", marginTop: "0.5rem" }}>
          SRS: EF {card.srs.easeFactor.toFixed(2)} · Wdh. {card.srs.repetitions}
          {due ? " · fällig" : " · später"}
        </div>
      </div>
      <button
        type="button"
        onClick={onDelete}
        style={{
          padding: "0.4rem 0.65rem",
          fontSize: "0.85rem",
          borderRadius: 8,
          border: "1px solid rgba(224,122,122,0.4)",
          background: "transparent",
          color: "var(--danger)",
          cursor: "pointer",
        }}
      >
        Löschen
      </button>
    </div>
  );
}
