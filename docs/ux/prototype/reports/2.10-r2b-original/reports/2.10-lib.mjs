// Shared helpers for the 2.10–2.14 drivers (worker C). Headless chromium via playwright-core.
// Usage from a driver: import * as d from "./2.10-lib.mjs"; const { page } = await d.open(375);
import { chromium } from "playwright-core";
import { mkdirSync, readdirSync } from "node:fs";

const home = process.env.HOME + "/.cache/ms-playwright/";
const dir = readdirSync(home).filter((x) => x.startsWith("chromium_headless_shell-")).sort().pop();
const exe = `${home}${dir}/chrome-headless-shell-linux64/chrome-headless-shell`;
export const BASE = "http://localhost:5233/";
export const ROOT = "/home/ross-geller/Projects/minastik/swiss-keepsakes/docs/ux/prototype/screens";
const RAW_KEY = /\b(tourMerchant|tourMail|tours|tourBooking|tourDiscovery|tourReviews|partnerReport|merchantToday|recordPayment|fulfilment|order\.block)\.[a-zA-Z]/;

let pass = 0, fail = 0;
export const check = (name, ok, extra = "") => {
  ok ? pass++ : fail++;
  console.log(ok ? "PASS" : "FAIL", name, extra === "" ? "" : `| ${extra}`);
  return ok;
};
export const summary = () => console.log(`\nSUMMARY ${pass} passed, ${fail} failed`);

export async function open(width = 375) {
  const browser = await chromium.launch({ executablePath: exe });
  const context = await browser.newContext({ viewport: { width, height: 812 }, deviceScaleFactor: 1 });
  const page = await context.newPage();
  page.on("console", (m) => { if (m.type() === "error") console.log("CONSOLE", m.text().slice(0, 300)); });
  page.on("pageerror", (e) => console.log("PAGEERROR", e.message));
  return { browser, context, page, width };
}

export const wait = (page, ms = 500) => page.waitForTimeout(ms);
/** Flattens visible text: line breaks and table cells become " | ", narrow and no-break spaces become spaces. */
export const flat = (value) => value.replace(/[\u00a0\u202f]/g, " ").replace(/\s*[\n\t]\s*/g, " | ");
export const text = async (page, sel = "main") => flat(await page.locator(sel).first().innerText());

/** Fresh seed (Reset) with the given role; language EN. */
export async function reset(page, role = "owner") {
  await page.goto(BASE);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await wait(page, 900);
  await page.evaluate((r) => {
    const s = JSON.parse(localStorage.getItem("sk.demo"));
    s.role = r;
    localStorage.setItem("sk.demo", JSON.stringify(s));
  }, role);
}

export async function go(page, hash, ms = 900) {
  await page.goto(BASE + "#" + hash);
  await page.reload();
  await wait(page, ms);
}

export const state = (page) => page.evaluate(() => JSON.parse(localStorage.getItem("sk.demo")));
export const booking = async (page, id) => (await state(page)).data.tours.bookings.find((b) => b.id === id);
export const mail = async (page) => (await state(page)).data.mail;

/** Change the stored demo state (then reload so the app reads it). */
export async function patch(page, fn, arg) {
  await page.evaluate(([src, a]) => {
    const s = JSON.parse(localStorage.getItem("sk.demo"));
    // eslint-disable-next-line no-new-func
    new Function("s", "a", src)(s, a);
    localStorage.setItem("sk.demo", JSON.stringify(s));
  }, [fn, arg]);
  await page.reload();
  await wait(page, 900);
}

export async function setLang(page, id) {
  await page.getByRole("group", { name: "Language" }).getByRole("button", { name: id }).first().click();
  await wait(page, 400);
}

export async function setRole(page, role) {
  await page.evaluate((r) => {
    const s = JSON.parse(localStorage.getItem("sk.demo"));
    s.role = r;
    localStorage.setItem("sk.demo", JSON.stringify(s));
  }, role);
  await page.reload();
  await wait(page, 900);
}

/** Screenshot to screens/<step>/<name>.png plus overflow and raw-key checks. */
export async function shot(page, step, name, fullPage = true, selector = null) {
  // SHOT_DIR (e.g. "-r2/drive") sends round-2 shots to screens/2.N-r2/drive/, keeping round 1.
  step = `${step}${process.env.SHOT_DIR ?? ""}`;
  mkdirSync(`${ROOT}/${step}`, { recursive: true });
  await wait(page, 400);
  // Tall viewport instead of fullPage, so the fixed header and tab bar stay at the edges
  // and never cover the content in the middle of the image.
  const size = page.viewportSize();
  if (fullPage || selector) {
    const height = await page.evaluate(() => document.documentElement.scrollHeight);
    await page.setViewportSize({ width: size.width, height: Math.max(size.height, height) });
    await wait(page, 300);
  }
  if (selector) await page.locator(selector).first().screenshot({ path: `${ROOT}/${step}/${name}.png` });
  else await page.screenshot({ path: `${ROOT}/${step}/${name}.png` });
  await page.setViewportSize(size);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  check(`no horizontal overflow (${name})`, overflow <= 0, `overflow ${overflow}px`);
  const body = await page.locator("body").innerText();
  const raw = body.match(RAW_KEY);
  check(`no raw i18n keys (${name})`, !raw, raw ? raw[0] : "");
}

/** Shoot EN, switch to DE and shoot, switch back. */
export async function both(page, step, name, fullPage = true, selector = null) {
  await shot(page, step, `${name}-en`, fullPage, selector);
  await setLang(page, "DE");
  await shot(page, step, `${name}-de`, fullPage, selector);
  await setLang(page, "EN");
}

/** Press a button inside the confirm dialog. */
export async function confirmDialog(page, accept = true) {
  const dialog = page.getByRole("alertdialog").or(page.getByRole("dialog")).last();
  await dialog.waitFor({ timeout: 4000 });
  const buttons = dialog.getByRole("button");
  const labels = await buttons.allInnerTexts();
  if (accept) await buttons.nth(labels.length - 1).click();
  else await dialog.getByRole("button", { name: /Cancel|Abbrechen|Go back|Zurück/ }).first().click();
  await wait(page, 600);
  return labels;
}

/** Opens the prototype controls drawer and presses a button by name. */
export async function protoButton(page, name) {
  await page.getByRole("region", { name: "Prototype controls" }).getByRole("button").nth(0).click();
  await wait(page, 600);
  const button = page.getByRole("button", { name });
  const disabled = await button.isDisabled();
  if (!disabled) await button.click();
  else await page.keyboard.press("Escape");
  await wait(page, 800);
  return !disabled;
}

export async function signInGuest(page, returnTo = "/account") {
  await page.goto(BASE + `#/sign-in?returnTo=${returnTo}`);
  await wait(page, 800);
  await page.getByRole("button", { name: /Continue with Google/ }).click();
  await wait(page, 1200);
}
