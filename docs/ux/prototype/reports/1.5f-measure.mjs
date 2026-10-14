// Step 1.5f: measure the space between the lowest content and the bottom bar (or the screen
// bottom when a route has no bar) on every guest route without a tab bar, scrolled to the end.
// Run: node 1.5f-measure.mjs <label> [outdir] [en|de] against vite --port 5199.
import { chromium } from "playwright-core";
import { readdirSync } from "node:fs";

const home = process.env.HOME + "/.cache/ms-playwright/";
const dir = readdirSync(home).filter((d) => d.startsWith("chromium_headless_shell-")).sort().pop();
const LABEL = process.argv[2] ?? "";
const OUT = process.argv[3];
const L = process.argv[4] ?? "en";
const BASE = "http://localhost:5199/";
const browser = await chromium.launch({ executablePath: `${home}${dir}/chrome-headless-shell-linux64/chrome-headless-shell` });
const page = await browser.newPage({ viewport: { width: 375, height: 812 }, deviceScaleFactor: 2 });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));

await page.goto(BASE);
await page.waitForTimeout(800);
if (L === "de") {
  await page.getByText(/^DE$/).first().click();
  await page.waitForTimeout(300);
}
// Signed in as the guest of the first seed order that has payment due; cart with 3 lines, 2 ticked.
const ids = await page.evaluate(() => {
  const s = JSON.parse(localStorage.getItem("sk.demo"));
  const line = (id, productId, variantId, pickupDate, pickupPlaceId, extra = {}) =>
    ({ id, productId, variantId, quantity: 1, pickupDate, pickupPlaceId, ...extra });
  s.data.cart = [
    line("l1", "p-knife", "s", "2026-10-21", "altstadt", { engraving: "Ross Geller", selected: true }),
    line("l2", "p-giftbox", "std", "2026-10-20", "altstadt", { selected: true }),
    line("l3", "p-chocolate", "12", "2026-10-20", "bahnhof", { selected: true }),
  ];
  const order = s.data.orders.find((o) => o.status === "accepted") ?? s.data.orders[0];
  s.data.signedInGuestId = order.guestId;
  const own = s.data.orders.filter((o) => o.guestId === order.guestId).slice(0, 2).map((o) => o.id);
  localStorage.setItem("sk.demo", JSON.stringify(s));
  return { order: order.id, sent: own.join(",") };
});

const routes = [
  ["C04-cart", "#/cart"],
  ["C06-review", "#/cart/review"],
  ["C07-sent", `#/cart/sent?orders=${ids.sent}`],
  ["C03-gift", "#/gifts/kapellbruecke-pocket-knife"],
  ["C15-order", `#/account/orders/${ids.order}`],
  ["C12-pay", `#/account/orders/${ids.order}/pay`],
];

for (const [name, hash] of routes) {
  await page.goto(BASE + hash);
  await page.reload();
  await page.waitForTimeout(1600);
  if (name === "C04-cart" && OUT) {
    // Cart line metadata rows: option and engraving each with an icon; Standard gift without.
    for (const [i, slug] of [[0, "knife"], [1, "giftbox"]]) {
      const li = page.locator("main li").nth(i);
      console.log(LABEL, L, `line ${slug}`, (await li.innerText()).replace(/\n+/g, " | "));
      await li.screenshot({ path: `${OUT}/cart-line-${slug}-${L}.png` });
    }
    await page.screenshot({ path: `${OUT}/cart-top-${L}.png` });
  }
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await page.waitForTimeout(400);
  const m = await page.evaluate(() => {
    const main = document.querySelector("main");
    const isBar = (el) => {
      const cs = getComputedStyle(el);
      return (cs.position === "fixed" || cs.position === "sticky") && cs.bottom === "0px" && el.getBoundingClientRect().height < 300;
    };
    const bar = [...main.querySelectorAll("*")].find(isBar);
    // Lowest visible content: text, images, svgs, form controls, or any box with a visible surface.
    let bottom = 0;
    for (const el of main.querySelectorAll("*")) {
      if (bar && (bar === el || bar.contains(el))) continue;
      const cs = getComputedStyle(el);
      if (cs.visibility === "hidden" || cs.display === "none" || cs.position === "sticky" && cs.top === "0px") continue;
      const r = el.getBoundingClientRect();
      if (!r.height || !r.width) continue;
      // Clip to ancestors that hide overflow (collapsed accordion panels, carousels).
      let visBottom = r.bottom;
      for (let a = el.parentElement; a && a !== main; a = a.parentElement) {
        const acs = getComputedStyle(a);
        if (acs.overflowY !== "visible" || acs.overflow !== "visible") visBottom = Math.min(visBottom, a.getBoundingClientRect().bottom);
        if (acs.display === "none" || acs.visibility === "hidden" || acs.contentVisibility === "hidden" || a.hidden) visBottom = -1;
      }
      if (visBottom <= r.top) continue;
      const hasText = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
      const surface = cs.backgroundColor !== "rgba(0, 0, 0, 0)" || cs.boxShadow !== "none" || parseFloat(cs.borderBottomWidth) > 0;
      if (hasText || surface || /^(IMG|SVG|svg|INPUT|BUTTON)$/.test(el.tagName)) bottom = Math.max(bottom, visBottom);
    }
    const barTop = bar ? bar.getBoundingClientRect().top : innerHeight;
    return {
      bar: bar ? getComputedStyle(bar).position : "none",
      barHeight: bar ? Math.round(bar.getBoundingClientRect().height) : 0,
      mainPaddingBottom: getComputedStyle(main).paddingBottom,
      gap: Math.round(barTop - bottom),
      overflow: document.documentElement.scrollWidth - innerWidth,
      path: location.hash,
    };
  });
  console.log(LABEL, L, name, JSON.stringify(m));
  if (OUT) await page.screenshot({ path: `${OUT}/${name}-end-${L}.png` });
}
console.log("errors", JSON.stringify(errors));
await browser.close();
