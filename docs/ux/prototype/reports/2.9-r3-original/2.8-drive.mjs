// 2.8: C13 Booking confirmed (full, deposit, pay later). 375px EN and DE.
// Run from a folder with playwright-core installed: node 2.8-drive.mjs <repo root>
import { readFileSync } from "node:fs";

import { chooseDeparture, fillContact, start, submitReview, toReview } from "./2.5-2.9-lib.mjs";

const t = await start(process.env.SHOTS ?? "2.8");
const { page, check, wait, has } = t;
const book = async (slug, day, group) => {
  await chooseDeparture(t, slug, day, group);
  await toReview(t);
  await fillContact(t);
  await submitReview(t);
  return t.bookingIdFromUrl();
};

await t.reset();
await t.signIn();

// Full payment.
const full = await book("lucerne-old-town-walk", "Tue 20 Oct", { adults: 2, children: 0, infants: 0 });
await page.getByRole("button", { name: /^Pay CHF 178\.00/ }).click();
await wait(1000);
check("full: C13 after payment", page.url().endsWith(`/bookings/${full}/confirmed`));
const c13 = await t.text("main");
const b = await t.booking(full);
check("C13 booking reference", c13.includes(b.ref), b.ref);
check("C13 departure", /Tue, 20 Oct, 10:00/.test(c13));
check("C13 meeting point", /Where to meet:?\s+Chapel Bridge/.test(c13));
check("C13 participants", /2 adults\b/.test(c13) && /Anna Keller · \+41 79 123 45 67/.test(c13));
check("C13 separate booking and payment labels", /Confirmed/.test(c13) && /Paid in full/.test(c13));
check("C13 optional trip profile offered", await has(/Help us understand your trip/));
const link = page.getByRole("link", { name: "Add to calendar" });
check("C13 Add to calendar present", (await link.count()) === 1);
const [download] = await Promise.all([page.waitForEvent("download"), link.click()]);
const ics = readFileSync(await download.path(), "utf8");
check("calendar file name is the reference", download.suggestedFilename() === `${b.ref}.ics`, download.suggestedFilename());
check("calendar event: start, end, place, reference", /DTSTART:20261020T080000Z/.test(ics) && /DTEND:20261020T100000Z/.test(ics) && /LOCATION:Chapel Bridge/.test(ics) && ics.includes(b.ref), ics.split("\r\n").filter((l) => /^(DTSTART|DTEND|SUMMARY|LOCATION)/.test(l)).join(" "));
check("no 15-minute timer on C13", !(await has(/Places reserved for/)));
await t.both("c13-full");
await t.keyboard("C13 'Add to calendar'", /Add to calendar$/);

// Deposit: confirmed with the remaining balance still due.
const dep = await book("lucerne-old-town-walk", "Fri 16 Oct", { adults: 2, children: 1, infants: 0 });
await page.getByRole("button", { name: /^Pay CHF 66\.90/ }).click();
await wait(1000);
const d = await t.booking(dep);
check("deposit: confirmed after 30%", d.status === "confirmed" && t.paid(d) === 6690);
check("deposit: C13 shows paid, balance and due date", (await has(/Deposit paid · balance due/)) && (await has(/Paid\s+CHF 66\.90/)) && (await has(/Remaining balance\s+CHF 156\.10/)) && (await has(/Balance due by Thu, 15 Oct, 18:00/)));
check("deposit: balance payment offered", (await page.getByRole("button", { name: /Pay remaining balance · CHF 156\.10/ }).count()) === 1);
await t.both("c13-deposit");

// Pay later: confirmed without a card or a 15-minute timer.
const later = await book("lake-lucerne-stories", "17 Oct", { adults: 2, children: 0, infants: 0 });
const l = await t.booking(later);
check("pay later: C11 goes straight to C13 (no C12)", page.url().endsWith(`/bookings/${later}/confirmed`), page.url());
check("pay later: confirmed, no hold, nothing paid", l.status === "confirmed" && l.holdUntil === null && l.payments.length === 0);
check("pay later: confirmation email N09 only", (await t.mails(later)) === "guest:N09", await t.mails(later));
check("pay later: no timer, no provider page", !(await has(/Places reserved for/)) && !(await has(/SIMULATED PAYMENT PROVIDER/)));
check("pay later: payment due label, unpaid amount and deadline", (await has(/Payment due/)) && (await has(/Nothing was charged\. Pay CHF 258\.00 by Fri, 16 Oct, 18:00\./)));
const rule = l.overduePolicy?.action ?? "merchant";
check("pay later: overdue wording follows the booking's snapshotted policy", await has({ cancel: /booking is cancelled and the places are released/, grace: /waits \d+ hours/, merchant: /organiser decides what happens next/ }[rule]), `policy ${rule}`);
await t.both("c13-pay-later");

await t.finish();
