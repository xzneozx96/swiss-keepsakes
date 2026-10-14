// 4.1 self-check: the Phase 4 seeds (outline §4 "Seeds") and the stored-state backfill (D5),
// read from createSeedState() as right after Reset.
// Run: cd front-end && npx -y tsx --tsconfig tsconfig.json ../docs/ux/prototype/reports/4.1-selfcheck.ts
import type { PickupPlace } from "@/features/catalog/types";
import type { StoredDemoData } from "@/features/demo/upgrade";

import { existsSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { isDeepStrictEqual } from "node:util";

import type { ArticleComment } from "@/features/content/types";

import { shop } from "@/features/catalog/seed";
import { DEMO_START, demoAt } from "@/features/demo/clock";
import { createSeedState } from "@/features/demo/seed";
import { upgradeDemoData } from "@/features/demo/upgrade";
// The C01 story teasers these pairs replaced in step 4.2, kept here as the 4.1 expectation.
const storyTeasers = [
  { id: "musegg-morning", photo: "musegg-wall", readMinutes: 4, title: { en: "A morning on the Musegg wall", de: "Ein Morgen auf der Museggmauer" } },
  { id: "lion-monument", photo: "lion-monument", readMinutes: 6, title: { en: "The story behind the Lion Monument", de: "Die Geschichte hinter dem Löwendenkmal" } },
  { id: "lake-steamboat", photo: "lake-steamboat", readMinutes: 5, title: { en: "Crossing the lake by steamboat", de: "Mit dem Dampfschiff über den See" } },
];
import { createTourSeed } from "@/features/tours/seed";

let passes = 0;
let fails = 0;
function check(label: string, ok: boolean, detail?: unknown) {
  if (ok) passes++;
  else fails++;
  console.log(`  ${ok ? "PASS" : "FAIL"} ${label}${ok || detail === undefined ? "" : ` — got ${JSON.stringify(detail)}`}`);
}
const expect = (label: string, actual: unknown, expected: unknown) =>
  check(label, isDeepStrictEqual(actual, expected), { actual, expected });

const data = createSeedState(0).data;
const before = (iso: string) => Date.parse(iso) < DEMO_START;
const sorted = (xs: string[]) => [...xs].sort();

/** The static `pickupPlaces` export in catalog/seed.ts as it was before step 4.1, copied verbatim. */
const pickupPlacesBefore: PickupPlace[] = [
  {
    id: "altstadt",
    name: { en: "Shop Altstadt", de: "Laden Altstadt" },
    address: "Kornmarkt 9, 6004 Luzern",
    openingHours: { en: "Mon–Sat 10:00–18:30", de: "Mo–Sa 10:00–18:30" },
    instructions: {
      en: "Show your order reference at the counter.",
      de: "Zeigen Sie Ihre Bestellnummer an der Kasse.",
    },
  },
  {
    id: "bahnhof",
    name: { en: "Pickup point Bahnhof", de: "Abholstelle Bahnhof" },
    address: "Zentralstrasse 1, 6003 Luzern",
    openingHours: {
      en: "Mon–Fri 08:00–19:00, Sat 09:00–17:00",
      de: "Mo–Fr 08:00–19:00, Sa 09:00–17:00",
    },
    instructions: {
      en: "Locker desk next to the main hall. Bring your order reference.",
      de: "Schalter neben der Haupthalle. Bringen Sie Ihre Bestellnummer mit.",
    },
  },
];

console.log("=== Articles ===");
const { articles } = data;
const published = articles.filter((a) => a.publication.status === "published");
const languagesBySlug = new Map<string, string[]>();
for (const a of published) languagesBySlug.set(a.slug, [...(languagesBySlug.get(a.slug) ?? []), a.language]);
const slugsWith = (langs: string[]) =>
  sorted([...languagesBySlug].filter(([, l]) => isDeepStrictEqual(sorted(l), langs)).map(([slug]) => slug));
type Article = (typeof articles)[number];
const blocksOf = (a: Article) => a.sections.flatMap((s) => s.blocks);
for (const a of articles) {
  const pub = a.publication.status === "published" ? `published ${a.publication.publishedAt}` : "draft";
  const types = blocksOf(a).map((b) => b.type);
  const tally = ["paragraph", "image", "video", "audio"].flatMap((t) => {
    const n = types.filter((x) => x === t).length;

    return n ? [`${n} ${t}`] : [];
  });
  console.log(`  ${a.language.toUpperCase()} ${a.slug} · ${pub} · by ${a.author.name} · ${a.sections.length} sections · ${types.length} blocks (${tally.join(", ")}) · links ${a.links.map((l) => `${l.kind}:${l.id}`).join(",") || "-"}`);
}
expect("article ids are unique", new Set(articles.map((a) => a.id)).size, articles.length);
expect("one version per slug and language", new Set(articles.map((a) => `${a.slug}/${a.language}`)).size, articles.length);
expect("published in both EN and DE, sharing a slug", slugsWith(["de", "en"]), ["lake-steamboat", "lion-monument", "musegg-morning"]);
expect("published in EN only", slugsWith(["en"]).length, 1);
expect("published in DE only", slugsWith(["de"]).length, 1);
const drafts = articles.filter((a) => a.publication.status === "draft");
check("a DE draft exists", drafts.some((a) => a.language === "de"), drafts.map((a) => a.id));
check("the draft's slug is its own (no published version)", drafts.every((d) => !languagesBySlug.has(d.slug)));
for (const teaser of storyTeasers) {
  const en = published.find((a) => a.slug === teaser.id && a.language === "en");
  const de = published.find((a) => a.slug === teaser.id && a.language === "de");
  expect(
    `${teaser.id} matches its discovery teaser (titles, photo, read time)`,
    [en?.title, de?.title, en?.photo, de?.photo, en?.readMinutes, de?.readMinutes],
    [teaser.title.en, teaser.title.de, teaser.photo, teaser.photo, teaser.readMinutes, teaser.readMinutes],
  );
}
check("every published article links at least one gift or tour", published.every((a) => a.links.length > 0));
check("no article links more than 6 items (R16)", articles.every((a) => a.links.length <= 6));
check("related stories: at most 3, never itself, each slug exists (R18)", articles.every((a) => a.related.length <= 3 && !a.related.includes(a.slug) && a.related.every((slug) => articles.some((x) => x.slug === slug))));
check("no article links the same item twice (R16)", articles.every((a) => new Set(a.links.map((l) => `${l.kind}:${l.id}`)).size === a.links.length));
const productIds = new Set(data.products.map((p) => p.id));
const tours = data.tours?.tours ?? [];
const linkedProducts = articles.flatMap((a) => a.links.filter((l) => l.kind === "gift").map((l) => l.id));
const linkedTours = articles.flatMap((a) => a.links.filter((l) => l.kind === "tour").map((l) => l.id));
check("every linked gift id resolves", linkedProducts.every((id) => productIds.has(id)), linkedProducts.filter((id) => !productIds.has(id)));
check("every linked tour id resolves", linkedTours.every((id) => tours.some((t) => t.id === id)), linkedTours);
check("every linked tour is published (PRD §11)", linkedTours.every((id) => tours.find((t) => t.id === id)?.published));
const photos = new Set(readdirSync(resolve(process.cwd(), "src/assets/photos")).map((f) => f.replace(/\.jpg$/, "")));
check("every article photo exists in src/assets/photos", articles.every((a) => photos.has(a.photo)), articles.map((a) => a.photo).filter((p) => !photos.has(p)));
check(
  "every article has a non-empty intro and 2–4 sections",
  articles.every((a) => a.intro.trim() !== "" && a.sections.length >= 2 && a.sections.length <= 4),
  articles.map((a) => [a.id, a.intro.length, a.sections.length]),
);
check(
  "section ids are kebab-case and unique per article; every section has a heading and blocks",
  articles.every(
    (a) =>
      new Set(a.sections.map((s) => s.id)).size === a.sections.length &&
      a.sections.every((s) => /^[a-z0-9]+(-[a-z0-9]+)*$/.test(s.id) && s.heading.trim() !== "" && s.blocks.length > 0),
  ),
  articles.map((a) => [a.id, a.sections.map((s) => s.id)]),
);
/** Section ids with their block types in order, e.g. "nine-towers:paragraph+video". */
const shape = (a: Article) => a.sections.map((s) => `${s.id}:${s.blocks.map((b) => b.type).join("+")}`);
const pairs = sorted([...new Set(articles.map((a) => a.slug))]).flatMap((slug) => {
  const enVersion = articles.find((a) => a.slug === slug && a.language === "en");
  const deVersion = articles.find((a) => a.slug === slug && a.language === "de");

  return enVersion && deVersion ? [[enVersion, deVersion] as const] : [];
});
expect("EN/DE pairs compared", pairs.map(([enVersion]) => enVersion.slug), ["lake-steamboat", "lion-monument", "musegg-morning"]);
check(
  "each EN/DE pair has the same section ids and block types, in the same order",
  pairs.every(([enVersion, deVersion]) => isDeepStrictEqual(shape(enVersion), shape(deVersion))),
  pairs.map(([enVersion, deVersion]) => ({ en: shape(enVersion), de: shape(deVersion) })),
);
const images = articles.flatMap((a) => blocksOf(a).flatMap((b) => (b.type === "image" ? [{ id: a.id, cover: a.photo, ...b }] : [])));
console.log(`  inline images: ${images.map((i) => `${i.id}:${i.photo}`).join(" ")}`);
check(
  "every inline image is in src/assets/photos, is not the cover and has a caption",
  images.length > 0 && images.every((i) => photos.has(i.photo) && i.photo !== i.cover && i.caption.trim() !== ""),
  images.filter((i) => !photos.has(i.photo) || i.photo === i.cover || !i.caption.trim()),
);
check("at most two inline images per article", articles.every((a) => blocksOf(a).filter((b) => b.type === "image").length <= 2));
const withBlock = (type: string) => sorted(articles.filter((a) => blocksOf(a).some((b) => b.type === type)).map((a) => a.id));
expect("only the two Musegg versions have a video", withBlock("video"), ["musegg-morning-de", "musegg-morning-en"]);
expect("only the two Musegg versions have an audio clip", withBlock("audio"), ["musegg-morning-de", "musegg-morning-en"]);
const allBlocks = articles.flatMap(blocksOf);
expect("both videos are the Musegg towers video", allBlocks.flatMap((b) => (b.type === "video" ? [b.youtubeId] : [])), ["0UHyzRnAxy8", "0UHyzRnAxy8"]);
expect("both audio clips are tower-clock", allBlocks.flatMap((b) => (b.type === "audio" ? [b.audio] : [])), ["tower-clock", "tower-clock"]);
check("src/assets/audio/tower-clock.mp3 exists", existsSync(resolve(process.cwd(), "src/assets/audio/tower-clock.mp3")));
const museggEnArticle = articles.find((a) => a.id === "musegg-morning-en");
expect(
  "Musegg reads wall at dawn, nine towers + video, first clock + audio, old town",
  museggEnArticle && museggEnArticle.sections.map((s) => s.blocks.map((b) => b.type)),
  [["paragraph", "paragraph", "image"], ["paragraph", "video"], ["paragraph", "audio"], ["paragraph", "image"]],
);
check(
  `authors are shop staff (Lukas or Ngọc) with a role at ${shop.name}`,
  articles.every((a) => ["Lukas", "Ngọc"].includes(a.author.name) && a.author.role.endsWith(`, ${shop.name}`)),
  articles.map((a) => a.author),
);
const articleDates = articles.flatMap((a) => [a.updatedAt, ...(a.publication.status === "published" ? [a.publication.publishedAt] : [])]);
check("article dates fall in October 2026, before the demo start", articleDates.every((d) => before(d) && d >= "2026-10-01"), articleDates);

console.log("\n=== Comments ===");
const { comments } = data;
const articleById = new Map(articles.map((a) => [a.id, a]));
const commentById = new Map(comments.map((c) => [c.id, c]));
for (const c of comments) {
  const who = c.author.kind === "guest" ? c.author.guestId : `shop:${c.author.staffName}`;
  console.log(`  ${c.id} on ${c.articleId}${c.parentId ? ` ↳ ${c.parentId}` : ""} · ${who}${c.hidden ? " · hidden" : ""}`);
}
expect("comment ids are unique", commentById.size, comments.length);
check("every comment's articleId resolves", comments.every((c) => articleById.has(c.articleId)));
check(
  "every parentId points to a top-level comment on the same article",
  comments.every((c) => {
    if (!c.parentId) return true;
    const parent = commentById.get(c.parentId);

    return !!parent && !parent.parentId && parent.articleId === c.articleId;
  }),
);
expect("exactly one hidden comment", comments.filter((c) => c.hidden).length, 1);
const museggEn = comments.filter((c) => c.articleId === "musegg-morning-en");
const shopReplies = museggEn.filter((c) => c.author.kind === "shop");
check("EN Musegg: one shop reply, to a guest comment", shopReplies.length === 1 && commentById.get(shopReplies[0].parentId ?? "")?.author.kind === "guest", shopReplies);
check("the shop reply is signed by named staff (Lukas)", shopReplies.every((c) => c.author.kind === "shop" && c.author.staffName === "Lukas"));
/** c1–c7 as they were before the demo comments c8+ (14.10.2026), copied verbatim: M18 and 4.4 rely on them. */
const firstSeven: ArticleComment[] = [
  {
    id: "c1",
    articleId: "musegg-morning-en",
    author: { kind: "guest", guestId: "g-marie" },
    text: "We went up on our last morning and had the wall almost to ourselves. Is it true that the Zyt clock strikes before all the others? We thought we heard it a minute early.",
    createdAt: demoAt({ days: -9, hours: 8 }),
    hidden: false,
  },
  {
    id: "c2",
    articleId: "musegg-morning-en",
    author: { kind: "shop", staffName: "Lukas" },
    text: "It is, Marie. The Zyt tower clock is the oldest in town, and by tradition it may strike one minute before every other clock in Lucerne. Thank you for going up so early!",
    createdAt: demoAt({ days: -8, hours: -1 }),
    hidden: false,
    parentId: "c1",
  },
  {
    id: "c3",
    articleId: "musegg-morning-en",
    author: { kind: "guest", guestId: "g-tom" },
    text: "Good tip about going early. By ten the stairs in the towers were busy, but the view over the roofs was worth it.",
    createdAt: demoAt({ days: -7, hours: 10 }),
    hidden: false,
  },
  {
    id: "c4",
    articleId: "musegg-morning-en",
    author: { kind: "guest", guestId: "g-elena" },
    text: "Anyone want to share a taxi to Zurich airport on Sunday? Call me on +41 79 000 00 00.",
    createdAt: demoAt({ days: -5, hours: 12 }),
    hidden: true,
  },
  {
    id: "c5",
    articleId: "musegg-morning-en",
    author: { kind: "guest", guestId: "g-lars" },
    text: "Designer watches and bags, 80% off today only!!! Order now at best-deals-shop.example",
    createdAt: demoAt({ days: -3, hours: -7 }),
    hidden: false,
  },
  {
    id: "c6",
    articleId: "musegg-morning-de",
    author: { kind: "guest", guestId: "g-daniel" },
    text: "Wir waren an einem Sonntagmorgen oben und hatten die Mauer fast für uns allein. Die Treppe im Männliturm ist steil, aber die Aussicht lohnt sich.",
    createdAt: demoAt({ days: -6, hours: 7 }),
    hidden: false,
  },
  {
    id: "c7",
    articleId: "musegg-morning-de",
    author: { kind: "guest", guestId: "g-peter" },
    text: "Danke für den Tipp! Wir gehen morgen früh hinauf, bevor es voll wird.",
    createdAt: demoAt({ days: -2, hours: 9 }),
    hidden: false,
    parentId: "c6",
  },
];
expect("c1–c7 are unchanged (c1 + Lukas's reply c2, c4 hidden, c5 spam, c6 + guest reply c7)", firstSeven.map((c) => commentById.get(c.id)), firstSeven);
check("nobody replies to the hidden c4 or the spam c5", !comments.some((c) => c.parentId === "c4" || c.parentId === "c5"), comments.filter((c) => c.parentId === "c4" || c.parentId === "c5").map((c) => c.id));
const museggEnAfterDelete = museggEn.filter((c) => !c.hidden && c.id !== "c5").length;
check("EN Musegg keeps 4+ visible comments after the spam c5 is deleted (M18)", museggEnAfterDelete >= 4, museggEnAfterDelete);
const onDrafts = comments.filter((c) => articleById.get(c.articleId)?.publication.status !== "published");
check("no comment on a draft", onDrafts.length === 0, onDrafts.map((c) => `${c.id}:${c.articleId}`));
type Comment = (typeof comments)[number];
const isGuest = (c: Comment | undefined) => c?.author.kind === "guest";
const perVersion = published.map((a) => {
  const all = comments.filter((c) => c.articleId === a.id);
  const visible = all.filter((c) => !c.hidden);
  const parentOf = (c: Comment) => (c.parentId ? commentById.get(c.parentId) : undefined);

  return {
    id: a.id,
    visible: visible.length,
    shopReplies: visible.filter((c) => c.author.kind === "shop" && parentOf(c)).length,
    guestReplies: visible.filter((c) => isGuest(c) && isGuest(parentOf(c))).length,
    unreplied: visible.filter((c) => !c.parentId && !visible.some((r) => r.parentId === c.id)).length,
    days: new Set(all.map((c) => c.createdAt.slice(0, 10))).size,
  };
});
for (const v of perVersion) {
  console.log(`  ${v.id}: ${v.visible} visible · ${v.shopReplies} shop replies · ${v.guestReplies} guest replies · ${v.unreplied} top-level without reply · on ${v.days} days`);
}
const everyVersion = (label: string, ok: (v: (typeof perVersion)[number]) => boolean) =>
  check(label, perVersion.length === published.length && perVersion.every(ok), perVersion.filter((v) => !ok(v)));
everyVersion("every published version has 4–7 visible comments", (v) => v.visible >= 4 && v.visible <= 7);
everyVersion("every published version has a shop reply and a guest-to-guest reply (A3)", (v) => v.shopReplies >= 1 && v.guestReplies >= 1);
everyVersion("every published version has a visible top-level comment without a reply", (v) => v.unreplied >= 1);
everyVersion("each version's comments are spread over 3+ days", (v) => v.days >= 3);
const shopComments = comments.filter((c) => c.author.kind === "shop");
check(
  "every shop comment replies to a guest and is signed by the story's author (Lukas or Ngọc)",
  shopComments.every((c) => c.author.kind === "shop" && isGuest(commentById.get(c.parentId ?? "")) && c.author.staffName === articleById.get(c.articleId)?.author.name),
  shopComments.map((c) => `${c.id}:${c.author.kind === "shop" ? c.author.staffName : ""}→${c.parentId}`),
);
// Simple heuristic: common words that exist in only one of the two languages.
const englishOnly = /(?<!\p{L})(the|and|with|you|we|is|of|to|this|that)(?!\p{L})/iu;
const germanOnly = /(?<!\p{L})(und|der|nicht|wir|ist|ein|eine|ich|sie|auf|mit)(?!\p{L})/iu;
const wrongLanguage = comments.filter((c) => (articleById.get(c.articleId)?.language === "de" ? englishOnly : germanOnly).test(c.text));
expect("every comment is in its story's language (no common words of the other one)", wrongLanguage.map((c) => c.id), []);
const repeats = published.flatMap((a) => {
  const ids = comments.flatMap((c) => (c.articleId === a.id && c.author.kind === "guest" ? [c.author.guestId] : []));

  return ids.filter((id, i) => ids.indexOf(id) !== i).map((id) => `${a.id}:${id}`);
});
expect("no guest comments twice on one version (hidden ones included)", repeats, []);
const personal = comments.filter((c) => !c.hidden && /@|\d[\d ]{6,}\d/.test(c.text));
expect("no phone number or email address in a visible comment", personal.map((c) => c.id), []);
const guestIds = new Set(data.guests.map((g) => g.id));
const authors = comments.flatMap((c) => (c.author.kind === "guest" ? [c.author.guestId] : []));
check("guest authors are seed guests, not the demo guest Anna", authors.every((id) => guestIds.has(id) && id !== "g-anna"), authors);
check(
  "each comment is after its article was published and before the demo start",
  comments.every((c) => {
    const pub = articleById.get(c.articleId)?.publication;

    return pub?.status === "published" && c.createdAt > pub.publishedAt && before(c.createdAt);
  }),
);
check("each reply is after its parent", comments.every((c) => !c.parentId || c.createdAt > commentById.get(c.parentId)!.createdAt));

console.log("\n=== Advice questions and requests ===");
const set = data.adviceQuestions;
const questions = set.questions;
console.log(`  recipient ${set.recipientEmail}; ${questions.map((q) => `${q.id}:${q.type}${q.required ? "*" : ""}`).join(" ")}`);
expect("seven questions", questions.length, 7);
expect("in the outline's order", questions.map((q) => q.id), ["adults", "children", "interests", "arrival", "departure", "style", "notes"]);
expect("answer types", questions.map((q) => q.type), ["number", "number", "multi", "date", "date", "single", "text"]);
expect("adults, children and interests required; the rest optional", questions.map((q) => q.required), [true, true, true, false, false, false, false]);
check("every question has EN text", questions.every((q) => !!q.text.en));
expect("exactly one question lacks DE text: anything else", questions.filter((q) => !q.text.de).map((q) => q.id), ["notes"]);
check("choice questions have options with EN and DE labels", questions.filter((q) => q.type === "single" || q.type === "multi").every((q) => (q.options?.length ?? 0) >= 2 && q.options!.every((o) => !!o.label.en && !!o.label.de)));
expect("recipient is on the shop's mail domain", set.recipientEmail.split("@")[1], shop.email.split("@")[1]);
const questionById = new Map(questions.map((q) => [q.id, q]));
const reworded = (r: (typeof data.adviceRequests)[number]) =>
  r.answers.filter((a) => questionById.get(a.questionId)?.text[a.questionLanguage] !== a.question);
for (const r of data.adviceRequests) {
  console.log(`  ${r.id} ${r.language.toUpperCase()} ${r.email} sent ${r.sentAt}${r.readAt ? " · read" : " · new"}; reworded: ${reworded(r).map((a) => `${a.questionId} "${a.question}"`).join(", ") || "none"}`);
}
expect("two advice requests", data.adviceRequests.length, 2);
check("every answer's question id is in the set", data.adviceRequests.every((r) => r.answers.every((a) => questionById.has(a.questionId))));
const older = data.adviceRequests.filter((r) => reworded(r).length > 0);
expect("exactly one request keeps older wording", older.map((r) => r.id), ["adv-1"]);
check("that request was sent before the set was last edited", older.every((r) => r.sentAt < set.updatedAt));
const de = data.adviceRequests.find((r) => r.language === "de");
check("the DE request uses current wording, with the untranslated question in EN", !!de && reworded(de).length === 0 && de.answers.find((a) => a.questionId === "notes")?.questionLanguage === "en");
check("advice dates are before the demo start", [set.updatedAt, ...data.adviceRequests.flatMap((r) => [r.sentAt, ...(r.readAt ? [r.readAt] : [])])].every(before));

console.log("\n=== Private-tour requests ===");
const ptr = data.privateTourRequests;
for (const r of ptr) console.log(`  ${r.id} ${r.language.toUpperCase()} group ${r.groupSize} · ${r.dateFrom}–${r.dateTo} · ${r.answeredAt ? "answered" : "new"}`);
expect("one answered and one new", [ptr.filter((r) => r.answeredAt).length, ptr.filter((r) => !r.answeredAt).length], [1, 1]);
check("group sizes 1–50 (D8)", ptr.every((r) => r.groupSize >= 1 && r.groupSize <= 50));
check("dates are YYYY-MM-DD with from ≤ to", ptr.every((r) => /^\d{4}-\d{2}-\d{2}$/.test(r.dateFrom) && /^\d{4}-\d{2}-\d{2}$/.test(r.dateTo) && r.dateFrom <= r.dateTo));
check("answered after sent, all before the demo start", ptr.every((r) => before(r.sentAt) && (!r.answeredAt || (r.answeredAt > r.sentAt && before(r.answeredAt)))));

console.log("\n=== Review replies ===");
const replied = data.reviews.filter((r) => r.reply);
for (const r of replied) console.log(`  ${r.id} (${r.productId}, ${r.guestName}) ← ${r.reply!.by}, ${r.reply!.language.toUpperCase()}: ${r.reply!.text}`);
expect("exactly one gift review has a reply", replied.filter((r) => !r.productId.startsWith("tour:")).length, 1);
expect("exactly one tour review has a reply", replied.filter((r) => r.productId.startsWith("tour:")).length, 1);
check("each reply is after its review and before the demo start", replied.every((r) => Date.parse(r.reply!.at) > Date.parse(r.createdAt) && before(r.reply!.at)));
check("the gift reply is on a featured knife review, so C03 shows replied and unreplied side by side", replied.some((r) => r.productId === "p-knife" && /^r\d+$/.test(r.id)));

console.log("\n=== Pickup places and copy ===");
expect("pickupPlaces deep-equal the pre-4.1 static seed", data.pickupPlaces, pickupPlacesBefore);
const ss = JSON.stringify(data).match(/.{0,30}ß.{0,30}/g);
check("no \"ß\" anywhere in the seed (Swiss German)", !ss, ss);

console.log("\n=== Backfill of stored state (D5) ===");
const phase4Keys = ["pickupPlaces", "articles", "comments", "adviceQuestions", "adviceRequests", "privateTourRequests"] as const;
/** Demo data as a pre-Phase 4 browser stored it: none of the new keys, no tours, no sample tour reviews. */
function storedBeforePhase4(): StoredDemoData {
  const old: StoredDemoData = structuredClone(createSeedState(0).data);
  for (const key of phase4Keys) delete old[key];
  delete old.tours;
  old.reviews = old.reviews.filter((r) => !r.productId.startsWith("tour:"));
  // Something the presenter did before the upgrade, which must survive it.
  old.nextOrderNumber = 1050;
  old.signedInGuestId = "g-anna";

  return old;
}
const old = storedBeforePhase4();
expect("the simulated stored state lacks every Phase 4 key", phase4Keys.filter((k) => k in old), []);
const upgraded = upgradeDemoData(old);
for (const key of phase4Keys) expect(`missing ${key} is filled from the seed`, upgraded[key], data[key]);
expect("adviceDraft stays absent (no draft in progress)", "adviceDraft" in upgraded, false);
expect("other stored data is kept", [upgraded.nextOrderNumber, upgraded.signedInGuestId, upgraded.orders], [1050, "g-anna", old.orders]);
expect("tours are filled from the seed (existing backfill)", upgraded.tours?.tours.map((t) => t.id), createTourSeed().tours.map((t) => t.id));
expect("sample tour reviews are added once (existing backfill)", upgraded.reviews.length, data.reviews.length);
expect("upgrading twice changes nothing", upgradeDemoData(upgraded), upgraded);

const edited = storedBeforePhase4();
edited.pickupPlaces = structuredClone(data.pickupPlaces);
edited.pickupPlaces[1].openingHours = { en: "Mon–Sun 07:00–21:00", de: "Mo–So 07:00–21:00" };
edited.articles = [];
edited.comments = data.comments.filter((c) => c.id !== "c5");
const draft = { set: data.adviceQuestions, step: 2, values: { adults: 2 }, email: "", startedAt: new Date(DEMO_START).toISOString() };
const keptData = upgradeDemoData({ ...edited, adviceDraft: draft });
expect("a stored pickup-place edit (M14) is kept", keptData.pickupPlaces[1].openingHours.en, "Mon–Sun 07:00–21:00");
expect("a stored empty article list is kept, not refilled", keptData.articles, []);
expect("a deleted comment stays deleted", keptData.comments.map((c) => c.id).includes("c5"), false);
expect("a stored advice draft is kept", keptData.adviceDraft, draft);

console.log(`\nPASS ${passes} · FAIL ${fails}`);
console.log(fails === 0 ? "ALL CHECKS PASSED" : `${fails} CHECK(S) FAILED`);
process.exit(fails ? 1 : 0);
