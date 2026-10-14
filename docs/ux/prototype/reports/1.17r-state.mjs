// 1.17r: rebuilds the 1.19b review demo state (copy of 1.19b-capture.mjs up to the partner step) and saves sk.demo to 1.17r-review-state.json.
// Original header: 1.19b merchant/partner review gallery capture. Drives the real flow from the prototype bar's Reset.
import { chromium } from "playwright-core";
import { readdirSync, readFileSync, writeFileSync } from "node:fs";

const ROOT = "/home/ross-geller/Projects/minastik/swiss-keepsakes/";
const OUT = process.env.OUT_DIR + "/"; // throwaway; 1.17r does not write the review gallery
const BASE = "http://localhost:5213/";
const ONLY = process.env.ONLY; // optional: run only up to a phase name, for debugging

function parseDict(file) {
  const text = readFileSync(ROOT + "front-end/src/i18n/" + file, "utf8");
  const out = {};
  const re = /"([A-Za-z0-9_.]+)":\s*("(?:\\.|[^"\\])*")/g;
  let m;
  while ((m = re.exec(text))) out[m[1]] = JSON.parse(m[2]);
  return out;
}
const DICT = { en: parseDict("en.ts"), de: parseDict("de.ts") };
const ITEM_ORDER = ["1.9", "1.10", "1.10b", "1.11", "1.15", "1.17", "1.18"];

const home = process.env.HOME + "/.cache/ms-playwright/";
const dir = readdirSync(home).filter((d) => d.startsWith("chromium_headless_shell-")).sort().pop();
const browser = await chromium.launch({ executablePath: `${home}${dir}/chrome-headless-shell-linux64/chrome-headless-shell` });
const ctx = await browser.newContext({ viewport: { width: 375, height: 812 }, deviceScaleFactor: 2 });
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
page.on("console", (m) => m.type() === "error" && errors.push("console: " + m.text()));

let lang = "en";
const norm = (s) => s.replace(/[\u00a0\u202f]/g, " ").replace(/\s+/g, " ");
const T = (key, vars = {}) => {
  let s = DICT[lang][key];
  if (s == null) throw new Error("no key " + key);
  for (const [k, v] of Object.entries(vars)) s = s.split(`{${k}}`).join(v);
  return norm(s);
};
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const wait = (ms) => page.waitForTimeout(ms);
const sheet = () => page.getByRole("dialog").last();
const text = async (loc = page.locator("body")) => norm(await loc.innerText());
const bar = page.getByRole("region", { name: "Prototype controls" });
const demo = () => page.evaluate(() => JSON.parse(localStorage.getItem("sk.demo")));
const ord = async (ref) => (await demo()).data.orders.find((o) => o.ref === ref);
const log = (...a) => console.log(...a);

const setLang = async (l) => {
  if (l === lang) return;
  lang = l;
  await page.getByRole("group", { name: "Language" }).getByRole("button", { name: l.toUpperCase(), exact: true }).click();
  await wait(400);
};
const openBar = async () => { await bar.getByRole("button").first().click(); await page.getByRole("dialog").waitFor(); await wait(400); };
const role = async (label) => { await openBar(); await page.getByRole("radio", { name: label }).click({ force: true }); await wait(1000); };
const go = async (hash, ms = 1300) => { await page.goto(BASE + hash); await wait(ms); };
const closeToasts = async () => {
  for (const b of await page.locator(".toast__close-button").all()) await b.click({ force: true }).catch(() => {});
  await wait(250);
};
const escapeAll = async () => {
  for (let i = 0; i < 3 && (await page.getByRole("dialog").count() + await page.getByRole("alertdialog").count()); i++) {
    await page.keyboard.press("Escape"); await wait(450);
  }
};
const viewport = async (w) => {
  const cur = page.viewportSize();
  if (cur.width !== w) { await page.setViewportSize({ width: w, height: w === 375 ? 812 : 768 }); await wait(500); }
};

// Overflow / raw keys / hardcoded English → becomes the manifest entry's "issue".
const EN_ONLY = [...new Set(Object.entries(DICT.en).filter(([k, v]) => DICT.de[k] !== undefined && DICT.de[k] !== v)
  .flatMap(([, v]) => v.split(/\{[^}]+\}/)).map((f) => norm(f).trim()).filter((f) => f.length >= 12))]
  .filter((f) => !Object.values(DICT.de).some((d) => d.includes(f)));
const problems = async ({ mail = false } = {}) => {
  const r = await page.evaluate(() => ({
    overflow: document.documentElement.scrollWidth - window.innerWidth,
    body: document.body.innerText.replace(document.querySelector('[aria-label="Prototype controls"]')?.innerText ?? "", ""),
  }));
  const out = [];
  if (r.overflow > 0) out.push(`horizontal overflow ${r.overflow}px`);
  const raw = (r.body.match(/\b[a-z][a-zA-Z]+\.[a-z][a-zA-Z]+(\.[a-zA-Z]+)*\b/g) || []).filter((k) => DICT.en[k] !== undefined);
  const braces = r.body.match(/\{[a-zA-Z]+\}/g) || [];
  if (raw.length || braces.length) out.push("raw i18n key or {param} visible: " + [...raw, ...braces].join(", "));
  if (lang === "de" && !mail) {
    const hits = EN_ONLY.filter((f) => norm(r.body).includes(f));
    if (hits.length) out.push("English text in DE: " + hits.slice(0, 3).join(" | "));
  }
  return out;
};

const manifest = [];
const counters = {};
// One state = one nn. Captured for each width (and DE if de:true). `open` re-creates sheet/dialog states per variant.
async function shot(item, screen, state, caption, { widths = [375, 1024], full = false, de = false, open, close, mail = false } = {}) {
  counters[item] = (counters[item] ?? 0) + 1;
  const nn = String(counters[item]).padStart(2, "0");
  const langs = de ? ["en", "de"] : ["en"];
  for (const l of langs) {
    for (const w of widths) {
      if (open) await escapeAll();
      await setLang(l);
      await viewport(w);
      await closeToasts();
      if (open) await open();
      await page.mouse.move(2, 2); // park the pointer on the prototype label so no hover tint shows
      await wait(500);
      const issues = await problems({ mail });
      const file = `img/${item}-${nn}-${screen}-${state}-${l}-${w}.png`;
      if (full) {
        // Grow the viewport to the page height so fixed bars (bottom tabs) sit at the real bottom, not mid-image.
        const h = await page.evaluate(() => document.documentElement.scrollHeight);
        await page.setViewportSize({ width: w, height: Math.max(h, w === 375 ? 812 : 768) }); await wait(500);
        const h2 = await page.evaluate(() => document.documentElement.scrollHeight);
        if (h2 > h) { await page.setViewportSize({ width: w, height: h2 }); await wait(400); }
        await page.screenshot({ path: OUT + file });
        await page.setViewportSize({ width: w, height: w === 375 ? 812 : 768 }); await wait(300);
      } else await page.screenshot({ path: OUT + file });
      const entry = { item, file, caption, lang: l, width: w };
      if (issues.length) entry.issue = issues.join("; ");
      manifest.push({ ...entry, _nn: nn });
      log("shot", file, issues.length ? "ISSUE " + entry.issue : "");
      if (open) { if (close) await close(); else await escapeAll(); }
    }
  }
  await setLang("en");
  await viewport(375);
}

const step = async (name, fn) => {
  log("== " + name);
  try { await fn(); } catch (e) {
    log("STEP FAILED", name, e.message.split("\n")[0]);
    errors.push(`step ${name}: ${e.message.split("\n")[0]}`);
    await page.screenshot({ path: `/tmp/claude-1000/-home-ross-geller-Projects-minastik-swiss-keepsakes/efb9aa6b-873b-4592-9a47-0441a5642e0f/scratchpad/cap/err-${name.replace(/\W+/g, "_")}.png` }).catch(() => {});
  }
  if (ONLY === name) { finish(); }
};

const M = "Merchant · Store Manager";
const m04 = async (ref) => { await go(`#/store/orders/${ref.toLowerCase()}`); await closeToasts(); };
const c15 = async (ref) => { await go(`#/account/orders/${ref.toLowerCase()}`); await closeToasts(); };
const click = async (name, exact = true) => { await page.getByRole("button", { name, exact }).first().click(); await wait(900); };
const openRecord = async (amount) => {
  await page.getByRole("button", { name: T("fulfilment.action.record") }).first().click();
  await sheet().waitFor(); await wait(500);
  if (amount != null) {
    const a = sheet().getByRole("textbox", { name: T("recordPayment.amount") });
    await a.fill(String(amount)); await a.press("Tab"); await wait(400);
  }
};
const submitRecord = async () => { await sheet().getByRole("button", { name: /CHF/ }).last().click(); await wait(1000); await closeToasts(); };

async function finish() {
  const order = (e) => [ITEM_ORDER.indexOf(e.item), e._nn, e.lang === "en" ? 0 : 1, e.width];
  manifest.sort((a, b) => { const x = order(a), y = order(b); for (let i = 0; i < 4; i++) if (x[i] !== y[i]) return x[i] < y[i] ? -1 : 1; return 0; });
  writeFileSync(OUT + "manifest-merchant.json", JSON.stringify(manifest.map(({ _nn, ...e }) => e), null, 1) + "\n");
  log("manifest entries:", manifest.length);
  log("errors:", JSON.stringify(errors, null, 1));
  await browser.close();
  process.exit(0);
}

// ---------- Guest: Anna sends two requests (outline §1 steps 1–7), no shots
let knifeRef, boxRef;
await step("guest", async () => {
  await go("");
  await openBar();
  await page.getByRole("button", { name: "Reset demo" }).click();
  await wait(1200);
  await openBar(); await page.getByRole("button", { name: "Via Hotel am See QR" }).click(); await wait(900);
  await go("#/gifts/kapellbruecke-pocket-knife");
  await page.getByRole("button", { name: T("detail.bar.add"), exact: true }).last().click();
  await sheet().waitFor();
  await sheet().getByRole("row", { name: /Medium/ }).click();
  await sheet().getByLabel(new RegExp(T("detail.engraving.label").replace(/[()]/g, "."))).first().fill("Anna");
  await sheet().getByRole("gridcell").filter({ hasText: /^21$/ }).first().click();
  await sheet().getByRole("radio", { name: /Altstadt/ }).check({ force: true });
  await sheet().getByRole("button", { name: new RegExp("^" + T("detail.bar.add")) }).last().click();
  await wait(900);
  await go("#/gifts/lucerne-gift-box");
  await page.getByRole("button", { name: T("detail.bar.add"), exact: true }).last().click();
  await sheet().waitFor();
  await sheet().getByRole("gridcell").filter({ hasText: /^20$/ }).first().click();
  await sheet().getByRole("radio", { name: /Altstadt/ }).check({ force: true });
  await sheet().getByRole("button", { name: new RegExp("^" + T("detail.bar.add")) }).last().click();
  await wait(900);
  await go("#/cart"); await closeToasts();
  const box = page.locator("[data-select-all]").first();
  if (!(await box.locator("input").isChecked())) { await box.locator("label").first().click(); await wait(400); }
  await page.getByRole("button", { name: T("cart.bar.continue"), exact: true }).last().click();
  await sheet().waitFor(); await wait(500);
  await sheet().getByRole("button", { name: T("auth.email.send") }).click(); await wait(600);
  await page.locator("#sign-in-code").focus(); await page.keyboard.type("123456"); await wait(1600);
  await closeToasts();
  await page.getByRole("button", { name: T("checkout.bar.send") }).click(); await wait(1500);
  await page.getByRole("button", { name: T("tripProfile.skip") }).click().catch(() => {}); await wait(500);
  const d = await demo();
  const mine = d.data.orders.filter((o) => o.guestId === "g-anna" && o.status === "requested");
  knifeRef = mine.find((o) => o.lines[0].productId === "p-knife")?.ref;
  boxRef = mine.find((o) => o.lines[0].productId === "p-giftbox")?.ref;
  log("Anna's requests:", knifeRef, boxRef);
  if (!knifeRef || !boxRef) throw new Error("requests not created");
});

// ---------- 1.9 M02 + 1.10/1.10b M03 before anything changes
await step("m02-m03", async () => {
  await role(M);
  await go("#/store");
  await shot("1.9", "m02", "tasks", "M02 Today: task cards (Awaiting confirmation 5 incl. Anna's two requests) and At a glance numbers", { full: true, de: true });
  await go("#/store/orders?status=awaiting-confirmation");
  await shot("1.10", "m03", "table-awaiting-confirmation", "M03 Gift orders at 1024: status tabs with counts and the order table, Awaiting confirmation tab", { widths: [1024], full: true, de: true });
  await shot("1.10b", "m03", "tickets-awaiting-confirmation", "M03 Gift orders at 375: pickup-ticket cards on the M02 card surface, Awaiting confirmation tab", { widths: [375], full: true, de: true });
  for (const [tab, label] of [["awaiting-payment", "Awaiting payment"], ["preparing", "To prepare"], ["ready", "Ready for pickup"]]) {
    await go(`#/store/orders?status=${tab}`);
    await shot("1.10b", "m03", `tickets-${tab}`, `M03 Gift orders at 375: pickup-ticket cards, ${label} tab (payment rows on the ticket footer)`, { widths: [375], full: true });
  }
  await go("#/store/orders?status=owing");
  await shot("1.10", "m03", "empty-tab", "M03 Gift orders: empty tab (Balance owed, 0 orders) with Back to Today", { full: true });
});

// ---------- 1.11 M04 decision block on the gift box
await step("m04-decision", async () => {
  await m04(boxRef);
  await shot("1.11", "m04", "requested", `M04 ${boxRef}: decision block (requested pickup, stock per line, Accept / Change / Decline) before any change`, { full: true });
  const openChange = async (note) => {
    await page.getByRole("button", { name: T("merchantOrder.action.change") }).click();
    await sheet().waitFor(); await wait(400);
    await sheet().getByRole("radio", { name: /Bahnhof/ }).check({ force: true });
    if (note) await sheet().getByRole("textbox", { name: new RegExp("^" + T("merchantOrder.change.note")) }).fill(note);
    else { await sheet().getByRole("button", { name: T("merchantOrder.change.save") }).click(); await wait(400); }
  };
  await shot("1.11", "m04", "change-sheet-note-required", "M04 Change date or place sheet: new place picked, save without a note blocked", { open: () => openChange(null) });
  const note = () => (lang === "en" ? "Guest asked by email, hotel is near the station" : "Gast hat per E-Mail gefragt, Hotel liegt beim Bahnhof");
  await shot("1.11", "m04", "change-sheet-with-note", "M04 Change date or place sheet: place Pickup point Bahnhof with the required note", { open: () => openChange(note()) });
  await openChange(note());
  await sheet().getByRole("button", { name: T("merchantOrder.change.save") }).click(); await wait(900);
  await closeToasts();
  await shot("1.11", "m04", "requested-after-change", `M04 ${boxRef}: after the place change, full page with order log (place changed + note), payments, source, commission and policy at time of ordering`, { full: true, de: true });
  const openAccept = async () => { await page.getByRole("button", { name: T("merchantOrder.action.accept"), exact: true }).click(); await sheet().waitFor(); await wait(400); };
  await shot("1.11", "m04", "accept-sheet", "M04 Accept sheet: confirmation sentence (prepare 1 item for 20.10.2026 at Pickup point Bahnhof, pay CHF 26.70 within 24 hours) and the consequence button", { open: openAccept });
  await openAccept();
  await sheet().getByRole("button", { name: /26\.70/ }).click(); await wait(1000); await closeToasts();
  await shot("1.11", "m04", "accepted", `M04 ${boxRef}: accepted, payment requested CHF 26.70, log updated`, { full: true });
});

// ---------- 1.11 decline sheet + shared confirm dialog on seeded SK-1031 (kept, not declined)
await step("decline", async () => {
  await m04("SK-1031");
  const openDecline = async () => {
    await page.getByRole("button", { name: T("merchantOrder.action.decline"), exact: true }).click();
    await sheet().waitFor(); await wait(400);
    await sheet().getByRole("radio", { name: T("merchantOrder.decline.reason.date") }).check({ force: true });
    await wait(300);
  };
  await shot("1.11", "m04", "decline-sheet", "M04 Decline sheet on SK-1031: reason chosen (can't prepare for the requested date), optional message field left empty", { open: openDecline });
  const openConfirm = async () => {
    await openDecline();
    await sheet().getByRole("button", { name: T("merchantOrder.decline.submit") }).click(); await wait(700);
  };
  const keep = async () => { await page.getByRole("alertdialog").getByRole("button", { name: T("merchantOrder.decline.keep") }).click(); await wait(500); await escapeAll(); };
  await shot("1.11", "m04", "decline-confirm", "M04 Decline: shared confirmation dialog 'Decline order SK-1031?' with Keep request focused", { open: openConfirm, close: keep });
});

// ---------- accept knife; guest pays knife in full and gift box deposit
await step("accept-knife-and-pay", async () => {
  await m04(knifeRef);
  await page.getByRole("button", { name: T("merchantOrder.action.accept"), exact: true }).click();
  await sheet().waitFor(); await wait(400);
  await sheet().getByRole("button", { name: /54\.00/ }).click(); await wait(1000);
  await role("Guest");
  for (const [ref, amt] of [[knifeRef, /54\.00/], [boxRef, /26\.70/]]) {
    await c15(ref);
    await page.getByRole("link", { name: amt }).or(page.getByRole("button", { name: amt })).first().click(); await wait(1300);
    await page.getByRole("button", { name: amt }).first().click(); await wait(1600);
    log(ref, (await ord(ref)).status);
  }
  await role(M);
});

// ---------- 1.15 fulfilment on the gift box (CHF 62.30 owed)
await step("fulfilment", async () => {
  await m04(boxRef);
  await click(T("fulfilment.action.ready")); await closeToasts();
  await shot("1.15", "m04", "ready-owed", `M04 ${boxRef}: Ready for pickup, deposit paid, CHF 62.30 owed: Mark as handed over, Record payment, Complete locked (not handed over yet)`, { full: true });
  await click(T("fulfilment.action.handOver")); await closeToasts();
  await shot("1.15", "m04", "handed-over-complete-locked", `M04 ${boxRef}: Handed over, Record payment primary, Complete locked with 'CHF 62.30 still owed'`, { full: true });
  await shot("1.15", "m08", "record-payment", "M08 Record payment sheet: still owed CHF 62.30, amount, method, received at, note, button 'Record CHF 62.30 cash. Balance will be CHF 0.00.'", { open: () => openRecord(null), de: true });
  await openRecord(null); await submitRecord();
  await shot("1.15", "m04", "handed-over-paid", `M04 ${boxRef}: Handed over and paid in full, Complete order with its consequence line`, { full: true });
  await click(T("fulfilment.action.complete")); await closeToasts();
  await shot("1.15", "m04", "completed-commission-recorded", `M04 ${boxRef}: Order completed by Lukas, payments CHF 89.00 paid, commission Recorded`, { full: true, de: true });
  // Knife: paid in full online → Mark as ready gives the combined button
  await m04(knifeRef);
  await click(T("fulfilment.action.ready")); await closeToasts();
  await shot("1.15", "m04", "ready-paid-combined", `M04 ${knifeRef}: Ready and paid in full, one button 'Handed over and complete'`, { full: true });
  // Seeded SK-1021 (ready, CHF 62.30 owed): above balance, then duplicate
  await m04("SK-1021");
  await shot("1.15", "m08", "above-balance", "M08 Record payment on SK-1021: CHF 70 entered, 'More than the CHF 62.30 still owed', button disabled", { open: () => openRecord(70) });
  await openRecord(20); await submitRecord();
  await shot("1.15", "m08", "duplicate-warning", "M08 Record payment on SK-1021: CHF 20 again within 10 minutes, 'Possible duplicate' warning and 'Record … again' button", { open: () => openRecord(20) });
});

// ---------- 1.11 last-item race on the print (SK-1032 and SK-1033 both want the one print)
await step("race", async () => {
  await m04("SK-1032");
  await page.getByRole("button", { name: T("merchantOrder.action.accept"), exact: true }).click();
  await sheet().waitFor(); await wait(400);
  await sheet().getByRole("button", { name: new RegExp(`^(${esc(T("merchantOrder.accept.confirmPayLater"))}|${esc(T("merchantOrder.accept.confirm", { amount: "X" }).split(" ")[0])} )`) }).click();
  await wait(1000);
  log("SK-1032", (await ord("SK-1032")).status);
  await m04("SK-1033");
  await shot("1.11", "m04", "stock-short", "M04 SK-1033 after SK-1032 took the last print: stock line 'Not enough: 0 available · 1 needed'", { full: true });
  const pressAccept = async () => { await page.getByRole("button", { name: T("merchantOrder.action.accept"), exact: true }).click(); await wait(800); };
  await shot("1.11", "m04", "stock-short-accept-alert", "M04 SK-1033: Accept pressed while stock is short, danger Alert names the print, order stays awaiting confirmation", { full: true, open: pressAccept, close: async () => {} });
});

writeFileSync(ROOT + "docs/ux/prototype/reports/1.17r-review-state.json", JSON.stringify(await demo()));
log("saved review state");
await browser.close();
process.exit(0);
