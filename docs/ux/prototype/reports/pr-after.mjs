// Partner dashboard redesign, after: P02 in month/week/day/empty, EN+DE, 375/768/1024/1280, plus a loading shot.
import { chromium } from "playwright-core";
import { readdirSync } from "node:fs";
const OUT = "/home/ross-geller/Projects/minastik/swiss-keepsakes/docs/ux/prototype/screens/partner-redesign/";
const BASE = "http://localhost:5243/";
const home = process.env.HOME + "/.cache/ms-playwright/";
const dir = readdirSync(home).filter((d) => d.startsWith("chromium_headless_shell-")).sort().pop();
const browser = await chromium.launch({ executablePath: `${home}${dir}/chrome-headless-shell-linux64/chrome-headless-shell` });
const ctx = await browser.newContext({ viewport: { width: 375, height: 812 } });
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
page.on("console", (m) => m.type() === "error" && errors.push("console: " + m.text()));
const wait = (ms) => page.waitForTimeout(ms);
const bar = page.getByRole("region", { name: "Prototype controls" });
const openBar = async () => { await bar.getByRole("button").first().click(); await page.getByRole("dialog").waitFor(); await wait(400); };
const shot = async (name, width) => {
  await page.setViewportSize({ width, height: 812 }); await wait(1600);
  await page.mouse.move(2, 2);
  const h = await page.evaluate(() => document.documentElement.scrollHeight);
  await page.setViewportSize({ width, height: Math.min(Math.max(812, h), 6000) }); await wait(400);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  await page.screenshot({ path: `${OUT}after-${name}-${width}.png` });
  console.log(`after-${name}-${width}.png`, overflow > 0 ? `OVERFLOW ${overflow}px` : "ok");
};
await page.goto(BASE); await wait(1000);
await openBar(); await page.getByRole("radio", { name: /^Partner/ }).click({ force: true }); await wait(300); await page.keyboard.press("Escape"); await wait(700);
await page.goto(BASE + "#/partner"); await wait(1000);
const send = page.getByRole("button", { name: /Send code|Code senden/ });
if (await send.count()) { await send.click(); await wait(600); await page.keyboard.type("123456"); await wait(1200); }
const token = page.url().split("#/partner/")[1]?.split("?")[0];
const VIEWS = { month: "", week: "?period=week", day: "?period=day", empty: "?period=day&date=2026-10-11" };
for (const [n, q] of Object.entries(VIEWS)) {
  await page.goto(`${BASE}#/partner/${token}${q}`); await wait(800);
  for (const w of n === "month" ? [375, 768, 1024, 1280] : [375, 1280]) await shot(n, w);
}
// Loading skeleton at 1280: reload and shoot before the simulated delay ends.
await page.setViewportSize({ width: 1280, height: 1400 });
await page.goto(`${BASE}#/partner/${token}`); await page.reload(); await page.locator(".skeleton").first().waitFor({ timeout: 5000 });
await page.screenshot({ path: `${OUT}after-loading-1280.png` }); console.log("after-loading-1280.png");
// German
await openBar(); await page.getByRole("group", { name: /Language|Sprache/ }).getByRole("button", { name: "DE", exact: true }).click({ force: true }); await wait(400); await page.keyboard.press("Escape"); await wait(500);
await page.goto(`${BASE}#/partner/${token}`); await wait(800);
for (const w of [375, 1280]) await shot("de-month", w);
await openBar(); await page.getByRole("group", { name: /Language|Sprache/ }).getByRole("button", { name: "EN", exact: true }).click({ force: true }); await wait(300);
console.log(errors.slice(0, 5).join("\n") || "no errors");
await browser.close();
