// Step 1.7b verification: C06 restyled in C04's language. Run: node 1.7b-drive.mjs <outdir> <en|de>
// against vite --port 5199 (playwright-core resolvable).
import { chromium } from "playwright-core";
import { readdirSync, readFileSync } from "node:fs";

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
const line = (id, productId, variantId, pickupDate, pickupPlaceId, extra = {}) =>
  ({ id, productId, variantId, quantity: 1, pickupDate, pickupPlaceId, selected: true, ...extra });
const CART = [
  line("l1", "p-knife", "m", "2026-10-21", "altstadt", { engraving: "Anna" }),
  line("l2", "p-giftbox", "std", "2026-10-20", "altstadt"),
  line("l3", "p-chocolate", "12", "2026-10-20", "bahnhof", { quantity: 2 }),
];

const load = async (hash, cart, mutate = "") => {
  await page.goto(BASE);
  await page.waitForTimeout(500);
  await page.evaluate(([cart, mutate]) => {
    const s = JSON.parse(localStorage.getItem("sk.demo"));
    s.data.cart = cart;
    s.data.signedInGuestId = s.data.orders[0].guestId;
    if (mutate === "giftbox-sold-out") s.data.products.find((p) => p.id === "p-giftbox").variants[0].stock = 0;
    localStorage.setItem("sk.demo", JSON.stringify(s));
  }, [cart, mutate]);
  await page.goto(BASE + hash);
  await page.reload();
  await page.waitForTimeout(1500);
  if (de) {
    await page.getByText(/^DE$/).first().click();
    await page.waitForTimeout(400);
  }
};
const check = (name) =>
  page.evaluate(() => ({
    overflow: document.documentElement.scrollWidth - window.innerWidth,
    rawKeys: (document.body.innerText.match(/\b(checkout|cart)\.[a-zA-Z.]+/g) || []).join(","),
    eszett: document.body.innerText.includes("ß"),
  })).then((r) => log(name, JSON.stringify(r)));
const shot = async (name) => {
  await page.waitForTimeout(400);
  await check(name);
  await page.screenshot({ path: `${OUT}/${name}-${L}.png` });
};
const barGap = () =>
  page.evaluate(() => {
    window.scrollTo(0, document.documentElement.scrollHeight);
    const bar = [...document.querySelectorAll("main *")].find((e) => getComputedStyle(e).position === "sticky" && getComputedStyle(e).bottom === "0px");
    const sections = document.querySelectorAll("main section");
    const last = sections[sections.length - 1].getBoundingClientRect();
    const b = bar.getBoundingClientRect();
    return { barHeight: Math.round(b.height), gapLastOrderToBar: Math.round(b.top - last.bottom), barBottomToViewport: Math.round(innerHeight - b.bottom) };
  });

// C04 and C06 tops for the side-by-side
await load("#/cart", CART);
await shot("c04-top");
await load("#/cart/review", CART);
await shot("c06-top");
const main = (await page.locator("main").innerText()).replace(/\n+/g, " | ");
log("c06 text", main);
log("1.18 expectations", JSON.stringify({ due54: /54\.00/.test(main), due2670: /26\.70/.test(main), rest6230: /62\.30/.test(main), combined: main.includes(de ? "Gesamttotal" : "Combined total") || main.includes(de ? "zur Information" : "for reference") }));
log("slip style", JSON.stringify(await page.locator("main section li").first().evaluate((li) => {
  const c = getComputedStyle(li);
  return { radius: c.borderRadius, shadow: c.boxShadow !== "none", border: c.borderTopWidth, bg: c.backgroundColor };
})));
log("send button", await page.getByRole("button", { name: de ? "Anfrage senden · noch keine Zahlung" : "Send request · no payment yet" }).count());
await page.evaluate(() => window.scrollTo(0, 900));
await shot("c06-middle");
await page.waitForTimeout(200);
log("gap at end", JSON.stringify(await barGap()));
await shot("c06-end");

// Breakdown sheet
await page.locator("main button[aria-haspopup=dialog]").click();
await page.getByRole("dialog").waitFor();
await page.waitForTimeout(500);
log("sheet", (await page.getByRole("dialog").innerText()).replace(/\n+/g, " | "));
await shot("c06-sheet");
await page.keyboard.press("Escape");
await page.waitForTimeout(400);

// Stock changed on send: the gift box sold out after C04
await load("#/cart/review", CART, "giftbox-sold-out");
const before = await page.evaluate(() => localStorage.getItem("sk.demo").length);
await page.getByRole("button", { name: de ? "Anfrage senden · noch keine Zahlung" : "Send request · no payment yet" }).click();
await page.waitForTimeout(900);
const alert = page.getByRole("alert").first();
log("stock error", (await alert.innerText()).replace(/\n+/g, " | "));
log("stock error focus", await page.evaluate(() => document.activeElement?.getAttribute("role")), "url", page.url());
log("stock error alert style", JSON.stringify(await page.locator("main .alert--danger").evaluate((a) => ({ bg: getComputedStyle(a).backgroundColor, border: getComputedStyle(a).borderColor }))));
await shot("c06-stock-error");

// Short page: one order
await load("#/cart/review", [CART[1]]);
log("one order", JSON.stringify(await barGap()));
await shot("c06-one-order");
log("errors", JSON.stringify(errors));
await browser.close();

// Side-by-side composite (C04 left, C06 right)
const b2 = await chromium.launch({ executablePath: `${home}${dir}/chrome-headless-shell-linux64/chrome-headless-shell` });
const p2 = await b2.newPage({ viewport: { width: 790, height: 852 } });
const img = (n) => `data:image/png;base64,${readFileSync(`${OUT}/${n}-${L}.png`).toString("base64")}`;
await p2.setContent(`<body style="margin:0;background:#ddd;display:flex;gap:10px;padding:10px;font:12px sans-serif">
  <figure style="margin:0"><img src="${img("c04-top")}" width="375"><figcaption>C04 Cart</figcaption></figure>
  <figure style="margin:0"><img src="${img("c06-top")}" width="375"><figcaption>C06 Review and send</figcaption></figure></body>`);
await p2.screenshot({ path: `${OUT}/side-by-side-${L}.png`, fullPage: true });
await b2.close();
