// Round 2 fix pass (worker R1, 14 Oct 2026): gift-vs-tour pairs for C10 (2.4) and C11 + C05 (2.5)
// after the fixes in phase2-r2-comparison.md. Same shots as 2.4-2.8-r2-capture.mjs, into new
// folders, without C13 (now R2's), plus the pay-later C11 (coordinator decision D4).
// 375px, DPR 2, full page by growing the viewport (keeps sticky bars in place).
// Run from a folder with playwright-core installed, against `vite --port 5231`:
//   node 2.4-2.5-r2b-capture.mjs <repo root>
// Writes docs/ux/prototype/screens/2.{4,5}-r2b/<screen>-{gift,tour}-{en,de}.png and side-by-side PNGs.
import { chromium } from "playwright-core";
import { execFileSync } from "node:child_process";
import { mkdirSync, readdirSync } from "node:fs";

const ROOT = process.argv[2] ?? "/home/ross-geller/Projects/minastik/swiss-keepsakes";
const SCREENS = `${ROOT}/docs/ux/prototype/screens`;
const BASE = process.env.BASE ?? "http://localhost:5231/";
const home = process.env.HOME + "/.cache/ms-playwright/";
const dir = readdirSync(home).filter((d) => d.startsWith("chromium_headless_shell-")).sort().pop();
const browser = await chromium.launch({ executablePath: `${home}${dir}/chrome-headless-shell-linux64/chrome-headless-shell` });
const page = await browser.newPage({ viewport: { width: 375, height: 812 }, deviceScaleFactor: 2 });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => m.type() === "error" && errors.push(m.text().slice(0, 200)));
const wait = (ms = 400) => page.waitForTimeout(ms);
const RAW_KEY = /\b(tourDiscovery|tourBooking|tours|checkout|cart|requestSent|tripProfile|auth)\.[a-zA-Z]/;
const bar = page.getByRole("region", { name: "Prototype controls" });
const lang = async (l) => { const y = await page.evaluate(() => scrollY); await page.evaluate(() => scrollTo(0, 0)); await bar.getByRole("button", { name: l, exact: true }).click(); await wait(400); await page.evaluate((t) => scrollTo(0, t), y); await wait(200); };

/** Screenshot to screens/<step>/<name>.png; full page grows the viewport to the document height. */
async function shot(step, name, { full = true } = {}) {
  mkdirSync(`${SCREENS}/${step}`, { recursive: true });
  await wait(500);
  if (full) {
    const h = await page.evaluate(() => document.documentElement.scrollHeight);
    await page.setViewportSize({ width: 375, height: Math.min(h, 8000) });
    await wait(300);
  }
  await page.screenshot({ path: `${SCREENS}/${step}/${name}.png` });
  if (full) await page.setViewportSize({ width: 375, height: 812 });
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  const raw = name.endsWith("-de") ? ((await page.locator("body").innerText()).match(RAW_KEY)?.[0] ?? "") : "";
  console.log(`${overflow <= 0 && !raw ? "OK  " : "FAIL"} ${step}/${name}.png · overflow ${overflow}${raw ? ` · raw key ${raw}` : ""}`);
}
const both = async (step, name, opts) => { await shot(step, `${name}-en`, opts); await lang("DE"); await shot(step, `${name}-de`, opts); await lang("EN"); };
const sideBySide = (step, left, right, out) => {
  execFileSync("magick", [`${SCREENS}/${step}/${left}.png`, "-size", "24x1", "xc:#dcdcd7", `${SCREENS}/${step}/${right}.png`, "-background", "#dcdcd7", "-gravity", "north", "+append", `${SCREENS}/${step}/${out}.png`]);
  console.log(`OK   ${step}/${out}.png · ${left} | ${right}`);
};
const reset = async () => { await page.goto(BASE); await page.evaluate(() => localStorage.clear()); await page.reload(); await wait(800); };
const signIn = async (returnTo) => {
  await page.goto(BASE + `#/sign-in?returnTo=${encodeURIComponent(returnTo)}`); await wait(700);
  await page.getByRole("button", { name: /Continue with Google/ }).click(); await wait(1000);
};
async function addGift(slug, variant, engraving, day, place) {
  await page.goto(BASE + "#/gifts/" + slug); await wait(900);
  await page.getByRole("button", { name: /^Add to cart$/ }).last().click();
  const sheet = page.getByRole("dialog"); await sheet.waitFor();
  if (variant) await sheet.getByRole("row", { name: new RegExp(variant) }).click();
  if (engraving) await sheet.getByLabel(/Engraving/).first().fill(engraving);
  await sheet.getByRole("gridcell").filter({ hasText: new RegExp(`^${day}$`) }).first().click();
  await sheet.getByRole("radio", { name: new RegExp(place) }).check({ force: true });
  await sheet.getByRole("button", { name: /Add to cart ·/ }).click(); await wait(400);
}

// ---- Gift references ----
await reset();
// C03 option sheet: option tiles and the quantity row (reference for C10).
await page.goto(BASE + "#/gifts/kapellbruecke-pocket-knife"); await wait(900);
await page.getByRole("button", { name: /^Add to cart$/ }).last().click();
await page.getByRole("dialog").waitFor(); await wait(700);
await shot("2.4-r2b", "c10-gift-en", { full: false });
await page.getByRole("dialog").getByRole("row", { name: /Medium/ }).click();
await page.evaluate(() => document.querySelector("[role=dialog] .overflow-y-auto")?.scrollBy(0, 700)); await wait(400);
await shot("2.4-r2b", "c10-gift-sheet-place-en", { full: false });
await page.goto(BASE); await page.reload(); await wait(800);
// C04 → C05 → C06 → C07.
await addGift("kapellbruecke-pocket-knife", "Medium", "Anna", 21, "Shop Altstadt");
await addGift("lucerne-gift-box", null, null, 20, "Shop Altstadt");
await page.goto(BASE + "#/cart"); await wait(6500); // the "Added to cart" toast expires
await page.getByRole("checkbox", { name: "Select all" }).check({ force: true }); await wait(300);
await page.getByRole("button", { name: "Continue" }).click(); await wait(800);
await shot("2.5-r2b", "c05-gift-en", { full: false });
await page.getByRole("button", { name: /Continue with Google/ }).click(); await wait(1500);
await shot("2.5-r2b", "c11-gift-en");

// ---- Tour screens ----
await reset();
// C10, walk, Fri 16 Oct (30% deposit), 2 adults and 1 child.
await page.goto(BASE + "#/tours/lucerne-old-town-walk/book"); await wait(900);
await page.locator(".radio").filter({ hasText: "Fri 16 Oct" }).click(); await wait(300);
await both("2.4-r2b", "c10-tour");
await shot("2.4-r2b", "c10-tour-viewport-en", { full: false });
// Over capacity: a group of 5 on the 3-seat departure.
await page.locator(".radio").filter({ hasText: "Tue 20 Oct" }).click();
await page.getByRole("button", { name: "Increase" }).nth(0).click();
await page.getByRole("button", { name: "Increase" }).nth(0).click();
await page.locator(".radio").filter({ hasText: "Fri 23 Oct" }).click(); await wait(300);
await page.getByText("Your group needs more seats").scrollIntoViewIfNeeded();
await page.evaluate(() => scrollBy(0, 200));
await both("2.4-r2b", "c10-over-capacity-tour", { full: false });
await page.locator(".radio").filter({ hasText: "Fri 16 Oct" }).click();
await page.getByRole("button", { name: "Decrease" }).nth(0).click();
await page.getByRole("button", { name: "Decrease" }).nth(0).click(); await wait(300);
// Sold-out tour.
await page.goto(BASE + "#/tours/engraving-workshop/book"); await wait(900);
await shot("2.4-r2b", "c10-sold-out-tour-en");
// C11 signed out, then C05 from C11, then C11 signed in with the contact filled.
// Opening another tour's C10 resets the draft, so choose Fri 16 Oct again.
await page.goto(BASE + "#/tours/lucerne-old-town-walk/book"); await wait(900);
await page.locator(".radio").filter({ hasText: "Fri 16 Oct" }).click(); await wait(300);
await page.getByRole("button", { name: /Review booking/ }).last().click(); await wait(800);
await both("2.5-r2b", "c11-signed-out-tour");
await page.getByLabel("Contact name").fill("Anna Keller");
await page.getByLabel("Mobile number").fill("+41 79 123 45 67");
await page.getByLabel("Child’s name (optional)").fill("Alex");
await page.locator("form button[type=submit]").click(); await wait(900);
await shot("2.5-r2b", "c05-tour-en", { full: false });
await page.getByRole("button", { name: /Continue with Google/ }).click(); await wait(1200);
await both("2.5-r2b", "c11-tour");
await shot("2.5-r2b", "c11-tour-viewport-en", { full: false });
// Pay later (lake tour, 17 Oct): nothing due now, so "Pay now" is a plain row (D4).
await page.goto(BASE + "#/tours/lake-lucerne-stories/book"); await wait(900);
await page.locator(".radio").filter({ hasText: "17 Oct" }).click(); await wait(300);
await page.getByRole("button", { name: /Review booking/ }).last().click(); await wait(800);
await both("2.5-r2b", "c11-pay-later-tour");

sideBySide("2.4-r2b", "c10-gift-en", "c10-tour-viewport-en", "c10-side-by-side-en");
sideBySide("2.5-r2b", "c11-gift-en", "c11-tour-en", "c11-side-by-side-en");
sideBySide("2.5-r2b", "c05-gift-en", "c05-tour-en", "c05-side-by-side-en");
console.log(errors.length ? `ERRORS ${errors.join(" | ")}` : "no page or console errors");
await browser.close();
