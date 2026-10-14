// R1 round 2 extra checks: C11 with a pay-later departure (EN/DE) and keyboard focus on the
// "Edit departure or group" row. node extra.mjs <screens/2.5-r2>
import { chromium } from "playwright-core";
import { readdirSync } from "node:fs";
const home = process.env.HOME + "/.cache/ms-playwright/";
const dir = readdirSync(home).filter((d) => d.startsWith("chromium_headless_shell-")).sort().pop();
const OUT = process.argv[2];
const BASE = process.env.BASE ?? "http://localhost:5231/";
const browser = await chromium.launch({ executablePath: `${home}${dir}/chrome-headless-shell-linux64/chrome-headless-shell` });
const page = await browser.newPage({ viewport: { width: 375, height: 812 }, deviceScaleFactor: 2 });
const wait = (ms = 400) => page.waitForTimeout(ms);
const bar = page.getByRole("region", { name: "Prototype controls" });
const full = async (name) => {
  const h = await page.evaluate(() => document.documentElement.scrollHeight);
  await page.setViewportSize({ width: 375, height: h }); await wait(300);
  await page.screenshot({ path: `${OUT}/${name}.png` });
  await page.setViewportSize({ width: 375, height: 812 });
  console.log(name, "overflow", await page.evaluate(() => document.documentElement.scrollWidth - innerWidth));
};
await page.goto(BASE); await page.evaluate(() => localStorage.clear()); await page.reload(); await wait(800);
await page.goto(BASE + "#/tours/lake-lucerne-stories/book"); await wait(900);
await page.locator(".radio").filter({ hasText: "17 Oct" }).click(); await wait(300);
await page.getByRole("button", { name: /Review booking/ }).last().click(); await wait(900);
console.log("C11 pay later:", (await page.locator("main").innerText()).replace(/\n+/g, " | ").replace(/[  ]/g, " ").match(/Booking total \| CHF[^|]+\| Pay now \| CHF[^|]+\| Remaining balance \| CHF[^|]+/)?.[0]);
await full("c11-pay-later-tour-en");
await bar.getByRole("button", { name: "DE", exact: true }).click(); await wait(400);
await full("c11-pay-later-tour-de");
await bar.getByRole("button", { name: "EN", exact: true }).click(); await wait(400);
// Keyboard: Tab from the top until the edit row has focus.
await page.evaluate(() => { document.activeElement?.blur(); scrollTo(0, 0); });
let name = "";
for (let i = 0; i < 40 && !/^Edit departure or group$/.test(name); i++) {
  await page.keyboard.press("Tab");
  name = await page.evaluate(() => { const el = document.activeElement; return el?.tagName === "BUTTON" && el.closest("section") ? el.textContent.trim() : ""; });
}
const ring = await page.evaluate(() => { const el = document.activeElement; const s = getComputedStyle(el); return { visible: el.matches(":focus-visible"), shadow: s.boxShadow.slice(0, 90), outline: `${s.outlineStyle} ${s.outlineWidth}` }; });
console.log("edit row focused:", name, JSON.stringify(ring));
await page.evaluate(() => document.activeElement.scrollIntoView({ block: "center" })); await wait(200);
await page.locator("section").filter({ has: page.locator("button", { hasText: "Edit departure or group" }) }).screenshot({ path: `${OUT}/c11-edit-row-focus-tour-en.png` });
await browser.close();
