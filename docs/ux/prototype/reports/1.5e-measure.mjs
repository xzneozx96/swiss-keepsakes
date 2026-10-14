// Step 1.5e: measure the C04 gap between the last cart line and the fixed bottom bar.
// Run: NODE_PATH=<dir with playwright-core> node 1.5e-measure.mjs [label] against vite --port 5199.
import { chromium } from "playwright-core";
import { readdirSync } from "node:fs";

const home = process.env.HOME + "/.cache/ms-playwright/";
const dir = readdirSync(home).filter((d) => d.startsWith("chromium_headless_shell-")).sort().pop();
const browser = await chromium.launch({ executablePath: `${home}${dir}/chrome-headless-shell-linux64/chrome-headless-shell` });
const page = await browser.newPage({ viewport: { width: 375, height: 812 }, deviceScaleFactor: 2 });
const BASE = "http://localhost:5199/";
await page.goto(BASE);
await page.waitForTimeout(800);
await page.evaluate(() => {
  const s = JSON.parse(localStorage.getItem("sk.demo"));
  const line = (id, productId, variantId, pickupDate, pickupPlaceId, extra = {}) => ({ id, productId, variantId, quantity: 1, pickupDate, pickupPlaceId, ...extra });
  s.data.cart = [
    line("l1", "p-knife", "m", "2026-10-21", "altstadt", { engraving: "Anna", selected: true }),
    line("l2", "p-giftbox", "std", "2026-10-20", "altstadt", { selected: true }),
    line("l3", "p-chocolate", "12", "2026-10-20", "bahnhof"),
  ];
  localStorage.setItem("sk.demo", JSON.stringify(s));
});
await page.goto(BASE + "#/cart");
await page.reload();
await page.waitForTimeout(1500);
await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
await page.waitForTimeout(300);
const m = await page.evaluate(() => {
  const lis = [...document.querySelectorAll("main li")];
  const last = lis[lis.length - 1].getBoundingClientRect();
  const bar = document.querySelector("[data-cart-bar]") ?? [...document.querySelectorAll("div.fixed.bottom-0")].pop();
  const b = bar.getBoundingClientRect();
  const main = document.querySelector("main");
  const content = main.firstElementChild;
  const list = document.querySelector("main ul");
  return {
    viewport: innerHeight,
    lastCardBottom: Math.round(last.bottom),
    barTop: Math.round(b.top),
    barHeight: Math.round(b.height),
    gapLastCardToBar: Math.round(b.top - last.bottom),
    mainPaddingBottom: getComputedStyle(main).paddingBottom,
    listParentPaddingBottom: getComputedStyle(list.parentElement).paddingBottom,
    contentChildPaddingBottom: getComputedStyle(content).paddingBottom,
  };
});
console.log(process.argv[2] ?? "", JSON.stringify(m));
await page.screenshot({ path: process.argv[3] ?? "/dev/null" }).catch(() => {});
await browser.close();
