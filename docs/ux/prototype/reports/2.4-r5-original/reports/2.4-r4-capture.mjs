// 2.4-r4 (14 Oct 2026): option tiles on C03 (gift sheet) and C10 (departures). Owner round 3:
// selected tile keeps its fill and gets a red border; the check is a circled tick in the
// top-right corner that takes no layout space. Captures one state set and measures the tiles.
// Round 4: the check is centred on the rounded top-right corner (owner); a long first line
// (DE "Nussbaum", put on sale through sk.demo) never runs under it, and it reaches at most
// 8px above the tile, the gap between tiles, so it never covers the tile above.
// 375px, DPR 2, headless chromium shell, against `vite --port 5231`. Run from a folder with
// playwright-core installed:
//   node 2.4-r4-capture.mjs <before|after> [repo root]
// Writes docs/ux/prototype/screens/2.4-r4/<mode>/<state>-<lang>.png and prints one JSON
// line per tile measurement plus PASS/FAIL checks (the checks only apply to "after").
import { chromium } from "playwright-core";
import { mkdirSync, readdirSync } from "node:fs";

const MODE = process.argv[2] ?? "after";
const ROOT = process.argv[3] ?? "/home/ross-geller/Projects/minastik/swiss-keepsakes";
const OUT = `${ROOT}/docs/ux/prototype/screens/2.4-r4/${MODE}`;
const BASE = "http://localhost:5231/";
mkdirSync(OUT, { recursive: true });
const home = process.env.HOME + "/.cache/ms-playwright/";
const dir = readdirSync(home).filter((d) => d.startsWith("chromium_headless_shell-")).sort().pop();
const browser = await chromium.launch({ executablePath: `${home}${dir}/chrome-headless-shell-linux64/chrome-headless-shell` });
const context = await browser.newContext({ viewport: { width: 375, height: 812 }, deviceScaleFactor: 2 });
// Other workers save files while this runs: stub Vite's HMR socket so the page never hot-reloads.
await context.addInitScript(() => {
  const Native = window.WebSocket;
  const Patched = function (url, protocols) {
    const list = [].concat(protocols ?? []);
    if (list.includes("vite-hmr") || list.includes("vite-ping")) return Object.assign(new EventTarget(), { readyState: 0, send() {}, close() {} });
    return new Native(url, protocols);
  };
  Patched.prototype = Native.prototype;
  Object.assign(Patched, { CONNECTING: 0, OPEN: 1, CLOSING: 2, CLOSED: 3 });
  window.WebSocket = Patched;
});
const page = await context.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => m.type() === "error" && errors.push(m.text().slice(0, 200)));
const wait = (ms = 400) => page.waitForTimeout(ms);
const RAW_KEY = /\b(tourDiscovery|detail|gifts|card|nav)\.[a-zA-Z]/;
let pass = 0, fail = 0;
const check = (name, ok, extra = "") => {
  if (MODE !== "after") return;
  ok ? pass++ : fail++;
  console.log(ok ? "PASS" : "FAIL", name, extra === "" ? "" : `· ${typeof extra === "string" ? extra : JSON.stringify(extra)}`);
};
const setLang = async (l) => {
  const y = await page.evaluate(() => scrollY);
  await page.getByRole("group", { name: "Language" }).getByRole("button", { name: l }).first().click();
  await wait(400);
  await page.evaluate((t) => scrollTo(0, t), y);
  await wait(200);
};
async function shot(name) {
  await wait(500);
  await page.screenshot({ path: `${OUT}/${name}.png` });
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  const raw = name.endsWith("-de") ? ((await page.locator("body").innerText()).match(RAW_KEY)?.[0] ?? "") : "";
  console.log(`${overflow <= 0 && !raw ? "OK  " : "BAD "} ${MODE}/${name}.png · overflow ${overflow}${raw ? ` · raw key ${raw}` : ""}`);
  check(`no horizontal overflow, no raw key (${name})`, overflow <= 0 && !raw);
}

/** Token colours resolved by the browser, so they compare with computed tile styles. */
const tokens = () => page.evaluate(() => {
  const probe = document.createElement("div");
  document.body.append(probe);
  const read = (v) => { probe.style.color = `var(${v})`; return getComputedStyle(probe).color; };
  const out = { accent: read("--accent"), default: read("--default"), defaultHover: read("--default-hover"), surface: read("--surface"), foreground: read("--foreground"), accentSoft: read("--accent-soft") };
  probe.remove();
  return out;
});

/** Box, colours and check icon of one tile. */
const measure = (locator) => locator.evaluate((el) => {
  const cs = getComputedStyle(el);
  const r = el.getBoundingClientRect();
  const px = (v) => parseFloat(v) || 0;
  const contentWidth = r.width - px(cs.paddingLeft) - px(cs.paddingRight) - px(cs.borderLeftWidth) - px(cs.borderRightWidth);
  // The child that holds the tile's text: its width shows whether anything takes layout space.
  const text = el.querySelector("[data-slot=radio-content] > div, [role=gridcell] > span");
  const before = getComputedStyle(el, "::before");
  // First text line: the option name (C03) or the date (C10).
  const line = el.querySelector("[role=gridcell] > span > span, [data-slot=radio-content] > div > span")?.getBoundingClientRect();
  const svgs = [...el.querySelectorAll("svg")].map((s) => {
    const sc = getComputedStyle(s);
    const sr = s.getBoundingClientRect();
    // HeroUI sets pointer-events: none on tag icons, which elementFromPoint skips; lift it for the probe.
    const pe = s.style.pointerEvents;
    s.style.pointerEvents = "auto";
    const hit = document.elementFromPoint(sr.left + sr.width / 2, sr.top + sr.height / 2);
    s.style.pointerEvents = pe;
    // Overlap with the glyphs of the first line: its box minus the line's leading.
    const glyphTop = line ? line.top + (line.height - parseFloat(getComputedStyle(el.querySelector("[role=gridcell] > span > span, [data-slot=radio-content] > div > span")).fontSize)) / 2 : 0;
    const overText = line ? sr.left < line.right && sr.right > line.left && sr.top < line.bottom && sr.bottom > glyphTop : null;
    return { position: sc.position, display: sc.display, color: sc.color, w: Math.round(sr.width), top: Math.round(sr.top - r.top), right: Math.round(r.right - sr.right), centreOnTopEdge: Math.round(sr.top + sr.height / 2 - r.top), visibleAtCentre: Boolean(hit && (hit === s || s.contains(hit))), overText };
  });
  return {
    text: el.innerText.split("\n")[0],
    selected: el.dataset.selected ?? el.getAttribute("aria-selected"),
    disabled: el.dataset.disabled ?? el.getAttribute("aria-disabled"),
    w: Math.round(r.width), h: Math.round(r.height),
    contentWidth: Math.round(contentWidth * 10) / 10,
    textWidth: text ? Math.round(text.getBoundingClientRect().width * 10) / 10 : null,
    textLeft: text ? Math.round((text.getBoundingClientRect().left - r.left) * 10) / 10 : null,
    borderColor: cs.borderTopColor, borderWidth: cs.borderTopWidth,
    background: cs.backgroundColor, color: cs.color, opacity: cs.opacity,
    beforeContent: before.content, beforeDisplay: before.display,
    svgs,
  };
});
const log = (label, m) => console.log(`TILE ${label} ${JSON.stringify(m)}`);
/** The visible check: an absolutely positioned svg shown in the tile. */
const check0 = (m) => m.svgs.find((s) => s.position === "absolute" && s.display !== "none");

// ---------------------------------------------------------------- C03 gift sheet
await page.goto(BASE); await page.evaluate(() => localStorage.clear()); await page.reload(); await wait(800);
const T = await tokens();
console.log("TOKENS", JSON.stringify(T));

const openSheet = async (slug) => {
  await page.goto(BASE + "#/gifts/" + slug); await wait(900);
  await page.getByRole("button", { name: /^(Add to cart|In den Warenkorb)$/ }).last().click();
  await page.getByRole("dialog").waitFor(); await wait(700);
  return page.getByRole("dialog");
};

for (const lang of ["EN", "DE"]) {
  const l = lang.toLowerCase();
  await page.goto(BASE); await page.evaluate(() => localStorage.clear()); await page.reload(); await wait(700);
  if (lang === "DE") await setLang("DE");
  let sheet = await openSheet("kapellbruecke-pocket-knife");
  const tile = (re) => sheet.getByRole("row", { name: re });
  const [small, medium, large] = lang === "EN" ? [/Small/, /Medium/, /Large/] : [/Klein/, /Mittel/, /Gross/];
  const initial = await sheet.getByRole("row").evaluateAll((rows) => rows.filter((r) => r.getAttribute("aria-selected") === "true").length);
  await shot(`c03-sheet-initial-${l}`);
  await tile(medium).click(); await wait(300);
  await page.mouse.move(5, 5); await wait(200);
  await shot(`c03-sheet-selected-${l}`);
  const sel = await measure(tile(medium));
  const un = await measure(tile(small));
  log(`c03 ${l} selected`, sel); log(`c03 ${l} unselected`, un);
  check(`C03 ${l}: selected border is the accent (${sel.borderColor})`, sel.borderColor === T.accent);
  check(`C03 ${l}: selected background stays the tile fill (${sel.background} = unselected ${un.background} = --default)`, sel.background === un.background && sel.background === T.default);
  check(`C03 ${l}: unselected border is not visible (${un.borderColor})`, un.borderColor === "rgba(0, 0, 0, 0)");
  check(`C03 ${l}: tile box and content box equal selected/unselected`, sel.w === un.w && sel.h === un.h && sel.contentWidth === un.contentWidth && sel.textLeft === un.textLeft, { sel: [sel.w, sel.h, sel.contentWidth, sel.textLeft], un: [un.w, un.h, un.contentWidth, un.textLeft] });
  check(`C03 ${l}: no ::before check takes space`, sel.beforeDisplay === "none" || sel.beforeContent === "none", sel.beforeContent);
  const c = check0(sel);
  // Owner (round 4 chat): the check sits centred on the rounded top-right corner, same offset from the top and the right.
  check(`C03 ${l}: circled check, absolute, centred on the top-right corner, visible, clear of the text, accent`, Boolean(c) && c.top === c.right && c.top <= 0 && c.visibleAtCentre && c.overText === false && c.color === T.accent, c);
  check(`C03 ${l}: unselected tile shows no check`, !check0(un), un.svgs);
  // Hover on the chosen tile must not bring back a red fill.
  await tile(small).hover(); await wait(300);
  const unHov = await measure(tile(small));
  await tile(medium).hover(); await wait(300);
  const hov = await measure(tile(medium));
  check(`C03 ${l}: hover on the chosen tile = hover on an unchosen one (${hov.background} = ${unHov.background} = --default-hover)`, hov.background === unHov.background && hov.background === T.defaultHover && hov.borderColor === T.accent);
  await page.mouse.move(5, 5); await wait(300);
  // Keyboard: arrow to Large, Space selects it, focus ring visible.
  await tile(medium).focus(); await page.keyboard.press("ArrowRight"); await page.keyboard.press("Space"); await wait(300);
  const kb = await measure(tile(large));
  const focusRing = await tile(large).evaluate((el) => ({ focusVisible: el.matches("[data-focus-visible], :focus-visible"), shadow: getComputedStyle(el).boxShadow, outline: getComputedStyle(el).outlineStyle }));
  check(`C03 ${l}: keyboard ArrowRight + Space selects the next option`, kb.selected === "true", kb.text);
  check(`C03 ${l}: keyboard focus ring visible`, focusRing.focusVisible && (focusRing.shadow !== "none" || focusRing.outline !== "none"), focusRing);
  await shot(`c03-sheet-keyboard-${l}`);
  await sheet.locator("#gift-place").scrollIntoViewIfNeeded(); await wait(300);
  await shot(`c03-sheet-place-${l}`);
  void initial; void small;

  // Not-for-sale option (Walnut): stays muted, cannot be chosen.
  sheet = await openSheet("personal-name-knife");
  const [oak, walnut] = lang === "EN" ? [/Oak/, /Walnut/] : [/Eiche/, /Nussbaum/];
  await tile(oak).click(); await wait(300); await page.mouse.move(5, 5); await wait(300);
  const dis = await measure(tile(walnut));
  const ok = await measure(tile(oak));
  log(`c03 ${l} disabled`, dis); log(`c03 ${l} selected-oak`, ok);
  check(`C03 ${l}: not-for-sale option muted and disabled`, dis.disabled === "true" && Number(dis.opacity) < 1, { opacity: dis.opacity });
  check(`C03 ${l}: not-for-sale option has no check and no red border`, !check0(dis) && dis.borderColor !== T.accent);
  await shot(`c03-sheet-disabled-${l}`);
  // Long first line: put Walnut on sale in the stored demo data, choose it.
  await page.goto(BASE); await wait(500);
  await page.evaluate(() => { const st = JSON.parse(localStorage.getItem("sk.demo")); const walk = (o) => { if (!o || typeof o !== "object") return; if (o.id === "walnut" && "notForSale" in o) o.notForSale = false; Object.values(o).forEach(walk); }; walk(st); localStorage.setItem("sk.demo", JSON.stringify(st)); });
  await page.reload(); await wait(800);
  sheet = await openSheet("personal-name-knife");
  await tile(walnut).click(); await wait(300); await page.mouse.move(5, 5); await wait(300);
  const long = await measure(tile(walnut));
  log(`c03 ${l} long-name selected`, long);
  const lc = check0(long);
  check(`C03 ${l}: long name (${long.text}) chosen: check on the top edge, clear of the name`, Boolean(lc) && lc.overText === false && lc.visibleAtCentre, lc);
  await shot(`c03-sheet-long-name-${l}`);
  await page.goto(BASE); await wait(700); // leaves the sheet so the language switch is reachable
  if (lang === "DE") await setLang("EN");
}

// ---------------------------------------------------------------- C10 departures
for (const lang of ["EN", "DE"]) {
  const l = lang.toLowerCase();
  await page.goto(BASE); await page.evaluate(() => localStorage.clear()); await page.reload(); await wait(700);
  if (lang === "DE") await setLang("DE");
  await page.goto(BASE + "#/tours/lucerne-old-town-walk/book"); await wait(900);
  const tile = (re) => page.locator(".radio").filter({ hasText: re });
  const [d16, d18, d20] = lang === "EN" ? [/Fri 16 Oct/, /Sun 18 Oct/, /Tue 20 Oct/] : [/16\. Okt/, /18\. Okt/, /20\. Okt/];
  await tile(d16).click(); await wait(300); await page.mouse.move(5, 5); await wait(300);
  await page.evaluate(() => scrollTo(0, 0));
  await shot(`c10-departures-${l}`);
  const sel = await measure(tile(d16));
  const un = await measure(tile(d20));
  const sold = await measure(tile(d18));
  log(`c10 ${l} selected`, sel); log(`c10 ${l} unselected`, un); log(`c10 ${l} sold-out`, sold);
  check(`C10 ${l}: selected border is the accent (${sel.borderColor})`, sel.borderColor === T.accent);
  check(`C10 ${l}: selected background stays the tile fill (${sel.background} = unselected ${un.background} = --default)`, sel.background === un.background && sel.background === T.default);
  check(`C10 ${l}: unselected border is not visible (${un.borderColor})`, un.borderColor === "rgba(0, 0, 0, 0)");
  check(`C10 ${l}: tile box and content box equal selected/unselected`, sel.w === un.w && sel.contentWidth === un.contentWidth && sel.textLeft === un.textLeft && sel.textWidth === un.textWidth, { sel: [sel.w, sel.contentWidth, sel.textLeft, sel.textWidth], un: [un.w, un.contentWidth, un.textLeft, un.textWidth] });
  const c = check0(sel);
  // Owner (round 4 chat): the check sits centred on the rounded top-right corner, same offset from the top and the right.
  check(`C10 ${l}: circled check, absolute, centred on the top-right corner, visible, clear of the text, accent`, Boolean(c) && c.top === c.right && c.top <= 0 && c.visibleAtCentre && c.overText === false && c.color === T.accent, c);
  // The chosen 16 Oct tile is the second: its check must stay clear of the 14 Oct tile above.
  const gap = await page.evaluate(() => {
    const tiles = [...document.querySelectorAll("[data-slot=radio]")];
    const i = tiles.findIndex((t) => t.dataset.selected === "true");
    const icon = tiles[i].querySelector(":scope > svg").getBoundingClientRect();
    return { index: i, gapToTileAbove: Math.round((icon.top - tiles[i - 1].getBoundingClientRect().bottom) * 10) / 10 };
  });
  check(`C10 ${l}: check clear of the tile above`, gap.index > 0 && gap.gapToTileAbove >= 0, gap);
  check(`C10 ${l}: unselected and sold-out tiles show no check`, !check0(un) && !check0(sold));
  check(`C10 ${l}: sold-out tile muted and disabled, no red border`, sold.disabled === "true" && Number(sold.opacity) < 1 && sold.borderColor !== T.accent, { opacity: sold.opacity, border: sold.borderColor });
  await tile(d20).hover(); await wait(300);
  const unHov = await measure(tile(d20));
  await tile(d16).hover(); await wait(300);
  const hov = await measure(tile(d16));
  check(`C10 ${l}: hover on the chosen tile = hover on an unchosen one (${hov.background} = ${unHov.background} = --default-hover)`, hov.background === unHov.background && hov.background === T.defaultHover && hov.borderColor === T.accent);
  await page.mouse.move(5, 5); await wait(300);
  // Keyboard: ArrowDown from 16 Oct skips the sold-out 18 Oct and lands on 20 Oct.
  await page.getByRole("radio", { checked: true }).focus();
  await page.keyboard.press("ArrowDown"); await wait(300);
  const kb = await measure(tile(d20));
  const focus = await tile(d20).evaluate((el) => ({
    visible: Boolean(el.querySelector("[data-focus-visible=true]")),
    tileShadow: getComputedStyle(el).boxShadow,
    tileOutline: getComputedStyle(el).outlineStyle,
  }));
  check(`C10 ${l}: keyboard ArrowDown skips sold-out to 20 Oct`, kb.selected === "true", kb.text);
  check(`C10 ${l}: keyboard focus ring on the whole tile`, focus.visible && (focus.tileShadow !== "none" || focus.tileOutline !== "none"), focus);
  check(`C10 ${l}: no radio dot left in the tile`, (await tile(d20).locator(".radio__control").count()) === 0);
  await shot(`c10-keyboard-${l}`);
  if (lang === "DE") await setLang("EN");
}

console.log(errors.length ? `ERRORS ${JSON.stringify(errors)}` : "no page or console errors");
if (MODE === "after") console.log(`\n${pass} passed, ${fail} failed`);
await browser.close();
