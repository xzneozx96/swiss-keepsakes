// 2.15 guest flow, joined up: C08 → C09 (map stop card and sheet) → C10 → C11 with C05 → C12 → C13
// → C16, then the guest booking cases. node 2.15-guest.mjs en|de (375px).
import { DICT, bookingIdFromUrl, chooseDeparture, start } from "./2.15-lib.mjs";

const L = process.argv[2] === "de" ? "de" : "en";
const t = await start(L, { webgl: true });
const { page, T, rx, check, wait, has, go, text, shot, store, booking, paid, mails, seatsTaken, control, keyboard } = t;
const other = L === "en" ? "de" : "en";
const OLD = { en: "Lucerne old-town walk", de: "Altstadtspaziergang Luzern" }[L];
const SLUG = "lucerne-old-town-walk";
const provider = (i) => page.locator("fieldset button").nth(i); // 0 Pay, 1 Fail, 2 Processing
const submit = async () => { await page.locator("form button[type=submit]").click(); await wait(1000); };
const contact = async () => {
  await page.getByLabel(T("tourBooking.name"), { exact: false }).first().fill("Anna Keller");
  await page.getByLabel(T("tourBooking.phone"), { exact: false }).first().fill("+41 79 123 45 67");
};
const book = async (departureId, group) => {
  await chooseDeparture(t, SLUG, departureId, group);
  await page.getByRole("button", { name: T("tourDiscovery.review", { total: "" }) }).click();
  await wait(800);
  await contact();
  await submit();
  return bookingIdFromUrl(page);
};

await t.reset();

// ---- Joined-up path, signed out at the start ----
await page.getByRole("navigation", { name: T("nav.guest.label") }).getByRole("link", { name: T("nav.tours") }).click();
await wait(900);
check("tab bar Tours opens C08", page.url().endsWith("#/tours"), page.url());
check("C08 lists the old-town walk", await has(OLD));
await shot("g01-c08");
await page.getByRole("link", { name: new RegExp(OLD) }).first().click();
await wait(1200);
check("C08 card opens C09", page.url().endsWith(`#/tours/${SLUG}`), page.url());
await shot("g02-c09");

// C09 in-map stop card and the "View more" sheet (WebGL via SwiftShader; tiles from OpenFreeMap).
// The map mounts when it scrolls into view.
await page.evaluate(() => window.scrollBy(0, document.querySelector(".tour-map-frame").getBoundingClientRect().top - 72));
let ready = false;
for (let i = 0; i < 50 && !ready; i++) {
  ready = (await page.locator(".tour-map-marker").count()) >= 2 && (await page.locator("canvas").count()) > 0;
  if (!ready) await wait(500);
}
check("C09 map ready (canvas and stop pins)", ready, `${await page.locator(".tour-map-marker").count()} pins`);
const card = page.locator(".tour-map-card");
check("C09 stop card shows stop 1", (await card.count()) === 1 && (await card.locator("h3").innerText()).length > 0, await card.locator("h3").innerText().catch(() => ""));
const first = await card.locator("h3").innerText();
await card.scrollIntoViewIfNeeded();
await page.getByRole("button", { name: T("tourMap.next") }).first().click();
await wait(600);
const second = await card.locator("h3").innerText();
check("C09 Next stop moves the card to stop 2", second !== first, `${first} → ${second}`);
// "Whole route" is enabled once the camera has finished flying to the stop; give the flight time under load.
const overview = page.getByRole("button", { name: T("tourMap.overview") });
for (let i = 0; i < 20 && !(await overview.isEnabled()); i++) await wait(250);
check("C09 pin follows the card, Whole route now offered", (await page.locator('.tour-map-marker[aria-pressed="true"]').count()) === 1 && (await overview.isEnabled()));
await shot("g03-c09-map-card", { full: false });
await page.getByRole("button", { name: T("tourMap.viewMore") }).first().click();
await wait(700);
const sheet = page.getByRole("dialog");
check("C09 View more opens the stop sheet for the same stop", (await sheet.count()) === 1 && (await sheet.innerText()).includes(second));
await shot("g04-c09-stop-sheet", { full: false });
await page.keyboard.press("Escape");
await wait(500);
check("C09 sheet closes with Escape", (await page.getByRole("dialog").count()) === 0);
const av = await t.avatars();
const reviewers = await page.locator("main img.rounded-full.size-12").count();
check("(1) C09 tour reviews: every reviewer has a loaded sample avatar, no initials", av.count > 0 && av.loaded === av.count && av.count >= reviewers && av.initials === 0, JSON.stringify({ ...av, reviewers }));
check("(3) C09 review list: no '1 children' / '1 Kinder'", !(await has(/\b1 (children|Kinder)\b/)));

// C10 → C11 → C05 → C11 → C12 → C13 → C16 (deposit, walk-16).
await page.getByRole("button", { name: T("tourDiscovery.choose") }).last().click();
await wait(900);
check("C09 booking action opens C10", page.url().endsWith(`/tours/${SLUG}?book=true`) && (await page.getByRole("dialog").count()) === 1, page.url());
const before = (await t.tours()).bookings.length;
await chooseDeparture(t, SLUG, "walk-16", { adults: 2, children: 1, infants: 0 });
await shot("g05-c10");
await page.getByRole("button", { name: T("tourDiscovery.review", { total: "" }) }).click();
await wait(900);
check("C10 → C11, no hold yet", page.url().endsWith("/book/review") && (await t.tours()).bookings.length === before);
await contact();
await shot("g06-c11-signed-out");
await submit();
check("C11 submit while signed out opens C05", page.url().includes("#/sign-in?returnTo="), page.url());
await page.getByRole("button", { name: T("auth.google") }).click();
await wait(1000);
check("C05 returns to C11 with the inputs", page.url().endsWith("/book/review") && (await page.getByLabel(T("tourBooking.name"), { exact: false }).first().inputValue()) === "Anna Keller");
await submit();
const dep = bookingIdFromUrl(page);
let b = await booking(dep);
check("C11 → C12 with a 15-minute hold", /\/pay$/.test(page.url()) && b?.status === "pending_payment" && Date.parse(b.holdUntil) - Date.parse(b.createdAt) === 900000);
const prefix = (key) => T(key, { time: "QQ", amount: "QQ" }).split("QQ")[0].trim();
check("C12 shows the timer and CHF 66.90", (await has(prefix("tourBooking.hold"))) && (await has("66.90")));
await shot("g07-c12-hold", { full: false });
await provider(0).click();
await wait(1100);
b = await booking(dep);
check("C12 → C13, confirmed on the 30% deposit", page.url().endsWith("/confirmed") && b.status === "confirmed" && paid(b) === 6690);
check("C13 labels: confirmed and deposit paid, balance and deadline shown", (await has(T("tours.status.confirmed"))) && (await has(T("tours.payment.deposit"))) && (await has("156.10")));
await shot("g08-c13-deposit");
await page.getByRole("button", { name: T("tourBooking.view") }).first().click();
await wait(900);
check("C13 → C16", page.url().endsWith(`/account/bookings/${dep}`), page.url());
await shot("g09-c16-deposit");

// Language switch keeps price, date, policy and status (EN and DE row).
const here = await text("main");
await t.setLang(other);
const there = await text("main");
const O = (key) => t.norm(DICT[other][key]);
check("language switch keeps amounts, date and time", ["66.90", "156.10", "223.00", "16", "10:00", "18:00"].every((s) => here.includes(s) && there.includes(s)));
// Round 3: C16 keeps the policy snapshot on its Policy tab (C15's tabs), so read it there.
await page.getByRole("tab").last().click();
await wait(400);
const policyThere = await text("main");
await page.getByRole("tab").first().click();
await wait(400);
check("language switch translates status and policy, same meaning", there.includes(O("tours.status.confirmed")) && policyThere.includes(O("tourBooking.policyAt.deposit").split("{date}")[0].trim()));
await t.setLang(L);

// ---- Case: Balance payment (no new hold or seat reservation) ----
const seats16 = await seatsTaken("walk-16");
await page.getByRole("button", { name: new RegExp(T("tourBooking.payBalance", { amount: "QQ" }).split("QQ")[0].trim()) }).click();
await wait(900);
check("balance C12: no timer, amount CHF 156.10", !(await has(T("tourBooking.holdBody"))) && (await has("156.10")));
await provider(0).click();
await wait(1000);
b = await booking(dep);
check("balance paid: back on C16, paid in full, no hold, same seats", page.url().endsWith(`/bookings/${dep}`) && paid(b) === 22300 && b.holdUntil === null && b.status === "confirmed" && (await seatsTaken("walk-16")) === seats16);
check("balance emails: N07 receipt, no second N09", (await mails(dep)) === "guest:N07,guest:N09,guest:N07", await mails(dep));
await shot("g10-c16-paid-in-full");

// ---- Case: Full payment within the hold ----
const full = await book("walk-20", { adults: 2, children: 0, infants: 0 });
await provider(0).dblclick();
await wait(1100);
b = await booking(full);
check("full payment: one payment, confirmed, paid in full, not completed", b.payments.length === 1 && paid(b) === 17800 && b.status === "confirmed" && (await has(T("tours.payment.paid"))) && !(await has(T("tours.status.completed"))));
await shot("g11-c13-full");
await keyboard("C13 Add to calendar", new RegExp(T("tourBooking.addToCalendar") + "$"));

// ---- Case: Pay later ----
await chooseDeparture(t, "lake-lucerne-stories", "lake-17", { adults: 2, children: 0, infants: 0 });
await page.getByRole("button", { name: T("tourDiscovery.review", { total: "" }) }).click();
await wait(800);
await contact();
await submit();
const later = bookingIdFromUrl(page);
b = await booking(later);
check("pay later: straight to C13, confirmed, no hold, no card", page.url().endsWith("/confirmed") && b.status === "confirmed" && b.holdUntil === null && b.payments.length === 0 && !(await has(T("tourBooking.holdBody"))));
check("pay later: unpaid amount and deadline, N09 only", (await has(T("tours.payment.unpaid"))) && (await has("258.00")) && (await mails(later)) === "guest:N09");
await shot("g12-c13-pay-later");

// ---- Case: Last available seats (walk-23: 3 of 12 left) ----
await chooseDeparture(t, SLUG, "walk-23", { adults: 2, children: 1, infants: 0 });
await page.getByRole("button", { name: T("tourDiscovery.review", { total: "" }) }).click();
await wait(800);
await contact();
const mine = async () => (await t.tours()).bookings.filter((x) => x.guestId === "g-anna").length;
const mineBefore = await mine();
check("competing guest takes seats first (prototype control)", await control("Another guest takes the last seats"));
await submit();
check("last seats: rejected attempt stays on C11 with inputs, no booking", page.url().endsWith("/book/review") && (await mine()) === mineBefore && (await page.getByLabel(T("tourBooking.name"), { exact: false }).first().inputValue()) === "Anna Keller" && (await has(T("tourBooking.error.capacity"))));
check("last seats: capacity never exceeded", (await seatsTaken("walk-23")) <= 12, `${await seatsTaken("walk-23")}/12`);
await shot("g13-c11-last-seats");

// ---- Case: Failed or processing payment ----
const fp = await book("walk-20", { adults: 1, children: 0, infants: 0 });
const hold = (await booking(fp)).holdUntil;
await provider(1).click();
await wait(600);
check("failed: retry offered, same deadline, nothing paid", (await page.getByRole("button", { name: T("payment.failed.retry") }).count()) === 1 && (await booking(fp)).holdUntil === hold && paid(await booking(fp)) === 0);
await shot("g14-c12-failed", { full: false });
await page.getByRole("button", { name: T("payment.failed.retry") }).click();
await wait(400);
await provider(2).click();
await wait(700);
check("processing: no Pay button on C12", (await page.locator("fieldset button").count()) === 0 && (await has(T("payment.processing.title"))));
await go(`/account/bookings/${fp}`);
check("processing: C16 payment action disabled", await page.getByRole("button", { name: new RegExp(T("tourBooking.finishPayment", { amount: "QQ" }).split("QQ")[0].trim()) }).isDisabled());
await control("Provider confirms this tour payment now");
b = await booking(fp);
check("processing resolved within the hold: confirmed once", b.status === "confirmed" && b.payments.filter((p) => p.status === "succeeded").length === 1);

// ---- Cases: Reload during a hold; Expiry and rebooking; Late or repeated provider result ----
const ex = await book("walk-16", { adults: 2, children: 1, infants: 0 });
const deadline = (await booking(ex)).holdUntil;
await provider(2).click();
await wait(600);
const taken = await seatsTaken("walk-16");
await page.reload(); await wait(1200);
check("reload keeps the original deadline", (await booking(ex)).holdUntil === deadline);
await control("Skip ahead 16 minutes");
check("seats released at the deadline", (await seatsTaken("walk-16")) === taken - 3, `${taken} → ${await seatsTaken("walk-16")}`);
await go(`/account/bookings/${ex}`);
b = await booking(ex);
check("expired at its deadline, session closed", b.status === "expired" && b.activity.some((e) => e.event === "session-closed" && e.at === deadline) && (await has(T("tours.payment.sessionClosed"))));
await control(/^Provider confirms it was paid at/);
b = await booking(ex);
check("late result: stays expired, money kept once, both times, N22", b.status === "expired" && paid(b) === 6690 && b.lateResults?.[0]?.paidAt && b.lateResults[0].receivedAt > deadline && (await mails(ex)) === "guest:N22,staff:N22" && (await has(T("tourBooking.reconcile.title"))));
await control("Provider sends its last result again", { close: true });
const again = await booking(ex);
check("repeated result: nothing counted twice", again.payments.length === 1 && paid(again) === 6690 && again.lateResults.length === 1 && (await mails(ex)) === "guest:N22,staff:N22");
await shot("g15-c16-late-reconciliation");
await t.patch('s.data.tours.tours.find((x) => x.id === "old-town").adultPrice = 9500');
await go(`/account/bookings/${ex}`);
await page.getByRole("button", { name: T("tourBooking.rebook") }).click();
await wait(900);
check("rebook: C10 with the old departure and group, today's price", page.url().endsWith(`/tours/${SLUG}?book=true`) && (await has("95.00")) && (await t.tours()).draft.departureId === "walk-16");
await page.getByRole("button", { name: T("tourDiscovery.review", { total: "" }) }).click();
await wait(800);
await submit();
const fresh = await booking(bookingIdFromUrl(page));
check("rebook: new record at today's price; the old one stays expired", fresh.id !== ex && fresh.adultPrice === 9500 && (await booking(ex)).status === "expired" && (await booking(ex)).adultPrice === 8900);

// ---- Coordinator change 1 on a gift: review avatars on C03 ----
await go("/gifts/kapellbruecke-pocket-knife");
const gav = await t.avatars();
const giftReviewers = await page.locator("main img.rounded-full.size-12").count();
check("(1) gift C03 reviews: every reviewer has a loaded sample avatar, no initials", gav.count > 0 && gav.loaded === gav.count && gav.count >= giftReviewers && gav.initials === 0, JSON.stringify({ ...gav, giftReviewers }));
await shot("g17-c03-gift-reviews");

// ---- Missing merchant translation: complete German version with a language notice ----
await go("/tours/luzern-bei-nacht");
const notice = L === "en" ? T("tourDiscovery.onlyInGerman") : null;
check("German-only tour: complete German text" + (notice ? " with a language notice in EN" : " in DE"), notice ? await has(notice) : await has("Luzern bei Nacht"));
await shot("g16-c09-german-only");

await t.finish();
