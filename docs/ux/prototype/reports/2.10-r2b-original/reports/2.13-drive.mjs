// 2.13: delivery, completion, commission once, P02, C18 review gating. Run: node 2.13-drive.mjs
import * as d from "./2.10-lib.mjs";

const STEP = "2.13";
let browser, page, W;

async function p02(label) {
  await d.setRole(page, "partner");
  await d.go(page, "/partner", 2000);
  const body = await d.text(page);
  const earned = body.match(/Commission after adjustments \| (CHF [\d’.,]+)/)?.[1];
  const row = body.match(/SK-T2004[^]*?(Recorded|Estimated, not recorded|No commission)/)?.[1];
  console.log(`P02 ${label}: earned ${earned}; SK-T2004 → ${row}`);
  return { body, earned, row };
}
const chf = (s) => Number((s ?? "0").replace(/[^\d.]/g, ""));
const reviewButton = () => page.getByRole("button", { name: /Write a review/ });

for (W of [375, 1024]) {
  console.log(`\n=== width ${W}`);
  ({ browser, page } = await d.open(W));
  await d.reset(page, "owner");

  // Guest side before completion: no review for a delivered, paid booking.
  await d.setRole(page, "guest");
  await d.signInGuest(page, "/account");
  await d.go(page, "/account/bookings/tc-anna-done", 1500);
  d.check("C16 before completion: no review button (delivered, paid in full)", (await reviewButton().count()) === 0);

  const before = await p02("before");
  d.check("P02 lists the tour booking with estimated commission", before.row === "Estimated, not recorded");
  d.check("P02 has a Tours product group", /\| Tours \|/.test(before.body));
  await d.both(page, STEP, `p02-before-${W}`);

  // Completion: delivered + fully paid → complete once, commission once, N15, review opens.
  await d.setRole(page, "owner");
  await d.go(page, "/store/bookings/tc-anna-done", 1500);
  const m07 = await d.text(page);
  d.check("M07: delivered and fully paid → Complete available", (await page.getByRole("button", { name: "Complete booking" }).isEnabled()) && m07.includes("Paid in full"));
  d.check("M07: commission CHF 32.30 (10% of CHF 323.00), estimated", /CHF 32\.30 \(10% of CHF 323\.00\)/.test(m07) && m07.includes("Estimated, not recorded"));
  await d.both(page, STEP, `m07-ready-to-complete-${W}`);
  await page.getByRole("button", { name: "Complete booking" }).click();
  const dialog = page.getByRole("alertdialog").or(page.getByRole("dialog")).last();
  await dialog.waitFor();
  d.check("Complete asks first and names commission and review", /Commission is recorded once and the guest can review the tour/.test(d.flat(await dialog.innerText())));
  // Two quick presses on confirm: the second must not record anything again.
  const confirm = dialog.getByRole("button", { name: "Complete booking" });
  await confirm.click();
  await confirm.click({ timeout: 800 }).catch(() => console.log("second press: dialog already closed"));
  await d.wait(page, 900);
  let done = await d.booking(page, "tc-anna-done");
  const completedEntries = done.activity.filter((a) => a.event === "completed").length;
  d.check("completed once (one activity entry)", done.status === "completed" && completedEntries === 1, `${completedEntries} entries`);
  d.check("commission recorded with time", typeof done.commissionRecordedAt === "string", done.commissionRecordedAt);
  const recordedAt = done.commissionRecordedAt;
  d.check("N15 review invite sent once", (await d.mail(page)).filter((m) => m.template === "N15" && m.bookingId === "tc-anna-done").length === 1);
  const after = await d.text(page);
  d.check("M07: completed note and recorded commission", /Completed on/.test(after) && /Recorded once on/.test(after));
  await d.both(page, STEP, `m07-completed-${W}`);

  const p = await p02("after");
  d.check("P02 row now recorded", p.row === "Recorded");
  d.check("P02 earned grew by exactly CHF 32.30", Math.abs(chf(p.earned) - chf(before.earned) - 32.3) < 0.001, `${before.earned} → ${p.earned}`);
  await d.both(page, STEP, `p02-after-${W}`);
  await page.reload();
  await d.wait(page, 1500);
  const again = await p02("after reload");
  d.check("reload does not count commission twice", again.earned === p.earned);
  await d.setRole(page, "owner");
  done = await d.booking(page, "tc-anna-done");
  d.check("commission time unchanged after reloads", done.commissionRecordedAt === recordedAt);

  // Guest side: the tour review opens only now.
  await d.setRole(page, "guest");
  await d.go(page, "/account/bookings/tc-anna-done", 1500);
  d.check("C16 after completion: Write a review shown", (await reviewButton().count()) === 1);
  await d.both(page, STEP, `c16-review-open-${W}`);

  // Service delivered with debt (partner booking): locked, commission estimated only.
  await d.setRole(page, "owner");
  await d.patch(page, `s.data.tours.bookings.find((b) => b.id === "tour-marie").partnerId = "hotel-am-see";`);
  await d.go(page, "/store/bookings/tour-marie", 1500);
  let marie = await d.text(page);
  d.check("delivered with debt: shows delivered and CHF 223.00 owed", marie.includes("Tour service delivered") && marie.includes("CHF 223.00 still owed"));
  d.check("delivered with debt: Complete locked with the amount", /Complete is locked: \| CHF 223\.00 still owed/.test(marie));
  d.check("delivered with debt: commission not recorded", marie.includes("Estimated, not recorded"));
  await d.both(page, STEP, `m07-delivered-debt-${W}`);

  // Paying the debt then opens completion.
  await page.getByRole("button", { name: "Record payment" }).click();
  await d.wait(page, 600);
  await page.getByRole("dialog").last().getByRole("button", { name: /^Record CHF/ }).click();
  await d.wait(page, 900);
  d.check("after the balance is paid, Complete opens", await page.getByRole("button", { name: "Complete booking" }).isEnabled());

  // Fully paid without service delivery: completion stays locked.
  await d.go(page, "/store/bookings/tc-yuki-paid", 1500);
  const yuki = await d.text(page);
  d.check("paid in full, not delivered: Complete locked (record service delivered first)", yuki.includes("Paid in full") && /Complete is locked: \| Record service delivered first/.test(yuki));
  await d.both(page, STEP, `m07-paid-not-delivered-${W}`);

  // No-show with retained payment (partner booking): no completion, commission or review.
  await d.patch(page, `s.data.tours.bookings.find((b) => b.id === "tour-anna").partnerId = "hotel-am-see";`);
  await d.go(page, "/store/bookings/tour-anna", 1500);
  await page.getByRole("button", { name: "No-show" }).click();
  await d.confirmDialog(page, true);
  const anna = await d.booking(page, "tour-anna");
  const noShow = await d.text(page);
  d.check("no-show: payment kept (CHF 66.90) and debt kept (CHF 156.10)", anna.payments[0].amount === 6690 && noShow.includes("CHF 156.10 still owed"));
  d.check("no-show: no Complete button", (await page.getByRole("button", { name: "Complete booking" }).count()) === 0);
  d.check("no-show: commission not applicable", noShow.includes("No commission: not completed") && noShow.includes("never earn commission"));
  await d.both(page, STEP, `m07-noshow-${W}`);
  const pn = await p02("after no-show");
  d.check("P02: no-show row has no commission and earned is unchanged", /SK-T1042[^]*?No commission/.test(pn.body) && pn.earned === p.earned);
  await d.setRole(page, "guest");
  await d.go(page, "/account/bookings/tour-anna", 1500);
  d.check("C16 no-show: no review button", (await reviewButton().count()) === 0);

  // Merchant cancels the tour: seeded cancellation, not no-show.
  await d.setRole(page, "owner");
  await d.go(page, "/store/bookings/tc-sofia-cancelled", 1500);
  const sofia = await d.text(page);
  d.check("merchant cancellation: Cancelled, organiser cancelled, not a no-show", sofia.includes("Cancelled") && sofia.includes("Departure cancelled by the organiser") && sofia.includes("this is not a no-show"));
  d.check("merchant cancellation: money kept on record (no refund action)", sofia.includes("CHF 178.00") && (await page.getByRole("button", { name: /Refund/ }).count()) === 0);
  await d.both(page, STEP, `m07-merchant-cancelled-${W}`);

await browser.close();
}
d.summary();
