// Round 3 follow-up (worker S, 14 Oct 2026): the M06 1024 DE table overflow fix must leave 375 and EN alone.
// PHASE=before|after: M06 for every departure with a guest-list table, and M07 tour-anna and tour-marie,
// at 375 and 1024 in EN and DE, into screens/2.11-r3/followup-<PHASE>/. Compare the two folders with
// `magick compare -metric AE`. Run next to 2.10-lib.mjs, against the dev server on 5233.
import * as d from "./2.10-lib.mjs";
import { mkdirSync } from "node:fs";

const PHASE = process.env.PHASE ?? "after";
const DIR = `2.11-r3/followup-${PHASE}`;
const DEPARTURES = ["walk-13", "walk-14", "walk-16", "walk-18", "walk-19", "walk-23", "lake-11", "lake-15", "workshop-17"];
const BOOKINGS = ["tour-anna", "tour-marie"];

/** Full page by growing the viewport, after every visible image has loaded. */
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
  d.check(`${DIR}/${name}.png`, true);
}

for (const width of [375, 1024]) {
  const { browser, page } = await d.open(width);
  await d.reset(page, "owner");
  for (const lang of ["en", "de"]) {
    for (const [path, name] of [...DEPARTURES.map((id) => [`/store/bookings/departures/${id}`, `m06-${id}`]), ...BOOKINGS.map((id) => [`/store/bookings/${id}`, `m07-${id}`])]) {
      await d.go(page, path, 1200);
      if (lang === "de") await d.setLang(page, "DE");
      await snap(page, `${name}-${width}-${lang}`);
    }
  }
  await browser.close();
}
d.summary();
