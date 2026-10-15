// 4.13 M18 Comments check (AC16, D11, A3; outline step 13 and the "Hidden comment" side path):
// the Comments tab with filters and counts, the seeded hidden comment, a shop reply (one
// level), hiding a thread, deleting the spam comment through the shared dialog, C20 after each
// change (reply shown, hidden and deleted gone, count matching), showing again, the empty
// states and the Manager as reply author. 375px DPR 2 in EN and DE, plus 1280px shots.
// Run from .check/drv: node 4.13-capture.mjs <screens dir>
import { filterMenu, reveal, finish, start, esc } from "./4.12-content-lib.mjs";

const OUT = process.argv[2];
const ARTICLE = "musegg-morning-en";

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
const shortName = (name) => { const [f, ...r] = name.split(" "); return r.length ? `${f} ${r.at(-1)[0]}.` : f; };

/** What C20 should show for the article: not hidden, and not a reply under a hidden comment. */
const visibleOn = (comments, articleId) => {
  const shown = comments.filter((c) => c.articleId === articleId && !c.hidden);
  const ids = new Set(shown.map((c) => c.id));
  return shown.filter((c) => !c.parentId || ids.has(c.parentId));
};
const notReplied = (comments) => comments.filter((c) => !c.parentId && c.author.kind === "guest" && !c.hidden &&
  !comments.some((r) => r.parentId === c.id && r.author.kind === "shop")).length;

const tabs = (lang) => (lang === "de" ? "?tab=comments" : "?tab=comments");

for (const lang of ["en", "de"]) {
  await open(lang);
  const seed = (await store()).data;
  const guestName = (id) => shortName(seed.guests.find((g) => g.id === id).name);
  const byId = (id) => seed.comments.find((c) => c.id === id);
  const tom = byId("c3"), marie = byId("c1"), spam = byId("c5"), hidden = byId("c4");

  // ---- List: tab, filters with counts, the seeded hidden comment ----
  await go("/store/content" + tabs(lang), 1200);
  check("?tab=comments selects the Comments tab", (await page.getByRole("tab", { selected: true }).innerText()).startsWith(T("merchantContent.tab.comments")));
  const tagText = (key) => filter().option(T(key));
  check("the tab counts all comments; the filter counts Not replied and Hidden",
    (await page.getByRole("tab", { selected: true }).innerText()).includes(String(seed.comments.length)) &&
    (await tagText("merchantComments.filter.notReplied")).endsWith(String(notReplied(seed.comments))) &&
    (await tagText("merchantComments.filter.hidden")).endsWith("1"));
  check("each card names the comment's article and language",
    (await (await card(tom.text)).innerText()).includes("A morning on the Musegg wall") && (await (await card(tom.text)).innerText()).includes("EN"));
  check("a reply says whom it answers", (await (await card(byId("c2").text)).innerText()).includes(T("merchantComments.replyTo", { name: guestName("g-marie") })));
  await shot("m18-list");
  await filter().pick(T("merchantComments.filter.hidden")); await wait(400);
  check("Hidden lists the seeded hidden comment with its chip",
    (await page.locator("article").count()) === 1 && (await (await card(hidden.text)).innerText()).includes(T("merchantComments.hidden")));
  await shot("m18-hidden");
  await filter().pick(null); await wait(400);

  // ---- Reply as the shop (one level, A3) ----
  const tomName = guestName("g-tom");
  await (await card(tom.text)).getByRole("button", { name: T("merchantComments.replyTo", { name: tomName }) }).click(); await wait(500);
  const sheet = page.getByRole("dialog");
  check("the reply sheet quotes the comment", (await sheet.innerText()).includes(tom.text.slice(0, 40)));
  check("the sheet names how the reply shows (Ngọc, Shop)", (await sheet.innerText()).includes(T("merchantComments.sheet.help", { name: "Ngọc" })));
  await sheet.getByRole("button", { name: T("merchantComments.sheet.post") }).click(); await wait(300);
  check("an empty reply shows an inline error", (await sheet.innerText()).includes(T("merchantComments.sheet.error")));
  const replyText = lang === "de" ? "Danke, Tom! Früh hinaufgehen lohnt sich wirklich." : "Thank you, Tom! Going up early really is worth it.";
  await sheet.locator("textarea").fill(replyText);
  await shot("m18-reply-sheet");
  await sheet.getByRole("button", { name: T("merchantComments.sheet.post") }).click();
  check("posting confirms", await toast(T("merchantComments.postedToast")));
  await wait(500);
  const reply = (await store()).data.comments.find((c) => c.text === replyText);
  check("the reply is stored as the shop (Ngọc) under Tom's comment", reply?.author.kind === "shop" && reply.author.staffName === "Ngọc" && reply.parentId === "c3" && reply.articleId === ARTICLE);
  check("Tom's comment now shows Shop replied", (await (await card(tom.text)).innerText()).includes(T("merchantComments.shopReplied")));
  check("the reply card carries the Shop label", (await (await card(replyText)).innerText()).includes(T("merchantContent.shop")));
  check("a reply cannot be replied to (one level)", (await (await card(replyText)).getByRole("button", { name: new RegExp("^" + esc(T("merchantComments.action.reply"))) }).count()) === 0);

  // ---- Hide a comment with its thread ----
  const marieName = guestName("g-marie");
  await (await card(marie.text)).getByRole("button", { name: T("merchantComments.action.more", { name: marieName }) }).click(); await wait(300);
  await page.getByRole("menuitem", { name: T("merchantComments.action.hide") }).click();
  check("hiding confirms", await toast(T("merchantComments.hiddenToast")));
  await wait(400);
  check("the hidden comment shows the Hidden chip", (await (await card(marie.text)).innerText()).includes(T("merchantComments.hidden")));
  check("its reply shows it is hidden with the comment", (await (await card(byId("c2").text)).innerText()).includes(T("merchantComments.hiddenWithThread")));

  // ---- Delete the spam comment through the shared dialog ----
  const larsName = guestName("g-lars");
  await (await card(spam.text)).getByRole("button", { name: T("merchantComments.action.more", { name: larsName }) }).click(); await wait(300);
  await page.getByRole("menuitem", { name: T("merchantComments.action.delete") }).click(); await wait(400);
  const dialog = page.locator("[data-slot=alert-dialog-dialog]");
  check("Delete asks first with the shared dialog", (await dialog.innerText()).includes(T("merchantComments.delete.title", { name: larsName })) && (await dialog.innerText()).includes(T("merchantComments.delete.body")));
  await shot("m18-delete-confirm");
  await dialog.getByRole("button", { name: T("confirm.cancel") }).click(); await wait(300);
  check("Cancel keeps the comment", (await (await card(spam.text)).count()) === 1);
  await (await card(spam.text)).getByRole("button", { name: T("merchantComments.action.more", { name: larsName }) }).click(); await wait(300);
  await page.getByRole("menuitem", { name: T("merchantComments.action.delete") }).click(); await wait(400);
  await page.locator("[data-slot=alert-dialog-dialog]").getByRole("button", { name: T("merchantComments.delete.confirm") }).click();
  check("deleting confirms", await toast(T("merchantComments.deletedToast")));
  await wait(400);
  check("the comment is gone from M18 and from the data", (await (await card(spam.text)).count()) === 0 && !(await store()).data.comments.some((c) => c.id === "c5"));
  const thread = byId("c6");
  await (await card(byId("c6").text)).getByRole("button", { name: T("merchantComments.action.more", { name: guestName(thread.author.guestId) }) }).click(); await wait(300);
  await page.getByRole("menuitem", { name: T("merchantComments.action.delete") }).click(); await wait(400);
  check("deleting a comment with a reply names the reply", (await page.locator("[data-slot=alert-dialog-dialog]").innerText()).includes(T("merchantComments.delete.bodyReplies.one")));
  await page.locator("[data-slot=alert-dialog-dialog]").getByRole("button", { name: T("merchantComments.delete.confirm") }).click(); await wait(600);
  check("the reply goes with its comment (none is left without it)", !(await store()).data.comments.some((c) => c.id === "c6" || c.parentId === "c6"));
  await shot("m18-after");
  await shot("m18-after-full", { full: true });

  // ---- C20: reply shown, hidden and deleted gone, count matching (AC16) ----
  const now = (await store()).data.comments;
  const expected = visibleOn(now, ARTICLE);
  await goIn("en", "/stories/musegg-morning", 1500);
  const comments = page.getByRole("region", { name: /^Comments/ }).first();
  const heading = (await page.locator("#article-comments").innerText()).replace(/\s+/g, " ");
  check("C20 counts only what it shows", heading.endsWith(String(expected.length)), `${heading} vs ${expected.length}`);
  check("C20 shows the shop reply under Tom's comment", (await comments.innerText()).includes(replyText));
  const showAll = page.getByRole("button", { name: /^Show (all )?\d+ comment/ });
  if (await showAll.count()) { await showAll.click(); await wait(600); }
  const all = await page.locator("body").innerText();
  check("C20 no longer shows the hidden thread", !all.includes(marie.text) && !all.includes(byId("c2").text));
  check("C20 does not show the seeded hidden comment", !all.includes(hidden.text));
  check("C20 no longer shows the deleted spam", !all.includes(spam.text));
  await page.keyboard.press("Escape"); await wait(300);
  await comments.scrollIntoViewIfNeeded(); await wait(300);
  await shot("c20-after-m18");

  // ---- Show again; empty states ----
  await goIn(lang, "/store/content?tab=comments");
  await (await card(marie.text)).getByRole("button", { name: T("merchantComments.action.more", { name: marieName }) }).click(); await wait(300);
  await page.getByRole("menuitem", { name: T("merchantComments.action.show") }).click();
  check("showing again confirms", await toast(T("merchantComments.shownToast")));
  await (await card(hidden.text)).getByRole("button", { name: T("merchantComments.action.more", { name: guestName("g-elena") }) }).click(); await wait(300);
  await page.getByRole("menuitem", { name: T("merchantComments.action.show") }).click(); await wait(500);
  await filter().pick(T("merchantComments.filter.hidden")); await wait(400);
  check("with nothing hidden, Hidden shows its empty state", await has(T("merchantComments.empty.hidden")));
  await shot("m18-empty-hidden");
  await goIn("en", "/stories/musegg-morning", 1500);
  check("C20 shows the thread again", (await page.locator("body").innerText()).includes(marie.text) || (await page.getByRole("button", { name: /^Show (all )?\d+ comment/ }).count()) > 0);
  await patch("s.data.comments = [];");
  await goIn(lang, "/store/content?tab=comments");
  check("no comments: the empty state", await has(T("merchantComments.empty.all")));
  await shot("m18-empty");
  await close("owner");

  // ---- The Manager replies as Lukas (D12) ----
  await open(lang, "manager");
  await go("/store/content?tab=comments", 1200);
  await (await card(tom.text)).getByRole("button", { name: T("merchantComments.replyTo", { name: tomName }) }).click(); await wait(500);
  await page.getByRole("dialog").locator("textarea").fill("Manager reply");
  check("the sheet names Lukas for the Manager", (await page.getByRole("dialog").innerText()).includes(T("merchantComments.sheet.help", { name: "Lukas" })));
  await page.getByRole("dialog").getByRole("button", { name: T("merchantComments.sheet.post") }).click(); await wait(600);
  check("the Manager's reply is stored as Lukas", (await store()).data.comments.find((c) => c.text === "Manager reply")?.author.staffName === "Lukas");
  await close("manager");

  // ---- 1280px ----
  await open(lang, "owner", { width: 1280, height: 900 });
  await go("/store/content?tab=comments", 1200);
  check("from 1024px the comments are a table", (await page.getByRole("grid").count()) + (await page.getByRole("table").count()) >= 1);
  await shot("m18-list");
  await close("1280");
}

await finish();
