// usage: node rules-check.mjs <buildDir> <port>
// Behaviour checks for the rule-by-rule fixes: html lang at first paint, article progress bar,
// hover preload, lazy QR code.
import { createRequire } from "node:module";
import http from "node:http";
import { existsSync, readFileSync } from "node:fs";
import { extname, join } from "node:path";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright-core");
const [dir, portArg] = process.argv.slice(2);
const port = Number(portArg);
const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".mp3": "audio/mpeg" };
const server = http
  .createServer((req, res) => {
    let file = join(dir, decodeURIComponent(req.url.split("?")[0]));

    if (!existsSync(file) || file === `${dir}/`) file = join(dir, "index.html");
    res.setHeader("content-type", types[extname(file)] ?? "application/octet-stream");
    res.end(readFileSync(file));
  })
  .listen(port);
const browser = await chromium.launch({ executablePath: "/usr/bin/google-chrome", args: ["--no-sandbox"] });
const report = (name, value) => console.log(`${name}: ${JSON.stringify(value)}`);

{
  const context = await browser.newContext({ viewport: { width: 430, height: 932 } });
  const page = await context.newPage();
  const errors = [];

  page.on("pageerror", (e) => errors.push(String(e.message).slice(0, 120)));
  await page.addInitScript(() => {
    localStorage.setItem("sk.language", JSON.stringify("de"));
    window.__lang = null;
    new MutationObserver((_, observer) => {
      const root = document.getElementById("root");

      if (root && root.childElementCount > 0) {
        window.__lang = document.documentElement.lang;
        observer.disconnect();
      }
    }).observe(document, { childList: true, subtree: true });
  });
  await page.goto(`http://localhost:${port}/index.html#/`);
  await page.waitForTimeout(1500);
  report("lang when the first content appeared (saved German)", await page.evaluate(() => window.__lang));
  report("lang after load", await page.evaluate(() => document.documentElement.lang));
  report("page errors", errors);
  await context.close();
}

{
  const context = await browser.newContext({ viewport: { width: 430, height: 932 } });
  const page = await context.newPage();
  const errors = [];

  page.on("pageerror", (e) => errors.push(String(e.message).slice(0, 120)));
  await page.goto(`http://localhost:${port}/index.html#/stories/musegg-morning`);
  await page.waitForTimeout(1800);
  const bar = () => page.evaluate(() => document.querySelector("nav .origin-left")?.style.transform ?? "missing");

  report("progress bar at top", await bar());
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight * 0.5));
  await page.waitForTimeout(500);
  report("progress bar at the middle", await bar());
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(500);
  report("progress bar at the end", await bar());
  report("page errors", errors);
  await context.close();
}

{
  const context = await browser.newContext({ viewport: { width: 430, height: 932 } });
  const page = await context.newPage();
  const scripts = [];

  page.on("request", (r) => {
    if (r.url().endsWith(".js")) scripts.push(r.url().split("/").pop());
  });
  await page.goto(`http://localhost:${port}/index.html#/`);
  await page.waitForTimeout(2000);
  const before = new Set(scripts);
  const link = page.locator('a[href*="/tours"]').first();

  await link.hover();
  await page.waitForTimeout(1500);
  report("script requests caused by hovering the Tours link", scripts.filter((s) => !before.has(s)));
  await context.close();
}

{
  const context = await browser.newContext({ viewport: { width: 430, height: 932 } });
  const page = await context.newPage();
  const scripts = [];
  const errors = [];

  page.on("request", (r) => {
    if (r.url().endsWith(".js")) scripts.push(r.url().split("/").pop());
  });
  page.on("pageerror", (e) => errors.push(String(e.message).slice(0, 120)));
  await page.goto(`http://localhost:${port}/index.html#/`);
  await page.waitForTimeout(2000);
  const qrChunk = (list) => list.filter((n) => /^esm-/.test(n));

  report("qrcode chunk requested on first paint", qrChunk(scripts));
  const labels = await page.evaluate(() => [...document.querySelectorAll("button")].map((b) => b.getAttribute("aria-label") || (b.textContent || "").trim().slice(0, 24)).filter(Boolean));

  report("button labels on the home page", labels.slice(0, 14));
  const opener = page.locator("button", { hasText: /^Guest$/ }).first();

  await opener.click({ timeout: 3000 }).catch(() => report("prototype opener", "not found"));
  await page.waitForTimeout(800);
  await page.getByRole("button", { name: /QR$/ }).first().click({ timeout: 3000 }).catch(() => report("QR button", "not found"));
  await page.waitForTimeout(1500);
  report("qrcode chunk requested after choosing a partner QR", qrChunk(scripts));
  report("QR svg shown", await page.evaluate(() => !!document.querySelector('svg[aria-label^="QR code"]')));
  report("page errors", errors);
  await context.close();
}

await browser.close();
server.close();
