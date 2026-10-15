// 4.9 revision 2 (owner, 15.10.2026) check, M12 Edit gift as a stepper: "Add gift" walked
// with Next, each step checked on Next (inline errors, focus on the first invalid field clear
// of the sticky bar), later steps locked while creating; a draft saved without a story, then
// Publish refused with the Story step marked red, and published once the story is written
// (C02); jump-editing the knife (any step from "All steps", Save changes from a middle step,
// C03 shows it); per-step EN | DE tabs with the missing-language dot; an archived gift with
// "Restore as draft"; the phone "All steps" sheet; the bar's buttons inside its card; no
// console errors, no horizontal overflow. 375px, DPR 2, EN and DE; 1280px step-list shots and,
// in EN, a live gift refused for an empty story.
// Prints the screenshot list with captions at the end, for the review gallery.
// 15.10.2026: labels say Keepsakes / Andenken and the Basics step picks a sub-category.
// Run from a folder with playwright-core: node 4.9-r2-capture.mjs <screens dir>
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
    steps: ["Basics", "Options & stock", "Pickup & preparation", "Payment & policies", "Story", "Review & publish"],
    of: (n) => `Step ${n} of 6`, all: "All steps", close: "Close", next: "Next", back: "Previous step",
    save: "Save changes", saveDraft: "Save draft", publish: "Publish", unpublish: "Unpublish", restore: "Restore as draft",
    saved: "Saved. Guests see the change now.", savedDraft: "Draft saved. Guests don't see it yet.", fixErrors: "Check the marked fields.", refused: "Not published yet: fix the steps marked in red.",
    neededAny: "Needed in English or German.", categoryError: "Choose a sub-category.", photoRequired: "Add a photo to publish.", priceError: "Enter a price above CHF 0.", storyTitleLabel: "Story title", storyBody: "Story", storyCard: "The story behind it",
    emptyStory: "Still empty in both languages: story behind it.", hasErrors: "Has errors",
    add: "Add keepsake", name: "Name", shortStory: "Short story", category: "Sub-category", pocketKnives: "Pocket knives", library: "Choose from library", use: "Use this photo", photoCard: "Photo and category",
    optionName: "Name in English", price: "Price", inStock: "In stock", cancellation: "Cancellation policy", prepDays: "Preparation days", preview: /picked up from (.+)\./,
    english: "English", german: "German", deMissing: "DE missing", deWarning: "German is missing: name.",
    knife: "Kapellbrücke pocket knife", actions: "Actions for Kapellbrücke pocket knife", archive: "Archive", archived: "Archived", archivedNotice: "This keepsake is archived",
  },
  de: {
    steps: ["Grunddaten", "Varianten & Bestand", "Abholung & Vorbereitung", "Zahlung & Bedingungen", "Geschichte", "Prüfen & veröffentlichen"],
    of: (n) => `Schritt ${n} von 6`, all: "Alle Schritte", close: "Schliessen", next: "Weiter", back: "Vorheriger Schritt",
    save: "Änderungen speichern", saveDraft: "Entwurf speichern", publish: "Veröffentlichen", unpublish: "Zurückziehen", restore: "Als Entwurf wiederherstellen",
    saved: "Gespeichert. Gäste sehen die Änderung sofort.", savedDraft: "Entwurf gespeichert. Gäste sehen ihn noch nicht.", fixErrors: "Prüfen Sie die markierten Felder.", refused: "Noch nicht veröffentlicht: Beheben Sie die rot markierten Schritte.",
    neededAny: "Nötig auf Englisch oder Deutsch.", categoryError: "Wählen Sie eine Unterkategorie.", photoRequired: "Fügen Sie ein Foto hinzu, um zu veröffentlichen.", priceError: "Geben Sie einen Preis über CHF 0 ein.", storyTitleLabel: "Titel der Geschichte", storyBody: "Geschichte", storyCard: "Die Geschichte dahinter",
    emptyStory: "In beiden Sprachen noch leer: Geschichte dahinter.", hasErrors: "Hat Fehler",
    add: "Andenken hinzufügen", name: "Name", shortStory: "Kurze Geschichte", category: "Unterkategorie", pocketKnives: "Taschenmesser", library: "Aus der Bibliothek wählen", use: "Dieses Foto verwenden", photoCard: "Foto und Kategorie",
    optionName: "Name auf Deutsch", price: "Preis", inStock: "Am Lager", cancellation: "Stornierungsbedingungen", prepDays: "Vorbereitungstage", preview: /kann ab (.+) abgeholt/,
    english: "Englisch", german: "Deutsch", deMissing: "DE fehlt", deWarning: "Auf Deutsch fehlt: Name.",
    knife: "Kapellbrücke Taschenmesser", actions: "Aktionen für Kapellbrücke Taschenmesser", archive: "Archivieren", archived: "Archiviert", archivedNotice: "Dieses Andenken ist archiviert",
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
const data = (page) => page.evaluate(() => JSON.parse(localStorage.getItem("sk.demo")).data);
const body = (page) => page.locator("body").innerText();
const shot = async (page, name, lang, caption) => {
  const width = page.viewportSize().width;
  const file = `4.9-r2-${name}-${lang}.png`;
  await page.screenshot({ path: `${OUT}/${file}` });
  shots.push({ file, caption, lang, width });
};

// The bar card (the status line's parent): every button inside it, none squeezed.
const barLayout = (page) => page.evaluate(() => {
  const status = [...document.querySelectorAll("[role=status][aria-live]")].find((s) => s.parentElement?.querySelector("button"));
  const card = status.parentElement.getBoundingClientRect();
  const buttons = [...status.parentElement.querySelectorAll("button")].map((b) => {
    const r = b.getBoundingClientRect();
    return { name: b.getAttribute("aria-label") || b.textContent.trim(), left: Math.round(r.left), right: Math.round(r.right), width: Math.round(r.width) };
  });
  return { card: [Math.round(card.left), Math.round(card.right)], top: card.top, buttons, bad: buttons.filter((b) => b.left < card.left - 0.5 || b.right > card.right + 0.5 || b.width < 36) };
});
// The focused field is on screen, below the header and clear of the sticky bar and tab bar.
const focusClear = (page) => page.evaluate(() => {
  const el = document.activeElement;
  if (!el || el === document.body) return { ok: false, why: "no focus" };
  const r = el.getBoundingClientRect();
  const status = [...document.querySelectorAll("[role=status][aria-live]")].find((s) => s.parentElement?.querySelector("button"));
  const barTop = status.parentElement.getBoundingClientRect().top;
  const nav = document.querySelector("nav.fixed");
  const navTop = nav ? nav.getBoundingClientRect().top : innerHeight;
  return { ok: r.top >= 0 && r.bottom <= Math.min(barTop, navTop), tag: el.tagName, top: Math.round(r.top), bottom: Math.round(r.bottom), barTop: Math.round(barTop) };
});

for (const lang of ["en", "de"]) {
  const c = copy[lang];
  const page = await browser.newPage({ viewport: { width: 375, height: 812 }, deviceScaleFactor: 2, reducedMotion: "reduce" });
  const errors = [];
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  page.on("pageerror", (e) => errors.push(String(e)));
  const overflow = () => page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  const button = (name) => page.getByRole("button", { name, exact: true });
  const next = async () => { await button(c.next).click(); await wait(900); };
  const stepTitle = async () => (await page.locator("#step-title").innerText()).replace(/\s+/g, " ").trim();
  const onStep = async (n) => (await stepTitle()) === `${c.of(n)} · ${c.steps[n - 1]}`;
  const sheet = () => page.getByRole("dialog");
  const openSheet = async () => { await button(c.all).click(); await wait(600); };
  const closeSheet = async () => { await sheet().getByRole("button", { name: c.close, exact: true }).last().click(); await wait(500); };
  const sheetRow = (n) => sheet().getByRole("button", { name: new RegExp(`^${c.steps[n - 1].replace(/[&]/g, "\\$&")}`) });
  const bars = {};
  await setup(page, lang);

  // --- Create: walk the steps with Next ---
  await open(page, "#/store/products");
  await page.getByRole("link", { name: c.add }).click();
  await wait(1000);
  check(`[${lang}] Add gift opens step 1 with the phone progress bar and All steps`, (await onStep(1)) && (await page.getByRole("progressbar").isVisible()) && (await button(c.all).isVisible()), await stepTitle());
  check(`[${lang}] while creating the bar offers Save draft and Next, no Back on step 1`, (await button(c.saveDraft).isVisible()) && (await button(c.next).isVisible()) && (await button(c.back).count()) === 0);
  // The step's language switch opens on the interface language (owner, 15.10.2026); the walk
  // writes in that language, so the DE run creates a German-only keepsake.
  check(`[${lang}] the language switch opens on the interface language`, (await page.getByRole("tab", { selected: true }).first().innerText()).startsWith(lang === "en" ? c.english : c.german));
  bars["new gift, step 1"] = await barLayout(page);
  await openSheet();
  const locked = [];
  for (let n = 1; n <= 6; n++) locked.push(await sheetRow(n).isDisabled());
  check(`[${lang}] All steps while creating: step 1 open, steps 2 to 6 locked`, JSON.stringify(locked) === "[false,true,true,true,true,true]", locked);
  await shot(page, "steps-sheet-new", lang, "All steps sheet while creating: only Basics can be opened, the later steps are locked");
  await closeSheet();
  await open(page, "#/store/products/gifts/new?step=review");
  check(`[${lang}] an address that skips ahead returns to step 1`, (await onStep(1)) && !page.url().includes("step=review"), page.url());

  // Basics: Next on empty fields.
  await next();
  const basicsErrors = { step1: await onStep(1), name: (await page.getByLabel(c.name, { exact: true }).getAttribute("aria-invalid")) === "true", any: (await page.getByText(c.neededAny).count()) === 2, category: await page.getByText(c.categoryError).isVisible(), photo: await page.getByText(c.photoRequired).isVisible(), bar: await page.getByRole("status").filter({ hasText: c.fixErrors }).isVisible() };
  check(`[${lang}] Next on empty Basics: stays, name and short story, category and photo marked`, Object.values(basicsErrors).every(Boolean), basicsErrors);
  check(`[${lang}] focus on the name, clear of the sticky bar`, (await page.getByLabel(c.name, { exact: true }).evaluate((el) => el === document.activeElement)) && (await focusClear(page)).ok, await focusClear(page));
  check(`[${lang}] the Basics step mark shows the error`, (await openSheet(), (await sheetRow(1).innerText()).includes(c.hasErrors)));
  await closeSheet();
  await page.getByLabel(c.name, { exact: true }).focus();
  await wait(300);
  await shot(page, "create-basics-errors", lang, "Add gift, Next on an empty Basics step: the name, short story, category and photo are marked and focus is on the name");
  await page.getByLabel(c.name, { exact: true }).fill("Chapel Bridge bottle opener");
  await page.getByLabel(c.shortStory, { exact: true }).fill("A bottle opener with the Chapel Bridge cut into steel.");
  const photoCard = page.getByRole("region", { name: c.photoCard });
  await photoCard.getByRole("button", { name: new RegExp(c.category) }).click();
  await wait(400);
  await page.getByRole("option", { name: c.pocketKnives }).click();
  await wait(300);
  await photoCard.getByRole("button", { name: c.library }).click();
  await wait(600);
  await page.getByRole("dialog").getByRole("button", { name: "pocket knife" }).click();
  await page.getByRole("dialog").getByRole("button", { name: c.use }).click();
  await wait(400);
  await next();
  check(`[${lang}] Basics complete: Next opens step 2`, (await onStep(2)) && page.url().includes("step=options"), await stepTitle());

  // Options: Next on an option without name and price.
  await next();
  const optionName = page.getByLabel(new RegExp(`^${c.optionName}`)).first();
  check(`[${lang}] Next on empty Options: stays, the option name and price marked`, (await onStep(2)) && (await optionName.getAttribute("aria-invalid")) === "true" && (await page.getByText(c.priceError).isVisible()));
  check(`[${lang}] focus on the option name, clear of the sticky bar`, (await optionName.evaluate((el) => el === document.activeElement)) && (await focusClear(page)).ok, await focusClear(page));
  await shot(page, "create-options-errors", lang, "Add gift, Next on the Options step: the option name and price are marked, focus on the option name");
  await optionName.fill("Standard");
  const priceField = page.getByLabel(new RegExp(`^${c.price}:`)).first();
  await priceField.fill("25");
  await priceField.press("Tab");
  const stockField = page.getByLabel(new RegExp(`^${c.inStock}:`)).first();
  await stockField.fill("8");
  await stockField.press("Tab");
  bars["new gift, middle step"] = await barLayout(page);
  check(`[${lang}] Back appears from step 2 while creating`, await button(c.back).isVisible());
  await next();
  check(`[${lang}] Pickup has no text, so no language tabs; its defaults pass`, (await onStep(3)) && (await page.getByRole("tab").count()) === 0);
  await next();

  // Payment: the cancellation policy is required text.
  await next();
  const cancel = page.getByLabel(c.cancellation, { exact: true });
  check(`[${lang}] Next on Payment: the cancellation policy marked and focused, clear of the bar`, (await onStep(4)) && (await cancel.getAttribute("aria-invalid")) === "true" && (await cancel.evaluate((el) => el === document.activeElement)) && (await focusClear(page)).ok, await focusClear(page));
  await cancel.fill("Free cancellation until you pay.");
  await next();

  // Story: Next refuses an empty story (title and body).
  await next();
  const storyTitle = page.getByLabel(c.storyTitleLabel, { exact: true });
  check(`[${lang}] Next on an empty Story: stays, title and body marked, focus on the title`, (await onStep(5)) && (await storyTitle.getAttribute("aria-invalid")) === "true" && (await page.getByRole("region", { name: c.storyCard }).getByRole("alert").count()) >= 1 && (await storyTitle.evaluate((el) => el === document.activeElement)) && (await focusClear(page)).ok, await focusClear(page));
  await shot(page, "create-story-errors", lang, "Add gift, Next on an empty Story step: the story is a must, title and body are marked");

  // A draft saves without a story; it becomes a stored gift with every step open.
  const before = (await data(page)).products.length;
  await button(c.saveDraft).click();
  await wait(1200);
  const created = (await data(page)).products.find((p) => p.name[lang] === "Chapel Bridge bottle opener");
  check(`[${lang}] Save draft without a story stores the draft`, (await data(page)).products.length === before + 1 && created?.published === false && !created.longStory, created && { id: created.id, story: created.longStory });
  check(`[${lang}] the address moves to the gift, still on Story, and the bar says the draft is saved`, page.url().includes(`/gifts/${created?.id}?step=story`) && (await page.getByRole("status").filter({ hasText: c.savedDraft }).isVisible()), page.url());
  await next();
  check(`[${lang}] Next from Story opens Review`, await onStep(6), await stepTitle());
  bars["draft, Review"] = await barLayout(page);
  check(`[${lang}] a draft's Review offers Save draft and Publish`, (await button(c.saveDraft).isVisible()) && (await button(c.publish).isVisible()));
  await button(c.publish).click();
  await wait(900);
  const reviewText = await body(page);
  check(`[${lang}] Publish refused: the bar says why, Review names the empty story, still on Review`, (await onStep(6)) && (await page.getByRole("status").filter({ hasText: c.refused }).isVisible()) && reviewText.includes(c.emptyStory), await stepTitle());
  check(`[${lang}] nothing published`, (await data(page)).products.find((p) => p.id === created.id).published === false);
  const storySection = page.getByRole("region", { name: c.steps[4], exact: true });
  await storySection.scrollIntoViewIfNeeded();
  await wait(300);
  await shot(page, "review-refused", lang, "Review after Publish on a draft without a story: refused, the Story section marked red with what is missing");
  await openSheet();
  const marks = [];
  for (let n = 1; n <= 6; n++) marks.push((await sheetRow(n).innerText()).includes(c.hasErrors));
  check(`[${lang}] All steps: only Story is marked with errors, every step open`, JSON.stringify(marks) === "[false,false,false,false,true,false]" && (await sheet().getByRole("button", { disabled: true }).count()) === 0, marks);
  await shot(page, "steps-sheet-refused", lang, "All steps sheet after the refused publish: only Story has errors (red); the steps with German text missing show Needs attention; every step can be opened");
  await sheetRow(5).click();
  await wait(900);
  check(`[${lang}] the sheet opens the Story step`, await onStep(5), await stepTitle());
  await page.getByLabel(c.storyTitleLabel, { exact: true }).fill("Opened on the bridge");
  await page.getByRole("region", { name: c.storyCard }).getByRole("textbox", { name: c.storyBody, exact: true }).click();
  await page.keyboard.type("Cut from one sheet of steel in the old town.");
  await wait(300);
  await next();
  await button(c.publish).click();
  await wait(900);
  const live = (await data(page)).products.find((p) => p.id === created.id);
  check(`[${lang}] with a story it publishes`, live.published === true && live.longStory?.title?.[lang] === "Opened on the bridge" && (await page.getByRole("status").filter({ hasText: c.saved }).isVisible()), { p: live.published, t: live.longStory?.title });
  bars["live, Review"] = await barLayout(page);
  check(`[${lang}] a live gift's Review offers Unpublish and Save changes`, (await button(c.unpublish).isVisible()) && (await button(c.save).isVisible()));
  await shot(page, "review-live", lang, "Review of a published gift: Unpublish and Save changes in the bar");
  await open(page, "#/gifts");
  check(`[${lang}] C02 lists the published gift`, (await body(page)).includes("Chapel Bridge bottle opener"));

  // --- Jump-edit the knife: any step from All steps, Save changes from a middle step ---
  await open(page, "#/store/products/gifts/p-knife");
  bars["editing, step 1"] = await barLayout(page);
  await openSheet();
  check(`[${lang}] editing: All steps opens every step`, (await sheet().getByRole("button", { disabled: true }).count()) === 0);
  await shot(page, "steps-sheet-edit", lang, "All steps sheet on an existing gift: every step done and open");
  await sheetRow(3).click();
  await wait(900);
  check(`[${lang}] the sheet jumps to Pickup & preparation`, (await onStep(3)) && page.url().includes("step=pickup"), page.url());
  const prep = page.getByLabel(c.prepDays, { exact: true });
  await prep.fill("4");
  await prep.press("Tab");
  await wait(300);
  const prepDate = (await body(page)).match(c.preview)?.[1];
  bars["editing, middle step"] = await barLayout(page);
  await button(c.save).click();
  await wait(900);
  check(`[${lang}] Save changes from Pickup stores 4 days and confirms`, (await data(page)).products.find((p) => p.id === "p-knife").preparationDays === 4 && (await page.getByRole("status").filter({ hasText: c.saved }).isVisible()) && (await onStep(3)));
  await shot(page, "jump-edit-saved", lang, "Editing the knife: jumped to Pickup & preparation, 4 days saved from this step");
  await open(page, "#/gifts/kapellbruecke-pocket-knife");
  check(`[${lang}] C03 shows the new earliest pickup (${prepDate})`, !!prepDate && (await body(page)).includes(prepDate));

  // --- Per-step language tabs and the missing-language dot ---
  await open(page, "#/store/products/gifts/p-knife");
  const tabNames = async () => page.getByRole("tab").allInnerTexts();
  const deTab = page.getByRole("tab", { name: new RegExp(`^${c.german}`) });
  const enTab = page.getByRole("tab", { name: new RegExp(`^${c.english}`) });
  check(`[${lang}] Basics has EN and DE tabs, no dot on a complete gift`, (await page.getByRole("tab").count()) === 2 && (await page.getByRole("tab").locator(".bg-warning").count()) === 0, await tabNames());
  // Wait for the tab to be selected before clearing, so the German name is the one cleared.
  for (let i = 0; i < 5 && (await deTab.getAttribute("aria-selected")) !== "true"; i++) { await deTab.click(); await wait(400); }
  await page.getByLabel(c.name, { exact: true }).fill("");
  await wait(300);
  const dot = { de: await deTab.locator(".bg-warning").count(), en: await enTab.locator(".bg-warning").count(), deName: await deTab.getAttribute("aria-label") ?? (await deTab.textContent()) };
  check(`[${lang}] a cleared German name puts the dot on German only, named for screen readers`, dot.de === 1 && dot.en === 0 && dot.deName.includes(c.deMissing), dot);
  check(`[${lang}] the German tab says what is missing and what guests see`, await page.getByText(c.deWarning).isVisible());
  await shot(page, "lang-dot", lang, "Basics, German tab: the name cleared, a dot on German and the note on what German guests see");
  await open(page, "#/store/products/gifts/p-knife?step=options");
  check(`[${lang}] Options has its own tabs, no dot (its option names are complete)`, (await page.getByRole("tab").count()) === 2 && (await page.getByRole("tab").locator(".bg-warning").count()) === 0);
  await page.reload();
  await wait(1000);

  // --- Archived: Restore as draft instead of Publish ---
  await open(page, "#/store/products");
  await page.getByRole("button", { name: c.actions }).filter({ visible: true }).click();
  await wait(300);
  await page.getByRole("menuitem", { name: c.archive }).click();
  await wait(400);
  await page.getByRole("alertdialog").getByRole("button", { name: c.archive }).click();
  await wait(700);
  // Let the "archived" toast leave before the editor shots.
  await wait(5000);
  check(`[${lang}] the knife is archived`, !!(await data(page)).products.find((p) => p.id === "p-knife").archivedAt);
  await open(page, "#/store/products/gifts/p-knife?step=review");
  const notice = page.getByText(c.archivedNotice);
  check(`[${lang}] the archived editor shows the notice with Restore as draft and the Archived chip`, (await notice.isVisible()) && (await button(c.restore).isVisible()) && (await page.locator("header").getByText(c.archived, { exact: true }).isVisible()));
  check(`[${lang}] archived Review: no Publish, no Unpublish, only Save changes`, (await button(c.publish).count()) === 0 && (await button(c.unpublish).count()) === 0 && (await button(c.save).isVisible()));
  bars["archived, Review"] = await barLayout(page);
  await page.evaluate(() => scrollTo(0, 0));
  await shot(page, "archived", lang, "An archived gift: the notice with Restore as draft replaces publishing");
  await button(c.restore).click();
  await wait(800);
  const restored = (await data(page)).products.find((p) => p.id === "p-knife");
  check(`[${lang}] Restore as draft: no longer archived, a draft, Publish offered`, !restored.archivedAt && restored.published === false && (await notice.count()) === 0 && (await button(c.publish).isVisible()));
  await button(c.publish).click();
  await wait(900);
  check(`[${lang}] the restored knife publishes again`, (await data(page)).products.find((p) => p.id === "p-knife").published === true);

  // --- The bar fits its card in every state ---
  for (const [state, layout] of Object.entries(bars)) {
    check(`[${lang}] bar, ${state}: every button inside the card, none squeezed`, layout.bad.length === 0, layout.bad.length ? { card: layout.card, bad: layout.bad } : "");
  }
  // Evidence for a live Review bar (the widest button row).
  await open(page, "#/store/products/gifts/p-knife?step=review");
  await shot(page, "bar-live-review", lang, "The bar on a live gift's Review step at 375px: Previous step, Unpublish, Save changes");

  // --- 1280px: the numbered step list, a sticky column left of the step ---
  await page.setViewportSize({ width: 1280, height: 900 });
  await open(page, "#/store/products/gifts/p-knife");
  const nav = page.getByRole("navigation", { name: lang === "en" ? "Steps" : "Schritte" });
  const navButtons = nav.getByRole("button");
  check(`[${lang}] 1280px: six numbered steps, Basics current; no progress bar or All steps`, (await nav.isVisible()) && (await navButtons.count()) === 6 && (await navButtons.first().getAttribute("aria-current")) === "step" && !(await page.getByRole("progressbar").isVisible()) && !(await button(c.all).isVisible()));
  const column = await page.evaluate(() => {
    const nav = document.querySelector('nav[aria-label="Steps"], nav[aria-label="Schritte"]').getBoundingClientRect();
    const rects = [...document.querySelectorAll('nav[aria-label="Steps"] button, nav[aria-label="Schritte"] button')].map((b) => b.getBoundingClientRect());
    const step = document.getElementById("step-title").getBoundingClientRect();
    return { stacked: rects.every((r, i) => i === 0 || (Math.abs(r.left - rects[0].left) < 1 && r.top >= rects[i - 1].bottom - 1)), left: nav.right <= step.left, labelsFit: rects.every((r) => r.right <= nav.right + 1) };
  });
  check(`[${lang}] 1280px: the steps stack in a column left of the step, labels inside it`, column.stacked && column.left && column.labelsFit, column);
  await shot(page, "desktop-stepper", lang, "1280px: the numbered step list in a column beside Basics");
  await navButtons.nth(2).click();
  await wait(900);
  check(`[${lang}] 1280px: a step button opens its step`, page.url().includes("step=pickup") && (await navButtons.nth(2).getAttribute("aria-current")) === "step", page.url());
  if (lang === "en") {
    // A live gift may not drop its story: clearing it in both languages refuses Save changes.
    await open(page, "#/store/products/gifts/p-knife?step=story");
    const editor = page.getByRole("region", { name: c.storyCard }).getByRole("textbox", { name: c.storyBody, exact: true });
    for (const tabName of [c.english, c.german]) {
      await page.getByRole("tab", { name: new RegExp(`^${tabName}`) }).click();
      await wait(800);
      await editor.click();
      await page.keyboard.press("Control+a");
      await page.keyboard.press("Delete");
      await wait(200);
    }
    await button(c.save).click();
    await wait(900);
    const storyButton = await navButtons.nth(4).getAttribute("aria-label");
    check(`[en] 1280px: a live gift with no story is refused, Story marked in the step list`, storyButton === `5. Story, ${c.hasErrors}` && (await page.getByRole("status").filter({ hasText: c.fixErrors }).isVisible()) && !!(await data(page)).products.find((p) => p.id === "p-knife").longStory?.body?.en, storyButton);
    await page.evaluate(() => scrollTo(0, 0));
    await shot(page, "desktop-story-refused", lang, "1280px: Save changes on a live gift whose story was emptied is refused, Story marked red");
    await page.reload();
    await wait(1000);
  }
  await page.setViewportSize({ width: 375, height: 812 });
  await wait(300);
  check(`[${lang}] no horizontal overflow`, !(await overflow()));
  check(`[${lang}] no console errors`, errors.length === 0, errors);
  await page.close();
}

await browser.close();
console.log("\nScreenshots:");
console.log(JSON.stringify(shots, null, 1));
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
