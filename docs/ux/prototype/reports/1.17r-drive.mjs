// Step 1.17r verification: the redesigned P02 (analytics view) as Partner (Hotel am See), EN and DE, 375px and 1024px.
// Adapted from 1.17-drive.mjs: same states, plus the chart (columns, readout, keyboard) and the four KPI widgets.
// Usage: node 1.17r-drive.mjs <screens dir>   (Vite on port 5213; needs playwright-core resolvable next to the script)
import { chromium } from "playwright-core";
import { readdirSync } from "node:fs";
const home = process.env.HOME + "/.cache/ms-playwright/";
const dir = readdirSync(home).filter((d) => d.startsWith("chromium_headless_shell-")).sort().pop();
const exe = `${home}${dir}/chrome-headless-shell-linux64/chrome-headless-shell`;
const OUT = process.argv[2];
const BASE = "http://localhost:5213/";
const browser = await chromium.launch({ executablePath: exe });
const context = await browser.newContext({ viewport: { width: 375, height: 812 }, deviceScaleFactor: 2 });
const page = await context.newPage();
const log = (...a) => console.log(...a);
let pass = 0, fail = 0;
const check = (name, ok, extra = "") => { ok ? pass++ : fail++; log(ok ? "PASS" : "FAIL", name, ok ? "" : String(extra).slice(0, 800)); };
page.on("console", (m) => { if (m.type() === "error") log("CONSOLE", m.text()); });
page.on("pageerror", (e) => log("PAGEERROR", e.message));
let width = 375;
const overflow = () => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
const clean = (s) => s.replace(/\n+/g, " | ").replace(/[\u00a0\u202f\u2009]/g, " ");
const mainText = async () => clean(await page.locator("main").innerText());
const shot = async (name) => {
  await page.waitForTimeout(400);
  const h = await page.evaluate(() => document.documentElement.scrollHeight);
  await page.setViewportSize({ width, height: Math.max(812, h) });
  await page.waitForTimeout(200);
  await page.screenshot({ path: `${OUT}/after-drive-${name}.png` });
  await page.setViewportSize({ width, height: 812 });
  check(`no horizontal overflow (${name})`, (await overflow()) <= 0);
};
const setLang = async (id) => {
  await page.getByRole("group", { name: /Language|Sprache/ }).getByRole("button", { name: id }).click();
  await page.waitForTimeout(300);
};
const openControls = async () => {
  await page.getByRole("region", { name: "Prototype controls" }).getByRole("button").first().click();
  await page.getByRole("dialog").waitFor();
  await page.waitForTimeout(300);
};
const settle = () => page.waitForTimeout(700);
const others = ["SK-1032", "SK-1033", "SK-1025", "SK-1021", "SK-1019", "SK-1012", "SK-1015"];
const L = {
  EN: { day: "Day", week: "Week", month: "Month", prev: "Previous period", next: "Next period", earned: "Commission after adjustments", paid: "Actually paid", toPay: "Still to pay", est: "Estimated, not recorded", rec: "Recorded", group: "Pocket knives", groupSum: "3 orders · CHF 167.00", hintEst: "+CHF 11.30 estimated on open orders", orders: "Orders", ordersHint: "1 completed · 2 open", chartMonth: "Commission by week", chartWeek: "Commission by day", chartDay: "Commission by hour", readout: "CHF 0.00 recorded · CHF 11.30 estimated", recordedCol: "5–11 Oct: CHF 5.40 recorded, CHF 0.00 estimated, 1 order", hourCol: "08:00–09:00: CHF 0.00 recorded, CHF 4.90 estimated, 1 order", empty: "No transactions in this period.", back: "Show this month", month10: "October 2026", week: "Week", weekRange: "Mon 12 Oct – Sun 18 Oct", today: "Tue 13 Oct", sunday: "Sun 11 Oct", status: ["Requested", "Accepted", "Completed"] },
  DE: { day: "Tag", week: "Woche", month: "Monat", prev: "Vorheriger Zeitraum", next: "Nächster Zeitraum", earned: "Provision nach Anpassungen", paid: "Tatsächlich ausbezahlt", toPay: "Noch auszuzahlen", est: "Geschätzt, nicht verbucht", rec: "Verbucht", group: "Taschenmesser", groupSum: "3 Bestellungen · CHF 167.00", hintEst: "+CHF 11.30 geschätzt aus offenen Bestellungen", orders: "Bestellungen", ordersHint: "1 abgeschlossen · 2 offen", chartMonth: "Provision nach Woche", chartWeek: "Provision nach Tag", chartDay: "Provision nach Stunde", readout: "CHF 0.00 verbucht · CHF 11.30 geschätzt", recordedCol: "5–11. Okt.: CHF 5.40 verbucht, CHF 0.00 geschätzt, 1 Bestellung", hourCol: "08:00–09:00: CHF 0.00 verbucht, CHF 4.90 geschätzt, 1 Bestellung", empty: "Keine Transaktionen in diesem Zeitraum.", back: "Diesen Monat anzeigen", month10: "Oktober 2026", weekRange: "Mo., 12. Okt. – So., 18. Okt.", today: "Di., 13. Okt.", sunday: "So., 11. Okt." },
};
const count = (text, s) => text.split(s).length - 1;

// Reset, then switch role to Partner through the prototype bar (lands on /partner).
await page.goto(BASE);
await settle();
await openControls();
await page.getByRole("button", { name: "Reset demo" }).click();
await settle();
await openControls();
await page.getByRole("radio", { name: /^Partner/ }).click({ force: true });
await page.waitForTimeout(300);
await page.keyboard.press("Escape");
await settle();
check("role Partner lands on /partner", page.url().includes("#/partner"), page.url());

for (const lang of ["EN", "DE"]) {
  const c = L[lang];
  width = 375;
  await page.setViewportSize({ width, height: 812 });
  await setLang(lang);
  await page.goto(BASE + "#/partner");
  await page.waitForTimeout(100);
  if (lang === "EN") await shot("loading-en");
  await settle();
  let t = await mainText();
  log(`\n[${lang} month] ${t}`);
  check(`${lang} month label`, t.includes(c.month10), t);
  check(`${lang} only Hotel am See refs`, ["SK-1031", "SK-1028", "SK-1017"].every((r) => t.includes(r)) && others.every((r) => !t.includes(r)), t);
  check(`${lang} no contact, engraving or pickup details`, !/@|example\.com|Papa|Altstadt|Bahnhof|\+41/.test(t), t);
  check(`${lang} numbers 5.40 / 0.00 / 5.40`, new RegExp(`${c.earned} \\| CHF 5\\.40 .*${c.paid} \\| CHF 0\\.00 .*${c.toPay} \\| CHF 5\\.40`).test(t), t);
  check(`${lang} estimated hint`, t.includes(c.hintEst), t);
  check(`${lang} orders widget 3 with hint`, new RegExp(`${c.orders} \\| 3 \\| ${c.ordersHint}`).test(t), t);
  check(`${lang} chart title`, t.includes(c.chartMonth), t);
  check(`${lang} readout opens on the running week (12–18 Oct)`, t.includes(c.readout), t);
  const cols = await page.getByRole("group", { name: new RegExp(c.chartMonth) }).getByRole("button").evaluateAll((b) => b.map((x) => x.getAttribute("aria-label").replace(/[\u00a0\u202f]/g, " ")));
  check(`${lang} 3 drawn month columns (19–31 Oct are future, not drawn)`, cols.length === 3, cols);
  check(`${lang} column aria-label`, cols.includes(c.recordedCol), cols);
  // Keyboard: Tab to the first week column, then Tab to the next; the readout follows focus.
  await page.getByRole("group", { name: new RegExp(c.chartMonth) }).getByRole("button").first().focus();
  await page.keyboard.press("Tab");
  await page.waitForTimeout(200);
  const focused = await page.evaluate(() => document.activeElement?.getAttribute("aria-label")?.replace(/[\u00a0\u202f]/g, " "));
  const ro = clean(await page.locator("p[aria-live]").first().innerText());
  check(`${lang} Tab moves along columns and the readout follows`, focused === c.recordedCol && ro.includes("CHF 5.40"), `${focused} / ${ro}`);
  if (lang === "EN") await shot("chart-focus-en");
  check(`${lang} group summary`, t.includes(c.group) && t.includes(c.groupSum), t);
  check(`${lang} two estimated rows, one recorded`, count(t, c.est) === 2 && count(t, `| ${c.rec}`) >= 1, t);
  check(`${lang} guest names`, ["Tom Becker", "Daniel Meier", "Marie Dubois"].every((n) => t.includes(n)), t);
  check(`${lang} next disabled in current period`, await page.getByRole("button", { name: c.next }).isDisabled());
  await shot(`month-${lang.toLowerCase()}`);

  await page.getByRole("tab", { name: c.week }).click();
  await settle();
  t = await mainText();
  check(`${lang} week shows 12–18 Oct, 2 rows`, t.includes(c.weekRange) && t.includes("SK-1031") && t.includes("SK-1028") && !t.includes("SK-1017"), t);
  check(`${lang} week numbers 0.00 earned`, new RegExp(`${c.earned} \\| CHF 0\\.00`).test(t), t);
  const days = await page.getByRole("group", { name: new RegExp(c.chartWeek) }).getByRole("button").count();
  check(`${lang} week chart: Mon and Tue drawn, Wed–Sun future`, days === 2, days);
  await shot(`week-${lang.toLowerCase()}`);

  await page.getByRole("tab", { name: c.day }).click();
  await settle();
  t = await mainText();
  check(`${lang} day 13 Oct, 1 row`, t.includes(c.today) && t.includes("SK-1031") && !t.includes("SK-1028"), t);
  const hours = await page.getByRole("group", { name: new RegExp(c.chartDay) }).getByRole("button").evaluateAll((b) => b.map((x) => x.getAttribute("aria-label").replace(/[\u00a0\u202f]/g, " ")));
  check(`${lang} day chart: hours 00–10 drawn, later hours future`, hours.length === 11 && hours.includes(c.hourCol), hours);
  await shot(`day-${lang.toLowerCase()}`);

  await page.getByRole("button", { name: c.prev }).click();
  await settle();
  await page.getByRole("button", { name: c.prev }).click();
  await settle();
  t = await mainText();
  check(`${lang} empty on Sun 11 Oct`, t.includes(c.sunday) && t.includes(c.empty) && t.includes(c.back), t);
  await shot(`empty-${lang.toLowerCase()}`);
  await page.getByRole("link", { name: c.back }).click();
  await settle();
  t = await mainText();
  check(`${lang} empty action returns to this month`, t.includes(c.month10) && t.includes("SK-1017"), t);

  // Keyboard: focus the selected tab, arrow to the next one.
  await page.getByRole("tab", { name: c.month }).focus();
  await page.keyboard.press("ArrowLeft");
  await settle();
  const sel = await page.getByRole("tab", { selected: true }).innerText();
  check(`${lang} arrow keys move between periods`, sel.trim() === c.week, sel);
  await page.getByRole("tab", { name: c.month }).click();
  await settle();

  width = 1024;
  await page.setViewportSize({ width, height: 812 });
  await settle();
  check(`${lang} table at 1024px`, await page.getByRole("grid").or(page.getByRole("table")).first().isVisible());
  const clip = await page.evaluate(() => [...document.querySelectorAll("table")].map((t) => { const c = t.parentElement; return c.scrollWidth - c.clientWidth; }));
  check(`${lang} table not clipped at 1024px`, clip.length > 0 && clip.every((d) => d <= 0), clip);
  await shot(`month-${lang.toLowerCase()}-1024`);
  await page.getByRole("tab", { name: c.day }).click();
  await settle();
  await page.getByRole("button", { name: c.prev }).click();
  await settle();
  await page.getByRole("button", { name: c.prev }).click();
  await settle();
  await shot(`empty-${lang.toLowerCase()}-1024`);
}

// Missing i18n keys would show as raw "partnerReport." strings.
const body = await page.locator("body").innerText();
check("no raw i18n keys", !/partnerReport\.|order\.(status|commission)\./.test(body), body);
log(`\n${pass} PASS, ${fail} FAIL`);
await browser.close();
process.exit(fail ? 1 : 0);
