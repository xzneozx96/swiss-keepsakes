// 2.4-r5: C10 departure and group as a bottom sheet on C09 (owner, 14 Oct 2026), like gift C03's
// "Your gift" sheet. Opening from C09, tiles, counters, sold out, over capacity, the address
// (?book=true) through reload, browser Back, X, swipe, Escape and C11's Edit, the old /book
// link, keyboard and focus trap, overflow. 375px, EN and DE, port 5231.
//   node 2.4-r5-drive.mjs <screens dir>
import { setup } from "./2.x-lib.mjs";

const OUT = process.argv[2];
const { page, check, wait, shot, go, fresh, stored, errors, done } = await setup(OUT);
const SLUG = "lucerne-old-town-walk";
const C09 = `#/tours/${SLUG}`;
const SHEET = `${C09}?book=true`;
const hash = () => decodeURIComponent(new URL(page.url()).hash);
const dialog = () => page.getByRole("dialog");
const open = async () => (await dialog().count()) === 1 && (await dialog().isVisible());
const tile = (re) => dialog().locator("label").filter({ has: page.getByRole("radio") }).filter({ hasText: re });
const checked = async (re) => tile(re).getByRole("radio").isChecked();
// QuantityStepper order in the sheet: adults, children, infants.
const G = { adults: 0, children: 1, infants: 2 };
const inc = (g) => dialog().locator("button[slot=increment]").nth(G[g]);
const dec = (g) => dialog().locator("button[slot=decrement]").nth(G[g]);
const value = async (g) => Number(await dialog().locator("input:not([type=radio])").nth(G[g]).inputValue());
const summary = () => dialog().locator("p[aria-live=polite]").first().innerText();
const review = () => dialog().locator("[data-slot=drawer-footer] button");
const body = () => dialog().locator("[data-slot=drawer-body]");
const close = () => dialog().locator("[data-slot=drawer-close-trigger]");
const lang = async (l) => {
  await page.evaluate((v) => localStorage.setItem("sk.language", JSON.stringify(v)), l);
  await page.reload(); await wait(900);
};
// Scroll the sheet body so `locator` sits in view (the page behind does not move).
const reveal = async (locator) => { await locator.evaluate((el) => el.scrollIntoView({ block: "center" })); await wait(400); };
const sheetOverflow = () => dialog().evaluate((d) => {
  const b = d.querySelector("[data-slot=drawer-body]");
  return { body: b.scrollWidth - b.clientWidth, dialog: Math.round(d.getBoundingClientRect().width), doc: document.documentElement.scrollWidth - innerWidth };
});
const chooseFromC09 = async () => {
  await page.getByRole("button", { name: /^(Choose a departure|Termin wählen)$/ }).click();
  await dialog().waitFor(); await wait(700);
};
// The C09 ← (gallery pill or compact bar) once the sheet is closed.
const c09Back = async () => {
  await page.getByRole("button", { name: /^(Back|Zurück)$/ }).first().click(); await wait(800);
};

for (const L of ["en", "de"]) {
  const EN = L === "en";
  const T = EN
    ? { name: "Lucerne old-town walk", review: "Review booking · CHF 223.00", review312: "Review booking · CHF 312.00", over: /needs more seats than this departure has/, d14: /Wed 14 Oct/, d16: /Fri 16 Oct/, d18: /Sun 18 Oct/, d20: /Tue 20 Oct/, d23: /Fri 23 Oct/, seats4: "Your group uses 4 seats", sold: /Sold out/, edit: /^Edit departure or group$/, choose: "Choose a departure" }
    : { name: "Altstadtspaziergang Luzern", review: "Buchung prüfen · CHF 223.00", review312: "Buchung prüfen · CHF 312.00", over: /Für Ihre Gruppe sind zu wenige Plätze frei/, d14: /14\. Okt/, d16: /16\. Okt/, d18: /18\. Okt/, d20: /20\. Okt/, d23: /23\. Okt/, seats4: "Ihre Gruppe braucht 4 Plätze", sold: /Ausgebucht/, edit: /^Termin oder Gruppe ändern$/, choose: "Termin wählen" };
  const tag = (s) => `[${L}] ${s}`;

  // ---- Open from C09: the page behind stays mounted and keeps its scroll position.
  await fresh();
  await lang(L);
  // Reach C09 the way a guest does (a link), so every entry carries the router's history state.
  await go("#/tours"); await page.locator(`a[href*="/tours/${SLUG}"]`).first().click(); await wait(1200);
  await page.evaluate(() => scrollTo(0, 600)); await wait(400);
  await page.locator("main h1").first().evaluate((h) => { h.dataset.r5 = "kept"; });
  await chooseFromC09();
  check(tag("C09 'Choose a departure' opens the sheet at ?book=true"), (await open()) && hash() === SHEET, hash());
  check(tag("sheet title is the tour name, serif"), (await dialog().getByRole("heading").first().innerText()) === T.name && /Serif/.test(await dialog().getByRole("heading").first().evaluate((h) => getComputedStyle(h).fontFamily)));
  check(tag("C09 stays mounted under the sheet and keeps its scroll (no remount)"), (await page.locator('main h1[data-r5="kept"]').count()) === 1 && (await page.evaluate(() => scrollY)) === 600, await page.evaluate(() => scrollY));
  check(tag("focus moves into the sheet"), await page.evaluate(() => Boolean(document.activeElement?.closest("[role=dialog]"))));
  let s = await stored();
  check(tag("preselection: next available departure (16 Oct), group of 2 adults + 1 child"), (await checked(T.d16)) && s.data.tours.draft.departureId === "walk-16" && (await value("adults")) === 2 && (await value("children")) === 1, s.data.tours.draft);
  check(tag("full-width primary button reads Review booking · CHF total"), (await review().innerText()) === T.review && (await review().evaluate((b) => Math.round(b.getBoundingClientRect().width))) >= 300, await review().innerText());
  const ov = await sheetOverflow();
  check(tag("no horizontal overflow in the sheet or the page"), ov.body <= 0 && ov.doc <= 0 && ov.dialog <= 375, ov);
  await shot(`sheet-top-${L}`);
  await reveal(dialog().getByText(EN ? "Choosing a departure does not reserve seats" : "Die Terminauswahl reserviert", { exact: false }));
  await shot(`sheet-bottom-${L}`);

  // ---- Tiles: payment policy per departure, the sold-out tile, the check on the chosen tile.
  const t16 = await tile(T.d16).innerText();
  const t20 = await tile(T.d20).innerText();
  check(tag("each tile keeps its payment-policy line (16 Oct deposit, 20 Oct full)"), (EN ? /30% deposit when booking/ : /30% Anzahlung bei Buchung/).test(t16) && (EN ? /Pay in full when booking/ : /Vollständige Zahlung bei Buchung/).test(t20));
  check(tag("sold-out 18 Oct shown, muted and disabled"), T.sold.test(await tile(T.d18).innerText()) && (await tile(T.d18).getByRole("radio").isDisabled()));
  await tile(T.d20).click(); await wait(300); await page.mouse.move(2, 2);
  const marks = await dialog().locator("[data-slot=radio]").evaluateAll((ts) => ts.map((x) => { const svg = x.querySelector(":scope > svg"); return Boolean(svg) && getComputedStyle(svg).display !== "none"; }));
  check(tag("choosing 20 Oct: checked, red border, the only corner check"), (await checked(T.d20)) && marks.filter(Boolean).length === 1 && (await dialog().locator("[data-slot=radio]").filter({ hasText: T.d20 }).evaluate((x) => getComputedStyle(x).borderTopColor)) === "rgb(213, 43, 30)");
  await reveal(dialog().getByText(EN ? "Group total" : "Gesamtpreis").first());
  const pay = (await body().innerText()).replace(/\n+/g, " | ");
  check(tag("payment block follows the departure: 20 Oct pays in full today"), (EN ? /Pay in full to confirm your booking\. \| Group total \| CHF\s223\.00 \| Due today \| CHF\s223\.00/ : /Bezahlen Sie den Gesamtpreis.* \| Gesamtpreis \| CHF\s223\.00 \| Heute fällig \| CHF\s223\.00/).test(pay));

  // ---- Counters with the age-band text; the button total follows.
  check(tag("age-band hints on the counters"), EN ? (await dialog().getByText("Ages 16+ · CHF 89.00 each").count()) === 1 && (await dialog().getByText("Ages 0–5 · free · no seat needed").count()) === 1 : (await dialog().getByText("Ab 16 Jahren · je CHF 89.00").count()) === 1 && (await dialog().getByText("0–5 Jahre · gratis · kein Platz nötig").count()) === 1);
  await inc("adults").click(); await wait(250);
  check(tag("+ adult: 3 adults, 4 seats, button CHF 312.00"), (await value("adults")) === 3 && (await summary()) === T.seats4 && (await review().innerText()) === T.review312, await review().innerText());
  await inc("infants").click(); await wait(250);
  check(tag("an infant takes no seat"), (await value("infants")) === 1 && (await summary()) === T.seats4);
  await dec("infants").click(); await wait(250);

  // ---- Over capacity: 4 seats on 23 Oct (3 left) → warning, button disabled.
  await tile(T.d23).click(); await wait(300);
  check(tag("over capacity: warning shown, Review disabled"), (await dialog().getByText(T.over).count()) === 1 && (await review().isDisabled()));
  await reveal(dialog().getByText(T.over));
  await shot(`over-capacity-${L}`);
  await tile(T.d20).click(); await wait(300);
  check(tag("back on 20 Oct: Review enabled again"), await review().isEnabled());

  // ---- Reload restores the open sheet and the selection.
  await page.reload(); await wait(1200);
  check(tag("reload: sheet open at ?book=true with 20 Oct and 3 adults"), (await open()) && hash() === SHEET && (await checked(T.d20)) && (await value("adults")) === 3);

  // ---- Browser Back closes the sheet and stays on C09; C09 ← then leaves, no bounce.
  await page.goBack(); await wait(900);
  check(tag("browser Back closes the sheet, stays on C09"), !(await open()) && hash() === C09, hash());
  await c09Back();
  check(tag("C09 ← after Back returns to the list"), hash() === "#/tours", hash());
  await page.goForward(); await wait(900);

  // ---- X: steps back to C09's own entry, no new entry (Back from C09 leaves for the list).
  await chooseFromC09();
  await close().click(); await wait(900);
  check(tag("X closes the sheet, stays on C09"), !(await open()) && hash() === C09, hash());
  await page.goForward(); await wait(900);
  check(tag("Forward brings the sheet back"), (await open()) && hash() === SHEET, hash());
  await close().click(); await wait(900);
  check(tag("X works again on that entry"), !(await open()) && hash() === C09, hash());
  await page.goBack(); await wait(900);
  check(tag("after X, browser Back leaves C09 (no sheet entry left)"), hash() === "#/tours" && !(await open()), hash());
  await page.goForward(); await wait(900);

  // ---- Swipe down on the handle.
  await chooseFromC09();
  const hb = await dialog().locator("[data-slot=drawer-handle]").boundingBox();
  await page.mouse.move(hb.x + hb.width / 2, hb.y + hb.height / 2);
  await page.mouse.down();
  for (let i = 1; i <= 12; i++) { await page.mouse.move(hb.x + hb.width / 2, hb.y + hb.height / 2 + i * 40); await wait(16); }
  await page.mouse.up(); await wait(1000);
  check(tag("swipe down closes the sheet, stays on C09"), !(await open()) && hash() === C09, hash());
  await page.goBack(); await wait(900);
  check(tag("after the swipe, browser Back leaves C09"), hash() === "#/tours", hash());
  await page.goForward(); await wait(900);

  // ---- Escape twice in a row: one step back only.
  await chooseFromC09();
  await page.keyboard.press("Escape"); await page.keyboard.press("Escape"); await wait(900);
  check(tag("Escape (pressed twice) closes once and stays on C09"), !(await open()) && hash() === C09, hash());

  // ---- Keyboard: open with Enter, focus trap, arrows skip sold out, Escape returns focus.
  const before = await page.evaluate(() => history.state?.__TSR_index);
  await page.getByRole("button", { name: T.choose }).focus();
  await page.keyboard.press("Enter"); await dialog().waitFor(); await wait(700);
  check(tag("keyboard: Enter on 'Choose a departure' opens the sheet with one new history entry"), (await open()) && hash() === SHEET && (await page.evaluate(() => history.state?.__TSR_index)) === before + 1, `${hash()} index ${before} → ${await page.evaluate(() => history.state?.__TSR_index)}`);
  let trapped = true;
  const seen = new Set();
  for (let i = 0; i < 40; i++) {
    await page.keyboard.press("Tab");
    const where = await page.evaluate(() => { const a = document.activeElement; return { inside: Boolean(a?.closest("[role=dialog]")), id: (a?.getAttribute("aria-label") || a?.textContent || a?.tagName || "").trim().slice(0, 40) }; });
    trapped &&= where.inside; seen.add(where.id);
  }
  for (let i = 0; i < 10; i++) { await page.keyboard.press("Shift+Tab"); trapped &&= await page.evaluate(() => Boolean(document.activeElement?.closest("[role=dialog]"))); }
  check(tag("focus trap: 40 Tabs and 10 Shift+Tabs never leave the sheet"), trapped, [...seen].join(" / ").slice(0, 200));
  check(tag("Tab reaches Close, the tiles, the counters and the Review button"), [...seen].some((x) => /^(Close|Schliessen)$/.test(x)) && [...seen].some((x) => x.startsWith(EN ? "Review booking" : "Buchung prüfen")));
  await tile(T.d16).click(); await wait(300);
  await dialog().getByRole("radio", { checked: true }).focus();
  await page.keyboard.press("ArrowDown"); await wait(300);
  check(tag("keyboard: ArrowDown from 16 Oct skips sold-out 18 Oct to 20 Oct"), await checked(T.d20));
  const ring = await dialog().locator("[data-slot=radio]").filter({ hasText: T.d20 }).evaluate((l) => ({ visible: Boolean(l.querySelector("[data-focus-visible=true]")), shadow: getComputedStyle(l).boxShadow }));
  check(tag("keyboard focus ring on the whole tile"), ring.visible && ring.shadow !== "none", ring);
  await shot(`keyboard-${L}`);
  await page.keyboard.press("Escape"); await wait(900);
  check(tag("Escape closes; focus returns to 'Choose a departure'"), !(await open()) && hash() === C09 && (await page.evaluate(() => document.activeElement?.textContent?.trim())) === T.choose);

  // ---- C11 Edit returns to the open sheet with the selection; then X and C09 ← leave cleanly.
  await chooseFromC09();
  await review().click(); await wait(900);
  check(tag("Review booking opens C11"), hash() === `${C09}/book/review`, hash());
  await page.getByRole("button", { name: T.edit }).first().click(); await wait(1000);
  check(tag("C11 Edit reopens the sheet with 20 Oct and 3 adults"), (await open()) && hash() === SHEET && (await checked(T.d20)) && (await value("adults")) === 3, hash());
  await close().click(); await wait(900);
  await c09Back();
  check(tag("then X and C09 ← reach the list, no loop"), hash() === "#/tours", hash());

  // ---- C11 opened on its own: Edit replaces it with the sheet; X and ← never bounce.
  await page.goto("about:blank"); await page.goto(`http://localhost:5231/${C09}/book/review`); await wait(1200);
  await page.getByRole("button", { name: T.edit }).first().click(); await wait(1000);
  check(tag("direct C11: Edit opens the sheet (replace)"), (await open()) && hash() === SHEET, hash());
  await close().click(); await wait(900);
  check(tag("direct C11: X leaves the sheet for C09"), !(await open()) && hash() === C09, hash());
  await c09Back();
  check(tag("direct C11: C09 ← goes to the list"), hash() === "#/tours", hash());

  // ---- Viewing another tour's C09 keeps this draft; opening its sheet starts its own.
  await go("#/tours/lake-lucerne-stories"); await wait(500);
  s = await stored();
  check(tag("another tour's C09 (sheet closed) leaves the draft alone"), s.data.tours.draft.tourId === "old-town" && s.data.tours.draft.departureId === "walk-20" && s.data.tours.draft.adults === 3);

  // ---- The old /book link: redirected in place to the sheet; sold-out tour fully disabled.
  await go(`#/tours/engraving-workshop/book`); await wait(600);
  const radios = dialog().getByRole("radio");
  check(tag("old /book link lands on ?book=true (replaced), sheet open"), (await open()) && hash() === "#/tours/engraving-workshop?book=true", hash());
  check(tag("sold-out tour: every tile disabled, Review disabled"), (await radios.count()) > 0 && (await radios.evaluateAll((r) => r.every((x) => x.disabled))) && (await review().isDisabled()));
  await shot(`sold-out-${L}`);

  // ---- C10 never creates a booking or a hold.
  s = await stored();
  check(tag("the sheet creates no booking or hold"), s.data.tours.bookings.filter((b) => b.status === "pending_payment").length === 0);
}

check("no page errors", errors.length === 0, errors.join("; ").slice(0, 200));
await done();
