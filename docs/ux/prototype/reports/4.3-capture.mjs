// 4.3 C19 check: stories in the current language only, newest first, count, skeleton, empty
// state, keyboard reach, and the C01 rail after the StoryCard swap. 375px, DPR 2, EN and DE.
// Run from a folder with playwright-core: node 4.3-capture.mjs <screens dir>
import { chromium } from "playwright-core";
import { mkdirSync, readdirSync } from "node:fs";

const BASE = process.env.BASE ?? "http://localhost:5199/";
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
const copy = {
  en: { title: "Local stories", count: (n) => `${n} stories`, empty: "There are no stories in English yet.", back: "Back to Explore" },
  de: { title: "Geschichten aus Luzern", count: (n) => `${n} Geschichten`, empty: "Es gibt noch keine Geschichten auf Deutsch.", back: "Zurück zu Entdecken" },
};
const published = (data, lang) =>
  data.articles
    .filter((a) => a.language === lang && a.publication.status === "published")
    .sort((a, b) => b.publication.publishedAt.localeCompare(a.publication.publishedAt));

for (const lang of ["en", "de"]) {
  const c = copy[lang];
  const page = await browser.newPage({ viewport: { width: 375, height: 812 }, deviceScaleFactor: 2 });
  const errors = [];
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.goto(BASE);
  await page.evaluate((l) => { localStorage.clear(); localStorage.setItem("sk.language", JSON.stringify(l)); }, lang);

  await page.goto(`${BASE}#/stories`);
  await page.reload();
  const skeleton = await page.locator('[data-slot="skeleton"], .skeleton').first().waitFor({ timeout: 2000 }).then(() => true, () => false);
  check(`[${lang}] skeleton while loading`, skeleton);
  await page.screenshot({ path: `${OUT}/c19-loading-${lang}.png` });
  await page.waitForTimeout(800);

  const data = await page.evaluate(() => JSON.parse(localStorage.getItem("sk.demo")).data);
  const expected = published(data, lang).map((a) => a.title);
  const shown = await page.locator("main h3").allInnerTexts();
  check(`[${lang}] lists exactly the published ${lang} stories, newest first`, JSON.stringify(shown) === JSON.stringify(expected), { shown, expected });
  check(`[${lang}] no draft or other-language story`, !shown.some((t) => data.articles.some((a) => a.title === t && (a.language !== lang || a.publication.status !== "published"))));
  check(`[${lang}] banner title and count`, (await page.getByRole("heading", { level: 1, name: c.title }).isVisible()) && (await page.getByText(c.count(expected.length)).isVisible()));
  check(`[${lang}] each card shows an excerpt`, (await page.locator("main li p.line-clamp-2").count()) === expected.length);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  check(`[${lang}] no horizontal overflow`, overflow === 0, overflow);
  await page.screenshot({ path: `${OUT}/c19-${lang}.png` });
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/c19-end-${lang}.png` });

  let reached = false;
  const firstCard = page.locator("main li a").first();
  for (let i = 0; i < 20 && !reached; i++) {
    await page.keyboard.press("Tab");
    reached = await firstCard.evaluate((el) => el === document.activeElement);
  }
  check(`[${lang}] first story reachable by Tab`, reached);

  await page.evaluate((l) => {
    const s = JSON.parse(localStorage.getItem("sk.demo"));
    s.data.articles = s.data.articles.map((a) => (a.language === l ? { ...a, publication: { status: "draft" } } : a));
    localStorage.setItem("sk.demo", JSON.stringify(s));
  }, lang);
  await page.reload();
  await page.waitForTimeout(900);
  check(`[${lang}] empty state when no story is published in ${lang}`, await page.getByText(c.empty).isVisible());
  const action = page.getByRole("link", { name: c.back });
  check(`[${lang}] empty state has one action back to Explore`, (await action.count()) === 1);
  check(`[${lang}] no count in the banner when empty`, (await page.getByText(c.count(0)).count()) === 0);
  await page.screenshot({ path: `${OUT}/c19-empty-${lang}.png` });
  await action.click();
  await page.waitForTimeout(900);
  check(`[${lang}] C01 hides the stories rail when the language has none`, (await page.locator("section#stories, section[aria-labelledby=stories]").count()) === 0);

  await page.evaluate(() => localStorage.removeItem("sk.demo"));
  await page.reload();
  await page.waitForTimeout(900);
  const railTitles = await page.locator('section[aria-labelledby="stories"] h3').allInnerTexts();
  check(`[${lang}] C01 stories rail still lists the ${lang} stories`, JSON.stringify(railTitles) === JSON.stringify(expected), railTitles);
  check(`[${lang}] no console or page errors`, errors.length === 0, errors);
  await page.close();
}

console.log(`\nRESULT ${pass} passed, ${fail} failed`);
await browser.close();
process.exit(fail ? 1 : 0);
