// Step 1.9s driver: M02 Overview (Today + Analytics) at 375px and 1024px, EN and DE.
// Checks: period switch, chart tooltip on hover and keyboard, table view, empty state,
// overflow, raw i18n keys. Usage: node 1.9s-drive.mjs <screens dir>  (vite on 5219)
import { chromium } from "playwright-core";
import { readdirSync } from "node:fs";

const home = process.env.HOME + "/.cache/ms-playwright/";
const dir = readdirSync(home).filter((d) => d.startsWith("chromium_headless_shell-")).sort().pop();
const exe = `${home}${dir}/chrome-headless-shell-linux64/chrome-headless-shell`;
const OUT = process.argv[2];
const BASE = "http://localhost:5219/";
const browser = await chromium.launch({ executablePath: exe });
const page = await browser.newPage({ viewport: { width: 375, height: 812 }, deviceScaleFactor: 2 });
const log = (...a) => console.log(...a);
let failures = 0;
const check = (name, ok, detail = "") => {
  if (!ok) failures += 1;
  log(`${ok ? "PASS" : "FAIL"} ${name}${ok ? "" : ` :: ${String(detail).slice(0, 400)}`}`);
};
page.on("console", (m) => { if (m.type() === "error") log("CONSOLE", m.text()); });
page.on("pageerror", (e) => log("PAGEERROR", e.message));
const overflow = () => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
const shot = async (name, width) => {
  await page.setViewportSize({ width, height: 800 });
  await page.waitForTimeout(500);
  const h = await page.evaluate(() => document.documentElement.scrollHeight);
  await page.setViewportSize({ width, height: Math.max(h, 700) });
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/${name}.png` });
  const o = await overflow();
  check(`${name} no horizontal overflow`, o <= 0, o);
};
const patch = async (fn, arg) => {
  await page.evaluate(([src, a]) => {
    const s = JSON.parse(localStorage.getItem("sk.demo"));
    new Function("s", "a", src)(s, a);
    localStorage.setItem("sk.demo", JSON.stringify(s));
  }, [fn, arg]);
  await page.goto(BASE + "#/store");
  await page.reload();
  await page.waitForTimeout(1000);
};
const setLang = async (lang) => {
  await page.getByRole("button", { name: lang, exact: true }).click();
  await page.waitForTimeout(400);
};
const analytics = () => page.locator('section[aria-labelledby="overview-analytics"]');
const text = async (loc) => (await loc.innerText()).replace(/\s*\n+\s*/g, " | ");
const L = {
  EN: { title: "Overview", today: "Today", analytics: "Analytics", p30: "30 days", month: "This month", p7: "7 days", table: "Show table", chart: "Show chart", nav: "Overview" },
  DE: { title: "Übersicht", today: "Heute", analytics: "Auswertung", p30: "30 Tage", month: "Dieser Monat", p7: "7 Tage", table: "Tabelle zeigen", chart: "Diagramm zeigen", nav: "Übersicht" },
};

await page.goto(BASE);
await page.evaluate(() => localStorage.clear());
await page.goto(BASE + "#/store");
await page.reload();
await patch("s.role = a", "manager");
await page.waitForTimeout(60);
await page.screenshot({ path: `${OUT}/skeleton-en-375.png` });
await page.waitForTimeout(900);

for (const lang of ["EN", "DE"]) {
  const c = L[lang];
  const lc = lang.toLowerCase();
  await setLang(lang);
  const h1 = await page.locator("main h1").first().innerText();
  check(`${lang} title is ${c.title}`, h1 === c.title, h1);
  const nav = await page.locator("nav").first().innerText();
  check(`${lang} nav label ${c.nav}`, nav.includes(c.nav), nav);
  const h2 = await page.locator("main h2").allInnerTexts();
  check(`${lang} sections Today then Analytics`, h2[0] === c.today && h2.includes(c.analytics), h2);
  log(`[${lang} 7d analytics]`, await text(analytics()));
  for (const w of [375, 1024]) await shot(`overview-7d-${lc}-${w}`, w);
  const raw = await page.evaluate(() => (document.querySelector("main").innerText.match(/\b(overview|merchantToday|merchantOrder)\.[\w.]+/g) ?? []).join(", "));
  check(`${lang} no raw i18n keys`, raw === "", raw);
}

// Period switch (EN, 1024): every KPI and the comparison line change with the period.
await setLang("EN");
await page.setViewportSize({ width: 1024, height: 900 });
const kpis = () => page.locator('dl[aria-label="Key figures"]').innerText().then((t) => t.replace(/\s*\n+\s*/g, " | "));
const compare = () => analytics().locator("p").first().innerText();
const before = await kpis();
const before7 = await compare();
await page.getByRole("tab", { name: "30 days" }).click();
await page.waitForTimeout(500);
const after30 = await kpis();
log("7d KPIs:", before, "\n   ", before7);
log("30d KPIs:", after30, "\n   ", await compare());
check("period switch 7d -> 30d changes KPIs", before !== after30);
check("30 days tab selected", (await page.getByRole("tab", { name: "30 days" }).getAttribute("aria-selected")) === "true");
await shot("overview-30d-en-1024", 1024);
await page.getByRole("tab", { name: "This month" }).click();
await page.waitForTimeout(500);
log("month KPIs:", await kpis(), "\n   ", await compare());
check("this month compares with 1–13 Sept", /1.13 Oct, compared with 1.13 Sept/.test(await compare()), await compare());
await shot("overview-month-en-1024", 1024);
await page.setViewportSize({ width: 375, height: 812 });
await shot("overview-month-en-375", 375);
// Keyboard on the period tabs: arrow keys move the selection.
await page.getByRole("tab", { name: "This month" }).focus();
await page.keyboard.press("ArrowLeft");
await page.waitForTimeout(400);
check("period tabs: ArrowLeft selects 30 days", (await page.getByRole("tab", { name: "30 days" }).getAttribute("aria-selected")) === "true");
await page.keyboard.press("ArrowLeft");
await page.waitForTimeout(400);

// Chart tooltip: hover the money panel, then keyboard on the chart surface.
await page.setViewportSize({ width: 1024, height: 900 });
const trend = page.locator('section[aria-labelledby="overview-trend"]');
await trend.scrollIntoViewIfNeeded();
const surface = trend.locator(".recharts-surface").first();
const box = await surface.boundingBox();
await page.mouse.move(box.x + box.width * 0.6, box.y + box.height * 0.5);
await page.waitForTimeout(400);
const tip = await trend.locator(".recharts-tooltip-wrapper").first().innerText().catch(() => "");
log("hover tooltip:", tip.replace(/\n/g, " | "));
check("hover tooltip shows day, collected and orders", /CHF/.test(tip) && /Orders/.test(tip), tip);
await page.screenshot({ path: `${OUT}/overview-tooltip-en-1024.png`, clip: { x: 0, y: Math.max(0, box.y - 120), width: 1024, height: 520 } });
await page.mouse.move(5, 5);
await page.waitForTimeout(300);
const wrapper = trend.locator(".recharts-wrapper").first();
const focusable = trend.locator('.recharts-surface[tabindex="0"]').first();
await focusable.focus();
await page.keyboard.press("ArrowRight");
await page.waitForTimeout(300);
const tipA = await trend.locator(".recharts-tooltip-wrapper").first().innerText().catch(() => "");
await page.keyboard.press("ArrowRight");
await page.waitForTimeout(300);
const tipB = await trend.locator(".recharts-tooltip-wrapper").first().innerText().catch(() => "");
log("keyboard tooltip:", tipA.replace(/\n/g, " | "), "->", tipB.replace(/\n/g, " | "));
check("keyboard: chart focusable and ArrowRight shows tooltip", /CHF/.test(tipA), tipA);
check("keyboard: ArrowRight moves to the next day", tipA !== tipB && /CHF/.test(tipB), `${tipA} / ${tipB}`);
check("chart wrapper present", (await wrapper.count()) > 0);
await page.screenshot({ path: `${OUT}/overview-keyboard-en-1024.png`, clip: { x: 0, y: Math.max(0, box.y - 120), width: 1024, height: 520 } });

// Table view
await trend.getByRole("button", { name: "Show table" }).click();
await page.waitForTimeout(300);
const rows = await trend.locator("tbody tr").count();
log("table rows (7d):", rows, "| first:", (await trend.locator("tbody tr").first().innerText()).replace(/\s+/g, " "));
check("table view lists one row per day (7)", rows === 7, rows);
await page.screenshot({ path: `${OUT}/overview-table-en-1024.png`, clip: { x: 0, y: Math.max(0, box.y - 120), width: 1024, height: 520 } });
await trend.getByRole("button", { name: "Show chart" }).click();
await page.waitForTimeout(300);

// Bar list tooltip (product groups) on hover
const groups = page.locator('section[aria-labelledby="overview-groups"]');
const gbox = await groups.locator(".recharts-surface").first().boundingBox();
await page.mouse.move(gbox.x + 40, gbox.y + 20);
await page.waitForTimeout(300);
log("groups tooltip:", (await groups.locator(".recharts-tooltip-wrapper").first().innerText().catch(() => "")).replace(/\n/g, " | "));
await page.mouse.move(5, 5);

// Empty: a cleared demo (no orders at all) shows both empty states.
await patch("s.data.orders = []");
for (const lang of ["EN", "DE"]) {
  await setLang(lang);
  const t = await text(page.locator("main"));
  log(`[${lang} empty]`, t);
  check(`${lang} analytics empty state`, lang === "EN" ? t.includes("No orders yet.") : t.includes("Noch keine Bestellungen."), t);
  for (const w of [375, 1024]) await shot(`overview-empty-${lang.toLowerCase()}-${w}`, w);
}
await setLang("EN");
log(failures ? `\n${failures} FAILED` : "\nALL PASS");
await browser.close();
