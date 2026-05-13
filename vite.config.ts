import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

/** GitHub-Projektseiten: z. B. `VITE_BASE_PATH=/mein-repo/` beim Build setzen. */
function normalizeBase(raw: string | undefined): string {
  const b = raw?.trim();
  if (!b || b === "/") return "/";
  return b.endsWith("/") ? b : `${b}/`;
}

export default defineConfig({
  base: normalizeBase(process.env.VITE_BASE_PATH),
  plugins: [react()],
  resolve: {
    alias: { "@": path.resolve(__dirname, "src") },
  },
  server: {
    port: 5173,
    proxy: {
      "/api": { target: "http://127.0.0.1:8787", changeOrigin: true },
    },
  },
});
