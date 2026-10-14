// Round 2 restyle evidence (worker R3): gift-vs-tour screenshot pairs for 2.10–2.14 at 375 and 1024.
// Writes screens/2.N-r2/<screen>-<width>-gift-en.png, -tour-en.png and -tour-de.png, with the lib's
// overflow and raw-key checks on every shot. Run next to 2.10-lib.mjs: node 2.10-r2-capture.mjs
import * as d from "./2.10-lib.mjs";

/** First gift order in the given status (gift orders are created by the demo seed at runtime). */
const order = async (page, status, owing) =>
  (await d.state(page)).data.orders.find(
    (o) =>
      o.status === status &&
      (owing === undefined ||
        owing ===
          o.payments.filter((p) => p.status === "succeeded").reduce((s, p) => s + p.amount, 0) <
            o.lines.reduce((s, l) => s + l.unitPrice * l.quantity, 0)),
  )?.id;

async function tourPair(page, step, name, selector = null) {
  await d.shot(page, step, `${name}-tour-en`, true, selector);
  await d.setLang(page, "DE");
  await d.shot(page, step, `${name}-tour-de`, true, selector);
  await d.setLang(page, "EN");
}

for (const width of [375, 1024]) {
  console.log(`\n=== width ${width}`);
  const { browser, page } = await d.open(width);
  await d.reset(page, "owner");

  // 2.10 M02: the gift Today part (tiles, pickups, still to collect) and the tour part under it.
  await d.go(page, "/store", 1800);
  await d.shot(page, "2.10-r2", `m02-${width}-gift-en`, true, 'section[aria-labelledby="overview-today"]');
  await tourPair(page, "2.10-r2", `m02-${width}`, 'section[aria-labelledby="today-tours"]');

  // 2.10 M05 and 2.11 M06 against M03 (tickets on phones, the Table from 1024).
  await d.go(page, "/store/orders?status=awaiting-confirmation", 1500);
  await d.shot(page, "2.10-r2", `m05-${width}-gift-en`);
  await d.shot(page, "2.11-r2", `m06-${width}-gift-en`);
  await d.go(page, "/store/bookings", 1500);
  await tourPair(page, "2.10-r2", `m05-${width}`);
  await d.go(page, "/store/bookings/departures/walk-13", 1500);
  await tourPair(page, "2.11-r2", `m06-${width}`);

  // 2.12 M07 against M04 (ready, deposit paid: Record payment and the locked Complete; the seed
  // has no handed-over order that still owes), and both M08 sheets.
  const owing = await order(page, "ready", true);
  console.log("gift M04 order:", owing);
  await d.go(page, `/store/orders/${owing}`, 1500);
  await d.shot(page, "2.12-r2", `m07-${width}-gift-en`);
  await page.getByRole("button", { name: "Record payment" }).first().click();
  await d.wait(page, 800);
  await d.shot(page, "2.12-r2", `m08-${width}-gift-en`, false);
  await page.keyboard.press("Escape");
  await d.go(page, "/store/bookings/tour-tom", 1500);
  await tourPair(page, "2.12-r2", `m07-${width}`);
  for (const [lang, back] of [["EN", "Go back"], ["DE", "Zurück"]]) {
    if (lang === "DE") await d.setLang(page, "DE");
    await page.getByRole("button", { name: /^(Record payment|Zahlung erfassen)$/ }).click();
    await d.wait(page, 800);
    await d.shot(page, "2.12-r2", `m08-${width}-tour-${lang.toLowerCase()}`, false);
    await page.getByRole("button", { name: back }).click();
    await d.wait(page, 500);
  }
  await d.setLang(page, "EN");

  // 2.13 completion: M04 fulfilment (locked Complete while owed) against M07 delivered with debt
  // and M07 ready to complete; P02 with the tour rows (the gift look is the approved 1.9t P02).
  await d.go(page, "/store/bookings/tour-marie", 1500);
  await tourPair(page, "2.13-r2", `m07-delivered-debt-${width}`);
  await d.go(page, "/store/bookings/tc-anna-done", 1500);
  await tourPair(page, "2.13-r2", `m07-ready-to-complete-${width}`);
  await d.go(page, `/store/orders/${owing}`, 1500);
  await d.shot(page, "2.13-r2", `m07-delivered-debt-${width}-gift-en`);
  await d.setRole(page, "partner");
  await d.go(page, "/partner", 2000);
  await tourPair(page, "2.13-r2", `p02-${width}`);
  await d.setRole(page, "owner");

  // 2.14 overdue states against the M04 decision block (a requested order).
  const requested = await order(page, "requested");
  console.log("gift M04 requested order:", requested);
  await d.go(page, `/store/orders/${requested}`, 1500);
  await d.shot(page, "2.14-r2", `m07-overdue-${width}-gift-en`);
  await d.go(page, "/store/bookings/tc-daniel-grace", 1500);
  await tourPair(page, "2.14-r2", `m07-overdue-grace-${width}`);
  await d.go(page, "/store/bookings/tour-anna", 1500);
  await tourPair(page, "2.14-r2", `m07-overdue-merchant-${width}`);
  await browser.close();
}
d.summary();
