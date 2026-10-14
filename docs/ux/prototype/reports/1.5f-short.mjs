// Step 1.5f: short pages keep the sticky bar at the screen bottom (C06 with one line, 375x1400).
import { chromium } from "playwright-core";
import { readdirSync } from "node:fs";
const home = process.env.HOME + "/.cache/ms-playwright/";
const dir = readdirSync(home).filter((d) => d.startsWith("chromium_headless_shell-")).sort().pop();
const browser = await chromium.launch({ executablePath: `${home}${dir}/chrome-headless-shell-linux64/chrome-headless-shell` });
const page = await browser.newPage({ viewport: { width: 375, height: 1400 } });
await page.goto("http://localhost:5199/"); await page.waitForTimeout(800);
const id = await page.evaluate(() => {
  const s = JSON.parse(localStorage.getItem("sk.demo"));
  s.data.cart = [{ id: "l3", productId: "p-chocolate", variantId: "12", quantity: 1, pickupDate: "2026-10-20", pickupPlaceId: "bahnhof", selected: true }];
  s.data.signedInGuestId = s.data.orders[0].guestId;
  localStorage.setItem("sk.demo", JSON.stringify(s));
  return s.data.orders[0].id;
});
for (const [name, hash] of [["C04", "#/cart"], ["C06", "#/cart/review"], ["C07", `#/cart/sent?orders=${id}`], ["C03", "#/gifts/kapellbruecke-pocket-knife"]]) {
  await page.goto("http://localhost:5199/" + hash); await page.reload(); await page.waitForTimeout(1600);
  const r = await page.evaluate(() => {
    const bar = [...document.querySelectorAll("main *")].find((e) => getComputedStyle(e).position === "sticky" && getComputedStyle(e).bottom === "0px");
    return { pageTallerThanViewport: document.documentElement.scrollHeight > innerHeight, barBottomToViewport: Math.round(innerHeight - bar.getBoundingClientRect().bottom) };
  });
  console.log(name, "viewport 1400", JSON.stringify(r));
}
await browser.close();
