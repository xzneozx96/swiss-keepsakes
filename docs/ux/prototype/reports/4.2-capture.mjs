// 4.2 C01 check: time blocks with story rows, stories rail from real articles, floating Trip
// advice button on C01 and C09. 375px, DPR 2, EN and DE. Run from a folder with playwright-core:
//   node 4.2-capture.mjs <screens dir>   (Vite on BASE, default http://localhost:5199/)
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
  en: { quick: "Have 2 hours in Lucerne?", few: "A few days here?", fab: "Trip assistant", stories: "Local stories" },
  de: { quick: "Zwei Stunden in Luzern?", few: "Ein paar Tage hier?", fab: "Reiseassistent", stories: "Geschichten aus Luzern" },
};

for (const lang of ["en", "de"]) {
  const c = copy[lang];
  const page = await browser.newPage({ viewport: { width: 375, height: 812 }, deviceScaleFactor: 2 });
  const errors = [];
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.goto(BASE);
  await page.evaluate((l) => { localStorage.clear(); localStorage.setItem("sk.language", JSON.stringify(l)); }, lang);
  await page.reload();
  await page.waitForTimeout(1500);

  const data = await page.evaluate(() => JSON.parse(localStorage.getItem("sk.demo")).data);
  const titles = data.articles
    .filter((a) => a.language === lang && a.publication.status === "published")
    .map((a) => a.title);
  const others = data.articles.filter((a) => a.language !== lang).map((a) => a.title);

  check(`[${lang}] 2-hour block title`, (await page.getByRole("heading", { name: c.quick }).count()) === 1);
  check(`[${lang}] few-days block title`, (await page.getByRole("heading", { name: c.few }).count()) === 1);
  const quickSection = page.locator("section", { has: page.getByRole("heading", { name: c.quick }) });
  const fewSection = page.locator("section", { has: page.getByRole("heading", { name: c.few }) });
  const musegg = data.articles.find((a) => a.slug === "musegg-morning" && a.language === lang);
  const lake = data.articles.find((a) => a.slug === "lake-steamboat" && a.language === lang);
  check(`[${lang}] 2-hour block has the Musegg walking story`, await quickSection.getByText(musegg.title).isVisible());
  check(`[${lang}] few-days block has the lake story`, await fewSection.getByText(lake.title).isVisible());

  const rail = page.locator('[data-slot="scroll-shadow"]', { has: page.locator("a") }).filter({ hasText: titles[0] });
  const railText = await rail.innerText();
  check(`[${lang}] stories rail lists every published ${lang} article`, titles.every((t) => railText.includes(t)), titles.length);
  check(`[${lang}] stories rail shows no other-language or draft article`, others.every((t) => !railText.includes(t) || titles.includes(t)));
  check(`[${lang}] no "Coming soon" on stories`, !railText.match(/Coming soon|Demnächst/));

  const fab = page.getByRole("link", { name: c.fab });
  check(`[${lang}] floating Trip advice button visible`, await fab.isVisible());
  const fabBox = await fab.boundingBox();
  const navBox = await page.locator("nav.fixed").boundingBox();
  check(`[${lang}] button sits above the tab bar, right-aligned`, fabBox.y + fabBox.height <= navBox.y && fabBox.x + fabBox.width >= 375 - 20, { fabBottom: fabBox.y + fabBox.height, navTop: navBox.y, right: fabBox.x + fabBox.width });
  check(`[${lang}] button tap area ≥ 44px`, fabBox.height >= 44, fabBox.height);
  await page.screenshot({ path: `${OUT}/c01-top-${lang}.png` });

  await page.keyboard.press("Tab");
  let reached = false;
  for (let i = 0; i < 80 && !reached; i++) {
    reached = await fab.evaluate((el) => el === document.activeElement);
    if (!reached) await page.keyboard.press("Tab");
  }
  check(`[${lang}] button reachable by Tab`, reached);

  await page.evaluate(() => document.activeElement?.blur());
  await quickSection.scrollIntoViewIfNeeded();
  await page.screenshot({ path: `${OUT}/c01-quick-${lang}.png` });
  await fewSection.scrollIntoViewIfNeeded();
  await page.screenshot({ path: `${OUT}/c01-few-days-${lang}.png` });
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/c01-bottom-${lang}.png` });
  const bannerBtn = page.locator("section", { hasText: /Not sure|Nicht sicher/ }).getByRole("link");
  const bannerBox = await bannerBtn.boundingBox();
  const fabBox2 = await fab.boundingBox();
  check(`[${lang}] at the bottom, the button does not cover the banner action`, bannerBox.y + bannerBox.height <= fabBox2.y || bannerBox.x + bannerBox.width <= fabBox2.x, { banner: bannerBox, fab: fabBox2 });

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  check(`[${lang}] no horizontal overflow`, overflow === 0, overflow);

  await fab.click();
  await page.waitForTimeout(600);
  check(`[${lang}] button opens /plan`, page.url().endsWith("#/plan"), page.url());

  await page.goto(`${BASE}#/tours/lucerne-old-town-walk`);
  await page.waitForTimeout(1500);
  const fab9 = page.getByRole("link", { name: c.fab });
  const bar = page.locator("div.sticky.bottom-0").last();
  const b9 = await fab9.boundingBox();
  const barBox = await bar.boundingBox();
  check(`[${lang}] C09 button visible above the booking bar`, (await fab9.isVisible()) && b9.y + b9.height <= barBox.y, { fabBottom: b9.y + b9.height, barTop: barBox.y });
  await page.screenshot({ path: `${OUT}/c09-${lang}.png` });
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(400);
  const fab9b = await fab9.boundingBox();
  const lastControl = await page.evaluate((fabBox) => {
    const bar = [...document.querySelectorAll("div.sticky.bottom-0")].pop();
    const items = [...document.querySelectorAll("main a, main button")].filter((el) => !bar.contains(el) && !el.closest(".fixed") && el.getBoundingClientRect().height > 0);
    const covered = items.filter((el) => {
      const r = el.getBoundingClientRect();
      return r.bottom > fabBox.y && r.top < fabBox.y + fabBox.height && r.right > fabBox.x && r.left < fabBox.x + fabBox.width;
    });
    return covered.map((el) => el.textContent.trim().slice(0, 40));
  }, fab9b);
  check(`[${lang}] C09 at the bottom: no control under the button`, lastControl.length === 0, lastControl);
  await page.screenshot({ path: `${OUT}/c09-bottom-${lang}.png` });

  check(`[${lang}] no console or page errors`, errors.length === 0, errors);
  await page.close();
}

console.log(`\nRESULT ${pass} passed, ${fail} failed`);
await browser.close();
process.exit(fail ? 1 : 0);
