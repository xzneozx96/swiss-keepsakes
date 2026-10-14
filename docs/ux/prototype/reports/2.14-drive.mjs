// 2.14: overdue policies and N07 N08 N09 N10 N11 N13 N15 N22 in the Mail panel. Run: node 2.14-drive.mjs
import * as d from "./2.10-lib.mjs";

const STEP = "2.14";
let browser, page;
const templates = async () => (await d.mail(page)).map((m) => `${m.template}:${m.to}:${m.bookingId ?? m.orderId}`);
const count = async (template, bookingId, to) =>
  (await d.mail(page)).filter((m) => m.template === template && (!bookingId || m.bookingId === bookingId) && (!to || m.to === to)).length;

for (const W of [1024, 375]) {
  console.log(`\n=== width ${W}`);
  if (browser) await browser.close();
  ({ browser, page } = await d.open(W));
  await d.reset(page, "owner");

  // --- Part A: overdue policies (seeded fixtures) and merchant-side mail.
  await d.go(page, "/store/bookings", 1500);
  await d.go(page, "/store/bookings/tc-daniel-grace", 1500);
  const grace = await d.text(page);
  d.check("grace policy: overdue, grace until 14 Oct 18:00, then merchant decides", /Overdue since 12 Oct 2026, 18:00\. Grace period until 14 Oct 2026, 18:00, then you decide\./.test(grace));
  d.check("grace policy: not cancelled by the check", (await d.booking(page, "tc-daniel-grace")).status === "confirmed");
  d.check("grace policy: payment chip says overdue", grace.includes("Balance overdue"));
  await d.both(page, STEP, `m07-grace-${W}`);

  await d.go(page, "/store/bookings/tour-anna", 1500);
  const merchant = await d.text(page);
  d.check("no policy snapshotted: merchant decides, nothing automatic", /You decide: record a payment or contact the guest/.test(merchant) && (await d.booking(page, "tour-anna")).status === "confirmed");
  await d.both(page, STEP, `m07-merchant-decides-${W}`);

  await d.go(page, "/store/bookings/tc-anna-overdue", 1500);
  const cancelPolicy = await d.text(page);
  d.check("cancel policy shown before the deadline", cancelPolicy.includes("If the balance is late | Cancelled automatically, seats released") && cancelPolicy.includes("Balance due | 13 Oct 2026, 18:00"));
  d.check("no N11 before an actual cancellation", (await count("N11")) === 0);
  await d.both(page, STEP, `m07-cancel-policy-before-${W}`);

  // Reminder job: N10 (proposed 3 days / 1 day timing) and N13 (day before the tour); once each.
  d.check("prototype: reminder job button pressed", await d.protoButton(page, "Run the reminder job (N10, N13)"));
  const afterJob = await templates();
  console.log("after reminder job:", afterJob.join(", "));
  d.check("N10 1-day reminder to SK-T2001 (cancel consequence)", (await d.mail(page)).some((m) => m.template === "N10" && m.bookingId === "tc-anna-overdue" && m.params.stage === "1d" && m.params.overdue === "cancel"));
  d.check("N10 3-day reminder to SK-T1043", (await d.mail(page)).some((m) => m.template === "N10" && m.bookingId === "tour-tom" && m.params.stage === "3d"));
  d.check("N13 to both walk-14 guests (tour tomorrow)", (await count("N13", "tc-anna-overdue")) === 1 && (await count("N13", "tc-yuki-paid")) === 1);
  d.check("no reminder for paid-in-full or overdue bookings", !(await d.mail(page)).some((m) => m.template === "N10" && ["tc-yuki-paid", "tc-daniel-grace", "tour-anna"].includes(m.bookingId)));
  await d.protoButton(page, "Run the reminder job (N10, N13)");
  d.check("running the job again sends nothing new", (await templates()).length === afterJob.length, `${afterJob.length} emails`);

  // The cancel-policy deadline passes: cancel, release seats once, N11 to guest and staff.
  await d.go(page, "/store/bookings", 1500);
  const walk14 = async () => d.flat(await (W === 375 ? page.locator("li") : page.getByRole("row")).filter({ hasText: "14 Oct 2026, 10:00" }).first().innerText());
  const beforeSeats = await walk14();
  d.check("walk-14 before: 5 of 12 booked, 7 free", /5 of 12( booked)? \| (Active holds \| 0 \| Free seats \| 7|Holds 0 · free 7)/.test(beforeSeats), beforeSeats);
  await d.go(page, "/store/bookings/tc-anna-overdue", 1500);
  await d.setLang(page, "DE"); // staff email goes out in the staff UI language
  d.check("prototype: clock skips past this booking's balance deadline", await d.protoButton(page, "Skip past this booking’s balance deadline"));
  await d.setLang(page, "EN");
  const cancelled = await d.booking(page, "tc-anna-overdue");
  d.check("snapshot kept: balance deadline still 13 Oct 18:00", cancelled.balanceDueAt === "2026-10-13T18:00:00+02:00", cancelled.balanceDueAt);
  d.check("demo clock moved one minute past the deadline", cancelled.activity.at(-1).at === new Date(Date.parse("2026-10-13T18:01:00+02:00")).toISOString() || Math.abs(Date.parse(cancelled.activity.at(-1).at) - Date.parse("2026-10-13T18:01:00+02:00")) < 120000, cancelled.activity.at(-1).at);
  d.check("N11 names the real deadline (18:00)", (await d.mail(page)).some((m) => m.template === "N11" && m.to === "guest" && m.params.dueAt === "2026-10-13T18:00:00+02:00"));
  d.check("cancel policy: booking cancelled by the system", cancelled.status === "cancelled" && cancelled.activity.at(-1).event === "cancelled-overdue" && cancelled.activity.at(-1).actor === "system");
  d.check("no saved card charged: payments unchanged (one CHF 66.90)", cancelled.payments.length === 1 && cancelled.payments[0].amount === 6690);
  d.check("N11 to the guest and to staff, once each", (await count("N11", "tc-anna-overdue", "guest")) === 1 && (await count("N11", "tc-anna-overdue", "staff")) === 1);
  const staffN11 = (await d.mail(page)).find((m) => m.template === "N11" && m.to === "staff");
  d.check("staff N11 in the staff UI language (DE)", staffN11?.language === "de");
  d.check("M07 snapshot still reads balance by 13 Oct 18:00", (await d.text(page)).includes("balance by 13 Oct 2026, 18:00"));
  d.check("M07 closed booking: received, nothing more owed", (await d.text(page)).includes("CHF 66.90 received") && (await d.text(page)).includes("Nothing more is owed"));
  await d.both(page, STEP, `m07-cancelled-overdue-${W}`);
  await d.go(page, "/store/bookings", 1500);
  const afterSeats = await walk14();
  d.check("walk-14 after: seats released (2 of 12 booked, 10 free)", /2 of 12( booked)? \| (Active holds \| 0 \| Free seats \| 10|Holds 0 · free 10)/.test(afterSeats), afterSeats);
  await d.go(page, "/store", 1500);
  await d.go(page, "/store/bookings/tc-anna-overdue", 1500);
  d.check("re-running the check (reloads) sends no second N11", (await count("N11")) === 2);
  await d.go(page, "/store/bookings/tc-daniel-grace", 1500);
  d.check("grace booking still not cancelled after the check ran", (await d.booking(page, "tc-daniel-grace")).status === "confirmed");

  // N07 for an external payment and N15 on completion (merchant actions).
  await d.go(page, "/store/bookings/tour-tom", 1500);
  await page.getByRole("button", { name: "Record payment" }).click();
  await d.wait(page, 600);
  await page.getByRole("dialog").last().getByRole("button", { name: /^Record CHF/ }).click();
  await d.wait(page, 900);
  d.check("N07 receipt after an external payment", (await count("N07", "tour-tom")) === 1);
  await d.go(page, "/store/bookings/tc-anna-done", 1500);
  await page.getByRole("button", { name: "Complete booking" }).click();
  await d.confirmDialog(page, true);
  d.check("N15 review invite after completion", (await count("N15", "tc-anna-done")) === 1);

}
// --- Part B: guest flow (worker B's screens) sends N09, N08, N07 and N22 through the same helpers.
async function bookTour(slug, dateText) {
  await d.go(page, `/tours/${slug}/book`, 1500);
  await page.locator("label").filter({ hasText: dateText }).first().click();
  await d.wait(page, 300);
  await page.getByRole("button", { name: /Review booking/ }).first().click();
  await d.wait(page, 1200);
  const name = page.getByRole("textbox", { name: /Contact name/ });
  if (await name.count()) await name.fill("Anna Keller");
  const phone = page.getByRole("textbox", { name: /Mobile number/ });
  if (await phone.count()) await phone.fill("+41 79 123 45 67");
  for (const box of await page.getByRole("textbox").all()) {
    if (!(await box.inputValue())) await box.fill("Sample answer");
  }
  await page.getByRole("button", { name: /Continue to payment|Confirm booking/ }).first().click();
  await d.wait(page, 1500);
}
try {
  await d.setRole(page, "guest");
  await d.signInGuest(page, "/account");
  const mailBefore = (await d.mail(page)).length;
  await bookTour("lake-lucerne-stories", "17 Oct");
  d.check("guest flow: pay-later booking sends N09", (await d.mail(page)).slice(mailBefore).some((m) => m.template === "N09" && m.to === "guest"), page.url());
  await bookTour("lucerne-old-town-walk", "16 Oct");
  await page.getByRole("button", { name: /^Fail/ }).first().click();
  await d.wait(page, 1200);
  d.check("guest flow: failed payment sends N08", (await d.mail(page)).slice(mailBefore).some((m) => m.template === "N08"), page.url());
  const retry = page.getByRole("button", { name: /Try again/ });
  if (await retry.count()) { await retry.first().click(); await d.wait(page, 1000); }
  await page.getByRole("button", { name: /^Pay CHF/ }).first().click();
  await d.wait(page, 1500);
  d.check("guest flow: successful payment sends N07 (and N09)", (await d.mail(page)).slice(mailBefore).some((m) => m.template === "N07" && m.to === "guest"), page.url());
  await bookTour("lucerne-old-town-walk", "20 Oct");
  await page.getByRole("button", { name: /^Processing/ }).first().click();
  await d.wait(page, 1000);
  await d.protoButton(page, "Skip ahead 16 minutes");
  await d.protoButton(page, "Provider confirms this tour payment now");
  d.check("guest flow: late provider result sends N22 to guest and staff", (await d.mail(page)).slice(mailBefore).filter((m) => m.template === "N22").length === 2, page.url());
} catch (error) {
  d.check("guest flow (worker B's screens) completed", false, error.message.split("\n")[0]);
}

// Every template renders as an email, in the recipient's language, in the Mail panel.
const all = await d.mail(page);
console.log("all mail:", all.map((m) => `${m.template}/${m.to}/${m.language}`).join(", "));
for (const t of ["N07", "N08", "N09", "N10", "N11", "N13", "N15", "N22"])
  d.check(`${t} present in the mail log`, all.some((m) => m.template === t && m.bookingId));
await page.getByRole("button", { name: /^Mail, / }).click();
await d.wait(page, 800);
const guestTab = await d.text(page, '[role="dialog"]');
d.check("Mail panel renders tour emails (no raw template subject)", guestTab.includes("Booking SK-T2001 cancelled: balance not paid") && !/\| N11 \| ref:/.test(guestTab));
await d.shot(page, STEP, "mail-guest-375-en", false);
await page.getByRole("tab", { name: /Staff/ }).click();
await d.wait(page, 500);
const staffTab = await d.text(page, '[role="dialog"]');
d.check("staff N11 rendered in German", staffTab.includes("SK-T2001 automatisch storniert: Restbetrag überfällig"));
await d.shot(page, STEP, "mail-staff-375-en", false);
await browser.close();
d.summary();
