// 2.17: trip answers per order or booking (owner decision 14 Oct 2026). 375px, EN and DE.
// Run from a folder with playwright-core installed, next to a copy of 2.5-2.9-lib.mjs:
//   node 2.17-drive.mjs <repo root>
// Dev server without HMR: cd front-end && npx vite --config ../docs/ux/prototype/reports/1.6-vite.nohmr.mjs --port 5232 --strictPort
import { chooseDeparture, fillContact, start, submitReview, toReview } from "./2.5-2.9-lib.mjs";

const t = await start(process.env.SHOTS ?? "2.17");
const { page, check, wait, go, store, booking } = t;
const order = async (id) => (await store()).data.orders.find((o) => o.id === id);
const trip = (x) => JSON.stringify(x?.trip ?? null);
const region = () => page.getByRole("region", { name: /Help us understand your trip|Helfen Sie uns/ });
const sheet = () => page.getByRole("dialog").last();
const rawKeys = async () => (await page.locator("body").innerText()).match(/\b(tripCard|tripProfile|account)\.[a-zA-Z.]+/)?.[0] ?? null;
const viewport = async (name) => { await wait(350); await page.screenshot({ path: `${t.OUT}/${name}.png` }); };
// The language buttons sit under an open sheet's backdrop: click them in the page instead.
const lang = (id) => page.evaluate((id) => [...document.querySelectorAll('[aria-label="Language"] button')].find((b) => b.textContent.trim() === id)?.click(), id).then(() => wait(300));
const bothViewport = async (name) => {
  await viewport(`${name}-en`);
  await lang("DE");
  check(`no raw trip/account keys in DE (${name})`, !(await rawKeys()), (await rawKeys()) ?? "");
  await viewport(`${name}-de`);
  await lang("EN");
};
const both = async (name) => {
  await t.both(name);
  await t.lang("DE");
  check(`no raw trip/account keys in DE (${name})`, !(await rawKeys()), (await rawKeys()) ?? "");
  await t.lang("EN");
};
// The C15/C16 "Your trip" card: the section under its heading on the Overview tab.
const card = () => page.locator("section").filter({ has: page.getByRole("heading", { name: /^(Your trip|Ihre Reise)$/ }) }).last();
const cardText = async () => (await card().innerText()).replace(/[  ]/g, " ").replace(/\n+/g, " | ");

async function addGift(slug, variant, day) {
  await go(`/gifts/${slug}`);
  await wait(500);
  await page.getByRole("button", { name: /^Add to cart$/ }).last().click();
  const s = page.getByRole("dialog");
  await s.waitFor();
  if (variant) await s.getByRole("row", { name: new RegExp(variant) }).click();
  await s.getByRole("gridcell").filter({ hasText: new RegExp(`^${day}$`) }).first().click();
  await s.getByRole("radio", { name: /Shop Altstadt/ }).check({ force: true });
  await s.getByRole("button", { name: /Add to cart ·/ }).click();
  await wait(400);
}
// Cart → C06 → send; returns the new order ids from C07's URL.
async function send() {
  await go("/cart");
  await page.getByRole("checkbox", { name: "Select all" }).check({ force: true });
  await wait(300);
  await page.getByRole("button", { name: "Continue" }).click();
  await wait(1200);
  await wait(6000); // let the "Added to cart" toast expire
  await page.getByRole("button", { name: "Send request · no payment yet" }).click();
  await wait(1500);
  return decodeURIComponent(page.url().match(/orders=([^&]+)/)?.[1] ?? "").split(",").filter(Boolean);
}
// Picks a day in the date sheet a date-half button opens (within `scope`), then "Use this date".
async function pickDate(scope, half, day) {
  await scope.getByRole("button", { name: new RegExp(`^${half}`) }).click();
  const s = sheet();
  await s.getByRole("gridcell").filter({ hasText: new RegExp(`^${day}$`) }).first().click();
  await s.getByRole("button", { name: "Use this date" }).click();
  await wait(500);
}
const dateLabel = (scope, half) => scope.getByRole("button", { name: new RegExp(`^${half}`) }).getAttribute("aria-label");
const styleChecked = (scope, name) => scope.getByRole("radio", { name }).isChecked();

// --- Seed, upgrade, account ------------------------------------------------------------
await t.reset();
let s = await store();
check("seed: no per-guest tripProfiles in demo state", !("tripProfiles" in s.data));
check("seed: Anna's SK-1012 carries sample answers", trip(await order("sk-1012")) === JSON.stringify({ travelStyle: "independent", arriveOn: "2026-10-07", leaveOn: "2026-10-10", answeredAt: (await order("sk-1012")).createdAt }), trip(await order("sk-1012")));
check("seed: no other order or booking has trip answers", s.data.orders.filter((o) => o.trip).length === 1 && s.data.tours.bookings.every((b) => !b.trip));
// Upgrade: a store saved by the old build still holds the per-guest map; loading drops it.
await page.evaluate(() => { const d = JSON.parse(localStorage.getItem("sk.demo")); d.data.tripProfiles = { "g-anna": { travelStyle: "group" } }; localStorage.setItem("sk.demo", JSON.stringify(d)); });
await page.reload(); await wait(1000);
check("upgrade: stored tripProfiles dropped on load", !("tripProfiles" in (await store()).data));

await t.signIn();
await go("/account");
let body = await t.text();
check("account hub: no trip row text", !/trip|Reise/i.test(body), body.match(/.{0,30}(trip|Reise).{0,30}/i)?.[0] ?? "");
check("account hub: Preferences row is Language · English", /Language\s+English/.test(body), body.match(/Profile and preferences[\s\S]{0,80}/)?.[0]?.replace(/\n/g, " | "));
await both("account-hub");
await go("/account?tab=profile");
body = await t.text();
check("account Language screen: no trip card", !/Help us understand your trip|Your trip|Trip profile/.test(body) && /English/.test(body) && /Deutsch/.test(body));
await both("account-language");
await go("/account?tab=trip");
check("no trip sub-screen: /account?tab=trip renders the hub", /Your activity/.test(await t.text()) && !/Help us understand your trip|Your trip/.test(await t.text()));

// --- C15 seeded answered card ----------------------------------------------------------------
await go("/account/orders/sk-1012");
await wait(600);
check("C15 SK-1012: Your trip card answered", /On my own/.test(await cardText()) && /Wed 7 Oct/.test(await cardText()) && /Sat 10 Oct/.test(await cardText()) && /Edit answers/.test(await cardText()), await cardText());
check("C15 gift copy: doesn't change the pickup date", /don’t change the pickup date/.test(await cardText()));
await card().scrollIntoViewIfNeeded();
await both("c15-answered");

// --- C07: one send, two orders, answers land on both ------------------------------------------
await addGift("kapellbruecke-pocket-knife", "Medium", 21);
await addGift("lucerne-gift-box", null, 20);
const first = await send();
check("C07: one send created two orders", first.length === 2, first.join(","));
check("C07: form starts blank (no answered trip covers 20/21 Oct)", !(await styleChecked(region(), /With a tour group/)) && !(await styleChecked(region(), /On my own/)) && /Add date/.test(await dateLabel(region(), "Arrival")), await dateLabel(region(), "Arrival"));
check("C07 gift intro mentions pickup", /pickup dates/.test(await region().innerText()));
await region().getByText("With a tour group", { exact: true }).click();
await pickDate(region(), "Arrival", 19);
await pickDate(region(), "Departure", 23);
await region().getByRole("button", { name: "Save answers" }).click();
await wait(500);
const [a1, a2] = [await order(first[0]), await order(first[1])];
check("C07 answers land on every order from the send", a1.trip?.travelStyle === "group" && a1.trip?.arriveOn === "2026-10-19" && a1.trip?.leaveOn === "2026-10-23" && !!a1.trip?.answeredAt && trip(a1) === trip(a2), `${trip(a1)} / ${trip(a2)}`);
check("C07 answers touch no other purchase", (await store()).data.orders.filter((o) => o.trip).length === 3);
await region().scrollIntoViewIfNeeded();
await bothViewport("c07-answered");
await page.reload(); await wait(1500);
check("reload keeps C07 answers", /With a tour group/.test(await region().innerText()) && /Mon 19 Oct/.test(await region().innerText()), (await region().innerText()).replace(/\n+/g, " | "));

// --- Second send inside 19–23 Oct: pre-filled, then skipped -----------------------------------
await addGift("lucerne-gift-box", null, 22);
const second = await send();
check("C07 inside the trip: form pre-filled with the covering answers", (await styleChecked(region(), /With a tour group/)) && /Mon 19 Oct/.test(await dateLabel(region(), "Arrival")) && /Fri 23 Oct/.test(await dateLabel(region(), "Departure")), `${await dateLabel(region(), "Arrival")} / ${await dateLabel(region(), "Departure")}`);
check("pre-fill saves nothing by itself", !(await order(second[0])).trip);
await region().scrollIntoViewIfNeeded();
await bothViewport("c07-prefilled");
await region().getByRole("button", { name: "Skip" }).click();
await wait(400);
const skipped = await order(second[0]);
check("C07 Skip stores skippedAt on the order only", !!skipped.trip?.skippedAt && !skipped.trip?.travelStyle && !skipped.trip?.answeredAt, trip(skipped));
check("C07 skipped state: one line with Answer now", /You skipped the trip questions/.test(await region().innerText()) && (await region().getByRole("button", { name: "Answer now" }).count()) === 1);

// --- Third send outside 19–23 Oct: blank ------------------------------------------------------
await addGift("lucerne-gift-box", null, 27);
const third = await send();
check("C07 outside the trip (27 Oct): form blank", !(await styleChecked(region(), /With a tour group/)) && /Add date/.test(await dateLabel(region(), "Arrival")) && /Add date/.test(await dateLabel(region(), "Departure")), await dateLabel(region(), "Arrival"));
await region().scrollIntoViewIfNeeded();
await bothViewport("c07-outside-blank");

// --- C15: not answered → Answer now (pre-filled sheet); Edit on one order of a send ---------
await go(`/account/orders/${second[0]}`);
await wait(600);
check("C15 skipped order: not answered line + Answer now, gift copy", /Not answered yet\. Your answers don’t change the pickup date\./.test(await cardText()) && (await card().getByRole("button", { name: "Answer now" }).count()) === 1, await cardText());
await card().scrollIntoViewIfNeeded();
await both("c15-not-answered");
await t.keyboard("C15 'Answer now'", /^Answer now$/);
await card().getByRole("button", { name: "Answer now" }).click();
await sheet().waitFor(); await wait(500);
check("C15 sheet: same form, pre-filled from the covering trip", (await styleChecked(sheet(), /With a tour group/)) && /Mon 19 Oct/.test(await dateLabel(sheet(), "Arrival")), await dateLabel(sheet(), "Arrival"));
check("C15 sheet intro: pickup copy", /pickup dates/.test(await sheet().innerText()));
await bothViewport("c15-sheet");
// Nested date sheet: Escape closes only the date sheet.
await sheet().getByRole("button", { name: /^Departure/ }).click();
await wait(500);
check("C15: date sheet opens over the trip sheet", (await page.getByRole("dialog").count()) === 2);
await viewport("c15-sheet-date-en");
await page.keyboard.press("Escape"); await wait(600);
check("Escape closes only the date sheet", (await page.getByRole("dialog").count()) === 1);
await pickDate(sheet(), "Departure", 22);
check("C15 sheet: picked date shows in the trip sheet", /Thu 22 Oct/.test(await dateLabel(sheet(), "Departure")));
await sheet().getByRole("button", { name: "Save answers" }).click();
await wait(900);
check("C15 Answer now saved on this order", (await order(second[0])).trip?.leaveOn === "2026-10-22" && (await order(second[0])).trip?.travelStyle === "group", trip(await order(second[0])));
check("C15 card now answered with Edit answers", /Edit answers/.test(await cardText()) && /Thu 22 Oct/.test(await cardText()), await cardText());
check("focus returns to the card's button after Save", await page.evaluate(() => /Edit answers|Answer now/.test(document.activeElement?.textContent ?? "")), await page.evaluate(() => document.activeElement?.outerHTML.slice(0, 90)));

// Edit from C15 on one order of the first send: only that order changes (no shared send id).
await go(`/account/orders/${first[0]}`);
await wait(600);
await card().getByRole("button", { name: "Edit answers" }).click();
await sheet().waitFor(); await wait(400);
await sheet().getByText("On my own", { exact: true }).click();
await sheet().getByRole("button", { name: "Save answers" }).click();
await wait(900);
check("C15 Edit applies to that order only", (await order(first[0])).trip?.travelStyle === "independent" && (await order(first[1])).trip?.travelStyle === "group", `${trip(await order(first[0]))} / ${trip(await order(first[1]))}`);
check("C15 card shows the edit", /On my own/.test(await cardText()));
// Dismissing the sheet saves nothing.
await card().getByRole("button", { name: "Edit answers" }).click();
await sheet().waitFor(); await wait(400);
await sheet().getByText("With a tour group", { exact: true }).click();
await page.keyboard.press("Escape"); await wait(700);
check("dismissed sheet changes nothing", (await order(first[0])).trip?.travelStyle === "independent");

// --- C13: tour outside every trip → blank; answer; then a tour inside → pre-filled -------------
const book = async (slug, day, group) => {
  await chooseDeparture(t, slug, day, group);
  await toReview(t);
  await fillContact(t);
  await submitReview(t);
  return t.bookingIdFromUrl();
};
const later = await book("lake-lucerne-stories", "17 Oct", { adults: 2, children: 0, infants: 0 });
check("C13 reached (pay later)", page.url().endsWith(`/bookings/${later}/confirmed`), page.url());
check("C13 outside every trip (17 Oct): form blank", !(await styleChecked(region(), /On my own/)) && !(await styleChecked(region(), /With a tour group/)) && /Add date/.test(await dateLabel(region(), "Arrival")));
check("C13 tour intro: tour date, never pickup", /tour date/.test(await region().innerText()) && !/pickup|Abhol/i.test(await region().innerText()), (await region().innerText()).split("\n")[1]);
await region().getByText("On my own", { exact: true }).click();
await pickDate(region(), "Arrival", 16);
await pickDate(region(), "Departure", 18);
await region().getByRole("button", { name: "Save answers" }).click();
await wait(500);
check("C13 answers land on that booking", (await booking(later)).trip?.travelStyle === "independent" && (await booking(later)).trip?.arriveOn === "2026-10-16" && (await booking(later)).trip?.leaveOn === "2026-10-18", trip(await booking(later)));
await region().scrollIntoViewIfNeeded();
await t.lang("DE");
check("C13 DE: no pickup wording in the trip card", !/Abhol/i.test(await region().innerText()));
await t.lang("EN");
await bothViewport("c13-answered");

const dep = await book("lucerne-old-town-walk", "Fri 16 Oct", { adults: 2, children: 1, infants: 0 });
await page.getByRole("button", { name: /^Pay CHF 66\.90/ }).click();
await wait(1200);
check("C13 reached (deposit paid)", page.url().endsWith(`/bookings/${dep}/confirmed`), page.url());
check("C13 inside 16–18 Oct (tour on the arrival day): pre-filled", (await styleChecked(region(), /On my own/)) && /Fri 16 Oct/.test(await dateLabel(region(), "Arrival")) && /Sun 18 Oct/.test(await dateLabel(region(), "Departure")), `${await dateLabel(region(), "Arrival")} / ${await dateLabel(region(), "Departure")}`);
check("C13 pre-fill saves nothing by itself", !(await booking(dep)).trip);
await region().scrollIntoViewIfNeeded();
await bothViewport("c13-prefilled");
await region().getByRole("button", { name: "Save answers" }).click();
await wait(500);
check("C13 saved pre-filled answers on that booking", (await booking(dep)).trip?.leaveOn === "2026-10-18");

// Across types: a tour on 20 Oct pre-fills from the gift answers (19–23 Oct). SK-1043's edit is the
// newest covering answer, so its "On my own" wins over SK-1044/SK-1045's "With a tour group".
const cross = await book("lucerne-old-town-walk", "Tue 20 Oct", { adults: 2, children: 0, infants: 0 });
await page.getByRole("button", { name: /^Pay CHF 178\.00/ }).click();
await wait(1200);
check("C13 tour inside a gift trip: pre-filled from the newest covering order", page.url().endsWith(`/bookings/${cross}/confirmed`) && (await styleChecked(region(), /On my own/)) && /Mon 19 Oct/.test(await dateLabel(region(), "Arrival")) && /Fri 23 Oct/.test(await dateLabel(region(), "Departure")), `${await dateLabel(region(), "Arrival")} / ${await dateLabel(region(), "Departure")}`);
check("cross-type pre-fill saves nothing by itself", !(await booking(cross)).trip);

// --- C16: edit; skip on the seeded booking's C13, then C16 not answered ------------------------
await go(`/account/bookings/${later}`);
await wait(600);
check("C16 card answered, tour copy, no pickup", /On my own/.test(await cardText()) && /don’t change the tour date/.test(await cardText()) && !/pickup/i.test(await cardText()), await cardText());
await card().scrollIntoViewIfNeeded();
await both("c16-answered");
await card().getByRole("button", { name: "Edit answers" }).click();
await sheet().waitFor(); await wait(400);
check("C16 sheet intro: tour date, never pickup", /tour date/.test(await sheet().innerText()) && !/pickup/i.test(await sheet().innerText()));
await sheet().getByText("With a tour group", { exact: true }).click();
await bothViewport("c16-sheet");
await sheet().getByRole("button", { name: "Save answers" }).click();
await wait(900);
check("C16 Edit applies to that booking only", (await booking(later)).trip?.travelStyle === "group" && (await booking(dep)).trip?.travelStyle === "independent", `${trip(await booking(later))} / ${trip(await booking(dep))}`);

await go("/account/bookings/tour-anna/confirmed");
await wait(700);
await region().getByRole("button", { name: "Skip" }).click();
await wait(400);
check("C13 Skip stores skippedAt on that booking", !!(await booking("tour-anna")).trip?.skippedAt && !(await booking("tour-anna")).trip?.answeredAt, trip(await booking("tour-anna")));
await go("/account/bookings/tour-anna");
await wait(600);
check("C16 skipped booking: not answered line with tour copy + Answer now", /Not answered yet\. Your answers don’t change the tour date\./.test(await cardText()) && (await card().getByRole("button", { name: "Answer now" }).count()) === 1, await cardText());
await t.lang("DE");
check("C16 DE: tour copy, no Abhol", /Tourdatum/.test(await cardText()) && !/Abhol/.test(await cardText()), await cardText());
await t.lang("EN");
await card().scrollIntoViewIfNeeded();
await both("c16-not-answered");

// --- Reload keeps answers; Reset restores the seed ---------------------------------------------
await page.reload(); await wait(1500);
check("reload keeps C16 skip and answers", /Not answered yet/.test(await cardText()) && (await booking(later)).trip?.travelStyle === "group" && (await order(first[1])).trip?.arriveOn === "2026-10-19");
await t.control("Reset demo");
await wait(800);
s = await store();
check("Reset restores the seed: only SK-1012 has answers, no bookings do", s.data.orders.filter((o) => o.trip).map((o) => o.id).join(",") === "sk-1012" && s.data.tours.bookings.every((b) => !b.trip) && !("tripProfiles" in s.data), s.data.orders.filter((o) => o.trip).map((o) => o.id).join(","));

await t.finish();
