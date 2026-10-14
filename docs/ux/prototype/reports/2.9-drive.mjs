// 2.9: C14 bookings list and C16 guest booking detail in every state; balance payment. 375px EN and DE.
// Run from a folder with playwright-core installed: node 2.9-drive.mjs <repo root>
import { start } from "./2.5-2.9-lib.mjs";

const t = await start(process.env.SHOTS ?? "2.9");
const { page, check, wait, has } = t;

await t.reset();
await t.signIn();

// The account hub lists tour bookings next to gift orders.
await t.go("/account");
check("account hub: gift orders and tour bookings side by side", (await has(/Your orders/)) && (await has(/Tour bookings/)));
await t.shot("c14-hub-en");

// Sample bookings in the states the guest flow alone cannot reach (prototype control).
check("prototype control adds sample tour bookings", await t.control("Add sample tour bookings in every state"));
check("lands on the tour bookings list", /tab=bookings/.test(page.url()), page.url());
const list = await t.text("main");
const states = ["Seats held for payment", "Reservation expired", "Confirmed", "Tour service delivered", "Completed", "No-show"];
for (const s of states) check(`C14 shows a '${s}' booking`, list.includes(s));
check("C14 rows carry separate payment labels", /Paid in full/.test(list) && /Deposit paid · balance due/.test(list) && /reconciliation needed/.test(list) && /No payment taken/.test(list));
const capacity13 = await t.seatsTaken("walk-13");
check("samples keep the closed 13 Oct walk within capacity", capacity13 <= 12, `${capacity13}/12`);
await t.both("c14-list");

const open = async (ref) => {
  const bookings = (await t.tours()).bookings;
  const b = bookings.find((x) => x.ref === ref || x.id === ref);
  await t.go(`/account/bookings/${b.id}`);
  return b;
};
// Round 3: C16 has C15's tabs, so the sections are read across all four tabs. "Booking activity"
// is the Progress tab's heading; its stepper has one step per logged event, and a booking with
// no events says so instead of leaving the tab empty.
const sections = async (name, booking) => {
  const text = await t.allTabs();
  await t.tab("Progress");
  const steps = await page.getByRole("list", { name: "Booking activity" }).locator(":scope > li").count();
  await t.tab("Overview");
  const events = booking.activity.length;
  check(`${name}: activity (one step per event, else the empty line), payment history, policies, contact`, /Booking activity/.test(text) && steps === events && /No activity recorded yet/.test(text) === (events === 0) && /Payment history/.test(text) && /Payment policy/.test(text) && /Cancellation policy/.test(text) && /Contact the organiser/.test(text), `${events} events, ${steps} steps`);
  check(`${name}: meeting point and price snapshot`, /Where to meet/.test(text) && /Adults · \d+ × CHF/.test(text));
};

// Held: timer and the first payment.
let b = await open("SK-T901");
check("held: timer and finish payment", (await has(/Places reserved for 1[45]:\d\d/)) && (await page.getByRole("button", { name: /Finish payment · CHF 89\.00/ }).count()) === 1);
await sections("held", b);
await t.both("c16-held");

// Expired, without and with money after expiry.
b = await open("SK-T902");
check("expired: rebook offered, no payment action", (await page.getByRole("button", { name: "Check availability again" }).count()) === 1 && !(await t.hasAll(/Finish payment|Pay remaining/)));
await t.both("c16-expired");
b = await open("SK-T903");
check("expired with late money: reconciliation notice with both times", (await has(/Payment received after your reservation expired/)) && (await has(/Paid Mon, 12 Oct, 10:14 · Result received Mon, 12 Oct, 10:22/)));
await t.both("c16-expired-reconciliation");

// Confirmed with an overdue balance (seeded SK-T1042, balance deadline 12 Oct).
b = await open("SK-T1042");
check("confirmed + overdue: deadline passed message and balance", (await has(/balance deadline has passed/)) && (await has(/Remaining balance\s+CHF 156\.10/)));
await sections("confirmed overdue", b);
await t.both("c16-confirmed-overdue");

// Delivered with a balance: balance payment, no hold, no seat change.
b = await open("SK-T904");
check("delivered: balance still shown with pay action", (await has(/Tour service delivered/)) && (await has(/Remaining balance\s+CHF 62\.30/)));
await t.both("c16-delivered-balance");
const seats13 = await t.seatsTaken("walk-13");
const countBefore = (await t.tours()).bookings.length;
await page.getByRole("button", { name: /Pay remaining balance · CHF 62\.30/ }).click();
await wait(800);
check("balance C12: no 15-minute timer", !(await has(/Places reserved for/)) && (await has(/Amount\s+CHF 62\.30/)));
await t.shot("c12-balance-en", false);
await page.getByRole("button", { name: /^Processing/ }).click();
await wait(600);
await t.go(`/account/bookings/${b.id}`);
check("balance processing: C16 label and disabled pay action", (await has(/Payment processing/)) && (await page.getByRole("button", { name: /Pay remaining balance/ }).isDisabled()));
await t.control("Provider confirms this tour payment now");
let after = await t.booking(b.id);
check("balance paid: debt cleared, status unchanged, no hold", t.paid(after) === 8900 && after.status === "delivered" && after.holdUntil === null);
check("balance emails: receipt N07 only, no new confirmation", (await t.mails(b.id)) === "guest:N07", await t.mails(b.id));
check("balance payment creates no booking and no seat change", (await t.tours()).bookings.length === countBefore && (await t.seatsTaken("walk-13")) === seats13);
check("C16 now paid in full, completion still the merchant's step", (await has(/Paid in full/)) && (await has(/Tour service delivered/)));
await t.both("c16-delivered-paid");

// Balance on a confirmed deposit booking straight through C12.
b = await open("SK-T1042");
await page.getByRole("button", { name: /Pay remaining balance · CHF 156\.10/ }).click();
await wait(700);
await page.getByRole("button", { name: /^Pay CHF 156\.10/ }).click();
await wait(900);
after = await t.booking(b.id);
check("deposit balance paid: back on C16, paid in full, still confirmed", page.url().endsWith(`/bookings/${b.id}`) && t.paid(after) === 22300 && after.status === "confirmed" && after.holdUntil === null);

// Completed and no-show.
b = await open("SK-T905");
check("completed: no pay action, review offered", !(await t.hasAll(/Pay remaining|Finish payment/)) && (await page.getByRole("button", { name: "Write a review" }).count()) === 1);
await t.both("c16-completed");
b = await open("SK-T906");
check("no-show: money kept, no pay/complete/review", (await has(/no-show/i)) && (await has(/Paid in full/)) && !(await t.hasAll(/Pay remaining|Write a review|Review/)));
await t.both("c16-no-show");

// Contact actions.
b = await open("SK-T1042");
await t.tab("Policy");
await t.keyboard("C16 contact 'Email'", /Email$/);
await t.keyboard("C16 contact 'Call'", /Call$/);
check("contact: email and call links with the reference", ((await page.getByRole("link", { name: "Email" }).getAttribute("href")) ?? "").includes("SK-T1042") && ((await page.getByRole("link", { name: "Call" }).getAttribute("href")) ?? "").startsWith("tel:"));

// Empty list.
await t.reset();
await t.signIn();
await page.evaluate(() => { const s = JSON.parse(localStorage.getItem("sk.demo")); s.data.tours.bookings = s.data.tours.bookings.filter((x) => x.guestId !== "g-anna"); localStorage.setItem("sk.demo", JSON.stringify(s)); });
await page.reload(); await wait(800);
await t.go("/account?tab=bookings");
check("C14 empty state", await has(/Your tour bookings will appear here/));
await t.both("c14-empty", false);

await t.finish();
