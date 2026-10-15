// Shared helpers for the content-track captures (4.12 M17, 4.13 M18, 4.16 M23), after the
// 4.6 harness: chromium headless shell, 375px at DPR 2, reduced motion, EN and DE.
// Labels come from the live en.ts/de.ts plus every features/**/messages.ts, as in 2.15-lib.
// Run from a folder with playwright-core (.check/drv/), against the no-HMR server:
//   cd front-end && npx vite --config ../.check/vite.check-b.mjs --port 5252 --strictPort
import { chromium } from "playwright-core";
import { mkdirSync, readFileSync, readdirSync, statSync } from "node:fs";

const REPO = "/home/ross-geller/Projects/minastik/swiss-keepsakes";
const SRC = `${REPO}/front-end/src/`;
export const BASE = process.env.BASE ?? "http://localhost:5252/";

const pairs = (text) => {
  const out = {};
  const re = /"([A-Za-z0-9_.-]+)":\s*("(?:\\.|[^"\\])*")/g;
  let m;
  while ((m = re.exec(text))) out[m[1]] = JSON.parse(m[2]);
  return out;
};
function loadDict() {
  const en = pairs(readFileSync(SRC + "i18n/en.ts", "utf8"));
  const de = pairs(readFileSync(SRC + "i18n/de.ts", "utf8"));
  const walk = (d) => readdirSync(d).flatMap((f) => {
    const p = `${d}/${f}`;
    return statSync(p).isDirectory() ? walk(p) : f === "messages.ts" ? [p] : [];
  });
  for (const file of walk(SRC + "features")) {
    const text = readFileSync(file, "utf8");
    const i = text.search(/export const \w+De\b/);
    if (i < 0) continue;
    Object.assign(en, pairs(text.slice(0, i)));
    Object.assign(de, pairs(text.slice(i)));
  }
  return { en, de };
}
const DICT = loadDict();
export const norm = (s) => s.replace(/[\u00a0\u202f]/g, " ").replace(/\s+/g, " ").trim();
export const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const home = `${process.env.HOME}/.cache/ms-playwright`;
const shell = readdirSync(home).filter((d) => d.startsWith("chromium_headless_shell")).sort().pop();
export const browser = await chromium.launch({
  executablePath: `${home}/${shell}/chrome-headless-shell-linux64/chrome-headless-shell`,
});

let pass = 0;
let fail = 0;

export async function start(lang, outDir, { width = 375, height = 812 } = {}) {
  mkdirSync(outDir, { recursive: true });
  const page = await browser.newPage({
    viewport: { width, height },
    deviceScaleFactor: width < 600 ? 2 : 1,
    reducedMotion: "reduce",
  });
  const errors = [];
  page.on("console", (m) => m.type() === "error" && errors.push(m.text().slice(0, 200)));
  page.on("pageerror", (e) => errors.push(String(e).slice(0, 200)));

  const check = (name, ok, detail = "") => {
    ok ? pass++ : fail++;
    const info = detail === "" ? "" : norm(typeof detail === "string" ? detail : JSON.stringify(detail)).slice(0, 240);
    console.log(`${ok ? "PASS" : "FAIL"} [${lang}${width > 600 ? " " + width : ""}] ${name}${info ? ` | ${info}` : ""}`);
    return !!ok;
  };
  const T = (key, vars = {}) => {
    let s = DICT[lang][key];
    if (s == null) throw new Error("no key " + key);
    for (const [k, v] of Object.entries(vars)) s = s.split(`{${k}}`).join(String(v));
    return norm(s);
  };
  const wait = (ms = 400) => page.waitForTimeout(ms);
  const go = async (hash, ms = 900) => { await page.goto(BASE + "#" + hash); await wait(ms); };
  const text = async (sel = "body") => norm(await page.locator(sel).first().innerText());
  const has = async (s, sel = "body") => (await text(sel)).includes(s);
  const store = () => page.evaluate(() => JSON.parse(localStorage.getItem("sk.demo")));
  // Every load goes through about:blank, so it is a full document load: a hash change alone
  // keeps the running app, and a reload right after a hash change can be aborted. (A cache-busting
  // query string would end up in the router's search params.)
  const load = async (hash, ms = 900) => {
    for (let attempt = 1; ; attempt++) {
      try {
        await page.goto("about:blank");
        await page.goto(`${BASE}#${hash}`, { waitUntil: "load" });
        break;
      } catch (e) {
        // A busy test machine occasionally refuses a load (ERR_INSUFFICIENT_RESOURCES).
        if (attempt === 3) throw e;
        await wait(1500);
      }
    }
    await wait(ms);
  };
  const currentHash = () => page.evaluate(() => location.hash.slice(1) || "/");
  /** Runs `body` with `s` as the stored demo state, writes it back and reloads. */
  const patch = async (body) => {
    await page.evaluate((code) => {
      const s = JSON.parse(localStorage.getItem("sk.demo"));
      new Function("s", code)(s);
      localStorage.setItem("sk.demo", JSON.stringify(s));
    }, body);
    await load(await currentHash());
  };
  /** Fresh seed in `lang`, as the given role. */
  const reset = async (role = "owner") => {
    await load("/", 300);
    await page.evaluate((l) => { localStorage.clear(); localStorage.setItem("sk.language", JSON.stringify(l)); }, lang);
    await load("/");
    await patch(`s.role = ${JSON.stringify(role)};`);
  };
  /** A route in the given interface language, loaded fresh (the app reads the language on load). */
  const goIn = async (l, hash, ms = 1200) => {
    await page.evaluate((v) => localStorage.setItem("sk.language", JSON.stringify(v)), l);
    await load(hash, ms);
  };
  const overflow = () => page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  /** Viewport shot, or the full page with the fixed bottom nav hidden (it would paint mid-page). */
  const shot = async (name, { full = false } = {}) => {
    const file = `${outDir}/${name}-${lang}${width > 600 ? "-" + width : ""}.png`;
    if (full) {
      await page.evaluate(() => {
        for (const el of document.querySelectorAll("body *")) {
          const cs = getComputedStyle(el);
          if (cs.position === "fixed" && cs.bottom === "0px" && el.getBoundingClientRect().height < 120) { el.dataset.snapHidden = "1"; el.style.visibility = "hidden"; }
        }
      });
      await page.screenshot({ path: file, fullPage: true });
      await page.evaluate(() => document.querySelectorAll("[data-snap-hidden]").forEach((el) => { el.style.visibility = ""; delete el.dataset.snapHidden; }));
    } else await page.screenshot({ path: file });
  };
  const toast = async (s) => {
    try { await page.getByText(s, { exact: false }).first().waitFor({ timeout: 2500 }); return true; } catch { return false; }
  };

  return { page, errors, check, T, wait, go, goIn, load, text, has, store, patch, reset, overflow, shot, toast, lang };
}

export async function finish() {
  await browser.close();
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
}

/**
 * The list filters are one "Filter" button with a multi-select menu, and each ticked option
 * shows as a chip beside it; nothing ticked means All (they were rows of single-select chips).
 * `pick(label)` leaves exactly that option ticked, `pick(null)` clears the filter, and
 * `option(label)` reads an option's "label count" text from the open menu.
 */
export function filterMenu(page, buttonName) {
  const wait = (ms) => page.waitForTimeout(ms);
  const button = () => page.getByRole("button", { name: buttonName, exact: true }).first();
  const chips = () => page.getByRole("button").filter({ has: page.locator('svg[aria-label^="Remove filter"], svg[aria-label$="entfernen"]') });
  const clear = async () => { while (await chips().count()) { await chips().first().click(); await wait(200); } };
  return {
    clear,
    chipCount: () => chips().count(),
    async pick(label) {
      await clear();
      if (label == null) return;
      await button().click(); await wait(300);
      await page.getByRole("menuitemcheckbox", { name: new RegExp("^" + esc(label)) }).click(); await wait(200);
      await page.keyboard.press("Escape"); await wait(300);
    },
    async option(label) {
      await button().click(); await wait(300);
      const text = (await page.getByRole("menuitemcheckbox", { name: new RegExp("^" + esc(label)) }).innerText()).replace(/\s+/g, " ");
      await page.keyboard.press("Escape"); await wait(300);
      return text;
    },
  };
}

/**
 * Lists are cut into pages of 10 now (the seed holds 43 comments and 89 reviews): start on
 * page 1 and press Next until `locator` matches something, or the last page is reached.
 */
export async function reveal(page, locator) {
  const first = page.getByRole("button", { name: /^(Page|Seite) 1$/ }).first();
  // Keyboard, not a mouse click: a toast or the fixed bottom bar can cover the pager on a phone.
  const press = async (button) => { await button.focus(); await page.keyboard.press("Enter"); await page.waitForTimeout(200); };
  if (await first.count()) await press(first);
  for (let i = 0; i < 15 && !(await locator.count()); i++) {
    const next = page.getByRole("button", { name: /^(Next|Weiter)$/ }).first();
    if (!(await next.count()) || (await next.isDisabled())) break;
    await press(next);
  }
  return locator;
}
