// 2.4-r4 check clearance (14 Oct 2026, scratch): the chosen tile's check as first moved to the top edge
// (20px, 10px above the tile, injected as CSS) against the final build (18px, 6px above). Measures the gap
// to the tile above on C10 and crops C03 (DE Nussbaum on sale) and C10. Writes ./f-{previous,final}-{c03,c10}.png.
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
const sel = "[data-slot=tag] svg.absolute, [data-slot=radio] > svg.absolute";
const variants = {
  // 20px, 12px above the padding box (round-4 first fix), injected over the final build
  previous: `${sel} { top: -12px !important; width: 20px !important; height: 20px !important; }`,
  final: "",
};
const probe = () => page.evaluate(() => {
  const tiles = [...document.querySelectorAll("[data-slot=radio]")];
  const i = tiles.findIndex((t) => t.dataset.selected === "true");
  const svg = tiles[i].querySelector(":scope > svg.absolute").getBoundingClientRect();
  const prev = tiles[i - 1].getBoundingClientRect();
  const r = tiles[i].getBoundingClientRect();
  return { aboveOuterEdge: Math.round(r.top - svg.top), gapToPrevTile: Math.round(svg.top - prev.bottom), centreBelowEdge: Math.round(svg.top + svg.height / 2 - r.top) };
});
for (const [name, css] of Object.entries(variants)) {
  await page.reload(); await page.waitForTimeout(800); // drop styles injected by the previous variant
  await page.goto(B + "#/tours/lucerne-old-town-walk/book"); await page.waitForTimeout(900);
  if (css) await page.addStyleTag({ content: css });
  await page.locator(".radio").filter({ hasText: /16\. Okt/ }).click(); await page.mouse.move(5, 5); await page.waitForTimeout(400);
  console.log(name, JSON.stringify(await probe()));
  const box = await page.locator(".radio").nth(1).boundingBox();
  await page.screenshot({ path: `./f-${name}-c10.png`, clip: { x: box.x + box.width - 90, y: box.y - 30, width: 100, height: 70 } });
  await page.goto(B + "#/gifts/personal-name-knife"); await page.waitForTimeout(900);
  if (css) await page.addStyleTag({ content: css });
  await page.getByRole("button", { name: /^In den Warenkorb$/ }).last().click(); await page.waitForTimeout(700);
  await page.getByRole("dialog").getByRole("row", { name: /Nussbaum/ }).click(); await page.mouse.move(5, 5); await page.waitForTimeout(400);
  const t = await page.getByRole("dialog").getByRole("row", { name: /Nussbaum/ }).boundingBox();
  await page.screenshot({ path: `./f-${name}-c03.png`, clip: { x: t.x - 6, y: t.y - 14, width: t.width + 12, height: t.height + 20 } });
}
await browser.close();
