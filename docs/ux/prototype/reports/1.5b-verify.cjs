const { chromium } = require("/home/ross-geller/.npm/_npx/e41f203b7505f1fb/node_modules/playwright");
const OUT = "/home/ross-geller/Projects/minastik/swiss-keepsakes/docs/ux/prototype/screens/1.5b/";
const URL = "http://localhost:5196";
const lines = [
  { id: "l-knife", productId: "p-knife", variantId: "m", quantity: 1, engraving: "Anna", pickupDate: "2026-10-28", pickupPlaceId: "altstadt" },
  { id: "l-choc", productId: "p-chocolate", variantId: "12", quantity: 2, pickupDate: "2026-10-28", pickupPlaceId: "altstadt" },
  { id: "l-box", productId: "p-giftbox", variantId: "std", quantity: 1, pickupDate: "2026-10-30", pickupPlaceId: "bahnhof" },
];
const log = (...a) => console.log(...a);
const active = (page) => page.evaluate(() => { const e = document.activeElement; return `${e.tagName} "${(e.getAttribute("aria-label") || e.textContent || "").trim().slice(0, 40)}"`; });
const overflow = (page) => page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
const dialogOpen = (page) => page.locator('[role="alertdialog"]').count();
const summary = (page) => page.locator("h1 ~ *, p").first().textContent().catch(() => "");

async function seed(page, lang) {
  await page.goto(URL + "/");
  await page.waitForTimeout(800);
  await page.evaluate(({ lines, lang }) => {
    const s = JSON.parse(localStorage.getItem("sk.demo"));
    s.data.cart = lines;
    localStorage.setItem("sk.demo", JSON.stringify(s));
    localStorage.setItem("sk.language", JSON.stringify(lang));
  }, { lines, lang });
  await page.goto(URL + "/#/cart"); await page.reload();
  await page.waitForSelector("section h2", { timeout: 10000 });
  await page.waitForTimeout(400);
}
const headings = (page) => page.locator("section h2").allTextContents();
const sumText = (page) => page.locator("p.text-muted", { hasText: " · " }).first().textContent({ timeout: 2000 }).catch(() => "(none)");

(async () => {
  const browser = await chromium.launch({ executablePath: "/home/ross-geller/.cache/ms-playwright/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell" });
  for (const lang of ["en", "de"]) {
    log(`\n=== ${lang} @375 ===`);
    const ctx = await browser.newContext({ viewport: { width: 375, height: 812 }, deviceScaleFactor: 2 });
    const page = await ctx.newPage();
    const errors = [];
    page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
    await seed(page, lang);
    log("summary:", await sumText(page), "| orders:", await headings(page), "| overflow:", await overflow(page));
    await page.screenshot({ path: `${OUT}cart-${lang}.png` });
    const knifeRemove = page.locator("li button[aria-label]").first();
    log("first remove aria:", await knifeRemove.getAttribute("aria-label"));

    // Mouse: open, check focus, Cancel
    await knifeRemove.click();
    await page.waitForSelector('[role="alertdialog"]');
    await page.waitForTimeout(500);
    log("dialog title:", await page.locator('[role="alertdialog"] h2, [role="alertdialog"] [slot="title"]').first().textContent());
    log("dialog body:", await page.locator('[role="alertdialog"] p').first().textContent());
    log("focus on open:", await active(page), "| overflow:", await overflow(page));
    const box = await page.locator('[role="alertdialog"]').boundingBox();
    log("dialog box:", JSON.stringify(box));
    const btns = await page.locator('[role="alertdialog"] button').evaluateAll((bs) => bs.map((b) => { const r = b.getBoundingClientRect(); return `${b.textContent.trim()} x${Math.round(r.x)} y${Math.round(r.y)} w${Math.round(r.width)} sw${b.scrollWidth}`; }));
    log("buttons:", btns);
    await page.screenshot({ path: `${OUT}remove-dialog-${lang}.png` });
    await page.locator('[role="alertdialog"] button', { hasText: lang === "en" ? "Cancel" : "Abbrechen" }).click();
    await page.waitForTimeout(600);
    log("after Cancel: dialog", await dialogOpen(page), "| orders:", await headings(page), "| summary:", await sumText(page), "| focus:", await active(page));

    // Esc
    await knifeRemove.click(); await page.waitForSelector('[role="alertdialog"]'); await page.waitForTimeout(400);
    await page.keyboard.press("Escape"); await page.waitForTimeout(600);
    log("after Esc: dialog", await dialogOpen(page), "| summary:", await sumText(page));

    // Backdrop
    await knifeRemove.click(); await page.waitForSelector('[role="alertdialog"]'); await page.waitForTimeout(400);
    await page.mouse.click(187, 40); await page.waitForTimeout(600);
    log("after backdrop: dialog", await dialogOpen(page), "| summary:", await sumText(page));

    // Keyboard-only: focus remove, Enter, Tab, Enter
    await knifeRemove.focus();
    await page.keyboard.press("Enter"); await page.waitForSelector('[role="alertdialog"]'); await page.waitForTimeout(500);
    log("kbd open focus:", await active(page));
    await page.keyboard.press("Tab"); log("after Tab:", await active(page));
    await page.keyboard.press("Tab"); log("after 2nd Tab (trap):", await active(page));
    await page.keyboard.press("Tab");
    await page.screenshot({ path: `${OUT}remove-dialog-focus-${lang}.png` });
    await page.keyboard.press("Enter"); await page.waitForTimeout(900);
    log("after confirm: dialog", await dialogOpen(page), "| orders:", await headings(page), "| summary:", await sumText(page), "| focus:", await active(page));
    await page.keyboard.press("Tab"); await page.waitForTimeout(1500); log("focus 1.5s later:", await active(page)); await page.keyboard.press("Tab"); log("next Tab:", await active(page));
    await page.screenshot({ path: `${OUT}after-remove-${lang}.png` });

    // Remove the rest -> empty state
    while (await page.locator("li button[aria-label]").count()) {
      await page.locator("li button[aria-label]").first().click();
      await page.waitForSelector('[role="alertdialog"]'); await page.waitForTimeout(400);
      await page.locator('[role="alertdialog"] button').nth(1).click(); await page.waitForTimeout(800);
    }
    await page.waitForTimeout(1500);
    log("empty: focus", await active(page), "| text:", (await page.locator("body").innerText()).slice(0, 200).replace(/\n/g, " / "));
    await page.screenshot({ path: `${OUT}empty-${lang}.png` });
    log("console errors:", errors);
    await ctx.close();
  }

  for (const [w, h, name] of [[1024, 768, "remove-dialog-1024-en"], [340, 700, "remove-dialog-340-de"]]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h } });
    const page = await ctx.newPage();
    await seed(page, name.endsWith("de") ? "de" : "en");
    await page.locator("li button[aria-label]").first().click();
    await page.waitForSelector('[role="alertdialog"]'); await page.waitForTimeout(500);
    const btns = await page.locator('[role="alertdialog"] button').evaluateAll((bs) => bs.map((b) => { const r = b.getBoundingClientRect(); return `${b.textContent.trim()} x${Math.round(r.x)} y${Math.round(r.y)} w${Math.round(r.width)}`; }));
    log(`\n${name}: box`, JSON.stringify(await page.locator('[role="alertdialog"]').boundingBox()), btns, "overflow", await overflow(page));
    await page.screenshot({ path: `${OUT}${name}.png` });
    await ctx.close();
  }
  await browser.close();
})();
