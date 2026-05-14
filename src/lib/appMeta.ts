/** Aus package.json · Buildzeit aus vite define (Deployments vergleichen) */
export function appVersionFootnote(): string {
  const stamp =
    typeof __BUILD_STAMP__ === "string" ? __BUILD_STAMP__.replace("T", "\u202f").slice(0, 16) : "";
  return stamp.length > 0 ? `v${__APP_VERSION__} · ${stamp} UTC` : `v${__APP_VERSION__}`;
}
