// Step 1.8r capture: C06 (extraction must not change it) and every C07 state, EN and DE, 375px.
// Run: node 1.8r-capture.mjs <outdir> <prefix> against vite --port 5218, with playwright-core
// resolvable (a node_modules symlink next to a copy of this file). <prefix> is "before" or "after".
import { chromium } from "playwright-core";
import { readdirSync, mkdirSync } from "node:fs";

const home = process.env.HOME + "/.cache/ms-playwright/";
const dir = readdirSync(home).filter((d) => d.startsWith("chromium_headless_shell-")).sort().pop();
const exe = `${home}${dir}/chrome-headless-shell-linux64/chrome-headless-shell`;
const OUT = process.argv[2];
const P = process.argv[3] ?? "after";
mkdirSync(OUT, { recursive: true });
const BASE = "http://localhost:5218/";
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
    rawKeys: (document.body.innerText.match(/\b(requestSent|tripProfile|checkout|cart|order|transactions)\.[a-zA-Z.]+/g) || []).join(","),
  })).then((r) => log(name, JSON.stringify(r)));
const shot = async (name, full = true) => {
  await page.waitForTimeout(500);
  await check(`${P}-${name}`);
  if (full) {
    const h = await page.evaluate(() => document.documentElement.scrollHeight);
    await page.setViewportSize({ width: 375, height: h });
    await page.waitForTimeout(250);
  }
  await page.screenshot({ path: `${OUT}/${P}-${name}.png` });
  if (full) await page.setViewportSize({ width: 375, height: 812 });
};
const lang = async (l) => {
  await bar.getByRole("button", { name: l, exact: true }).click();
  await page.waitForTimeout(300);
};
const demo = () => page.evaluate(() => JSON.parse(localStorage.getItem("sk.demo")));
const text = async (loc) => (await loc.innerText()).replace(/\n+/g, " | ");
const trip = () => page.getByRole("region", { name: /Help us understand your trip|Helfen Sie uns|Your trip|Ihre Reise/ });
const focused = () =>
  page.evaluate(() => {
    const el = document.activeElement;
    return `${el?.tagName} ${(el?.getAttribute("aria-label") || el?.innerText || el?.getAttribute("value") || "").replace(/\n+/g, " ").slice(0, 44)}`;
  });

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

// --- Demo path: arrive, two gifts, cart, sign in, C06 ---
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
// The cart opens with nothing ticked; tick both gifts.
await page.getByRole("checkbox", { name: "Select all" }).check({ force: true });
await page.waitForTimeout(300);
await page.getByRole("button", { name: "Continue" }).click();
await page.waitForTimeout(600);
await page.getByRole("button", { name: "Email me a code" }).click();
await page.waitForTimeout(400);
await page.locator("#sign-in-code").focus();
await page.keyboard.type("123456");
await page.waitForTimeout(1200);
log("C06 url:", page.url());
await page.waitForTimeout(6500); // let the "Added to cart" toast expire

// --- C06, unchanged by the extraction ---
await shot("c06-en");
await lang("DE");
await shot("c06-de");
await lang("EN");
await page.getByRole("button", { name: "Cancellation policy" }).first().click();
await page.waitForTimeout(400);
await shot("c06-cancellation-open-en");
await page.getByRole("button", { name: "Cancellation policy" }).first().click();
await page.getByRole("button", { name: /price details/i }).click();
await page.getByRole("dialog").waitFor();
await shot("c06-breakdown-en", false);
await page.keyboard.press("Escape");
await page.waitForTimeout(500);

// --- Send → C07 ---
await page.getByRole("button", { name: "Send request · no payment yet" }).click();
await page.waitForTimeout(1500);
log("C07 url:", page.url());
log("C07 EN:", await text(page.locator("main")));
log("order links:", await page.locator("main a[href*='/account/orders/']").count());
await shot("c07-en");
await shot("c07-en-viewport", false);
await lang("DE");
log("C07 DE:", await text(page.locator("main")));
await shot("c07-de");
await lang("EN");

// Keyboard: tab order from the top of C07
await page.locator("body").click({ position: { x: 5, y: 5 } });
await page.evaluate(() => document.activeElement?.blur());
const tabs = [];
for (let i = 0; i < 18; i++) {
  await page.keyboard.press("Tab");
  tabs.push(await focused());
}
log("tab order:", tabs.join(" > "));

// --- Trip profile: skipped ---
await trip().getByRole("button", { name: "Skip" }).focus();
await page.keyboard.press("Enter");
await page.waitForTimeout(400);
log("focus after Skip:", await focused());
log("skipped EN:", await text(trip()));
await shot("c07-trip-skipped-en");
await page.reload();
await page.waitForTimeout(1500);
log("skipped after reload:", await text(trip()));
await lang("DE");
log("skipped DE:", await text(trip()));
await shot("c07-trip-skipped-de");
await lang("EN");

// --- Trip profile: answered (Answer now → style + arrival in the past + departure) ---
await trip().getByRole("button", { name: "Answer now" }).click();
await page.waitForTimeout(300);
await trip().getByText("On my own", { exact: true }).click();
log("radio checked:", await trip().getByRole("radio", { name: /On my own/ }).isChecked());
await trip().getByRole("button", { name: /Arrival/ }).focus();
await page.keyboard.press("Enter");
await page.getByRole("dialog").waitFor();
await page.waitForTimeout(400);
log("focus in sheet:", await focused());
await page.keyboard.press("Escape");
await page.waitForTimeout(600);
log("sheet open after Escape:", await page.getByRole("dialog").count(), "focus:", await focused());
await trip().getByRole("button", { name: /Arrival/ }).click();
let sheet = page.getByRole("dialog");
await sheet.waitFor();
await sheet.getByRole("gridcell").filter({ hasText: /^12$/ }).first().click();
await page.waitForTimeout(300);
await shot("c07-trip-date-sheet-en", false);
await sheet.getByRole("button", { name: "Use this date" }).click();
await page.waitForTimeout(400);
await trip().getByRole("button", { name: /Departure/ }).click();
sheet = page.getByRole("dialog");
await sheet.waitFor();
const day11 = sheet.getByRole("gridcell").filter({ hasText: /^11$/ }).first().getByRole("button");
log("departure: 11 Oct disabled (before arrival):", await day11.getAttribute("aria-disabled"));
await sheet.getByRole("gridcell").filter({ hasText: /^16$/ }).first().click();
await sheet.getByRole("button", { name: "Use this date" }).click();
await page.waitForTimeout(400);
await trip().scrollIntoViewIfNeeded();
await shot("c07-trip-filled-en");
await lang("DE");
await shot("c07-trip-filled-de");
await lang("EN");
await trip().getByRole("button", { name: "Save answers" }).focus();
await page.keyboard.press("Enter");
await page.waitForTimeout(400);
log("focus after Save:", await focused());
log("answered EN:", await text(trip()));
log("stored:", JSON.stringify((await demo()).data.tripProfiles));
await shot("c07-trip-answered-en");
await lang("DE");
log("answered DE:", await text(trip()));
await shot("c07-trip-answered-de");
await lang("EN");
// Edit answers → form with Back
await trip().getByRole("button", { name: "Edit answers" }).click();
await page.waitForTimeout(300);
log("editing EN:", await text(trip()));
await trip().getByRole("button", { name: "Back" }).click();
await page.waitForTimeout(300);

// --- Links: order → C15, My transactions → C14, Explore → C01 ---
await page.getByRole("link", { name: /^View order SK-/ }).first().click();
await page.waitForTimeout(900);
log("order link →", page.url());
await page.goBack();
await page.waitForTimeout(1200);
await page.getByRole("link", { name: "See all in My transactions" }).click();
await page.waitForTimeout(900);
log("transactions link →", page.url());
await page.goBack();
await page.waitForTimeout(1200);
await page.getByRole("link", { name: "Back to Explore" }).click();
await page.waitForTimeout(900);
log("explore link →", page.url());

// --- Account hub profile tab: the same TripProfile component (1.12r) ---
await page.goto(BASE + "#/account?tab=profile");
await page.waitForTimeout(1500);
log("account trip:", await text(trip()));
await trip().scrollIntoViewIfNeeded();
await shot("account-profile-trip-en", false);

// --- One order: the singular intro, with an English-only gift (language notice, R02/AC30) ---
await addGift("limited-edition-print", null, null, 22, "Shop Altstadt");
await page.goto(BASE + "#/cart");
await page.waitForTimeout(900);
await page.getByRole("checkbox", { name: "Select all" }).check({ force: true });
await page.waitForTimeout(300);
await page.getByRole("button", { name: "Continue" }).click();
await page.waitForTimeout(1500);
await page.waitForTimeout(6000); // let the "Added to cart" toast expire
await page.getByRole("button", { name: "Send request · no payment yet" }).click();
await page.waitForTimeout(1500);
log("single url:", page.url());
log("single intro EN:", await page.locator("main header p").innerText());
log("single trip (answered earlier, kept per guest):", await text(trip()));
await shot("c07-single-en");
await lang("DE");
log("single intro DE:", await page.locator("main header p").innerText());
log("single DE orders section:", await text(page.getByRole("region", { name: "Ihre Bestellungen" })));
await shot("c07-single-de");
await lang("EN");
log("headings:", await page.evaluate(() => [...document.querySelectorAll("main h1, main h2, main h3, main h4")].map((h) => h.tagName + " " + h.textContent.slice(0, 30)).join(" / ")));

// --- Loading skeleton ---
await page.goto(BASE + "#/");
await page.waitForTimeout(800);
await page.goto(BASE + "#/cart/sent?orders=sk-1043");
await page.waitForTimeout(150);
await page.screenshot({ path: `${OUT}/${P}-c07-loading-en.png` });
log("loading shot taken");

// --- Empty: unknown orders param ---
await page.goto(BASE + "#/cart/sent?orders=sk-9999");
await page.waitForTimeout(1500);
log("empty EN:", await text(page.locator("main")));
await shot("c07-empty-en", false);
await lang("DE");
await shot("c07-empty-de", false);
await lang("EN");

log("errors:", errors.length ? errors.join(" | ") : "none");
await browser.close();
