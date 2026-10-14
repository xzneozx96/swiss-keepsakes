// 2.4-r4 gift regression (14 Oct 2026): after the C03 option-tile change, choose an option on
// the tile, add to cart, and find the line in the cart with that option and price.
// 375px, headless chromium shell, against `vite --port 5231`. Run from a folder with
// playwright-core installed:  node 2.4-r4-gift-cart.mjs [screens dir]
import { chromium } from "playwright-core";
import { mkdirSync, readdirSync } from "node:fs";

const OUT = process.argv[2] ?? "/home/ross-geller/Projects/minastik/swiss-keepsakes/docs/ux/prototype/screens/2.4-r4";
const BASE = "http://localhost:5231/";
mkdirSync(OUT, { recursive: true });
const home = process.env.HOME + "/.cache/ms-playwright/";
const dir = readdirSync(home).filter((d) => d.startsWith("chromium_headless_shell-")).sort().pop();
const browser = await chromium.launch({ executablePath: `${home}${dir}/chrome-headless-shell-linux64/chrome-headless-shell` });
const page = await browser.newPage({ viewport: { width: 375, height: 812 }, deviceScaleFactor: 2 });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => m.type() === "error" && errors.push(m.text().slice(0, 200)));
const wait = (ms = 400) => page.waitForTimeout(ms);
let pass = 0, fail = 0;
const check = (name, ok, extra = "") => { ok ? pass++ : fail++; console.log(ok ? "PASS" : "FAIL", name, extra === "" ? "" : `· ${typeof extra === "string" ? extra : JSON.stringify(extra)}`); };

await page.goto(BASE); await page.evaluate(() => localStorage.clear()); await page.reload(); await wait(800);
await page.goto(BASE + "#/gifts/kapellbruecke-pocket-knife"); await wait(900);
await page.getByRole("button", { name: /^Add to cart$/ }).last().click();
const sheet = page.getByRole("dialog"); await sheet.waitFor(); await wait(600);
await sheet.getByRole("row", { name: /Medium/ }).click(); await wait(300);
check("tile click selects Medium", (await sheet.getByRole("row", { name: /Medium/ }).getAttribute("aria-selected")) === "true");
check("Add button shows the Medium price", /CHF\s54\.00/.test(await sheet.getByRole("button", { name: /Add to cart ·/ }).innerText()));
await sheet.getByLabel(/Engraving/).first().fill("Anna");
await sheet.getByRole("gridcell").filter({ hasText: /^21$/ }).first().click();
await sheet.getByRole("radio", { name: /Shop Altstadt/ }).check({ force: true });
await sheet.getByRole("button", { name: /Add to cart ·/ }).click(); await wait(800);
check("sheet closes after adding", (await page.getByRole("dialog").count()) === 0);
check("price bar confirms the line was added", /Added to cart/i.test(await page.locator("body").innerText()));
await page.goto(BASE + "#/cart"); await wait(900);
const cart = (await page.locator("main").innerText()).replace(/\n+/g, " | ");
check("cart has the pocket knife, Medium, CHF 54.00 and the engraving", /Kapellbrücke pocket knife/.test(cart) && /Medium/.test(cart) && /CHF\s54\.00/.test(cart) && /Anna/.test(cart), cart.slice(0, 300));
await page.screenshot({ path: `${OUT}/gift-cart-after-en.png` });
check("no page or console errors", errors.length === 0, errors);
console.log(`\n${pass} passed, ${fail} failed`);
await browser.close();
