import { copyFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const dist = join(process.cwd(), "dist");
const indexHtml = join(dist, "index.html");
const notFound = join(dist, "404.html");

if (!existsSync(indexHtml)) {
  console.error("gh-pages-404: dist/index.html fehlt – zuerst vite build ausführen.");
  process.exit(1);
}
copyFileSync(indexHtml, notFound);
console.log("gh-pages-404: dist/404.html erzeugt (SPA-Routing auf GitHub Pages).");
