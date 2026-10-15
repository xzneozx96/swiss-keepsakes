// P02 dashboard v2: screenshots plus interactions (column filter, payments tab, month click), August, DE, loading.
import { chromium } from "playwright-core";
import { readdirSync } from "node:fs";
const OUT = "/home/ross-geller/Projects/minastik/swiss-keepsakes/docs/ux/prototype/screens/partner-redesign/";
const BASE = "http://localhost:5243/";
const home = process.env.HOME + "/.cache/ms-playwright/";
const dir = readdirSync(home).filter((d) => d.startsWith("chromium_headless_shell-")).sort().pop();
const browser = await chromium.launch({ executablePath: `${home}${dir}/chrome-headless-shell-linux64/chrome-headless-shell` });
const page = await (await browser.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
const errors = [];
page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
page.on("console", (m) => m.type() === "error" && errors.push("console: " + m.text()));
const wait = (ms) => page.waitForTimeout(ms);
const check = (name, ok) => console.log(ok ? "PASS" : "FAIL", name);
const shot = async (name, width, full = true) => {
  await page.setViewportSize({ width, height: 900 }); await wait(1200);
  if (full) {
    const h = await page.evaluate(() => document.documentElement.scrollHeight);
    await page.setViewportSize({ width, height: Math.min(Math.max(900, h), 7000) }); await wait(400);
  }
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  await page.screenshot({ path: `${OUT}v2-${name}-${width}.png` });
  console.log(`v2-${name}-${width}.png`, overflow > 0 ? `OVERFLOW ${overflow}px` : "ok");
};
const bar = page.getByRole("region", { name: "Prototype controls" });
await page.goto(BASE); await wait(1000);
await bar.getByRole("button").first().click(); await page.getByRole("dialog").waitFor(); await wait(400);
await page.getByRole("radio", { name: /^Partner/ }).click({ force: true }); await wait(300); await page.keyboard.press("Escape"); await wait(700);
await page.goto(BASE + "#/partner"); await wait(1000);
const send = page.getByRole("button", { name: /Send code|Code senden/ });
if (await send.count()) { await send.click(); await wait(600); await page.keyboard.type("123456"); await wait(1200); }
const token = page.url().split("#/partner/")[1]?.split("?")[0];
const open = async (q = "") => { await page.goto(`${BASE}#/partner/${token}${q}`); await wait(1000); };

await open();
const imgsOk = await page.evaluate(() => [...document.querySelectorAll("main img")].every((i) => i.complete && i.naturalWidth > 0));
check("guest photos load", imgsOk);
for (const w of [375, 768, 1024, 1280]) await shot("month", w);

// Column click filters the transactions; the selection is aria-pressed.
await page.setViewportSize({ width: 1280, height: 900 }); await wait(500);
const before = await page.locator("main ul.grid > li").count();
const col = page.getByRole("button", { name: /^5–11/ }).first();
await col.click(); await wait(500);
check("column aria-pressed", (await col.getAttribute("aria-pressed")) === "true");
const after = await page.locator("main ul.grid > li").count();
check(`column filters list (${before} -> ${after})`, after > 0 && after < before);
await page.getByText(/^Only /).first().scrollIntoViewIfNeeded(); await wait(300);
await page.screenshot({ path: `${OUT}v2-filtered-1280.png`, fullPage: true }); console.log("v2-filtered-1280.png");
await page.getByRole("button", { name: /Show the whole period/ }).click(); await wait(400);
check("clear selection", (await page.locator("main ul.grid > li").count()) === before);

// Payments tab: the activity log.
await page.getByRole("tab", { name: /Payments/ }).click(); await wait(500);
check("payments log shown", await page.getByText("Paid to you").isVisible());
await page.getByRole("tab", { name: /Payments/ }).scrollIntoViewIfNeeded();
await page.screenshot({ path: `${OUT}v2-payments-1280.png`, fullPage: true }); console.log("v2-payments-1280.png");

// Month click opens that month.
await page.getByRole("button", { name: /^Open September/ }).click(); await wait(800);
check("month click -> URL", /date=2026-09-01/.test(page.url()));
check("September pressed", (await page.getByRole("button", { name: /^Open September/ }).getAttribute("aria-pressed")) === "true");

// Week and day, August (no payments), empty day.
await open("?period=week"); for (const w of [375, 1280]) await shot("week", w);
await open("?period=day"); await shot("day", 1280);
await open("?period=month&date=2026-08-15"); await shot("august", 1280);
await open("?period=day&date=2026-08-01"); await shot("empty", 1280);

// Loading.
await page.setViewportSize({ width: 1280, height: 1400 });
await page.goto(`${BASE}#/partner/${token}`); await page.reload();
await page.locator(".skeleton").first().waitFor({ timeout: 8000 }).catch(() => {});
await page.screenshot({ path: `${OUT}v2-loading-1280.png` }); console.log("v2-loading-1280.png");

// German.
await page.evaluate(() => localStorage.setItem("sk.language", JSON.stringify("de")));
await open(); await page.reload(); await wait(1200);
for (const w of [375, 1280]) await shot("de-month", w);
await page.evaluate(() => localStorage.setItem("sk.language", JSON.stringify("en")));
console.log(errors.slice(0, 6).join("\n") || "no errors");
await browser.close();
