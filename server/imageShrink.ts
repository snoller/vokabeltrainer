import sharp from "sharp";

export type ShrinkResult = {
  buffer: Buffer;
  mimeType: string;
  shrunk: boolean;
  originalBytes: number;
  finalBytes: number;
};

function envInt(name: string, fallback: number): number {
  const raw = process.env[name]?.trim();
  if (!raw) return fallback;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

/**
 * Buchfotos: große Auflösung / Dateigröße runter für Multer-Gemini, Text bleibt lesbar.
 */
export async function shrinkImageForVision(input: Buffer, inputMime: string): Promise<ShrinkResult> {
  const maxEdgePx = envInt("SHRINK_MAX_EDGE_PX", 2048);
  const targetBytes = envInt("SHRINK_TARGET_BYTES", 4 * 1024 * 1024);
  const skipBelowBytes = envInt("SHRINK_SKIP_BELOW_BYTES", 1200 * 1024);

  const originalBytes = input.length;

  try {
    const meta = await sharp(input).metadata();
    const w = meta.width ?? 0;
    const h = meta.height ?? 0;
    const longEdge = Math.max(w, h);

    const needsResize = longEdge > maxEdgePx;
    const needsWork = originalBytes > skipBelowBytes || needsResize;

    if (!needsWork) {
      return {
        buffer: input,
        mimeType: inputMime || "image/jpeg",
        shrunk: false,
        originalBytes,
        finalBytes: originalBytes,
      };
    }

    let quality = 88;
    let best = input;

    while (quality >= 40) {
      let pipe = sharp(input).rotate();

      if (longEdge > maxEdgePx && w > 0 && h > 0) {
        pipe = pipe.resize({
          width: w >= h ? maxEdgePx : undefined,
          height: h > w ? maxEdgePx : undefined,
          fit: "inside",
          withoutEnlargement: true,
        });
      }

      best = await pipe.jpeg({ quality, mozjpeg: true, chromaSubsampling: "4:2:0" }).toBuffer();

      if (best.length <= targetBytes || quality <= 40) {
        return {
          buffer: best,
          mimeType: "image/jpeg",
          shrunk: true,
          originalBytes,
          finalBytes: best.length,
        };
      }
      quality -= 12;
    }

    return {
      buffer: best,
      mimeType: "image/jpeg",
      shrunk: true,
      originalBytes,
      finalBytes: best.length,
    };
  } catch (e) {
    console.warn("[imageShrink] sharp konnte Bild nicht verarbeiten, Rohdaten verwenden:", e);
    return {
      buffer: input,
      mimeType: inputMime || "image/jpeg",
      shrunk: false,
      originalBytes,
      finalBytes: originalBytes,
    };
  }
}
