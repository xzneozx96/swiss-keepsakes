// 4.14 toast probe: does the M19 save toast close on its own? A = pointer left over the toast
// (where Save was), B = after a click elsewhere, C = with another sheet open, D = Mark answered (6 s).
import { chromium } from "playwright-core";
import { readdirSync } from "node:fs";
const BASE = "http://localhost:5253/";
const home = `${process.env.HOME}/.cache/ms-playwright`;
const dir = readdirSync(home).filter((d) => d.startsWith("chromium_headless_shell")).sort().pop();
const browser = await chromium.launch({ executablePath: `${home}/${dir}/chrome-headless-shell-linux64/chrome-headless-shell` });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const page = await browser.newPage({ viewport: { width: 375, height: 812 }, reducedMotion: "reduce" });
await page.goto(BASE);
await page.evaluate(() => { localStorage.clear(); localStorage.setItem("sk.language", JSON.stringify("en")); });
await page.reload(); await wait(900);
await page.evaluate(() => { const s = JSON.parse(localStorage.getItem("sk.demo")); s.role = "owner"; localStorage.setItem("sk.demo", JSON.stringify(s)); });
await page.goto(`${BASE}#/store/requests?tab=questions`); await page.reload(); await wait(1000);
const toasts = () => page.locator('[data-slot="toast"]').count();
const card = page.locator("section", { has: page.locator("#m19-questions-title") });
const save = async () => {
  await card.getByRole("button", { name: "Edit: How many adults are travelling?" }).click(); await wait(600);
  await page.getByRole("dialog").getByRole("button", { name: "Save question" }).click(); await wait(500);
};
// 1. Save, all sheets closed, focus left on the page.
await save();
console.log("A: right after save, sheets closed:", await toasts());
await wait(5500);
console.log("A: 5.5 s later, sheets closed:", await toasts());
// 2. Same, but move the mouse away / click on the page body first.
await save();
await page.mouse.click(10, 300); await wait(5500);
console.log("B: 5.5 s after a click elsewhere:", await toasts());
// 3. Save, then reopen a sheet within 2 s.
await save();
await card.getByRole("button", { name: "Edit: How many children are travelling?" }).click(); await wait(5500);
console.log("C: 5.5 s with a sheet reopened:", await toasts());
await page.keyboard.press("Escape"); await wait(5500);
console.log("C: 5.5 s after closing that sheet:", await toasts());
// 4. Compare with an existing toast: M15 Partners restore / or cart toast on C03? Use the private tour Mark answered toast (no sheet).
await page.goto(`${BASE}#/store/requests?tab=private`); await wait(1000);
await page.getByRole("button", { name: "Mark answered: j.morgan@example.com" }).click(); await wait(400);
console.log("D: mark-answered toast (6 s timeout) right after:", await toasts());
await page.mouse.click(10, 200); await wait(7000);
console.log("D: 7 s later:", await toasts());
await browser.close();
