// Step 1.5e verification: C04 gap above the bar, gift slip (store, price, pickup rows),
// bar with Select all, price breakdown sheet, tinted info Alert.
// Run: node 1.5e-drive.mjs <outdir> <en|de> against vite --port 5199 (playwright-core resolvable).
import { chromium } from "playwright-core";
import { readdirSync } from "node:fs";

const home = process.env.HOME + "/.cache/ms-playwright/";
const dir = readdirSync(home).filter((d) => d.startsWith("chromium_headless_shell-")).sort().pop();
const OUT = process.argv[2];
const L = process.argv[3] ?? "en";
const de = L === "de";
const BASE = "http://localhost:5199/";
const browser = await chromium.launch({ executablePath: `${home}${dir}/chrome-headless-shell-linux64/chrome-headless-shell` });
const page = await browser.newPage({ viewport: { width: 375, height: 812 }, deviceScaleFactor: 2 });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
const log = (...a) => console.log(...a);

const seed = (cart, language) =>
  page.evaluate(([cart, language]) => {
    const s = JSON.parse(localStorage.getItem("sk.demo"));
    s.data.cart = cart;
    localStorage.setItem("sk.demo", JSON.stringify(s));
    if (language) localStorage.setItem("sk.language", language);
  }, [cart, language]);
const line = (id, productId, variantId, pickupDate, pickupPlaceId, extra = {}) =>
  ({ id, productId, variantId, quantity: 1, pickupDate, pickupPlaceId, ...extra });
const CART = [
  line("l1", "p-knife", "m", "2026-10-21", "altstadt", { engraving: "Anna", quantity: 2, selected: true }),
  line("l2", "p-giftbox", "std", "2026-10-20", "altstadt", { selected: true }),
  line("l3", "p-chocolate", "12", "2026-10-20", "bahnhof"),
];

const open = async (cart) => {
  await page.goto(BASE);
  await page.waitForTimeout(600);
  await seed(cart);
  await page.goto(BASE + "#/cart");
  await page.reload();
  await page.waitForTimeout(1500);
  if (de) {
    await page.getByRole("button", { name: /^DE$/ }).first().click().catch(() => {});
    await page.getByText(/^DE$/).first().click().catch(() => {});
    await page.waitForTimeout(400);
  }
};
const check = (name) =>
  page.evaluate(() => ({
    overflow: document.documentElement.scrollWidth - window.innerWidth,
    rawKeys: (document.body.innerText.match(/\b(cart|detail)\.[a-zA-Z.]+/g) || []).join(","),
    eszett: document.body.innerText.includes("ß"),
  })).then((r) => log(name, JSON.stringify(r)));
const shot = async (name) => {
  await page.waitForTimeout(400);
  await check(name);
  await page.screenshot({ path: `${OUT}/${name}-${L}.png` });
};
const gap = (label) =>
  page.evaluate(() => {
    window.scrollTo(0, document.documentElement.scrollHeight);
    const lis = [...document.querySelectorAll("main li")];
    const last = lis[lis.length - 1].getBoundingClientRect();
    const b = document.querySelector("[data-cart-bar]").getBoundingClientRect();
    return {
      barHeight: Math.round(b.height),
      barBottomToViewport: Math.round(innerHeight - b.bottom),
      gapLastCardToBar: Math.round(b.top - last.bottom),
      mainPaddingBottom: getComputedStyle(document.querySelector("main")).paddingBottom,
    };
  }).then((r) => log(label, JSON.stringify(r)));

await open(CART);
log("lang", await page.locator("h1").first().innerText());
// Info Alert computed style
log("info alert", JSON.stringify(await page.evaluate(() => {
  const a = document.querySelector(".alert--info");
  const cs = (el) => getComputedStyle(el);
  return {
    bg: cs(a).backgroundColor, border: `${cs(a).borderWidth} ${cs(a).borderColor}`, shadow: cs(a).boxShadow,
    icon: cs(a.querySelector(".alert__indicator")).color, title: cs(a.querySelector(".alert__title")).color,
    body: cs(a.querySelector(".alert__description")).color, text: a.innerText.replace(/\n+/g, " | "),
  };
})));
await shot("top");
const first = page.locator("main li").first();
log("line 1", (await first.innerText()).replace(/\n+/g, " | "));
log("price style", JSON.stringify(await first.evaluate((li) => {
  const el = li.querySelector(".text-heading");
  const c = getComputedStyle(el);
  return { text: el.textContent, size: c.fontSize, weight: c.fontWeight, color: c.color };
})));
await first.screenshot({ path: `${OUT}/line-${L}.png` });
await page.waitForTimeout(200);
await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
await page.waitForTimeout(300);
await gap("gap at end");
await shot("end");
log("bar", (await page.locator("[data-cart-bar]").innerText()).replace(/\n+/g, " | "));
await page.locator("[data-cart-bar]").screenshot({ path: `${OUT}/bar-${L}.png` });

// Select all stays visible while scrolling: check it is inside the viewport at the top too.
await page.evaluate(() => window.scrollTo(0, 0));
await page.waitForTimeout(200);
log("select all in view at top", await page.locator("[data-select-all]").isVisible(),
  JSON.stringify(await page.locator("[data-select-all]").boundingBox()));

// Breakdown sheet
await page.locator("[data-cart-bar] button[aria-haspopup=dialog]").click();
const sheet = page.getByRole("dialog");
await sheet.waitFor();
await page.waitForTimeout(500);
log("sheet", (await sheet.innerText()).replace(/\n+/g, " | "));
await shot("sheet");
await page.keyboard.press("Escape");
await page.waitForTimeout(400);
log("sheet closed", await sheet.count());

// Select all from the bar, then untick all, then Continue with nothing ticked
const all = page.locator("[data-select-all] input");
await all.focus(); await page.keyboard.press("Space"); await page.waitForTimeout(200);
log("after select all", (await page.locator("[data-cart-bar]").innerText()).replace(/\n+/g, " | "));
await all.focus(); await page.keyboard.press("Space"); await page.waitForTimeout(200);
log("after untick all", (await page.locator("[data-cart-bar]").innerText()).replace(/\n+/g, " | "));
await page.evaluate(() => window.scrollTo(0, 300));
await page.waitForTimeout(200);
const yBefore = await page.evaluate(() => scrollY);
await page.locator("[data-cart-bar]").getByRole("button", { name: de ? "Weiter" : "Continue" }).click();
await page.waitForTimeout(700);
log("scrollY before/after blocked continue", yBefore, await page.evaluate(() => scrollY));
log("focus after blocked continue", await page.evaluate(() => document.activeElement?.closest("[data-select-all]") ? "select all" : document.activeElement?.tagName));
await gap("gap at end, blocked message shown");
await shot("blocked");
await page.locator("[data-cart-bar] button[aria-haspopup=dialog]").click();
await page.waitForTimeout(500);
log("empty sheet", (await page.getByRole("dialog").innerText()).replace(/\n+/g, " | "));
await shot("sheet-empty");
await page.keyboard.press("Escape");
await page.waitForTimeout(300);

// Invalid date on a ticked line (tinted warning Alert)
await open([line("l1", "p-knife", "m", "2026-10-13", "altstadt", { engraving: "Anna", selected: true }), CART[1]]);
const inv = page.locator("main li .alert--warning").first();
log("invalid alert", JSON.stringify(await inv.evaluate((a) => ({ bg: getComputedStyle(a).backgroundColor, border: getComputedStyle(a).borderColor, text: a.innerText.replace(/\n+/g, " | ") }))));
// The card is taller than the space above the sticky bar: scroll the alert into the middle.
await inv.evaluate((el) => el.scrollIntoView({ block: "center" }));
await shot("invalid");
await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
await gap("gap at end, invalid line");
await page.locator("[data-cart-bar]").getByRole("button", { name: de ? "Weiter" : "Continue" }).click();
await page.waitForTimeout(700);
log("focus after invalid continue", await page.evaluate(() => document.activeElement?.getAttribute("data-date-fix") ?? document.activeElement?.tagName),
  (await page.locator("[data-cart-bar] p").first().innerText()));

// Remove still confirms
await page.locator("main li").last().getByRole("button", { name: de ? /entfernen/ : /^Remove/ }).click();
await page.waitForTimeout(400);
log("remove dialog", (await page.getByRole("alertdialog").innerText()).replace(/\n+/g, " | "));
await page.keyboard.press("Escape");

// One short line: bar stays at the bottom of the screen
await open([CART[1]]);
await gap("one line");
await shot("one-line");

log("errors", JSON.stringify(errors));
await browser.close();
