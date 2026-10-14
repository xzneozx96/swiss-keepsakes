// 2.7: expiry, seat release, late and repeated provider results, rebooking. 375px EN and DE.
// Run from a folder with playwright-core installed: node 2.7-drive.mjs <repo root>
import { chooseDeparture, fillContact, start, submitReview, toReview } from "./2.5-2.9-lib.mjs";

const t = await start(process.env.SHOTS ?? "2.7");
const { page, check, wait, has } = t;
const SLUG = "lucerne-old-town-walk";
const provider = (name) => page.getByRole("button", { name });

await t.reset();
await t.signIn();

// Seats on walk-16 before, during and after a hold, without opening the booking.
const seatsBefore = await t.seatsOnC10(SLUG, "Fri 16 Oct");
await chooseDeparture(t, SLUG, "Fri 16 Oct", { adults: 2, children: 1, infants: 0 });
await toReview(t);
await fillContact(t);
await submitReview(t);
const id = t.bookingIdFromUrl();
let b = await t.booking(id);
const deadline = b.holdUntil;
await provider(/^Processing/).click();
await wait(600);
const processingAt = (await t.booking(id)).payments[0].at;
await page.reload(); await wait(1000);
check("reload keeps the deadline", (await t.booking(id)).holdUntil === deadline);
const seatsDuring = await t.seatsOnC10(SLUG, "Fri 16 Oct");
check("C10 during the hold shows 3 fewer seats", Number(seatsDuring) === Number(seatsBefore) - 3, `${seatsBefore} → ${seatsDuring}`);
await t.control("Skip ahead 16 minutes");
await page.reload(); await wait(900);
const seatsAfter = await t.seatsOnC10(SLUG, "Fri 16 Oct");
b = await t.booking(id);
check("after the deadline C10 shows the seats again, without opening the booking", Number(seatsAfter) === Number(seatsBefore), `${seatsDuring} → ${seatsAfter}; stored status still ${b.status}`);

// Opening it applies the expiry once: expired, session closed, old payment action gone.
await t.go(`/account/bookings/${id}`);
b = await t.booking(id);
check("booking expired at its original deadline", b.status === "expired" && b.activity.find((e) => e.event === "expired")?.at === deadline);
check("open payment's session closed at the deadline", b.activity.some((e) => e.event === "session-closed" && e.at === deadline));
// Round 3: C16 has C15's tabs; the "nothing shown" checks read every tab (t.hasAll).
check("payment label: session closed, awaiting provider (not 'Payment due')", (await has(/Payment session closed · awaiting provider/)) && !(await t.hasAll(/Payment due/)));
check("expired C16 shows no remaining balance", !(await t.hasAll(/Remaining balance/)));
check("old payment action removed; rebook offered", !(await t.hasAll(/Finish payment/)) && (await page.getByRole("button", { name: "Check availability again" }).count()) === 1);
await page.reload(); await wait(900);
b = await t.booking(id);
check("expiry is recorded once (reload adds nothing)", b.activity.filter((e) => e.event === "expired").length === 1);
await t.both("c16-expired-session-closed");
await t.keyboard("C16 'Check availability again'", /^Check availability again$/);
await t.go(`/account/bookings/${id}/pay`);
check("old C12 link: no Pay, session closed text", (await provider(/^Pay CHF/).count()) === 0 && (await has(/payment session is closed/)));
await t.both("c12-old-link-expired", false);

// Late provider result: paid at the time the guest pressed Processing, result arriving now.
await t.go(`/account/bookings/${id}`);
await t.control(/^Provider confirms it was paid at/);
b = await t.booking(id);
check("late success never restores the booking", b.status === "expired");
check("emails: N22 to guest and staff, no receipt or confirmation", (await t.mails(id)) === "guest:N22,staff:N22", await t.mails(id));
check("money kept once for reconciliation", b.payments.length === 1 && t.paid(b) === 6690);
const late = b.lateResults?.[0];
check("actual payment time and arrival time are both kept and differ", late?.paidAt === processingAt && Date.parse(late.receivedAt) > Date.parse(deadline), `paid ${late?.paidAt}, received ${late?.receivedAt}, deadline ${deadline}`);
check("C16 reconciliation notice with both times", (await has(/Payment received after your reservation expired/)) && (await has(/Paid Tue, 13 Oct, 10:00/)) && (await has(/Result received Tue, 13 Oct, 10:1[6-9]/)));
check("payment label: reconciliation needed", await has(/reconciliation needed/));
check("seats are not taken back by the late payment", (await t.seatsOnC10(SLUG, "Fri 16 Oct")) === seatsAfter);
await t.go(`/account/bookings/${id}`);
await t.both("c16-late-reconciliation");

// Repeated provider result: nothing changes.
await t.control("Provider sends its last result again", { close: true });
const again = await t.booking(id);
check("repeated result: same payments, same money, same late record", again.payments.length === 1 && t.paid(again) === 6690 && again.lateResults.length === 1 && again.status === "expired");
check("repeated late result sends no further email", (await t.mails(id)) === "guest:N22,staff:N22");
check("no duplicate booking created by late or repeated results", (await t.tours()).bookings.filter((x) => x.guestId === "g-anna" && x.departureId === "walk-16").length === 1);

// A late decline (session closed without a charge) on another expired hold.
await chooseDeparture(t, SLUG, "Fri 16 Oct", { adults: 1, children: 0, infants: 0 });
await toReview(t);
await submitReview(t);
const closed = t.bookingIdFromUrl();
await provider(/^Processing/).click();
await wait(500);
await t.control("Skip ahead 16 minutes");
await t.go(`/account/bookings/${closed}`);
await t.control("Provider declines or closes the session, no charge");
b = await t.booking(closed);
check("late decline: expired, nothing received, no reconciliation", b.status === "expired" && t.paid(b) === 0 && !(await t.hasAll(/reconciliation needed/)) && (await has(/No payment taken/)));
check("late decline sends no email", (await t.mails(closed)) === "", await t.mails(closed));
check("late decline keeps its arrival time", b.lateResults?.[0]?.paidAt === null && !!b.lateResults?.[0]?.receivedAt);

// Rebooking checks today's seats and price and creates a new record.
await t.go(`/account/bookings/${id}`);
await page.evaluate(() => { const s = JSON.parse(localStorage.getItem("sk.demo")); s.data.tours.tours.find((x) => x.id === "old-town").adultPrice = 9500; localStorage.setItem("sk.demo", JSON.stringify(s)); });
await page.reload(); await wait(900);
await page.getByRole("button", { name: "Check availability again" }).click();
await wait(800);
const draft = (await t.tours()).draft;
check("rebook opens C10 with the old departure and group", page.url().endsWith(`/tours/${SLUG}?book=true`) && draft.departureId === "walk-16" && draft.adults === 2 && draft.children === 1);
check("C10 shows today's price (simulated merchant change to CHF 95)", await has(/Adults CHF 95\.00/));
await t.shot("c10-rebook-en");
await page.getByRole("button", { name: /Review/ }).last().click();
await wait(700);
check("C11 total uses the current price", await has(/Booking total\s+CHF 235\.00/));
await submitReview(t);
const fresh = t.bookingIdFromUrl();
const freshB = await t.booking(fresh);
const old = await t.booking(id);
check("new booking is a new record with today's price", fresh !== id && freshB.adultPrice === 9500 && freshB.total === 23500 && freshB.status === "pending_payment");
check("old booking stays expired with its own price snapshot", old.status === "expired" && old.adultPrice === 8900 && old.total === 22300);

await t.finish();
