import { chromium } from "playwright-core";
import { readdirSync } from "node:fs";
const home = process.env.HOME + "/.cache/ms-playwright/";
const dir = readdirSync(home).filter(d => d.startsWith("chromium_headless_shell-")).sort().pop();
const exe = `${home}${dir}/chrome-headless-shell-linux64/chrome-headless-shell`;
const OUT = process.argv[2];
const BASE = "http://localhost:5186/";
const browser = await chromium.launch({ executablePath: exe });
const page = await browser.newPage({ viewport: { width: 375, height: 812 }, deviceScaleFactor: 2 });
const log = (...a) => console.log(...a);
page.on("console", m => { if (m.type() === "error") log("CONSOLE", m.text()); });
page.on("pageerror", e => log("PAGEERROR", e.message));
const overflow = () => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
const shot = async (name, width) => {
  await page.waitForTimeout(500);
  const h = await page.evaluate(() => document.documentElement.scrollHeight);
  await page.setViewportSize({ width, height: Math.max(h, 700) });
  await page.waitForTimeout(200);
  await page.screenshot({ path: `${OUT}/${name}.png` });
  await page.setViewportSize({ width, height: width === 375 ? 812 : 800 });
  log("shot", name, "overflow:", await overflow());
};
const tabs = ["awaiting-confirmation","awaiting-payment","preparing","ready","owing","completed","cancelled"];

await page.goto(BASE);
await page.evaluate(() => localStorage.clear());
await page.goto(BASE + "#/store/orders");
await page.waitForTimeout(60);
await page.screenshot({ path: `${OUT}/orders-skeleton.png` });
await page.waitForTimeout(800);

for (const lang of ["EN", "DE"]) {
  if (lang === "DE") { await page.getByRole("button", { name: "DE", exact: true }).click(); await page.waitForTimeout(300); }
  const tabNames = await page.getByRole("tab").allInnerTexts();
  log(lang, "tabs:", JSON.stringify(tabNames.map(s => s.replace(/\n/g, " "))));
  for (const width of [375, 1024]) {
    await page.setViewportSize({ width, height: 800 });
    for (const t of tabs) {
      await page.goto(BASE + "#/store/orders?status=" + t);
      await page.waitForTimeout(700);
      const sel = await page.getByRole("tab", { selected: true }).innerText();
      const text = (await page.locator(width === 375 ? "main ul[aria-label], main .empty-state, main [class*=empty]" : "main table, main [class*=empty]").first().innerText().catch(() => "(none)")).replace(/\n+/g, " | ");
      const box = await page.getByRole("tab", { selected: true }).boundingBox();
      log(lang, width, t, "selected:", sel.replace(/\n/g, " "), "inView:", box && box.x >= 0 && box.x + box.width <= width, "overflow:", await overflow());
      log("   ", text.slice(0, 600));
      const lc = lang.toLowerCase();
      if (["awaiting-confirmation", "ready", "owing", "cancelled"].includes(t) || (width === 1024 && t === "awaiting-payment"))
        await shot(`orders-${t}-${lc}-${width}`, width);
    }
  }
}

// keyboard: arrows between tabs; Enter on a row opens M04 path
await page.getByRole("button", { name: "EN", exact: true }).click();
await page.setViewportSize({ width: 375, height: 812 });
await page.goto(BASE + "#/store/orders");
await page.waitForTimeout(700);
await page.getByRole("tab", { selected: true }).focus();
await page.keyboard.press("ArrowRight");
await page.waitForTimeout(300);
log("after ArrowRight url:", page.url(), "selected:", (await page.getByRole("tab", { selected: true }).innerText()).replace(/\n/g, " "));
await page.keyboard.press("Tab");
log("focused after Tab:", await page.evaluate(() => document.activeElement?.tagName + " " + document.activeElement?.getAttribute("href")));
await page.keyboard.press("Enter");
await page.waitForTimeout(300);
log("after Enter on row url:", page.url());
await page.setViewportSize({ width: 1024, height: 800 });
await page.goto(BASE + "#/store/orders?status=awaiting-confirmation");
await page.waitForTimeout(700);
await page.getByRole("row").nth(1).click();
await page.waitForTimeout(300);
log("table row click url:", page.url());
await page.goto("about:blank");
await page.goto(BASE + "#/store/orders?status=bogus");
await page.waitForTimeout(700);
log("bogus param url:", page.url(), "selected:", (await page.getByRole("tab", { selected: true }).innerText()).replace(/\n/g, " "));
await browser.close();
