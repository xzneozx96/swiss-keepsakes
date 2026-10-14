// Step 1.7 DE pass (second run, fresh storage): 3 orders incl. pay later, sign in and send in DE.
// Original header: demo path steps 4-6 (cart → sign in → C06 → send), the stock-changed
// error, order snapshots and N02/N03. Run: node 1.7-drive.mjs <outdir> against vite --port 5183,
// with playwright-core resolvable (copy next to a node_modules that has it).
import { chromium } from "playwright-core";
import { readdirSync, writeFileSync } from "node:fs";

const home = process.env.HOME + "/.cache/ms-playwright/";
const dir = readdirSync(home).filter((d) => d.startsWith("chromium_headless_shell-")).sort().pop();
const exe = `${home}${dir}/chrome-headless-shell-linux64/chrome-headless-shell`;
const OUT = process.argv[2];
const BASE = "http://localhost:5183/";
const browser = await chromium.launch({ executablePath: exe });
const page = await browser.newPage({ viewport: { width: 375, height: 812 }, deviceScaleFactor: 2 });
const log = (...a) => console.log(...a);
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
const bar = page.getByRole("region", { name: "Prototype controls" });

const check = (name) =>
  page.evaluate(() => ({
    overflow: document.documentElement.scrollWidth - window.innerWidth,
    rawKeys: (document.body.innerText.match(/\b(checkout|cart|auth|detail)\.[a-zA-Z.]+/g) || []).join(","),
  })).then((r) => log(name, JSON.stringify(r)));
const shot = async (name, full = true) => {
  await page.waitForTimeout(500);
  await check(name);
  if (full) {
    const h = await page.evaluate(() => document.documentElement.scrollHeight);
    await page.setViewportSize({ width: 375, height: h });
    await page.waitForTimeout(200);
  }
  await page.screenshot({ path: `${OUT}/${name}.png` });
  if (full) await page.setViewportSize({ width: 375, height: 812 });
};
const lang = async (l) => {
  await bar.getByRole("button", { name: l, exact: true }).click();
  await page.waitForTimeout(300);
};
const demo = () => page.evaluate(() => JSON.parse(localStorage.getItem("sk.demo")));
const mainText = async () => (await page.locator("main").innerText()).replace(/\n+/g, " | ");

async function addGift(slug, variant, engraving, day, place) {
  await page.goto(BASE + "#/gifts/" + slug);
  await page.waitForTimeout(900);
  await page.getByRole("button", { name: /^Add to cart$/ }).last().click();
  const sheet = page.getByRole("dialog");
  await sheet.waitFor();
  if (variant) await sheet.getByRole("row", { name: new RegExp(variant) }).click();
  if (engraving) await sheet.getByLabel(/Engraving/).first().fill(engraving);
  await sheet.getByRole("gridcell").filter({ hasText: new RegExp(`^${day}$`) }).first().click();
  await sheet.getByRole("radio", { name: new RegExp(place) }).check({ force: true });
  await sheet.getByRole("button", { name: /Add to cart ·/ }).click();
  await page.waitForTimeout(400);
}


await page.goto(BASE);
await page.evaluate(() => localStorage.clear());
await page.goto(BASE + "#/r/HOTELAMSEE");
await page.waitForTimeout(600);
await addGift("kapellbruecke-pocket-knife", "Medium", "Anna", 21, "Shop Altstadt");
await addGift("lucerne-gift-box", null, null, 20, "Shop Altstadt");
await addGift("chocolate-set", null, null, 20, "Pickup point Bahnhof");
await page.goto(BASE + "#/cart");
await page.waitForTimeout(7000); // let the C03 toast expire
await lang("DE");
await shot("cart-de");
await page.getByRole("button", { name: "Weiter", exact: true }).click();
await page.waitForTimeout(600);
await shot("signin-sheet-de", false);
await page.getByRole("button", { name: "Code per E-Mail senden" }).click();
await page.waitForTimeout(400);
await page.locator("#sign-in-code").focus();
await page.keyboard.type("123456");
await page.waitForTimeout(1200);
log("url:", page.url());
log("C06 DE (3 orders):", await mainText());
await shot("review-de-pay-later");
await lang("EN");
await shot("review-en-pay-later");
await lang("DE");
const before = (await demo()).data.orders.length;
await page.getByRole("button", { name: "Anfrage senden · noch keine Zahlung" }).click();
await page.waitForTimeout(1200);
log("after send url:", page.url());
const d = await demo();
const created = d.data.orders.slice(before);
writeFileSync(`${OUT}/orders-created-de.json`, JSON.stringify({ created, cart: d.data.cart, mail: d.data.mail.filter((m) => ["N02", "N03"].includes(m.template)) }, null, 2));
log("created:", created.map((o) => `${o.ref} lang=${o.language} partner=${o.partnerId} policy=${o.paymentPolicy.kind} rates=${o.lines.map((l) => l.commissionRate)}`).join(" ; "));
log("mail:", d.data.mail.map((m) => `${m.template}→${m.to}/${m.language}(${m.params.orderRef ?? ""})`).join(", "));
await bar.getByRole("button", { name: /^Mail/ }).click();
await page.waitForTimeout(600);
await page.screenshot({ path: `${OUT}/mail-guest-n02-de.png` });
log("mail guest:", (await page.getByRole("dialog").innerText()).replace(/\n+/g, " | ").slice(0, 500));
log("errors:", errors.length ? errors.join(" | ") : "none");
await browser.close();
