import { chromium } from "playwright-core";
import { readdirSync } from "node:fs";
const home = process.env.HOME + "/.cache/ms-playwright/";
const dir = readdirSync(home).filter(d => d.startsWith("chromium_headless_shell-")).sort().pop();
const exe = `${home}${dir}/chrome-headless-shell-linux64/chrome-headless-shell`;
const OUT = process.argv[2];
const BASE = "http://localhost:5181/";
const browser = await chromium.launch({ executablePath: exe });
const page = await browser.newPage({ viewport: { width: 375, height: 812 }, deviceScaleFactor: 2 });
const log = (...a) => console.log(...a);
page.on("console", m => { if (m.type() === "error") log("CONSOLE", m.text()); });
const shot = async (name, full = true) => {
  await page.waitForTimeout(500);
  const wide = await page.evaluate(() => [...document.querySelectorAll("main *")].filter(e => { const r = e.getBoundingClientRect(); return r.width && r.right > window.innerWidth - 16 + 0.5 && !e.closest("[aria-label='Prototype controls']"); }).map(e => e.tagName + "." + (e.className?.toString?.() || "").slice(0, 40)).slice(0, 5));
  if (full) { const h = await page.evaluate(() => document.documentElement.scrollHeight); await page.setViewportSize({ width: 375, height: h }); await page.waitForTimeout(200); }
  await page.screenshot({ path: `${OUT}/${name}.png` });
  if (full) await page.setViewportSize({ width: 375, height: 812 });
  log("shot", name, "past-gutter:", JSON.stringify(wide));
};
const overflow = () => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);

await page.goto(BASE);
await page.evaluate(() => localStorage.clear());
await page.goto(BASE + "#/cart");
await page.waitForTimeout(900);
await shot("cart-empty-en");

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
await addGift("kapellbruecke-pocket-knife", "Medium", "Anna", 21, "Shop Altstadt");
await addGift("lucerne-gift-box", null, null, 20, "Shop Altstadt");
await page.goto(BASE + "#/");
await page.waitForTimeout(800);
await page.evaluate(() => { location.hash = "#/cart"; });
await page.waitForTimeout(60);
await page.screenshot({ path: `${OUT}/cart-skeleton.png` }); log("shot skeleton");
await page.waitForTimeout(900);
log("cart text:", (await page.locator("main").innerText()).replace(/\n+/g, " | "));
log("overflow", await overflow());
await shot("cart-en");

// quantity +, then -, remove tested later
await page.getByRole("button", { name: /Increase/i }).first().click();
await page.waitForTimeout(200);
log("after +:", (await page.locator("section").first().innerText()).replace(/\n+/g, " | "));
await page.getByRole("button", { name: /Decrease/i }).first().click();

// DE
await page.getByRole("button", { name: "DE", exact: true }).click();
await page.waitForTimeout(300);
log("DE text:", (await page.locator("main").innerText()).replace(/\n+/g, " | "));
log("overflow", await overflow());
await shot("cart-de");
await page.getByRole("button", { name: "EN", exact: true }).click();

// invalid via prototype bar control
await page.getByRole("region", { name: "Prototype controls" }).getByRole("button").first().click();
await page.getByRole("button", { name: "Make a cart date too early" }).click();
await page.waitForTimeout(1000);
log("invalid text:", (await page.locator("main").innerText()).replace(/\n+/g, " | "));
await shot("cart-invalid-date-en");
await page.getByRole("button", { name: "Continue" }).click();
await page.waitForTimeout(600);
log("focused:", await page.evaluate(() => document.activeElement?.textContent));
await shot("cart-invalid-continue-en", false);
await page.getByRole("button", { name: "DE", exact: true }).click();
await page.waitForTimeout(300);
await shot("cart-invalid-date-de");
await page.getByRole("button", { name: "EN", exact: true }).click();
// fix
await page.getByRole("button", { name: /Request .* instead/ }).click();
await page.waitForTimeout(300);
log("after fix:", (await page.locator("main").innerText()).replace(/\n+/g, " | "));
await shot("cart-after-fix-en");
// keyboard focus check: tab through
const tabs = [];
for (let i = 0; i < 8; i++) { await page.keyboard.press("Tab"); tabs.push(await page.evaluate(() => (document.activeElement?.getAttribute("aria-label") || document.activeElement?.textContent || "").slice(0, 30))); }
log("tab order:", tabs.join(" > "));
// remove all
while (await page.getByRole("button", { name: /^Remove / }).count()) { await page.getByRole("button", { name: /^Remove / }).first().click(); await page.waitForTimeout(200); }
log("after remove:", (await page.locator("main").innerText()).replace(/\n+/g, " | "));
await page.getByRole("button", { name: "DE", exact: true }).click();
await page.waitForTimeout(300);
await shot("cart-empty-de");
await browser.close();
