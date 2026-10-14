// Shared helpers for the 2.15 complete-flow check (Phase 2). One script runs in EN or DE:
// labels come from the live en.ts/de.ts plus every features/**/messages.ts.
// Run from a folder whose node_modules has playwright-core: node 2.15-<part>.mjs en|de
// Dev server without HMR (other sessions' edits must not remount the page mid-run):
//   cd front-end && npx vite --config ../docs/ux/prototype/reports/1.6-vite.nohmr.mjs --port 5232 --strictPort
import { chromium } from "playwright-core";
import { mkdirSync, readFileSync, readdirSync, statSync } from "node:fs";

const REPO = "/home/ross-geller/Projects/minastik/swiss-keepsakes";
const SRC = `${REPO}/front-end/src/`;
export const BASE = "http://localhost:5232/";
export const OUT = process.env.OUT ?? `${REPO}/docs/ux/prototype/screens/2.15`;

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
export const DICT = loadDict();
const norm = (s) => s.replace(/[\u00a0\u202f]/g, " ").replace(/\s+/g, " ").trim();
// English fragments (12+ chars, outside {params}) whose German differs and that no German value
// contains: seeing one on a DE screen means a string skipped t().
const EN_ONLY = [...new Set(Object.entries(DICT.en)
  .filter(([k, v]) => DICT.de[k] !== undefined && DICT.de[k] !== v)
  .flatMap(([, v]) => v.split(/\{[^}]+\}/)).map(norm).filter((f) => f.length >= 12))]
  .filter((f) => !Object.values(DICT.de).some((d) => norm(d).includes(f)));

const SEED_TEXT = ["Bank transfer, ref. YT-1012"];

export async function start(lang, { webgl = false } = {}) {
  mkdirSync(OUT, { recursive: true });
  const home = process.env.HOME + "/.cache/ms-playwright/";
  const dir = readdirSync(home).filter((d) => d.startsWith("chromium_headless_shell-")).sort().pop();
  const browser = await chromium.launch({
    executablePath: `${home}${dir}/chrome-headless-shell-linux64/chrome-headless-shell`,
    args: webgl ? ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] : [],
  });
  const context = await browser.newContext({ viewport: { width: 375, height: 812 }, deviceScaleFactor: 2, acceptDownloads: true });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
  page.on("console", (m) => { if (m.type() === "error") errors.push("console: " + m.text().slice(0, 200)); });
  let pass = 0, fail = 0;
  const check = (id, cond, detail = "") => {
    cond ? pass++ : fail++;
    console.log(`${cond ? "PASS" : "FAIL"} [${lang}] ${id}${detail !== "" ? " | " + String(detail).slice(0, 300) : ""}`);
    return !!cond;
  };
  const T = (key, vars = {}) => {
    let s = DICT[lang][key];
    if (s == null) throw new Error("no key " + key);
    for (const [k, v] of Object.entries(vars)) s = s.split(`{${k}}`).join(v);
    return norm(s);
  };
  const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const rx = (key, vars, flags = "") => new RegExp(esc(T(key, vars)), flags);
  const wait = (ms = 400) => page.waitForTimeout(ms);
  const text = async (sel = "body") => norm(await page.locator(sel).first().innerText());
  const has = async (re, sel = "body") => (typeof re === "string" ? (await text(sel)).includes(re) : re.test(await text(sel)));
  const go = async (hash) => { await page.goto(BASE + "#" + hash); await wait(800); };
  const top = () => page.evaluate(() => window.scrollTo(0, 0));
  const setLang = async (l) => {
    await top();
    await page.getByRole("group", { name: "Language" }).getByRole("button", { name: l.toUpperCase(), exact: true }).click();
    await wait(300);
  };
  const store = () => page.evaluate(() => JSON.parse(localStorage.getItem("sk.demo")));
  const patch = async (fn) => {
    await page.evaluate((src) => {
      const s = JSON.parse(localStorage.getItem("sk.demo"));
      // eslint-disable-next-line no-new-func
      new Function("s", src)(s);
      localStorage.setItem("sk.demo", JSON.stringify(s));
    }, fn);
    await page.reload(); await wait(900);
  };
  const reset = async () => {
    await page.goto(BASE); await wait(300);
    await page.evaluate(() => localStorage.clear());
    await page.reload(); await wait(900);
    if (lang === "de") await setLang("de");
  };
  const tours = async () => (await store()).data.tours;
  const booking = async (id) => (await tours()).bookings.find((b) => b.id === id || b.ref === id);
  const paid = (b) => b.payments.filter((p) => p.status === "succeeded").reduce((s, p) => s + p.amount, 0);
  const mails = async (id) => (await store()).data.mail.filter((m) => m.bookingId === id).map((m) => `${m.to}:${m.template}`).join(",");
  const demoNow = async () => { const s = await store(); return Date.parse("2026-10-13T10:00:00+02:00") + Math.max(0, Date.now() - s.clockStartedAt); };
  const seatsTaken = async (departureId) => {
    const now = await demoNow();
    return (await tours()).bookings
      .filter((b) => b.departureId === departureId && (b.status === "pending_payment" ? Date.parse(b.holdUntil) > now : !["expired", "cancelled"].includes(b.status)))
      .reduce((sum, b) => sum + b.adults + b.children, 0);
  };
  const signIn = async (returnTo = "/account") => {
    await go(`/sign-in?returnTo=${encodeURIComponent(returnTo)}`);
    await page.getByRole("button", { name: T("auth.google") }).click();
    await wait(900);
  };
  // Prototype bar (English by design). Opens the drawer and presses a control.
  const drawer = async () => { await top(); await page.getByRole("region", { name: "Prototype controls" }).getByRole("button").first().click(); await wait(500); };
  const control = async (name, { close = false } = {}) => {
    await drawer();
    const button = page.getByRole("dialog").getByRole("button", { name });
    const enabled = (await button.count()) > 0 && (await button.first().isEnabled());
    if (enabled) await button.first().click();
    await wait(600);
    if (close || !enabled) { await page.keyboard.press("Escape"); await wait(400); }
    return enabled;
  };
  // "View as" through the real drawer; the radio navigates to the role's home.
  const viewAs = async (label) => {
    await drawer();
    const radio = page.getByRole("dialog").getByRole("radio", { name: label });
    // Choosing the role already in use changes nothing, so the drawer stays open: close it.
    if (await radio.isChecked()) { await page.keyboard.press("Escape"); await wait(400); return; }
    await radio.check({ force: true });
    await wait(900);
  };
  // Every screenshot also checks overflow, raw keys and literal {params}; in DE, English leaks
  // and clipped labels (long German words).
  const shot = async (name, { full = true, width = 375 } = {}) => {
    const size = page.viewportSize();
    if (width !== size.width) { await page.setViewportSize({ width, height: 900 }); await wait(500); }
    await wait(350);
    await page.screenshot({ path: `${OUT}/${name}-${lang}.png`, fullPage: full });
    const r = await page.evaluate(() => {
      const scope = [...document.querySelectorAll("main, [role=dialog], [role=alertdialog]")].filter((el) => !el.closest('[aria-label="Prototype controls"]'));
      const body = scope.map((el) => el.innerText).join("\n");
      const clipped = [...document.querySelectorAll("main button, main a, main [role=button], main span, [role=dialog] button, [role=alertdialog] button")]
        .filter((el) => el.offsetParent && el.clientWidth > 2 && !el.classList.contains("sr-only") && el.scrollWidth > el.clientWidth + 1 && getComputedStyle(el).textOverflow !== "ellipsis" && getComputedStyle(el).overflow !== "visible" && el.innerText.trim())
        .map((el) => el.innerText.trim().slice(0, 40));
      // Images that finished loading with no pixels (404 or decode error); lazy ones not yet requested are skipped.
      const broken = [...document.images].filter((i) => i.offsetParent && i.complete && i.getAttribute("src") && i.naturalWidth === 0).map((i) => i.getAttribute("src").slice(-50));
      // Labels cut with an ellipsis (truncate): listed for review, not failed.
      const ellipsis = [...document.querySelectorAll("main *, [role=dialog] *, [role=alertdialog] *")]
        .filter((el) => el.offsetParent && getComputedStyle(el).textOverflow === "ellipsis" && el.scrollWidth > el.clientWidth + 1 && el.innerText.trim())
        .map((el) => `${el.tagName.toLowerCase()}: ${el.innerText.trim().replace(/\s+/g, " ").slice(0, 60)}`);
      return { overflow: document.documentElement.scrollWidth - innerWidth, body, clipped, broken, ellipsis };
    });
    check(`no broken images (${name})`, !r.broken.length, r.broken.join(" / "));
    if (r.ellipsis.length) console.log(`INFO [${lang}] truncated with ellipsis (${name}, ${width}px): ${r.ellipsis.join(" || ")}`);
    check(`no horizontal overflow (${name}, ${width}px)`, r.overflow <= 0, r.overflow);
    const raw = (r.body.match(/\b[a-z][a-zA-Z]+\.[a-z][a-zA-Z.-]+\b/g) || []).filter((k) => DICT.en[k] !== undefined);
    const braces = r.body.match(/\{[a-zA-Z]+\}/g) || [];
    check(`no raw keys or {params} (${name})`, !raw.length && !braces.length, [...raw, ...braces].join(", "));
    if (lang === "de") {
      // Seeded staff notes are free text typed by the merchant, not interface copy.
      const body = SEED_TEXT.reduce((acc, s) => acc.split(s).join(""), norm(r.body));
      const leaks = EN_ONLY.filter((f) => body.includes(f));
      check(`no English left in DE (${name})`, !leaks.length, leaks.slice(0, 3).join(" / "));
      check(`no clipped German labels (${name})`, !r.clipped.length, r.clipped.slice(0, 4).join(" / "));
    }
    if (width !== size.width) { await page.setViewportSize(size); await wait(300); }
  };
  // Keyboard: Tab from the top until the focused element's name matches, then compare its
  // outline and shadow while focused and 400ms after blur.
  const keyboard = async (label, re, max = 90) => {
    await page.evaluate(() => { document.activeElement?.blur(); window.scrollTo(0, 0); });
    let reached = false;
    for (let i = 0; i < max && !reached; i++) {
      await page.keyboard.press("Tab");
      reached = re.test(norm(await page.evaluate(() => { const el = document.activeElement; return el?.getAttribute("aria-label") || el?.textContent || ""; })));
    }
    if (!reached) return check(`keyboard: ${label} reachable by Tab`, false);
    await wait(250);
    const style = () => page.evaluate(() => { const s = getComputedStyle(window.__k ?? document.activeElement); return `${s.outlineStyle} ${s.outlineWidth} | ${s.boxShadow}`; });
    await page.evaluate(() => { window.__k = document.activeElement; });
    const focused = await style();
    const visible = await page.evaluate(() => window.__k.matches(":focus-visible") || window.__k.hasAttribute("data-focus-visible"));
    await page.evaluate(() => window.__k.blur());
    await wait(400);
    const blurred = await style();
    await page.evaluate(() => { window.__k.focus(); window.__k = undefined; });
    return check(`keyboard: ${label} reachable by Tab with a visible focus ring`, visible && focused !== blurred);
  };
  // Sample avatars: every person image comes from src/assets/avatars and has loaded; no initials.
  const avatars = async (scope = "main") => page.evaluate(async (sel) => {
    const root = document.querySelector(sel) ?? document.body;
    const imgs = [...root.querySelectorAll('img[src*="avatars/"]')];
    for (const img of imgs) { img.scrollIntoView({ block: "center" }); await img.decode().catch(() => {}); }
    const initials = [...root.querySelectorAll(".rounded-full")].filter((el) => !el.querySelector("img") && /^[A-ZÄÖÜ]{1,2}$/.test(el.innerText.trim())).length;
    window.scrollTo(0, 0);
    return { count: imgs.length, loaded: imgs.filter((i) => i.naturalWidth > 0).length, initials };
  }, scope);
  const finish = async () => {
    // Map tiles come from the public OpenFreeMap service; their network noise is not an app error.
    const real = errors.filter((e) => !/tiles\.openfreemap|ERR_|Failed to load resource/.test(e));
    check("no console or page errors", !real.length, real.slice(0, 3).join(" / "));
    console.log(`\nRESULT [${lang}] ${pass} passed, ${fail} failed`);
    await browser.close();
    process.exitCode = fail ? 1 : 0;
  };
  return { page, context, lang, T, rx, check, wait, text, has, go, top, setLang, store, patch, reset, tours, booking, paid, mails, demoNow, seatsTaken, signIn, drawer, control, viewAs, shot, keyboard, avatars, finish, norm };
}

// C10: pick a departure by id and set the group with the NumberField steppers.
export async function chooseDeparture(t, slug, departureId, group = null) {
  const { page, go, wait } = t;
  await go(`/tours/${slug}/book`);
  await page.locator(`input[type=radio][value="${departureId}"]`).locator("xpath=ancestor::label[1]").click();
  await wait(300);
  if (group) {
    const keys = ["adults", "children", "infants"];
    for (const [key, target] of Object.entries(group)) {
      const i = keys.indexOf(key);
      for (let n = 0; n < 12; n++) {
        const current = (await t.tours()).draft[key];
        if (current === target) break;
        await page.locator(`button[slot="${current < target ? "increment" : "decrement"}"]`).nth(i).click({ timeout: 5000 });
        await wait(150);
      }
    }
  }
}
export const bookingIdFromUrl = (page) => page.url().match(/bookings\/([^/?]+)/)?.[1];
