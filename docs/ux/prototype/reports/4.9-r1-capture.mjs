// 4.9 revision 1 (owner, 15.10.2026) check, gifts: the rich long story in M12 (toolbar,
// heading, bold, list, link, a library photo and an uploaded photo, a too-large upload
// refused) saved as Tiptap JSON and rendered on C03's teaser and sheet; the German story
// falling back to English with a notice; a stored chapter-shape story converted on load;
// "Add gift" from M11: draft rules, the redirect to its id, the slug, hidden from C02 as a
// draft, the publish rules (text, photo, an option with a price), visible on C02 and C03
// once published; a second gift with the same name gets its own slug; an option added to an
// existing gift. 375px, DPR 2, EN and DE; one 1280px shot.
// Revision 2: adapted to the stepper. The story is its own step (`?step=story`) with the
// EN | DE tabs above the card; "Add gift" walks the steps and saves with "Save draft";
// Publish sits on the Review step, which lists what each step still needs.
// 15.10.2026: labels say Keepsakes / Andenken; the editor files a keepsake under a store
// sub-category (`subcategoryId`, the select "Sub-category"), not a fixed category.
// Run from a folder with playwright-core: node 4.9-r1-capture.mjs <screens dir>
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
  en: { story: "The story behind it", storyField: "Story", toolbar: "Story formatting", heading: "Heading", bullets: "Bulleted list", link: "Link", linkLabel: "Link address", apply: "Apply link", upload: "Upload photo", library: "Choose from library", use: "Use this photo", tooBig: "This photo is too large even after resizing. Choose a smaller one.", save: "Save changes", saved: "Saved. Guests see the change now.", savedDraft: "Draft saved. Guests don't see it yet.", saveDraft: "Save draft", publish: "Publish", refused: "Not published yet: fix the steps marked in red.", notSaved: "Not saved yet. You can save a draft at any step.", stepOne: "Step 1 of 6 · Basics", emptyAny: "Still empty in both languages:", missingShort: "short story", missingOptions: "option names", missingCancel: "cancellation policy", missingStory: "story behind it", storyTitle: "Story title", read: "Read the story", german: "German", english: "English", fallbackNote: "Text in English", add: "Add keepsake", newGift: "New keepsake", name: "Name", draftName: "Enter a name in English or German.", category: "Sub-category", categoryError: "Choose a sub-category.", pocketKnives: "Pocket knives", photoRequired: "Add a photo to publish.", optionsError: "To publish, at least one option must be for sale with a price.", shortStory: "Short story", cancellation: "Cancellation policy", nameEn: "Name in English", price: "Price", inStock: "In stock", addOption: "Add option", gifts: "Keepsakes", draft: "Draft", published: "Published" },
  de: { story: "Die Geschichte dahinter", storyField: "Geschichte", toolbar: "Formatierung der Geschichte", heading: "Zwischentitel", bullets: "Aufzählung", link: "Link", linkLabel: "Linkadresse", apply: "Link übernehmen", upload: "Foto hochladen", library: "Aus der Bibliothek wählen", use: "Dieses Foto verwenden", tooBig: "Dieses Foto ist auch verkleinert zu gross. Wählen Sie ein kleineres.", save: "Änderungen speichern", saved: "Gespeichert. Gäste sehen die Änderung sofort.", savedDraft: "Entwurf gespeichert. Gäste sehen ihn noch nicht.", saveDraft: "Entwurf speichern", publish: "Veröffentlichen", refused: "Noch nicht veröffentlicht: Beheben Sie die rot markierten Schritte.", notSaved: "Noch nicht gespeichert. Einen Entwurf können Sie bei jedem Schritt speichern.", stepOne: "Schritt 1 von 6 · Grunddaten", emptyAny: "In beiden Sprachen noch leer:", missingShort: "kurze Geschichte", missingOptions: "Namen der Varianten", missingCancel: "Stornierungsbedingungen", missingStory: "Geschichte dahinter", storyTitle: "Titel der Geschichte", read: "Geschichte lesen", german: "Deutsch", english: "Englisch", fallbackNote: "Text auf Englisch", add: "Andenken hinzufügen", newGift: "Neues Andenken", name: "Name", draftName: "Geben Sie einen Namen auf Englisch oder Deutsch ein.", category: "Unterkategorie", categoryError: "Wählen Sie eine Unterkategorie.", pocketKnives: "Taschenmesser", photoRequired: "Fügen Sie ein Foto hinzu, um zu veröffentlichen.", optionsError: "Zum Veröffentlichen muss mindestens eine Variante mit Preis im Verkauf sein.", shortStory: "Kurze Geschichte", cancellation: "Stornierungsbedingungen", nameEn: "Name auf Englisch", price: "Preis", inStock: "Am Lager", addOption: "Variante hinzufügen", gifts: "Andenken", draft: "Entwurf", published: "Veröffentlicht" },
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
// An image made in the page: a small gradient PNG, or a large noise JPEG that cannot fit.
const makeImage = (page, kind) => page.evaluate((k) => {
  const c = document.createElement("canvas");
  const size = k === "big" ? 1800 : 320;
  c.width = size; c.height = Math.round(size * 0.75);
  const x = c.getContext("2d");
  if (k === "big") {
    const img = x.createImageData(c.width, c.height);
    for (let i = 0; i < img.data.length; i++) img.data[i] = (i % 4 === 3) ? 255 : Math.random() * 255;
    x.putImageData(img, 0, 0);
    return c.toDataURL("image/jpeg", 1).split(",")[1];
  }
  const g = x.createLinearGradient(0, 0, c.width, c.height);
  g.addColorStop(0, "#c0392b"); g.addColorStop(1, "#f5d76e");
  x.fillStyle = g; x.fillRect(0, 0, c.width, c.height);
  return c.toDataURL("image/png").split(",")[1];
}, kind);

for (const lang of ["en", "de"]) {
  const c = copy[lang];
  const page = await browser.newPage({ viewport: { width: 375, height: 812 }, deviceScaleFactor: 2, reducedMotion: "reduce" });
  const errors = [];
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  page.on("pageerror", (e) => errors.push(String(e)));
  const overflow = () => page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  const save = async () => { await page.getByRole("button", { name: c.save }).click(); await wait(700); };
  const saveDraft = async () => { await page.getByRole("button", { name: c.saveDraft, exact: true }).click(); await wait(700); };
  // M11 lists 10 per page since 15.10.2026; a new gift is last, so open the last page.
  const lastPage = async () => {
    const pages = page.getByRole("button", { name: /^(Page|Seite) \d+$/ });
    if (await pages.count()) { await pages.last().click(); await wait(400); }
  };
  // Revision 2: the EN | DE tabs belong to the step, above its cards.
  const tab = (english) => page.getByRole("tab", { name: new RegExp(`^${english ? c.english : c.german}`) }).first();
  await setup(page, lang);

  // --- The long story in M12 (its own step since revision 2) ---
  await open(page, "#/store/products/gifts/p-knife?step=story");
  const card = page.getByRole("region", { name: c.story });
  await card.scrollIntoViewIfNeeded();
  await wait(800);
  const toolbar = card.getByRole("toolbar", { name: c.toolbar });
  check(`[${lang}] the story card has a labelled toolbar with 11 labelled buttons`, (await toolbar.getByRole("button").count()) === 11 && (await toolbar.getByRole("button").evaluateAll((bs) => bs.every((b) => b.getAttribute("aria-label")))));
  const editor = card.getByRole("textbox", { name: c.storyField, exact: true });
  // The switch opens on the interface language (owner, 15.10.2026); the checks below use English.
  check(`[${lang}] the story's language switch opens on the interface language`, (await page.getByRole("tab", { selected: true }).first().innerText()).startsWith(lang === "en" ? c.english : c.german));
  await tab(true).click();
  await wait(800);
  check(`[${lang}] the seeded story loads into the editor (converted chapters)`, (await editor.innerText()).includes("A bridge built to guard the town"));
  check(`[${lang}] toolbar and editor fit 375px`, !(await overflow()));
  await tab(true).click();
  await wait(300);
  await editor.click();
  await page.keyboard.press("Control+End");
  await page.keyboard.press("Enter");
  await toolbar.getByRole("button", { name: c.heading }).click();
  await page.keyboard.type("Made in the old town");
  await page.keyboard.press("Enter");
  await page.keyboard.type("Each handle is ");
  await page.keyboard.press("Control+b");
  await page.keyboard.type("etched by hand");
  await page.keyboard.press("Control+b");
  await page.keyboard.type(".");
  await page.keyboard.press("Enter");
  await toolbar.getByRole("button", { name: c.bullets }).click();
  await page.keyboard.type("Stainless steel");
  const inList = await toolbar.getByRole("button", { name: c.bullets }).getAttribute("aria-pressed");
  await page.keyboard.press("Enter");
  await page.keyboard.type("Swiss made");
  await page.keyboard.press("Enter");
  await wait(400);
  await page.keyboard.press("Enter");
  await wait(500);
  check(`[${lang}] the list button is pressed inside the list and not after it`, inList === "true" && (await toolbar.getByRole("button", { name: c.bullets }).getAttribute("aria-pressed")) === "false", inList);
  // A link through the inline form, not window.prompt.
  await toolbar.getByRole("button", { name: c.link }).click();
  const linkField = card.getByLabel(c.linkLabel, { exact: true });
  await linkField.fill("javascript:alert(1)");
  await card.getByRole("button", { name: c.apply }).click();
  check(`[${lang}] a javascript: link is refused`, (await card.getByRole("button", { name: c.apply }).isVisible()));
  await linkField.fill("https://www.luzern.com/en/");
  await card.getByRole("button", { name: c.apply }).click();
  await wait(200);
  // A library photo and an uploaded one.
  await toolbar.getByRole("button", { name: c.library }).click();
  await wait(600);
  await page.getByRole("dialog").getByRole("button", { name: "lucerne old town" }).click();
  await page.getByRole("dialog").getByRole("button", { name: c.use }).click();
  await wait(500);
  const small = await makeImage(page, "small");
  await card.locator('[data-testid="photo-upload"]').setInputFiles({ name: "workbench.png", mimeType: "image/png", buffer: Buffer.from(small, "base64") });
  await wait(1200);
  const big = await makeImage(page, "big");
  await card.locator('[data-testid="photo-upload"]').setInputFiles({ name: "huge.jpg", mimeType: "image/jpeg", buffer: Buffer.from(big, "base64") });
  await wait(2500);
  check(`[${lang}] a photo too large after resizing is refused with a message`, await card.getByText(c.tooBig).isVisible());
  await card.getByText(c.tooBig).scrollIntoViewIfNeeded();
  await page.screenshot({ path: `${OUT}/m12-story-editor-${lang}.png` });
  await save();
  const knife = (await data(page)).products.find((p) => p.id === "p-knife");
  const doc = JSON.stringify(knife.longStory.body.en);
  check(`[${lang}] saved as Tiptap JSON: heading, bold, list, link`, doc.includes('"heading"') && doc.includes('"bold"') && doc.includes('"bulletList"') && doc.includes("https://www.luzern.com/en/"));
  const photosIn = (n) => (n.type === "image" ? [n.attrs.photo] : (n.content ?? []).flatMap(photosIn));
  const images = photosIn(knife.longStory.body.en);
  check(`[${lang}] the library photo is kept by slug and the upload as a small JPEG data URL`, images.includes("lucerne-old-town") && images.some((p) => /^data:image\/jpeg;base64,/.test(p) && p.length <= 300000), images.map((p) => p.slice(0, 30)));
  check(`[${lang}] no javascript: link was stored`, !doc.includes("javascript:"));
  check(`[${lang}] the bar confirms the save`, await page.getByRole("status").filter({ hasText: c.saved }).isVisible());
  const stored = await page.evaluate(() => localStorage.getItem("sk.demo").length);
  check(`[${lang}] demo state stays far below the storage budget`, stored < 1_500_000, stored);

  // C03: the teaser and the sheet render the rich story; a refresh keeps it.
  await open(page, "#/gifts/kapellbruecke-pocket-knife");
  await page.reload();
  await wait(1200);
  await page.getByRole("button", { name: c.read }).click();
  await wait(800);
  const sheet = page.getByRole("dialog");
  const sheetText = await sheet.innerText();
  if (lang === "en") {
    const shape = { heading: sheetText.includes("Made in the old town"), strong: await sheet.locator("strong", { hasText: "etched by hand" }).count(), items: await sheet.locator("ul li").count() };
    check(`[en] C03 sheet: the new heading, bold text and list`, shape.heading && shape.strong === 1 && shape.items === 2, shape);
    check(`[en] C03 sheet: the link opens safely`, (await sheet.locator('a[href="https://www.luzern.com/en/"]').getAttribute("rel")) === "noopener noreferrer");
    check(`[en] C03 sheet: the library and uploaded photos render`, (await sheet.locator('img[src^="data:image/jpeg"]').count()) === 1 && (await sheet.locator("img").count()) >= 4);
    check(`[en] C03 sheet: serif headings`, await sheet.locator("h3").first().evaluate((el) => getComputedStyle(el).fontFamily.toLowerCase().includes("serif")));
    await sheet.getByText("Made in the old town").scrollIntoViewIfNeeded();
    await page.screenshot({ path: `${OUT}/c03-story-sheet-en.png` });
  } else {
    check(`[de] C03 in German keeps the German story (seeded)`, sheetText.includes("Brücke") && !sheetText.includes("Made in the old town"));
  }
  await page.keyboard.press("Escape");
  // Closing the sheet may step the history back; let it settle before the next address.
  await wait(1000);

  // Fallback: no German story -> the English one with "Text in English" (R02).
  await open(page, "#/store/products/gifts/p-knife?step=story");
  const card2 = page.getByRole("region", { name: c.story });
  await tab(false).click();
  await card2.scrollIntoViewIfNeeded();
  await wait(800);
  const deEditor = card2.getByRole("textbox", { name: c.storyField, exact: true });
  await deEditor.click();
  await page.keyboard.press("Control+a");
  await page.keyboard.press("Delete");
  await wait(200);
  check(`[${lang}] an empty German story tells what German guests see`, (await card2.innerText()).includes(lang === "en" ? "No story in German yet" : "Noch keine Geschichte auf Deutsch"));
  await save();
  check(`[${lang}] the empty German body is not stored`, !(await data(page)).products.find((p) => p.id === "p-knife").longStory.body.de);
  if (lang === "de") {
    await open(page, "#/gifts/kapellbruecke-pocket-knife");
    await page.getByRole("button", { name: c.read }).click();
    await wait(800);
    const deSheet = await page.getByRole("dialog").innerText();
    check(`[de] C03 in German shows the English story with "Text auf Englisch"`, deSheet.includes("Made in the old town") && deSheet.includes(c.fallbackNote));
    await page.screenshot({ path: `${OUT}/c03-story-fallback-de.png` });
    await page.keyboard.press("Escape");
  }

  // A chapter-shape story stored before the change is converted on load.
  await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem("sk.demo"));
    s.data.products.find((p) => p.id === "p-giftbox").longStory = { title: { en: "An old story", de: "Eine alte Geschichte" }, chapters: [{ title: { en: "Old chapter", de: "Altes Kapitel" }, body: { en: "Old body text.", de: "Alter Text." }, photo: "gift-box" }] };
    localStorage.setItem("sk.demo", JSON.stringify(s));
  });
  await page.reload();
  await wait(1000);
  const box = (await data(page)).products.find((p) => p.id === "p-giftbox");
  check(`[${lang}] a stored chapter story becomes rich text per language`, box.longStory.body.en?.type === "doc" && box.longStory.body.de?.type === "doc" && !box.longStory.chapters);
  await open(page, "#/gifts/lucerne-gift-box");
  await page.getByRole("button", { name: c.read }).click();
  await wait(800);
  check(`[${lang}] C03 shows the converted chapter`, (await page.getByRole("dialog").innerText()).includes(lang === "en" ? "Old chapter" : "Altes Kapitel"));
  await page.keyboard.press("Escape");

  // --- Add gift ---
  await open(page, "#/store/products");
  await page.getByRole("link", { name: c.add }).click();
  await wait(1000);
  check(`[${lang}] "Add gift" opens the blank M12`, page.url().endsWith("#/store/products/gifts/new") && (await page.getByRole("heading", { level: 1 }).innerText()) === c.newGift);
  // Revision 2: no visibility switch; the bar says nothing is saved yet and offers "Save draft".
  check(`[${lang}] a new gift opens on step 1 and says a draft can be saved at any step`, (await page.locator("#step-title").innerText()).replace(/\s+/g, " ").trim() === c.stepOne && (await page.getByRole("status").filter({ hasText: c.notSaved }).isVisible()));
  await page.screenshot({ path: `${OUT}/m12-new-${lang}.png` });
  await saveDraft();
  check(`[${lang}] empty draft: name and category errors, nothing stored`, (await page.getByText(c.draftName).first().isVisible()) && (await page.getByText(c.categoryError).isVisible()) && page.url().endsWith("/gifts/new"));
  check(`[${lang}] focus moves to the name`, await page.evaluate(() => document.activeElement?.tagName === "INPUT"));
  const before = (await data(page)).products.length;
  // English text, so the stored record is found by its English name in both runs.
  await tab(true).click();
  await page.getByLabel(c.name, { exact: true }).fill("Chapel Bridge bottle opener");
  await page.getByRole("region", { name: lang === "en" ? "Photo and category" : "Foto und Kategorie" }).getByRole("button", { name: new RegExp(c.category) }).click();
  await wait(400);
  await page.getByRole("option", { name: c.pocketKnives }).click();
  await wait(300);
  await saveDraft();
  await wait(600);
  const afterDraft = await data(page);
  const created = afterDraft.products.find((p) => p.name.en === "Chapel Bridge bottle opener");
  check(`[${lang}] the draft is stored once, with a slug from the name`, afterDraft.products.length === before + 1 && created?.published === false && created.slug === "chapel-bridge-bottle-opener" && created.subcategoryId === "pocket-knives", created && { id: created.id, slug: created.slug });
  // Revision 2: the address keeps the step (`?step=basics`) and the bar says "Draft saved".
  check(`[${lang}] the address moves to the new gift's id and the bar says the draft is saved`, page.url().includes(`#/store/products/gifts/${created?.id}`) && (await page.getByRole("status").filter({ hasText: c.savedDraft }).isVisible()), page.url());
  await open(page, "#/store/products");
  await lastPage();
  check(`[${lang}] M11 lists it as a draft`, (await page.getByRole("list", { name: c.gifts }).getByRole("listitem").filter({ hasText: "Chapel Bridge bottle opener" }).innerText()).includes(c.draft));
  await open(page, "#/gifts");
  check(`[${lang}] C02 does not list the draft`, !(await body(page)).includes("Chapel Bridge bottle opener"));

  // Publishing needs complete text, a photo, an option for sale with a price and (revision 2)
  // the story. Publish sits on Review, which lists each step's gaps.
  const giftUrl = (step) => `#/store/products/gifts/${created.id}${step ? `?step=${step}` : ""}`;
  await open(page, giftUrl("review"));
  await page.getByRole("button", { name: c.publish, exact: true }).click();
  await wait(700);
  const review = await body(page);
  const refusedShown = { bar: await page.getByRole("status").filter({ hasText: c.refused }).isVisible(), photo: review.includes(c.photoRequired), options: review.includes(c.optionsError), text: [c.missingShort, c.missingOptions, c.missingCancel, c.missingStory].every((f) => review.includes(`${c.emptyAny} ${f}.`)) };
  check(`[${lang}] publish: blocked for text, story, photo and option price`, Object.values(refusedShown).every(Boolean), refusedShown);
  check(`[${lang}] the refused draft stays unpublished`, (await data(page)).products.find((p) => p.id === created.id).published === false);
  await page.screenshot({ path: `${OUT}/m12-publish-errors-${lang}.png` });
  // Each step in turn; a hash change keeps the unsaved draft.
  await open(page, giftUrl());
  await tab(true).click();
  await page.getByLabel(c.shortStory, { exact: true }).fill("A bottle opener with the Chapel Bridge cut into steel.");
  const photoCard = page.getByRole("region", { name: lang === "en" ? "Photo and category" : "Foto und Kategorie" });
  await photoCard.getByRole("button", { name: c.library }).click();
  await wait(600);
  await page.getByRole("dialog").getByRole("button", { name: "pocket knife" }).click();
  await page.getByRole("dialog").getByRole("button", { name: c.use }).click();
  await wait(400);
  await open(page, giftUrl("options"));
  await page.getByLabel(new RegExp(`^${c.nameEn}`)).first().fill("Standard");
  const priceField = page.getByLabel(new RegExp(`^${c.price}:`)).first();
  await priceField.fill("25");
  await priceField.press("Tab");
  const stockField = page.getByLabel(new RegExp(`^${c.inStock}:`)).first();
  await stockField.fill("8");
  await stockField.press("Tab");
  await open(page, giftUrl("payment"));
  await page.getByLabel(c.cancellation, { exact: true }).fill("Free cancellation until you pay.");
  await open(page, giftUrl("story"));
  await page.getByLabel(c.storyTitle, { exact: true }).fill("Opened on the bridge");
  await page.getByRole("region", { name: c.story }).getByRole("textbox", { name: c.storyField, exact: true }).click();
  await page.keyboard.type("Cut from one sheet of steel in the old town.");
  await wait(300);
  await open(page, giftUrl("review"));
  await page.getByRole("button", { name: c.publish, exact: true }).click();
  await wait(700);
  const live = (await data(page)).products.find((p) => p.id === created.id);
  check(`[${lang}] published with its photo, option, price and story`, live.published === true && live.photo === "pocket-knife" && live.variants[0].price === 2500 && live.variants[0].stock === 8 && live.longStory?.title?.en === "Opened on the bridge", { p: live.published, photo: live.photo, v: live.variants, story: live.longStory?.title });
  await open(page, "#/gifts");
  check(`[${lang}] C02 lists it once published`, (await body(page)).includes("Chapel Bridge bottle opener"));
  await open(page, `#/gifts/${live.slug}`);
  check(`[${lang}] C03 opens it by its slug`, (await body(page)).includes("Chapel Bridge bottle opener"));

  // An uploaded main photo shows on M11, C02 and C03 (every screen resolves it via photoUrl).
  await open(page, `#/store/products/gifts/${created.id}`);
  const mainCard = page.getByRole("region", { name: lang === "en" ? "Photo and category" : "Foto und Kategorie" });
  await mainCard.locator('[data-testid="photo-upload"]').setInputFiles({ name: "opener.png", mimeType: "image/png", buffer: Buffer.from(small, "base64") });
  await wait(1200);
  await save();
  const uploaded = (await data(page)).products.find((p) => p.id === created.id).photo;
  check(`[${lang}] the uploaded main photo is stored as a JPEG data URL`, /^data:image\/jpeg;base64,/.test(uploaded ?? ""));
  const dataImg = (scope) => scope.locator('img[src^="data:image/jpeg"]').count();
  await open(page, "#/store/products");
  await lastPage();
  check(`[${lang}] M11 ticket shows the uploaded photo`, (await dataImg(page.getByRole("list", { name: c.gifts }).getByRole("listitem").filter({ hasText: "Chapel Bridge bottle opener" }))) === 1);
  await open(page, "#/gifts");
  check(`[${lang}] C02 card shows the uploaded photo`, (await dataImg(page.locator("main, body").first())) >= 1);
  await open(page, `#/gifts/${live.slug}`);
  check(`[${lang}] C03 gallery shows the uploaded photo`, (await dataImg(page.locator("body"))) >= 1);

  // A second gift with the same name gets its own slug.
  await open(page, "#/store/products/gifts/new");
  await tab(true).click();
  await page.getByLabel(c.name, { exact: true }).fill("Chapel Bridge bottle opener");
  await page.getByRole("region", { name: lang === "en" ? "Photo and category" : "Foto und Kategorie" }).getByRole("button", { name: new RegExp(c.category) }).click();
  await wait(400);
  await page.getByRole("option", { name: c.pocketKnives }).click();
  await saveDraft();
  const slugs = (await data(page)).products.filter((p) => p.name.en === "Chapel Bridge bottle opener").map((p) => p.slug);
  check(`[${lang}] same name, unique slug`, slugs.length === 2 && slugs.includes("chapel-bridge-bottle-opener-2"), slugs);

  // An option added to an existing gift: new id, the old ids unchanged.
  await open(page, "#/store/products/gifts/p-knife?step=options");
  await tab(true).click();
  await page.getByRole("button", { name: c.addOption }).click();
  const lastName = page.getByLabel(new RegExp(`^${c.nameEn}`)).last();
  await lastName.fill("Extra large");
  const lastPrice = page.getByLabel(new RegExp(`^${c.price}:`)).last();
  await lastPrice.fill("74");
  await lastPrice.press("Tab");
  const lastStock = page.getByLabel(new RegExp(`^${c.inStock}:`)).last();
  await lastStock.fill("3");
  await lastStock.press("Tab");
  await save();
  const variants = (await data(page)).products.find((p) => p.id === "p-knife").variants;
  check(`[${lang}] the knife keeps s, m, l and gains a new option`, variants.length === 4 && variants.slice(0, 3).map((v) => v.id).join() === "s,m,l" && variants[3].id.startsWith("opt-") && variants[3].price === 7400, variants.map((v) => v.id));
  await open(page, "#/gifts/kapellbruecke-pocket-knife");
  check(`[${lang}] C03 lists the new option`, (await body(page)).includes("Extra large"));

  // Storage guard: with demo state near the budget, a save is refused instead of being lost.
  await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem("sk.demo"));
    s.data.products.find((p) => p.id === "p-chocolate").padding = "x".repeat(4_400_000);
    localStorage.setItem("sk.demo", JSON.stringify(s));
  });
  await page.reload();
  await wait(1000);
  await open(page, "#/store/products/gifts/p-keyring");
  await tab(true).click();
  await page.getByLabel(c.name, { exact: true }).fill("Pilatus keyring, brass");
  await save();
  check(`[${lang}] near the storage budget the save is refused in the bar`, (await page.getByRole("status").innerText()).includes(lang === "en" ? "storage on this device is full" : "Speicher des Prototyps") && (await data(page)).products.find((p) => p.id === "p-keyring").name.en !== "Pilatus keyring, brass");
  await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem("sk.demo"));
    delete s.data.products.find((p) => p.id === "p-chocolate").padding;
    localStorage.setItem("sk.demo", JSON.stringify(s));
  });
  await page.reload();
  await wait(1000);

  if (lang === "en") {
    await page.setViewportSize({ width: 1280, height: 900 });
    await open(page, `#/store/products/gifts/p-knife?step=story`);
    await page.getByRole("region", { name: c.story }).scrollIntoViewIfNeeded();
    await wait(600);
    await page.screenshot({ path: `${OUT}/m12-story-desktop-en.png` });
    await page.setViewportSize({ width: 375, height: 812 });
  }
  check(`[${lang}] no horizontal overflow`, !(await overflow()));
  check(`[${lang}] no console errors`, errors.length === 0, errors);
  await page.close();
}

await browser.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
