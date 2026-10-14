// Step 1.9 driver: M02 Today at 375px and 1024px, EN and DE, seed / all-six / empty states.
// Usage: node drive.mjs <screens dir>
import { chromium } from "playwright-core";
import { readdirSync } from "node:fs";

const home = process.env.HOME + "/.cache/ms-playwright/";
const dir = readdirSync(home).filter((d) => d.startsWith("chromium_headless_shell-")).sort().pop();
const exe = `${home}${dir}/chrome-headless-shell-linux64/chrome-headless-shell`;
const OUT = process.argv[2];
const BASE = "http://localhost:5185/";
const browser = await chromium.launch({ executablePath: exe });
const page = await browser.newPage({ viewport: { width: 375, height: 812 }, deviceScaleFactor: 2 });
const log = (...a) => console.log(...a);
page.on("console", (m) => { if (m.type() === "error") log("CONSOLE", m.text()); });
page.on("pageerror", (e) => log("PAGEERROR", e.message));
const overflow = () => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
const shot = async (name, width) => {
  await page.setViewportSize({ width, height: 800 });
  await page.waitForTimeout(400);
  const h = await page.evaluate(() => document.documentElement.scrollHeight);
  await page.setViewportSize({ width, height: Math.max(h, 700) });
  await page.waitForTimeout(200);
  await page.screenshot({ path: `${OUT}/${name}.png` });
  log("shot", name, "overflow:", await overflow());
};
// Rewrites the stored demo state, then reloads Today.
const patch = async (fn, arg) => {
  await page.evaluate(([src, a]) => {
    const s = JSON.parse(localStorage.getItem("sk.demo"));
    // eslint-disable-next-line no-new-func
    new Function("s", "a", src)(s, a);
    localStorage.setItem("sk.demo", JSON.stringify(s));
  }, [fn, arg]);
  await page.goto(BASE + "#/store");
  await page.reload();
  await page.waitForTimeout(800);
};
const readToday = async () => {
  const cards = await page.locator("main section").first().locator("ul a").evaluateAll((as) =>
    as.map((a) => `${a.getAttribute("aria-label")} -> ${a.getAttribute("href")}`));
  const numbers = (await page.locator("main dl").innerText()).replace(/\n+/g, " | ");
  const empty = await page.locator("main section").first().innerText();
  return { cards, numbers, empty: cards.length ? null : empty.replace(/\n+/g, " | ") };
};
const setLang = async (lang) => {
  await page.getByRole("button", { name: lang, exact: true }).click();
  await page.waitForTimeout(300);
};

// Seed, as Manager
await page.goto(BASE);
await page.evaluate(() => localStorage.clear());
await page.goto(BASE + "#/store");
await page.reload();
await patch("s.role = a", "manager");
await page.goto(BASE + "#/store");
await page.reload();
await page.waitForTimeout(60);
await page.screenshot({ path: `${OUT}/today-skeleton.png` });
await page.waitForTimeout(800);

for (const lang of ["EN", "DE"]) {
  await setLang(lang);
  const lc = lang.toLowerCase();
  const r = await readToday();
  log(lang, "seed cards:", JSON.stringify(r.cards, null, 1));
  log(lang, "seed numbers:", r.numbers);
  log(lang, "header:", (await page.locator("main h1 + span").innerText()));
  for (const w of [375, 1024]) await shot(`today-${lc}-${w}`, w);
}

// Every card links to its M03 tab: click each and read ?status= and the selected tab.
await setLang("EN");
await page.setViewportSize({ width: 375, height: 812 });
const n = await page.locator("main section").first().locator("ul a").count();
for (let i = 0; i < n; i++) {
  await page.goto(BASE + "#/store");
  await page.waitForTimeout(700);
  const card = page.locator("main section").first().locator("ul a").nth(i);
  const name = await card.getAttribute("aria-label");
  await card.click();
  await page.waitForTimeout(700);
  const sel = await page.getByRole("tab", { selected: true }).innerText().catch(() => "(no tab)");
  log("click", name, "->", page.url().replace(BASE, ""), "| selected tab:", sel.replace(/\n/g, " "));
}

// Keyboard: Tab reaches the first card with a visible focus ring; Enter opens M03.
await page.goto(BASE + "#/store");
await page.waitForTimeout(700);
await page.locator("main h1").click();
let focused = "";
for (let i = 0; i < 30 && !focused.startsWith("Awaiting confirmation"); i++) {
  await page.keyboard.press("Tab");
  focused = await page.evaluate(() => document.activeElement?.getAttribute("aria-label") ?? "");
}
log("keyboard focus:", focused, "| focus-visible:", await page.evaluate(() => document.activeElement?.matches(":focus-visible")));
await page.screenshot({ path: `${OUT}/today-focus-en-375.png` });
await page.keyboard.press("Enter");
await page.waitForTimeout(600);
log("Enter ->", page.url().replace(BASE, ""));

// Owner sees the same Today
await page.goto(BASE + "#/store");
await patch("s.role = a", "owner");
log("owner header:", (await page.locator("header").first().innerText()).replace(/\n+/g, " | "));
log("owner cards:", JSON.stringify((await readToday()).cards));
await shot("today-owner-en-375", 375);
await patch("s.role = a", "manager");

// All six cards: add a pay-later copy of SK-1025 past its due date (overdue) and a copy of
// SK-1021 handed over with its balance (owing); the seeded orders stay as they are.
await patch(`
  const o = (id) => s.data.orders.find((x) => x.id === id);
  s.data.orders.push({ ...o("sk-1025"), id: "sk-1026", ref: "SK-1026", balanceDueDate: "2026-10-12" });
  s.data.orders.push({ ...o("sk-1021"), id: "sk-1022", ref: "SK-1022", status: "handed_over" });
`);
for (const i of [0, 1, 2, 3, 4, 5]) {
  await page.goto(BASE + "#/store");
  await page.waitForTimeout(700);
  const card = page.locator("main section").first().locator("ul a").nth(i);
  const name = await card.getAttribute("aria-label");
  await card.click();
  await page.waitForTimeout(700);
  const sel = await page.getByRole("tab", { selected: true }).innerText().catch(() => "(no tab)");
  log("six click", name, "->", page.url().replace(BASE, ""), "| selected tab:", sel.replace(/\n/g, " "));
}
await page.goto(BASE + "#/store");
await page.waitForTimeout(700);
for (const lang of ["EN", "DE"]) {
  await setLang(lang);
  const r = await readToday();
  log(lang, "six cards:", JSON.stringify(r.cards, null, 1));
  log(lang, "six numbers:", r.numbers);
  await shot(`today-all-${lang.toLowerCase()}-1024`, 1024);
  await shot(`today-all-${lang.toLowerCase()}-375`, 375);
}

// Empty: only closed orders left.
await patch(`s.data.orders = s.data.orders.filter((o) => ["completed", "cancelled", "declined"].includes(o.status))`);
for (const lang of ["EN", "DE"]) {
  await setLang(lang);
  const r = await readToday();
  log(lang, "empty:", r.empty, "| numbers:", r.numbers);
  for (const w of [375, 1024]) await shot(`today-empty-${lang.toLowerCase()}-${w}`, w);
}
await page.getByRole("link", { name: "See all orders" }).click().catch(async () => {
  await page.getByRole("link", { name: "Alle Bestellungen ansehen" }).click();
});
await page.waitForTimeout(500);
log("empty action ->", page.url().replace(BASE, ""));

// Leave the browser on seed data.
await page.evaluate(() => localStorage.clear());
await browser.close();
