// 2.1 Tour demo data and booking state: fixtures, booking-time snapshot, hold kept on reload,
// expiry by the demo clock, Reset, and older stored data upgraded without a crash.
import { setup, seatsLeft } from "./2.x-lib.mjs";

const OUT = process.argv[2];
const { errors, page, check, wait, both, go, fresh, stored, writeStored, signIn, panel, done } = await setup(OUT);
const row = (re) => page.getByRole("radio", { name: re }).locator("xpath=ancestor::label[1]");

// A. Fixtures on a fresh browser
await fresh();
let s = await stored();
const T = s.data.tours;
const tour = (id) => T.tours.find((t) => t.id === id);
console.log("tours:", T.tours.map((t) => `${t.id}${t.published ? "" : " (unpublished)"}`).join(", "));
check("fixtures: 5 tours incl. unpublished pilatus", T.tours.length === 5 && tour("pilatus").published === false);
const bookablePolicies = new Set(T.departures.filter((d) => tour(d.tourId).published && !d.closed && !d.cancelledAt && seatsLeft(s, d.id) > 0 && Date.parse(d.startsAt) > Date.parse("2026-10-13T10:00:00+02:00")).map((d) => d.policy));
check("fixtures: bookable full, deposit and pay-later departures", ["full", "deposit", "later"].every((p) => bookablePolicies.has(p)), [...bookablePolicies]);
check("fixtures: sold-out departure walk-18 has real capacity, every seat taken", tour("old-town") && T.departures.find((d) => d.id === "walk-18").capacity === 12 && seatsLeft(s, "walk-18") === 0, `capacity 12, left ${seatsLeft(s, "walk-18")}`);
check("fixtures: sold-out tour (workshop) has no free seat on any departure", T.departures.filter((d) => d.tourId === "workshop").every((d) => seatsLeft(s, d.id) === 0));
check("fixtures: last-seats departure walk-23 has 3 seats left", seatsLeft(s, "walk-23") === 3, String(seatsLeft(s, "walk-23")));
check("fixtures: age-group prices on every tour", T.tours.every((t) => t.adultPrice > 0 && t.childPrice >= 0 && t.infantPrice >= 0));
check("fixtures: age bands per tour (lake children from 4, walk from 6)", tour("lake").ageBands.childFrom === 4 && tour("old-town").ageBands.childFrom === 6 && T.tours.every((t) => t.ageBands.adultFrom > t.ageBands.childFrom));
check("fixtures: participant fields per tour (walk optional, night required)", tour("old-town").participantFields[0]?.required === false && tour("night").participantFields[0]?.required === true, tour("old-town").participantFields.concat(tour("night").participantFields).map((f) => `${f.id}:${f.required}`).join(" "));
const nightTexts = [tour("night").name, tour("night").summary, tour("night").description, tour("night").meetingPoint, tour("night").conditions, tour("night").excluded, tour("night").cancellationPolicy, ...tour("night").included, ...tour("night").itinerary.flatMap((x) => [x.name, x.description])];
check("fixtures: night tour is German only in every merchant text", nightTexts.every((x) => x.de && !x.en), `${nightTexts.length} texts`);
const yuki = T.bookings.find((b) => b.id === "tour-yuki");
check("seeded booking snapshots prices, policy, cancellation text and deadline", yuki.adultPrice === 8900 && yuki.childPrice === 4500 && yuki.total === 26800 && yuki.policy === "full" && yuki.cancellationPolicy.en && yuki.balanceDueAt, `total ${yuki.total}`);
check("seeded referral source: tour-lars from hotel-am-see", T.bookings.find((b) => b.id === "tour-lars").partnerId === "hotel-am-see");
const freshTours = JSON.stringify({ tours: T.tours, departures: T.departures, bookings: T.bookings, draft: T.draft });

// B. A real booking through C10 and C11 snapshots booking-time values (C11 submit is worker B's step 2.5)
await panel();
await page.getByRole("button", { name: /^Via .*QR$/ }).first().click();
await wait(700);
await signIn("/tours/lucerne-old-town-walk/book");
console.log("INFO after sign-in:", page.url());
await row(/20 Oct/).click();
await wait(300);
await page.getByRole("button", { name: "Review booking" }).click();
await wait(800);
await page.getByLabel("Contact name").fill("Anna Keller");
await page.getByLabel("Mobile number").fill("+41 79 123 45 67");
await page.getByRole("button", { name: /Continue to payment/ }).click();
await wait(1200);
s = await stored();
const booking = s.data.tours.bookings.filter((b) => b.departureId === "walk-20" && b.guestId === "g-anna").pop();
check("C11 submit created a pending_payment booking on walk-20", booking?.status === "pending_payment", booking?.status);
const holdMinutes = (Date.parse(booking.holdUntil) - Date.parse(booking.createdAt)) / 60000;
check("booking stores a 15-minute hold deadline", holdMinutes === 15, `${booking.createdAt} → ${booking.holdUntil}`);
check("booking stores booking-time prices and total", booking.adultPrice === 8900 && booking.childPrice === 4500 && booking.infantPrice === 0 && booking.total === 22300, `total ${booking.total}`);
check("booking stores policy snapshot (full, first amount, deadline, cancellation text)", booking.policy === "full" && booking.firstAmount === 22300 && booking.balanceDueAt === "2026-10-20T10:00:00+02:00" && booking.cancellationPolicy.en === tour("old-town").cancellationPolicy.en);
check("booking stores referral source after arriving via partner QR (createBooking is worker B's)", booking.partnerId === "hotel-am-see", `partnerId=${booking.partnerId}`);
check("hold takes 3 seats: walk-20 has 9 left", seatsLeft(s, "walk-20") === 9);

// C. Reload keeps the original deadline; the demo clock releases the seats when it passes
const holdBefore = booking.holdUntil;
await wait(2500);
await page.reload();
await wait(900);
s = await stored();
let again = s.data.tours.bookings.find((b) => b.id === booking.id);
check("reload keeps the hold and its original deadline", again.status === "pending_payment" && again.holdUntil === holdBefore, again.holdUntil);
await go("#/tours/lucerne-old-town-walk/book");
check("C10 counts the held seats: walk-20 shows 9 seats available", (await row(/20 Oct/).innerText()).includes("9 seats available"));
await row(/20 Oct/).evaluate((el) => el.scrollIntoView({ block: "center" })); // seats chip clear of the sticky bar
await both("c10-during-hold");
s.clockStartedAt -= 16 * 60_000; // the demo clock runs 16 minutes ahead, as if the guest waited
await writeStored(s);
await go("#/tours/lucerne-old-town-walk/book");
s = await stored();
again = s.data.tours.bookings.find((b) => b.id === booking.id);
check("after the deadline the deadline itself is unchanged", again.holdUntil === holdBefore);
check("after the deadline C10 shows the 3 seats free again (12 available)", (await row(/20 Oct/).innerText()).includes("12 seats available"));
console.log("INFO expired booking status in storage:", again.status, "(the status flip runs in worker B's C12/C16, seats are free either way)");
await row(/20 Oct/).evaluate((el) => el.scrollIntoView({ block: "center" })); // seats chip clear of the sticky bar
await both("c10-after-expiry");

// D. Reset restores the fixtures
await panel();
await page.getByRole("button", { name: "Reset demo" }).click();
await wait(900);
s = await stored();
const T2 = s.data.tours;
check("Reset restores tours, departures, bookings and draft exactly", JSON.stringify({ tours: T2.tours, departures: T2.departures, bookings: T2.bookings, draft: T2.draft }) === freshTours);

// E. Older stored data (same DEMO_VERSION, no ageBands / participantFields) loads without a crash
s = await stored();
for (const t of s.data.tours.tours) { delete t.ageBands; delete t.participantFields; }
const errorsBefore = errors.length;
await writeStored(s);
await go("#/tours");
await go("#/tours/lucerne-old-town-walk");
await go("#/tours/lucerne-old-town-walk/book");
check("old stored tours: C08, C09, C10 render without a page error", errors.length === errorsBefore && (await page.getByText("Ages 16+ · CHF 89.00 each").count()) === 1);
s = await stored();
check("old stored tours are upgraded with the seed's age bands and fields", s.data.tours.tours.every((t) => t.ageBands && Array.isArray(t.participantFields)));

await done();
