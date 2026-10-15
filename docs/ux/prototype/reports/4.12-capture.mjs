// 4.12 M17 Articles check (R16, R17, R18, AC16, AC31, AC33; outline step 12 and side paths):
// the Content tabs with counts, the list by language with Draft/Published chips, the editor
// (photo block, links in the shop's order, publish, unpublish), C19 and C20 after publishing,
// the link limit, an unpublished linked gift, the missing DE version, an empty language, a new
// article (save, refresh drops unsaved edits, publish validation), YouTube links, the remove
// confirmation and "More to discover". 375px DPR 2 in EN and DE, plus 1280px shots.
// Run from .check/drv: node 4.12-capture.mjs <screens dir>
import { esc, filterMenu, finish, start } from "./4.12-content-lib.mjs";

const OUT = process.argv[2];

// One page per part: a single page doing every load in a row ran the test machine out of
// resources (ERR_INSUFFICIENT_RESOURCES).
let page, check, T, wait, go, goIn, has, store, patch, reset, overflow, shot, toast, errors;
const open = async (lang) => {
  ({ page, check, T, wait, go, goIn, has, store, patch, reset, overflow, shot, toast, errors } = await start(lang, OUT));
  await reset("owner");
};
const close = async (part) => {
  check(`${part}: no horizontal overflow`, !(await overflow()));
  check(`${part}: no console errors`, errors.length === 0, errors);
  await page.close();
};
const L = (l) => T(`merchantContent.lang.${l}`);
const byName = (name) => page.getByRole("button", { name, exact: true });
// Filters are a "Filter" menu with ticked options as chips now; nothing ticked is All.
const filter = () => filterMenu(page, T("merchantContent.filtersLabel"));
const region = (name) => page.getByRole("region", { name });

for (const lang of ["en", "de"]) {
  await open(lang);
  const seed = await store();
  const counts = { articles: seed.data.articles.length, comments: seed.data.comments.length, reviews: seed.data.reviews.length };

  // ---- List: tabs with counts, language filter, chips ----
  await go("/store/content", 1200);
  const tabText = async (key) => (await page.getByRole("tab", { name: new RegExp("^" + esc(T(key))) }).innerText()).replace(/\s+/g, " ");
  check("Content has Articles, Comments and Reviews tabs with counts",
    (await tabText("merchantContent.tab.articles")).includes(String(counts.articles)) &&
    (await tabText("merchantContent.tab.comments")).includes(String(counts.comments)) &&
    (await tabText("merchantContent.tab.reviews")).includes(String(counts.reviews)), counts);
  check("Articles is selected by default", (await page.getByRole("tab", { selected: true }).innerText()).startsWith(T("merchantContent.tab.articles")));
  const allList = page.getByRole("list", { name: T("merchantArticles.filter.all") });
  check("All lists every language version, drafts included", (await allList.getByRole("link").count()) === counts.articles);
  const pilatusCard = allList.getByRole("link").filter({ hasText: "Pilatus" });
  check("the DE draft shows a Draft chip and \"No English version\"",
    (await pilatusCard.innerText()).includes(T("merchantArticles.status.draft")) && (await pilatusCard.innerText()).includes(T("merchantArticles.missing.en")));
  const waterCard = allList.getByRole("link").filter({ hasText: "Water Tower" });
  check("the EN-only story shows Published and \"No German version\"",
    (await waterCard.innerText()).includes(T("merchantArticles.status.published")) && (await waterCard.innerText()).includes(T("merchantArticles.missing.de")));
  check("no horizontal overflow on the list", !(await overflow()));
  await shot("m17-list");
  await shot("m17-list-full", { full: true });

  const deCount = seed.data.articles.filter((a) => a.language === "de").length;
  await filter().pick(L("de")); await wait(200);
  check("the German filter keeps ?lang=[\"de\"] in the URL", decodeURIComponent(page.url()).includes('lang=["de"]'), page.url());
  const deList = page.getByRole("list", { name: L("de") });
  check("German lists only the DE versions", (await deList.getByRole("link").count()) === deCount &&
    (await deList.locator("[lang]").evaluateAll((els) => els.filter((e) => e.tagName === "H3").every((e) => e.lang === "de"))));
  await filter().pick(L("en")); await wait(200);
  check("English lists only the EN versions", (await page.getByRole("list", { name: L("en") }).getByRole("link").count()) === seed.data.articles.length - deCount);
  await filter().pick(null); await wait(400);

  // ---- Step 12: open the DE draft, add a photo block, link a gift and a tour, tour first, publish ----
  await go("/store/content/articles/pilatus-de", 1200);
  check("the editor shows the draft state", await has(T("merchantArticles.publication.draft")));
  await shot("m17-editor-draft");
  await byName(T("merchantArticles.addBlockTo", { n: 1 })).click(); await wait(300);
  await page.getByRole("menuitem", { name: T("merchantArticles.block.image") }).click(); await wait(300);
  await byName(T("merchantArticles.action.publish")).first().click(); await wait(500);
  check("publishing with an empty photo block shows the field errors", await has(T("merchantArticles.error.photo")) && await has(T("merchantArticles.error.caption")));
  check("the panel sums up the fields to fix", (await has(T("merchantArticles.errors.publish.other", { count: 2 }))));
  const focused = await page.evaluate(() => document.activeElement?.getAttribute("aria-label") ?? "");
  check("focus moves to the first field to fix (the photo)", focused.startsWith(T("merchantArticles.photo.choose")), focused);
  check("nothing was published", (await store()).data.articles.find((a) => a.id === "pilatus-de").publication.status === "draft");
  await shot("m17-editor-errors");

  await page.evaluate(() => document.activeElement.click()); await wait(500);
  check("the photo sheet offers the shop's library", (await page.getByRole("dialog").locator("button[aria-pressed]").count()) >= 10);
  await shot("m17-photo-sheet");
  await page.getByRole("dialog").locator('button[aria-label="lucerne old town"]').click();
  await page.getByRole("dialog").getByRole("button", { name: T("merchantArticles.photoSheet.use") }).click(); await wait(500);
  const caption = lang === "de" ? "Bemalte Fassaden in der Altstadt" : "Painted facades in the old town";
  await page.locator('input[aria-invalid="true"]').first().fill(caption); await wait(200);
  check("choosing the photo and a caption clears the errors", !(await has(T("merchantArticles.error.photo"))) && (await page.locator('[aria-invalid="true"]').count()) === 0);

  let data = (await store()).data;
  const deArticleTour = data.tours.tours.find((x) => x.id === "old-town").name;
  const tourName = deArticleTour.de;
  const knifeDe = data.products.find((p) => p.id === "p-knife").name.de;
  await byName(T("merchantArticles.links.add")).click(); await wait(500);
  const sheet = page.getByRole("dialog");
  check("the link sheet lists published gifts and tours only", !(await sheet.innerText()).includes(data.tours.tours.find((x) => !x.published)?.name.de ?? "\u0000"));
  await sheet.getByRole("button", { name: T("merchantArticles.linkSheet.addItem", { name: knifeDe }) }).click();
  await sheet.getByRole("button", { name: T("merchantArticles.linkSheet.addItem", { name: tourName }) }).click(); await wait(200);
  check("the sheet counts the links (2 of 6)", (await sheet.innerText()).includes(T("merchantArticles.links.count", { count: 2 })));
  await shot("m17-link-sheet");
  await sheet.getByRole("button", { name: T("merchantArticles.linkSheet.done") }).click(); await wait(500);
  await byName(T("merchantArticles.moveUp", { name: tourName })).click(); await wait(200);
  const linksText = await region(T("merchantArticles.links")).innerText();
  check("the tour moved above the gift", linksText.indexOf(tourName) < linksText.indexOf(knifeDe) && linksText.indexOf(tourName) > 0);
  check("unsaved changes are marked", await has(T("merchantArticles.unsaved")));
  await byName(T("merchantArticles.action.publish")).first().click();
  check("publishing confirms with a toast", await toast(T("merchantArticles.toast.published", { language: L("de") })));
  await wait(500);
  const pilatus = (await store()).data.articles.find((a) => a.id === "pilatus-de");
  check("the article is stored as published, links in the shop's order",
    pilatus.publication.status === "published" && JSON.stringify(pilatus.links) === JSON.stringify([{ kind: "tour", id: "old-town" }, { kind: "gift", id: "p-knife" }]), pilatus.links);
  check("the photo block is stored with its caption", pilatus.sections[0].blocks.some((b) => b.type === "image" && b.photo === "lucerne-old-town" && b.caption === caption));
  check("read time is computed on save", pilatus.readMinutes >= 1, pilatus.readMinutes);
  check("the editor shows Published in German", await has(T("merchantArticles.publication.published", { language: L("de") })));
  await shot("m17-editor-published");

  // C19 and C20 (AC16, AC31).
  await goIn("de", "/stories");
  check("C19 in DE lists the published article", await has(pilatus.title));
  await goIn("en", "/stories");
  check("C19 in EN does not list it (its language only)", !(await has(pilatus.title)) && (await has("Musegg")));
  await goIn("de", "/stories/pilatus", 1500);
  // The guest page is in DE here, so the region has the DE label.
  const linkedText = await page.getByRole("region", { name: "Ein Stück davon mitnehmen" }).first().innerText();
  check("C20 shows the tour, then the gift (AC31)", linkedText.indexOf(tourName) >= 0 && linkedText.indexOf(tourName) < linkedText.indexOf(knifeDe), linkedText.slice(0, 160));
  check("C20 shows the new photo with its caption", (await page.locator(`img[alt="${caption}"]`).count()) === 1);
  await goIn(lang, "/store/content");

  // ---- Unpublish: confirm, then gone from C19 ----
  await go("/store/content/articles/pilatus-de", 1200);
  await byName(T("merchantArticles.action.unpublish")).first().click(); await wait(400);
  const unpub = page.locator("[data-slot=alert-dialog-dialog]");
  check("Unpublish asks first, naming the article", (await unpub.innerText()).includes(pilatus.title));
  await unpub.getByRole("button", { name: T("merchantArticles.action.unpublish") }).click();
  check("unpublishing confirms", await toast(T("merchantArticles.toast.unpublished")));
  await wait(500);
  check("the article is a draft again", (await store()).data.articles.find((a) => a.id === "pilatus-de").publication.status === "draft");
  await goIn("de", "/stories");
  check("C19 in DE no longer lists it", !(await has(pilatus.title)) && (await has("Museggmauer")));
  await goIn(lang, "/store/content");

  await close("list and step 12");

  await open(lang);
  data = (await store()).data;
  // ---- Link limit (AC31: at most 6) ----
  await go("/store/content/articles/musegg-morning-en", 1200);
  await byName(T("merchantArticles.links.add")).click(); await wait(500);
  const limitSheet = page.getByRole("dialog");
  const extras = ["p-knife", "p-giftbox", "p-chocolate", "p-keyring"].map((id) => data.products.find((p) => p.id === id).name.en);
  for (const name of extras) await limitSheet.getByRole("button", { name: T("merchantArticles.linkSheet.addItem", { name }) }).click();
  await wait(200);
  check("the sheet stops at 6 of 6", (await limitSheet.innerText()).includes(T("merchantArticles.links.count", { count: 6 })));
  check("the sheet shows the limit note", (await limitSheet.innerText()).includes(T("merchantArticles.links.limit")));
  const more = data.products.find((p) => p.id === "p-chocolate-bars").name.en;
  check("further Add buttons are off", await limitSheet.getByRole("button", { name: T("merchantArticles.linkSheet.addItem", { name: more }) }).isDisabled());
  await shot("m17-link-limit-sheet");
  await limitSheet.getByRole("button", { name: T("merchantArticles.linkSheet.done") }).click(); await wait(500);
  check("the card's add button is off at the limit", await byName(T("merchantArticles.links.add")).isDisabled());
  await region(T("merchantArticles.links")).scrollIntoViewIfNeeded();
  await shot("m17-link-limit");

  // ---- Linked item unpublished (R16): warning in M17, gone from C20 ----
  await patch(`s.data.products.find((p) => p.id === "p-postcards").published = false;`);
  await go("/store/content", 1200);
  const museggCard = page.getByRole("list", { name: T("merchantArticles.filter.all") }).getByRole("link").filter({ hasText: "A morning on the Musegg wall" });
  check("the list flags the unpublished link", (await museggCard.innerText()).includes(T("merchantArticles.unpublishedLinks.one")));
  await go("/store/content/articles/musegg-morning-en", 1200);
  const postcards = data.products.find((p) => p.id === "p-postcards").name.en;
  const linksCard = await region(T("merchantArticles.links")).innerText();
  check("the editor keeps the link with a warning", linksCard.includes(postcards) && linksCard.includes(T("merchantArticles.links.unpublished")));
  await region(T("merchantArticles.links")).scrollIntoViewIfNeeded();
  await shot("m17-link-unpublished");
  await goIn("en", "/stories/musegg-morning", 1500);
  check("C20 hides the unpublished gift", !(await page.getByRole("region", { name: "Bring a piece of it home" }).first().innerText()).includes(postcards));
  await goIn(lang, "/store/content");
  await patch(`delete s.data.products.find((p) => p.id === "p-postcards").published;`);

  // ---- DE version missing: add it as a draft copy ----
  await go("/store/content/articles/water-tower-en", 1200);
  check("the EN-only story says the German version is missing", await has(T("merchantArticles.version.missing.de")));
  await region(T("merchantArticles.version.title")).scrollIntoViewIfNeeded();
  await shot("m17-version-missing");
  await byName(T("merchantArticles.version.add.de")).click();
  check("adding it confirms with a toast", await toast(T("merchantArticles.toast.versionAdded.de")));
  await wait(1000);
  check("the editor opens the new DE draft", page.url().endsWith("/store/content/articles/water-tower-de"), page.url());
  const copy = (await store()).data.articles.find((a) => a.id === "water-tower-de");
  check("the DE version shares the slug, starts as a draft copy with the role in German",
    copy?.slug === "water-tower" && copy.publication.status === "draft" && copy.language === "de" && copy.author.role.startsWith("Inhaberin"), copy?.author);
  check("the new draft's editor links back to the English version", await has(T("merchantArticles.version.open.en")));

  // ---- More to discover (R18, AC33) ----
  const own = lang === "de" ? "lake-steamboat-de" : "lake-steamboat-en";
  await go(`/store/content/articles/${own}`, 1200);
  check("no picks: the newest others show", await has(T("merchantArticles.related.empty", { language: L(lang) })));
  await byName(T("merchantArticles.related.add")).click(); await wait(500);
  const storySheet = page.getByRole("dialog");
  const sheetText = await storySheet.innerText();
  const arts = (await store()).data.articles;
  const ownTitle = arts.find((a) => a.id === own).title;
  const otherLang = arts.filter((a) => a.language !== lang && a.publication.status === "published").map((a) => a.title);
  check("the story sheet never offers the story itself", !sheetText.includes(ownTitle));
  check("the story sheet never offers another language or a draft",
    otherLang.every((title) => !sheetText.includes(title)));
  const picks = arts.filter((a) => a.language === lang && a.publication.status === "published" && a.id !== own).slice(0, 3).map((a) => a.title);
  for (const title of picks) await storySheet.getByRole("button", { name: T("merchantArticles.linkSheet.addItem", { name: title }) }).click();
  await wait(200);
  check("three picks reach the limit", (await storySheet.innerText()).includes(T("merchantArticles.related.limit")));
  await storySheet.getByRole("button", { name: T("merchantArticles.linkSheet.done") }).click(); await wait(400);
  check("the card's add button is off at 3", await byName(T("merchantArticles.related.add")).isDisabled());
  await region(T("merchantArticles.related.title")).scrollIntoViewIfNeeded();
  await shot("m17-related");
  await byName(T("merchantArticles.action.save")).first().click();
  check("saving a published article confirms", await toast(T("merchantArticles.toast.savedPublished")));
  await go(`/stories/lake-steamboat`, 1500);
  const moreText = await page.getByRole("region", { name: T("article.more") }).first().innerText();
  check("C20 shows the three picks in order (AC33)", picks.every((p, i) => i === 0 || moreText.indexOf(picks[i - 1]) < moreText.indexOf(p)) && picks.every((p) => moreText.includes(p)), moreText.slice(0, 200));

  await close("limits, versions and picks");

  await open(lang);
  // ---- New article: save draft, refresh, publish validation, YouTube, remove confirmation ----
  await go("/store/content", 1200);
  await page.getByRole("link", { name: T("merchantArticles.new") }).click(); await wait(1000);
  check("New article opens the editor at /articles/new", page.url().includes("/store/content/articles/new"), page.url());
  check("the new editor asks for the language", await page.getByRole("radiogroup").first().isVisible());
  await byName(T("merchantArticles.action.saveDraft")).first().click(); await wait(400);
  check("a draft needs a title", await has(T("merchantArticles.error.title")));
  const newTitle = lang === "de" ? "Ein Abend am Quai" : "An evening on the quay";
  await page.getByLabel(T("merchantArticles.field.title"), { exact: true }).fill(newTitle);
  await byName(T("merchantArticles.action.saveDraft")).first().click();
  check("saving the draft confirms", await toast(T("merchantArticles.toast.saved")));
  await wait(1000);
  const created = (await store()).data.articles.find((a) => a.title === newTitle);
  check("the draft is stored in the chosen language with a unique id", !!created && created.language === lang && created.publication.status === "draft" && page.url().endsWith(`/articles/${created.id}`), created?.id);
  await page.getByLabel(T("merchantArticles.field.title"), { exact: true }).fill(newTitle + " (unsaved)");
  await page.reload(); await wait(1200);
  check("a refresh keeps the saved data and drops the unsaved edit", (await page.getByLabel(T("merchantArticles.field.title"), { exact: true }).inputValue()) === newTitle);
  await byName(T("merchantArticles.action.publish")).first().click(); await wait(500);
  const errCount = await page.locator('[aria-invalid="true"], [data-error="true"]').count();
  check("publishing an incomplete article lists its errors", errCount >= 4 && (await has(T("merchantArticles.error.cover"))), errCount);
  const active = await page.evaluate(() => document.activeElement?.tagName);
  check("focus moves to the first field to fix", active === "TEXTAREA" || active === "INPUT", active);
  await shot("m17-new-errors");
  await byName(T("merchantArticles.addBlockTo", { n: 1 })).click(); await wait(300);
  await page.getByRole("menuitem", { name: T("merchantArticles.block.video") }).click(); await wait(300);
  const yt = page.getByLabel(T("merchantArticles.field.youtube"), { exact: true });
  await yt.fill("not a video");
  await byName(T("merchantArticles.action.saveDraft")).first().click(); await wait(400);
  check("a malformed YouTube link is flagged", await has(T("merchantArticles.error.youtube")));
  await yt.fill("https://youtu.be/0UHyzRnAxy8"); await wait(200);
  check("a youtu.be link parses to the video id", !(await has(T("merchantArticles.error.youtube"))) && (await has("ID: 0UHyzRnAxy8")));
  const blockName = T("merchantArticles.blockName", { block: T("merchantArticles.block.video"), n: 1 });
  await byName(T("merchantArticles.remove", { name: blockName })).click(); await wait(400);
  const alert = page.locator("[data-slot=alert-dialog-dialog]");
  check("removing a block with content asks first (shared dialog)", (await alert.innerText()).includes(T("merchantArticles.removeBlock.confirm")));
  await shot("m17-remove-confirm");
  await alert.getByRole("button", { name: T("confirm.cancel") }).click(); await wait(300);
  check("Cancel keeps the block", (await yt.count()) === 1);
  await byName(T("merchantArticles.remove", { name: blockName })).click(); await wait(400);
  await page.locator("[data-slot=alert-dialog-dialog]").getByRole("button", { name: T("merchantArticles.removeBlock.confirm") }).click(); await wait(300);
  check("confirming removes the block", (await yt.count()) === 0);

  await close("new article");

  await open(lang);
  // ---- Empty language (M17) and no stories in DE (C19, §5.1) ----
  await patch(`s.data.articles = s.data.articles.filter((a) => a.language !== "de");`);
  // The filter is a list in the URL now: ?lang=["de"].
  await go("/store/content?lang=%5B%22de%22%5D", 1200);
  check("M17: an empty language shows its empty state", await has(T("merchantArticles.empty.de")));
  await shot("m17-empty-language");
  await reset("owner");
  await patch(`s.data.articles.forEach((a) => { if (a.language === "de") a.publication = { status: "draft" }; });`);
  await goIn("de", "/stories");
  check("C19 in DE shows the empty state when every DE story is a draft", await has("Es gibt noch keine Geschichten auf Deutsch."));
  await goIn(lang, "/store/content");

  // ---- Manager has the same access (D12); unknown id ----
  await reset("manager");
  await go("/store/content/articles/musegg-morning-en", 1200);
  check("the Manager opens the editor too", await has(T("merchantArticles.publication.published", { language: L("en") })));
  await page.getByRole("link", { name: T("merchantArticles.back") }).click(); await wait(900);
  check("\"All articles\" returns to the list with All selected",
    page.url().endsWith("#/store/content") && (await filter().chipCount()) === 0, page.url());
  await go("/store/content/articles/nope", 1200);
  check("an unknown article shows the not-found state", await has(T("merchantArticles.notFound")));

  await close("empty states and roles");

  // ---- 1280px: the table and the two-column editor ----
  const d = await start(lang, OUT, { width: 1280, height: 900 });
  await d.reset("owner");
  await d.go("/store/content", 1200);
  d.check("from 1024px the list is a table", (await d.page.getByRole("grid").count()) + (await d.page.getByRole("table").count()) >= 1);
  d.check("no horizontal overflow (list)", !(await d.overflow()));
  await d.shot("m17-list");
  await d.go("/store/content/articles/musegg-morning-en", 1200);
  d.check("no horizontal overflow (editor)", !(await d.overflow()));
  await d.shot("m17-editor");
  d.check("no console errors at 1280px", d.errors.length === 0, d.errors);
  await d.page.close();
}

await finish();
