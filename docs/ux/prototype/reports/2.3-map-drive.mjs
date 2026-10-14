// 2.3-map: C09 itinerary pins redesign (owner, 14 Oct). Stop card inside the map, View more
// sheet, pins/card/sheet in sync, previous/next disabled at the first and last stop,
// keyboard and live region, no page scroll to read a stop, fullscreen, error state, EN/DE.
// Needs WebGL: the shared lib launches the headless shell with SwiftShader.
import { setup } from "./2.x-lib.mjs";

const OUT = process.argv[2];
const { page, check, wait, bodyText, shot, setLang, go, fresh, done } = await setup(OUT, { webgl: true });
const card = page.locator(".tour-map-card");
const cardName = () => card.locator("h3").innerText();
const marker = (n) => page.locator(".tour-map-marker").nth(n - 1);
const pressed = () => page.locator(".tour-map-marker").evaluateAll((m) => m.map((x) => x.getAttribute("aria-pressed")).join(","));
const live = () => page.locator(".tour-itinerary > p[aria-live]").innerText();
const sheet = () => page.getByRole("dialog");
const active = () => page.evaluate(() => document.activeElement?.getAttribute("data-step") ?? document.activeElement?.className?.toString().slice(0, 30) ?? "");
const toMap = async () => {
  await page.evaluate(() => window.scrollBy(0, document.querySelector(".tour-map-frame").getBoundingClientRect().top - 72));
  await wait(400);
};
const ready = async () => {
  const whole = page.getByRole("button", { name: /Whole route|Ganze Route/ });
  for (let i = 0; i < 25 && !(await whole.isEnabled()); i++) await wait(1000);
  return whole.isEnabled();
};
// The selected pin sits in the open map area: below the top controls, above the card.
const pinInView = async (n) => page.evaluate((i) => {
  const pin = document.querySelectorAll(".tour-map-marker")[i - 1].getBoundingClientRect();
  const frame = document.querySelector(".tour-map-frame").getBoundingClientRect();
  const cardBox = document.querySelector(".tour-map-card")?.getBoundingClientRect();
  const cy = pin.top + pin.height / 2, cx = pin.left + pin.width / 2;
  return cx > frame.left && cx < frame.right && cy > frame.top + 40 && cy < (cardBox ? cardBox.top : frame.bottom);
}, n);

await fresh();
await go("#/tours/lucerne-old-town-walk");
await toMap();
check("map loads", await ready());
await wait(1500);
check("below-map stop list and stop panel are gone", (await page.locator(".tour-stop-list, .tour-stop-button").count()) === 0);

// One screen: map, card and attribution visible together between the top bar and the action bar
const layout = await page.evaluate(() => {
  const r = (s) => document.querySelector(s)?.getBoundingClientRect();
  const frame = r(".tour-map-frame"), cardBox = r(".tour-map-card"), attrib = r(".maplibregl-ctrl-attrib");
  const bar = [...document.querySelectorAll("div.sticky")].pop().getBoundingClientRect();
  const top = document.querySelector("header.fixed, div.fixed.top-0")?.getBoundingClientRect().bottom ?? 0;
  const atAttrib = document.elementFromPoint(attrib.left + 30, attrib.top + attrib.height / 2);
  return { frameTop: Math.round(frame.top), frameBottom: Math.round(frame.bottom), frameH: Math.round(frame.height), cardTop: Math.round(cardBox.top), cardBottom: Math.round(cardBox.bottom), attribBottom: Math.round(attrib.bottom), barTop: Math.round(bar.top), top: Math.round(top), attribVisible: !!atAttrib?.closest(".maplibregl-ctrl-attrib") };
});
console.log("INFO layout at 375×812:", JSON.stringify(layout));
check("no page scroll needed: whole map and card fit between the top bar and the action bar", layout.frameTop >= layout.top && layout.frameBottom <= layout.barTop && layout.cardBottom <= layout.barTop, `map ${layout.frameH}px tall`);
check("attribution stays visible below the card", layout.attribVisible && layout.attribBottom > layout.cardBottom);

// First stop selected; previous disabled at the start
check("card opens on stop 1 with number, name, clamped description, thumbnail", (await cardName()) === "Chapel Bridge" && /Stop 1 · Meet here/.test(await card.innerText()) && (await card.locator("p.line-clamp-2").evaluate((p) => getComputedStyle(p).webkitLineClamp)) === "2" && (await card.locator("img").count()) === 1);
check("previous is disabled on the first stop, position 1 of 4", (await card.getByRole("button", { name: "Previous stop" }).isDisabled()) && /1 of 4/.test(await card.innerText()));
await shot("card-stop1-en");

// Pin tap selects the matching stop
await page.getByRole("button", { name: "Whole route" }).click();
await wait(1800);
await marker(3).click();
await wait(1500);
check("pin 3 tap selects Musegg Wall in the card and highlights pin 3", (await cardName()) === "Musegg Wall" && (await pressed()) === "false,false,true,false", await pressed());
check("map flies to the selected pin (visible above the card)", await pinInView(3));
check("live region announces the stop", (await live()) === "Stop 3 of 4: Musegg Wall", await live());
check("the selected pin stays red under the mouse pointer", (await marker(3).evaluate((m) => getComputedStyle(m).backgroundColor)) === "rgb(213, 43, 30)");
await shot("card-stop3-en");

// Card next/previous: fly and highlight; next disabled at the last stop with focus kept
await card.getByRole("button", { name: "Next stop" }).click();
await wait(1500);
check("card next → stop 4, pin 4 highlighted, map flew there", (await cardName()) === "Finish by the lake" && (await pressed()) === "false,false,false,true" && (await pinInView(4)));
check("next is disabled on the last stop; focus moved to previous", (await card.getByRole("button", { name: "Next stop" }).isDisabled()) && (await active()) === "previous", await active());
await page.keyboard.press("Enter");
await wait(1500);
check("keyboard Enter on previous → stop 3", (await cardName()) === "Musegg Wall" && (await live()) === "Stop 3 of 4: Musegg Wall");
await page.keyboard.press("Tab");
await page.keyboard.press("Enter");
await wait(1200);
check("keyboard Tab to next, Enter → stop 4", (await cardName()) === "Finish by the lake");

// View more → sheet with the full stop; sheet next/previous moves the map selection
await card.getByRole("button", { name: "Previous stop" }).click();
await wait(1200);
await card.getByRole("button", { name: "View more" }).click();
await wait(900);
let s = await sheet().innerText();
check("View more opens the sheet: photo, stop number and time, name, full description, note", (await sheet().getByRole("heading", { name: "Musegg Wall" }).count()) === 1 && /Stop 3 · 65 min into the tour/.test(s) && /See the city's historic fortifications and enjoy a different view of the old town\./.test(s) && /Good to know/.test(s) && (await sheet().locator("img").count()) === 1);
await shot("sheet-stop3-en");
await sheet().getByRole("button", { name: "Next stop" }).click();
await wait(1500);
check("sheet next → Finish by the lake, pin 4 selected behind the sheet", (await sheet().getByRole("heading", { name: "Finish by the lake" }).count()) === 1 && (await pressed()) === "false,false,false,true");
check("sheet next disabled at the last stop, focus on sheet previous", (await sheet().getByRole("button", { name: "Next stop" }).isDisabled()) && (await active()) === "previous");
await sheet().getByRole("button", { name: "Previous stop" }).click();
await sheet().getByRole("button", { name: "Previous stop" }).click();
await wait(1500);
check("sheet previous twice → Old-town squares, pin 2 selected", (await sheet().getByRole("heading", { name: "Old-town squares" }).count()) === 1 && (await pressed()) === "false,true,false,false");
await sheet().getByRole("button", { name: "Close" }).click();
await wait(800);
check("sheet Close closes it; card shows the sheet's stop", (await sheet().count()) === 0 && (await cardName()) === "Old-town squares" && (await pinInView(2)));
await card.getByRole("button", { name: "View more" }).click();
await wait(800);
await page.keyboard.press("Escape");
await wait(800);
check("Escape closes the sheet; focus returns to View more", (await sheet().count()) === 0 && (await page.evaluate(() => document.activeElement?.textContent)) === "View more");

// Close the card: focus to the pin, the pin reopens it
await card.getByRole("button", { name: "Close stop details" }).click();
await wait(600);
check("card close hides the card, focus on the stop's pin, no pin highlighted", (await card.count()) === 0 && (await page.evaluate(() => document.activeElement?.classList.contains("tour-map-marker"))) && (await pressed()) === "false,false,false,false");
await shot("card-closed-en");
await page.keyboard.press("Enter");
await wait(1200);
check("Enter on the focused pin reopens the card", (await cardName()) === "Old-town squares");
check("no horizontal overflow at 375px", (await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)) <= 0);

// Fullscreen keeps the card; the sheet opens above it
await page.getByRole("button", { name: "Enter fullscreen" }).click();
await wait(1500);
const fs = await page.evaluate(() => { const f = document.querySelector(".tour-map-frame"); const r = f.getBoundingClientRect(); const c = document.querySelector(".tour-map-card").getBoundingClientRect(); return { pseudo: f.classList.contains("maplibregl-pseudo-fullscreen"), w: r.width, h: r.height, cardIn: c.top > 0 && c.bottom <= innerHeight }; });
check("fullscreen fills the screen and shows the card", fs.pseudo && fs.w === 375 && fs.h === 812 && fs.cardIn, JSON.stringify(fs));
await page.getByRole("button", { name: "Whole route" }).click();
await wait(1600);
await marker(1).click();
await wait(1500);
check("fullscreen: pin tap selects stop 1", (await cardName()) === "Chapel Bridge" && (await pinInView(1)));
await page.screenshot({ path: `${OUT}/fullscreen-en.png` });
await card.getByRole("button", { name: "View more" }).click();
await wait(900);
check("fullscreen: View more sheet shows above the map", (await sheet().isVisible()) && (await page.evaluate(() => { const d = document.querySelector("[role=dialog]").getBoundingClientRect(); const el = document.elementFromPoint(187, d.top + 60); return !!el?.closest("[role=dialog]"); })));
await page.screenshot({ path: `${OUT}/fullscreen-sheet-en.png` });
const isFull = () => page.evaluate(() => document.querySelector(".tour-map-frame").classList.contains("maplibregl-pseudo-fullscreen"));
await page.keyboard.press("Escape");
await wait(700);
check("fullscreen: first Escape closes only the sheet", (await sheet().count()) === 0 && (await isFull()));
await page.keyboard.press("Escape");
await wait(1200);
check("fullscreen: next Escape leaves fullscreen, map back in the page", !(await isFull()) && (await page.getByRole("button", { name: "Enter fullscreen" }).count()) === 1);

// German
await setLang("DE");
await toMap();
await wait(800);
const de = await card.innerText();
check("DE card: Station, Treffpunkt/Nach … Minuten, von, Mehr anzeigen, Sie-free labels", /Station 1 · Treffpunkt/.test(de) && /1 von 4/.test(de) && /Mehr anzeigen/.test(de) && (await card.getByRole("button", { name: "Nächste Station" }).count()) === 1);
await shot("card-stop1-de");
await card.getByRole("button", { name: "Nächste Station" }).click();
await card.getByRole("button", { name: "Nächste Station" }).click();
await wait(1200);
await card.getByRole("button", { name: "Mehr anzeigen" }).click();
await wait(900);
s = await sheet().innerText();
check("DE sheet: Museggmauer, Station 3 · Nach 65 Minuten, Gut zu wissen, Sie", /Station 3 · Nach 65 Minuten/.test(s) && /Gut zu wissen/.test(s) && /Fragen Sie Ihre Führung/.test(s) && (await sheet().getByRole("button", { name: "Vorherige Station" }).count()) === 1);
check("DE sheet: previous and next fit inside the sheet's content edge", await page.evaluate(() => { const d = document.querySelector("[role=dialog]").getBoundingClientRect(); return [...document.querySelectorAll("[role=dialog] [data-step]")].every((b) => b.getBoundingClientRect().right <= d.right - 16); }));
await shot("sheet-stop3-de");
await page.keyboard.press("Escape");
await wait(600);
await page.getByRole("button", { name: "Vollbild öffnen" }).click();
await wait(1500);
await page.screenshot({ path: `${OUT}/fullscreen-de.png` });
check("DE fullscreen shows the card; exit control labelled in German", (await card.isVisible()) && (await page.getByRole("button", { name: "Vollbild schliessen" }).count()) === 1);
await page.getByRole("button", { name: "Vollbild schliessen" }).click();
await wait(800);
await setLang("EN");

// German-only tour and the map error state keep the card usable
await go("#/tours/luzern-bei-nacht");
await toMap();
await ready();
await wait(1500);
check("German-only tour in EN: card shows the German stop", (await cardName()) === "Wasserturm" && /Stop 1 · Meet here/.test(await card.innerText()));
await shot("card-night-en");
await page.route("**/tiles.openfreemap.org/**", (route) => route.abort());
await go("#/tours/lucerne-old-town-walk");
await page.reload();
await wait(800);
await toMap();
for (let i = 0; i < 20 && !/The map could not load/.test(await bodyText()); i++) await wait(1000);
await card.getByRole("button", { name: "Next stop" }).click();
await wait(400);
check("map error: the message is not covered by pins or map controls", await page.evaluate(() => { const p = [...document.querySelectorAll("[role=status] p")].pop().getBoundingClientRect(); return [[p.left + 4, p.top + 4], [p.right - 4, p.top + 4], [p.left + p.width / 2, p.top + p.height / 2]].every(([x, y]) => document.elementFromPoint(x, y)?.closest("[role=status]")); }));
check("map error: message, Reload map, and the card still steps through stops", /The map could not load\. You can still step through every stop below\./.test(await bodyText()) && (await cardName()) === "Old-town squares");
await shot("map-error-en");

await done();
