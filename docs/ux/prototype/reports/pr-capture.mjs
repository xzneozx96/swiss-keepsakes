// Partner dashboard redesign: capture P02 (partner) and M02 (merchant Today/Sales) at 375 and 1280.
// Usage: node pr-capture.mjs <prefix> [base]
import { chromium } from "playwright-core";
import { readdirSync } from "node:fs";
const OUT = "/home/ross-geller/Projects/minastik/swiss-keepsakes/docs/ux/prototype/screens/partner-redesign/";
const PREFIX = process.argv[2] ?? "before";
const BASE = process.argv[3] ?? "http://localhost:5173/";
const ONLY = process.argv[4];
const home = process.env.HOME + "/.cache/ms-playwright/";
const dir = readdirSync(home).filter((d) => d.startsWith("chromium_headless_shell-")).sort().pop();
const browser = await chromium.launch({ executablePath: `${home}${dir}/chrome-headless-shell-linux64/chrome-headless-shell` });
const ctx = await browser.newContext({ viewport: { width: 375, height: 812 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
page.on("console", (m) => m.type() === "error" && errors.push("console: " + m.text()));
const wait = (ms) => page.waitForTimeout(ms);
const bar = page.getByRole("region", { name: "Prototype controls" });
const role = async (name) => {
  await bar.getByRole("button").first().click(); await page.getByRole("dialog").waitFor(); await wait(400);
  await page.getByRole("radio", { name: new RegExp("^" + name) }).click({ force: true });
  await wait(300); await page.keyboard.press("Escape"); await wait(700);
};
const shot = async (name, width) => {
  await page.setViewportSize({ width, height: 812 }); await wait(1600);
  await page.mouse.move(2, 2);
  const h = await page.evaluate(() => document.documentElement.scrollHeight);
  await page.setViewportSize({ width, height: Math.min(Math.max(812, h), 6000) }); await wait(400);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  await page.screenshot({ path: `${OUT}${PREFIX}-${name}-${width}.png` });
  console.log(`${PREFIX}-${name}-${width}.png`, overflow > 0 ? `OVERFLOW ${overflow}px` : "ok");
};
await page.goto(BASE); await wait(1000);
const views = ONLY === "partner" ? [] : [["store-today", "#/store"], ["store-sales", "#/store/sales"]];
if (views.length) { await role("Merchant · Owner"); }
for (const [n, h] of views) { await page.goto(BASE + h); await wait(800); for (const w of [375, 1280]) await shot(n, w); }
await page.goto(BASE); await wait(800);
await role("Partner");
await page.goto(BASE + "#/partner"); await wait(1000);
const send = page.getByRole("button", { name: /Send code|Code senden/ });
if (await send.count()) { await send.click(); await wait(600); await page.keyboard.type("123456"); await wait(1200); }
for (const [n, h] of [["partner-month", "#/partner"], ["partner-week", "#/partner?period=week"]]) {
  await page.goto(BASE + h); await wait(800);
  for (const w of [375, 1280]) await shot(n, w);
}
console.log(page.url()); console.log(errors.slice(0, 5).join("\n") || "no errors");
await browser.close();
