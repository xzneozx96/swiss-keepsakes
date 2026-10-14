// 2.4 C10 Departure and participant selection: departure rows (date, time, prices, policy,
// seats), sold-out rows blocked, age-band counters and seat rule, capacity limits, plural copy,
// keyboard, the selection kept when going back, and EN/DE values.
import { setup } from "./2.x-lib.mjs";

const OUT = process.argv[2];
const { page, check, wait, bodyText, shot, setLang, both, go, fresh, stored, signIn, done } = await setup(OUT);
const row = (re) => page.locator("label").filter({ has: page.getByRole("radio") }).filter({ hasText: re });
// QuantityStepper order on C10: adults, children, infants
const GROUPS = { adults: 0, children: 1, infants: 2 };
const inc = (g) => page.getByRole("button", { name: "Increase" }).nth(GROUPS[g]);
const dec = (g) => page.getByRole("button", { name: "Decrease" }).nth(GROUPS[g]);
const value = async (g) => Number(await page.locator("main input:not([type=radio])").nth(GROUPS[g]).inputValue());
const summary = () => page.locator("p[aria-live=polite]").first().innerText();
const review = () => page.getByRole("button", { name: "Review booking" });

await fresh();
await go("#/tours/lucerne-old-town-walk/book");
const rows = await page.locator("label").filter({ has: page.getByRole("radio") }).allInnerTexts();
console.log("rows:\n " + rows.map((r) => r.replace(/\n+/g, " | ")).join("\n "));
check("each row: date · time, adult and child prices, payment policy, seats", rows.length >= 5 && rows.every((r) => /\w{3}\s\d{1,2}\s\w{3} · \d\d:\d\d/.test(r) && /Adults CHF\s89\.00 · Children CHF\s45\.00/.test(r) && /(30% deposit|Pay in full|Pay later) /.test(r) && /(seats? available|Sold out)/.test(r)));
check("C10 offers no closed, past or merchant-cancelled departure", !rows.some((r) => /13 Oct|19 Oct/.test(r)), "walk-13 closed, walk-19 cancelled by the merchant");
check("sold-out departure is shown but cannot be chosen", /Sold out/.test(await row(/18 Oct/).innerText()) && (await row(/18 Oct/).getByRole("radio").isDisabled()));
check("hints show the tour's age bands and seat rule", (await page.getByText("Ages 16+ · CHF 89.00 each").count()) === 1 && (await page.getByText("Ages 6–15 · CHF 45.00 each").count()) === 1 && (await page.getByText("Ages 0–5 · free · no seat needed").count()) === 1 && (await bodyText()).includes("Adults and children need a seat. Infants do not."));
await both("c10-walk", { full: true });

// Keyboard: arrow keys move between departures and skip the sold-out one
await row(/16 Oct/).click();
await wait(300);
await page.getByRole("radio", { checked: true }).focus();
await page.keyboard.press("ArrowDown");
await wait(300);
const afterDown = await page.evaluate(() => document.activeElement?.closest("label")?.innerText ?? "");
check("keyboard: ArrowDown from 16 Oct skips sold-out 18 Oct to 20 Oct", /20 Oct/.test(afterDown), afterDown.split("\n")[0]);
await shot("c10-keyboard-focus-en");

// Capacity: walk-23 has 3 seats; the group of 3 fits exactly, more is blocked
await row(/23 Oct/).click();
await wait(300);
check("last-seats departure shows 3 seats available", /3 seats available/.test(await row(/23 Oct/).innerText()));
check("group of 3 uses the last 3 seats and may continue", (await summary()) === "Your group uses 3 seats" && (await review().isEnabled()));
check("counters stop at capacity: adult and child + disabled", (await inc("adults").isDisabled()) && (await inc("children").isDisabled()));
await inc("infants").click();
await wait(200);
check("an infant does not take a seat", (await value("infants")) === 1 && (await summary()) === "Your group uses 3 seats");
await dec("infants").click();

// A larger group switching to the last-seats departure is blocked with an explanation
await row(/20 Oct/).click();
await inc("adults").click();
await inc("adults").click();
await wait(200);
check("5-seat group fits on 20 Oct", (await summary()) === "Your group uses 5 seats" && (await review().isEnabled()));
await row(/23 Oct/).click();
await wait(300);
const alert = await page.getByRole("alert").or(page.locator(".alert").filter({ hasText: /more seats/ })).first().innerText().catch(() => "");
check("over capacity: warning and Review booking disabled", /needs more seats than this departure has/.test(await bodyText()) && (await review().isDisabled()), alert);
await page.getByText("Your group needs more seats").scrollIntoViewIfNeeded();
await both("c10-over-capacity");

// Plural copy and payment amounts per policy
await row(/20 Oct/).click();
await dec("adults").click(); await dec("adults").click(); await dec("adults").click(); await dec("children").click();
await wait(200);
check("singular copy: 1 seat", (await summary()) === "Your group uses 1 seat", await summary());
check("adults cannot go below 1", (await value("adults")) === 1 && (await dec("adults").isDisabled()));
await inc("adults").click(); await inc("children").click();
await wait(200);
let body = await bodyText();
check("full payment: total and due today CHF 223.00", /Group total \| CHF\s223\.00 \| Due today \| CHF\s223\.00/.test(body) && !/Remaining balance/.test(body));
await row(/16 Oct/).click();
await wait(200);
body = await bodyText();
check("deposit: CHF 66.90 today, CHF 156.10 by Thu 15 Oct · 18:00", /Due today \| CHF\s66\.90 \| Remaining balance \| Due by Thu\s15\sOct · 18:00 \| CHF\s156\.10/.test(body));
await page.getByText("Due today").scrollIntoViewIfNeeded();
await shot("c10-deposit-summary-en");
await setLang("DE");
body = await bodyText();
check("DE: same amounts, date and deposit meaning", /Heute fällig \| CHF\s66\.90 \| Restbetrag \| Fällig bis Do\.,\s15\.\sOkt\. · 18:00 \| CHF\s156\.10/.test(body) && /Bestätigen Sie mit 30% Anzahlung/.test(body));
check("DE: rows and counters", /Fr\.,\s16\.\sOkt\. · 10:00/.test(body) && /Ab 16 Jahren · je CHF\s89\.00/.test(body) && /0–5 Jahre · gratis · kein Platz nötig/.test(body) && /Ihre Gruppe braucht 3 Plätze/.test(body));
await shot("c10-deposit-summary-de");
await setLang("EN");

// Opening and changing C10 never holds seats
let s = await stored();
check("C10 creates no booking or hold", s.data.tours.bookings.filter((b) => b.status === "pending_payment").length === 0);

// Selection kept: C10 → C11 → back, and C10 → C09 → C10
await row(/20 Oct/).click();
await inc("adults").click(); await dec("children").click();
await wait(200);
await review().click();
await wait(800);
check("Review booking opens C11", page.url().endsWith("/book/review"));
await page.getByRole("button", { name: "Edit departure or group" }).first().click();
await wait(800);
check("back from C11 keeps 20 Oct and 3 adults, 0 children", page.url().endsWith("/book") && (await row(/20 Oct/).getByRole("radio").isChecked()) && (await value("adults")) === 3 && (await value("children")) === 0);
await page.getByRole("button", { name: "Back" }).first().click();
await wait(700);
await page.getByRole("link", { name: "Choose a departure" }).click();
await wait(700);
check("C09 and back to C10 keeps the selection", (await row(/20 Oct/).getByRole("radio").isChecked()) && (await value("adults")) === 3);
await page.reload();
await wait(900);
check("reload keeps the selection", (await row(/20 Oct/).getByRole("radio").isChecked()) && (await value("adults")) === 3);

// Pay-later and German-only tours
await go("#/tours/lake-lucerne-stories/book");
body = await bodyText();
check("pay-later tour: no card, nothing due today, age bands of this tour (children from 4)", /Book now, pay later\. No card is needed today\./.test(body) && /Due today \| CHF\s0\.00/.test(body) && /Ages 4–15 · CHF\s65\.00 each/.test(body));
await both("c10-lake-pay-later", { full: true });
await go("#/tours/luzern-bei-nacht/book");
check("German-only tour: C10 works in EN with the German tour name", (await page.locator("header").first().innerText()).includes("Luzern bei Nacht") && (await row(/15 Oct/).count()) === 1);
await both("c10-night");
await go("#/tours/engraving-workshop/book");
check("sold-out tour: every row disabled, Review booking disabled", (await page.getByRole("radio").evaluateAll((r) => r.every((x) => x.disabled))) && (await review().isDisabled()));
await shot("c10-workshop-sold-out-en");

// EN and DE keep the status and money of a booking (C16 is worker B's screen; read-only look)
await signIn("/account/bookings/tour-anna");
await go("#/account/bookings/tour-anna");
const en = await bodyText();
await setLang("DE");
const de = await bodyText();
await setLang("EN");
console.log("INFO C16 EN:", en.slice(0, 300));
console.log("INFO C16 DE:", de.slice(0, 300));
check("C16 EN/DE: same booking status (Confirmed / Bestätigt)", /Confirmed/.test(en) && /Bestätigt/.test(de));
check("C16 EN/DE: same amounts (CHF 223.00 total, CHF 156.10 owed)", /CHF\s223\.00/.test(en) && /CHF\s223\.00/.test(de) && /CHF\s156\.10/.test(en) && /CHF\s156\.10/.test(de));
await both("c16-anna-status", { full: true });

await done();
