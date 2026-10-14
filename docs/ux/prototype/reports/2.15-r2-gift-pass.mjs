// 2.15-r2: quick EN pass over the approved gift screens after the Phase 2 round 2 restyle.
// C03 (detail and choice sheet), C04, C06, C07 as a guest; M02, M03, M04, M08 as the manager; P02 as
// the partner. 375px, DPR 2. Each screen: a screenshot, horizontal overflow and the console.
// Run from a folder with playwright-core installed, against Vite on 5232 (no HMR):
//   node 2.15-r2-gift-pass.mjs <out dir>
import { chromium } from "playwright-core";
import { mkdirSync, readdirSync } from "node:fs";

const OUT = process.argv[2];
mkdirSync(OUT, { recursive: true });
const BASE = process.env.BASE ?? "http://localhost:5232/";
const home = process.env.HOME + "/.cache/ms-playwright/";
const dir = readdirSync(home).filter((d) => d.startsWith("chromium_headless_shell-")).sort().pop();
const browser = await chromium.launch({ executablePath: `${home}${dir}/chrome-headless-shell-linux64/chrome-headless-shell` });
const page = await browser.newPage({ viewport: { width: 375, height: 812 }, deviceScaleFactor: 2 });
let errors = [];
page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
page.on("console", (m) => m.type() === "error" && errors.push(`console: ${m.text().slice(0, 200)}`));
const wait = (ms = 400) => page.waitForTimeout(ms);
let pass = 0, fail = 0;
const check = (name, ok, extra = "") => { ok ? pass++ : fail++; console.log(ok ? "PASS" : "FAIL", name, extra === "" ? "" : `| ${extra}`); };

/** Full-page screenshot by growing the viewport; checks overflow and the errors since the last shot. */
async function shot(name, { full = true } = {}) {
  await wait(500);
  if (full) {
    const h = await page.evaluate(() => document.documentElement.scrollHeight);
    await page.setViewportSize({ width: 375, height: Math.min(h, 8000) });
    await wait(300);
  }
  await page.screenshot({ path: `${OUT}/${name}-en.png` });
  if (full) await page.setViewportSize({ width: 375, height: 812 });
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  check(`${name}: no horizontal overflow, no console or page errors`, overflow <= 0 && errors.length === 0, errors.length ? errors.join(" ; ") : `overflow ${overflow}`);
  errors = [];
}
const setRole = async (role, route) => {
  await page.evaluate((r) => { const s = JSON.parse(localStorage.getItem("sk.demo")); s.role = r; localStorage.setItem("sk.demo", JSON.stringify(s)); }, role);
  await page.goto(BASE + route); await page.reload(); await wait(1200);
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

await page.goto(BASE); await page.evaluate(() => localStorage.clear()); await page.reload(); await wait(900);
errors = [];

// Guest: C03, C04, C05 → C06, C07.
await page.goto(BASE + "#/gifts/kapellbruecke-pocket-knife"); await wait(1000);
await shot("c03-detail");
await page.getByRole("button", { name: /^Add to cart$/ }).last().click();
await page.getByRole("dialog").waitFor(); await wait(600);
await shot("c03-sheet", { full: false });
await page.goto(BASE); await page.reload(); await wait(800); errors = [];
await addGift("kapellbruecke-pocket-knife", "Medium", "Anna", 21, "Shop Altstadt");
await addGift("lucerne-gift-box", null, null, 20, "Shop Altstadt");
await page.goto(BASE + "#/cart"); await wait(6500);
await page.getByRole("checkbox", { name: "Select all" }).check({ force: true }); await wait(300);
await shot("c04-cart");
await page.getByRole("button", { name: "Continue" }).click(); await wait(800);
await page.getByRole("button", { name: /Continue with Google/ }).click(); await wait(1500);
check("C05 → C06 after sign-in", page.url().endsWith("#/cart/review"), page.url());
await shot("c06-review");
await page.getByRole("button", { name: "Send request · no payment yet" }).click(); await wait(1500);
check("C06 → C07 after send", page.url().includes("#/cart/sent"), page.url());
await shot("c07-sent");

// Merchant (manager): M02 Today, M03 orders, M04 order detail, M08 record payment sheet.
await setRole("manager", "#/store");
await shot("m02-today");
await page.goto(BASE + "#/store/orders"); await wait(1200);
await shot("m03-orders");
const owing = await page.evaluate(() => JSON.parse(localStorage.getItem("sk.demo")).data.orders.find((o) => o.status === "ready" && o.payments.length > 0)?.id);
check("a seeded ready order that owes money exists for M08", !!owing, owing ?? "none");
await page.goto(BASE + `#/store/orders/${owing}`); await wait(1200);
await shot("m04-order");
await page.getByRole("button", { name: "Record payment" }).first().click();
await page.getByRole("dialog").waitFor(); await wait(700);
await shot("m08-record-payment", { full: false });
await page.keyboard.press("Escape"); await wait(500);

// Partner: P02.
await setRole("partner", "#/partner");
await shot("p02-partner");

console.log(`\nRESULT ${pass} passed, ${fail} failed`);
await browser.close();
process.exitCode = fail ? 1 : 0;
