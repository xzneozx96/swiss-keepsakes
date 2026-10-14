// 1.9t copy of 1.9s-1.9r-drive.mjs: port 5221 only.
// Step 1.9r driver: M02 Today widget dashboard at 375px and 1024px, EN and DE.
// States: skeleton, seed, all six tasks, alerts only, empty, owner; links, keyboard, overflow.
// Usage: node 1.9r-drive.mjs <screens dir>   (node_modules with playwright-core next to it)
import { chromium } from "playwright-core";
import { readdirSync } from "node:fs";

const home = process.env.HOME + "/.cache/ms-playwright/";
const dir = readdirSync(home).filter((d) => d.startsWith("chromium_headless_shell-")).sort().pop();
const exe = `${home}${dir}/chrome-headless-shell-linux64/chrome-headless-shell`;
const OUT = process.argv[2];
const BASE = "http://localhost:5221/";
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
const patch = async (fn, arg) => {
  await page.evaluate(([src, a]) => {
    const s = JSON.parse(localStorage.getItem("sk.demo"));
    new Function("s", "a", src)(s, a);
    localStorage.setItem("sk.demo", JSON.stringify(s));
  }, [fn, arg]);
  await page.goto(BASE + "#/store");
  await page.reload();
  await page.waitForTimeout(800);
};
const read = () => page.evaluate(() => {
  const main = document.querySelector("main");
  const links = [...main.querySelectorAll("a")].map((a) => `${(a.getAttribute("aria-label") ?? a.innerText).replace(/\s+/g, " ").trim()} -> ${a.getAttribute("href")}`);
  const groups = [...main.querySelectorAll('[role="group"]')].map((g) => g.getAttribute("aria-label"));
  const sections = [...main.querySelectorAll("section")].map((s) => s.innerText.replace(/\s*\n+\s*/g, " | "));
  return { links, zeroTiles: groups, sections };
});
const setLang = async (lang) => {
  await page.getByRole("button", { name: lang, exact: true }).click();
  await page.waitForTimeout(300);
};
const report = async (tag) => {
  const r = await read();
  log(`== ${tag}`);
  r.sections.forEach((s) => log("  section:", s));
  log("  links:", JSON.stringify(r.links, null, 1));
  log("  zero tiles (not links):", JSON.stringify(r.zeroTiles));
};
// Clicks every link whose href has ?status= and reads the selected M03 tab.
const clickStatusLinks = async (tag) => {
  const hrefs = await page.locator('main a[href*="status="]').evaluateAll((as) => as.map((a) => [a.getAttribute("aria-label") ?? a.innerText.replace(/\s+/g, " "), a.getAttribute("href")]));
  for (const [name, href] of hrefs) {
    await page.goto(BASE + "#/store");
    await page.waitForTimeout(700);
    await page.locator(`main a[href="${href}"]`).first().click();
    await page.waitForTimeout(700);
    const sel = await page.getByRole("tab", { selected: true }).first().innerText().catch(() => "(no tab)");
    log(`${tag} click`, name, "->", page.url().replace(BASE, ""), "| selected tab:", sel.replace(/\n/g, " "));
  }
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
await page.screenshot({ path: `${OUT}/after-skeleton-en-375.png` });
await page.waitForTimeout(800);

for (const lang of ["EN", "DE"]) {
  await setLang(lang);
  const lc = lang.toLowerCase();
  await report(`${lang} seed`);
  for (const w of [375, 1024]) await shot(`after-tasks-${lc}-${w}`, w);
}
await setLang("EN");
await page.setViewportSize({ width: 375, height: 812 });
await clickStatusLinks("seed");

// Pickup row opens M04
await page.goto(BASE + "#/store");
await page.waitForTimeout(700);
await page.locator('main a[href*="/store/orders/sk-"]').first().click();
await page.waitForTimeout(700);
log("pickup row ->", page.url().replace(BASE, ""), "| h1:", await page.locator("main h1").first().innerText().catch(() => "?"));

// Keyboard: Tab reaches the first tile with focus-visible; Enter opens M03.
await page.goto(BASE + "#/store");
await page.waitForTimeout(700);
await page.locator("main h1").click();
let focused = "";
for (let i = 0; i < 40 && !focused.startsWith("Awaiting confirmation"); i++) {
  await page.keyboard.press("Tab");
  focused = await page.evaluate(() => document.activeElement?.getAttribute("aria-label") ?? "");
}
log("keyboard focus:", focused, "| focus-visible:", await page.evaluate(() => document.activeElement?.matches(":focus-visible")));
await page.screenshot({ path: `${OUT}/after-focus-en-375.png` });
const order = [];
for (let i = 0; i < 12; i++) {
  await page.keyboard.press("Tab");
  order.push(await page.evaluate(() => { const a = document.activeElement; return (a.getAttribute("aria-label") ?? a.innerText ?? a.textContent ?? a.tagName).replace(/\s+/g, " ").slice(0, 40); }));
}
log("tab order after first tile:", JSON.stringify(order));
await page.locator("main h1").click();
for (let i = 0; i < 40; i++) {
  await page.keyboard.press("Tab");
  if ((await page.evaluate(() => document.activeElement?.getAttribute("aria-label") ?? "")).startsWith("Awaiting confirmation")) break;
}
await page.keyboard.press("Enter");
await page.waitForTimeout(600);
log("Enter ->", page.url().replace(BASE, ""));

// Owner sees the same Today
await page.goto(BASE + "#/store");
await patch("s.role = a", "owner");
log("owner header:", (await page.locator("header").first().innerText()).replace(/\n+/g, " | "));
await report("owner");
await shot("after-owner-en-375", 375);
await patch("s.role = a", "manager");

// All six tasks: a pay-later copy of SK-1025 past its due date (overdue) and a copy of
// SK-1021 handed over with its balance (owing); same patch as step 1.9.
await patch(`
  const o = (id) => s.data.orders.find((x) => x.id === id);
  s.data.orders.push({ ...o("sk-1025"), id: "sk-1026", ref: "SK-1026", balanceDueDate: "2026-10-12" });
  s.data.orders.push({ ...o("sk-1021"), id: "sk-1022", ref: "SK-1022", status: "handed_over" });
`);
for (const lang of ["EN", "DE"]) {
  await setLang(lang);
  await report(`${lang} all six`);
  for (const w of [375, 1024]) await shot(`after-all-${lang.toLowerCase()}-${w}`, w);
}
await setLang("EN");
await page.setViewportSize({ width: 375, height: 812 });
await clickStatusLinks("six");

// Alerts only: every order closed except the overdue copy, so the four tiles are all 0.
await patch(`s.data.orders = s.data.orders.filter((o) => ["completed", "cancelled", "declined"].includes(o.status) || o.id === "sk-1026")`);
await report("alerts only");
await shot("after-alerts-only-en-375", 375);

// Empty: only closed orders left.
await patch(`s.data.orders = s.data.orders.filter((o) => ["completed", "cancelled", "declined"].includes(o.status))`);
for (const lang of ["EN", "DE"]) {
  await setLang(lang);
  await report(`${lang} empty`);
  for (const w of [375, 1024]) await shot(`after-empty-${lang.toLowerCase()}-${w}`, w);
}
await setLang("EN");
await page.getByRole("link", { name: "See all orders" }).click();
await page.waitForTimeout(500);
log("empty action ->", page.url().replace(BASE, ""));

// i18n: DE shows no raw keys
await page.goto(BASE + "#/store");
await page.waitForTimeout(700);
await setLang("DE");
log("DE raw keys:", await page.evaluate(() => (document.querySelector("main").innerText.match(/merchant\w*\.[\w.]+/g) ?? []).join(", ") || "none"));
await setLang("EN");
await browser.close();
