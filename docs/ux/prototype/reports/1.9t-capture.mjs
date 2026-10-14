// Step 1.9t capture: Overview Today tiles, Overview KPIs, the all-time widgets and P02,
// at 375px and 1024px, EN and DE. Usage: node 1.9t-capture.mjs <before|after> <screens dir>
// (Vite on 5221; needs playwright-core resolvable next to the script).
import { chromium } from "playwright-core";
import { readdirSync } from "node:fs";

const home = process.env.HOME + "/.cache/ms-playwright/";
const dir = readdirSync(home).filter((d) => d.startsWith("chromium_headless_shell-")).sort().pop();
const exe = `${home}${dir}/chrome-headless-shell-linux64/chrome-headless-shell`;
const [PHASE, OUT] = process.argv.slice(2);
const BASE = "http://localhost:5221/";
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
const fit = async (width) => {
  await page.setViewportSize({ width, height: 800 });
  await page.waitForTimeout(500);
  const h = await page.evaluate(() => document.documentElement.scrollHeight);
  await page.setViewportSize({ width, height: Math.max(h, 700) });
  await page.waitForTimeout(400);
};
const crop = async (selector, name) => {
  const loc = page.locator(selector).first();
  if (!(await loc.count())) return log(`SKIP ${name} (no ${selector})`);
  await loc.screenshot({ path: `${OUT}/${PHASE}-${name}.png` });
};
const patch = async (src, arg, route) => {
  await page.evaluate(([s0, a]) => {
    const s = JSON.parse(localStorage.getItem("sk.demo"));
    new Function("s", "a", s0)(s, a);
    localStorage.setItem("sk.demo", JSON.stringify(s));
  }, [src, arg]);
  await page.goto(BASE + route);
  await page.reload();
  await page.waitForTimeout(1200);
};
const setLang = async (lang) => {
  await page.getByRole("button", { name: lang, exact: true }).click();
  await page.waitForTimeout(400);
};

await page.goto(BASE);
await page.evaluate(() => localStorage.clear());
await page.goto(BASE + "#/store");
await page.reload();
await page.waitForTimeout(1200);
await patch("s.role = a", "manager", "#/store");

for (const lang of ["EN", "DE"]) {
  const lc = lang.toLowerCase();
  await setLang(lang);
  for (const w of [375, 1024]) {
    await fit(w);
    await page.screenshot({ path: `${OUT}/${PHASE}-overview-${lc}-${w}.png` });
    check(`${PHASE} overview ${lang} ${w} no overflow`, (await overflow()) <= 0, await overflow());
    await crop('section[aria-labelledby="today-tasks"]', `today-${lc}-${w}`);
    await crop('dl[aria-label="Key figures"], dl[aria-label="Kennzahlen"]', `kpis-${lc}-${w}`);
    await crop('section[aria-labelledby="overview-alltime"]', `alltime-${lc}-${w}`);
  }
}

await setLang("EN");
await patch("s.role = a", "partner", "#/partner");
for (const lang of ["EN", "DE"]) {
  const lc = lang.toLowerCase();
  await setLang(lang);
  for (const w of [375, 1024]) {
    await fit(w);
    await page.screenshot({ path: `${OUT}/${PHASE}-p02-${lc}-${w}.png` });
    check(`${PHASE} P02 ${lang} ${w} no overflow`, (await overflow()) <= 0, await overflow());
    await crop('section[aria-labelledby="report-numbers"]', `p02-kpis-${lc}-${w}`);
    await crop('section[aria-labelledby="report-alltime"]', `p02-alltime-${lc}-${w}`);
  }
  const raw = await page.evaluate(() => (document.querySelector("main").innerText.match(/\b(overview|merchantToday|partnerReport)\.[\w.]+/g) ?? []).join(", "));
  check(`${PHASE} P02 ${lang} no raw keys`, raw === "", raw);
}

await browser.close();
log(failures ? `FAILURES ${failures}` : "ALL PASS");
