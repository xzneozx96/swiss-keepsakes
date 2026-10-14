// Round 3 (worker S, 14 Oct 2026): C11 signed out, the "Sign in to book" block moves into the sticky footer.
// 375px, DPR 2, full page by growing the viewport (keeps the sticky bars in place).
//   PHASE=before|after: C11 signed in (filled, full page and footer viewport) and pay later, EN and DE,
//     into screens/2.5-r3/<PHASE>/ for the pixel compare. Run before twice to prove the shots are stable.
//   PHASE=final (default): the gift-vs-tour pairs into screens/2.5-r3/, plus the footer checks:
//     content never under the footer (scrolled to the bottom, with the capacity error, Tab walk),
//     footer height, and the footer padding against the C04 and C06 sticky bars.
// Run from a folder with playwright-core installed, against `vite --port 5231`:
//   node 2.5-r3-capture.mjs <repo root>
import { chromium } from "playwright-core";
import { execFileSync } from "node:child_process";
import { mkdirSync, readdirSync } from "node:fs";

const ROOT = process.argv[2] ?? "/home/ross-geller/Projects/minastik/swiss-keepsakes";
const PHASE = process.env.PHASE ?? "final";
const DIR = PHASE === "final" ? "2.5-r3" : `2.5-r3/${PHASE}`;
const SCREENS = `${ROOT}/docs/ux/prototype/screens`;
const BASE = process.env.BASE ?? "http://localhost:5231/";
const home = process.env.HOME + "/.cache/ms-playwright/";
const dir = readdirSync(home).filter((d) => d.startsWith("chromium_headless_shell-")).sort().pop();
const browser = await chromium.launch({ executablePath: `${home}${dir}/chrome-headless-shell-linux64/chrome-headless-shell` });
const page = await browser.newPage({ viewport: { width: 375, height: 812 }, deviceScaleFactor: 2 });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => m.type() === "error" && errors.push(m.text().slice(0, 200)));
let pass = 0, fail = 0;
const check = (name, ok, extra = "") => { ok ? pass++ : fail++; console.log(ok ? "PASS" : "FAIL", name, extra === "" ? "" : `| ${extra}`); };
const wait = (ms = 400) => page.waitForTimeout(ms);
const RAW_KEY = /\b(tourDiscovery|tourBooking|tours|checkout|cart|requestSent|tripProfile|auth)\.[a-zA-Z]/;
const bar = page.getByRole("region", { name: "Prototype controls" });
const lang = async (l) => { const y = await page.evaluate(() => scrollY); await page.evaluate(() => scrollTo(0, 0)); await bar.getByRole("button", { name: l, exact: true }).click(); await wait(400); await page.evaluate((t) => scrollTo(0, t), y); await wait(200); };
const images = () => page.waitForFunction(() => [...document.images].every((i) => i.complete), null, { timeout: 5000 }).catch(() => console.log("WARN images still loading"));
const bottom = () => page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));

/** Screenshot to screens/<DIR>/<name>.png; full page grows the viewport to the document height. */
async function shot(name, { full = true, at = "top" } = {}) {
  mkdirSync(`${SCREENS}/${DIR}`, { recursive: true });
  await wait(400);
  if (full) {
    const h = await page.evaluate(() => document.documentElement.scrollHeight);
    await page.setViewportSize({ width: 375, height: Math.min(h, 8000) });
  } else if (at === "bottom") await bottom();
  else await page.evaluate(() => scrollTo(0, 0));
  await wait(300);
  await images();
  await page.screenshot({ path: `${SCREENS}/${DIR}/${name}.png` });
  if (full) await page.setViewportSize({ width: 375, height: 812 });
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  const raw = name.endsWith("-de") ? ((await page.locator("body").innerText()).match(RAW_KEY)?.[0] ?? "") : "";
  check(`${DIR}/${name}.png: no overflow${name.endsWith("-de") ? ", no raw keys" : ""}`, overflow <= 0 && !raw, `overflow ${overflow}${raw ? ` · raw key ${raw}` : ""}`);
}
const both = async (name, opts) => { await shot(`${name}-en`, opts); await lang("DE"); await shot(`${name}-de`, opts); await lang("EN"); };
const sideBySide = (left, right, out) => {
  execFileSync("magick", [`${SCREENS}/${DIR}/${left}.png`, "-size", "24x1", "xc:#dcdcd7", `${SCREENS}/${DIR}/${right}.png`, "-background", "#dcdcd7", "-gravity", "north", "+append", `${SCREENS}/${DIR}/${out}.png`]);
  console.log(`OK   ${DIR}/${out}.png · ${left} | ${right}`);
};
const reset = async () => { await page.goto(BASE); await page.evaluate(() => localStorage.clear()); await page.reload(); await wait(800); };
const toC11 = async (slug, day) => {
  await page.goto(BASE + `#/tours/${slug}/book`); await wait(900);
  await page.locator(".radio").filter({ hasText: day }).click(); await wait(300);
  await page.getByRole("button", { name: /Review booking/ }).last().click(); await wait(800);
};
const fill = async () => {
  await page.getByLabel("Contact name").fill("Anna Keller");
  await page.getByLabel("Mobile number").fill("+41 79 123 45 67");
  await page.getByLabel("Child’s name (optional)").fill("Alex");
};
const signInFromC11 = async () => {
  await page.locator("form button[type=submit]").click(); await wait(900);
  await page.getByRole("button", { name: /Continue with Google/ }).click(); await wait(1200);
};

/** The sticky bar holding the given action: its box, padding, and the content column's last box. */
const footerFacts = (actionSelector) => page.evaluate((sel) => {
  const footer = document.querySelector(sel).closest(".sticky");
  const s = getComputedStyle(footer);
  const r = footer.getBoundingClientRect();
  return { top: r.top, height: r.height, pt: s.paddingTop, pb: s.paddingBottom, px: `${s.paddingLeft} ${s.paddingRight}`, pbClass: footer.className.match(/pb-\[[^\]]+\]/)?.[0] ?? "" };
}, actionSelector);
/** Bottom of the last visible element in C11's content column (the cards, the alert). */
const contentBottom = () => page.evaluate(() => {
  const column = document.querySelector("form > div:first-child");
  return Math.max(...[...column.querySelectorAll(":scope > *")].map((el) => el.getBoundingClientRect().bottom));
});

/** Scrolled to the bottom, the last content ends above the footer. */
async function notCovered(label) {
  await bottom(); await wait(300);
  const f = await footerFacts("form button[type=submit]");
  const b = await contentBottom();
  check(`${label}: content ends above the footer when scrolled to the bottom`, b <= f.top + 0.5, `content bottom ${b.toFixed(1)} · footer top ${f.top.toFixed(1)} · footer ${f.height.toFixed(1)}px of 812`);
  return f;
}

/** Tab from the top through C11 until the submit button: no focused element sits under the footer. */
async function tabWalk(label) {
  await page.evaluate(() => { document.activeElement?.blur(); scrollTo(0, 0); });
  const covered = [];
  let steps = 0;
  for (; steps < 60; steps++) {
    await page.keyboard.press("Tab"); await wait(120);
    const info = await page.evaluate(() => {
      const el = document.activeElement;
      const footer = document.querySelector("form button[type=submit]").closest(".sticky");
      const r = el.getBoundingClientRect(), f = footer.getBoundingClientRect();
      return { name: el.getAttribute("name") || el.getAttribute("aria-label") || el.textContent.trim().slice(0, 30), inFooter: footer.contains(el), inForm: !!el.closest("form"), bottom: r.bottom, top: f.top };
    });
    if (info.inFooter) break;
    if (info.inForm && info.bottom > info.top + 0.5) covered.push(`${info.name} (${info.bottom.toFixed(0)} > ${info.top.toFixed(0)})`);
  }
  check(`${label}: Tab walk, no focused field under the footer`, covered.length === 0 && steps < 60, covered.join(", ") || `${steps} stops before the footer button`);
}

if (PHASE !== "final") {
  // Signed in, filled (the approved state that must not change), then pay later.
  await reset();
  await toC11("lucerne-old-town-walk", "Fri 16 Oct");
  await fill();
  await signInFromC11();
  await both("c11-tour");
  await both("c11-tour-viewport", { full: false, at: "bottom" });
  await toC11("lake-lucerne-stories", "17 Oct");
  await both("c11-pay-later-tour");
  await both("c11-pay-later-tour-viewport", { full: false, at: "bottom" });
} else {
  // ---- Gift references: the C04 and C06 sticky bars ----
  await reset();
  await page.goto(BASE + "#/gifts/kapellbruecke-pocket-knife"); await wait(900);
  await page.getByRole("button", { name: /^Add to cart$/ }).last().click();
  const sheet = page.getByRole("dialog"); await sheet.waitFor();
  await sheet.getByRole("row", { name: /Medium/ }).click();
  await sheet.getByLabel(/Engraving/).first().fill("Anna");
  await sheet.getByRole("gridcell").filter({ hasText: /^21$/ }).first().click();
  await sheet.getByRole("radio", { name: /Shop Altstadt/ }).check({ force: true });
  await sheet.getByRole("button", { name: /Add to cart ·/ }).click(); await wait(400);
  await page.goto(BASE + "#/cart"); await wait(6500); // the "Added to cart" toast expires
  await page.getByRole("checkbox", { name: "Select all" }).check({ force: true }); await wait(300);
  await shot("c04-gift-viewport-en", { full: false, at: "bottom" });
  const c04 = await footerFacts("[data-cart-bar] button");
  await page.getByRole("button", { name: "Continue" }).click(); await wait(800);
  await page.getByRole("button", { name: /Continue with Google/ }).click(); await wait(1500);
  await shot("c11-gift-en");
  await shot("c11-gift-viewport-en", { full: false, at: "bottom" });
  const c06 = await footerFacts(".sticky.bottom-0 button");
  console.log("C04 bar:", JSON.stringify(c04));
  console.log("C06 bar:", JSON.stringify(c06));

  // ---- Tour C11 signed out ----
  await reset();
  await toC11("lucerne-old-town-walk", "Fri 16 Oct");
  await both("c11-signed-out-tour");
  await both("c11-signed-out-tour-viewport", { full: false, at: "bottom" });
  await shot("c11-signed-out-tour-top-en", { full: false });
  for (const l of ["EN", "DE"]) {
    if (l === "DE") await lang("DE");
    const f = await notCovered(`signed out ${l}`);
    console.log(`C11 signed-out footer ${l}:`, JSON.stringify(f));
    check(`signed out ${l}: footer padding matches the C06 bar (top, sides, bottom with safe area)`, f.pt === c06.pt && f.px === c06.px && f.pb === c06.pb && f.pbClass === c06.pbClass, `C11 ${f.pt}/${f.px}/${f.pb} ${f.pbClass} · C06 ${c06.pt}/${c06.px}/${c06.pb} ${c06.pbClass}`);
    check(`signed out ${l}: footer bottom padding matches the C04 bar`, f.pb === c04.pb && f.pbClass === c04.pbClass, `C04 ${c04.pt}/${c04.pb} ${c04.pbClass}`);
    check(`signed out ${l}: heading, one-sentence description and the button share the footer`, await page.evaluate(() => {
      const footer = document.querySelector("form button[type=submit]").closest(".sticky");
      const p = footer.querySelector("p");
      return !!footer.querySelector("h2#tour-review-sign-in") && !!p && (p.textContent.match(/[.!?](\s|$)/g) ?? []).length === 1;
    }));
    await tabWalk(`signed out ${l}`);
    if (l === "DE") await lang("EN");
  }
  // Signed out with the capacity error (walk-23 has 3 seats left for the 2 adults and 1 child,
  // then a competing guest takes them).
  await toC11("lucerne-old-town-walk", "Fri 23 Oct");
  await page.evaluate(() => scrollTo(0, 0));
  await page.getByRole("region", { name: "Prototype controls" }).getByRole("button").first().click(); await wait(500);
  await page.getByRole("dialog").getByRole("button", { name: "Another guest takes the last seats" }).click(); await wait(800);
  check("signed out: capacity error shown", (await page.locator("[role=alert]").count()) > 0);
  await notCovered("signed out, capacity error");
  await tabWalk("signed out, capacity error");
  await both("c11-signed-out-error-tour-viewport", { full: false, at: "bottom" });

  // ---- Tour C11 signed in (unchanged) and pay later, for the pairs ----
  await reset();
  await toC11("lucerne-old-town-walk", "Fri 16 Oct");
  await fill();
  await signInFromC11();
  await both("c11-tour");
  await notCovered("signed in EN");
  await tabWalk("signed in EN");
  await lang("DE");
  await tabWalk("signed in DE");
  await lang("EN");

  sideBySide("c11-gift-viewport-en", "c11-signed-out-tour-viewport-en", "c11-signed-out-side-by-side-en");
  sideBySide("c04-gift-viewport-en", "c11-signed-out-tour-viewport-en", "c04-c11-signed-out-side-by-side-en");
  sideBySide("c11-gift-en", "c11-signed-out-tour-en", "c11-signed-out-full-side-by-side-en");
}
console.log(errors.length ? `ERRORS ${errors.join(" | ")}` : "no page or console errors");
console.log(`\nRESULT ${pass} passed, ${fail} failed`);
await browser.close();
