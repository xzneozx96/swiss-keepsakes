// 2.15 merchant flow, joined up: M02 → M05 → M06 → M07/M08 → completion → P02 → guest C18 review,
// plus the merchant-side booking cases and the coordinator's avatar and chip changes.
// node 2.15-merchant.mjs en|de (375px; M05, M06 and M07 also at 1024px).
import { DICT, start } from "./2.15-lib.mjs";

const L = process.argv[2] === "de" ? "de" : "en";
const t = await start(L);
const { page, T, check, wait, has, go, text, shot, booking, paid, mails, seatsTaken, control, viewAs, keyboard } = t;
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
// A message with {params} as a pattern, e.g. "Record {amount} cash…" → /Record .+ cash…/.
const pattern = (key) => new RegExp(esc(T(key)).replace(/\\\{\w+\\\}/g, ".+"));
const byEn = (prefix, en) => { const k = Object.keys(DICT.en).find((x) => x.startsWith(prefix) && DICT.en[x] === en); return T(k); };
const ROLE = { owner: "Merchant · Owner", partner: "Partner", guest: "Guest" };
const m07 = async (id) => { await go(`/store/bookings/${id}`); await wait(400); };
const row = (ref) => page.locator("li").filter({ hasText: ref }).last();
const confirmIn = async (label) => { await page.getByRole("alertdialog").getByRole("button", { name: label, exact: true }).click(); await wait(900); };
const p02 = async () => {
  await viewAs(ROLE.partner);
  await go("/partner"); await wait(1200);
  // Step 5.6: the report link asks for the emailed code once per browser (P01, R10); any 6 digits.
  const send = page.getByRole("button", { name: T("partnerAccess.start.send"), exact: true });
  if (await send.isVisible().catch(() => false)) {
    await send.click(); await wait(800);
    await page.locator("#sign-in-code").fill("123456"); await wait(1500);
  }
  const body = await text("main");
  const earned = body.match(new RegExp(esc(T("partnerReport.number.earned")) + "\\s*(CHF [\\d’.,]+)"))?.[1];
  // Step 5.7 (D16): with a refund in the period the headline is after refunds and never below 0;
  // the hint keeps the recorded amount ("CHF 24.60 recorded − CHF 35.70 refund"), so read that.
  const recorded = body.match(pattern("partnerReport.number.earned.hintRefund"))
    ? body.match(new RegExp(esc(T("partnerReport.number.earned.hintRefund")).replace(esc("{recorded}"), "(CHF [\\d’.,]+)").replace(esc("{refund}"), "CHF [\\d’.,]+")))?.[1]
    : undefined;
  // Step 5.7: an earlier overpayment is offset against the new commission ("Offset against
  // SK-T2004"); that line is not a second transaction, so leave it out of the count.
  const offsets = (body.match(new RegExp(esc(T("partnerReport.payments.offset", { ref: "SK-T2004" })), "g")) ?? []).length;
  return { body, earned: recorded ?? earned, count: (body.match(/SK-T2004/g) ?? []).length - offsets };
};
// M08 amount: a NumberField commits on blur.
const amount = async (v) => {
  const input = page.getByRole("dialog").last().getByRole("textbox").first();
  await input.click(); await input.press("ControlOrMeta+a"); await input.fill(String(v)); await input.press("Tab"); await wait(400);
};
const chf = (s) => Number((s ?? "0").replace(/[^\d.]/g, ""));

await t.reset();

// ---- M02 Today → M05 → M06 ----
await viewAs(ROLE.owner);
check("Owner lands on M02", page.url().endsWith("#/store"), page.url());
const today = page.locator('section[aria-labelledby="today-tours"]');
check("M02 shows the tour work card", (await today.count()) === 1 && (await today.innerText()).length > 0);
await shot("m01-m02-today");
await go("/store/bookings");
check("M05 lists upcoming and ended departures", (await has(T("tourMerchant.upcoming"))) && (await has(T("tourMerchant.ended"))));
await shot("m02-m05");
await shot("m02-m05-desktop", { width: 1024 });
await page.locator('a[href$="/store/bookings/departures/walk-13"]').first().click();
await wait(900);
check("M05 → M06 guest list for the ended 13 Oct walk", page.url().endsWith("/store/bookings/departures/walk-13") && (await has(T("tourMerchant.manifest"))));
await shot("m03-m06-walk13");
await shot("m03-m06-walk13-desktop", { width: 1024 });

// ---- Case: merchant decides on an overdue balance (no policy), then No-show with retained payment ----
await m07("tour-anna");
check("overdue without a policy: merchant decides, nothing automatic", await has(pattern("tourMerchant.overdueMerchant")));
await go("/store/bookings/departures/walk-13");
await row("SK-T1042").getByRole("button", { name: T("tourMerchant.noShow"), exact: true }).click();
await wait(500);
check("no-show asks first and says money stays as it is", (await page.getByRole("alertdialog").count()) === 1 && (await text("[role=alertdialog]")).includes(T("tourMerchant.noShowBody", { ref: "SK-T1042" }).slice(0, 30)));
await confirmIn(T("tourMerchant.noShow"));
let b = await booking("tour-anna");
check("no-show recorded; CHF 66.90 kept and CHF 156.10 still owed; nothing refunded or waived", b.status === "no_show" && paid(b) === 6690 && b.total - paid(b) === 15610);
await m07("tour-anna");
check("no-show M07: no completion, no commission", (await page.getByRole("button", { name: T("tourMerchant.complete") }).count()) === 0 && !b.commissionRecordedAt);
await shot("m04-m07-no-show");

// ---- Case: Service delivered with debt → M08 payment → completion ----
await m07("tour-marie");
check("delivered with debt: Complete locked with the owed balance", (await has(T("tourMerchant.lock.owed", { balance: "CHF 223.00" }))) || (await has("223.00")));
check("delivered with debt: Complete not available", (await page.getByRole("button", { name: T("tourMerchant.complete") }).count()) === 0 || (await page.getByRole("button", { name: T("tourMerchant.complete") }).isDisabled()));
await shot("m05-m07-delivered-debt");
await shot("m05-m07-delivered-debt-desktop", { width: 1024 });
await page.getByRole("button", { name: T("fulfilment.action.record") }).first().click();
await wait(700);
await amount(50);
await page.getByRole("dialog").getByRole("button", { name: pattern("recordPayment.confirm.cash") }).click();
await wait(900);
b = await booking("tour-marie");
check("M08 records CHF 50 cash on the booking", paid(b) === 5000);
await page.getByRole("button", { name: T("fulfilment.action.record") }).first().click();
await wait(700);
await amount(50);
check("M08 warns about a possible duplicate and asks to record again", (await has(T("recordPayment.duplicate.title"))) && (await page.getByRole("dialog").last().getByRole("button", { name: pattern("recordPayment.confirmAgain.cash") }).count()) === 1);
await shot("m06-m08-duplicate", { full: false });
await amount(173);
await page.getByRole("dialog").getByRole("button", { name: pattern("recordPayment.confirm.cash") }).click();
await wait(900);
b = await booking("tour-marie");
check("balance paid through M08: CHF 223.00 received", paid(b) === 22300);
await page.getByRole("button", { name: T("tourMerchant.complete") }).click();
await wait(500);
await confirmIn(T("tourMerchant.complete"));
b = await booking("tour-marie");
check("delivered + paid: completed once", b.status === "completed" && b.activity.filter((a) => a.event === "completed").length === 1);

// ---- Case: Fully paid without service delivery ----
await m07("tc-yuki-paid");
check("paid in full, not delivered: Complete locked (record delivery first), no commission", (await has(T("tourMerchant.lock.notDelivered"))) && !(await booking("tc-yuki-paid")).commissionRecordedAt);
await shot("m07-m07-paid-not-delivered");

// ---- Case: Service delivered and fully paid → complete once, commission once (P02), review ----
const before = await p02();
check("P02 before: SK-T2004 listed once, estimated", before.count === 1 && before.body.includes(byEn("order.commission", "Estimated, not recorded")));
await viewAs(ROLE.owner);
await m07("tc-anna-done");
check("M07: delivered and paid, commission estimated", (await page.getByRole("button", { name: T("tourMerchant.complete") }).isEnabled()) && (await has(T("tourMerchant.commission.estimated"))));
await shot("m08-m07-ready-to-complete");
await page.getByRole("button", { name: T("tourMerchant.complete") }).click();
await wait(500);
await confirmIn(T("tourMerchant.complete"));
b = await booking("tc-anna-done");
const recordedAt = b.commissionRecordedAt;
check("completed, commission recorded", b.status === "completed" && !!recordedAt && (await has(T("tourMerchant.commission.recorded"))));
await page.reload(); await wait(900);
b = await booking("tc-anna-done");
check("reload: still one completion, commission time unchanged", b.activity.filter((a) => a.event === "completed").length === 1 && b.commissionRecordedAt === recordedAt);
await shot("m09-m07-completed");
await shot("m09-m07-completed-desktop", { width: 1024 });
const after = await p02();
check("P02: SK-T2004 recorded once, earned grows by exactly CHF 32.30", after.count === 1 && after.body.includes(byEn("order.commission", "Recorded")) && Math.abs(chf(after.earned) - chf(before.earned) - 32.3) < 0.001, `${before.earned} → ${after.earned}`);
await shot("m10-p02");

// ---- Case: Merchant cancels the tour (seeded walk-19) ----
await viewAs(ROLE.owner);
await go("/store/bookings/departures/walk-19");
check("cancelled departure: shown as cancelled, guests not classified as no-show", (await has(pattern("tourMerchant.cancelledDeparture"))) && (await page.getByRole("button", { name: T("tourMerchant.noShow"), exact: true }).count()) === 0);
await shot("m11-m06-cancelled-departure");
await m07("tc-sofia-cancelled");
check("cancelled booking: neutral 'Paid · nothing more owed' chip (coordinator change 2)", (await has(T("tours.status.cancelled"))) && (await has(T("tours.payment.closed"))));

// ---- Case: Overdue balance, grace and cancel policies ----
await m07("tc-daniel-grace");
check("grace policy: overdue shown with the grace period, not cancelled", (await has(pattern("tourMerchant.overdueGrace"))) && (await booking("tc-daniel-grace")).status === "confirmed");
await shot("m12-m07-overdue-grace");
const seats14 = await seatsTaken("walk-14");
await m07("tc-anna-overdue");
check("cancel policy: 'Skip past this booking’s balance deadline' (prototype control)", await control(/^Skip past this booking/));
await wait(800);
b = await booking("tc-anna-overdue");
check("cancel policy: cancelled after the deadline, seats released once", b.status === "cancelled" && (await seatsTaken("walk-14")) === seats14 - 3, `${seats14} → ${await seatsTaken("walk-14")}`);
check("SK-T2001 on M07: 'Paid · nothing more owed' (coordinator change 2)", await has(T("tours.payment.closed")));
check("N11 sent once after the actual cancellation", (await mails("tc-anna-overdue")).split(",").filter((m) => m === "guest:N11").length === 1, await mails("tc-anna-overdue"));
await shot("m13-m07-overdue-cancelled");

// ---- Coordinator change 1: merchant gift order guest card avatar ----
await go("/store/orders");
await page.locator('a[href*="/store/orders/"]').first().click();
await wait(900);
const m04av = await t.avatars();
check("(1) M04 gift order guest card shows a loaded sample avatar image", m04av.count > 0 && m04av.loaded === m04av.count && m04av.initials === 0, JSON.stringify(m04av));
await shot("m14-m04-guest-card");

// ---- Guest side: C16 no-show, cancelled SK-T2001, completed SK-T2004 → C18 review ----
await viewAs(ROLE.guest);
await t.signIn("/account?tab=bookings");
await go("/account?tab=bookings");
await shot("g19-c14-bookings");
await go("/account/bookings/tour-anna");
check("guest C16 no-show: money shown, no pay, no review", (await has(T("tourBooking.noShow").slice(0, 25))) && (await page.getByRole("button", { name: T("review.write") }).count()) === 0);
await go("/account/bookings/tc-anna-overdue");
check("guest C16 SK-T2001: cancelled with 'Paid · nothing more owed' (coordinator change 2)", (await has(T("tours.status.cancelled"))) && (await has(T("tours.payment.closed"))));
await shot("g20-c16-overdue-cancelled");
await go("/account/bookings/tc-anna-done");
check("C16 completed: review offered", (await page.getByRole("button", { name: T("review.write") }).count()) === 1);
await keyboard("C16 Write a review", new RegExp(esc(T("review.write")) + "$"));
await page.getByRole("button", { name: T("review.write") }).click();
await wait(800);
const sheet = await text("[role=dialog]");
const twoAndOne = `${T("tourBooking.count.adults.other", { count: 2 })} · ${T("tourBooking.count.children.one", { count: 1 })}`;
check("(3) C18 review card group text is plural-aware", sheet.includes(twoAndOne) && !/1 (children|Kinder)\b/.test(sheet), twoAndOne);
await shot("g21-c18-review", { full: false });
await page.getByRole("dialog").getByRole("radio", { name: T("review.rating.option", { rating: 5 }) }).check({ force: true });
await page.getByRole("dialog").getByRole("textbox").fill("Lovely morning on the lake, our guide knew every story.");
await page.getByRole("dialog").getByRole("button", { name: T("review.submit") }).click();
await wait(1000);
check("review posted from the completed booking", (await page.getByRole("button", { name: T("review.write") }).count()) === 0 && (await has(T("review.yours", { name: "" }).trim().slice(0, 10))));
await go("/tours/lake-lucerne-stories");
await page.getByText("Lovely morning on the lake").first().scrollIntoViewIfNeeded().catch(() => {});
const mine = page.locator("li, article, div").filter({ hasText: "Lovely morning on the lake" }).last();
const c09av = await t.avatars();
check("(1)+(3) the tour review shows on C09; every avatar is a loaded sample image", (await mine.count()) > 0 && c09av.count > 0 && c09av.loaded === c09av.count && c09av.initials === 0, JSON.stringify(c09av));
check("(3) C09 review list after posting: no '1 children' / '1 Kinder'", !(await has(/\b1 (children|Kinder)\b/)));

// ---- Coordinator change 1: account hub and edit profile after removing the photo ----
await go("/account");
const hubav = await t.avatars("main header");
check("(1) account hub: loaded sample avatar image, never initials", hubav.count === 1 && hubav.loaded === 1 && hubav.initials === 0, JSON.stringify(hubav));
await go("/account?tab=edit");
await page.getByRole("button", { name: T("account.edit.photo.remove") }).first().click();
await wait(800);
check("(1) remove asks first with the new copy", (await page.getByRole("alertdialog").count()) >= 1 && (await has(T("account.edit.remove.body"))));
await confirmIn(T("account.edit.remove.confirm"));
const editav = await t.avatars();
check("(1) after removing the photo a loaded sample avatar image shows, no initials", editav.count > 0 && editav.loaded === editav.count && editav.initials === 0 && !(await t.store()).data.guests.find((g) => g.id === "g-anna").avatar, JSON.stringify(editav));
await shot("g22-edit-profile-default-avatar");

// ---- Coordinator change 2, second branch: cancelled with no money taken ----
await t.patch('const b = s.data.tours.bookings.find((x) => x.id === "tc-anna-overdue"); b.payments = []; b.status = "cancelled"; b.holdUntil = null;');
await go("/account/bookings/tc-anna-overdue");
check("(2) guest C16: cancelled without money shows the neutral 'No payment taken' chip", (await has(T("tours.status.cancelled"))) && (await has(T("tours.payment.none"))) && !(await has(T("tours.payment.closed"))));
await viewAs(ROLE.owner);
await m07("tc-anna-overdue");
check("(2) M07: cancelled without money shows 'No payment taken'", (await has(T("tours.payment.none"))) && !(await has(T("tours.payment.closed"))));
await shot("m15-m07-cancelled-no-payment");

await t.finish();
