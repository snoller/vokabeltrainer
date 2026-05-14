import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { readFileSync } from "node:fs";

const pkg = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf-8")) as {
  version: string;
};

/** GitHub-Projektseiten: z. B. `VITE_BASE_PATH=/mein-repo/` beim Build setzen. */
function normalizeBase(raw: string | undefined): string {
  const b = raw?.trim();
  if (!b || b === "/") return "/";
  return b.endsWith("/") ? b : `${b}/`;
}

export default defineConfig({
  base: normalizeBase(process.env.VITE_BASE_PATH),
  define: {
    __APP_VERSION__: JSON.stringify(String(pkg.version)),
    __BUILD_STAMP__: JSON.stringify(new Date().toISOString()),
  },
  plugins: [react()],
  resolve: {
    alias: { "@": path.resolve(__dirname, "src") },
  },
  server: {
    port: 5173,
    /** Auf macOS kann Vite nur auf ::1 lauschen → 127.0.0.1 wäre „nicht erreichbar“. true = IPv4+LAN. */
    host: true,
    strictPort: true,
    proxy: {
      "/api": { target: "http://127.0.0.1:8787", changeOrigin: true },
    },
  },
});
