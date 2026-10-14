// 2.10: M05 departure schedule + M02 tour work. Run: node 2.10-drive.mjs (dev server on 5233).
import * as d from "./2.10-lib.mjs";

const STEP = "2.10";
const DEMO_START = Date.parse("2026-10-13T10:00:00+02:00");

for (const width of [375, 1024]) {
  console.log(`\n=== width ${width}`);
  const { browser, page } = await d.open(width);
  await d.reset(page, "owner");

  // M02: the tour card sits inside the Today part, before Analytics, with its own money figure.
  await d.go(page, "/store", 1800);
  const inToday = await page.evaluate(() => {
    const today = document.querySelector('section[aria-labelledby="overview-today"]');
    const tours = document.getElementById("today-tours")?.closest("section");
    return !!today && !!tours && today.contains(tours);
  });
  d.check("M02: tour card is inside the Today part (above Analytics)", inToday);
  const card = await d.text(page, 'section[aria-labelledby="today-tours"]');
  console.log("M02 tour card:", card);
  d.check("M02: results to record = 1 (Anna, walk-13 ended)", /Results to record \| 1 \| Tours ended/.test(card));
  d.check("M02: overdue tour balances = 2 (walk-13 Anna, lake-15 grace)", /Overdue tour balances \| 2 \| /.test(card));
  d.check("M02: delivered, still owed = 1 (Marie)", /Delivered, still owed \| 1 \| /.test(card));
  d.check("M02: payments to reconcile = 1 (late payment SK-T2006)", /Payments to reconcile \| 1 \| /.test(card));
  d.check("M02: next departure is walk-14, 5 of 12 booked", /Next departures \| Wed \| 14 Oct \| 10:00 \| Lucerne old-town walk \| 5 of 12 booked \| /.test(card));
  const collect = await d.text(page, 'section[aria-labelledby="today-collect"]');
  d.check("M02: gift 'Still to collect' unchanged by tours (CHF 174.30)", collect.includes("CHF 174.30"), collect.slice(0, 80));
  d.check("M02: tour balances shown as their own figure", /Tour balances to collect \| CHF/.test(card), card.match(/Tour balances to collect \| [^|]*/)?.[0]);
  await d.both(page, STEP, `m02-tours-${width}`, false, 'section[aria-labelledby="today-tours"]');

  // M05: upcoming soonest first, ended newest first; balances and attention per departure.
  await d.go(page, "/store/bookings", 1500);
  const m05 = await d.text(page);
  console.log("M05:", m05.slice(0, 700));
  d.check("M05: Upcoming and Ended groups", m05.includes("Upcoming") && m05.includes("Ended"));
  d.check("M05: merchant-cancelled walk-19 shows Cancelled", /19 Oct 2026, 10:00/.test(m05) && m05.includes("Cancelled"));
  d.check("M05: ended walk-13 lists results to record and overdue", /Results to record: 1/.test(m05) && /Overdue balances: 1/.test(m05));
  d.check("M05: walk-16 lists the reconciliation case", /To reconcile: 1/.test(m05));
  await d.both(page, STEP, `m05-${width}`);

  // Routing: the old raw /store/... hrefs dropped the hash router and showed the guest home.
  if (width === 375) {
    await page.locator('a[href$="/store/bookings/departures/walk-14"]').first().click();
  } else {
    await page.getByRole("row").filter({ hasText: "14 Oct 2026, 10:00" }).first().click();
  }
  await d.wait(page, 900);
  d.check(`M05 → M06 navigation stays in the hash router (${width})`, page.url().endsWith("#/store/bookings/departures/walk-14"), page.url());
  d.check("M06 heading shown after navigation", (await page.getByRole("heading", { level: 1 }).innerText()) === "Guest list");

  // Same seat counts as the guest flow, with an active hold counted separately.
  await d.patch(page, `
    const now = ${DEMO_START} + (Date.now() - s.clockStartedAt);
    const base = s.data.tours.bookings.find((b) => b.id === "tc-yuki-paid");
    s.data.tours.bookings.push({ ...base, id: "drive-hold", ref: "SK-HOLD", guestId: "g-peter", contactName: "Peter Schmid",
      adults: 2, children: 0, infants: 0, status: "pending_payment", holdUntil: new Date(now + 15 * 60000).toISOString(),
      payments: [], activity: [{ at: new Date(now).toISOString(), event: "created", actor: "guest" }] });
  `);
  await d.go(page, "/store/bookings", 1500);
  const walk14 = width === 375
    ? await page.locator("li").filter({ hasText: "14 Oct 2026, 10:00" }).first().innerText()
    : await page.getByRole("row").filter({ hasText: "14 Oct 2026, 10:00" }).first().innerText();
  const flat = d.flat(walk14);
  console.log("M05 walk-14 with hold:", flat);
  d.check("M05: walk-14 booked 5 of 12, hold 2 shown separately, 5 free",
    width === 375 ? /5 of 12 \| Active holds \| 2 \| Free seats \| 5\b/.test(flat) : /5 of 12 booked \| Holds 2 · free 5\b/.test(flat), flat);
  await d.shot(page, STEP, `m05-hold-${width}-en`);
  await d.go(page, "/store", 1800);
  const withHold = await d.text(page, 'section[aria-labelledby="today-tours"]');
  d.check("M02: walk-14 shows the active hold separately (2 on hold)", /Lucerne old-town walk \| 5 of 12 booked · 2 on hold/.test(withHold), withHold.match(/Wed \| 14 Oct[^|]*\|[^|]*\|[^|]*\|[^|]*/)?.[0]);
  await d.setRole(page, "guest");
  await d.go(page, "/tours/lucerne-old-town-walk/book", 1500);
  const options = await page.locator("label").filter({ hasText: /seats? available|Sold out/ }).allInnerTexts();
  const c10 = options.map(d.flat).find((o) => /14/.test(o) && /10:00/.test(o)) ?? "";
  console.log("C10 walk-14:", c10);
  d.check("C10 shows the same free seats for walk-14 (5)", /5 seats available/.test(c10), c10);
  d.check("C10 does not offer the merchant-cancelled walk-19", !options.some((o) => /19/.test(o) && /Oct/.test(o) && /10:00/.test(o) && !/Sold out/.test(o)), options.length + " options");
  await browser.close();
}
d.summary();
