// 1.17r: P02 screenshots for one phase (before | after) in two demo states (seed = right after Reset,
// review = the 1.19b review gallery state saved by 1.17r-state.mjs), EN and DE, 375px and 1024px.
// Usage: node 1.17r-capture.mjs <before|after>   (Vite on port 5213; playwright-core resolvable next to the script)
import { chromium } from "playwright-core";
import { readdirSync, readFileSync } from "node:fs";

const ROOT = "/home/ross-geller/Projects/minastik/swiss-keepsakes/";
const OUT = ROOT + "docs/ux/prototype/screens/1.17r/";
const BASE = "http://localhost:5213/";
const PHASE = process.argv[2];
const REVIEW = readFileSync(ROOT + "docs/ux/prototype/reports/1.17r-review-state.json", "utf8");

const home = process.env.HOME + "/.cache/ms-playwright/";
const dir = readdirSync(home).filter((d) => d.startsWith("chromium_headless_shell-")).sort().pop();
const browser = await chromium.launch({ executablePath: `${home}${dir}/chrome-headless-shell-linux64/chrome-headless-shell` });
const ctx = await browser.newContext({ viewport: { width: 375, height: 812 }, deviceScaleFactor: 2 });
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
page.on("console", (m) => m.type() === "error" && errors.push("console: " + m.text()));
const wait = (ms) => page.waitForTimeout(ms);
const log = (...a) => console.log(...a);

const bar = page.getByRole("region", { name: "Prototype controls" });
const openBar = async () => { await bar.getByRole("button").first().click(); await page.getByRole("dialog").waitFor(); await wait(400); };
const setLang = async (l) => {
  await page.getByRole("group", { name: /Language|Sprache/ }).getByRole("button", { name: l.toUpperCase(), exact: true }).click();
  await wait(400);
};
const asPartner = async () => {
  await openBar();
  await page.getByRole("radio", { name: /^Partner/ }).click({ force: true });
  await wait(300);
  await page.keyboard.press("Escape");
  await wait(700);
};

const VIEWS = {
  month: "#/partner",
  week: "#/partner?period=week",
  day: "#/partner?period=day",
  empty: "#/partner?period=day&date=2026-10-11",
};

const shot = async (name, width) => {
  await page.setViewportSize({ width, height: 812 });
  await wait(300);
  await page.mouse.move(2, 2);
  const h = await page.evaluate(() => document.documentElement.scrollHeight);
  await page.setViewportSize({ width, height: Math.max(812, h) });
  await wait(300);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  await page.screenshot({ path: `${OUT}${PHASE}-${name}.png` });
  log(`${PHASE}-${name}.png`, overflow > 0 ? `OVERFLOW ${overflow}px` : "ok");
};

for (const state of ["seed", "review"]) {
  await page.goto(BASE);
  await wait(800);
  if (state === "seed") {
    await openBar();
    await page.getByRole("button", { name: "Reset demo" }).click();
    await wait(800);
  } else {
    await page.evaluate((s) => localStorage.setItem("sk.demo", s), REVIEW);
    await page.reload();
    await wait(800);
  }
  await asPartner();
  for (const lang of ["en", "de"]) {
    await setLang(lang);
    for (const [view, hash] of Object.entries(VIEWS)) {
      await page.goto(BASE + hash);
      await wait(1200);
      for (const w of [375, 1024]) await shot(`${state}-${view}-${lang}-${w}`, w);
    }
  }
  if (state === "seed") {
    await setLang("en");
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(BASE + "#/partner");
    await page.reload();
    await wait(80);
    await page.screenshot({ path: `${OUT}${PHASE}-seed-loading-en-375.png` });
    log(`${PHASE}-seed-loading-en-375.png`);
  }
}
log("errors:", JSON.stringify(errors));
await browser.close();
