// Shared helpers for the 1.18 flow check. Labels come from the real en.ts/de.ts so one script runs in both languages.
import { chromium } from "playwright-core";
import { readdirSync, readFileSync } from "node:fs";

const SRC = "/home/ross-geller/Projects/minastik/swiss-keepsakes/front-end/src/i18n/";
function parseDict(file) {
  const text = readFileSync(SRC + file, "utf8");
  const out = {};
  const re = /"([A-Za-z0-9_.]+)":\s*("(?:\\.|[^"\\])*")/g;
  let m;
  while ((m = re.exec(text))) out[m[1]] = JSON.parse(m[2]);
  return out;
}
export const DICT = { en: parseDict("en.ts"), de: parseDict("de.ts") };
// English fragments (>= 12 chars, outside {params}) whose German value differs: seeing one in DE means a string skipped t().
const EN_ONLY = [...new Set(Object.entries(DICT.en).filter(([k, v]) => DICT.de[k] !== undefined && DICT.de[k] !== v)
  .flatMap(([, v]) => v.split(/\{[^}]+\}/)).map((f) => f.replace(/[\u00a0\u202f]/g, " ").replace(/\s+/g, " ").trim()).filter((f) => f.length >= 12))]
  .filter((f) => !Object.values(DICT.de).some((d) => d.includes(f)));
export const BASE = "http://localhost:5194/";
export const OUT = "/home/ross-geller/Projects/minastik/swiss-keepsakes/docs/ux/prototype/screens/1.18";

export async function start() {
  const home = process.env.HOME + "/.cache/ms-playwright/";
  const dir = readdirSync(home).filter((d) => d.startsWith("chromium_headless_shell-")).sort().pop();
  const browser = await chromium.launch({ executablePath: `${home}${dir}/chrome-headless-shell-linux64/chrome-headless-shell` });
  const ctx = await browser.newContext({ viewport: { width: 375, height: 812 }, deviceScaleFactor: 2, permissions: ["clipboard-read", "clipboard-write"] });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
  page.on("console", (m) => m.type() === "error" && errors.push("console: " + m.text()));
  const results = [];
  let lang = "en";
  const norm = (s) => s.replace(/[\u00a0\u202f]/g, " ").replace(/\s+/g, " ");
  const T = (key, vars = {}) => {
    let s = DICT[lang][key];
    if (s == null) throw new Error("no key " + key);
    for (const [k, v] of Object.entries(vars)) s = s.split(`{${k}}`).join(v);
    return norm(s);
  };
  const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const rx = (key, vars) => new RegExp(esc(T(key, vars)));
  const check = (id, cond, detail = "") => {
    results.push({ id, lang, pass: !!cond, detail: String(detail).slice(0, 300) });
    console.log(`${cond ? "PASS" : "FAIL"} [${lang}] ${id}${detail && !cond ? " :: " + String(detail).slice(0, 400) : ""}`);
    return !!cond;
  };
  const text = async (loc = page.locator("body")) => norm(await loc.innerText());
  const mainText = () => text(page.locator("main").first());
  const bar = page.getByRole("region", { name: "Prototype controls" });
  const generic = async (name) => {
    const r = await page.evaluate(() => ({
      overflow: document.documentElement.scrollWidth - window.innerWidth,
      body: document.body.innerText,
    }));
    const raw = (r.body.match(/\b[a-z][a-zA-Z]+\.[a-z][a-zA-Z]+(\.[a-zA-Z]+)*\b/g) || []).filter((k) => {
      const root = k.split(".")[0];
      return Object.keys(DICT.en).some((key) => key.startsWith(root + ".")) && DICT.en[k] !== undefined;
    });
    const braces = r.body.match(/\{[a-zA-Z]+\}/g) || [];
    if (lang === "de") {
      const visible = await page.evaluate(() => {
        return document.body.innerText.replace(document.querySelector('[aria-label="Prototype controls"]')?.innerText ?? "", "");
      });
      const v = norm(visible);
      const hits = EN_ONLY.filter((f) => v.includes(f));
      check(`${name}: no hardcoded English in DE`, hits.length === 0, hits.join(" || "));
    }
    check(`${name}: no horizontal overflow`, r.overflow <= 0, `overflow ${r.overflow}`);
    check(`${name}: no raw i18n keys or {params}`, raw.length === 0 && braces.length === 0, [...raw, ...braces].join(","));
  };
  const shot = async (name, { full = false, width = 375 } = {}) => {
    await page.waitForTimeout(450);
    if (width !== 375) await page.setViewportSize({ width, height: 900 });
    await page.waitForTimeout(150);
    await generic(name + (width !== 375 ? `@${width}` : ""));
    const file = `${name}-${lang}${width !== 375 ? "-" + width : ""}.png`;
    await page.screenshot({ path: `${OUT}/${file}`, fullPage: full });
    if (width !== 375) await page.setViewportSize({ width: 375, height: 812 });
    return file;
  };
  const setLang = async (l) => {
    lang = l;
    await page.getByRole("group", { name: "Language" }).getByRole("button", { name: l.toUpperCase(), exact: true }).click();
    await page.waitForTimeout(300);
  };
  const openBar = async () => {
    await bar.getByRole("button").first().click();
    await page.getByRole("dialog").waitFor();
    await page.waitForTimeout(300);
  };
  const role = async (label) => {
    await openBar();
    await page.getByRole("radio", { name: label }).click({ force: true });
    await page.waitForTimeout(900);
  };
  const demo = () => page.evaluate(() => JSON.parse(localStorage.getItem("sk.demo")));
  // Pin the demo clock to 13.10.2026 hh:mm (Zurich) by moving clockStartedAt, then reload.
  const setClock = async (hh, mm) => {
    await page.evaluate((mins) => {
      const s = JSON.parse(localStorage.getItem("sk.demo"));
      s.clockStartedAt = Date.now() - mins * 60000;
      localStorage.setItem("sk.demo", JSON.stringify(s));
    }, (hh - 10) * 60 + mm);
    await page.reload();
    await page.waitForTimeout(1200);
  };
  const closeToasts = async () => {
    for (const b of await page.locator(".toast__close-button").all()) await b.click({ force: true }).catch(() => {});
    await page.waitForTimeout(200);
  };
  const go = async (hash, wait = 1100) => {
    await page.goto(BASE + hash);
    await page.waitForTimeout(wait);
  };
  // Select all lives in the C04 bar; click its visible label (the input is visually hidden).
  const selectAll = async (on) => {
    const box = page.locator("[data-select-all]").first();
    if (!(await box.count())) return;
    const input = box.locator("input");
    if ((await input.isChecked()) !== on) { await box.locator("label").first().click(); await page.waitForTimeout(400); }
    if ((await input.isChecked()) !== on) { await box.locator("label").first().click(); await page.waitForTimeout(400); }
  };
  // C04 after 1.5d: only ticked lines go to C06. Tick "Select all" if it exists and is off, then press Continue.
  const cartContinue = async () => {
    await selectAll(true);
    await page.getByRole("button", { name: DICT[lang]["cart.bar.continue"], exact: true }).last().click();
  };
  const mail = async () => (await demo()).data.mail.map((m) => `${m.template}>${m.to}${m.params?.orderRef ? "(" + m.params.orderRef + ")" : ""}`);
  return { selectAll, cartContinue, browser, page, errors, results, T, rx, check, text, mainText, bar, shot, setLang, openBar, role, demo, setClock, closeToasts, go, mail, norm, getLang: () => lang, setLangVar: (l) => (lang = l) };
}
