// 2.15 cross-cutting checks: keyboard and focus, validation, empty and loading states, refresh,
// Reset and the old-demo-data caveat. node 2.15-checks.mjs en|de (375px).
import { bookingIdFromUrl, chooseDeparture, start } from "./2.15-lib.mjs";

const L = process.argv[2] === "de" ? "de" : "en";
const t = await start(L, { webgl: true });
const { page, T, rx, check, wait, has, go, text, shot, booking, control, viewAs, keyboard, patch } = t;
const SLUG = "lucerne-old-town-walk";
const value = (label) => page.getByLabel(label, { exact: false }).first().inputValue();

await t.reset();
await t.signIn("/tours");

// ---- Keyboard only: C10 → C11 → C12 → C13 ----
await go(`/tours/${SLUG}/book`);
await page.locator('input[type=radio][value="walk-16"]').focus();
await page.keyboard.press("ArrowDown");
await wait(300);
check("C10 departures: arrow keys move the selection (sold-out 18 Oct skipped)", (await t.tours()).draft.departureId === "walk-20", (await t.tours()).draft.departureId);
await page.locator('button[slot="increment"]').nth(0).focus();
await page.keyboard.press("Enter");
await wait(300);
check("C10 stepper works with the keyboard", (await t.tours()).draft.adults === 3);
await keyboard("C10 Review booking", new RegExp("^" + rx("tourDiscovery.review", { total: "" }).source));
await page.keyboard.press("Enter");
await wait(900);
check("Enter on Review booking opens C11", page.url().endsWith("/book/review"));
await page.getByLabel(T("tourBooking.name"), { exact: false }).first().focus();
await page.keyboard.type("Anna Keller");
await page.keyboard.press("Tab");
await page.keyboard.type("+41 79 123 45 67");
await page.keyboard.press("Enter");
await wait(1000);
const kb = bookingIdFromUrl(page);
check("C11 submits with Enter from the phone field", /\/pay$/.test(page.url()) && !!kb, page.url());
await keyboard("C12 Pay", /^(Pay CHF|CHF .* bezahlen)/);
await page.keyboard.press("Enter");
await wait(1100);
check("C12 pays with Enter and opens C13", page.url().endsWith("/confirmed") && (await booking(kb)).status === "confirmed");

// ---- Gift regression: C14 card → C15 → C12 → paid, keyboard only (shared payment page) ----
await control("Add sample orders in every state");
const due = (await t.store()).data.orders.find((o) => o.guestId === "g-anna" && o.status === "accepted" && o.lines[0].productId === "p-knife");
await go("/account?tab=orders");
const tabTo = async (re, max = 80) => {
  for (let i = 0; i < max; i++) {
    await page.keyboard.press("Tab");
    const name = t.norm(await page.evaluate(() => document.activeElement?.getAttribute("aria-label") || document.activeElement?.innerText || ""));
    if (re.test(name)) return true;
  }
  return false;
};
await page.evaluate(() => { document.activeElement?.blur(); window.scrollTo(0, 0); });
check("gift C14: Tab reaches the knife order that is due", await tabTo(/(pocket knife|Taschenmesser)[^]*(payment due|Zahlung fällig)/i));
await page.keyboard.press("Enter");
await wait(1200);
check("gift C14: Enter opens C15", page.url().includes(`/account/orders/${due.id}`), page.url());
check("gift C15: Tab reaches Pay", await tabTo(/54\.00/));
await page.keyboard.press("Enter");
await wait(1200);
check("gift C15: Enter opens C12", /\/pay$/.test(page.url()), page.url());
check("gift C12: Tab reaches Pay", await tabTo(/54\.00/));
await page.keyboard.press("Enter");
await wait(1300);
check("gift C12: Enter pays; C15 shows paid", !/\/pay$/.test(page.url()) && (await t.store()).data.orders.find((o) => o.id === due.id).payments.some((p) => p.status === "succeeded"));
await shot("c09-gift-c15-paid");

// ---- Validation ----
// Steppers stop at the seats left, so the group can only exceed capacity by switching departure.
await chooseDeparture(t, SLUG, "walk-20", { adults: 4, children: 0, infants: 0 });
await page.locator('input[type=radio][value="walk-23"]').locator("xpath=ancestor::label[1]").click();
await wait(400);
check("C10 above capacity: message and Review disabled", (await has(T("tourDiscovery.capacityError"))) && (await page.getByRole("button", { name: T("tourDiscovery.review", { total: "" }) }).isDisabled()));
await shot("c01-c10-over-capacity");
await chooseDeparture(t, SLUG, "walk-16", { adults: 2, children: 0, infants: 0 });
await page.getByRole("button", { name: T("tourDiscovery.review", { total: "" }) }).click();
await wait(800);
await page.getByLabel(T("tourBooking.name"), { exact: false }).first().fill("");
await page.locator("form button[type=submit]").click();
await wait(500);
const invalid = await page.getByLabel(T("tourBooking.name"), { exact: false }).first().evaluate((el) => !el.validity.valid || el.getAttribute("aria-invalid") === "true");
check("C11 empty name: required field blocks the submit", invalid && page.url().endsWith("/book/review"));
await page.getByLabel(T("tourBooking.name"), { exact: false }).first().fill("Anna Keller");
await page.getByLabel(T("tourBooking.phone"), { exact: false }).first().fill("12");
await page.locator("form button[type=submit]").click();
await wait(700);
check("C11 invalid phone: error, inputs kept", (await has(T("tourBooking.error.contact"))) && (await value(T("tourBooking.name"))) === "Anna Keller");
await shot("c02-c11-invalid-phone");

// Refresh keeps the C10 selection and the C11 inputs.
await page.reload(); await wait(1000);
check("refresh on C11 keeps the inputs", (await value(T("tourBooking.name"))) === "Anna Keller" && (await value(T("tourBooking.phone"))) === "12");
await go(`/tours/${SLUG}/book`);
await page.reload(); await wait(900);
check("refresh on C10 keeps the selection", (await page.locator('input[type=radio][value="walk-16"]').isChecked()) && (await t.tours()).draft.adults === 2);

// C18 review without stars (completed sample from the guest-booking control).
// C10 is a sheet on C09 since 2.4-r5: close it so the prototype bar is reachable.
await page.keyboard.press("Escape"); await wait(600);
await control("Add sample tour bookings in every state");
const done = (await t.tours()).bookings.find((x) => x.id === "tb-demo-completed");
await go(`/account/bookings/${done.id}`);
await page.getByRole("button", { name: T("review.write") }).click();
await wait(700);
await page.getByRole("dialog").getByRole("button", { name: T("review.submit") }).click();
await wait(500);
check("C18 without stars: asks for 1 to 5 stars", await has(T("review.rating.error")));
await shot("c03-c18-no-stars", { full: false });
await page.keyboard.press("Escape");
await wait(400);

// ---- Merchant: keyboard on M06 results, M08 amount above the balance, refresh ----
await viewAs("Merchant · Owner");
await go("/store/bookings/departures/walk-13");
await keyboard("M06 No-show for a booking", new RegExp("^" + T("tourMerchant.noShow") + "$"));
await page.keyboard.press("Enter");
await wait(600);
check("M06 result asks first (keyboard opens the dialog)", (await page.getByRole("alertdialog").count()) === 1);
await page.keyboard.press("Escape");
await wait(500);
check("Escape cancels: nothing recorded", (await page.getByRole("alertdialog").count()) === 0 && (await booking("tour-anna")).status === "confirmed");
await go("/store/bookings/tour-anna");
await page.getByRole("button", { name: T("fulfilment.action.record") }).first().click();
await wait(700);
const input = page.getByRole("dialog").last().getByRole("textbox").first();
await input.click(); await input.press("ControlOrMeta+a"); await input.fill("999"); await input.press("Tab"); await wait(400);
const save = page.getByRole("dialog").last().getByRole("button", { name: new RegExp(T("recordPayment.confirm.cash").replace(/[.*+?^$()|[\]\\]/g, "\\$&").replace(/\\?\{\w+\\?\}/g, ".+")) });
check("M08 amount above the balance: field invalid with an error, save disabled", (await input.getAttribute("aria-invalid")) === "true" && (await save.isDisabled()), await input.inputValue());
await shot("c08-m08-above-balance", { full: false });
await page.getByRole("dialog").last().getByRole("button", { name: T("merchantOrder.sheet.back") }).click();
await wait(500);
await page.reload(); await wait(1000);
check("refresh on M07 keeps the booking and balance", (await has("SK-T1042")) && (await has("156.10")));

// ---- Empty states ----
check("prototype control empties the tour list", await control("Empty the tour list"));
await wait(500);
check("C08 empty state", (await has(T("tourDiscovery.empty"))));
await shot("c04-c08-empty");
await viewAs("Merchant · Owner");
await go("/store/bookings");
check("M05 empty state", await has(T("tourMerchant.noDepartures")));
await shot("c05-m05-empty");
await go("/store");
check("M02 tour card empty state", await has(T("tourMerchant.todayEmpty")));

// ---- Reset restores fixtures, clock and drafts; old demo data needs Reset ----
await t.drawer();
await page.getByRole("button", { name: "Reset demo" }).click();
await wait(1200);
const fresh = await t.tours();
check("Reset: seeded tours, departures and bookings return; samples removed", fresh.tours.length === 5 && fresh.bookings.some((b) => b.ref === "SK-T2001") && !fresh.bookings.some((b) => b.id.startsWith("tb-demo-")));
check("Reset: demo clock restarts at 13 Oct 10:00", Math.abs((await t.demoNow()) - Date.parse("2026-10-13T10:00:00+02:00")) < 60000);
await patch('s.data.tours.departures = s.data.tours.departures.filter((d) => d.id !== "walk-23"); s.data.tours.bookings = s.data.tours.bookings.filter((b) => b.departureId !== "walk-23");');
await go(`/tours/${SLUG}/book`);
check("old stored demo data stays until Reset (known caveat): 23 Oct missing", (await page.locator('input[type=radio][value="walk-23"]').count()) === 0);
// C10 is a sheet on C09 since 2.4-r5: close it so the prototype bar is reachable.
await page.keyboard.press("Escape"); await wait(600);
await t.drawer();
await page.getByRole("button", { name: "Reset demo" }).click();
await wait(1200);
await go(`/tours/${SLUG}/book`);
check("after Reset the 23 Oct departure is back", (await page.locator('input[type=radio][value="walk-23"]').count()) === 1);
// Since 2.4-r5 C10 is a modal sheet on C09: close it so the prototype bar's "View as" is reachable.
await page.keyboard.press("Escape");
await wait(500);

// ---- Known caveat: the overdue check runs only while a merchant screen is open ----
await viewAs("Guest");
await t.signIn("/account?tab=bookings");
await patch("s.clockStartedAt -= 8.5 * 3600000"); // demo time 18:30, past SK-T2001's 18:00 deadline
await go("/account/bookings/tc-anna-overdue");
check("caveat: before any merchant screen, guest C16 shows 'Balance overdue', not cancelled", (await has(T("tours.payment.overdue"))) && (await booking("tc-anna-overdue")).status === "confirmed");
await shot("c10-c16-overdue-before-merchant-check");
await viewAs("Merchant · Owner");
await wait(800);
check("caveat: opening M02 runs the check and cancels under the tour's policy", (await booking("tc-anna-overdue")).status === "cancelled");
await viewAs("Guest");
await go("/account/bookings/tc-anna-overdue");
check("caveat: guest C16 then shows cancelled, 'Paid · nothing more owed'", (await has(T("tours.status.cancelled"))) && (await has(T("tours.payment.closed"))));

// ---- Loading and error states of the C09 map ----
await page.route(/openfreemap/, async (route) => { await new Promise((r) => setTimeout(r, 4000)); await route.abort(); });
await go(`/tours/${SLUG}`);
await page.evaluate(() => window.scrollBy(0, document.querySelector(".tour-map-frame").getBoundingClientRect().top - 72));
await wait(800);
check("C09 map loading state while the map service is slow", await has(T("tourMap.loading")));
await shot("c06-c09-map-loading", { full: false });
let failed = false;
for (let i = 0; i < 30 && !failed; i++) { failed = await has(T("tourMap.unavailable")); if (!failed) await wait(500); }
check("C09 map error state when the map service fails; stops stay usable", failed && (await page.getByRole("button", { name: T("tourMap.retry") }).count()) === 1);
await shot("c07-c09-map-error", { full: false });
await page.unroute(/openfreemap/);

await t.finish();
