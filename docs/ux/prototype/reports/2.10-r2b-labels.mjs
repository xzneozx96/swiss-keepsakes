// Fix pass (R3): proves BookingStatusLabels renders the same chips after the useBookingLabels
// refactor. Dumps the chip group HTML on M07, M06, C14 and C16, plus before/after shots of C16
// and M07. Run next to 2.10-lib.mjs: node 2.10-r2b-labels.mjs <before|after>
import * as d from "./2.10-lib.mjs";
import { writeFileSync } from "node:fs";

const phase = process.argv[2] ?? "after";
const out = {};
const groups = (page) =>
  page.evaluate(() =>
    [...document.querySelectorAll("main div.flex.flex-wrap.gap-2")]
      .filter((g) => g.firstElementChild?.className?.includes?.("chip"))
      .map((g) => g.outerHTML.replace(/ (id|aria-labelledby|aria-describedby)="[^"]*"/g, "")),
  );

const { browser, page } = await d.open(375);
await d.reset(page, "owner");
for (const id of ["tour-anna", "tour-marie", "tour-tom", "tc-yuki-paid", "tc-anna-done", "tc-sofia-cancelled", "tc-lars-late", "tc-daniel-grace"]) {
  await d.go(page, `/store/bookings/${id}`, 1200);
  out[`M07 ${id}`] = await groups(page);
}
await d.shot(page, "2.12-r2b", `labels-m07-exception-375-${phase}-en`, false, "main header");
await d.go(page, "/store/bookings/tour-anna", 1200);
await d.shot(page, "2.12-r2b", `labels-m07-375-${phase}-en`, false, "main header");
for (const dep of ["walk-13", "walk-16", "walk-19"]) {
  await d.go(page, `/store/bookings/departures/${dep}`, 1200);
  out[`M06 ${dep}`] = await groups(page);
}
await d.setRole(page, "guest");
await d.signInGuest(page, "/account");
// C14 lives at /account?tab=bookings. The first before/after run used /account/bookings, which
// renders no list, so its "C14 list" entry compared two empty arrays.
await d.go(page, "/account?tab=bookings", 1500);
out["C14 list"] = await groups(page);
for (const id of ["tour-anna", "tc-anna-done", "tc-anna-overdue"]) {
  await d.go(page, `/account/bookings/${id}`, 1500);
  out[`C16 ${id}`] = await groups(page);
}
await d.go(page, "/account/bookings/tour-anna", 1500);
await d.shot(page, "2.12-r2b", `labels-c16-375-${phase}-en`, false);
await browser.close();
writeFileSync(new URL(`./2.10-r2b-labels-${phase}.json`, import.meta.url), JSON.stringify(out, null, 1));
console.log(Object.entries(out).map(([k, v]) => `${k}: ${v.length} group(s)`).join("\n"));
d.summary();
