// 1.5c verification: C04 Gift slip line at 375px, EN and DE. Run with node against vite on 5199.
const { chromium } = require("/home/ross-geller/.npm/_npx/e41f203b7505f1fb/node_modules/playwright");
const OUT = "/home/ross-geller/Projects/minastik/swiss-keepsakes/docs/ux/prototype/screens/1.5c/";
const URL = "http://localhost:5199";
const lines = (knifeDate) => [
  { id: "l-knife", productId: "p-knife", variantId: "m", quantity: 1, engraving: "Anna", pickupDate: knifeDate, pickupPlaceId: "altstadt" },
  { id: "l-box", productId: "p-giftbox", variantId: "std", quantity: 1, pickupDate: "2026-10-28", pickupPlaceId: "altstadt" },
];
const log = (...a) => console.log(...a);
const overflow = (page) => page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
const STYLE = (el) => {
  const s = getComputedStyle(el);
  return { radius: s.borderRadius, shadow: s.boxShadow, border: `${s.borderTopWidth} ${s.borderTopStyle}`, bg: s.backgroundColor };
};

async function setState(page, patch) {
  await page.goto(URL + "/");
  await page.waitForTimeout(800);
  await page.evaluate((patch) => {
    const s = JSON.parse(localStorage.getItem("sk.demo"));
    if (patch.cart) s.data.cart = patch.cart;
    if (patch.role) s.role = patch.role;
    localStorage.setItem("sk.demo", JSON.stringify(s));
    localStorage.setItem("sk.language", JSON.stringify(patch.lang));
  }, patch);
}

const fitHeight = async (page) =>
  page.setViewportSize({ width: 375, height: await page.evaluate(() => document.documentElement.scrollHeight) });

async function openCart(page, lang, knifeDate = "2026-10-28") {
  await setState(page, { cart: lines(knifeDate), lang, role: "guest" });
  await page.goto(URL + "/#/cart");
  await page.reload();
  await page.waitForSelector("section h2", { timeout: 10000 });
  await page.waitForTimeout(500);
}

(async () => {
  const browser = await chromium.launch({ executablePath: "/home/ross-geller/.cache/ms-playwright/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell" });
  const errors = [];
  for (const lang of ["en", "de"]) {
    log(`\n=== ${lang} @375 ===`);
    const ctx = await browser.newContext({ viewport: { width: 375, height: 1100 }, deviceScaleFactor: 2 });
    const page = await ctx.newPage();
    page.on("console", (m) => m.type() === "error" && errors.push(`${lang}: ${m.text()}`));

    // Lab option L (default selection), the source design.
    await setState(page, { lang });
    await page.goto(URL + "/#/lab/cart-line");
    await page.reload();
    await page.waitForSelector('section[aria-label="L · Gift slip"]');
    await page.waitForTimeout(500);
    await page.locator('section[aria-label="L · Gift slip"]').screenshot({ path: `${OUT}lab-L-${lang}.png` });
    const labCard = await page.locator('section[aria-label="L · Gift slip"] li > div > div').first().evaluate(STYLE);
    log("lab L line card:", JSON.stringify(labCard));

    // C04, two orders.
    await openCart(page, lang);
    log("orders:", await page.locator("section h2").allTextContents(), "| overflow:", await overflow(page));
    log("line text:", (await page.locator("section li").allInnerTexts()).map((t) => t.replace(/\n+/g, " | ")));
    const card = await page.locator("section li").first().evaluate(STYLE);
    log("C04 line card:", JSON.stringify(card));
    const qty = page.locator('section li [role="group"]').first();
    log("qty aria:", await qty.getAttribute("aria-label"));
    await fitHeight(page);
    await page.screenshot({ path: `${OUT}cart-${lang}.png` });
    await page.setViewportSize({ width: 375, height: 1100 });

    // Quantity +1 on the gift box updates total.
    await page.locator("section li").nth(1).locator('[role="group"] button').last().click();
    await page.waitForTimeout(400);
    log("after +1 box line:", (await page.locator("section li").nth(1).innerText()).replace(/\n+/g, " | "));

    // Remove goes through ConfirmDialog.
    const remove = page.locator("section li").first().locator("button[aria-label]").first();
    log("remove aria:", await remove.getAttribute("aria-label"));
    await remove.click();
    await page.waitForSelector('[role="alertdialog"]');
    await page.waitForTimeout(500);
    log("dialog:", (await page.locator('[role="alertdialog"]').innerText()).replace(/\n+/g, " | "));
    await page.screenshot({ path: `${OUT}remove-confirm-${lang}.png` });
    await page.locator('[role="alertdialog"] button').last().click();
    await page.waitForTimeout(800);
    log("after confirm orders:", await page.locator("section h2").allTextContents());

    // Invalid date: knife requested for today (needs engraving prep).
    await openCart(page, lang, "2026-10-13");
    log("invalid alert:", (await page.locator('[role="alert"], .alert').first().innerText().catch(() => "(none)")).replace(/\n+/g, " | "));
    await fitHeight(page);
    await page.screenshot({ path: `${OUT}invalid-date-${lang}.png` });
    await page.setViewportSize({ width: 375, height: 1100 });
    await page.locator("[data-date-fix]").click();
    await page.waitForTimeout(500);
    log("after fix: alerts", await page.locator("[data-date-fix]").count(), "| orders:", await page.locator("section h2").allTextContents());

    // Empty.
    await setState(page, { cart: [], lang, role: "guest" });
    await page.goto(URL + "/#/cart");
    await page.reload();
    await page.waitForTimeout(1500);
    log("empty:", (await page.locator("main, body").first().innerText()).replace(/\n+/g, " | ").slice(0, 200));
    await page.screenshot({ path: `${OUT}empty-${lang}.png` });

    // Skeleton (simulated loading, first frames after load).
    await setState(page, { cart: lines("2026-10-28"), lang, role: "guest" });
    await page.goto(URL + "/#/cart");
    await page.reload();
    await page.waitForSelector(".skeleton, [data-slot='skeleton'], [class*='skeleton']", { timeout: 3000 }).then(
      () => page.screenshot({ path: `${OUT}skeleton-${lang}.png` }).then(() => log("skeleton: captured")),
      () => log("skeleton: not caught"),
    );
    await ctx.close();
  }

  // M02 Today task card, the agreed surface.
  const ctx = await browser.newContext({ viewport: { width: 375, height: 812 } });
  const page = await ctx.newPage();
  await setState(page, { lang: "en", role: "owner" });
  await page.goto(URL + "/#/store");
  await page.reload();
  await page.waitForSelector('a[href*="/store/orders"].rounded-3xl', { timeout: 10000 });
  log("\nM02 task card:", JSON.stringify(await page.locator('a[href*="/store/orders"].rounded-3xl').first().evaluate(STYLE)));
  await ctx.close();

  log("\nconsole errors:", errors.length ? errors : "none");
  await browser.close();
})();
