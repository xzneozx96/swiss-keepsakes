// 2.6: C12 first tour payment with the 15-minute hold. 375px EN and DE.
// Run from a folder with playwright-core installed: node 2.6-drive.mjs <repo root>
import { chooseDeparture, fillContact, start, submitReview, toReview } from "./2.5-2.9-lib.mjs";

const t = await start("2.6");
const { page, check, wait, has } = t;
const SLUG = "lucerne-old-town-walk";
const book = async (day, group) => {
  await chooseDeparture(t, SLUG, day, group);
  await toReview(t);
  await fillContact(t);
  await submitReview(t);
  return t.bookingIdFromUrl();
};
const provider = (name) => page.getByRole("button", { name });

await t.reset();
await t.signIn();

// Full payment within the hold (walk-20, pay in full), with a double tap on Pay.
const before20 = await t.seatsTaken("walk-20");
const full = await book("Tue 20 Oct", { adults: 2, children: 0, infants: 0 });
let b = await t.booking(full);
check("submit creates a 15-minute hold", b.status === "pending_payment" && Date.parse(b.holdUntil) - Date.parse(b.createdAt) === 15 * 60000, `${b.createdAt} → ${b.holdUntil}`);
check("hold takes the group's seats", (await t.seatsTaken("walk-20")) === before20 + 2);
check("C12 shows the remaining time", await has(/Places reserved for 1[45]:\d\d/));
check("C12 amount is the full total CHF 178.00", await has(/Amount\s+CHF 178\.00/));
await t.both("c12-full-hold", false);
await provider(/^Pay CHF 178\.00/).dblclick();
await wait(1000);
b = await t.booking(full);
check("double tap on Pay records one payment", b.payments.length === 1 && t.paid(b) === 17800, JSON.stringify(b.payments.map((p) => p.status)));
check("confirmed within the hold, hold cleared", b.status === "confirmed" && b.holdUntil === null);
check("emails: one receipt N07 and one confirmation N09", (await t.mails(full)) === "guest:N07,guest:N09", await t.mails(full));
check("success opens C13", page.url().endsWith(`/bookings/${full}/confirmed`), page.url());
check("C13 shows paid in full, completion not implied", (await has(/Paid in full/)) && (await has(/Confirmed/)) && !(await has(/Completed/)));
check("seats stay taken after confirmation", (await t.seatsTaken("walk-20")) === before20 + 2);

// Deposit within the hold, after a failed attempt and a retry (walk-16, 30% deposit).
const dep = await book("Fri 16 Oct", { adults: 2, children: 1, infants: 0 });
b = await t.booking(dep);
const hold = b.holdUntil;
check("C12 deposit amount CHF 66.90", await has(/Amount\s+CHF 66\.90/));
await provider(/^Fail/).click();
await wait(600);
check("failed attempt: declined message with retry", (await has(/Payment declined/)) && (await provider("Try again").count()) === 1);
b = await t.booking(dep);
check("failed attempt: still held, same deadline, nothing paid", b.status === "pending_payment" && b.holdUntil === hold && t.paid(b) === 0);
await t.both("c12-failed", false);
await provider("Try again").click();
await wait(400);
await provider(/^Pay CHF 66\.90/).click();
await wait(1000);
b = await t.booking(dep);
check("emails: failed N08, then receipt N07 and confirmation N09", (await t.mails(dep)) === "guest:N08,guest:N07,guest:N09", await t.mails(dep));
check("retry within the deadline confirms on the deposit", b.status === "confirmed" && t.paid(b) === 6690 && b.payments.length === 2, b.payments.map((p) => p.status).join(","));
check("deposit: C13 shows balance due CHF 156.10", (await has(/Deposit paid · balance due/)) && (await has(/Remaining balance\s+CHF 156\.10/)));

// Processing: no second payment while the provider has not answered.
const proc = await book("Tue 20 Oct", { adults: 1, children: 0, infants: 0 });
await provider(/^Processing/).click();
await wait(600);
check("processing: C12 says it is processing, no Pay button", (await has(/This payment is processing/)) && (await provider(/^Pay CHF/).count()) === 0);
await t.both("c12-processing", false);
await page.reload(); await wait(900);
check("processing: reload still offers no Pay button", (await provider(/^Pay CHF/).count()) === 0);
await t.go(`/account/bookings/${proc}`);
check("processing: C16 payment action disabled", await page.getByRole("button", { name: /Finish payment/ }).isDisabled());
check("C16 label: payment processing", await has(/Payment processing/));
await t.control("Provider confirms this tour payment now");
b = await t.booking(proc);
check("provider confirms within the hold: confirmed once", b.status === "confirmed" && b.payments.filter((p) => p.status === "succeeded").length === 1 && b.payments.length === 1);
await t.control("Provider sends its last result again", { close: true });
b = await t.booking(proc);
check("repeated result sends no second email", (await t.mails(proc)) === "guest:N07,guest:N09", await t.mails(proc));
check("repeated result on a confirmed booking counts nothing twice", b.payments.length === 1 && t.paid(b) === 8900 && b.status === "confirmed", `${b.payments.length} payment(s), paid ${t.paid(b)}`);

// Reload during a hold keeps the original deadline; a failed attempt cannot retry after it.
const late = await book("Tue 20 Oct", { adults: 1, children: 0, infants: 0 });
b = await t.booking(late);
const deadline = b.holdUntil;
await page.reload(); await wait(1200);
check("reload keeps the original hold deadline", (await t.booking(late)).holdUntil === deadline);
const timer = (await t.text()).match(/Places reserved for (\d+):(\d\d)/);
check("reload does not restart the timer at 15:00", !!timer && Number(timer[1]) * 60 + Number(timer[2]) < 15 * 60, timer?.[0]);
await provider(/^Fail/).click();
await wait(500);
await t.control("Skip ahead 16 minutes");
await wait(1500);
b = await t.booking(late);
check("after the deadline the hold has expired", b.status === "expired", b.status);
check("C12 offers no retry or Pay after the deadline", (await provider("Try again").count()) === 0 && (await provider(/^Pay CHF/).count()) === 0);
check("C12 says the reservation ended and the session is closed", (await has(/This reservation ended at/)) && (await has(/Your reservation has expired/)));
await t.both("c12-expired-after-fail", false);
await t.keyboard("C12 'Check availability again'", /^Check availability again$/);

await t.finish();
