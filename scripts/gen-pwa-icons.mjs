/**
 * Erzeugt public/pwa-192.png und public/pwa-512.png (einmalig oder nach Design-Änderung).
 * Aufruf: node scripts/gen-pwa-icons.mjs
 */
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, "..", "public");
mkdirSync(publicDir, { recursive: true });

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect fill="#0f1218" width="512" height="512" rx="112"/><text x="256" y="355" font-size="300" text-anchor="middle" fill="#c9a227" font-family="Georgia,Times New Roman,serif" font-weight="700">V</text></svg>`;

const buf = Buffer.from(svg);
await sharp(buf).resize(192, 192).png().toFile(join(publicDir, "pwa-192.png"));
await sharp(buf).resize(512, 512).png().toFile(join(publicDir, "pwa-512.png"));
console.log("gen-pwa-icons: public/pwa-192.png, public/pwa-512.png");
