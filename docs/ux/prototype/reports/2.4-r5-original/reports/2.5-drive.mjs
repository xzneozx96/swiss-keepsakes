// 2.5: C11 Review booking with C05 sign-in. 375px EN and DE.
// Run from a folder with playwright-core installed: node 2.5-drive.mjs <repo root>
import { chooseDeparture, fillContact, start, submitReview, toReview } from "./2.5-2.9-lib.mjs";

const t = await start("2.5");
const { page, check, wait, has, go } = t;
const SLUG = "lucerne-old-town-walk";

// Signed out. Opening C10 and C11 starts no hold.
await t.reset();
const before = (await t.tours()).bookings.length;
const seats16 = await t.seatsOnC10(SLUG, "Fri 16 Oct");
await chooseDeparture(t, SLUG, "Fri 16 Oct", { adults: 2, children: 1, infants: 0 });
await toReview(t);
check("C10 → C11 route", page.url().endsWith(`/tours/${SLUG}/book/review`), page.url());
check("opening C10 and C11 creates no booking or hold", (await t.tours()).bookings.length === before);
check("seats unchanged by opening C11", (await t.seatsOnC10(SLUG, "Fri 16 Oct")) === seats16, `C10 shows ${seats16}`);
await go(`/tours/${SLUG}/book/review`);
const c11 = await t.text("main");
check("C11 departure", /Fri, 16 Oct, 10:00/.test(c11));
check("C11 meeting point", /Where to meet: Chapel Bridge/.test(c11));
check("C11 group counts, plural-aware", /2 adults · 1 child\b/.test(c11), c11.match(/\d+ adults?[^\n]*/)?.[0]);
check("C11 total CHF 223.00", /Booking total\s+CHF 223\.00/.test(c11));
check("C11 amount due today CHF 66.90", /Pay now\s+CHF 66\.90/.test(c11));
check("C11 remaining balance CHF 156.10", /Remaining balance\s+CHF 156\.10/.test(c11));
check("C11 due date", /Balance due by Thu, 15 Oct, 18:00/.test(c11));
check("C11 configured participant field (optional child's name)", (await page.getByLabel("Child’s name (optional)").count()) === 1);
check("C11 signed-out prompt is tour copy, not gift copy", /Sign in to book/.test(c11) && !/fill your cart/.test(c11));
await t.both("c11-signed-out");

// Fill, then sign in through C05: inputs come back.
await fillContact(t);
await page.getByLabel("Child’s name (optional)").fill("Alex");
await submitReview(t);
check("submit while signed out opens C05", /#\/sign-in\?returnTo=%2Ftours%2Flucerne-old-town-walk%2Fbook%2Freview/.test(page.url()), page.url());
await t.shot("c05-sign-in-en", false);
await page.getByRole("button", { name: /Continue with Google/ }).click();
await wait(900);
check("C05 returns to C11", page.url().endsWith(`/tours/${SLUG}/book/review`), page.url());
check("contact name kept through sign-in", (await page.getByLabel("Contact name").inputValue()) === "Anna Keller");
check("phone kept through sign-in", (await page.getByLabel("Mobile number").inputValue()) === "+41 79 123 45 67");
check("child's name kept through sign-in", (await page.getByLabel("Child’s name (optional)").inputValue()) === "Alex");
check("still no booking after sign-in (no hold until submit)", (await t.tours()).bookings.length === before);
await t.both("c11-signed-in");

// Validation keeps the inputs.
await page.getByLabel("Mobile number").fill("123");
await submitReview(t);
check("invalid phone: error shown, still on C11", (await has(/valid mobile number/)) && page.url().endsWith("/review"));
check("invalid phone: name kept", (await page.getByLabel("Contact name").inputValue()) === "Anna Keller");
check("invalid phone: no booking", (await t.tours()).bookings.length === before);
await t.both("c11-error-contact");
await page.getByLabel("Contact name").fill("");
await submitReview(t);
check("empty name: blocked by required validation", page.url().endsWith("/review") && (await page.getByLabel("Contact name").getAttribute("aria-invalid")) === "true" || (await page.getByLabel("Contact name").evaluate((el) => !el.validity.valid)));
await fillContact(t);

// Last available seats (walk-23: 3 of 12 left). A competing guest takes seats first.
await chooseDeparture(t, SLUG, "Fri 23 Oct", { adults: 2, children: 1, infants: 0 });
check("walk-23 starts with 3 seats left", (await t.seatsTaken("walk-23")) === 9);
await toReview(t);
await page.getByLabel("Child’s name (optional)").fill("Alex");
const mine = async () => (await t.tours()).bookings.filter((b) => b.guestId === "g-anna").length;
const mineBefore = await mine();
check("prototype control: competing guest takes the last seats", await t.control("Another guest takes the last seats"));
check("C11 shows 'not enough places' at once (departure just sold out state)", await has(/not enough places left for your group/));
await submitReview(t);
check("rejected attempt: still on C11", page.url().endsWith("/review"), page.url());
check("rejected attempt: no booking for Anna", (await mine()) === mineBefore);
check("rejected attempt: inputs kept", (await page.getByLabel("Contact name").inputValue()) === "Anna Keller" && (await page.getByLabel("Child’s name (optional)").inputValue()) === "Alex");
const taken23 = await t.seatsTaken("walk-23");
check("capacity never exceeded on walk-23", taken23 <= 12, `${taken23}/12 taken`);
await t.both("c11-last-seats-taken");
await t.keyboard("C11 'Choose another departure'", /^Choose another departure$/);
await page.getByRole("button", { name: "Choose another departure" }).click();
await wait(600);
check("'Choose another departure' returns to C10 with the group kept", page.url().endsWith(`/tours/${SLUG}/book`) && (await t.tours()).draft.children === 1);
const left23 = 12 - (await t.seatsTaken("walk-23"));
check("C10 now shows the remaining seats for walk-23", await has(new RegExp(`${left23} seats? available`)), `${left23} left`);

// Recheck before creating: a group that fits is accepted, then a second submit for the same departure is refused.
await chooseDeparture(t, SLUG, "Fri 23 Oct", { adults: left23, children: 0, infants: 0 });
await toReview(t);
await submitReview(t);
const held = t.bookingIdFromUrl();
check("a group that fits creates one hold and opens C12", /\/pay$/.test(page.url()) && !!held, page.url());
check("capacity still respected after the hold", (await t.seatsTaken("walk-23")) <= 12, `${await t.seatsTaken("walk-23")}/12`);
await page.goBack(); await wait(700);
await go(`/tours/${SLUG}/book/review`);
check("back on C11: guest is told places are already held", await has(/already have places held for this departure/));
const countHeld = (await t.tours()).bookings.length;
await submitReview(t);
check("second submit for the same departure creates no second hold", (await t.tours()).bookings.length === countHeld && page.url().endsWith("/review"));
await t.both("c11-already-held");
await page.getByRole("button", { name: "Go to your held places" }).click();
await wait(700);
check("'Go to your held places' opens the existing payment", page.url().endsWith(`/bookings/${held}/pay`), page.url());

// German-only tour in EN: complete German text with a language notice; required merchant field.
await chooseDeparture(t, "luzern-bei-nacht", "22 Oct", { adults: 1, children: 0, infants: 0 });
await toReview(t);
check("German-only tour: notice in EN", await has(/only available in German/));
check("German-only tour: required merchant question shown", (await page.getByLabel("Namen aller Teilnehmenden").count()) === 1);
await fillContact(t);
const n = (await t.tours()).bookings.length;
await submitReview(t);
check("required merchant question blocks submit until answered", (await t.tours()).bookings.length === n && page.url().endsWith("/review"));
await t.both("c11-german-only");
await page.getByLabel("Namen aller Teilnehmenden").fill("Anna Keller");
await submitReview(t);
const night = await t.booking(t.bookingIdFromUrl());
check("answer snapshotted on the booking", night?.participantInfo?.[0]?.value === "Anna Keller", JSON.stringify(night?.participantInfo));

// Keyboard: the fields and the action are reachable by Tab with a visible focus.
await chooseDeparture(t, SLUG, "Tue 20 Oct", { adults: 2, children: 0, infants: 0 });
await toReview(t);
await page.getByLabel("Contact name").focus();
const order = [];
for (let i = 0; i < 4; i++) { await page.keyboard.press("Tab"); order.push(await page.evaluate(() => document.activeElement?.getAttribute("name") || document.activeElement?.textContent?.trim().slice(0, 30))); }
check("Tab moves through the C11 fields", order.includes("tour-phone"), order.join(" > "));
await t.keyboard("C11 submit", /^Continue to payment/);

await t.finish();
