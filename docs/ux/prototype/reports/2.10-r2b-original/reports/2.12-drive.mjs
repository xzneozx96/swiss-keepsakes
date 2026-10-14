// 2.12: M07 merchant booking detail + M08 record external payment. Run: node 2.12-drive.mjs
import * as d from "./2.10-lib.mjs";

const STEP = "2.12";

async function openSheet(page) {
  await page.getByRole("button", { name: /^(Record payment|Zahlung erfassen)$/ }).click();
  await d.wait(page, 700);
  return page.getByRole("dialog").last();
}
async function setAmount(page, value) {
  const input = page.getByRole("dialog").last().getByRole("textbox").first();
  await input.click();
  await input.press("ControlOrMeta+a");
  await input.fill(String(value));
  await input.press("Tab");
  await d.wait(page, 400);
}
const saveButton = (page) => page.getByRole("dialog").last().getByRole("button", { name: /^(Record|.* erfassen)/ }).last();
const saveText = async (page) => d.flat(await saveButton(page).innerText());

for (const width of [375, 1024]) {
  console.log(`\n=== width ${width}`);
  const { browser, page } = await d.open(width);
  await d.reset(page, "owner");

  // Guest, departure, participants, source, snapshots, payments, commission, history.
  await d.go(page, "/store/bookings/tour-tom", 1500);
  const tom = await d.text(page);
  console.log("M07 SK-T1043:", tom.slice(0, 500));
  d.check("M07: next step (money) comes first on the page", tom.indexOf("CHF 156.10 still owed") > 0 && tom.indexOf("CHF 156.10 still owed") < tom.indexOf("Guest contact"));
  d.check("M07: guest contact with phone", /Guest contact \| Tom Becker \| \+49 151 555 0143/.test(tom));
  d.check("M07: departure, end and meeting point", /Tour ends \| 16 Oct 2026, 12:00/.test(tom) && tom.includes("Chapel Bridge · north entrance"));
  d.check("M07: price snapshot per age group", /Adults · 2 × CHF 89\.00 \| CHF 178\.00/.test(tom) && /Children · 1 × CHF 45\.00 \| CHF 45\.00/.test(tom));
  d.check("M07: payment policy snapshot", /Deposit CHF 66\.90 at booking, balance by 15 Oct 2026, 18:00/.test(tom));
  d.check("M07: overdue policy (none snapshotted: merchant decides)", tom.includes("If the balance is late | You decide; nothing happens automatically"));
  d.check("M07: cancellation policy snapshot", tom.includes("Cancellation policy | Sample policy"));
  d.check("M07: referral source (direct) and commission eligibility", /Source \| Direct, no partner/.test(tom) && tom.includes("No commission"));
  d.check("M07: reminder timing labelled as a proposal", tom.includes("(proposal, not yet approved)"));
  d.check("M07: no adjust or refund action (Phase 3)", (await page.getByRole("button", { name: /Refund|Adjust/ }).count()) === 0);
  await d.both(page, STEP, `m07-tom-${width}`);

  await d.go(page, "/store/bookings/tour-anna", 1500);
  d.check("M07: participant information (child's name) shown with a label", (await d.text(page)).includes("Child’s name | Alex"));
  await d.go(page, "/store/bookings/tour-lars", 1500);
  const lars = await d.text(page);
  d.check("M07: partner source and estimated commission", /Source \| Hotel am See/.test(lars) && /Estimated, not recorded/.test(lars), lars.match(/Commission \| [^|]*/)?.[0]);

  // M08: amount up to the balance, method, received time, duplicate check; N07 receipt.
  await d.go(page, "/store/bookings/tour-tom", 1500);
  await openSheet(page);
  const sheet = await d.text(page, '[role="dialog"]');
  d.check("M08: opens with the balance CHF 156.10 and today's time", /Still owed \| Still owed: CHF 156\.10 \| CHF 156\.10/.test(sheet) && /Today, 13\.10\.2026/.test(sheet), sheet.slice(0, 160));
  await setAmount(page, 50);
  d.check("M08: confirm button names amount, method and balance after", (await saveText(page)).includes("Record CHF 50.00 cash. Balance will be CHF 106.10."), await saveText(page));
  await d.shot(page, STEP, `m08-sheet-${width}-en`, false);
  // The language switch sits under the sheet's backdrop: close, switch, reopen.
  await page.getByRole("button", { name: "Go back" }).click();
  await d.setLang(page, "DE");
  await openSheet(page);
  await setAmount(page, 50);
  await d.shot(page, STEP, `m08-sheet-${width}-de`, false);
  await page.getByRole("button", { name: "Zurück" }).click();
  await d.setLang(page, "EN");
  await openSheet(page);
  await setAmount(page, 50);
  await saveButton(page).click();
  await d.wait(page, 800);
  let booking = await d.booking(page, "tour-tom");
  const recorded = booking.payments.at(-1);
  d.check("M08: payment recorded (cash, CHF 50.00, by owner)", booking.payments.length === 2 && recorded.amount === 5000 && recorded.method === "cash" && recorded.recordedBy === "owner");
  d.check("M08: N07 receipt to the guest with the amount", (await d.mail(page)).some((m) => m.template === "N07" && m.bookingId === "tour-tom" && m.params.amount === 5000 && m.params.balance === 10610));

  await openSheet(page);
  await setAmount(page, 50);
  const dup = await d.text(page, '[role="dialog"]');
  d.check("M08: same amount within 10 minutes warns as a possible duplicate", /Possible duplicate \| CHF 50\.00 was already recorded at/.test(dup), dup.match(/Possible duplicate[^|]*\|[^|]*/)?.[0]);
  d.check("M08: duplicate asks to record again", (await saveText(page)).startsWith("Record CHF 50.00 cash again"), await saveText(page));
  await d.shot(page, STEP, `m08-duplicate-${width}-en`, false);
  await saveButton(page).click();
  await d.wait(page, 800);
  booking = await d.booking(page, "tour-tom");
  d.check("M08: confirmed duplicate recorded once more (3 payments)", booking.payments.length === 3);

  await openSheet(page);
  await setAmount(page, 100);
  const above = await d.text(page, '[role="dialog"]');
  d.check("M08: above the balance is blocked", /Enter at most the outstanding CHF 56\.10/.test(above) && (await saveButton(page).isDisabled()));
  await page.getByRole("button", { name: "Go back" }).click();
  await d.wait(page, 500);

  // Manager records the rest; the booking is then paid in full and the button goes away.
  await d.setRole(page, "manager");
  await openSheet(page);
  await saveButton(page).click();
  await d.wait(page, 900);
  booking = await d.booking(page, "tour-tom");
  d.check("Manager can record a payment; balance now 0", booking.payments.at(-1).recordedBy === "manager" && booking.payments.reduce((s, p) => s + p.amount, 0) === booking.total);
  const paid = await d.text(page);
  d.check("M07: paid in full, no record-payment button", paid.includes("Paid in full") && (await page.getByRole("button", { name: "Record payment" }).count()) === 0);
  d.check("M07: payment history lists method and staff", /CHF 56\.10 \| Cash/.test(paid) && paid.includes("Payment recorded · Manager"));
  await d.both(page, STEP, `m07-tom-paid-${width}`);

  // Only Owner and Manager record payments.
  await d.setRole(page, "partner");
  await d.go(page, "/store/bookings/tour-anna", 1500);
  const partner = await d.text(page);
  d.check("non-staff: Record payment disabled with the reason", (await page.getByRole("button", { name: "Record payment" }).isDisabled()) && partner.includes("Only an owner or manager can update bookings."));
  await browser.close();
}
d.summary();
