// 4.10 revision 1 (owner, 15.10.2026) check, tours: the rich long story in M13 rendered on
// C09's teaser and sheet; "Add tour" from M11: a draft named "Private tour" gets a slug other
// than C22's `private-tour`, stays off C08 while Pilatus keeps its "Coming soon" card,
// cannot publish without text, a photo, prices and a departure, takes a departure once
// saved, and once published shows on C08, opens on C09 (no itinerary section, no errors)
// and offers its departure on C10. 375px, DPR 2, EN and DE; one 1280px shot.
// Revision 2: adapted to the stepper. The story is edited on the Story step, the new tour is
// filled step by step and published from Review (the "Show in the shop" switch is gone), and
// publishing now also needs the story (owner, 15.10.2026). The full create walk with Next
// validation is in 4.10-r2-capture.mjs.
// Revision 2, 15.10.2026 (owner): a step's EN | DE switch opens on the interface language, so the
// DE run picks the English tab before it edits English text.
// Run from a folder with playwright-core: node 4.10-r1-capture.mjs <screens dir>
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
const copy = {
  en: { story: "The story behind it", storyField: "Story", toolbar: "Story formatting", heading: "Heading", library: "Choose from library", use: "Use this photo", save: "Save changes", saved: "Saved. Guests see the change now.", read: "Read the story", tours: "Tours", add: "Add tour", newTour: "New tour", name: "Name", photoRequired: "Add a photo to publish.", departureError: "To publish, add at least one upcoming departure.", priceError: "Enter a price above CHF 0.", summary: "Summary", description: "Description", meetingPoint: "Meeting point", excluded: "Not included", conditions: "Conditions", cancellation: "Cancellation policy", price: "Price", duration: "Duration (hours)", addDeparture: "Add departure", datePick: "Choose a date", seats: "Seats", full: "Pay in full", comingSoon: "Coming soon", available: "10 seats available", english: "English", uiTab: "English", seededDe: "Zwei Stunden auf den ältesten Gassen", saveDraft: "Save draft", publish: "Publish", next: "Next", basicsStep: "Basics", notSaved: "Not saved yet. You can save a draft at any step.", refused: "Not published yet: fix the steps marked in red.", emptyAny: "Still empty in both languages:", storyMissing: "Still empty in both languages: story behind it.", storyTitle: "Story title", storyStep: "Story", departuresStep: "Departures", pricesStep: "Prices & age groups" },
  de: { story: "Die Geschichte dahinter", storyField: "Geschichte", toolbar: "Formatierung der Geschichte", heading: "Zwischentitel", library: "Aus der Bibliothek wählen", use: "Dieses Foto verwenden", save: "Änderungen speichern", saved: "Gespeichert. Gäste sehen die Änderung sofort.", read: "Geschichte lesen", tours: "Touren", add: "Tour hinzufügen", newTour: "Neue Tour", name: "Name", photoRequired: "Fügen Sie ein Foto hinzu, um zu veröffentlichen.", departureError: "Zum Veröffentlichen braucht es mindestens einen kommenden Termin.", priceError: "Geben Sie einen Preis über CHF 0 ein.", summary: "Kurzbeschreibung", description: "Beschreibung", meetingPoint: "Treffpunkt", excluded: "Nicht inbegriffen", conditions: "Bedingungen", cancellation: "Stornierungsbedingungen", price: "Preis", duration: "Dauer (Stunden)", addDeparture: "Termin hinzufügen", datePick: "Datum wählen", seats: "Plätze", full: "Ganz bezahlen", comingSoon: "Demnächst", available: "10 Plätze verfügbar", english: "Englisch", uiTab: "Deutsch", seededDe: "Zwei Stunden auf den ältesten Gassen", saveDraft: "Entwurf speichern", publish: "Veröffentlichen", next: "Weiter", basicsStep: "Grunddaten", notSaved: "Noch nicht gespeichert. Einen Entwurf können Sie bei jedem Schritt speichern.", refused: "Noch nicht veröffentlicht: Beheben Sie die rot markierten Schritte.", emptyAny: "In beiden Sprachen noch leer:", storyMissing: "In beiden Sprachen noch leer: Geschichte dahinter.", storyTitle: "Titel der Geschichte", storyStep: "Geschichte", departuresStep: "Termine", pricesStep: "Preise & Altersgruppen" },
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
const open = async (page, hash) => { await page.goto(`${BASE}${hash}`); await wait(900); };
const tours = (page) => page.evaluate(() => JSON.parse(localStorage.getItem("sk.demo")).data.tours);

for (const lang of ["en", "de"]) {
  const c = copy[lang];
  const page = await browser.newPage({ viewport: { width: 375, height: 812 }, deviceScaleFactor: 2, reducedMotion: "reduce" });
  page.setDefaultTimeout(5000);
  const errors = [];
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  page.on("pageerror", (e) => errors.push(String(e)));
  const overflow = () => page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  const save = async () => { await page.getByRole("button", { name: c.save }).click(); await wait(700); };
  await setup(page, lang);

  // --- The long story in M13, then C09 ---
  // Revision 2: the story has its own step.
  await open(page, "#/store/products/tours/old-town?step=story");
  const card = page.getByRole("region", { name: c.story });
  await card.scrollIntoViewIfNeeded();
  await wait(800);
  check(`[${lang}] the Story step opens on the interface language (${c.uiTab})`, (await page.getByRole("tab", { selected: true }).first().innerText()).startsWith(c.uiTab));
  // The English story is edited in both runs; the DE run then checks C09 keeps the German one.
  await page.getByRole("tab", { name: new RegExp(`^${c.english}`) }).first().click();
  await wait(800);
  const editor = card.getByRole("textbox", { name: c.storyField, exact: true });
  check(`[${lang}] M13: the seeded tour story loads into the editor`, (await editor.innerText()).includes("Where the river leaves the lake"));
  await editor.locator("p").last().click();
  await page.keyboard.press("Control+End");
  await page.keyboard.press("Enter");
  await card.getByRole("toolbar", { name: c.toolbar }).getByRole("button", { name: c.heading }).click();
  await page.keyboard.type("A walk for every season");
  await page.keyboard.press("Enter");
  await page.keyboard.press("Control+i");
  await page.keyboard.type("Rain or shine, the old town is close by.");
  await page.keyboard.press("Control+i");
  await page.keyboard.press("Enter");
  await card.getByRole("toolbar", { name: c.toolbar }).getByRole("button", { name: c.library }).click();
  await wait(600);
  await page.getByRole("dialog").getByRole("button", { name: "musegg wall" }).click();
  await page.getByRole("dialog").getByRole("button", { name: c.use }).click();
  await wait(500);
  await page.screenshot({ path: `${OUT}/m13-story-editor-${lang}.png` });
  await save();
  const walk = (await tours(page)).tours.find((t) => t.id === "old-town");
  const docText = JSON.stringify(walk.longStory.body.en);
  check(`[${lang}] saved: the heading, italic text and the photo slug`, docText.includes("A walk for every season") && docText.includes('"italic"') && docText.includes('"photo":"musegg-wall"'), walk.longStory.body.en.content.slice(0, 6).map((n) => n.type + ":" + (n.attrs?.photo ?? JSON.stringify(n.content ?? []).slice(0, 40))));
  check(`[${lang}] the bar confirms the save`, await page.getByRole("status").filter({ hasText: c.saved }).isVisible());
  await open(page, "#/tours/lucerne-old-town-walk");
  if (lang === "en") {
    const teaser = page.locator("button").filter({ hasText: "Two hours on the oldest streets" }).first();
    await teaser.scrollIntoViewIfNeeded();
    await wait(500);
    const teaserSrc = await teaser.locator("img").first().getAttribute("src");
    const firstSaved = walk.longStory.body.en.content.find((n) => n.type === "image")?.attrs.photo;
    check(`[en] C09 teaser: the story's first photo (${firstSaved})`, !!firstSaved && !!teaserSrc?.includes(firstSaved), teaserSrc);
    await page.getByRole("button", { name: c.read }).click();
    await wait(800);
    const sheet = page.getByRole("dialog");
    check(`[en] C09 sheet: the new heading and italic text`, (await sheet.innerText()).includes("A walk for every season") && (await sheet.locator("em", { hasText: "Rain or shine" }).count()) === 1);
    await page.screenshot({ path: `${OUT}/c09-story-sheet-en.png` });
    await page.keyboard.press("Escape");
  } else {
    await page.getByRole("button", { name: c.read }).click();
    await wait(800);
    const sheet = await page.getByRole("dialog").innerText();
    check(`[de] C09 in German keeps the German story`, sheet.includes(c.seededDe) && !sheet.includes("A walk for every season"));
    await page.keyboard.press("Escape");
  }
  await wait(400);

  // --- Add tour ---
  await open(page, "#/store/products?tab=tours");
  await page.getByRole("link", { name: c.add }).click();
  await wait(1000);
  check(`[${lang}] "Add tour" opens the blank M13`, page.url().endsWith("#/store/products/tours/new") && (await page.getByRole("heading", { level: 1 }).innerText()) === c.newTour);
  // Revision 2: departures wait for the first save because a new tour cannot skip ahead to
  // step 4 (the "save first" text itself is checked on the create walk in 4.10-r2), and the
  // bar, not a Visibility card, says it is not saved yet.
  await open(page, "#/store/products/tours/new?step=departures");
  check(`[${lang}] departures wait for the first save: the new tour cannot skip to Departures`, page.url().endsWith("#/store/products/tours/new") && (await page.locator("#step-title").innerText()).includes(c.basicsStep), page.url());
  check(`[${lang}] the bar says it is not saved yet`, await page.getByRole("status").filter({ hasText: c.notSaved }).isVisible());
  await page.screenshot({ path: `${OUT}/m13-new-${lang}.png` });
  const count0 = (await tours(page)).tours.length;
  check(`[${lang}] the new tour opens on the interface language (${c.uiTab})`, (await page.getByRole("tab", { selected: true }).first().innerText()).startsWith(c.uiTab));
  await page.getByRole("tab", { name: new RegExp(`^${c.english}`) }).first().click();
  await page.getByLabel(c.name, { exact: true }).fill("Private tour");
  await page.getByRole("button", { name: c.saveDraft }).click();
  await wait(1200);
  const t1 = await tours(page);
  const created = t1.tours.find((t) => t.name.en === "Private tour");
  check(`[${lang}] the draft is stored, unpublished and unannounced`, t1.tours.length === count0 + 1 && created?.published === false && created.unannounced === true);
  check(`[${lang}] its slug avoids C22's private-tour`, created?.slug === "private-tour-2", created?.slug);
  // Revision 2: the address keeps the step it was saved on (?step=…).
  check(`[${lang}] the address moves to its id`, new RegExp(`#/store/products/tours/${created?.id}(\\?step=\\w+)?$`).test(page.url()), page.url());
  await open(page, "#/tours");
  const listText = await page.locator("main, body").first().innerText();
  check(`[${lang}] C08: the new draft is not listed`, (await page.locator("a, li").filter({ hasText: /^Private tour$/ }).count()) === 0 && !/\nPrivate tour\n/.test(listText));
  check(`[${lang}] C08: Pilatus still shows "Coming soon"`, listText.includes(c.comingSoon));

  // Publishing needs complete text, a photo, prices, an upcoming departure and (revision 2)
  // the story. Revision 2: Publish is on Review; the refusal lists each step's problems there.
  await open(page, `#/store/products/tours/${created.id}?step=review`);
  await page.getByRole("button", { name: c.publish, exact: true }).click();
  await wait(700);
  const review = await page.locator("main").innerText();
  check(`[${lang}] publish: blocked for text, photo, price, departure and story`, (await page.getByRole("status").filter({ hasText: c.refused }).isVisible()) && review.includes(c.emptyAny) && review.includes(c.photoRequired) && review.includes(c.departureError) && review.includes(c.priceError) && (await page.getByRole("region", { name: c.storyStep, exact: true }).innerText()).includes(c.storyMissing));
  await page.getByRole("region", { name: c.departuresStep, exact: true }).scrollIntoViewIfNeeded();
  await page.screenshot({ path: `${OUT}/m13-publish-errors-${lang}.png` });
  check(`[${lang}] nothing was published`, (await tours(page)).tours.find((t) => t.id === created.id).published === false);

  // A departure on 29 Oct, 10:00, 10 seats, paid in full.
  await open(page, `#/store/products/tours/${created.id}?step=departures`);
  await page.getByRole("button", { name: c.addDeparture }).first().click();
  await wait(600);
  const sheet = page.getByRole("dialog");
  await sheet.getByRole("button", { name: c.datePick }).click();
  await wait(400);
  await page.locator('[data-slot="calendar-cell"]:not([data-outside-month])').filter({ hasText: /^29$/ }).first().click();
  await wait(300);
  await sheet.getByLabel(c.seats, { exact: true }).fill("10");
  await sheet.getByLabel(c.seats, { exact: true }).press("Tab");
  await sheet.getByRole("radio", { name: c.full }).check({ force: true });
  await sheet.getByRole("button", { name: c.addDeparture }).click();
  await wait(700);
  const dep = (await tours(page)).departures.find((d) => d.tourId === created.id);
  check(`[${lang}] the departure is added to the new tour`, dep?.capacity === 10 && dep.startsAt.startsWith("2026-10-29"));

  // Text in English, prices, a library photo, the duration and the story; then it publishes.
  // Revision 2: the draft lives in the editor, so it moves between steps with Next, never a reload.
  const next = async () => { await page.getByRole("button", { name: c.next, exact: true }).click(); await wait(500); };
  await open(page, `#/store/products/tours/${created.id}`);
  await page.getByRole("tab", { name: new RegExp(`^${c.english}`) }).first().click();
  await page.getByLabel(c.summary, { exact: true }).fill("A walk for your own group");
  await page.getByLabel(c.description, { exact: true }).fill("Your guide plans the route with you.");
  const duration = page.getByLabel(c.duration, { exact: true });
  await duration.fill("1.5");
  await duration.press("Tab");
  await page.getByRole("region", { name: lang === "en" ? "Photo and duration" : "Foto und Dauer" }).getByRole("button", { name: c.library }).click();
  await wait(600);
  await page.getByRole("dialog").getByRole("button", { name: "lion monument" }).click();
  await page.getByRole("dialog").getByRole("button", { name: c.use }).click();
  await wait(400);
  await next();
  for (const [label, value] of [[c.meetingPoint, "Lion Monument"], [c.excluded, "Food and drinks."], [c.conditions, "Up to 12 people."]]) {
    await page.getByLabel(label, { exact: true }).fill(value);
  }
  await next();
  const prices = page.getByLabel(c.price, { exact: true });
  await prices.nth(0).fill("60");
  await prices.nth(0).press("Tab");
  await prices.nth(1).fill("30");
  await prices.nth(1).press("Tab");
  await next();
  await next();
  await page.getByLabel(c.cancellation, { exact: true }).fill("Free cancellation until 48 hours before.");
  await next();
  await page.getByLabel(c.storyTitle, { exact: true }).fill("Your own walk");
  await page.getByRole("textbox", { name: c.storyField, exact: true }).click();
  await page.keyboard.type("The guide meets your group and shapes the route around it.");
  await next();
  await page.getByRole("button", { name: c.publish, exact: true }).click();
  await wait(800);
  const live = (await tours(page)).tours.find((t) => t.id === created.id);
  check(`[${lang}] published: photo, prices, 90 minutes, the story, no longer unannounced`, live.published === true && live.photos[0] === "lion-monument" && live.adultPrice === 6000 && live.childPrice === 3000 && live.durationMinutes === 90 && !live.unannounced && live.longStory?.title.en === "Your own walk", { p: live.published, photos: live.photos, a: live.adultPrice, d: live.durationMinutes, u: live.unannounced, story: live.longStory?.title });
  await open(page, "#/tours");
  const c08 = await page.locator("body").innerText();
  check(`[${lang}] C08 lists it once published`, c08.includes("Private tour") && /CHF\s60\.00/.test(c08), c08.includes("Private tour") ? "" : c08.slice(0, 300));
  await page.screenshot({ path: `${OUT}/c08-new-tour-${lang}.png`, fullPage: true });
  await open(page, `#/tours/${live.slug}`);
  const c09 = await page.locator("body").innerText();
  check(`[${lang}] C09 opens it, with no itinerary section`, c09.includes("Private tour") && (await page.locator('[aria-labelledby^="itinerary-"]').count()) === 0);
  await page.screenshot({ path: `${OUT}/c09-new-tour-${lang}.png` });
  await open(page, `#/tours/${live.slug}?book=true`);
  await wait(500);
  check(`[${lang}] C10 offers the departure with 10 seats`, (await page.getByRole("dialog").innerText()).includes(c.available));
  await page.keyboard.press("Escape");

  // An uploaded main photo shows on C08 and on C09's hero.
  const png = await page.evaluate(() => { const cv = document.createElement("canvas"); cv.width = 320; cv.height = 240; const x = cv.getContext("2d"); x.fillStyle = "#2e86c1"; x.fillRect(0, 0, 320, 240); return cv.toDataURL("image/png").split(",")[1]; });
  await open(page, `#/store/products/tours/${created.id}`);
  await page.getByRole("region", { name: lang === "en" ? "Photo and duration" : "Foto und Dauer" }).locator('[data-testid="photo-upload"]').setInputFiles({ name: "group.png", mimeType: "image/png", buffer: Buffer.from(png, "base64") });
  await wait(1200);
  await save();
  check(`[${lang}] the uploaded tour photo is stored as a JPEG data URL`, /^data:image\/jpeg;base64,/.test((await tours(page)).tours.find((t) => t.id === created.id).photos[0]));
  await open(page, "#/tours");
  check(`[${lang}] C08 card shows the uploaded photo`, (await page.locator('img[src^="data:image/jpeg"]').count()) >= 1);
  await open(page, `#/tours/${live.slug}`);
  check(`[${lang}] C09 hero shows the uploaded photo`, (await page.locator('img[src^="data:image/jpeg"]').count()) >= 1);

  // A tour story stored in the old chapter shape is converted on load; C09 renders it.
  await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem("sk.demo"));
    s.data.tours.tours.find((t) => t.id === "night").longStory = { title: { de: "Eine alte Nachtgeschichte" }, chapters: [{ title: { de: "Altes Kapitel" }, body: { de: "Alter Text bei Laternenlicht." }, photo: "lucerne-night" }] };
    localStorage.setItem("sk.demo", JSON.stringify(s));
  });
  await page.reload();
  await wait(1000);
  const night = (await tours(page)).tours.find((t) => t.id === "night");
  check(`[${lang}] a stored chapter tour story becomes rich text`, night.longStory.body.de?.type === "doc" && !night.longStory.chapters);
  await open(page, "#/tours/luzern-bei-nacht");
  await page.getByRole("button", { name: c.read }).click();
  await wait(800);
  check(`[${lang}] C09 shows the converted night story`, (await page.getByRole("dialog").innerText()).includes("Altes Kapitel"));
  await page.keyboard.press("Escape");
  await wait(300);

  if (lang === "en") {
    await page.setViewportSize({ width: 1280, height: 900 });
    await open(page, "#/store/products/tours/old-town?step=story");
    await page.getByRole("region", { name: c.story }).scrollIntoViewIfNeeded();
    await wait(600);
    await page.screenshot({ path: `${OUT}/m13-story-desktop-en.png` });
    await open(page, "#/store/products?tab=tours");
    await page.screenshot({ path: `${OUT}/m11-add-tour-desktop-en.png` });
    await page.setViewportSize({ width: 375, height: 812 });
  }
  check(`[${lang}] no horizontal overflow`, !(await overflow()));
  check(`[${lang}] no console errors`, errors.length === 0, errors);
  await page.close();
}

await browser.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
