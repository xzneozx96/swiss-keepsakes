// 1.5d extra checks: Tab order on C04 and the C06 stock error with a partial selection.
// Run: node 1.5d-extra.mjs against vite --port 5199 (playwright-core resolvable).
import { chromium } from "playwright-core";
import { readdirSync } from "node:fs";

const home = process.env.HOME + "/.cache/ms-playwright/";
const dir = readdirSync(home).filter((d) => d.startsWith("chromium_headless_shell-")).sort().pop();
const browser = await chromium.launch({ executablePath: `${home}${dir}/chrome-headless-shell-linux64/chrome-headless-shell` });
const page = await browser.newPage({ viewport: { width: 375, height: 812 } });
const BASE = "http://localhost:5199/";
const log = (...a) => console.log(...a);
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
const cart = (sel) => [
  { id: "l-knife", productId: "p-knife", variantId: "m", quantity: 1, engraving: "Anna", pickupDate: "2026-10-28", pickupPlaceId: "altstadt", ...(sel.includes("knife") ? { selected: true } : {}) },
  { id: "l-box", productId: "p-giftbox", variantId: "std", quantity: 1, pickupDate: "2026-10-28", pickupPlaceId: "altstadt", ...(sel.includes("box") ? { selected: true } : {}) },
  { id: "l-choc", productId: "p-chocolate", variantId: "std", quantity: 1, pickupDate: "2026-10-28", pickupPlaceId: "bahnhof", ...(sel.includes("choc") ? { selected: true } : {}) },
];
async function seed(sel, signedIn) {
  await page.goto(BASE);
  await page.waitForTimeout(800);
  await page.evaluate(({ c, signedIn }) => {
    const s = JSON.parse(localStorage.getItem("sk.demo"));
    s.data.cart = c;
    if (signedIn) s.data.signedInGuestId = s.data.guests[0].id;
    localStorage.setItem("sk.demo", JSON.stringify(s));
  }, { c: cart(sel), signedIn });
  await page.goto(BASE + "#/cart");
  await page.reload();
  await page.waitForTimeout(1200);
}
const bar = page.getByRole("region", { name: "Prototype controls" });
const demo = () => page.evaluate(() => JSON.parse(localStorage.getItem("sk.demo")));

// Tab order
await seed([], false);
log("variant ids ok:", (await page.locator("ul > li").count()) === 3);
await page.locator("[data-cart-title]").focus();
const order = [];
for (let i = 0; i < 9; i++) {
  await page.keyboard.press("Tab");
  order.push(await page.evaluate(() => {
    const a = document.activeElement;
    return a?.getAttribute("aria-label") || a?.closest("label")?.textContent || a?.textContent?.slice(0, 30) || a?.tagName;
  }));
}
log("tab order:", order.join(" > "));

// Control disabled with nothing ticked
await bar.getByRole("button").first().click();
await page.waitForTimeout(500);
log("sell-out disabled with nothing ticked:", await page.getByRole("button", { name: "Make an item sell out" }).isDisabled());
await page.keyboard.press("Escape");

// Stock error with box + chocolate ticked, knife (first line) not ticked
await seed(["box", "choc"], true);
const ordersBefore = (await demo()).data.orders.length;
await bar.getByRole("button").first().click();
await page.waitForTimeout(500);
log("sell-out disabled with 2 ticked:", await page.getByRole("button", { name: "Make an item sell out" }).isDisabled());
await page.getByRole("button", { name: "Make an item sell out" }).click();
await page.waitForTimeout(600);
await page.goto(BASE + "#/cart/review");
await page.waitForTimeout(1200);
log("C06 orders:", (await page.locator("main").innerText()).match(/Order \d/g)?.join(","));
await page.getByRole("button", { name: "Send request · no payment yet" }).click();
await page.waitForTimeout(900);
log("error:", (await page.getByRole("alert").first().innerText()).replace(/\n+/g, " | "));
const after = await demo();
log("cart lines kept:", after.data.cart.length, "| new orders:", after.data.orders.length - ordersBefore, "| url:", page.url());
await page.screenshot({ path: "/home/ross-geller/Projects/minastik/swiss-keepsakes/docs/ux/prototype/screens/1.5d/stock-error-partial-en.png" });
log("errors:", errors.length ? errors.join("\n") : "none");
await browser.close();
