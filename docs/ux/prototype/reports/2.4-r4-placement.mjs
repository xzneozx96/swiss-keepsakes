// 2.4-r4 placement comparison (14 Oct 2026, scratch): renders the chosen tile with the check inset in the corner
// (as first built) and on the top edge (CSS injected, no code change), with DE "Nussbaum" put on sale.
// Run from a folder with playwright-core installed, against vite --port 5231; writes ./v-{inset,topedge}-{c03,c10}.png.
import { chromium } from "playwright-core";
import { readdirSync } from "node:fs";
const home = process.env.HOME + "/.cache/ms-playwright/";
const dir = readdirSync(home).filter((d) => d.startsWith("chromium_headless_shell-")).sort().pop();
const browser = await chromium.launch({ executablePath: `${home}${dir}/chrome-headless-shell-linux64/chrome-headless-shell` });
const page = await browser.newPage({ viewport: { width: 375, height: 812 }, deviceScaleFactor: 2 });
const B = "http://localhost:5231/";
await page.goto(B); await page.evaluate(() => localStorage.clear()); await page.reload(); await page.waitForTimeout(800);
await page.evaluate(() => { const s = JSON.parse(localStorage.getItem("sk.demo")); const walk = (o) => { if (!o || typeof o !== "object") return; if (o.id === "walnut" && "notForSale" in o) o.notForSale = false; Object.values(o).forEach(walk); }; walk(s); localStorage.setItem("sk.demo", JSON.stringify(s)); });
await page.reload(); await page.waitForTimeout(800);
await page.getByRole("group", { name: "Language" }).getByRole("button", { name: "DE" }).first().click(); await page.waitForTimeout(400);
const variants = {
  inset: "",
  // icon 18px, centred on the top border, 8px in from the right edge; white ring
  topedge: "[data-slot=tag] svg.absolute, [data-slot=radio] > svg.absolute { top: -11px !important; inset-inline-end: 8px !important; width: 20px !important; height: 20px !important; border-radius: 9999px; background: var(--surface); }",
};
for (const [name, css] of Object.entries(variants)) {
  await page.goto(B + "#/gifts/personal-name-knife"); await page.waitForTimeout(900);
  if (css) await page.addStyleTag({ content: css });
  await page.getByRole("button", { name: /^In den Warenkorb$/ }).last().click(); await page.waitForTimeout(700);
  await page.getByRole("dialog").getByRole("row", { name: /Nussbaum/ }).click(); await page.mouse.move(5, 5); await page.waitForTimeout(400);
  await page.getByRole("dialog").locator("#gift-variant").screenshot({ path: `./v-${name}-c03.png` });
  const sw = await page.evaluate(() => { const b = document.querySelector("[role=dialog] .overflow-y-auto"); return b ? b.scrollWidth - b.clientWidth : null; });
  console.log(name, "drawer body x-overflow", sw);
  await page.goto(B + "#/tours/lucerne-old-town-walk/book"); await page.waitForTimeout(900);
  if (css) await page.addStyleTag({ content: css });
  await page.locator(".radio").filter({ hasText: /16\. Okt/ }).click(); await page.mouse.move(5, 5); await page.waitForTimeout(400);
  await page.locator(".radio-group").first().screenshot({ path: `./v-${name}-c10.png` });
}
await browser.close();
