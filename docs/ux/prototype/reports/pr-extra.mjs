// DE month at 375/1280 and an empty day (2026-08-01, before the first order) at 375/1280.
import { chromium } from "playwright-core";
import { readdirSync } from "node:fs";
const OUT = "/home/ross-geller/Projects/minastik/swiss-keepsakes/docs/ux/prototype/screens/partner-redesign/";
const BASE = "http://localhost:5243/";
const KEY = process.argv[2];
const home = process.env.HOME + "/.cache/ms-playwright/";
const dir = readdirSync(home).filter((d) => d.startsWith("chromium_headless_shell-")).sort().pop();
const browser = await chromium.launch({ executablePath: `${home}${dir}/chrome-headless-shell-linux64/chrome-headless-shell` });
const page = await (await browser.newContext({ viewport: { width: 375, height: 812 } })).newPage();
const wait = (ms) => page.waitForTimeout(ms);
const bar = page.getByRole("region", { name: "Prototype controls" });
const shot = async (name, width) => {
  await page.setViewportSize({ width, height: 812 }); await wait(1600);
  const h = await page.evaluate(() => document.documentElement.scrollHeight);
  await page.setViewportSize({ width, height: Math.min(Math.max(812, h), 6000) }); await wait(400);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  await page.screenshot({ path: `${OUT}after-${name}-${width}.png` });
  console.log(`after-${name}-${width}.png`, overflow > 0 ? `OVERFLOW ${overflow}px` : "ok");
};
await page.goto(BASE); await wait(1000);
await bar.getByRole("button").first().click(); await page.getByRole("dialog").waitFor(); await wait(400);
await page.getByRole("radio", { name: /^Partner/ }).click({ force: true }); await wait(300); await page.keyboard.press("Escape"); await wait(700);
await page.goto(BASE + "#/partner"); await wait(1000);
const send = page.getByRole("button", { name: /Send code|Code senden/ });
if (await send.count()) { await send.click(); await wait(600); await page.keyboard.type("123456"); await wait(1200); }
const token = page.url().split("#/partner/")[1]?.split("?")[0];
await page.goto(`${BASE}#/partner/${token}?period=day&date=2026-08-01`); await wait(800);
for (const w of [375, 1280]) await shot("empty", w);
await page.evaluate((k) => localStorage.setItem(k, JSON.stringify("de")), KEY);
await page.goto(`${BASE}#/partner/${token}`); await page.reload(); await wait(1000);
for (const w of [375, 1280]) await shot("de-month", w);
await page.evaluate((k) => localStorage.setItem(k, JSON.stringify("en")), KEY);
await browser.close();
