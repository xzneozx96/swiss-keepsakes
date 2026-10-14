// Fix pass (R2, 14 Oct 2026): C10, C11 and C13 must not change when SurfaceCardBlock gains its
// opt-in C15 grammar (compact padding, dashed rule). 375px, DPR 2, EN and DE, full page.
// Usage: node 2.8-r2b-surface-regress.mjs <out dir>   (Vite on 5232, no HMR)
// Run before and after the surface-card.tsx edit, then: compare -metric AE before/x.png after/x.png null:
import { chromium } from "playwright-core";
import { mkdirSync, readdirSync } from "node:fs";

const home = process.env.HOME + "/.cache/ms-playwright/";
const dir = readdirSync(home).filter((d) => d.startsWith("chromium_headless_shell-")).sort().pop();
const OUT = process.argv[2];
const BASE = "http://localhost:5232/";
mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({ executablePath: `${home}${dir}/chrome-headless-shell-linux64/chrome-headless-shell` });
const page = await browser.newPage({ viewport: { width: 375, height: 812 }, deviceScaleFactor: 2 });
page.on("pageerror", (e) => console.log("PAGEERROR", e.message));
page.on("console", (m) => m.type() === "error" && console.log("CONSOLE", m.text().slice(0, 200)));
const wait = (ms = 400) => page.waitForTimeout(ms);
const shot = async (name) => {
  // New bookings get a random reference; mask it so before/after runs compare.
  await page.evaluate(() => {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) n.nodeValue = n.nodeValue.replace(/SK-T[0-9A-F]{6}/g, "SK-T000000");
  });
  await page.evaluate(() => scrollTo(0, 0));
  await wait(500);
  const h = await page.evaluate(() => document.documentElement.scrollHeight);
  await page.setViewportSize({ width: 375, height: Math.min(h, 8000) });
  await wait(400);
  await page.screenshot({ path: `${OUT}/${name}.png` });
  await page.setViewportSize({ width: 375, height: 812 });
  console.log("SHOT", name);
};
const lang = async (l) => {
  await page.evaluate(() => scrollTo(0, 0));
  await page.getByRole("region", { name: "Prototype controls" }).getByRole("button", { name: l, exact: true }).click();
  await wait(400);
};
const both = async (name) => { await shot(`${name}-en`); await lang("DE"); await shot(`${name}-de`); await lang("EN"); };

await page.goto(BASE);
await page.evaluate(() => localStorage.clear());
await page.reload();
await wait(800);
// C10: walk, Fri 16 Oct.
await page.goto(BASE + "#/tours/lucerne-old-town-walk/book"); await wait(900);
await page.locator(".radio").filter({ hasText: "Fri 16 Oct" }).click(); await wait(300);
await both("c10");
// C11 signed out, then signed in with the contact filled.
await page.getByRole("button", { name: /Review booking/ }).last().click(); await wait(800);
await both("c11-signed-out");
await page.getByLabel("Contact name").fill("Anna Keller");
await page.getByLabel("Mobile number").fill("+41 79 123 45 67");
await page.locator("form button[type=submit]").click(); await wait(900);
await page.getByRole("button", { name: /Continue with Google/ }).click(); await wait(1200);
await both("c11");
// C13 after paying the deposit.
await page.locator("form button[type=submit]").click(); await wait(1000);
await page.getByRole("button", { name: /^Pay CHF/ }).click(); await wait(1500);
await both("c13");
// C13 pay later: lake tour, 17 Oct.
await page.goto(BASE + "#/tours/lake-lucerne-stories/book"); await wait(900);
await page.locator(".radio").filter({ hasText: "17 Oct" }).click(); await wait(300);
await page.getByRole("button", { name: /Review booking/ }).last().click(); await wait(800);
await page.getByLabel("Contact name").fill("Anna Keller");
await page.getByLabel("Mobile number").fill("+41 79 123 45 67");
await page.locator("form button[type=submit]").click(); await wait(1500);
await both("c13-pay-later");
await browser.close();
