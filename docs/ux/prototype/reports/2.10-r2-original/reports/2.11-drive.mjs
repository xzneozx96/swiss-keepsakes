// 2.11: M06 departure guest list, service delivered / no-show. Run: node 2.11-drive.mjs
import * as d from "./2.10-lib.mjs";

const STEP = "2.11";
const annaCard = (page) => page.locator("li").filter({ hasText: "SK-T1042" }).first();

for (const width of [375, 1024]) {
  console.log(`\n=== width ${width}`);
  const { browser, page } = await d.open(width);
  await d.reset(page, "owner");
  const scope = () => (width === 375 ? annaCard(page) : page.getByRole("row").filter({ hasText: "SK-T1042" }).first());

  // Ended departure: every booking with group, contact and payment label; results open.
  await d.go(page, "/store/bookings/departures/walk-13", 1500);
  const m06 = await d.text(page);
  console.log("M06 walk-13:", m06.slice(0, 600));
  d.check("M06: group counts, label first", m06.includes("Adults 2 · Children 1 · Infants 0"));
  d.check("M06: phone is a tel: link", (await page.locator('a[href^="tel:"]').count()) >= 3);
  d.check("M06: booking and payment labels are separate chips", /Confirmed \| Balance overdue/.test(m06) && /No-show \| Paid in full/.test(m06));
  d.check("M06: ended tour asks for results, nothing completed automatically", m06.includes("Nothing is completed automatically"));
  const delivered = scope().getByRole("button", { name: "Service delivered" });
  d.check("M06: Owner can record results after the tour ended", await delivered.isEnabled());
  await d.both(page, STEP, `m06-ended-${width}`);

  // Confirmation first: cancelling the dialog changes nothing.
  await delivered.click();
  const labels = await d.confirmDialog(page, false);
  console.log("dialog buttons:", labels.join(" / "));
  d.check("Service delivered asks first; Cancel keeps the booking confirmed", (await d.booking(page, "tour-anna")).status === "confirmed");
  if (width === 375) {
    // Keyboard: Enter on the focused button opens the dialog; Escape closes it.
    await scope().getByRole("button", { name: "Service delivered" }).focus();
    await page.keyboard.press("Enter");
    await d.wait(page, 500);
    d.check("keyboard: Enter opens the confirmation", await page.getByRole("alertdialog").or(page.getByRole("dialog")).first().isVisible());
    await d.shot(page, STEP, "m06-confirm-delivered-375-en", false);
    await page.keyboard.press("Escape");
    await d.wait(page, 500);
    const focused = await page.evaluate(() => document.activeElement?.textContent ?? "");
    d.check("keyboard: Escape closes and focus returns to the button", focused.includes("Service delivered"), focused);
  }
  await scope().getByRole("button", { name: "Service delivered" }).click();
  await d.confirmDialog(page, true);
  let anna = await d.booking(page, "tour-anna");
  d.check("Service delivered recorded with confirmation", anna.status === "delivered", anna.status);
  d.check("money untouched by the result (1 payment, CHF 66.90)", anna.payments.length === 1 && anna.payments[0].amount === 6690);
  d.check("activity names the actor (owner)", anna.activity.at(-1).event === "delivered" && anna.activity.at(-1).actor === "owner");
  const after = d.flat(await scope().innerText());
  d.check("Complete stays locked while CHF 156.10 is owed", /Complete is locked: \| CHF 156\.10 still owed/.test(after), after.slice(-90));
  const walk13 = (await d.state(page)).data.tours.departures.find((x) => x.id === "walk-13");
  d.check("departure itself is not marked completed (no status field added)", !("status" in walk13) && !("completedAt" in walk13), JSON.stringify(walk13));
  await d.both(page, STEP, `m06-after-delivered-${width}`);

  // No-show on a fresh seed: money and debt stay, nothing opens.
  await d.reset(page, "manager");
  await d.go(page, "/store/bookings/departures/walk-13", 1500);
  await scope().getByRole("button", { name: "No-show" }).click();
  const noShowText = d.flat(await page.getByRole("alertdialog").or(page.getByRole("dialog")).last().innerText());
  d.check("No-show dialog states money stays and no completion/commission/review", /no refund, no debt waived\. No completion, commission or review/.test(noShowText), noShowText);
  await d.confirmDialog(page, true);
  anna = await d.booking(page, "tour-anna");
  d.check("Manager can record no-show", anna.status === "no_show" && anna.activity.at(-1).actor === "manager");
  d.check("no-show keeps the payment and the debt", anna.payments.length === 1 && anna.total - anna.payments[0].amount === 15610);
  d.check("no-show records no commission", anna.commissionRecordedAt === null);
  d.check("no-show sends no review invite (no N15)", !(await d.mail(page)).some((m) => m.template === "N15"));
  await d.shot(page, STEP, `m06-after-noshow-${width}-en`);

  // Before the tour ends: results are not available yet.
  await d.go(page, "/store/bookings/departures/walk-14", 1500);
  const early = await d.text(page);
  const button = page.getByRole("button", { name: "Service delivered" }).first();
  d.check("before the end: delivered/no-show disabled", await button.isDisabled());
  d.check("before the end: says when results open", /Results can be recorded after the tour ends at 12:00/.test(early));
  await d.both(page, STEP, `m06-upcoming-${width}`);

  // Merchant-cancelled departure: cancelled, not no-show; no result actions.
  await d.go(page, "/store/bookings/departures/walk-19", 1500);
  const cancelled = await d.text(page);
  d.check("cancelled departure: notice and cancelled booking, not no-show", /You cancelled this departure on 12 Oct 2026, 16:00/.test(cancelled) && cancelled.includes("Cancelled") && !cancelled.includes("No-show |"));
  d.check("cancelled departure: no result buttons", (await page.getByRole("button", { name: "No-show" }).count()) === 0);
  await d.both(page, STEP, `m06-cancelled-${width}`);

  // Only Owner and Manager record results.
  await d.setRole(page, "partner");
  await d.go(page, "/store/bookings/departures/walk-13", 1500);
  const partner = await d.text(page).catch(() => "");
  const staffButton = page.getByRole("button", { name: "Service delivered" }).first();
  const blocked = (await staffButton.count()) === 0 || (await staffButton.isDisabled());
  d.check("non-staff role cannot record results", blocked, partner.includes("Only an owner or manager") ? "staff-only notice shown" : "no M06 actions");
  await browser.close();
}
d.summary();
