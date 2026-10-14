// Step 1.8 verification: demo path to C07 (cart → sign in → C06 → send), both orders on C07,
// trip profile skipped and answered (EN and DE), links to C15 / My transactions / Explore, and
// the empty state. Run: node 1.8-drive.mjs <outdir> against vite --port 5184, with
// playwright-core resolvable (copy next to a node_modules that has it).
import { chromium } from "playwright-core";
import { readdirSync } from "node:fs";

const home = process.env.HOME + "/.cache/ms-playwright/";
const dir = readdirSync(home).filter((d) => d.startsWith("chromium_headless_shell-")).sort().pop();
const exe = `${home}${dir}/chrome-headless-shell-linux64/chrome-headless-shell`;
const OUT = process.argv[2];
const BASE = "http://localhost:5184/";
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
    rawKeys: (document.body.innerText.match(/\b(requestSent|tripProfile|checkout|order|transactions)\.[a-zA-Z.]+/g) || []).join(","),
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
const trip = () => page.getByRole("region", { name: /Help us understand your trip|Helfen Sie uns/ });

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

// --- Demo path steps 1–6: arrive, two gifts, cart, sign in, C06 ---
await page.goto(BASE);
await page.evaluate(() => localStorage.clear());
await page.goto(BASE + "#/r/MARCO");
await page.waitForTimeout(600);
await page.goto(BASE + "#/r/HOTELAMSEE");
await page.waitForTimeout(600);
await addGift("kapellbruecke-pocket-knife", "Medium", "Anna", 21, "Shop Altstadt");
await addGift("lucerne-gift-box", null, null, 20, "Shop Altstadt");
await page.goto(BASE + "#/cart");
await page.waitForTimeout(900);
await page.getByRole("button", { name: "Continue" }).click();
await page.waitForTimeout(600);
await page.getByRole("button", { name: "Email me a code" }).click();
await page.waitForTimeout(400);
await page.locator("#sign-in-code").focus();
await page.keyboard.type("123456");
await page.waitForTimeout(1200);
log("after sign-in url:", page.url());
await page.waitForTimeout(6500); // let the C03 "Added to cart" toast expire before the shots

// --- Step 7: send → C07 ---
await page.getByRole("button", { name: "Send request · no payment yet" }).click();
await page.waitForTimeout(1200);
log("C07 url:", page.url());
let d = await demo();
log("created:", d.data.orders.filter((o) => o.guestId === "g-anna" && o.status === "requested").map((o) => o.ref).join(","));
log("C07 EN:", await mainText());
log("order rows:", await page.locator("main ul li a[href*='/account/orders/']").count());
await shot("sent-en");
await shot("sent-en-viewport", false);

await lang("DE");
log("C07 DE:", await mainText());
await shot("sent-de");
await shot("sent-de-viewport", false);
await lang("EN");

// Keyboard: tab order from the top of C07
await page.locator("body").click({ position: { x: 5, y: 5 } });
await page.evaluate(() => document.activeElement?.blur());
const tabs = [];
for (let i = 0; i < 15; i++) {
  await page.keyboard.press("Tab");
  tabs.push(await page.evaluate(() => {
    const el = document.activeElement;
    return (el?.getAttribute("aria-label") || el?.innerText || el?.getAttribute("value") || el?.tagName || "").replace(/\n+/g, " ").slice(0, 36);
  }));
}
log("tab order:", tabs.join(" > "));

// --- Trip profile: skipped ---
await trip().getByRole("button", { name: "Skip" }).focus();
await page.keyboard.press("Enter");
await page.waitForTimeout(400);
log("focus after Skip:", await page.evaluate(() => { const el = document.activeElement; return `${el?.tagName} ${(el?.getAttribute("aria-label") || el?.innerText || "").replace(/\n+/g, " ").slice(0, 40)}`; }));
log("skipped EN:", (await trip().innerText()).replace(/\n+/g, " | "));
await shot("trip-skipped-en");
await page.reload();
await page.waitForTimeout(1200);
log("skipped after reload:", (await trip().innerText()).replace(/\n+/g, " | "));
await lang("DE");
log("skipped DE:", (await trip().innerText()).replace(/\n+/g, " | "));
await shot("trip-skipped-de");
await lang("EN");

// --- Trip profile: answered (Answer now → style + arrival in the past + departure) ---
await trip().getByRole("button", { name: "Answer now" }).click();
await page.waitForTimeout(300);
await trip().getByRole("radio", { name: "On my own" }).check({ force: true });
// Keyboard: open the Arrival sheet with Enter, Escape closes it, focus returns to the row
await trip().getByRole("button", { name: /Arrival in Lucerne/ }).focus();
await page.keyboard.press("Enter");
await page.getByRole("dialog").waitFor();
await page.waitForTimeout(400);
log("focus in sheet:", await page.evaluate(() => { const el = document.activeElement; return `${el?.tagName} ${(el?.getAttribute("aria-label") || el?.innerText || "").replace(/\n+/g, " ").slice(0, 40)}`; }));
await page.keyboard.press("Escape");
await page.waitForTimeout(600);
log("sheet open after Escape:", await page.getByRole("dialog").count(), "focus:", await page.evaluate(() => { const el = document.activeElement; return `${el?.tagName} ${(el?.getAttribute("aria-label") || el?.innerText || "").replace(/\n+/g, " ").slice(0, 40)}`; }));
await trip().getByRole("button", { name: /Arrival in Lucerne/ }).click();
let sheet = page.getByRole("dialog");
await sheet.waitFor();
await sheet.getByRole("gridcell").filter({ hasText: /^12$/ }).first().click();
await page.waitForTimeout(300);
await shot("trip-date-sheet-en", false);
await sheet.getByRole("button", { name: "Use this date" }).click();
await page.waitForTimeout(400);
await trip().getByRole("button", { name: /Departure from Lucerne/ }).click();
sheet = page.getByRole("dialog");
await sheet.waitFor();
const day11 = sheet.getByRole("gridcell").filter({ hasText: /^11$/ }).first().getByRole("button");
log("departure: 11 Oct disabled (before arrival):", await day11.getAttribute("aria-disabled"));
await sheet.getByRole("gridcell").filter({ hasText: /^16$/ }).first().click();
await sheet.getByRole("button", { name: "Use this date" }).click();
await page.waitForTimeout(400);
await shot("trip-filled-en");
await trip().getByRole("button", { name: "Save answers" }).focus();
await page.keyboard.press("Enter");
await page.waitForTimeout(400);
log("focus after Save:", await page.evaluate(() => { const el = document.activeElement; return `${el?.tagName} ${(el?.getAttribute("aria-label") || el?.innerText || "").replace(/\n+/g, " ").slice(0, 40)}`; }));
log("answered EN:", (await trip().innerText()).replace(/\n+/g, " | "));
log("stored:", JSON.stringify((await demo()).data.tripProfiles));
await shot("trip-answered-en");
await lang("DE");
log("answered DE:", (await trip().innerText()).replace(/\n+/g, " | "));
await shot("trip-answered-de");
await lang("EN");

// --- Links: order row → C15, My transactions → C14, Explore → C01 ---
await page.locator("main ul li a[href*='/account/orders/']").first().click();
await page.waitForTimeout(900);
log("row link →", page.url());
await page.goBack();
await page.waitForTimeout(900);
await page.getByRole("link", { name: "See all in My transactions" }).click();
await page.waitForTimeout(900);
log("transactions link →", page.url());
await page.goBack();
await page.waitForTimeout(900);
await page.getByRole("link", { name: "Back to Explore" }).click();
await page.waitForTimeout(900);
log("explore link →", page.url());

// --- Empty: unknown / missing orders param ---
await page.goto(BASE + "#/cart/sent?orders=sk-9999");
await page.waitForTimeout(1200);
log("empty EN:", await mainText());
await shot("sent-empty-en", false);

log("errors:", errors.length ? errors.join(" | ") : "none");
await browser.close();
