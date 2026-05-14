import "dotenv/config";
import cors from "cors";
import express from "express";
import multer from "multer";
import type { Request, Response, NextFunction } from "express";
import {
  GoogleGenerativeAI,
  GoogleGenerativeAIFetchError,
  GoogleGenerativeAIResponseError,
  HarmBlockThreshold,
  HarmCategory,
} from "@google/generative-ai";
import { shrinkImageForVision } from "./imageShrink";

function envUploadMaxBytes(): number {
  const mb = Number(process.env.GEMINI_MAX_UPLOAD_MB?.trim() ?? "40");
  const n = Number.isFinite(mb) && mb > 0 ? mb : 40;
  return Math.min(Math.floor(n * 1024 * 1024), 80 * 1024 * 1024);
}

const maxUploadBytes = envUploadMaxBytes();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: maxUploadBytes },
});

const app = express();
const port = Number(process.env.PORT ?? 8787);

app.use(
  cors({
    origin: true,
    maxAge: 86400,
  })
);

/** Google AI Studio / Gemini: GEMINI_API_KEY oder GOOGLE_GENERATIVE_AI_API_KEY */
const geminiApiKey =
  process.env.GEMINI_API_KEY?.trim() ||
  process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim() ||
  null;

type Entry = {
  front: string;
  back: string;
  hint?: string;
  lesson?: string;
  chapter?: string;
};

const systemPrompt = `Du extrahierst Vokabelpaare aus einem Foto einer Schulbuchseite oder Vokabelliste.
Antworte ausschließlich mit gültigem JSON (kein Markdown, kein Einleitungstext). Form:
{"entries":[{"front":"...","back":"...","hint":"optional","lesson":"optional","chapter":"optional"}]}
Kein Fließtext vor oder nach dem JSON, keine Markdown-Code-Fences.
"front" und "back" sind die beiden Sprachen bzw. Spalten wie vom Nutzer gewünscht.
Wenn nur eine Spaltenüberschrift sichtbar ist, nutze die Sprachrichtung aus dem Hinweis des Nutzers.

Fülle optional "lesson" und "chapter" nur wenn diese Information zeilenweise oder klar einer Gruppe zuordenbar aus dem Bild hervorgeht (z.B. Zwischenüberschrift „Lektion 5“, „Kapitel 12“). Kurze reine Zahlen/Texte ohne Label sind ok (z.B. chapter: "12"). Wiederhole dieselbe Zuordnung für alle folgenden Vokabeln bis eine neue Zwischenüberschrift kommt.
Bei Latein: Lemma und Formen exakt wie abgebildet (inkl. Makronen wenn sie im Bild stehen); "back" die deutsche Entsprechung. Nutze optional "hint" für Kasus/Genus/Verbform wenn die Liste das anzeigt.`;

/** Ohne CIVIC_INTEGRITY: einige API-Versionen reagieren mit Fehlern / 500 auf diese Kategorie. */
const ocrSafetySettings = (
  [
    HarmCategory.HARM_CATEGORY_HATE_SPEECH,
    HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
    HarmCategory.HARM_CATEGORY_HARASSMENT,
    HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
  ] as const
).map((category) => ({
  category,
  threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
}));

function isRetryableModelError(e: unknown): boolean {
  if (e instanceof GoogleGenerativeAIFetchError) {
    if (e.status === 404) return true;
    const m = (e.message || "").toLowerCase();
    if (
      m.includes("not found") ||
      m.includes("invalid model") ||
      m.includes("unknown model") ||
      m.includes("does not exist") ||
      m.includes("is not found")
    ) {
      return true;
    }
  }
  return false;
}

function serializeGeminiError(e: unknown): {
  message: string;
  status?: number;
  statusText?: string;
  errorDetails?: unknown;
} {
  if (e instanceof GoogleGenerativeAIFetchError) {
    return {
      message: e.message,
      status: e.status,
      statusText: e.statusText,
      errorDetails: e.errorDetails,
    };
  }
  if (e instanceof GoogleGenerativeAIResponseError) {
    return { message: e.message };
  }
  if (e instanceof Error) {
    return { message: e.message, statusText: e.name };
  }
  return { message: String(e) };
}

function uniqueModels(preferred: string, fallbacks: string[]): string[] {
  const out: string[] = [];
  for (const m of [preferred, ...fallbacks]) {
    const t = m.trim();
    if (t && !out.includes(t)) out.push(t);
  }
  return out;
}

app.post(
  "/api/extract-vocabulary",
  (req: Request, res: Response, next: NextFunction) => {
    upload.single("image")(req, res, (err) => {
      if (err) {
        const msg = err instanceof Error ? err.message : String(err);
        const code = (err as { code?: string }).code;
        if (code === "LIMIT_FILE_SIZE") {
          const mb = Math.round(maxUploadBytes / (1024 * 1024));
          res.status(413).json({
            error: `Datei zu groß (Server-Limit ${mb} MB). In .env z. B. GEMINI_MAX_UPLOAD_MB erhöhen oder Bild verkleinern.`,
          });
          return;
        }
        res.status(400).json({
          error: `Upload: ${msg}${code ? ` (${code})` : ""}`,
        });
        return;
      }
      next();
    });
  },
  async (req, res) => {
    if (!geminiApiKey) {
      res.status(503).json({
        error:
          "GEMINI_API_KEY fehlt (oder GOOGLE_GENERATIVE_AI_API_KEY). Trage ihn in einer .env im Projektroot ein.",
      });
      return;
    }
    const file = req.file;
    if (!file?.buffer) {
      res.status(400).json({ error: "Kein Bild (Feld „image“) übermittelt." });
      return;
    }
    const langNote = typeof req.body.langNote === "string" ? req.body.langNote : "";

    const shrunk = await shrinkImageForVision(file.buffer, file.mimetype || "image/jpeg");
    if (shrunk.shrunk) {
      console.log(
        `[extract-vocabulary] Bild verkleinert: ${shrunk.originalBytes} → ${shrunk.finalBytes} Bytes`
      );
    }
    const b64 = shrunk.buffer.toString("base64");
    const mime = shrunk.mimeType;

    const envFallbacks = (process.env.GEMINI_MODEL_FALLBACKS ?? "gemini-2.0-flash,gemini-2.5-flash")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const preferred = process.env.GEMINI_MODEL?.trim() || "gemini-3.1-flash-lite";
    const modelCandidates = uniqueModels(preferred, envFallbacks);

    const genAI = new GoogleGenerativeAI(geminiApiKey);
    const userText = `Sprachrichtung / Kontext: ${langNote || "nicht angegeben — erkenne aus dem Bild."}`;

    let lastError: unknown;
    let usedModel = preferred;

    for (const modelName of modelCandidates) {
      usedModel = modelName;
      try {
        const model = genAI.getGenerativeModel({
          model: modelName,
          systemInstruction: systemPrompt,
          safetySettings: ocrSafetySettings,
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 8192,
          },
        });

        const result = await model.generateContent([
          userText,
          {
            inlineData: {
              mimeType: mime,
              data: b64,
            },
          },
        ]);

        let raw: string;
        try {
          raw = result.response.text().trim();
        } catch (texErr) {
          const cand = result.response.candidates?.[0];
          const finish = cand?.finishReason ?? "UNKNOWN";
          const block = result.response.promptFeedback?.blockReason;
          const extra =
            texErr instanceof Error && texErr.message ? texErr.message : String(texErr);
          res.status(422).json({
            error:
              `Keine verwertbare Modell-Antwort (finish: ${finish}` +
              (block ? `, Prompt blockiert: ${block}` : "") +
              `). Details: ${extra}`,
            model: modelName,
          });
          return;
        }

        let parsed: { entries?: Entry[] };
        try {
          parsed = JSON.parse(raw) as { entries?: Entry[] };
        } catch {
          const jsonMatch = raw.match(/\{[\s\S]*\}/);
          const jsonStr = jsonMatch ? jsonMatch[0] : raw;
          try {
            parsed = JSON.parse(jsonStr) as { entries?: Entry[] };
          } catch {
            res.status(422).json({
              error: "Modell-Antwort war kein gültiges JSON.",
              raw: raw.slice(0, 500),
              model: modelName,
            });
            return;
          }
        }

        const entries = Array.isArray(parsed.entries) ? parsed.entries : [];
        res.json({
          modelUsed: modelName,
          modelRequested: preferred,
          usedFallback: modelName !== preferred,
          entries: entries
            .map((e) => ({
              front: String(e.front ?? "").trim(),
              back: String(e.back ?? "").trim(),
              hint: e.hint ? String(e.hint).trim() : undefined,
              lesson: e.lesson ? String(e.lesson).trim() : undefined,
              chapter: e.chapter ? String(e.chapter).trim() : undefined,
            }))
            .filter((e) => e.front && e.back),
        });
        return;
      } catch (e) {
        lastError = e;
        console.error(`[extract-vocabulary] model=${modelName}`, e);
        const canRetry =
          modelCandidates.indexOf(modelName) < modelCandidates.length - 1 && isRetryableModelError(e);
        if (canRetry) {
          console.warn(`[extract-vocabulary] retry with next model after:`, serializeGeminiError(e));
          continue;
        }
        break;
      }
    }

    const s = serializeGeminiError(lastError);
    let http = 500;
    const errUnknown = lastError;
    if (errUnknown instanceof GoogleGenerativeAIFetchError) {
      if (typeof errUnknown.status === "number") {
        if (errUnknown.status >= 400 && errUnknown.status < 500) {
          http = errUnknown.status;
        } else if (errUnknown.status >= 500) {
          http = 502;
        }
      }
    } else if (errUnknown instanceof GoogleGenerativeAIResponseError) {
      http = 422;
    }

    res.status(http).json({
      error: s.message,
      model: usedModel,
      modelsTried: modelCandidates,
      geminiStatus: s.status,
      geminiStatusText: s.statusText,
      geminiErrorDetails: s.errorDetails ?? null,
      hint:
        http >= 500
          ? "Prüfe Gemini-AI-Studio-Schlüssel, Modellverfügbarkeit oder setze GEMINI_MODEL (z.B. gemini-2.0-flash)."
          : undefined,
    });
  }
);

app.get("/", (_req, res) => {
  res.type("text/plain; charset=utf-8").send(
    [
      "Vokabeltrainer — API-Server (nur /api/*).",
      "",
      "- GET /api/health — Status prüfen",
      "- POST /api/extract-vocabulary — Foto-Scan (Multipart, Feld „image“)",
      "",
      "Die Oberfläche: npm run dev:client oder npm run dev → http://127.0.0.1:5173/ oder http://localhost:5173/",
      "",
    ].join("\n")
  );
});

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    provider: "gemini",
    configured: Boolean(geminiApiKey),
    model: process.env.GEMINI_MODEL?.trim() || "gemini-3.1-flash-lite",
    maxUploadMB: Math.round(maxUploadBytes / (1024 * 1024)),
    imageShrink: true,
    fallbacks: (process.env.GEMINI_MODEL_FALLBACKS ?? "gemini-2.0-flash,gemini-2.5-flash")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
  });
});

app.listen(port, () => {
  const mb = Math.round(maxUploadBytes / (1024 * 1024));
  console.log(`API http://127.0.0.1:${port}  (health: /api/health, max Upload ${mb} MB)`);
});
