/** Ohne trailing slash. Leer = gleiche Origin (lokal über Vite-Proxy `/api`). */
export function apiOrigin(): string {
  const raw = import.meta.env.VITE_API_ORIGIN?.trim() ?? "";
  return raw.replace(/\/$/, "");
}

export function apiUrl(path: string): string {
  const origin = apiOrigin();
  const p = path.startsWith("/") ? path : `/${path}`;
  return origin ? `${origin}${p}` : p;
}
