// 2.4-r5: C03 "Your gift" sheet captured before and after GiftSheet moved onto the shared
// ChoiceSheet wrapper. Same states, same data, 375px DPR 2; compare the pairs with
//   compare -metric AE before/<x>.png after/<x>.png null:
// and the dialog markup (React Aria ids normalised) with diff.
//   node 2.4-r5-c03-ae.mjs <before|after> [repo root]
import { chromium } from "playwright-core";
import { mkdirSync, readdirSync, writeFileSync } from "node:fs";

const MODE = process.argv[2] ?? "after";
const ROOT = process.argv[3] ?? "/home/ross-geller/Projects/minastik/swiss-keepsakes";
const OUT = `${ROOT}/docs/ux/prototype/screens/2.4-r5/c03-ae/${MODE}`;
const BASE = process.env.BASE ?? "http://localhost:5231/";
mkdirSync(OUT, { recursive: true });
const home = process.env.HOME + "/.cache/ms-playwright/";
const dir = readdirSync(home).filter((d) => d.startsWith("chromium_headless_shell-")).sort().pop();
const browser = await chromium.launch({ executablePath: `${home}${dir}/chrome-headless-shell-linux64/chrome-headless-shell` });
const context = await browser.newContext({ viewport: { width: 375, height: 812 }, deviceScaleFactor: 2 });
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

const setLang = async (l) => {
  await page.getByRole("group", { name: "Language" }).getByRole("button", { name: l }).first().click();
  await wait(400);
};
const openSheet = async (slug) => {
  await page.goto(BASE + "#/gifts/" + slug); await wait(1200);
  await page.getByRole("button", { name: /^(Add to cart|In den Warenkorb)$/ }).last().click();
  await page.getByRole("dialog").waitFor(); await wait(900);
  await page.mouse.move(2, 2); await wait(200);
  return page.getByRole("dialog");
};
const markup = async (name) => {
  const html = await page.getByRole("dialog").evaluate((d) => d.closest("[data-slot=drawer-backdrop], .drawer__backdrop")?.outerHTML ?? d.outerHTML);
  writeFileSync(`${OUT}/${name}.html`, html.replace(/react-aria\d*-:?[\w:-]+?:?(?=["\s])/g, "ID").replace(/_r_[\w]+_/g, "ID").replace(/:r[\w]+:/g, "ID").replace(/></g, ">\n<"));
};
const shot = async (name) => { await wait(300); await page.screenshot({ path: `${OUT}/${name}.png` }); console.log(`${MODE}/${name}.png`); };

for (const lang of ["EN", "DE"]) {
  const l = lang.toLowerCase();
  await page.goto(BASE); await page.evaluate(() => localStorage.clear()); await page.reload(); await wait(800);
  if (lang === "DE") await setLang("DE");
  let sheet = await openSheet("kapellbruecke-pocket-knife");
  await shot(`sheet-top-${l}`);
  await markup(`sheet-${l}`);
  await sheet.getByRole("row").nth(1).click(); await wait(300); await page.mouse.move(2, 2); await wait(300);
  await shot(`sheet-selected-${l}`);
  await sheet.locator("[data-slot=drawer-body], .drawer__body").first().evaluate((b) => b.scrollTo(0, b.scrollHeight)); await wait(400);
  await shot(`sheet-bottom-${l}`);
  sheet = await openSheet("personal-name-knife");
  await shot(`engraving-top-${l}`);
  await page.goto(BASE); await wait(700);
  if (lang === "DE") await setLang("EN");
}
console.log(errors.length ? `ERRORS ${JSON.stringify(errors)}` : "no page or console errors");
await browser.close();
