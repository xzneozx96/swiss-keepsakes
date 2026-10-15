// 4.8 M11 Products check (D3, R02, AC30, D12): the three tabs with counts and the tab in
// ?tab=, the gift and tour tickets with the publish chip and EN/DE completeness computed from
// the text (the print stays published with "DE missing", the German-only night tour shows
// "EN missing", Pilatus is a draft), the links to M12/M13, the empty tab, the Manager role,
// the 1024px table. 375px, DPR 2, EN and DE; one 1280px shot.
// 15.10.2026: "Gifts" is labelled Keepsakes / Andenken, and M11 lists Stays and Experiences
// as empty "soon" tabs between Tours and Pickup points (five tabs).
// Run from a folder with playwright-core: node 4.8-capture.mjs <screens dir>
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
  en: { title: "Products", gifts: "Keepsakes", tours: "Tours", stays: "Stays", experiences: "Experiences", pickup: "Pickup points", published: "Published", draft: "Draft", both: "EN and DE", deMissing: "DE missing", enMissing: "EN missing", print: "Limited-edition print: Water Tower at dawn", knife: "Kapellbrücke pocket knife", walk: "Lucerne old-town walk", night: "Luzern bei Nacht", pilatus: "A day above the clouds", bahnhof: "Pickup point Bahnhof", emptyGifts: "No keepsakes yet.", from: "From", commission: "Commission" },
  de: { title: "Produkte", gifts: "Andenken", tours: "Touren", stays: "Unterkünfte", experiences: "Erlebnisse", pickup: "Abholstellen", published: "Veröffentlicht", draft: "Entwurf", both: "EN und DE", deMissing: "DE fehlt", enMissing: "EN fehlt", print: "Limited-edition print: Water Tower at dawn", knife: "Kapellbrücke Taschenmesser", walk: "Altstadtspaziergang Luzern", night: "Luzern bei Nacht", pilatus: "Ein Tag über den Wolken", bahnhof: "Abholstelle Bahnhof", emptyGifts: "Noch keine Andenken.", from: "Ab", commission: "Provision" },
};

async function setup(page, lang, role = "owner") {
  await page.goto(BASE);
  await page.evaluate((l) => { localStorage.clear(); localStorage.setItem("sk.language", JSON.stringify(l)); }, lang);
  await page.reload();
  await wait(800);
  await page.evaluate((r) => {
    const s = JSON.parse(localStorage.getItem("sk.demo"));
    s.role = r;
    localStorage.setItem("sk.demo", JSON.stringify(s));
  }, role);
}
const edit = (page, fn) => page.evaluate(`(() => { const s = JSON.parse(localStorage.getItem("sk.demo")); (${fn})(s.data); localStorage.setItem("sk.demo", JSON.stringify(s)); })()`);
const open = async (page, hash) => { await page.goto(`${BASE}${hash}`); await page.reload(); await wait(900); };
const card = (page, list, name) => page.getByRole("list", { name: list }).getByRole("listitem").filter({ hasText: name });

for (const lang of ["en", "de"]) {
  const c = copy[lang];
  const page = await browser.newPage({ viewport: { width: 375, height: 812 }, deviceScaleFactor: 2, reducedMotion: "reduce" });
  const errors = [];
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  page.on("pageerror", (e) => errors.push(String(e)));
  const overflow = () => page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  await setup(page, lang);
  const data = await page.evaluate(() => JSON.parse(localStorage.getItem("sk.demo")).data);

  // Gifts tab, the default.
  await open(page, "#/store/products");
  check(`[${lang}] M11 renders (h1)`, (await page.getByRole("heading", { level: 1 }).innerText()) === c.title);
  const tabs = await page.getByRole("tab").allInnerTexts();
  check(`[${lang}] five tabs with counts (Stays and Experiences empty)`, tabs.length === 5 && tabs[0].includes(c.gifts) && tabs[0].includes(String(data.products.length)) && tabs[1].includes(c.tours) && tabs[1].includes(String(data.tours.tours.length)) && tabs[2].includes(c.stays) && tabs[3].includes(c.experiences) && tabs[4].includes(c.pickup) && tabs[4].includes(String(data.pickupPlaces.length)), tabs);
  check(`[${lang}] Gifts is selected by default`, (await page.getByRole("tab", { selected: true }).innerText()).includes(c.gifts));
  // M11 pages its lists at 10 (shared Paged), so page 1 holds the first ten gifts.
  check(`[${lang}] one ticket per gift on the first page`, (await page.getByRole("list", { name: c.gifts }).getByRole("listitem").count()) === Math.min(10, data.products.length));
  const print = card(page, c.gifts, c.print);
  const printText = await print.innerText();
  check(`[${lang}] the EN-only print: Published and DE missing (R02, AC30)`, printText.includes(c.published) && printText.includes(c.deMissing), printText);
  const knife = card(page, c.gifts, c.knife);
  const knifeText = await knife.innerText();
  check(`[${lang}] the knife: Published, EN and DE, from price and commission`, knifeText.includes(c.published) && knifeText.includes(c.both) && knifeText.includes(c.from) && /CHF\s49\.00/.test(knifeText) && knifeText.includes(c.commission) && /10\s?%/.test(knifeText), knifeText);
  check(`[${lang}] the knife ticket links to M12`, (await knife.getByRole("link").getAttribute("href")) === "#/store/products/gifts/p-knife");
  check(`[${lang}] gifts: no horizontal overflow`, !(await overflow()));
  await page.screenshot({ path: `${OUT}/m11-gifts-${lang}.png` });

  // Tours tab: the tab is kept in ?tab=, and survives a reload.
  await page.getByRole("tab", { name: new RegExp(c.tours) }).click();
  await wait(400);
  check(`[${lang}] Tours tab writes ?tab=tours`, page.url().endsWith("#/store/products?tab=tours"), page.url());
  await page.reload();
  await wait(900);
  check(`[${lang}] a reload keeps the Tours tab`, (await page.getByRole("tab", { selected: true }).innerText()).includes(c.tours));
  const pilatus = await card(page, c.tours, c.pilatus).innerText();
  check(`[${lang}] Pilatus shows Draft`, pilatus.includes(c.draft) && !pilatus.includes(c.published), pilatus);
  const night = await card(page, c.tours, c.night).innerText();
  check(`[${lang}] the German-only night tour: Published and EN missing`, night.includes(c.published) && night.includes(c.enMissing), night);
  const walk = card(page, c.tours, c.walk);
  check(`[${lang}] the old-town walk: Published, EN and DE`, (await walk.innerText()).includes(c.both));
  check(`[${lang}] the walk ticket links to M13`, (await walk.getByRole("link").getAttribute("href")) === "#/store/products/tours/old-town");
  await page.screenshot({ path: `${OUT}/m11-tours-${lang}.png` });

  // Pickup points tab (M14 lives here, D3).
  await open(page, "#/store/products?tab=pickup");
  check(`[${lang}] ?tab=pickup opens Pickup points`, (await page.getByRole("tab", { selected: true }).innerText()).includes(c.pickup));
  check(`[${lang}] one ticket per pickup point`, (await page.getByRole("list", { name: c.pickup }).getByRole("listitem").count()) === data.pickupPlaces.length);
  check(`[${lang}] the selected tab is scrolled into view`, await page.getByRole("tab", { selected: true }).evaluate((el) => { const r = el.getBoundingClientRect(); return r.left >= 0 && r.right <= window.innerWidth; }));

  // Completeness is computed from the text, not stored: complete the print's German text.
  await edit(page, `(d) => { const p = d.products.find((x) => x.id === "p-print"); p.name.de = "Limitierter Druck: Wasserturm im Morgenlicht"; p.story.de = "Ein signierter Druck."; p.cancellationPolicy.de = "Kostenlos stornierbar bis zur Zahlung."; p.variants[0].label.de = "30 × 40 cm"; p.longStory.title.de = "Der Turm, der stehen blieb"; p.longStory.body.de = p.longStory.body.en; }`);
  // Revision 2: the long story counts toward completeness, so it gets German text too.
  await open(page, "#/store/products");
  const printDone = await card(page, c.gifts, lang === "de" ? "Limitierter Druck" : c.print).innerText();
  check(`[${lang}] with its German text complete the print shows EN and DE`, printDone.includes(c.both) && !printDone.includes(c.deMissing), printDone);
  await edit(page, `(d) => { delete d.products.find((x) => x.id === "p-knife").story.de; }`);
  await open(page, "#/store/products");
  check(`[${lang}] one German field removed: the knife shows DE missing`, (await card(page, c.gifts, c.knife).innerText()).includes(c.deMissing));
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem("sk.demo")).data.products.find((p) => p.id === "p-knife"));
  check(`[${lang}] nothing about completeness is stored on the product`, !Object.keys(stored).some((k) => /lang|complete|missing/i.test(k)), Object.keys(stored));

  // Empty tab.
  await edit(page, `(d) => { d.products = []; }`);
  await open(page, "#/store/products");
  // The shared DataTable (15.10.2026) carries its own empty state, hidden on phones beside the
  // cards' one, so count the visible copy.
  check(`[${lang}] empty Gifts tab: the empty state and a 0 count`, (await page.getByText(c.emptyGifts).filter({ visible: true }).count()) === 1 && (await page.getByRole("tab", { selected: true }).innerText()).includes("0"));
  await page.screenshot({ path: `${OUT}/m11-empty-${lang}.png` });

  // Manager has the same access (D12).
  await setup(page, lang, "manager");
  await open(page, "#/store/products");
  check(`[${lang}] Manager reaches M11 with the same list`, (await page.getByRole("list", { name: c.gifts }).getByRole("listitem").count()) === Math.min(10, data.products.length));

  // From 1024px: the M03 table.
  await page.setViewportSize({ width: 1280, height: 900 });
  await wait(500);
  const headers = await page.getByRole("columnheader").allInnerTexts();
  // 4.8 revision 2 added the Actions column (the ⋯ menu).
  check(`[${lang}] 1280px: a six-column table with Actions, cards hidden`, headers.length === 6 && !(await page.getByRole("list", { name: c.gifts }).isVisible()), headers);
  // 4.8 revision 2: only the name links to M12, so the menu does not open the editor.
  await page.getByRole("row").filter({ hasText: c.knife }).getByRole("link", { name: c.knife }).click();
  await wait(700);
  check(`[${lang}] 1280px: the knife name opens M12`, page.url().endsWith("#/store/products/gifts/p-knife"), page.url());
  if (lang === "en") {
    await open(page, "#/store/products?tab=tours");
    await page.screenshot({ path: `${OUT}/m11-desktop-${lang}.png` });
  }
  check(`[${lang}] no horizontal overflow`, !(await overflow()));
  check(`[${lang}] no console errors`, errors.length === 0, errors);
  await page.close();
}

await browser.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
