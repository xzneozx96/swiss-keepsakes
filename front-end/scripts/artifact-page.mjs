// Turns Vite's dist/index.html into dist/artifact.html for publishing as a claude.ai Artifact.
// The Artifact host wraps the page in its own <html>/<head>/<body>, so this keeps only
// the title, font stylesheet, root element and the built asset tags.
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const dist = join(dirname(fileURLToPath(import.meta.url)), "..", "dist");
const html = readFileSync(join(dist, "index.html"), "utf8");

const pick = (pattern, label) => {
  const found = html.match(pattern);

  if (!found) throw new Error(`artifact-page: ${label} not found in dist/index.html`);

  return found;
};

const title = pick(/<title>[\s\S]*?<\/title>/, "title")[0];
// A plain blocking stylesheet link: the page's own preload link needs an inline onload, which a host may block.
const fontsHref = pick(/<link[^>]+href="(https:\/\/fonts\.googleapis\.com\/css2[^"]*)"/, "font stylesheet")[1];
const fonts = `<link rel="stylesheet" href="${fontsHref}" />`;
const assetTags = [
  ...html.matchAll(/<script type="module"[^>]*><\/script>|<link rel="(?:stylesheet|modulepreload)"[^>]*href="\.\/assets\/[^"]+"[^>]*>/g),
].map((m) => m[0]);

if (!assetTags.some((tag) => tag.startsWith("<script"))) {
  throw new Error("artifact-page: module script not found in dist/index.html");
}

const page = [
  title,
  '<link rel="preconnect" href="https://fonts.googleapis.com" />',
  '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />',
  fonts,
  ...assetTags,
  '<div id="root"></div>',
  "",
].join("\n");

writeFileSync(join(dist, "artifact.html"), page);

// Every built asset (lazy route chunks included), for the publish `files` map.
const assets = readdirSync(join(dist, "assets"))
  .filter((name) => /\.(js|css)$/.test(name))
  .map((name) => `assets/${name}`)
  .sort();

writeFileSync(join(dist, "artifact-files.json"), JSON.stringify(assets, null, 2) + "\n");
console.log(
  `artifact-page: wrote dist/artifact.html (${assetTags.length} entry tags) and dist/artifact-files.json (${assets.length} assets)`,
);
