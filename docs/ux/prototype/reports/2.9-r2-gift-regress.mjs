// 2.7/2.9 round 2: gift C14 + C15 pixel regression around the shared-component moves
// (date tile, timeline steps, state headline → src/components/). 375px, EN and DE.
// Usage: node 2.9-r2-gift-regress.mjs <out dir> [repo root]   (Vite on 5232, no HMR)
// Run once before the move (out = .../before) and once after (out = .../after), then compare
// with ImageMagick: compare -metric AE before/x.png after/x.png null:
import { chromium } from "playwright-core";
import { mkdirSync, readdirSync } from "node:fs";

const home = process.env.HOME + "/.cache/ms-playwright/";
const dir = readdirSync(home).filter((d) => d.startsWith("chromium_headless_shell-")).sort().pop();
const exe = `${home}${dir}/chrome-headless-shell-linux64/chrome-headless-shell`;
const OUT = process.argv[2];
const BASE = "http://localhost:5232/";
mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({ executablePath: exe });
const context = await browser.newContext({ viewport: { width: 375, height: 812 }, deviceScaleFactor: 2 });
const page = await context.newPage();
page.on("console", (m) => { if (m.type() === "error") console.log("CONSOLE", m.text().slice(0, 300)); });
page.on("pageerror", (e) => console.log("PAGEERROR", e.message));
const wait = (ms = 400) => page.waitForTimeout(ms);
// Full page by growing the viewport, so sticky bars render once at the top.
const shot = async (name) => {
  await page.evaluate(() => window.scrollTo(0, 0));
  await wait(400);
  const h = await page.evaluate(() => document.documentElement.scrollHeight);
  await page.setViewportSize({ width: 375, height: Math.max(812, h) });
  await wait(250);
  await page.screenshot({ path: `${OUT}/${name}.png` });
  await page.setViewportSize({ width: 375, height: 812 });
  console.log("SHOT", name);
};
const setLang = async (id) => {
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.getByRole("group", { name: "Language" }).getByRole("button", { name: id }).first().click();
  await wait(300);
};
const TABS = { EN: { payments: "Payments", timeline: "Progress" }, DE: { payments: "Zahlungen", timeline: "Verlauf" } };

// Fresh state, signed in, every sample order.
await page.goto(BASE);
await page.evaluate(() => localStorage.clear());
await page.goto(BASE + "#/sign-in?returnTo=%2Faccount");
await wait(800);
await page.getByRole("button", { name: /Continue with Google/ }).click();
await wait(1200);
await page.getByRole("region", { name: "Prototype controls" }).getByRole("button").first().click();
await page.getByRole("dialog").waitFor();
await wait(300);
await page.getByRole("button", { name: "Add sample orders in every state" }).click();
await wait(1200);
await page.keyboard.press("Escape");
await wait(300);

const orders = ["sk-1043", "sk-1044", "sk-1045", "sk-1046", "sk-1047", "sk-1048", "sk-1049", "sk-1050", "sk-1012", "sk-1015"];
for (const lang of ["EN", "DE"]) {
  const l = lang.toLowerCase();
  await page.goto(BASE + "#/account?tab=orders");
  await wait(1200);
  await setLang(lang);
  await wait(900);
  await shot(`c14-orders-${l}`);
  for (const id of orders) {
    await page.goto(BASE + `#/account/orders/${id}`);
    await wait(900);
    await shot(`c15-${id}-${l}`);
    await page.getByRole("tab", { name: TABS[lang].timeline }).click();
    await wait(300);
    await shot(`c15-${id}-timeline-${l}`);
  }
}
await browser.close();
