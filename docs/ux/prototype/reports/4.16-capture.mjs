// 4.16 M23 Reviews check (AC17, AC30, spec §4.11; outline step 14): the Reviews tab with
// filters and counts, no delete anywhere, a reply to a gift review and to a tour review (one in
// the other language), editing a reply, C03 and C09 showing the replies with the language
// notice, "Show more" for a long reply, C15 showing the reply on the guest's own review, the
// empty states and the Manager as reply author. 375px DPR 2 in EN and DE, plus 1280px shots.
// Run from .check/drv: node 4.16-capture.mjs <screens dir>
import { esc, filterMenu, reveal, finish, start } from "./4.12-content-lib.mjs";

const OUT = process.argv[2];

let page, check, T, wait, go, goIn, has, store, patch, reset, overflow, shot, toast, errors;
const open = async (lang, role = "owner", size) => {
  ({ page, check, T, wait, go, goIn, has, store, patch, reset, overflow, shot, toast, errors } = await start(lang, OUT, size));
  await reset(role);
};
const close = async (part) => {
  check(`${part}: no horizontal overflow`, !(await overflow()));
  check(`${part}: no console errors`, errors.length === 0, errors);
  await page.close();
};
// Filters are a "Filter" menu with ticked options as chips now; nothing ticked is All.
const filter = () => filterMenu(page, T("merchantContent.filtersLabel"));
// Lists are paged by 10: look for the card on each page (see `reveal`).
const card = (text) => reveal(page, page.locator("article").filter({ hasText: text }));
const pick = (text, lang) => text[lang] ?? text.en ?? text.de;

for (const lang of ["en", "de"]) {
  const other = lang === "en" ? "de" : "en";
  await open(lang);
  const seed = (await store()).data;
  const review = (id) => seed.reviews.find((r) => r.id === id);
  const kenji = review("r2"), marie = review("r1"), anna = review("sample-tour-old-town-1"), sophie = review("sample-tour-old-town-3");
  const replied = seed.reviews.filter((r) => r.reply).length;

  // ---- List: tab, filters, no delete ----
  await go("/store/content?tab=reviews", 1200);
  check("?tab=reviews selects the Reviews tab", (await page.getByRole("tab", { selected: true }).innerText()).startsWith(T("merchantContent.tab.reviews")));
  const tagText = (key) => filter().option(T(key));
  check("the tab counts all reviews; the filter counts Not replied and Replied",
    (await page.getByRole("tab", { selected: true }).innerText()).includes(String(seed.reviews.length)) &&
    (await tagText("merchantReviews.filter.notReplied")).endsWith(String(seed.reviews.length - replied)) &&
    (await tagText("merchantReviews.filter.replied")).endsWith(String(replied)));
  check("gift and tour reviews are both listed", (await (await card(pick(kenji.text, lang))).innerText()).includes(T("merchantArticles.kind.gift")) &&
    (await (await card(pick(anna.text, lang))).innerText()).includes(T("merchantArticles.kind.tour")));
  const destructive = await page.locator("main").getByRole("button", { name: /delete|löschen|remove|entfernen/i }).count() +
    // The list's own Filter menu button also has aria-haspopup; it is not a review action.
    await page.locator("main [aria-haspopup]").filter({ hasNotText: T("merchantContent.filtersLabel") }).count();
  check("no delete control and no menu anywhere on the tab (AC17)", destructive === 0, destructive);
  check("the rule says reviews can't be deleted", await has(T("merchantReviews.rule")));
  await shot("m23-list");
  await filter().pick(T("merchantReviews.filter.replied")); await wait(400);
  check("Replied lists the seeded replies with their author and date",
    (await page.locator("article").count()) === replied && (await (await card(pick(marie.text, lang))).innerText()).includes(T("merchantReviews.replyFrom", { name: marie.reply.by, date: "" }).replace(/ ·$/, "")));
  check("a reply in the other language carries the language note", lang === "en"
    ? (await (await card(pick(sophie.text, lang))).innerText()).includes(T("gifts.textInGerman"))
    : (await (await card(pick(marie.text, lang))).innerText()).includes(T("gifts.textInEnglish")));
  await shot("m23-replied");
  await filter().pick(null); await wait(400);

  // ---- Reply to a gift review ----
  await (await card(pick(kenji.text, lang))).getByRole("button", { name: T("merchantReviews.action.replyTo", { name: kenji.guestName }) }).click(); await wait(500);
  let sheet = page.getByRole("dialog");
  check("the sheet starts in the interface language for a review written in both",
    (await sheet.getByRole("radio", { name: T(`merchantContent.lang.${lang}`) }).isChecked()));
  await sheet.getByRole("button", { name: T("merchantReviews.sheet.post") }).click(); await wait(300);
  check("an empty reply shows an inline error", (await sheet.innerText()).includes(T("merchantComments.sheet.error")));
  const giftReply = lang === "de" ? "Danke, Kenji! Die grosse Ausführung gibt es bald auch in Rot." : "Thank you, Kenji! The large size comes in red soon too.";
  await sheet.locator("textarea").fill(giftReply);
  await shot("m23-reply-sheet");
  await sheet.getByRole("button", { name: T("merchantReviews.sheet.post") }).click();
  check("posting confirms", await toast(T("merchantReviews.postedToast")));
  await wait(400);
  let stored = (await store()).data.reviews.find((r) => r.id === "r2").reply;
  check("the reply is stored with its language and author (Ngọc)", stored?.text === giftReply && stored.language === lang && stored.by === "Ngọc", stored);
  check("the card now shows the reply and Replied", (await (await card(pick(kenji.text, lang))).innerText()).includes(giftReply) && (await (await card(pick(kenji.text, lang))).innerText()).includes(T("merchantReviews.status.replied")));

  // ---- Reply to a tour review in the other language ----
  await (await card(pick(anna.text, lang))).getByRole("button", { name: T("merchantReviews.action.replyTo", { name: anna.guestName }) }).click(); await wait(500);
  sheet = page.getByRole("dialog");
  await sheet.getByRole("radio", { name: T(`merchantContent.lang.${other}`) }).check({ force: true });
  const tourReply = other === "de" ? "Danke, Anna! Schön, dass Ihnen die bemalten Häuser gefallen haben." : "Thank you, Anna! We are glad you liked the painted houses.";
  await sheet.locator("textarea").fill(tourReply);
  await sheet.getByRole("button", { name: T("merchantReviews.sheet.post") }).click(); await wait(600);
  stored = (await store()).data.reviews.find((r) => r.id === anna.id).reply;
  check("a tour review reply is stored in the chosen language", stored?.language === other && stored.text === tourReply, stored);
  check("the M23 card notes the other language", (await (await card(pick(anna.text, lang))).innerText()).includes(T(other === "de" ? "gifts.textInGerman" : "gifts.textInEnglish")));

  // ---- Edit a reply (long, to check "Show more" on C03) ----
  await (await card(pick(marie.text, lang))).getByRole("button", { name: T("merchantReviews.action.editFor", { name: marie.guestName }) }).click(); await wait(500);
  sheet = page.getByRole("dialog");
  check("Edit reply opens prefilled", (await sheet.locator("textarea").inputValue()) === marie.reply.text && (await sheet.innerText()).includes(T("merchantReviews.sheet.titleEdit", { name: marie.guestName })));
  const edited = "Thank you, Marie. We are glad the knife was ready before your train, and that the engraving came out well. Safe travels, and come and see us again next time you are in Lucerne!";
  await sheet.getByRole("radio", { name: T("merchantContent.lang.en") }).check({ force: true });
  await sheet.locator("textarea").fill(edited);
  await sheet.getByRole("button", { name: T("merchantReviews.sheet.save") }).click();
  check("saving the edit confirms", await toast(T("merchantReviews.savedToast")));
  await wait(400);
  check("the edited reply replaces the old one", (await store()).data.reviews.find((r) => r.id === "r1").reply.text === edited);
  check("the Replied count grows by the two new replies", (await tagText("merchantReviews.filter.replied")).endsWith(String(replied + 2)));
  await (await card(pick(marie.text, lang))).scrollIntoViewIfNeeded();
  await shot("m23-after");

  // ---- C03: the gift page shows both replies; the long one gets "Show more" ----
  await goIn(lang, "/gifts/kapellbruecke-pocket-knife", 1500);
  const giftReviews = page.locator("#gift-reviews");
  await giftReviews.scrollIntoViewIfNeeded(); await wait(400);
  const giftText = await giftReviews.innerText();
  check("C03 shows the new reply with its author", giftText.includes(giftReply) && giftText.includes(T("reviewReply.from", { name: "Ngọc" })));
  check("C03 shows the edited reply", giftText.includes(edited.slice(0, 40)));
  check("C03 notes an English reply in a German interface (AC30)", lang === "en" || giftText.includes(T("gifts.textInEnglish")));
  const marieCard = giftReviews.locator("li").filter({ hasText: edited.slice(0, 30) });
  check("a long reply gets \"Show more\" even under a short review", (await marieCard.getByRole("button", { name: T("detail.reviews.showMore") }).count()) === 1);
  await shot("c03-reply");
  await marieCard.getByRole("button", { name: T("detail.reviews.showMore") }).click(); await wait(700);
  check("the review sheet shows the full reply", (await page.getByRole("dialog").innerText()).includes(edited));
  await shot("c03-reply-sheet");
  await page.keyboard.press("Escape"); await wait(400);

  // ---- C09: the tour page shows the reply in the other language with the notice ----
  await go("/tours/lucerne-old-town-walk", 1500);
  const tourReviews = page.locator("#tour-reviews");
  await tourReviews.scrollIntoViewIfNeeded(); await wait(400);
  const tourText = await tourReviews.innerText();
  check("C09 shows the tour reply", tourText.includes(tourReply));
  const annaCard = tourReviews.locator("li").filter({ hasText: tourReply.slice(0, 20) });
  check("C09 notes the reply's other language (AC30)", (await annaCard.innerText()).includes(T(other === "de" ? "gifts.textInGerman" : "gifts.textInEnglish")));
  const sophieCard = tourReviews.locator("li").filter({ hasText: sophie.reply.text.slice(0, 20) });
  check("the seeded German reply has a notice in EN only", lang === "en"
    ? (await sophieCard.innerText()).includes(T("gifts.textInGerman"))
    : !(await sophieCard.innerText()).includes(T("gifts.textInGerman")));
  await annaCard.scrollIntoViewIfNeeded();
  await shot("c09-reply");

  // ---- C15: the guest's own review shows the shop's reply ----
  const order = seed.orders.find((o) => o.ref === "SK-1017" || o.id.toLowerCase() === "sk-1017");
  await patch(`s.data.signedInGuestId = "g-marie"; s.data.reviews.push({ id: "rv-${order.id}-p-knife", productId: "p-knife", guestName: "Marie D.", rating: 5, text: { en: "Neat engraving." }, createdAt: s.data.reviews[0].createdAt, purchasedAt: s.data.reviews[0].purchasedAt, reply: { text: "Thank you for your order, Marie!", language: "en", by: "Ngọc", at: s.data.reviews[0].createdAt } });`);
  await go(`/account/orders/${order.id}`, 1500);
  check("C15 shows the reply under the guest's own review", (await page.locator("body").innerText()).includes("Thank you for your order, Marie!"));
  await close("owner");

  // ---- Empty states ----
  await open(lang);
  await patch("s.data.reviews.forEach((r) => { delete r.reply; });");
  await go("/store/content?tab=reviews", 1200);
  await filter().pick(T("merchantReviews.filter.replied")); await wait(400);
  check("no replies: Replied shows its empty state", await has(T("merchantReviews.empty.replied")));
  await shot("m23-empty-replied");
  await patch("s.data.reviews.forEach((r) => { r.reply = { text: 'Thanks!', language: 'en', by: 'Ngọc', at: r.createdAt }; });");
  await go("/store/content?tab=reviews", 1200);
  await filter().pick(T("merchantReviews.filter.notReplied")); await wait(400);
  check("all replied: Not replied shows its empty state", await has(T("merchantReviews.empty.notReplied")));
  await close("empty states");

  // ---- The Manager replies as Lukas (D12) ----
  await open(lang, "manager");
  await go("/store/content?tab=reviews", 1200);
  await (await card(pick(kenji.text, lang))).getByRole("button", { name: T("merchantReviews.action.replyTo", { name: kenji.guestName }) }).click(); await wait(500);
  check("the sheet names Lukas for the Manager", (await page.getByRole("dialog").innerText()).includes(T("merchantReviews.sheet.help", { name: "Lukas" })));
  await page.getByRole("dialog").locator("textarea").fill("Manager reply");
  await page.getByRole("dialog").getByRole("button", { name: T("merchantReviews.sheet.post") }).click(); await wait(600);
  check("the Manager's reply is stored as Lukas", (await store()).data.reviews.find((r) => r.id === "r2").reply?.by === "Lukas");
  await close("manager");

  // ---- 1280px ----
  await open(lang, "owner", { width: 1280, height: 900 });
  await go("/store/content?tab=reviews", 1200);
  check("from 1024px the reviews are a table", (await page.getByRole("grid").count()) + (await page.getByRole("table").count()) >= 1);
  check("no delete control at 1280px either", (await page.locator("main").getByRole("button", { name: /delete|löschen|remove|entfernen/i }).count()) === 0);
  await shot("m23-list");
  await close("1280");
}

await finish();
