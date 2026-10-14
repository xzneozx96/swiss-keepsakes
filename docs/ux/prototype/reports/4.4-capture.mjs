// 4.4 C20 check: blog layout (cover, byline, contents bar with scroll tracking, images, YouTube
// on tap, audio), linked gifts and tours, comments with sign-in, the other-language notice, and
// the links from C01, C19 and search. 375px, DPR 2, EN and DE.
// Run from a folder with playwright-core: node 4.4-capture.mjs <screens dir>
import { chromium } from "playwright-core";
import { mkdirSync, readdirSync } from "node:fs";

const BASE = process.env.BASE ?? "http://localhost:5199/";
const OUT = process.argv[2];
mkdirSync(OUT, { recursive: true });
const home = `${process.env.HOME}/.cache/ms-playwright`;
const dir = readdirSync(home).filter((d) => d.startsWith("chromium_headless_shell")).sort().pop();
const browser = await chromium.launch({
  executablePath: `${home}/${dir}/chrome-headless-shell-linux64/chrome-headless-shell`,
  args: ["--autoplay-policy=no-user-gesture-required"],
});

let pass = 0, fail = 0;
const check = (name, ok, detail = "") => {
  ok ? pass++ : fail++;
  console.log(`${ok ? "PASS" : "FAIL"} ${name}${detail === "" ? "" : ` | ${typeof detail === "string" ? detail : JSON.stringify(detail)}`}`);
};
const copy = {
  en: { signIn: "Sign in to comment", write: "Write a comment", google: "Continue with Google", post: "Post comment", error: "Write a comment first.", reply: "Reply", onlyIn: "This story is only available in German.", other: "luzern-bei-nacht", linked: "Bring a piece of it home", fab: "Trip assistant", play: "Play video", audio: "Play:" },
  de: { signIn: "Anmelden zum Kommentieren", write: "Kommentar schreiben", google: "Weiter mit Google", post: "Kommentar veröffentlichen", error: "Schreiben Sie zuerst einen Kommentar.", reply: "Antworten", onlyIn: "Diese Geschichte gibt es nur auf Englisch.", other: "water-tower", linked: "Ein Stück davon mitnehmen", fab: "Reiseassistent", play: "Video abspielen", audio: "Abspielen:" },
};
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

for (const lang of ["en", "de"]) {
  const c = copy[lang];
  const context = await browser.newContext({ viewport: { width: 375, height: 812 }, deviceScaleFactor: 2 });
  const page = await context.newPage();
  const errors = [];
  page.on("console", (m) => m.type() === "error" && !/youtube|ytimg|googlevideo|doubleclick/i.test(m.text() + (m.location()?.url ?? "")) && errors.push(m.text()));
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.goto(BASE);
  await page.evaluate((l) => { localStorage.clear(); localStorage.setItem("sk.language", JSON.stringify(l)); }, lang);
  await page.reload();
  await wait(900);
  const data = await page.evaluate(() => JSON.parse(localStorage.getItem("sk.demo")).data);
  const article = data.articles.find((a) => a.slug === "musegg-morning" && a.language === lang);

  // Entry points: C19 card, then C01 story row and search all open C20.
  await page.goto(`${BASE}#/stories`);
  await wait(900);
  await page.getByRole("link", { name: new RegExp(article.title) }).first().click();
  await wait(900);
  check(`[${lang}] C19 card opens C20`, page.url().endsWith("#/stories/musegg-morning"), page.url());
  await page.goto(`${BASE}#/`);
  await wait(900);
  const row = page.locator('a[href$="/stories/musegg-morning"]').first();
  check(`[${lang}] C01 story row links to C20`, (await row.count()) > 0);
  await page.goto(`${BASE}#/search?q=${encodeURIComponent(article.title.split(" ").slice(-2).join(" "))}`);
  await wait(900);
  check(`[${lang}] search result links to C20`, (await page.locator('a[href$="/stories/musegg-morning"]').count()) > 0);

  await page.goto(`${BASE}#/stories`);
  await wait(700);
  await page.goto(`${BASE}#/stories/musegg-morning`);
  await wait(1200);

  check(`[${lang}] cover with the title as h1`, (await page.getByRole("heading", { level: 1, name: article.title }).isVisible()));
  check(`[${lang}] byline: author name and role`, (await page.getByText(article.author.name, { exact: true }).first().isVisible()) && (await page.getByText(article.author.role).isVisible()));
  check(`[${lang}] intro paragraph`, await page.getByText(article.intro).isVisible());
  await page.screenshot({ path: `${OUT}/c20-cover-${lang}.png` });

  const contents = page.getByRole("navigation", { name: lang === "en" ? "In this story" : "In dieser Geschichte" });
  const chips = contents.getByRole("button");
  check(`[${lang}] contents bar has one chip per section`, (await chips.count()) === article.sections.length, await chips.allInnerTexts());
  check(`[${lang}] each section heading is an h2`, (await page.locator("section[id^=section-] > h2").allInnerTexts()).join("|") === article.sections.map((s) => s.heading).join("|"));

  const third = article.sections[2];
  await chips.nth(2).click();
  await wait(1200);
  const headTop = await page.locator(`#section-${third.id} > h2`).evaluate((el) => el.getBoundingClientRect().top);
  const navBox = await contents.boundingBox();
  check(`[${lang}] tapping a chip brings its section just below the bars`, headTop >= navBox.y + navBox.height - 4 && headTop < navBox.y + navBox.height + 80, { headTop, barBottom: navBox.y + navBox.height });
  check(`[${lang}] that chip is marked current`, (await chips.nth(2).getAttribute("aria-current")) === "location");
  check(`[${lang}] contents bar sticks under the top bar`, navBox.y >= 50 && navBox.y <= 70, navBox.y);
  const progress = await contents.locator("div[aria-hidden] > div").evaluate((el) => el.style.transform);
  check(`[${lang}] reading progress has advanced`, /scaleX\(0\.[1-9]|scaleX\(1\)/.test(progress), progress);
  await page.screenshot({ path: `${OUT}/c20-contents-${lang}.png` });

  const imageCount = article.sections.flatMap((s) => s.blocks).filter((b) => b.type === "image").length;
  check(`[${lang}] inline photos with captions`, (await page.locator("section[id^=section-] figure img").count()) >= imageCount && imageCount > 0, imageCount);

  // Play icons: the triangle's centroid sits on the circle's centre (owner review).
  const offsets = await page.evaluate(() => [...document.querySelectorAll("button[aria-label] path")].filter((p) => p.closest("button")?.getAttribute("aria-label")?.match(/Play|Abspielen|abspielen/)).map((path) => {
    const btn = path.closest("button"); const circle = btn.querySelector("span.rounded-full") ?? btn; const r = circle.getBoundingClientRect();
    const ctm = path.getScreenCTM(); const len = path.getTotalLength(); const xs = [];
    for (let i = 0; i < 200; i++) { const q = path.getPointAtLength((len * i) / 200); xs.push(new DOMPoint(q.x, q.y).matrixTransform(ctm).x); }
    const l = Math.min(...xs), rr = Math.max(...xs); return +((2 * l + rr) / 3 - (r.left + r.width / 2)).toFixed(1);
  }));
  check(`[${lang}] play triangles are optically centred (centroid within 1px)`, offsets.length === 2 && offsets.every((o) => Math.abs(o) <= 1), offsets);

  const playVideo = page.getByRole("button", { name: new RegExp(c.play) });
  check(`[${lang}] no YouTube iframe before tapping play`, (await page.locator("iframe").count()) === 0);
  await playVideo.scrollIntoViewIfNeeded();
  await page.screenshot({ path: `${OUT}/c20-video-${lang}.png` });
  await playVideo.click();
  await wait(800);
  const src = await page.locator("iframe").first().getAttribute("src");
  check(`[${lang}] tapping play loads the youtube-nocookie player`, /^https:\/\/www\.youtube-nocookie\.com\/embed\/0UHyzRnAxy8/.test(src ?? ""), src);

  const audioButton = page.getByRole("button", { name: new RegExp(c.audio) });
  await audioButton.scrollIntoViewIfNeeded();
  await audioButton.click();
  await wait(1800);
  const audio = await page.locator("audio").evaluate((el) => ({ paused: el.paused, t: el.currentTime, d: el.duration }));
  check(`[${lang}] audio plays from the bundled file`, !audio.paused && audio.t > 0.5 && audio.d > 12, audio);
  await page.screenshot({ path: `${OUT}/c20-audio-${lang}.png` });
  await audioButton.click();

  const linked = page.locator("section", { has: page.getByRole("heading", { name: c.linked }) });
  const hrefs = await linked.locator('a[href*="/tours/"], a[href*="/gifts/"]').evaluateAll((els) => [...new Set(els.map((e) => e.getAttribute("href").replace(/.*#/, "")))]);
  const expectedOrder = article.links.map((l) => (l.kind === "tour" ? `/tours/${data.tours.tours.find((x) => x.id === l.id).slug}` : `/gifts/${data.products.find((p) => p.id === l.id).slug}`));
  check(`[${lang}] linked tour and gift cards in the shop's order (R16)`, JSON.stringify(hrefs) === JSON.stringify(expectedOrder), { hrefs, expectedOrder });

  // R18 / AC33: "More to discover" lists the shop's picks in this language, never itself.
  const more = page.locator("section[aria-labelledby=article-more]");
  const moreLinks = await more.locator('a[href*="/stories/"]').evaluateAll((els) => els.map((e) => e.getAttribute("href").replace(/.*\/stories\//, "")));
  const sameLang = data.articles.filter((x) => x.language === lang && x.publication.status === "published" && x.slug !== article.slug);
  const expectMore = article.related.filter((slug) => sameLang.some((x) => x.slug === slug)).slice(0, 3);
  check(`[${lang}] More to discover shows the shop's picks in this language (AC33)`, JSON.stringify(moreLinks) === JSON.stringify(expectMore) && !moreLinks.includes(article.slug), { moreLinks, expectMore });

  const visible = data.comments.filter((x) => x.articleId === article.id && !x.hidden);
  const hidden = data.comments.filter((x) => x.articleId === article.id && x.hidden);
  const section = page.locator("section[aria-labelledby=article-comments]");
  const threads = visible.filter((x) => !x.parentId).length;
  check(`[${lang}] the page shows at most 3 comment threads`, (await section.locator(":scope > ul > li").count()) === Math.min(3, threads), threads);
  const showAll = section.getByRole("button", { name: lang === "en" ? /Show all \d+ comments/ : /Alle \d+ Kommentare anzeigen/ });
  check(`[${lang}] "Show all" appears when there are more than 3 threads`, (await showAll.count()) === (threads > 3 ? 1 : 0));
  if (threads > 3) {
    await showAll.click();
    await wait(800);
    const sheetText = await page.getByRole("dialog").innerText();
    check(`[${lang}] the sheet lists every visible comment`, visible.every((x) => sheetText.includes(x.text.slice(0, 40))), visible.length);
    check(`[${lang}] hidden comments never show`, hidden.every((x) => !sheetText.includes(x.text.slice(0, 40))), hidden.length);
    await page.screenshot({ path: `${OUT}/c20-all-comments-${lang}.png` });
    await page.keyboard.press("Escape");
    await wait(600);
  }

  const fab = page.getByRole("link", { name: c.fab });
  const bar = page.getByRole("button", { name: c.signIn });
  const fabBox = await fab.boundingBox();
  const barBox = await bar.boundingBox();
  check(`[${lang}] Trip advice button above the comment bar`, fabBox.y + fabBox.height <= barBox.y, { fab: fabBox.y + fabBox.height, bar: barBox.y });
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  check(`[${lang}] no horizontal overflow`, overflow === 0, overflow);
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await wait(400);
  await page.screenshot({ path: `${OUT}/c20-comments-${lang}.png` });

  // Signed out: "Sign in to comment" opens C05, which steps back here with the sheet open.
  await bar.click();
  await wait(800);
  check(`[${lang}] signed out, the bar opens C05`, page.url().includes("#/sign-in"), page.url());
  await page.getByRole("button", { name: c.google }).click();
  await wait(1500);
  check(`[${lang}] sign-in returns to the same story`, page.url().endsWith("#/stories/musegg-morning"), page.url());
  const sheet = page.getByRole("dialog");
  check(`[${lang}] the comment sheet is open after sign-in`, await sheet.isVisible());
  await sheet.getByRole("button", { name: c.post }).click();
  await wait(300);
  check(`[${lang}] empty comment shows the error`, await sheet.getByText(c.error).isVisible());
  const mine = lang === "en" ? "We walked it at sunrise and had the towers to ourselves." : "Wir waren bei Sonnenaufgang oben und hatten die Türme für uns.";
  await sheet.getByRole("textbox").fill(mine);
  await page.screenshot({ path: `${OUT}/c20-sheet-${lang}.png` });
  await sheet.getByRole("button", { name: c.post }).click();
  await wait(1200);
  check(`[${lang}] the new comment shows at once`, await page.getByText(mine).isVisible());
  check(`[${lang}] the bar now says write a comment`, await page.getByRole("button", { name: c.write }).isVisible());
  await page.screenshot({ path: `${OUT}/c20-posted-${lang}.png` });

  const firstItem = section.locator(":scope > ul > li article").first();
  const first = { text: await firstItem.locator("p.text-body").innerText() };
  await firstItem.getByRole("button", { name: c.reply }).click();
  await wait(700);
  check(`[${lang}] reply opens the sheet for that comment`, (await page.getByRole("dialog").isVisible()) && (await page.getByRole("dialog").innerText()).includes(first.text.slice(0, 30)));
  await page.keyboard.press("Escape");
  await wait(500);

  await page.goBack();
  await wait(900);
  check(`[${lang}] Back after sign-in leaves the story (no duplicate entry)`, page.url().endsWith("#/stories"), page.url());

  // R16 / AC31: unpublishing a linked gift removes it from the story; the tour stays.
  await page.evaluate(() => {
    const st = JSON.parse(localStorage.getItem("sk.demo"));
    st.data.products = st.data.products.map((p) => (p.id === "p-postcards" ? { ...p, published: false } : p));
    localStorage.setItem("sk.demo", JSON.stringify(st));
  });
  await page.goto(`${BASE}#/stories`);
  await page.goto(`${BASE}#/stories/musegg-morning`);
  await page.reload();
  await wait(1300);
  const after = page.locator("section", { has: page.getByRole("heading", { name: c.linked }) });
  check(`[${lang}] an unpublished linked gift disappears; the tour stays (AC31)`, (await after.locator('a[href*="/gifts/"]').count()) === 0 && (await after.locator('a[href*="/tours/"]').count()) > 0);

  // One-time migration: data stored before 4.4 (old article shape, 7 comments) gains the
  // seeded comments and keeps the guest's own.
  const oldShape = await page.evaluate((mine) => {
    const st = JSON.parse(localStorage.getItem("sk.demo"));
    st.data.articles = st.data.articles.map(({ links, ...a }) => ({ ...a, productIds: [], tourIds: [] }));
    const own = st.data.comments.find((x) => x.text === mine);
    st.data.comments = [...st.data.comments.filter((x) => ["c1", "c2", "c3", "c4", "c5", "c6", "c7"].includes(x.id)), own];
    localStorage.setItem("sk.demo", JSON.stringify(st));
    return st.data.comments.length;
  }, mine);
  await page.reload();
  await wait(1300);
  const migrated = await page.evaluate(() => JSON.parse(localStorage.getItem("sk.demo")).data.comments);
  check(`[${lang}] old stored data gains the seeded comments and keeps the guest's own`, migrated.length === data.comments.length + 1 && migrated.some((x) => x.text === mine), { before: oldShape, after: migrated.length, seed: data.comments.length });

  await page.goto(`${BASE}#/stories/${c.other}`);
  await wait(1200);
  check(`[${lang}] a story only in the other language shows with a notice`, await page.getByText(c.onlyIn).isVisible());
  await page.screenshot({ path: `${OUT}/c20-other-language-${lang}.png` });
  await page.goto(`${BASE}#/stories/pilatus`);
  await wait(1200);
  check(`[${lang}] a draft is not shown to guests`, (await page.locator("h1").count()) === 0 && (await page.getByRole("link", { name: lang === "en" ? "All stories" : "Alle Geschichten" }).isVisible()));

  // Owner request: every published story has comments.
  await page.evaluate(() => localStorage.removeItem("sk.demo"));
  const fresh = data.articles.filter((x) => x.language === lang && x.publication.status === "published");
  const counts = {};
  for (const story of fresh) {
    await page.goto(`${BASE}#/stories`);
    await page.goto(`${BASE}#/stories/${story.slug}`);
    await page.reload();
    await wait(1100);
    counts[story.slug] = await page.locator("section[aria-labelledby=article-comments] > ul > li").count();
  }
  const expected = Object.fromEntries(fresh.map((x) => [x.slug, Math.min(3, data.comments.filter((m) => m.articleId === x.id && !m.hidden && !m.parentId).length)]));
  check(`[${lang}] every published story shows comments (up to 3 threads)`, fresh.every((x) => counts[x.slug] >= 1 && counts[x.slug] === expected[x.slug]), { counts, expected });

  check(`[${lang}] no console or page errors`, errors.length === 0, errors);
  await context.close();
}

console.log(`\nRESULT ${pass} passed, ${fail} failed`);
await browser.close();
process.exit(fail ? 1 : 0);
