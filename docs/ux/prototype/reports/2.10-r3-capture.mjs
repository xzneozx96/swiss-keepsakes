// Round 3 (worker S, 14 Oct 2026): M05 tickets get the tour thumbnail, as M03 tickets show the product photo.
//   PHASE=before|after: M05 1024 (Table, must not change), M06 walk-13 and M02, 375 and 1024, EN,
//     into screens/2.10-r3/<PHASE>/ for the pixel compare. Run before twice to prove the shots are stable.
//   PHASE=final (default): the gift-vs-tour pairs into screens/2.10-r3/ (M03 vs M05, 375 and 1024,
//     tour EN and DE), plus the ticket thumbnail measured against the M03 product photo.
// Run next to 2.10-lib.mjs, against the dev server on 5233: node 2.10-r3-capture.mjs
import * as d from "./2.10-lib.mjs";
import { mkdirSync } from "node:fs";

const PHASE = process.env.PHASE ?? "final";
const DIR = PHASE === "final" ? "2.10-r3" : `2.10-r3/${PHASE}`;

/** Full page by growing the viewport, after every image has loaded; the lib's overflow and raw-key checks. */
async function snap(page, name) {
  mkdirSync(`${d.ROOT}/${DIR}`, { recursive: true });
  await d.wait(page, 400);
  const size = page.viewportSize();
  const height = await page.evaluate(() => document.documentElement.scrollHeight);
  await page.setViewportSize({ width: size.width, height: Math.max(size.height, height) });
  await d.wait(page, 300);
  await page.waitForFunction(() => [...document.images].filter((i) => i.offsetParent).every((i) => i.complete), null, { timeout: 5000 }).catch(() => console.log("WARN images still loading"));
  await page.screenshot({ path: `${d.ROOT}/${DIR}/${name}.png` });
  await page.setViewportSize(size);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  d.check(`${DIR}/${name}.png: no horizontal overflow`, overflow <= 0, `overflow ${overflow}px`);
  if (name.endsWith("-de")) {
    const raw = (await page.locator("body").innerText()).match(/\b(tourMerchant|tours|tourBooking|merchantOrders|merchantToday)\.[a-zA-Z]/);
    d.check(`${DIR}/${name}.png: no raw i18n keys`, !raw, raw?.[0] ?? "");
  }
}
const tourBoth = async (page, name) => { await snap(page, `${name}-tour-en`); await d.setLang(page, "DE"); await snap(page, `${name}-tour-de`); await d.setLang(page, "EN"); };

/** Size, radius and offsets of the first ticket photo, relative to its ticket. */
const photoBox = (page, sel) => page.evaluate((s) => {
  const ticket = document.querySelector(s);
  const media = ticket.querySelector("img").parentElement;
  const t = ticket.getBoundingClientRect(), m = media.getBoundingClientRect();
  const header = ticket.firstElementChild.getBoundingClientRect();
  return { size: `${m.width}x${m.height}`, radius: getComputedStyle(media).borderRadius, left: m.left - t.left, belowHeader: Math.round(m.top - header.bottom), alt: ticket.querySelector("img").alt };
}, sel);

for (const width of [375, 1024]) {
  console.log(`\n=== width ${width}`);
  const { browser, page } = await d.open(width);
  await d.reset(page, "owner");
  if (PHASE !== "final") {
    await d.go(page, "/store", 1800);
    await snap(page, `m02-${width}-en`);
    await d.go(page, "/store/bookings/departures/walk-13", 1500);
    await snap(page, `m06-${width}-en`);
    if (width === 1024) {
      await d.go(page, "/store/bookings", 1500);
      await snap(page, `m05-${width}-en`);
    }
  } else {
    await d.go(page, "/store/orders?status=awaiting-confirmation", 1500);
    await snap(page, `m05-${width}-gift-en`);
    const gift = width === 375 ? await photoBox(page, "main ul > li > a") : null;
    await d.go(page, "/store/bookings", 1500);
    await tourBoth(page, `m05-${width}`);
    if (width === 375) {
      const tour = await photoBox(page, "main ul > li > a");
      console.log("M03 photo:", JSON.stringify(gift), "\nM05 photo:", JSON.stringify(tour));
      d.check("M05 ticket photo has M03's size, radius, left edge and gap below the header", tour.size === gift.size && tour.radius === gift.radius && tour.left === gift.left && tour.belowHeader === gift.belowHeader);
      d.check("M05 ticket photo is decorative (alt=\"\"), as on M03", tour.alt === "" && gift.alt === "");
      const counts = await page.evaluate(() => [...document.querySelectorAll("main ul > li > a")].filter((a) => a.offsetParent).map((a) => a.querySelectorAll("img").length));
      d.check("every M05 ticket shows one thumbnail", counts.length > 0 && counts.every((n) => n === 1), `${counts.length} tickets: ${counts.join(",")}`);
      // Cancelled departure (walk-19): the date tile is muted; the photo is not.
      const cancelled = await page.locator("main ul > li").filter({ hasText: "19 Oct 2026, 10:00" }).first();
      d.check("cancelled walk-19 ticket keeps its thumbnail", (await cancelled.locator("img").count()) === 1);
    } else {
      const imgs = await page.locator("main table img").count();
      d.check("M05 1024 Table has no thumbnails, as the M03 Table", imgs === 0 && (await page.locator("main table").count()) > 0, `${imgs} images`);
    }
  }
  await browser.close();
}
d.summary();
