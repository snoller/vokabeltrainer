import { useState } from "react";
import { LANGUAGE_PAIR_PRESETS } from "@/lib/languagePairs";
import { apiUrl } from "@/lib/apiBase";
import { formatCardMetaLine } from "@/lib/cardMeta";
import { createCard, loadCards, saveCards } from "@/lib/storage";

function notify() {
  window.dispatchEvent(new Event("vokabeltrainer:update"));
}

type Extracted = {
  front: string;
  back: string;
  hint?: string;
  lesson?: string;
  chapter?: string;
};

export default function Scan() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [langPresetId, setLangPresetId] = useState<string>("latin-de");
  const [langNote, setLangNote] = useState(
    () => LANGUAGE_PAIR_PRESETS.find((p) => p.id === "latin-de")!.hint
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [extracted, setExtracted] = useState<Extracted[] | null>(null);
  const [importChapter, setImportChapter] = useState("");
  const [importLesson, setImportLesson] = useState("");

  const onPick = (f: File | null) => {
    setFile(f);
    setExtracted(null);
    setError(null);
    if (preview) {
      URL.revokeObjectURL(preview);
      setPreview(null);
    }
    if (f && f.type.startsWith("image/")) {
      setPreview(URL.createObjectURL(f));
    }
  };

  const scan = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("image", file);
      fd.append("langNote", langNote);
      const res = await fetch(apiUrl("/api/extract-vocabulary"), {
        method: "POST",
        body: fd,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const base =
          typeof data.error === "string" ? data.error : `Fehler ${res.status}`;
        const modelSuffix = typeof data.model === "string" ? ` · Modell: ${data.model}` : "";
        setError(base + modelSuffix);
        setExtracted(null);
        return;
      }
      const entries = Array.isArray(data.entries) ? data.entries : [];
      setExtracted(
        entries.map((e: Extracted) => ({
          front: String(e.front ?? "").trim(),
          back: String(e.back ?? "").trim(),
          hint: e.hint ? String(e.hint).trim() : undefined,
          lesson: e.lesson ? String(e.lesson).trim() : undefined,
          chapter: e.chapter ? String(e.chapter).trim() : undefined,
        })).filter((e: Extracted) => e.front && e.back)
      );
    } catch {
      const prodHint =
        import.meta.env.PROD && !(import.meta.env.VITE_API_ORIGIN?.trim() ?? "")
          ? " Für den Foto-Scan auf GitHub Pages brauchst du ein gehostetes API-Backend und musst beim Build VITE_API_ORIGIN setzen."
          : "";
      setError(
        `Netzwerkfehler oder Server nicht gestartet. Läuft „npm run dev“ mit API? Ist GEMINI_API_KEY in der .env gesetzt?${prodHint}`
      );
      setExtracted(null);
    } finally {
      setLoading(false);
    }
  };

  const importAll = () => {
    if (!extracted?.length) return;
    const cards = loadCards();
    const ch = importChapter.trim();
    const le = importLesson.trim();
    const newCards = [...extracted].reverse().map((e) =>
      createCard({
        front: e.front,
        back: e.back,
        hint: e.hint,
        lesson: e.lesson || le || undefined,
        chapter: e.chapter || ch || undefined,
        languagePair: langPresetId !== "custom" ? langPresetId : undefined,
      })
    );
    saveCards([...newCards, ...cards]);
    setExtracted(null);
    setFile(null);
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    notify();
  };

  return (
    <div>
      <h1 style={{ marginTop: 0 }}>Foto-Scan</h1>
      <p style={{ color: "var(--ink-muted)", maxWidth: "56ch" }}>
        Fotografiere eine Vokabel-Liste aus dem Schulbuch (auch <strong>Latein</strong> mit Makronen). Der Server
        verkleinert große Bilder automatisch, dann ruft er das Vision‑Modell auf. Du prüfst die Liste und importierst
        sie.
      </p>

      <div
        style={{
          marginTop: "1.25rem",
          padding: "1.25rem",
          background: "var(--bg-card)",
          borderRadius: "var(--radius)",
          border: "1px solid rgba(232, 234, 239, 0.08)",
          display: "grid",
          gap: "1rem",
        }}
      >
        <label style={{ display: "grid", gap: "0.35rem" }}>
          <span style={{ fontWeight: 600 }}>Sprache / Richtung</span>
          <select
            value={langPresetId}
            onChange={(e) => {
              const id = e.target.value;
              setLangPresetId(id);
              if (id !== "custom") {
                const p = LANGUAGE_PAIR_PRESETS.find((x) => x.id === id);
                if (p) setLangNote(p.hint);
              }
            }}
            style={{
              padding: "0.55rem 0.75rem",
              borderRadius: 10,
              border: "1px solid rgba(232, 234, 239, 0.12)",
              background: "var(--bg-deep)",
              color: "var(--ink)",
              fontFamily: "var(--font-ui)",
            }}
          >
            {LANGUAGE_PAIR_PRESETS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
            <option value="custom">Eigener Hinweis (unten editieren)</option>
          </select>
        </label>

        <label style={{ display: "grid", gap: "0.35rem" }}>
          <span style={{ fontWeight: 600 }}>
            Hinweis fürs Modell {langPresetId !== "custom" ? "(bei Vorgabe angepasst, gern ergänzen)" : ""}
          </span>
          <input
            value={langNote}
            onChange={(e) => {
              setLangNote(e.target.value);
              setLangPresetId("custom");
            }}
            placeholder="z. B. Latein Lektion 3, Deklination..."
            style={{
              padding: "0.65rem 0.85rem",
              borderRadius: 10,
              border: "1px solid rgba(232, 234, 239, 0.12)",
              background: "var(--bg-deep)",
              color: "var(--ink)",
              fontFamily: "var(--font-ui)",
            }}
          />
        </label>

        <div style={{ display: "grid", gap: "0.5rem" }}>
          <span style={{ fontWeight: 600, fontSize: "0.95rem" }}>Meta für den Import (optional)</span>
          <span style={{ color: "var(--ink-muted)", fontSize: "0.85rem", lineHeight: 1.45 }}>
            Wird jeder importierten Karte zugeordnet, wenn die Erkennung pro Zeile kein eigenes „Kapitel“ / „Lektion“
            liefert.
          </span>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
              gap: "0.6rem",
            }}
          >
            <input
              value={importChapter}
              onChange={(e) => setImportChapter(e.target.value)}
              placeholder="Kapitel (z. B. 12)"
              style={{
                padding: "0.65rem 0.85rem",
                borderRadius: 10,
                border: "1px solid rgba(232, 234, 239, 0.12)",
                background: "var(--bg-deep)",
                color: "var(--ink)",
                fontFamily: "var(--font-ui)",
              }}
            />
            <input
              value={importLesson}
              onChange={(e) => setImportLesson(e.target.value)}
              placeholder="Lektion (z. B. 5)"
              style={{
                padding: "0.65rem 0.85rem",
                borderRadius: 10,
                border: "1px solid rgba(232, 234, 239, 0.12)",
                background: "var(--bg-deep)",
                color: "var(--ink)",
                fontFamily: "var(--font-ui)",
              }}
            />
          </div>
        </div>

        <label style={{ display: "inline-flex", flexDirection: "column", gap: "0.5rem" }}>
          <span style={{ fontWeight: 600 }}>Bild auswählen</span>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={(e) => onPick(e.target.files?.[0] ?? null)}
          />
        </label>

        {preview && (
          <img
            src={preview}
            alt="Vorschau"
            style={{ maxWidth: "100%", maxHeight: 360, borderRadius: 10, objectFit: "contain" }}
          />
        )}

        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.6rem" }}>
          <button
            type="button"
            disabled={!file || loading}
            onClick={() => void scan()}
            style={{
              padding: "0.65rem 1.25rem",
              borderRadius: 999,
              border: "none",
              background: "var(--accent)",
              color: "#12151c",
              fontWeight: 700,
              cursor: !file || loading ? "not-allowed" : "pointer",
              opacity: !file || loading ? 0.6 : 1,
            }}
          >
            {loading ? "Erkenne…" : "Vokabeln erkennen"}
          </button>
        </div>

        {error && (
          <div style={{ color: "var(--danger)", fontSize: "0.95rem", whiteSpace: "pre-wrap" }}>{error}</div>
        )}
      </div>

      {extracted && extracted.length > 0 && (
        <div style={{ marginTop: "1.5rem" }}>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.25rem" }}>Ergebnis ({extracted.length})</h2>
          <ul style={{ listStyle: "none", padding: 0, margin: "0.75rem 0 1rem", display: "grid", gap: "0.5rem" }}>
            {extracted.map((e, i) => {
              const rowMeta = formatCardMetaLine(e);
              return (
              <li
                key={`${e.front}-${i}`}
                style={{
                  padding: "0.75rem 1rem",
                  background: "var(--bg-raised)",
                  borderRadius: 10,
                  border: "1px solid rgba(232, 234, 239, 0.06)",
                }}
              >
                <strong>{e.front}</strong>
                <span style={{ color: "var(--ink-muted)" }}> → </span>
                <span style={{ color: "var(--success)" }}>{e.back}</span>
                {rowMeta && (
                  <div style={{ fontSize: "0.8rem", color: "var(--accent)", marginTop: "0.3rem" }}>{rowMeta}</div>
                )}
                {e.hint && <div style={{ fontSize: "0.85rem", color: "var(--ink-muted)", marginTop: "0.25rem" }}>{e.hint}</div>}
              </li>
              );
            })}
          </ul>
          <button
            type="button"
            onClick={importAll}
            style={{
              padding: "0.65rem 1.25rem",
              borderRadius: 999,
              border: "none",
              background: "var(--success)",
              color: "#0f1218",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Alle in Bibliothek übernehmen
          </button>
        </div>
      )}

      {extracted && extracted.length === 0 && !loading && (
        <p style={{ marginTop: "1rem", color: "var(--ink-muted)" }}>Keine Paare erkannt – anderes Bild oder präzisere Sprachinfo versuchen.</p>
      )}
    </div>
  );
}
