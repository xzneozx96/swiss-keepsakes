// R1 round 2: C06 before/after the InfoNote move (must be pixel-identical). 375px, DPR 2.
// node c06.mjs <outdir> <before|after>
import { chromium } from "playwright-core";
import { readdirSync, mkdirSync } from "node:fs";
const home = process.env.HOME + "/.cache/ms-playwright/";
const dir = readdirSync(home).filter((d) => d.startsWith("chromium_headless_shell-")).sort().pop();
const OUT = process.argv[2]; const P = process.argv[3]; mkdirSync(OUT, { recursive: true });
const BASE = process.env.BASE ?? "http://localhost:5231/";
const browser = await chromium.launch({ executablePath: `${home}${dir}/chrome-headless-shell-linux64/chrome-headless-shell` });
const page = await browser.newPage({ viewport: { width: 375, height: 812 }, deviceScaleFactor: 2 });
page.on("pageerror", (e) => console.log("PAGEERROR", e.message));
const wait = (ms = 400) => page.waitForTimeout(ms);
const bar = page.getByRole("region", { name: "Prototype controls" });
const lang = async (l) => { await page.evaluate(() => scrollTo(0, 0)); await bar.getByRole("button", { name: l, exact: true }).click(); await wait(400); };
const shot = async (name) => {
  await wait(500);
  const h = await page.evaluate(() => document.documentElement.scrollHeight);
  await page.setViewportSize({ width: 375, height: h }); await wait(300);
  await page.screenshot({ path: `${OUT}/${P}-${name}.png` });
  await page.setViewportSize({ width: 375, height: 812 });
  console.log(name, "overflow", await page.evaluate(() => document.documentElement.scrollWidth - innerWidth));
};
async function addGift(slug, variant, engraving, day, place) {
  await page.goto(BASE + "#/gifts/" + slug); await wait(900);
  await page.getByRole("button", { name: /^Add to cart$/ }).last().click();
  const sheet = page.getByRole("dialog"); await sheet.waitFor();
  if (variant) await sheet.getByRole("row", { name: new RegExp(variant) }).click();
  if (engraving) await sheet.getByLabel(/Engraving/).first().fill(engraving);
  await sheet.getByRole("gridcell").filter({ hasText: new RegExp(`^${day}$`) }).first().click();
  await sheet.getByRole("radio", { name: new RegExp(place) }).check({ force: true });
  await sheet.getByRole("button", { name: /Add to cart ·/ }).click(); await wait(400);
}
await page.goto(BASE); await page.evaluate(() => localStorage.clear()); await page.reload(); await wait(800);
await addGift("kapellbruecke-pocket-knife", "Medium", "Anna", 21, "Shop Altstadt");
await addGift("limited-edition-print", null, null, 20, "Shop Altstadt");
await page.goto(BASE + "#/cart"); await wait(6500);
await page.getByRole("checkbox", { name: "Select all" }).check({ force: true }); await wait(300);
await page.getByRole("button", { name: "Continue" }).click(); await wait(800);
await page.getByRole("button", { name: /Continue with Google/ }).click(); await wait(1500);
console.log("url", page.url());
console.log("info notes", await page.locator(".alert--info").allInnerTexts());
await shot("c06-en");
await lang("DE");
await shot("c06-de");
await browser.close();
