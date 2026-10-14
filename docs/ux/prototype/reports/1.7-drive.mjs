// Step 1.7 verification: demo path steps 4-6 (cart → sign in → C06 → send), the stock-changed
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

// --- Step 1 (partner arrival, last click Hotel am See) and steps 2–3 (two gifts) ---
await page.goto(BASE);
await page.evaluate(() => localStorage.clear());
await page.goto(BASE + "#/r/MARCO");
await page.waitForTimeout(600);
await page.goto(BASE + "#/r/HOTELAMSEE");
await page.waitForTimeout(600);
await addGift("kapellbruecke-pocket-knife", "Medium", "Anna", 21, "Shop Altstadt");
await addGift("lucerne-gift-box", null, null, 20, "Shop Altstadt");

// --- Step 4: cart ---
await page.goto(BASE + "#/cart");
await page.waitForTimeout(900);
await shot("cart-en");
const cartBefore = (await demo()).data.cart;

// --- Step 5: Continue → sign-in sheet (signed out) ---
await page.getByRole("button", { name: "Continue" }).click();
await page.waitForTimeout(600);
await shot("signin-sheet-en", false);
await page.getByRole("button", { name: "Email me a code" }).click();
await page.waitForTimeout(400);
await page.locator("#sign-in-code").focus();
await page.keyboard.type("123456");
await page.waitForTimeout(1200);
log("after sign-in url:", page.url());
const cartAfter = (await demo()).data.cart;
log("cart unchanged by sign-in:", JSON.stringify(cartBefore) === JSON.stringify(cartAfter));

// --- Step 6: C06 in EN and DE ---
log("C06 EN:", await mainText());
await shot("review-en");
await shot("review-en-viewport", false);
await lang("DE");
log("C06 DE:", await mainText());
await shot("review-de");
await shot("review-de-viewport", false);
await lang("EN");

// Keyboard: tab order on C06
const tabs = [];
for (let i = 0; i < 4; i++) {
  await page.keyboard.press("Tab");
  tabs.push(await page.evaluate(() => (document.activeElement?.getAttribute("aria-label") || document.activeElement?.textContent || "").slice(0, 40)));
}
log("tab order:", tabs.join(" > "));

// --- Stock changed on send (EN, then DE) ---
await bar.getByRole("button").first().click();
await page.getByRole("button", { name: "Make an item sell out" }).click();
await page.waitForTimeout(600);
await page.getByRole("button", { name: "Send request · no payment yet" }).click();
await page.waitForTimeout(900);
log("focused after error:", await page.evaluate(() => document.activeElement?.getAttribute("role")));
log("error EN:", (await page.getByRole("alert").first().innerText()).replace(/\n+/g, " | "));
await shot("stock-changed-en");
await shot("stock-changed-en-viewport", false);
await lang("DE");
await page.getByRole("button", { name: "Anfrage senden · noch keine Zahlung" }).click();
await page.waitForTimeout(900);
log("error DE:", (await page.getByRole("alert").first().innerText()).replace(/\n+/g, " | "));
await shot("stock-changed-de");
let d = await demo();
log("after error: cart lines", d.data.cart.length, "orders by Anna", d.data.orders.filter((o) => o.guestId === "g-anna" && o.status === "requested").length, "mail", d.data.mail.map((m) => m.template).join(","));

// Restore stock (Reset would also sign out and clear the cart): put the knife M stock back.
await page.evaluate(() => {
  const s = JSON.parse(localStorage.getItem("sk.demo"));
  const knife = s.data.products.find((p) => p.id === "p-knife");
  knife.variants.find((v) => v.id === "m").stock = 4;
  localStorage.setItem("sk.demo", JSON.stringify(s));
});
await lang("EN");
await page.goto(BASE + "#/cart/review");
await page.reload();
await page.waitForTimeout(1200);

// --- Send ---
const ordersBefore = (await demo()).data.orders.length;
await page.getByRole("button", { name: "Send request · no payment yet" }).click();
await page.waitForTimeout(1200);
log("after send url:", page.url());
await shot("sent-placeholder-en", false);
d = await demo();
const created = d.data.orders.slice(ordersBefore);
writeFileSync(`${OUT}/orders-created.json`, JSON.stringify({ created, cart: d.data.cart, nextOrderNumber: d.data.nextOrderNumber, mail: d.data.mail.filter((m) => ["N02", "N03"].includes(m.template)) }, null, 2));
log("created:", created.map((o) => `${o.ref} ${o.status} partner=${o.partnerId} lang=${o.language} rates=${o.lines.map((l) => l.commissionRate).join("/")} policy=${o.paymentPolicy.kind} log=${o.log.map((e) => e.type)}`).join(" ; "));
log("cart after send:", d.data.cart.length, "nextOrderNumber:", d.data.nextOrderNumber);
log("mail:", d.data.mail.map((m) => `${m.template}→${m.to}(${m.params.orderRef ?? ""})`).join(", "));

// Mail panel: guest (N02) and staff (N03)
await bar.getByRole("button", { name: /^Mail/ }).click();
await page.waitForTimeout(600);
await page.screenshot({ path: `${OUT}/mail-guest-n02.png` });
log("mail guest:", (await page.getByRole("dialog").innerText()).replace(/\n+/g, " | ").slice(0, 600));
await page.getByRole("tab", { name: /Staff/ }).click();
await page.waitForTimeout(400);
await page.screenshot({ path: `${OUT}/mail-staff-n03.png` });
log("mail staff:", (await page.getByRole("dialog").innerText()).replace(/\n+/g, " | ").slice(0, 400));
await page.keyboard.press("Escape");

// Back after sending lands on the empty cart, not an empty C06
await page.goto(BASE + "#/cart/review");
await page.waitForTimeout(1200);
log("review with empty cart → url:", page.url());

log("errors:", errors.length ? errors.join(" | ") : "none");
await browser.close();
