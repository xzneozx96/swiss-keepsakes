// 2.4-r5: C09 with the sheet closed, before and after "Choose a departure" started opening the
// C10 sheet. First screen (gallery, title, the sticky bar with the button) and the pricing block,
// 375px DPR 2, EN and DE. The map is left out: its tiles come from the network.
//   node 2.4-r5-c09-ae.mjs <before|after> [repo root]
import { chromium } from "playwright-core";
import { mkdirSync, readdirSync } from "node:fs";

const MODE = process.argv[2] ?? "after";
const ROOT = process.argv[3] ?? "/home/ross-geller/Projects/minastik/swiss-keepsakes";
const OUT = `${ROOT}/docs/ux/prototype/screens/2.4-r5/c09-ae/${MODE}`;
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
const wait = (ms = 400) => page.waitForTimeout(ms);
const setLang = async (l) => {
  await page.getByRole("group", { name: "Language" }).getByRole("button", { name: l }).first().click();
  await wait(400);
};
const shot = async (name, clip) => { await wait(400); await page.screenshot({ path: `${OUT}/${name}.png`, ...(clip ? { clip } : {}) }); console.log(`${MODE}/${name}.png`); };

for (const lang of ["EN", "DE"]) {
  const l = lang.toLowerCase();
  await page.goto(BASE); await page.evaluate(() => localStorage.clear()); await page.reload(); await wait(800);
  if (lang === "DE") await setLang("DE");
  for (const slug of ["lucerne-old-town-walk", "engraving-workshop"]) {
    await page.goto(BASE + "#/tours/" + slug); await wait(1500);
    await page.mouse.move(2, 2);
    await shot(`${slug}-top-${l}`);
    // The age-group price list: the block right above the accordions.
    const prices = page.locator("main dl").first();
    if (await prices.count()) {
      await prices.scrollIntoViewIfNeeded(); await wait(500);
      const box = await prices.boundingBox();
      await shot(`${slug}-prices-${l}`, { x: 0, y: Math.max(0, box.y - 60), width: 375, height: Math.min(812 - Math.max(0, box.y - 60), box.height + 160) });
    }
  }
  await page.goto(BASE); await wait(700);
  if (lang === "DE") await setLang("EN");
}
console.log(errors.length ? `ERRORS ${JSON.stringify(errors)}` : "no page errors");
await browser.close();
