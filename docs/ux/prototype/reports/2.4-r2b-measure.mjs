// R1 fix pass: measure C10 tile spacing, header title and selected tile colours.
import { chromium } from "playwright-core";
import { readdirSync } from "node:fs";
const home = process.env.HOME + "/.cache/ms-playwright/";
const dir = readdirSync(home).filter((d) => d.startsWith("chromium_headless_shell-")).sort().pop();
const browser = await chromium.launch({ executablePath: `${home}${dir}/chrome-headless-shell-linux64/chrome-headless-shell` });
const page = await browser.newPage({ viewport: { width: 375, height: 812 } });
await page.goto("http://localhost:5231/"); await page.evaluate(() => localStorage.clear());
await page.goto("http://localhost:5231/#/tours/lucerne-old-town-walk/book"); await page.waitForTimeout(1500);
await page.locator(".radio").filter({ hasText: "Fri 16 Oct" }).click(); await page.waitForTimeout(300);
console.log(JSON.stringify(await page.evaluate(() => {
  const group = document.querySelector(".radio-group");
  const label = group.querySelector(".label, [data-slot=label]") ?? group.firstElementChild;
  const tiles = [...group.querySelectorAll("[data-slot=radio]")].map((e) => e.getBoundingClientRect());
  const gaps = tiles.slice(1).map((r, i) => Math.round(r.top - tiles[i].bottom));
  const sel = group.querySelector("[data-slot=radio][data-selected=true]");
  const title = document.querySelector("header span");
  const ts = getComputedStyle(title);
  return {
    labelToFirstTile: Math.round(tiles[0].top - label.getBoundingClientRect().bottom),
    tileGaps: gaps,
    tileMarginTop: getComputedStyle(group.querySelector("[data-slot=radio]")).marginTop,
    selectedTextColours: [...sel.querySelectorAll("span.font-semibold, [data-slot=description], .description")].map((e) => getComputedStyle(e).color),
    headerTitle: `${ts.fontFamily.split(",")[0]} ${ts.fontSize} ${ts.fontWeight}`,
  };
}), null, 1));
await browser.close();
