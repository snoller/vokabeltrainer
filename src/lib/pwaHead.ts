/** Manifest & Apple-Meta dynamisch gemäß Vite BASE_URL (z. B. GitHub Pages Unterordner). */
export function applyPwaDocumentHead(): void {
  if (typeof document === "undefined") return;
  const raw = import.meta.env.BASE_URL ?? "/";
  const base = raw.endsWith("/") ? raw : `${raw}/`;
  const withBase = (path: string) => `${base}${path.replace(/^\//, "")}`;

  let linkManifest = document.querySelector<HTMLLinkElement>('link[rel="manifest"]');
  if (!linkManifest) {
    linkManifest = document.createElement("link");
    linkManifest.rel = "manifest";
    document.head.appendChild(linkManifest);
  }
  linkManifest.href = withBase("manifest.webmanifest");

  let apple = document.querySelector<HTMLLinkElement>('link[rel="apple-touch-icon"]');
  if (!apple) {
    apple = document.createElement("link");
    apple.rel = "apple-touch-icon";
    document.head.appendChild(apple);
  }
  apple.href = withBase("pwa-192.png");

  let theme = document.querySelector("meta[name='theme-color']");
  if (!theme) {
    theme = document.createElement("meta");
    theme.setAttribute("name", "theme-color");
    document.head.appendChild(theme);
  }
  theme.setAttribute("content", "#0f1218");

  let cap = document.querySelector("meta[name='apple-mobile-web-app-capable']");
  if (!cap) {
    cap = document.createElement("meta");
    cap.setAttribute("name", "apple-mobile-web-app-capable");
    document.head.appendChild(cap);
  }
  cap.setAttribute("content", "yes");

  let titleMeta = document.querySelector("meta[name='apple-mobile-web-app-title']");
  if (!titleMeta) {
    titleMeta = document.createElement("meta");
    titleMeta.setAttribute("name", "apple-mobile-web-app-title");
    document.head.appendChild(titleMeta);
  }
  titleMeta.setAttribute("content", "Vokabeln");
}
