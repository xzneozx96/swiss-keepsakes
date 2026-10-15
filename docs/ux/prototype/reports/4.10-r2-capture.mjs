// 4.10 revision 2 (owner, 15.10.2026) check: M13 Edit tour as a stepper. "Add tour" walks the
// seven steps with Next, which checks only its own step (inline errors, focus on the first
// invalid field clear of the sticky bar) while the steps ahead stay locked; a draft saves without
// a story, Publish is refused with only Story in red, and with a story it publishes to C08, with
// its departure on C10 and M05 with the same seats. Editing the old-town walk opens any step and
// saves from a middle step (C09 shows it). Per-step EN | DE tabs with the missing-language dot;
// an archived tour offers "Restore as draft" instead of Publish; the phone "All steps" sheet.
// The EN | DE switch opens on the interface language (owner, 15.10.2026); the walk writes English
// in both runs, so the DE run picks the English tab first.
// 375px, DPR 2, EN and DE; a few 1280px shots (the numbered step list in the left column). No console errors, no horizontal overflow.
// Run from a folder with playwright-core: node 4.10-r2-capture.mjs <screens dir>
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
const shots = [];
const copy = {
  en: {
    tours: "Tours", addTour: "Add tour", newTour: "New tour", walk: "Lucerne old-town walk", next: "Next", back: "Previous step", allSteps: "All steps",
    stepOf: (n, label) => `Step ${n} of 7 · ${label}`, basics: "Basics", details: "Itinerary & details", prices: "Prices & age groups", departures: "Departures", policies: "Policies & commission", storyStep: "Story", review: "Review & publish",
    hasErrors: "Has errors", fixErrors: "Check the marked fields.", neededAny: "Needed in English or German.", photoRequired: "Add a photo to publish.", priceError: "Enter a price above CHF 0.",
    name: "Name", summary: "Summary", description: "Description", meetingPoint: "Meeting point", excluded: "Not included", conditions: "Conditions", cancellation: "Cancellation policy", price: "Price",
    library: "Choose from library", use: "Use this photo", saveFirst: "Save the tour as a draft first. Then you can add departures.",
    storyCard: "The story behind it", storyTitle: "Story title", storyField: "Story", saveDraft: "Save draft", savedDraft: "Draft saved. Guests don't see it yet.", publish: "Publish", unpublish: "Unpublish", save: "Save changes", saved: "Saved. Guests see the change now.",
    refused: "Not published yet: fix the steps marked in red.", storyMissing: "Still empty in both languages: story behind it.", editStep: (s) => `Edit ${s}`,
    addDeparture: "Add departure", datePick: "Choose a date", seats: "Seats", full: "Pay in full", available: "10 seats available", seatsM05: "0 of 10",
    langTab: "English", english: "English", german: "German", deMissing: "DE missing", gapAlert: "German is missing: summary.",
    actionsFor: (n) => `Actions for ${n}`, archive: "Archive", archivedNotice: "This tour is archived", restore: "Restore as draft", archivedChip: "Archived",
    pages: "Pages", pageNext: "Next", optional: "Optional.",
  },
  de: {
    tours: "Touren", addTour: "Tour hinzufügen", newTour: "Neue Tour", walk: "Altstadtspaziergang Luzern", next: "Weiter", back: "Vorheriger Schritt", allSteps: "Alle Schritte",
    stepOf: (n, label) => `Schritt ${n} von 7 · ${label}`, basics: "Grunddaten", details: "Ablauf & Details", prices: "Preise & Altersgruppen", departures: "Termine", policies: "Bedingungen & Provision", storyStep: "Geschichte", review: "Prüfen & veröffentlichen",
    hasErrors: "Hat Fehler", fixErrors: "Prüfen Sie die markierten Felder.", neededAny: "Nötig auf Englisch oder Deutsch.", photoRequired: "Fügen Sie ein Foto hinzu, um zu veröffentlichen.", priceError: "Geben Sie einen Preis über CHF 0 ein.",
    name: "Name", summary: "Kurzbeschreibung", description: "Beschreibung", meetingPoint: "Treffpunkt", excluded: "Nicht inbegriffen", conditions: "Bedingungen", cancellation: "Stornierungsbedingungen", price: "Preis",
    library: "Aus der Bibliothek wählen", use: "Dieses Foto verwenden", saveFirst: "Speichern Sie die Tour zuerst als Entwurf. Danach können Sie Termine hinzufügen.",
    storyCard: "Die Geschichte dahinter", storyTitle: "Titel der Geschichte", storyField: "Geschichte", saveDraft: "Entwurf speichern", savedDraft: "Entwurf gespeichert. Gäste sehen ihn noch nicht.", publish: "Veröffentlichen", unpublish: "Zurückziehen", save: "Änderungen speichern", saved: "Gespeichert. Gäste sehen die Änderung sofort.",
    refused: "Noch nicht veröffentlicht: Beheben Sie die rot markierten Schritte.", storyMissing: "In beiden Sprachen noch leer: Geschichte dahinter.", editStep: (s) => `${s} bearbeiten`,
    addDeparture: "Termin hinzufügen", datePick: "Datum wählen", seats: "Plätze", full: "Ganz bezahlen", available: "10 Plätze verfügbar", seatsM05: "0 von 10",
    langTab: "Deutsch", english: "Englisch", german: "Deutsch", deMissing: "DE fehlt", gapAlert: "Auf Deutsch fehlt: Kurzbeschreibung.",
    actionsFor: (n) => `Aktionen für ${n}`, archive: "Archivieren", archivedNotice: "Diese Tour ist archiviert", restore: "Als Entwurf wiederherstellen", archivedChip: "Archiviert",
    pages: "Seiten", pageNext: "Weiter", optional: "Optional.",
  },
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
  const overflowAt = [];
  const shot = async (what, caption, fullPage = false) => {
    const width = page.viewportSize().width;
    if (await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)) overflowAt.push(`${what}@${width}`);
    const file = `4.10-r2-${what}-${lang}.png`;
    await page.screenshot({ path: `${OUT}/${file}`, fullPage });
    shots.push({ file, caption, lang, width });
  };
  const stepTitle = () => page.locator("#step-title").innerText();
  const next = async () => { await page.getByRole("button", { name: c.next, exact: true }).click(); await wait(700); };
  const barSays = async (text) => (await page.getByRole("status").filter({ hasText: text }).count()) > 0;
  // The phone "All steps" sheet: each step's label, its status line and whether it opens.
  const openSheet = async () => { await page.getByRole("button", { name: c.allSteps }).click(); await wait(500); };
  const sheetSteps = () => page.getByRole("dialog").locator("ol > li > button").evaluateAll((els) => els.map((el) => ({ text: el.innerText.replace(/\s+/g, " ").trim(), disabled: el.disabled })));
  const closeSheet = async () => { await page.keyboard.press("Escape"); await wait(400); };
  const goStep = async (label) => {
    await openSheet();
    await page.getByRole("dialog").locator("ol > li > button").filter({ hasText: label }).first().click();
    await wait(700);
  };
  // The focused field: on screen, above the sticky step bar and not covered by anything.
  const focusInfo = () => page.evaluate(() => {
    const el = document.activeElement;
    const r = el.getBoundingClientRect();
    const sticky = [...document.querySelectorAll(".sticky")].find((s) => s.querySelector('[role="status"]'))?.getBoundingClientRect();
    const hit = document.elementFromPoint(r.left + Math.min(r.width / 2, 40), r.top + Math.min(r.height / 2, 12));
    const by = el.getAttribute("aria-labelledby")?.split(" ")[0];
    const label = el.labels?.[0]?.textContent ?? (by ? document.getElementById(by)?.textContent : el.getAttribute("aria-label"));
    return { tag: el.tagName, label, top: Math.round(r.top), bottom: Math.round(r.bottom), barTop: sticky ? Math.round(sticky.top) : null, clear: r.top >= 0 && (!sticky || r.bottom <= sticky.top) && (hit === el || el.contains(hit)) };
  });
  const focusedOn = async (label, what) => {
    await wait(900); // the scroll to the field is smooth
    const f = await focusInfo();
    check(`[${lang}] ${what}: focus on ${label}, clear of the sticky bar`, f.label?.trim() === label && f.clear, f);
  };
  const pickLibraryPhoto = async (name) => {
    await page.getByRole("region", { name: lang === "en" ? "Photo and duration" : "Foto und Dauer" }).getByRole("button", { name: c.library }).click();
    await wait(600);
    await page.getByRole("dialog").getByRole("button", { name }).click();
    await page.getByRole("dialog").getByRole("button", { name: c.use }).click();
    await wait(400);
  };
  await setup(page, lang);

  // ---- 1. "Add tour": seven steps, Next checks each one, the steps ahead are locked ----
  await open(page, "#/store/products?tab=tours");
  await page.getByRole("link", { name: c.addTour }).click();
  await wait(1000);
  check(`[${lang}] "Add tour" opens step 1 of 7 with an ink progress bar at 1 of 7`, page.url().endsWith("#/store/products/tours/new") && (await stepTitle()).includes(c.stepOf(1, c.basics)) && (await page.getByRole("progressbar").getAttribute("aria-valuenow")) === "1" && (await page.getByRole("progressbar").getAttribute("aria-valuemax")) === "7", await stepTitle());
  await openSheet();
  const locked = await sheetSteps();
  check(`[${lang}] All steps while creating: 7 steps, only Basics opens`, locked.length === 7 && !locked[0].disabled && locked.slice(1).every((s) => s.disabled), locked);
  await shot("create-steps-locked", "All steps sheet while creating: steps 2–7 locked until reached");
  await closeSheet();

  await next();
  check(`[${lang}] Basics, Next on empty: stays on step 1, the bar asks to check the marked fields`, page.url().endsWith("/tours/new") && (await barSays(c.fixErrors)));
  check(`[${lang}] Basics errors: name, summary, description in either language, and the photo`, (await page.getByText(c.neededAny).count()) === 3 && (await page.getByText(c.photoRequired).isVisible()));
  await focusedOn(c.name, "Basics");
  await shot("create-basics-errors", "Basics: Next on an empty step marks name, summary, description and photo; focus on Name");
  check(`[${lang}] the new tour's text opens on the interface language (${c.langTab})`, (await page.getByRole("tab", { selected: true }).first().innerText()).startsWith(c.langTab));
  await page.getByRole("tab", { name: new RegExp(`^${c.english}`) }).first().click();
  await page.getByLabel(c.name, { exact: true }).fill("Lantern walk");
  await page.getByLabel(c.summary, { exact: true }).fill("An evening walk by lantern light");
  await page.getByLabel(c.description, { exact: true }).fill("A guide with a lantern leads you through the quiet old town.");
  await pickLibraryPhoto("lion monument");
  await next();
  check(`[${lang}] Basics complete: Next opens step 2`, page.url().endsWith("?step=details") && (await stepTitle()).includes(c.stepOf(2, c.details)), page.url());

  // Conditions is the last field of the step: the focus must not end under the sticky bar.
  await page.getByLabel(c.meetingPoint, { exact: true }).fill("Chapel Bridge, south end");
  await page.getByLabel(c.excluded, { exact: true }).fill("Food and drinks.");
  await next();
  check(`[${lang}] Details, conditions empty: stays on step 2 with one error`, page.url().endsWith("?step=details") && (await page.getByText(c.neededAny).count()) === 1);
  await focusedOn(c.conditions, "Details");
  await shot("create-details-error", "Itinerary & details: the empty Conditions field focused above the sticky bar");
  await page.getByLabel(c.conditions, { exact: true }).fill("From 8 years.");
  await next();

  await next();
  check(`[${lang}] Prices, empty: both prices marked, stays on step 3`, page.url().endsWith("?step=prices") && (await page.getByText(c.priceError).count()) === 2);
  await focusedOn(c.price, "Prices");
  const prices = page.getByLabel(c.price, { exact: true });
  await prices.nth(0).fill("55");
  await prices.nth(0).press("Tab");
  await prices.nth(1).fill("25");
  await prices.nth(1).press("Tab");
  await next();
  check(`[${lang}] Departures while creating: they wait for the first save`, page.url().endsWith("?step=departures") && (await page.getByText(c.saveFirst).isVisible()));
  await shot("create-departures-wait", "Departures while creating: save the draft first, then add departures");
  await next();
  check(`[${lang}] Departures: Next goes on without a departure (only Publish needs one)`, page.url().endsWith("?step=policies"));
  await next();
  check(`[${lang}] Policies, empty cancellation policy: stays on step 5`, page.url().endsWith("?step=policies") && (await page.getByText(c.neededAny).count()) === 1);
  await focusedOn(c.cancellation, "Policies");
  await page.getByLabel(c.cancellation, { exact: true }).fill("Free cancellation until 24 hours before.");
  await next();
  check(`[${lang}] step 6 is the story`, page.url().endsWith("?step=story") && (await stepTitle()).includes(c.stepOf(6, c.storyStep)));

  // The story is required to publish (owner, 15.10.2026): Next refuses an empty story.
  await next();
  const storyCard = page.getByRole("region", { name: c.storyCard });
  check(`[${lang}] Story, empty: Next is refused with the title and the story marked`, page.url().endsWith("?step=story") && (await storyCard.getByText(c.neededAny).count()) === 2);
  await focusedOn(c.storyTitle, "Story");
  const help = await storyCard.locator("p").first().innerText();
  if (help.startsWith(c.optional)) console.log(`NOTE [${lang}] the Story step's help text still starts "${c.optional}" although the story is required to publish: "${help}"`);
  await shot("create-story-errors", "Story: Next refused, the story is required to publish (title and story marked)");
  await openSheet();
  const reached = await sheetSteps();
  check(`[${lang}] All steps: steps 1–6 open, Review still locked, Story has errors`, reached.slice(0, 6).every((s) => !s.disabled) && reached[6].disabled && reached[5].text.includes(c.hasErrors), reached);
  await closeSheet();

  // A draft saves without a story.
  const count0 = (await tours(page)).tours.length;
  await page.getByRole("button", { name: c.saveDraft }).click();
  await wait(1300);
  const draft = (await tours(page)).tours.find((t) => t.name.en === "Lantern walk");
  check(`[${lang}] Save draft on the Story step: stored without a story, unpublished`, (await tours(page)).tours.length === count0 + 1 && draft?.published === false && !draft.longStory && draft.adultPrice === 5500, draft && { p: draft.published, story: draft.longStory });
  check(`[${lang}] the editor moves to the stored tour on the same step, the bar says draft saved`, page.url().endsWith(`/tours/${draft?.id}?step=story`) && (await barSays(c.savedDraft)), page.url());

  // ---- 2. Departure, then Publish: refused for the story only; with a story it publishes ----
  await openSheet();
  const stored = await sheetSteps();
  check(`[${lang}] All steps once stored: every step opens`, stored.every((s) => !s.disabled), stored);
  await page.getByRole("dialog").locator("ol > li > button").filter({ hasText: c.departures }).click();
  await wait(700);
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
  await wait(800);
  const dep = (await tours(page)).departures.find((d) => d.tourId === draft.id);
  check(`[${lang}] Departures step: the departure is saved at once (29 Oct, 10 seats)`, dep?.capacity === 10 && dep.startsAt.startsWith("2026-10-29"), dep);
  check(`[${lang}] the Departures step lists it with 0 of 10 booked`, (await page.getByRole("button", { name: lang === "en" ? /^Change seats/ : /^Plätze ändern/ }).filter({ hasText: lang === "en" ? "0 of 10 booked" : "0 von 10 gebucht" }).count()) === 1);
  await shot("departures-added", "Departures step of the draft: the new departure, 0 of 10 booked");

  await goStep(c.review);
  await page.getByRole("button", { name: c.publish, exact: true }).click();
  await wait(800);
  check(`[${lang}] Publish without a story: refused, the bar says fix the red steps`, (await barSays(c.refused)) && (await tours(page)).tours.find((t) => t.id === draft.id).published === false);
  const storyReview = page.getByRole("region", { name: c.storyStep, exact: true });
  check(`[${lang}] Review: the Story section says the story is empty in both languages`, (await storyReview.innerText()).includes(c.storyMissing));
  await storyReview.scrollIntoViewIfNeeded();
  await shot("review-refused", "Review & publish: Publish refused, Story marked red as still empty");
  await openSheet();
  const red = (await sheetSteps()).filter((s) => s.text.includes(c.hasErrors)).map((s) => s.text);
  check(`[${lang}] All steps: only Story is red`, red.length === 1 && red[0].startsWith(c.storyStep), red);
  await shot("all-steps-refused", "All steps sheet after the refusal: only Story has errors");
  await closeSheet();

  await storyReview.getByRole("button", { name: c.editStep(c.storyStep) }).click();
  await wait(800);
  check(`[${lang}] "Edit" on the Story section opens the Story step`, page.url().endsWith("?step=story"));
  // The stored draft reopened on the interface language; its text is English, so is the story.
  await page.getByRole("tab", { name: new RegExp(`^${c.english}`) }).first().click();
  await page.getByLabel(c.storyTitle, { exact: true }).fill("Lucerne after dark");
  await page.getByRole("textbox", { name: c.storyField, exact: true }).click();
  await page.keyboard.type("When the shops close, the lanes belong to the lantern again.");
  await wait(300);
  await shot("story-filled", "Story step with a title and a story; the language dot shows the other language is missing");
  await next();
  await page.getByRole("button", { name: c.publish, exact: true }).click();
  await wait(900);
  const live = (await tours(page)).tours.find((t) => t.id === draft.id);
  check(`[${lang}] with a story it publishes`, live.published === true && !live.unannounced && live.longStory?.title.en === "Lucerne after dark" && (await barSays(c.saved)), { p: live.published, u: live.unannounced, story: live.longStory?.title });
  await shot("review-published", "Review & publish after publishing: Unpublish and Save changes, saved");
  await open(page, "#/tours");
  check(`[${lang}] C08 lists the new tour`, (await page.locator("main").innerText()).includes("Lantern walk"));
  await page.getByText("Lantern walk").first().scrollIntoViewIfNeeded();
  await shot("c08-published", "C08 tour list with the newly published Lantern walk");
  await open(page, `#/tours/${live.slug}?book=true`);
  await wait(500);
  check(`[${lang}] C10 offers its departure with 10 seats`, (await page.getByRole("dialog").innerText()).includes(c.available));
  await shot("c10-departure", "C10 booking sheet: the departure added on the Departures step, 10 seats available");
  await page.keyboard.press("Escape");
  await open(page, "#/store/bookings");
  const m05 = page.locator(`a[href*="departures/${dep.id}"]`).first();
  const pageNext = page.getByRole("navigation", { name: c.pages }).first().getByRole("button", { name: c.pageNext });
  for (let i = 0; i < 5 && (await m05.count()) === 0 && (await pageNext.count()) && (await pageNext.isEnabled()); i++) { await pageNext.click(); await wait(400); }
  check(`[${lang}] M05 lists it with the same seats`, (await m05.count()) === 1 && (await m05.innerText()).includes(c.seatsM05), (await m05.count()) ? "" : await page.locator('a[href*="departures/"]').evaluateAll((a) => a.map((x) => x.getAttribute("href").split("/").pop())));

  // ---- 3. Editing the old-town walk: any step opens, Save changes from a middle step ----
  await open(page, "#/store/products/tours/old-town");
  await openSheet();
  const editSteps = await sheetSteps();
  check(`[${lang}] editing: All steps lists 7 steps, every one opens`, editSteps.length === 7 && editSteps.every((s) => !s.disabled), editSteps);
  await shot("edit-all-steps", "All steps sheet while editing the old-town walk: any step opens");
  await page.getByRole("dialog").locator("ol > li > button").filter({ hasText: c.details }).click();
  await wait(700);
  check(`[${lang}] the sheet jumps to step 2`, page.url().endsWith("?step=details") && (await stepTitle()).includes(c.stepOf(2, c.details)));
  check(`[${lang}] editing opens the step on the interface language (${c.langTab})`, (await page.getByRole("tab", { selected: true }).first().innerText()).startsWith(c.langTab));
  const meeting = page.getByLabel(c.meetingPoint, { exact: true });
  const newMeeting = `${await meeting.inputValue()} (flower boxes)`;
  await meeting.fill(newMeeting);
  await page.getByRole("button", { name: c.save, exact: true }).click();
  await wait(800);
  const walk = (await tours(page)).tours.find((t) => t.id === "old-town");
  check(`[${lang}] Save changes from step 2: stored, still published, still on step 2`, walk.meetingPoint[lang] === newMeeting && walk.published && page.url().endsWith("?step=details") && (await barSays(c.saved)), walk.meetingPoint);
  await shot("edit-saved-middle", "Itinerary & details of the old-town walk saved from the middle step");
  await open(page, "#/tours/lucerne-old-town-walk");
  check(`[${lang}] C09 shows the new meeting point`, (await page.locator("main").innerText()).includes(newMeeting));

  // ---- 4. Per-step EN | DE tabs and the missing-language dot ----
  await open(page, "#/store/products/tours/old-town");
  const deTab = () => page.getByRole("tab", { name: new RegExp(`^${c.german}`) }).first();
  check(`[${lang}] Basics: EN | DE tabs, no dot while both are complete`, (await page.getByRole("tab").count()) === 2 && !(await deTab().innerText()).includes(c.deMissing));
  await deTab().click();
  await page.getByLabel(c.summary, { exact: true }).fill("");
  await wait(300);
  check(`[${lang}] German summary cleared: the German tab gets the dot and the gap notice`, (await deTab().innerText()).includes(c.deMissing) && (await deTab().locator(".bg-warning").count()) === 1 && (await page.getByText(c.gapAlert).isVisible()));
  await shot("lang-dot", "Basics in German with the summary cleared: dot on the German tab, gap notice");
  await next();
  check(`[${lang}] Details: the dot is per step, none on its German tab`, page.url().endsWith("?step=details") && !(await deTab().innerText()).includes(c.deMissing) && (await deTab().locator(".bg-warning").count()) === 0);
  await next();
  check(`[${lang}] Prices: a step without text has no language tabs`, (await page.getByRole("tablist").count()) === 0);
  await next();
  check(`[${lang}] Departures: no language tabs`, (await page.getByRole("tablist").count()) === 0);
  await next();
  await next();
  check(`[${lang}] Story: its own EN | DE tabs`, page.url().endsWith("?step=story") && (await page.getByRole("tab").count()) === 2);

  // ---- 5. An archived tour: "Restore as draft" instead of Publish ----
  await open(page, "#/store/products?tab=tours");
  const lakeName = (await tours(page)).tours.find((t) => t.id === "lake").name[lang];
  await page.getByRole("button", { name: c.actionsFor(lakeName) }).first().click();
  await wait(400);
  await page.getByRole("menuitem", { name: c.archive }).click();
  await wait(400);
  await page.getByRole("alertdialog").getByRole("button", { name: c.archive }).click();
  await wait(700);
  check(`[${lang}] M11 ⋯ menu archives the lake tour`, !!(await tours(page)).tours.find((t) => t.id === "lake").archivedAt);
  await open(page, "#/store/products/tours/lake");
  await wait(4500); // the "archived" toast from M11 would cover the step bar in the shot
  check(`[${lang}] archived editor: the notice with "Restore as draft", the Archived chip`, (await page.getByText(c.archivedNotice).isVisible()) && (await page.getByRole("button", { name: c.restore }).isVisible()) && (await page.getByText(c.archivedChip, { exact: true }).first().isVisible()));
  await shot("archived", "Archived tour: the notice with Restore as draft above the steps");
  await goStep(c.review);
  check(`[${lang}] archived Review: no Publish and no Unpublish, only Save changes`, (await page.getByRole("button", { name: c.publish, exact: true }).count()) === 0 && (await page.getByRole("button", { name: c.unpublish, exact: true }).count()) === 0 && (await page.getByRole("button", { name: c.save, exact: true }).isVisible()));
  await shot("archived-review", "Archived tour on Review & publish: Save changes only, no Publish");
  await page.getByRole("button", { name: c.restore }).click();
  await wait(800);
  const lake = (await tours(page)).tours.find((t) => t.id === "lake");
  check(`[${lang}] "Restore as draft": stored as a draft, the notice goes, Review offers Save draft and Publish`, !lake.archivedAt && lake.published === false && (await page.getByText(c.archivedNotice).count()) === 0 && (await page.getByRole("button", { name: c.publish, exact: true }).isVisible()) && (await page.getByRole("button", { name: c.saveDraft }).isVisible()), { archivedAt: lake.archivedAt, p: lake.published });

  // ---- 6. 1280px: the numbered step list in the left column ----
  if (lang === "en") {
    await page.setViewportSize({ width: 1280, height: 900 });
    const nav = page.getByRole("navigation", { name: "Steps" });
    await open(page, "#/store/products/tours/new");
    await next();
    const navCreate = await nav.getByRole("button").evaluateAll((els) => els.map((el) => ({ name: el.getAttribute("aria-label"), disabled: el.disabled })));
    check(`[en] 1280px creating: numbered step list, step 1 has errors, steps 2–7 locked`, navCreate.length === 7 && navCreate[0].name === "1. Basics, Has errors" && navCreate.slice(1).every((s) => s.disabled) && !(await page.getByRole("button", { name: "All steps" }).isVisible()), navCreate);
    await shot("desktop-create-errors", "1280px Add tour: step list on the left, Basics red after Next, later steps locked");
    await open(page, "#/store/products/tours/old-town");
    await nav.getByRole("button", { name: /^6\. Story/ }).click();
    await wait(800);
    check(`[en] 1280px editing: a click on step 6 opens the Story step`, page.url().endsWith("?step=story") && (await nav.getByRole("button", { name: /^6\. Story/ }).getAttribute("aria-current")) === "step");
    await shot("desktop-story", "1280px old-town walk on the Story step, reached by a click in the step list");
    await nav.getByRole("button", { name: /^7\. Review/ }).click();
    await wait(800);
    await shot("desktop-review", "1280px Review & publish of the old-town walk: a summary per step with Edit");
    await page.setViewportSize({ width: 375, height: 812 });
  }
  check(`[${lang}] no horizontal overflow at any screenshot`, overflowAt.length === 0, overflowAt);
  check(`[${lang}] no console errors`, errors.length === 0, errors);
  await page.close();
}

await browser.close();
console.log(`\n${pass} passed, ${fail} failed`);
console.log("\nScreenshots:");
for (const s of shots) console.log(`${s.file} | ${s.width}px | ${s.lang.toUpperCase()} | ${s.caption}`);
process.exit(fail ? 1 : 0);
