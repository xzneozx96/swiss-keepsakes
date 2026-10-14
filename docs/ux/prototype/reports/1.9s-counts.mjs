// Step 1.9s: demo-path counts that the analytics history must not change.
// Reads M02 Today tasks, M03 tab labels (with counts) and P02 Hotel am See numbers from a fresh seed.
// Usage: node 1.9s-counts.mjs   (node_modules with playwright-core next to it; vite on 5219)
import { chromium } from "playwright-core";
import { readdirSync } from "node:fs";

const home = process.env.HOME + "/.cache/ms-playwright/";
const dir = readdirSync(home).filter((d) => d.startsWith("chromium_headless_shell-")).sort().pop();
const exe = `${home}${dir}/chrome-headless-shell-linux64/chrome-headless-shell`;
const BASE = "http://localhost:5219/";
const browser = await chromium.launch({ executablePath: exe });
const page = await browser.newPage({ viewport: { width: 1024, height: 900 } });
page.on("pageerror", (e) => console.log("PAGEERROR", e.message));
const role = async (r) => {
  await page.evaluate((r) => {
    const s = JSON.parse(localStorage.getItem("sk.demo"));
    s.role = r;
    localStorage.setItem("sk.demo", JSON.stringify(s));
  }, r);
};
const text = (sel) => page.locator(sel).first().innerText().then((t) => t.replace(/\s*\n+\s*/g, " | "));

await page.goto(BASE);
await page.evaluate(() => localStorage.clear());
await page.goto(BASE + "#/store");
await page.reload();
await page.waitForTimeout(800);
await role("manager");
await page.goto(BASE + "#/store");
await page.reload();
await page.waitForTimeout(1200);
// M02 Today: the task tiles and alert rows (aria-labels carry the counts).
const tasks = await page.evaluate(() =>
  [...document.querySelectorAll('main [aria-labelledby="today-tasks"] [aria-label], main [aria-labelledby="today-attention"] [aria-label]')].map((e) => e.getAttribute("aria-label")),
);
console.log("M02 tasks:", JSON.stringify(tasks));
await page.goto(BASE + "#/store/orders");
await page.waitForTimeout(1200);
const tabs = await page.getByRole("tab").allInnerTexts();
console.log("M03 tabs:", JSON.stringify(tabs.map((t) => t.replace(/\s+/g, " ").trim())));
await role("partner");
await page.goto(BASE + "#/partner");
await page.reload();
await page.waitForTimeout(1500);
console.log("P02 Hotel am See:", await text("main"));
await browser.close();
