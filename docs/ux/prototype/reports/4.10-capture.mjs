// 4.10 M13 Edit tour and departures check (A4, R02, outline step 10): the walk from M11; the
// upcoming departures with M05's seat counts; seats below booked blocked, a valid change on M05;
// a new departure (Zurich time after the 25 Oct clock change) on M13, M05 and the guest C10
// sheet with the same seats; the deposit balance at 18:00 the day before; no date and a past
// start blocked; DE missing saves with a warning; a new adult price on C09; the age-group rule.
// 375px, DPR 2, EN and DE; one 1280px shot.
// Revision 1: the language tabs are scoped to the first set (text), as M12/M13 now also
// have the long story's tabs.
// Revision 2: adapted to the stepper. Departures live on the Departures step (?step=departures),
// prices and ages on Prices & age groups, the summary on Basics; the 1280px check is the
// step list in the left column (the right-hand Visibility card is gone).
// Run from a folder with playwright-core: node 4.10-capture.mjs <screens dir>
import { chromium } from "playwright-core";
import { mkdirSync, readdirSync } from "node:fs";

const BASE = process.env.BASE ?? "http://localhost:5251/";
const OUT = process.argv[2];
mkdirSync(OUT, { recursive: true });
const home = `${process.env.HOME}/.cache/ms-playwright`;
const dir = readdirSync(home).filter((d) => d.startsWith("chromium_headless_shell")).sort().pop();
const browser = await chromium.launch({ executablePath: `${home}/${dir}/chrome-headless-shell-linux64/chrome-headless-shell` });

let pass = 0, fail = 0;
const check = (name, ok, detail = "") => {
  ok ? pass++ : fail++;
  console.log(`${ok ? "PASS" : "FAIL"} ${name}${detail === "" ? "" : ` | ${typeof detail === "string" ? detail : JSON.stringify(detail)}`}`);
};
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const DEMO_START = Date.parse("2026-10-13T10:00:00+02:00");
const copy = {
  en: { tours: "Tours", walk: "Lucerne old-town walk", changeSeats: "Change seats", day16: /16 Oct 2026/, seats: "Seats", saveSeats: "Save seats", belowTaken: (n) => `${n} seats are already booked or held. Seats can’t go below that.`, seatsSaved: "Seats saved", booked: (n, c) => `${n} of ${c} booked`, add: "Add departure", datePick: "Choose a date", full: "Pay in full", deposit: "30% deposit", added: "Departure added", dateError: "Choose a date.", past: "Choose a start after now.", available: (n) => `${n} seats available`, german: "German", summary: "Summary", deWarning: "German is missing: summary.", save: "Save changes", saved: "Saved. Guests see the change now.", deMissing: "DE missing", adultPrice: "Price", fromAge: "From age", ageError: "Adults must start at a higher age than children.", newRow: /27 Oct 2026, 09:30/, allSteps: "All steps", departuresStep: "Departures" },
  de: { tours: "Touren", walk: "Altstadtspaziergang Luzern", changeSeats: "Plätze ändern", day16: /16\.10\.2026/, seats: "Plätze", saveSeats: "Plätze speichern", belowTaken: (n) => `${n} Plätze sind schon gebucht oder reserviert. Weniger Plätze gehen nicht.`, seatsSaved: "Plätze gespeichert", booked: (n, c) => `${n} von ${c} gebucht`, add: "Termin hinzufügen", datePick: "Datum wählen", full: "Ganz bezahlen", deposit: "30 % Anzahlung", added: "Termin hinzugefügt", dateError: "Wählen Sie ein Datum.", past: "Wählen Sie einen Beginn nach jetzt.", available: (n) => `${n} Plätze verfügbar`, german: "Deutsch", summary: "Kurzbeschreibung", deWarning: "Auf Deutsch fehlt: Kurzbeschreibung.", save: "Änderungen speichern", saved: "Gespeichert. Gäste sehen die Änderung sofort.", deMissing: "DE fehlt", adultPrice: "Preis", fromAge: "Ab Alter", ageError: "Erwachsene müssen bei einem höheren Alter beginnen als Kinder.", newRow: /27\.10\.2026, 09:30/, allSteps: "Alle Schritte", departuresStep: "Termine" },
};

async function setup(page, lang) {
  await page.goto(BASE);
  await page.evaluate((l) => { localStorage.clear(); localStorage.setItem("sk.language", JSON.stringify(l)); }, lang);
  await page.reload();
  await wait(800);
  await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem("sk.demo"));
    s.role = "owner";
    localStorage.setItem("sk.demo", JSON.stringify(s));
  });
  await page.reload();
  await wait(800);
}
const open = async (page, hash) => { await page.goto(`${BASE}${hash}`); await wait(800); };
// M05 now lists ten departures a page (pagination added after 4.10): page on until the row shows.
async function m05Row(page, id, lang) {
  const row = page.locator(`a[href*="departures/${id}"]`).first();
  const next = page.getByRole("navigation", { name: lang === "en" ? "Pages" : "Seiten" }).first().getByRole("button", { name: lang === "en" ? "Next" : "Weiter" });
  for (let i = 0; i < 5 && (await row.count()) === 0 && (await next.count()) && (await next.isEnabled()); i++) { await next.click(); await wait(400); }
  return row;
}
const tours = (page) => page.evaluate(() => JSON.parse(localStorage.getItem("sk.demo")).data.tours);
const demoNow = (page) => page.evaluate((start) => start + Date.now() - JSON.parse(localStorage.getItem("sk.demo")).clockStartedAt, DEMO_START);
const seatsOf = (data, id, now) => {
  const people = (b) => b.adults + b.children;
  const list = data.bookings.filter((b) => b.departureId === id);
  return {
    confirmed: list.filter((b) => !["pending_payment", "expired", "cancelled"].includes(b.status)).reduce((s, b) => s + people(b), 0),
    held: list.filter((b) => b.status === "pending_payment" && Date.parse(b.holdUntil) > now).reduce((s, b) => s + people(b), 0),
  };
};

for (const lang of ["en", "de"]) {
  const c = copy[lang];
  const page = await browser.newPage({ viewport: { width: 375, height: 812 }, deviceScaleFactor: 2, reducedMotion: "reduce" });
  page.setDefaultTimeout(5000);
  const errors = [];
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  page.on("pageerror", (e) => errors.push(String(e)));
  const overflow = () => page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  await setup(page, lang);
  const data0 = await tours(page);
  const now = await demoNow(page);

  // From M11 to M13.
  await open(page, "#/store/products?tab=tours");
  await page.getByRole("list", { name: c.tours }).getByRole("listitem").filter({ hasText: c.walk }).getByRole("link").click();
  await wait(900);
  check(`[${lang}] the M11 ticket opens M13`, page.url().endsWith("#/store/products/tours/old-town"), page.url());
  check(`[${lang}] M13 h1 is the tour name`, (await page.getByRole("heading", { level: 1 }).innerText()) === c.walk);
  // Revision 2: the departures are step 4; reach it through the phone's "All steps" sheet.
  await page.getByRole("button", { name: c.allSteps }).click();
  await wait(500);
  await page.getByRole("dialog").getByRole("button", { name: new RegExp(`^${c.departuresStep}`) }).click();
  await wait(600);
  check(`[${lang}] "All steps" opens the Departures step`, page.url().endsWith("?step=departures") && (await page.locator("#step-title").innerText()).includes(c.departuresStep), page.url());
  const expected = data0.departures.filter((d) => d.tourId === "old-town" && !d.cancelledAt && Date.parse(d.startsAt) + 120 * 60_000 > now).length;
  const rows = page.getByRole("button", { name: new RegExp(`^${c.changeSeats}`) });
  check(`[${lang}] every upcoming departure of the walk is listed`, (await rows.count()) === expected, { shown: await rows.count(), expected });
  const s16 = seatsOf(data0, "walk-16", now);
  const row16 = rows.filter({ hasText: c.booked(s16.confirmed, 12) });
  check(`[${lang}] walk-16 shows the seats M05 counts (${s16.confirmed} of 12)`, (await row16.count()) === 1 && c.day16.test(await row16.getAttribute("aria-label")));
  await page.screenshot({ path: `${OUT}/m13-top-${lang}.png` });

  // A4: seats can't go below the seats already booked or held.
  const taken = s16.confirmed + s16.held;
  await row16.click();
  await wait(600);
  let sheet = page.getByRole("dialog");
  const seatsField = sheet.getByLabel(c.seats, { exact: true });
  await seatsField.fill(String(taken - 1));
  await seatsField.press("Tab");
  await sheet.getByRole("button", { name: c.saveSeats }).click();
  await wait(300);
  check(`[${lang}] ${taken - 1} seats: blocked below the ${taken} booked or held`, await sheet.getByText(c.belowTaken(taken)).isVisible());
  check(`[${lang}] nothing saved`, (await tours(page)).departures.find((d) => d.id === "walk-16").capacity === 12);
  await page.screenshot({ path: `${OUT}/m13-seats-below-${lang}.png` });
  await seatsField.fill("10");
  await seatsField.press("Tab");
  await sheet.getByRole("button", { name: c.saveSeats }).click();
  await wait(600);
  check(`[${lang}] 10 seats saved`, (await tours(page)).departures.find((d) => d.id === "walk-16").capacity === 10 && (await page.getByText(c.seatsSaved).first().isVisible()));
  check(`[${lang}] the M13 row shows ${s16.confirmed} of 10`, (await rows.filter({ hasText: c.booked(s16.confirmed, 10) }).count()) === 1);
  await open(page, "#/store/bookings");
  check(`[${lang}] M05 shows walk-16 with 10 seats`, /10/.test(await page.locator('a[href*="departures/walk-16"]').first().innerText()) && (await page.locator('a[href*="departures/walk-16"]').first().innerText()).includes(lang === "en" ? `${s16.confirmed} of 10` : `${s16.confirmed} von 10`));

  // New departure: no date, then a past start, then Tue 27 Oct 09:30 (CET), 8 seats, full.
  await open(page, "#/store/products/tours/old-town?step=departures");
  await page.getByRole("button", { name: c.add }).first().click();
  await wait(600);
  sheet = page.getByRole("dialog");
  await sheet.getByLabel(c.seats, { exact: true }).fill("8");
  await sheet.getByLabel(c.seats, { exact: true }).press("Tab");
  await sheet.getByRole("radio", { name: c.full }).check({ force: true });
  await sheet.getByRole("button", { name: c.add }).click();
  await wait(300);
  check(`[${lang}] no date: the error shows`, await sheet.getByText(c.dateError).isVisible());
  const pickDay = async (day) => {
    await sheet.getByRole("button", { name: c.datePick }).click();
    await wait(400);
    await page.locator('[data-slot="calendar-cell"]:not([data-outside-month])').filter({ hasText: new RegExp(`^${day}$`) }).first().click();
    await wait(300);
  };
  const setTime = async (hh, mm) => {
    const hour = sheet.locator('[data-type="hour"]');
    await hour.click();
    await page.keyboard.type(hh);
    await page.keyboard.type(mm);
    await wait(200);
  };
  await pickDay(13);
  await setTime("08", "00");
  await sheet.getByRole("button", { name: c.add }).click();
  await wait(300);
  check(`[${lang}] today at 08:00 (before the demo now): the error shows`, await sheet.getByText(c.past).isVisible());
  check(`[${lang}] past days are off in the calendar`, await (async () => {
    await sheet.getByRole("button", { name: c.datePick }).click();
    await wait(400);
    const off = await page.locator('[data-slot="calendar-cell"]:not([data-outside-month])').filter({ hasText: /^12$/ }).first().getAttribute("aria-disabled");
    await page.keyboard.press("Escape");
    await wait(300);
    return off === "true";
  })());
  await page.screenshot({ path: `${OUT}/m13-new-errors-${lang}.png` });
  await pickDay(27);
  await setTime("09", "30");
  await page.screenshot({ path: `${OUT}/m13-new-departure-${lang}.png` });
  await sheet.getByRole("button", { name: c.add }).click();
  await wait(700);
  const added = (await tours(page)).departures.filter((d) => !data0.departures.some((x) => x.id === d.id));
  check(`[${lang}] one departure added: 09:30 Zurich on 27 Oct is 08:30 UTC (winter time), 8 seats, full, due at the start, open`, added.length === 1 && added[0].tourId === "old-town" && added[0].startsAt === "2026-10-27T08:30:00.000Z" && added[0].capacity === 8 && added[0].policy === "full" && added[0].balanceDueAt === added[0].startsAt && added[0].closed === false, added);
  check(`[${lang}] the toast confirms`, await page.getByText(c.added).first().isVisible());
  const newRow = rows.filter({ hasText: c.booked(0, 8) });
  check(`[${lang}] M13 lists it with 0 of 8 booked`, (await newRow.count()) === 1 && c.newRow.test(await newRow.getAttribute("aria-label")));
  await open(page, "#/store/bookings");
  const m05 = await m05Row(page, added[0].id, lang);
  check(`[${lang}] M05 lists it with the same seats`, (await m05.count()) === 1 && (await m05.innerText()).includes(lang === "en" ? "0 of 8" : "0 von 8"));
  await open(page, "#/tours/lucerne-old-town-walk?book=true");
  await wait(600);
  const c10 = page.getByRole("dialog").locator("label").filter({ hasText: "09:30" }).filter({ hasText: /27/ });
  check(`[${lang}] C10 offers it with ${8} seats available`, (await c10.count()) === 1 && (await c10.innerText()).includes(c.available(8)), await c10.count());
  await page.screenshot({ path: `${OUT}/c10-new-departure-${lang}.png` });
  await page.keyboard.press("Escape");

  // A deposit departure: the rest is due at 18:00 Zurich the day before.
  await open(page, "#/store/products/tours/old-town?step=departures");
  await page.getByRole("button", { name: c.add }).first().click();
  await wait(600);
  sheet = page.getByRole("dialog");
  await pickDay(28);
  await sheet.getByRole("radio", { name: c.deposit }).check({ force: true });
  await sheet.getByRole("button", { name: c.add }).click();
  await wait(700);
  const dep = (await tours(page)).departures.find((d) => d.startsAt.startsWith("2026-10-28"));
  check(`[${lang}] deposit departure: balance due 27 Oct 18:00 Zurich (17:00 UTC)`, dep?.policy === "deposit" && dep.balanceDueAt === "2026-10-27T17:00:00.000Z", dep);

  // DE missing is a warning: clear the German summary, it saves, M11 shows DE missing.
  // Revision 2: the summary is on Basics, which has its own EN | DE tabs; saved from there.
  await open(page, "#/store/products/tours/old-town");
  await page.getByRole("tab", { name: new RegExp(`^${c.german}`) }).first().click();
  await wait(200);
  await page.getByLabel(c.summary, { exact: true }).fill("");
  check(`[${lang}] the German tab warns about the summary`, await page.getByText(c.deWarning).isVisible());
  await page.getByText(c.deWarning).scrollIntoViewIfNeeded();
  await page.screenshot({ path: `${OUT}/m13-de-missing-${lang}.png` });
  await page.getByRole("button", { name: c.save }).click();
  await wait(500);
  const walk = (await tours(page)).tours.find((t) => t.id === "old-town");
  check(`[${lang}] saved with the German summary missing, still published`, !walk.summary.de && walk.published === true && (await page.getByRole("status").filter({ hasText: c.saved }).isVisible()));
  await open(page, "#/store/products?tab=tours");
  check(`[${lang}] M11: the walk shows DE missing`, (await page.getByRole("list", { name: c.tours }).getByRole("listitem").filter({ hasText: c.walk }).innerText()).includes(c.deMissing));

  // Adult price 95 reaches C09; the age rule blocks adults at or below the children's age.
  // Revision 2: on the Prices & age groups step.
  await open(page, "#/store/products/tours/old-town?step=prices");
  const priceField = page.getByLabel(c.adultPrice, { exact: true }).first();
  await priceField.fill("95");
  await priceField.press("Tab");
  const adultAge = page.getByLabel(c.fromAge, { exact: true }).first();
  await adultAge.fill("6");
  await adultAge.press("Tab");
  await page.getByRole("button", { name: c.save }).click();
  await wait(500);
  check(`[${lang}] adults from 6 with children from 6: blocked with the age error`, (await page.getByText(c.ageError).isVisible()) && (await tours(page)).tours.find((t) => t.id === "old-town").adultPrice === 8900);
  check(`[${lang}] focus moves to the adults' age`, await adultAge.evaluate((el) => el === document.activeElement));
  await page.screenshot({ path: `${OUT}/m13-age-error-${lang}.png` });
  await adultAge.fill("16");
  await adultAge.press("Tab");
  await page.getByRole("button", { name: c.save }).click();
  await wait(500);
  check(`[${lang}] adult price CHF 95 saved`, (await tours(page)).tours.find((t) => t.id === "old-town").adultPrice === 9500);
  await open(page, "#/store/products/tours/old-town?step=departures");
  check(`[${lang}] the departure rows show the new adult price`, /CHF\s95\.00/.test(await rows.first().innerText()));
  await open(page, "#/tours/lucerne-old-town-walk");
  check(`[${lang}] C09 shows CHF 95.00`, /CHF\s95\.00/.test(await page.locator("body").innerText()));

  if (lang === "en") {
    await page.setViewportSize({ width: 1280, height: 900 });
    await open(page, "#/store/products/tours/old-town?step=departures");
    // Revision 2: no Visibility card any more; the seven steps are a numbered list in a left
    // column, the step's fields to its right.
    const stepButtons = page.getByRole("navigation", { name: "Steps" }).getByRole("button");
    const boxes = await stepButtons.evaluateAll((els) => els.map((el) => { const r = el.getBoundingClientRect(); return { left: Math.round(r.left), top: Math.round(r.top), right: Math.round(r.right) }; }));
    const titleLeft = await page.locator("#step-title").evaluate((el) => el.getBoundingClientRect().left);
    check(`[en] 1280px: the seven steps listed down the left of the departures, step 4 current`, boxes.length === 7 && new Set(boxes.map((b) => b.left)).size === 1 && boxes.every((b, i) => i === 0 || b.top > boxes[i - 1].top) && titleLeft > boxes[0].right && (await stepButtons.nth(3).getAttribute("aria-current")) === "step" && !(await page.getByRole("button", { name: "All steps" }).isVisible()), { boxes, titleLeft });
    await page.screenshot({ path: `${OUT}/m13-desktop-en.png` });
    await page.setViewportSize({ width: 375, height: 812 });
  }
  check(`[${lang}] no horizontal overflow`, !(await overflow()));
  check(`[${lang}] no console errors`, errors.length === 0, errors);
  await page.close();
}

await browser.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
