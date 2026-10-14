// 2.3 C09 Tour detail: content sections, age-group prices, payment policy across departures,
// accordion alignment against gift detail, German-only notice, sold-out explanation,
// interactive 3D map (needs WebGL: SwiftShader), and the shared gift list/detail regression.
import { setup } from "./2.x-lib.mjs";

const OUT = process.argv[2];
const { page, check, wait, bodyText, shot, setLang, both, go, fresh, done } = await setup(OUT, { webgl: true });
const has = async (re) => re.test(await bodyText());

await fresh();
await go("#/tours/lucerne-old-town-walk");
check("gallery with photo counter", (await page.getByText(/^1 \/ 3$/).count()) === 1);
check("itinerary: route heading", (await page.getByRole("heading", { name: "Your route through Lucerne" }).count()) === 1);
check("inclusions and exclusions", (await page.getByRole("heading", { name: "What is included" }).count()) === 1 && (await has(/Local guide in English or German/)) && (await has(/Not included \| Food, drinks, transport/)));
check("meeting point in highlights", await has(/Where we meet \| Chapel Bridge · north entrance/));
check("age-group prices with the tour's age bands", await has(/Adults \| Ages 16\+ \| CHF\s89\.00 \| Children \| Ages 6–15 \| CHF\s45\.00 \| Infants \| Ages 0–5 · no seat needed \| CHF\s0\.00/));
check("payment highlight says it depends on the departure (deposit and full departures)", await has(/Payment \| Depends on the departure · shown before you book/));
await both("c09-walk", { full: true });
// Things to know: open every section
for (const name of ["Where we meet", "Before you go", "Payment", "Cancellation"]) await page.getByRole("button", { name, exact: true }).last().click();
await wait(500);
const body = await bodyText();
check("participation conditions open", /Around 2 km on cobbled streets/.test(body));
check("payment section lists departures per policy", /Payment depends on the departure you choose: \| Wed\s14\sOct · Fri\s16\sOct · Fri\s23\sOct \| Pay a 30% deposit to confirm/.test(body) && /Tue\s20\sOct \| Pay in full to confirm your booking\./.test(body), body.match(/Payment depends[^]*?booking\./)?.[0]);
check("cancellation policy open", /Sample policy: contact the organiser at least 48 hours/.test(body));
await page.getByRole("button", { name: "Payment", exact: true }).last().scrollIntoViewIfNeeded();
await both("c09-things-to-know-open");

// Accordion alignment: label text starts exactly at the divider start, as on gift detail
const alignment = async () => (await page.waitForSelector(".accordion__trigger span"), page.evaluate(() => {
  const acc = [...document.querySelectorAll(".accordion")].pop();
  const label = acc.querySelector(".accordion__trigger span");
  return Math.round(label.getBoundingClientRect().left - acc.getBoundingClientRect().left);
}));
const tourGap = await alignment();
await page.locator(".accordion").last().scrollIntoViewIfNeeded();
await page.locator(".accordion").last().screenshot({ path: `${OUT}/accordion-tour-en.png` });
await go("#/gifts/kapellbruecke-pocket-knife");
const giftGap = await alignment();
await page.locator(".accordion").last().scrollIntoViewIfNeeded();
await page.locator(".accordion").last().screenshot({ path: `${OUT}/accordion-gift-en.png` });
check("accordion labels flush with the divider, same as gift detail", tourGap === 0 && giftGap === 0, `tour ${tourGap}px, gift ${giftGap}px`);

// Booking action opens C10; keyboard reaches it
await go("#/tours/lucerne-old-town-walk");
// 2.4-r5: the action is a button that opens the C10 sheet on C09 (#/tours/{slug}?book=true).
await page.getByRole("button", { name: "Choose a departure" }).focus();
await page.keyboard.press("Enter");
await wait(700);
check("booking action opens C10 (keyboard Enter)", page.url().endsWith("#/tours/lucerne-old-town-walk?book=true") && (await page.getByRole("dialog").count()) === 1);

// German-only tour: complete German version plus a language notice in EN, no notice in DE
await go("#/tours/luzern-bei-nacht");
await page.getByRole("button", { name: "Cancellation", exact: true }).last().click();
await wait(400);
check("EN: German-only notice", await has(/This tour’s details are only available in German\./));
check("EN: complete German content, nothing mixed", (await has(/Mit der Laterne durch die beleuchtete Altstadt/)) && (await has(/Wasserturm · Seite Rathausquai/)) && (await has(/Beispielregel: Absage bis 24 Stunden/)) && !(await has(/Sample policy: contact the organiser/)));
await both("c09-night", { full: true });
await setLang("DE");
check("DE: no language notice on the German-only tour", !(await has(/gibt es nur auf/)));
check("DE: walk is not flagged either", (await go("#/tours/lucerne-old-town-walk"), !(await has(/gibt es nur auf|only available/))));
check("DE: formal address (Sie) in tour copy", (await has(/Preise für Ihre Gruppe/)) && (await has(/Tippen Sie auf eine nummerierte Markierung/)) && !(await has(/\b(deine|Deine|dein)\b/)));
check("DE: same prices and policy meaning", (await has(/Erwachsene \| Ab 16 Jahren \| CHF\s89\.00/)) && (await has(/Je nach Termin/)));
await setLang("EN");

// No departure available: sold-out tour explains it and disables the action
await go("#/tours/engraving-workshop");
check("sold-out tour: explanation, Sold out in the action bar, action disabled", (await has(/Every upcoming departure of this tour is fully booked/)) && (await page.locator("div.sticky").last().innerText()).includes("Sold out") && (await page.getByRole("button", { name: "Choose a departure" }).isDisabled()));
await both("c09-workshop-sold-out", { full: true });
await go("#/tours/pilatus-above-the-clouds");
check("unpublished tour: unavailable screen with a way back", (await has(/This tour is unavailable/)) && (await page.getByRole("link", { name: "Explore other tours" }).count()) === 1);

// Interactive 3D map: pins, stop card and sheet are verified in 2.3-map-drive.mjs (owner redesign, 14 Oct)
await go("#/tours/lucerne-old-town-walk");
await page.getByRole("heading", { name: "Your route through Lucerne" }).scrollIntoViewIfNeeded();
const whole = page.getByRole("button", { name: "Whole route" });
for (let i = 0; i < 25 && !(await whole.isEnabled()); i++) await wait(1000);
check("map loads (Whole route enabled) with 4 numbered pins", (await whole.isEnabled()) && (await page.locator(".tour-map-marker").count()) === 4);
await whole.click();
await wait(1600);
await page.locator(".tour-map-marker").nth(2).click();
await wait(1500);
check("pin 3 selects Musegg Wall in the stop card", (await page.locator(".tour-map-card h3").innerText()) === "Musegg Wall" && (await page.locator(".tour-map-marker").nth(2).getAttribute("aria-pressed")) === "true");
await page.locator(".tour-itinerary").screenshot({ path: `${OUT}/c09-map-en.png` });
await setLang("DE");
check("map controls in DE", (await page.getByRole("button", { name: "Ganze Route" }).count()) === 1 && (await page.locator(".tour-map-marker").first().getAttribute("aria-label")).startsWith("Station 1"));
await page.locator(".tour-itinerary").screenshot({ path: `${OUT}/c09-map-de.png` });
await setLang("EN");

// Shared ListingCard / ListingDetail regression on gifts (375px EN)
await go("#/gifts");
await page.waitForFunction(() => document.querySelectorAll("main li").length >= 10);
check("gift list renders cards with prices and ratings", (await page.locator("main li").count()) >= 10 && (await has(/Chocolate set \| 4\.7 \| \(7\)/)));
await shot("gift-list-en", { full: true });
await go("#/gifts/kapellbruecke-pocket-knife");
const heart = page.getByRole("button", { name: /Save Kapellbrücke pocket knife/ }).first();
await heart.click();
await wait(300);
check("gift detail heart toggles", (await page.getByRole("button", { name: /Remove Kapellbrücke pocket knife|Unsave|Saved/ }).count()) > 0 || (await heart.getAttribute("aria-pressed")) === "true");
await shot("gift-detail-en", { full: true });
await page.getByRole("button", { name: /Show all 5 reviews/ }).click();
await wait(800);
check("gift reviews sheet opens with all reviews", (await page.getByRole("dialog").count()) === 1);
await shot("gift-reviews-sheet-en");

await done();
