// Round 2 (R3): keyboard focus on the new link surfaces (M05 ticket, M02 tour tile) and the M07
// dialog surviving a resize across 1024px. Run next to 2.10-lib.mjs: node 2.10-r2-keyboard.mjs
import * as d from "./2.10-lib.mjs";

async function tabTo(page, test, max = 60) {
  for (let i = 0; i < max; i++) {
    await page.keyboard.press("Tab");
    const hit = await page.evaluate(test);
    if (hit) return true;
  }
  return false;
}
const ring = (page) =>
  page.evaluate(() => {
    const s = getComputedStyle(document.activeElement);
    return s.boxShadow !== "none" || (s.outlineStyle !== "none" && s.outlineWidth !== "0px") ? `${s.boxShadow} | ${s.outlineStyle} ${s.outlineWidth}` : "";
  });

{
  const { browser, page } = await d.open(375);
  await d.reset(page, "owner");
  await d.go(page, "/store/bookings", 1500);
  const found = await tabTo(page, () => /departures\/walk-14$/.test(document.activeElement?.getAttribute("href") ?? ""));
  d.check("M05 375: Tab reaches the walk-14 ticket link", found);
  const style = await ring(page);
  d.check("M05 375: focused ticket shows the focus ring", !!style, style.slice(0, 120));
  await d.shot(page, "2.10-r2", "m05-focus-375-en", false);
  await page.keyboard.press("Enter");
  await d.wait(page, 900);
  d.check("M05 375: Enter opens M06 for walk-14", page.url().endsWith("#/store/bookings/departures/walk-14"), page.url());

  await d.go(page, "/store", 1800);
  const tile = await tabTo(page, () => (document.activeElement?.getAttribute("aria-label") ?? "").startsWith("Results to record"), 80);
  d.check("M02 375: Tab reaches the first tour tile (Results to record, 1)", tile, await page.evaluate(() => document.activeElement?.getAttribute("aria-label")));
  const tileStyle = await ring(page);
  d.check("M02 375: focused tile shows the focus ring", !!tileStyle, tileStyle.slice(0, 120));
  await d.shot(page, "2.10-r2", "m02-focus-375-en", false);
  await page.keyboard.press("Enter");
  await d.wait(page, 900);
  d.check("M02 375: Enter opens the one booking to record (M07 tour-anna)", page.url().endsWith("#/store/bookings/tour-anna"), page.url());
  await browser.close();
}
{
  // The M07 money panel and next step keep their tree position across 1024px.
  const { browser, page } = await d.open(1100);
  await d.reset(page, "owner");
  await d.go(page, "/store/bookings/tour-anna", 1500);
  await page.getByRole("button", { name: "No-show" }).click();
  await d.wait(page, 600);
  const dialog = page.getByRole("alertdialog").or(page.getByRole("dialog")).last();
  d.check("M07 1100: No-show confirmation open", await dialog.isVisible());
  await page.setViewportSize({ width: 900, height: 812 });
  await d.wait(page, 800);
  d.check("M07: confirmation still open after resizing 1100 → 900", await dialog.isVisible());
  await browser.close();
}
d.summary();
