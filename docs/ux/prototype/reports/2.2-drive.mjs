// 2.2 C08 Tour list: Tour tab, card facts (duration, from price, next departure), sold-out,
// coming-soon and German-only cards, opening C09, keyboard focus, and the empty state.
import { setup } from "./2.x-lib.mjs";

const OUT = process.argv[2];
const { page, check, wait, bodyText, shot, setLang, both, go, fresh, panel, done } = await setup(OUT);
const card = (name) => page.locator("li").filter({ has: page.getByRole("heading", { name, exact: true }) });

await fresh();
await go("#/");
console.log("INFO home rail Tours tile:", (await page.getByRole("navigation", { name: "Categories" }).getByRole("link", { name: "Tours" }).innerText()).replace(/\n+/g, " | "));
await page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Tours" }).click();
await wait(700);
check("Tour tab opens C08", page.url().endsWith("#/tours") && (await page.getByRole("heading", { level: 1 }).innerText()) === "Tours around Lucerne", page.url());

const walk = await card("Lucerne old-town walk").innerText();
console.log("walk card:", walk.replace(/\n+/g, " | "));
check("walk card: duration, starting price and nearest available departure", /2 hours/.test(walk) && /from\s*CHF\s89\.00/.test(walk) && /Next departure · Wed\s14\sOct/.test(walk));
const lake = await card("Across Lake Lucerne").innerText();
check("lake card: duration, starting price and next departure", /3 hours/.test(lake) && /CHF\s129\.00/.test(lake) && /Next departure · Thu\s15\sOct/.test(lake), lake.replace(/\n+/g, " | "));
const night = await card("Luzern bei Nacht").innerText();
check("German-only tour card in EN: German name with 'Text in German'", /Text in German/.test(night) && /Next departure · Thu\s15\sOct/.test(night), night.replace(/\n+/g, " | "));
const workshop = await card("Engraving workshop").innerText();
check("sold-out tour card says Sold out, no next departure", /Sold out/.test(workshop) && !/Next departure/.test(workshop), workshop.replace(/\n+/g, " | "));
const pilatus = card("A day above the clouds");
check("unpublished tour card: Coming soon and not a link", /Coming soon/.test(await pilatus.innerText()) && (await pilatus.locator("a").count()) === 0 && (await pilatus.locator("[aria-disabled=true]").count()) === 1);
await both("c08-list", { full: true });
await setLang("DE");
const nightDe = await card("Luzern bei Nacht").innerText();
check("German-only tour card in DE: no language note", !/Text auf/.test(nightDe));
check("DE card: same price and date", /CHF\s89\.00/.test(await card("Altstadtspaziergang Luzern").innerText()) && /Nächster Termin · Mi\.,\s14\.\sOkt\./.test(await card("Altstadtspaziergang Luzern").innerText()));
await setLang("EN");

// Keyboard: the card link takes focus with a visible ring, Enter opens C09
await page.locator("body").click({ position: { x: 5, y: 400 } });
let focused = "";
for (let i = 0; i < 12 && !focused.includes("Lucerne old-town walk"); i++) {
  await page.keyboard.press("Tab");
  focused = await page.evaluate(() => document.activeElement?.textContent ?? "");
}
const ring = await page.evaluate(() => getComputedStyle(document.activeElement).boxShadow);
check("keyboard: Tab reaches the walk card link", focused.includes("Lucerne old-town walk"), ring);
await shot("c08-card-focus-en");
await page.keyboard.press("Enter");
await wait(700);
check("Enter on the card opens C09", page.url().endsWith("#/tours/lucerne-old-town-walk"));
await go("#/tours");
await card("Across Lake Lucerne").getByRole("link").click();
await wait(700);
check("tapping a card opens C09", page.url().endsWith("#/tours/lake-lucerne-stories"));

// Empty state through the prototype control
await go("#/tours");
await panel();
await page.getByRole("button", { name: "Empty the tour list" }).click();
await wait(800);
check("empty state: message and no cards", /New tours are on their way/.test(await bodyText()) && (await page.locator("main li").count()) === 0);
await both("c08-empty");
await setLang("DE");
check("empty state DE", /Neue Touren folgen bald/.test(await bodyText()));
await setLang("EN");
await go("#/account?tab=bookings");
check("other tour screens survive the empty data (account bookings opens)", !/Something went wrong|Error/.test(await bodyText()));
await panel();
await page.getByRole("button", { name: "Reset demo" }).click();
await wait(800);
await go("#/tours");
check("Reset brings the tours back", (await page.locator("main ul li").count()) === 5);

await done();
