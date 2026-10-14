import { chromium } from "playwright-core";
import { readdirSync } from "node:fs";
const home = process.env.HOME + "/.cache/ms-playwright/";
const dir = readdirSync(home).filter((d) => d.startsWith("chromium_headless_shell-")).sort().pop();
const browser = await chromium.launch({ executablePath: `${home}${dir}/chrome-headless-shell-linux64/chrome-headless-shell` });
const page = await browser.newPage({ viewport: { width: 375, height: 812 } });
await page.goto("http://localhost:5199/#/gifts/kapellbruecke-pocket-knife"); await page.waitForTimeout(1800);
await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight)); await page.waitForTimeout(300);
console.log(JSON.stringify(await page.evaluate(() => {
  const items = document.querySelectorAll("main .accordion__item");
  const last = items[items.length - 1].getBoundingClientRect();
  const trig = items[items.length - 1].querySelector("button").getBoundingClientRect();
  const bar = [...document.querySelectorAll("main *")].find((e) => ["fixed","sticky"].includes(getComputedStyle(e).position) && getComputedStyle(e).bottom === "0px");
  const b = bar.getBoundingClientRect();
  return { lastItemBottomToBar: Math.round(b.top - last.bottom), lastRowTextBoxToBar: Math.round(b.top - trig.bottom), barHeight: Math.round(b.height) };
})));
await browser.close();
