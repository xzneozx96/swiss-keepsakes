// 4.11 M14 Pickup points check (D3, D4, R02, outline step 11): the Pickup points tab of M11;
// the Owner edits Bahnhof's opening hours (EN, DE) and its German instructions in the sheet;
// C03's place choice and the matching C15 order (SK-1028, Bahnhof) show the new text; a
// cleared German instruction is a warning that saves, and C15 in German falls back to English;
// an empty address and no complete language are blocked. 375px, DPR 2, EN and DE; one
// 1280px shot. Run from a folder with playwright-core: node 4.11-capture.mjs <screens dir>
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
const HOURS_EN = "Mon–Fri 07:30–19:00, Sat 09:00–17:00";
const HOURS_DE = "Mo–Fr 07:30–19:00, Sa 09:00–17:00";
const INSTR_DE = "Schalter 3 neben der Haupthalle. Bringen Sie Ihre Bestellnummer mit.";
const INSTR_EN = "Locker desk next to the main hall. Bring your order reference.";
const copy = {
  en: { pickup: "Pickup points", bahnhof: "Pickup point Bahnhof", altstadt: "Shop Altstadt", edit: "Edit Pickup point Bahnhof", sheetTitle: "Edit pickup point", english: "English", german: "German", hours: "Opening hours", instructions: "Pickup instructions", address: "Address", name: "Name", save: "Save pickup point", saved: "Pickup point Bahnhof saved", both: "EN and DE", deMissing: "DE missing", deWarning: "German is missing: instructions.", addressError: "Enter the address.", noneComplete: "Complete the text in English or German to save.", add: "Add to cart", oldHours: "Mon–Fri 08:00–19:00, Sat 09:00–17:00" },
  de: { pickup: "Abholstellen", bahnhof: "Abholstelle Bahnhof", altstadt: "Laden Altstadt", edit: "Abholstelle Bahnhof bearbeiten", sheetTitle: "Abholstelle bearbeiten", english: "Englisch", german: "Deutsch", hours: "Öffnungszeiten", instructions: "Hinweise zur Abholung", address: "Adresse", name: "Name", save: "Abholstelle speichern", saved: "Abholstelle Bahnhof gespeichert", both: "EN und DE", deMissing: "DE fehlt", deWarning: "Auf Deutsch fehlt: Hinweise.", addressError: "Geben Sie die Adresse ein.", noneComplete: "Vervollständigen Sie den Text auf Englisch oder Deutsch, um zu speichern.", add: "In den Warenkorb", oldHours: "Mo–Fr 08:00–19:00, Sa 09:00–17:00" },
};

async function setup(page, lang) {
  await page.goto(BASE);
  await page.evaluate((l) => { localStorage.clear(); localStorage.setItem("sk.language", JSON.stringify(l)); }, lang);
  await page.reload();
  await wait(800);
  await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem("sk.demo"));
    s.role = "owner";
    // Daniel's SK-1028 is accepted, for Bahnhof: C15 is checked as him.
    s.data.signedInGuestId = "g-daniel";
    localStorage.setItem("sk.demo", JSON.stringify(s));
  });
  await page.reload();
  await wait(800);
}
const open = async (page, hash) => { await page.goto(`${BASE}${hash}`); await wait(800); };
const bahnhof = (page) => page.evaluate(() => JSON.parse(localStorage.getItem("sk.demo")).data.pickupPlaces.find((p) => p.id === "bahnhof"));

for (const lang of ["en", "de"]) {
  const c = copy[lang];
  const page = await browser.newPage({ viewport: { width: 375, height: 812 }, deviceScaleFactor: 2, reducedMotion: "reduce" });
  const errors = [];
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  page.on("pageerror", (e) => errors.push(String(e)));
  const overflow = () => page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  await setup(page, lang);
  const card = () => page.getByRole("list", { name: c.pickup }).getByRole("listitem").filter({ hasText: c.bahnhof });
  const openSheet = async () => {
    await page.getByRole("button", { name: c.edit }).click();
    await wait(600);
    return page.getByRole("dialog");
  };
  const tab = (sheet, name) => sheet.getByRole("tab", { name: new RegExp(`^${name}`) }).click();

  await open(page, "#/store/products?tab=pickup");
  const before = await card().innerText();
  check(`[${lang}] the Bahnhof ticket: name, address, hours, EN and DE`, before.includes("Zentralstrasse 1, 6003 Luzern") && before.includes(c.oldHours) && before.includes(c.both), before);
  await page.screenshot({ path: `${OUT}/m14-list-${lang}.png` });

  // Edit the hours in both languages and the German instructions.
  let sheet = await openSheet();
  check(`[${lang}] the name opens the editor sheet`, (await sheet.getByRole("heading").first().innerText()) === c.sheetTitle);
  check(`[${lang}] the sheet starts on the interface language`, (await sheet.getByRole("tab", { selected: true }).innerText()).startsWith(lang === "en" ? c.english : c.german));
  await tab(sheet, c.english);
  await sheet.getByLabel(c.hours, { exact: true }).fill(HOURS_EN);
  await tab(sheet, c.german);
  await sheet.getByLabel(c.hours, { exact: true }).fill(HOURS_DE);
  await sheet.getByLabel(c.instructions, { exact: true }).fill(INSTR_DE);
  await page.screenshot({ path: `${OUT}/m14-sheet-${lang}.png` });
  await sheet.getByRole("button", { name: c.save }).click();
  await wait(600);
  const b1 = await bahnhof(page);
  check(`[${lang}] saved to demo data`, b1.openingHours.en === HOURS_EN && b1.openingHours.de === HOURS_DE && b1.instructions.de === INSTR_DE && b1.instructions.en === INSTR_EN, b1);
  check(`[${lang}] the sheet closes and a toast confirms`, (await page.getByRole("dialog").count()) === 0 && (await page.getByText(c.saved).first().isVisible()));
  check(`[${lang}] the ticket shows the new hours`, (await card().innerText()).includes(lang === "en" ? HOURS_EN : HOURS_DE));

  // C03: the place choice shows the new hours.
  await open(page, "#/gifts/kapellbruecke-pocket-knife");
  await page.getByRole("button", { name: c.add }).click();
  await wait(700);
  const places = await page.locator("#gift-place").innerText();
  check(`[${lang}] C03 place choice: Bahnhof with the new hours`, places.includes(c.bahnhof) && places.includes(lang === "en" ? HOURS_EN : HOURS_DE), places);
  await page.screenshot({ path: `${OUT}/c03-place-${lang}.png` });
  await page.keyboard.press("Escape");

  // C15: the matching order shows the new hours and, in German, the new instructions.
  await open(page, "#/account/orders/sk-1028");
  const c15 = await page.locator("body").innerText();
  check(`[${lang}] C15 SK-1028: the new hours`, c15.includes(lang === "en" ? HOURS_EN : HOURS_DE));
  check(`[${lang}] C15 SK-1028: the instructions in the guest's language`, c15.includes(lang === "en" ? INSTR_EN : INSTR_DE));
  await page.getByText(lang === "en" ? HOURS_EN : HOURS_DE).scrollIntoViewIfNeeded();
  await page.screenshot({ path: `${OUT}/c15-pickup-${lang}.png` });

  // DE missing is a warning: clear the German instructions; it saves; C15 in DE falls back.
  await open(page, "#/store/products?tab=pickup");
  sheet = await openSheet();
  await tab(sheet, c.german);
  await sheet.getByLabel(c.instructions, { exact: true }).fill("");
  check(`[${lang}] the German tab warns about the instructions`, await sheet.getByText(c.deWarning).isVisible());
  check(`[${lang}] the empty field shows the English text as a translation aid`, await sheet.getByText(INSTR_EN).isVisible());
  await sheet.getByRole("button", { name: c.save }).click();
  await wait(600);
  check(`[${lang}] saved with the German instructions missing`, !(await bahnhof(page)).instructions.de);
  check(`[${lang}] the ticket shows DE missing`, (await card().innerText()).includes(c.deMissing));
  if (lang === "de") {
    await open(page, "#/account/orders/sk-1028");
    check(`[de] C15 in German falls back to the English instructions`, (await page.locator("body").innerText()).includes(INSTR_EN));
    await open(page, "#/store/products?tab=pickup");
  }

  // An empty address, then no complete language: both blocked, nothing saved.
  sheet = await openSheet();
  await sheet.getByLabel(c.address, { exact: true }).fill("");
  await sheet.getByRole("button", { name: c.save }).click();
  await wait(400);
  check(`[${lang}] empty address: error and focus on the field`, (await sheet.getByText(c.addressError).isVisible()) && (await sheet.getByLabel(c.address, { exact: true }).evaluate((el) => el === document.activeElement)));
  await sheet.getByLabel(c.address, { exact: true }).fill("Zentralstrasse 1, 6003 Luzern");
  await tab(sheet, c.english);
  await sheet.getByLabel(c.name, { exact: true }).fill("");
  await tab(sheet, c.german);
  await sheet.getByLabel(c.name, { exact: true }).fill("");
  await sheet.getByRole("button", { name: c.save }).click();
  await wait(400);
  check(`[${lang}] no complete language: blocked with the note`, await sheet.getByText(c.noneComplete).isVisible());
  check(`[${lang}] still open and nothing saved`, (await page.getByRole("dialog").count()) === 1 && (await bahnhof(page)).name.en === "Pickup point Bahnhof");
  await page.screenshot({ path: `${OUT}/m14-errors-${lang}.png` });
  await page.keyboard.press("Escape");
  await wait(400);

  if (lang === "en") {
    await page.setViewportSize({ width: 1280, height: 900 });
    await open(page, "#/store/products?tab=pickup");
    check(`[en] 1280px: the two tickets side by side`, await page.evaluate(() => {
      const items = [...document.querySelectorAll('ul[aria-label="Pickup points"] > li')].map((li) => li.getBoundingClientRect());
      return items.length === 2 && Math.abs(items[0].top - items[1].top) < 2;
    }));
    await page.screenshot({ path: `${OUT}/m14-desktop-en.png` });
    await page.setViewportSize({ width: 375, height: 812 });
  }
  check(`[${lang}] no horizontal overflow`, !(await overflow()));
  check(`[${lang}] no console errors`, errors.length === 0, errors);
  await page.close();
}

await browser.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
