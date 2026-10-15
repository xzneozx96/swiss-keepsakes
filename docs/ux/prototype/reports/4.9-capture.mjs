// 4.9 M12 Edit gift check (R02, R05, AC30, outline step 9): the knife from M11; edits to
// engraving, preparation, a variant price, payment policy and deadline, commission saved to
// demo data and shown on C03; the required-text block with focus on the first empty field;
// DE missing as a warning that still saves (C03 in DE falls back to English with a notice);
// stock below held units; pickup places (C03 offers only the chosen place); unpublish removes
// the gift from C02, C01, search and the C20 story links, republish brings it back; refresh
// drops unsaved edits; unknown id. 375px, DPR 2, EN and DE; one 1280px shot.
// Revision 1: the language tabs are scoped to the first set (text), as M12/M13 now also
// have the long story's tabs.
// Revision 2: adapted to the stepper. Steps are reached with the bar's Next or `?step=`
// (a hash change keeps the unsaved draft); Unpublish and Publish sit on the Review step.
// 15.10.2026: merchant labels say Keepsakes / Andenken instead of Gifts / Geschenke.
// Run from a folder with playwright-core: node 4.9-capture.mjs <screens dir>
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
// Revision 2: the option labels follow the step's EN | DE tab, which opens on the interface
// language (owner, 15.10.2026), so the DE run reads "Preis: Mittel" and "Am Lager: Gross".
const copy = {
  en: { gifts: "Keepsakes", knife: "Kapellbrücke pocket knife", knifeDe: "Kapellbrücke Taschenmesser", print: "Limited-edition print: Water Tower at dawn", name: "Name", german: "German", english: "English", save: "Save changes", saved: "Saved. Guests see the change now.", noChanges: "No unsaved changes", next: "Next", publish: "Publish", unpublish: "Unpublish", maxChars: "Maximum characters", prepDays: "Preparation days", priceMedium: "Price: Medium", stockLarge: "In stock: Large", deposit: "Deposit, then the rest", depositPct: "Deposit (%)", firstDue: "First payment deadline (hours)", commission: "Commission rate", altstadt: "Shop Altstadt", bahnhof: "Pickup point Bahnhof", fixErrors: "Check the marked fields.", neededAny: "Needed in English or German.", deWarning: "German is missing: name.", belowHeld: "Accepted orders hold 1, so stock can’t be lower.", placesError: "Choose at least one pickup point.", published: "Published", draft: "Draft", deMissing: "DE missing", engraveC03: "up to 10 characters", depositC03: /30%.*12 hours/, add: "Add to cart", draftNote: "Draft: guests don't see this keepsake.", notFound: "This keepsake is not in the shop.", stepper: "Steps" },
  de: { gifts: "Andenken", knife: "Kapellbrücke Taschenmesser", knifeDe: "Kapellbrücke Taschenmesser", print: "Limited-edition print: Water Tower at dawn", name: "Name", german: "Deutsch", english: "Englisch", save: "Änderungen speichern", saved: "Gespeichert. Gäste sehen die Änderung sofort.", noChanges: "Keine ungespeicherten Änderungen", next: "Weiter", publish: "Veröffentlichen", unpublish: "Zurückziehen", maxChars: "Maximale Zeichenzahl", prepDays: "Vorbereitungstage", priceMedium: "Preis: Mittel", stockLarge: "Am Lager: Gross", deposit: "Anzahlung, dann der Rest", depositPct: "Anzahlung (%)", firstDue: "Frist für die erste Zahlung (Stunden)", commission: "Provisionssatz", altstadt: "Laden Altstadt", bahnhof: "Abholstelle Bahnhof", fixErrors: "Prüfen Sie die markierten Felder.", neededAny: "Nötig auf Englisch oder Deutsch.", deWarning: "Auf Deutsch fehlt: Name.", belowHeld: "Angenommene Bestellungen reservieren 1, weniger geht nicht.", placesError: "Wählen Sie mindestens eine Abholstelle.", published: "Veröffentlicht", draft: "Entwurf", deMissing: "DE fehlt", engraveC03: "bis zu 10 Zeichen", depositC03: /12 Stunden eine Anzahlung von 30 %/, add: "In den Warenkorb", draftNote: "Entwurf: Gäste sehen dieses Andenken nicht.", notFound: "Dieses Andenken gibt es im Shop nicht.", stepper: "Schritte" },
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
// Hash navigation, no reload: the app keeps its state in memory and storage, and fewer full
// loads keep the headless shell within its resources.
const open = async (page, hash) => { await page.goto(`${BASE}${hash}`); await wait(800); };
const knifeData = (page) => page.evaluate(() => JSON.parse(localStorage.getItem("sk.demo")).data.products.find((p) => p.id === "p-knife"));
const body = (page) => page.locator("body").innerText();
const setNumber = async (page, label, value) => {
  const field = page.getByLabel(label, { exact: true });
  await field.fill(String(value));
  await field.press("Tab");
};

for (const lang of ["en", "de"]) {
  const c = copy[lang];
  const page = await browser.newPage({ viewport: { width: 375, height: 812 }, deviceScaleFactor: 2, reducedMotion: "reduce" });
  const errors = [];
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  page.on("pageerror", (e) => errors.push(String(e)));
  const overflow = () => page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  const save = async () => { await page.getByRole("button", { name: c.save }).click(); await wait(500); };
  const next = async () => { await page.getByRole("button", { name: c.next, exact: true }).click(); await wait(500); };
  const tab = (language) => page.getByRole("tab", { name: new RegExp(`^${language === "de" ? c.german : c.english}`) }).first();
  // Revision 2: one M12 address per step; a hash change keeps the unsaved draft.
  const toM12 = (step) => open(page, `#/store/products/gifts/p-knife${step ? `?step=${step}` : ""}`);
  await setup(page, lang);

  // Before: the knife is on C02, C01 and in the water-tower story (EN version, D6 in DE).
  await open(page, "#/gifts");
  check(`[${lang}] before: C02 lists the knife`, (await body(page)).includes(c.knife));
  await open(page, "#/");
  check(`[${lang}] before: C01 shows the knife`, (await body(page)).includes(c.knife));
  await open(page, "#/stories/water-tower");
  // The story's prose names the knife too, so count the gift links (R16), not the text.
  const giftLinks = (slug) => page.locator(`a[href*="/gifts/${slug}"]`).count();
  check(`[${lang}] before: C20 water-tower links the knife`, (await giftLinks("kapellbruecke-pocket-knife")) > 0);

  // From M11 to M12.
  await open(page, "#/store/products");
  await page.getByRole("list", { name: c.gifts }).getByRole("listitem").filter({ hasText: c.knife }).getByRole("link").click();
  await wait(900);
  check(`[${lang}] the M11 ticket opens M12`, page.url().endsWith("#/store/products/gifts/p-knife"), page.url());
  check(`[${lang}] M12 h1 is the gift name`, (await page.getByRole("heading", { level: 1 }).innerText()) === c.knife);
  // Revision 2: the "Show in the shop" switch is gone; the header chip says Published and the
  // Review step offers Unpublish (checked below).
  check(`[${lang}] the header chip says Published`, await page.locator("header").getByText(c.published, { exact: true }).isVisible());
  check(`[${lang}] the save bar sits above the tab bar`, await page.evaluate(() => {
    const bar = [...document.querySelectorAll("button")].find((b) => b.textContent.includes("Save changes") || b.textContent.includes("Änderungen speichern"));
    const nav = document.querySelector("nav.fixed");
    return !!bar && !!nav && bar.getBoundingClientRect().bottom <= nav.getBoundingClientRect().top;
  }));
  check(`[${lang}] the step's language switch opens on the interface language`, (await page.getByRole("tab", { selected: true }).first().innerText()).startsWith(lang === "en" ? c.english : c.german));
  await page.screenshot({ path: `${OUT}/m12-top-${lang}.png` });

  // Edit engraving and a price (Options), preparation (Pickup), the payment policy and
  // deadline, the commission (Payment); one Save changes from the Payment step.
  await next();
  await tab(lang).click();
  await setNumber(page, c.maxChars, 10);
  await setNumber(page, c.priceMedium, 56);
  await next();
  await setNumber(page, c.prepDays, 2);
  // The M12 preview names the earliest pickup; C03 must show the same date after saving.
  const prepDate = (await page.locator("body").innerText()).match(lang === "en" ? /picked up from (.+)\./ : /kann ab (.+) abgeholt/)?.[1];
  check(`[${lang}] M12 previews the earliest pickup for 2 days`, !!prepDate, prepDate);
  await next();
  await page.getByRole("radio", { name: c.deposit }).check({ force: true });
  await wait(200);
  await setNumber(page, c.depositPct, 30);
  await setNumber(page, c.firstDue, 12);
  await setNumber(page, c.commission, 12);
  await page.getByLabel(c.depositPct, { exact: true }).scrollIntoViewIfNeeded();
  await page.screenshot({ path: `${OUT}/m12-payment-${lang}.png` });
  await save();
  const k1 = await knifeData(page);
  check(`[${lang}] saved to demo data: engraving 10, 2 days, Medium CHF 56, deposit 30% due in 12 h, 12%`, k1.engraving?.maxLength === 10 && k1.preparationDays === 2 && k1.variants.find((v) => v.id === "m").price === 5600 && k1.paymentPolicy.kind === "deposit" && k1.paymentPolicy.depositPercent === 30 && k1.paymentPolicy.firstDueHours === 12 && Math.abs(k1.commissionRate - 0.12) < 1e-9, { e: k1.engraving, p: k1.preparationDays, pay: k1.paymentPolicy, r: k1.commissionRate });
  check(`[${lang}] the save bar confirms the save (no toast over the bar)`, (await page.getByRole("status").filter({ hasText: c.saved }).isVisible()) && (await page.locator("[data-slot=toast]").count()) === 0);
  check(`[${lang}] ids and slug are unchanged`, k1.slug === "kapellbruecke-pocket-knife" && k1.variants.map((v) => v.id).join() === "s,m,l");

  // C03 shows the change.
  await open(page, "#/gifts/kapellbruecke-pocket-knife");
  await page.getByRole("button", { name: lang === "en" ? "Payment" : "Zahlung", exact: true }).click();
  await wait(500);
  const c03 = await body(page);
  check(`[${lang}] C03: the earliest pickup follows the 2 preparation days (${prepDate})`, !!prepDate && c03.includes(prepDate));
  check(`[${lang}] C03: engraving up to 10 characters`, c03.includes(c.engraveC03), c03.match(/.{0,30}(10).{0,30}/)?.[0]);
  check(`[${lang}] C03: the deposit and the 12-hour deadline`, c.depositC03.test(c03.replace(/ /g, " ")));
  await page.getByRole("button", { name: c.add }).click();
  await wait(700);
  check(`[${lang}] C03 sheet: Medium costs CHF 56.00`, /CHF\s56\.00/.test(await page.getByRole("dialog").innerText()));
  await page.keyboard.press("Escape");

  // Required text: no language complete blocks the save; focus goes to the first empty field.
  await toM12();
  const name = () => page.getByLabel(c.name, { exact: true });
  await tab("en").click();
  await wait(200);
  await name().fill("");
  await tab("de").click();
  await wait(200);
  await name().fill("");
  await save();
  await wait(400);
  // Revision 2: the bar carries the danger note ("Check the marked fields.") and the field
  // says "Needed in English or German."; the open German tab stays (no switch to the closest
  // language), since the empty name is marked in either tab.
  check(`[${lang}] both names empty: the save is blocked with the danger note`, (await page.getByRole("status").filter({ hasText: c.fixErrors }).isVisible()) && (await page.getByText(c.neededAny).first().isVisible()));
  check(`[${lang}] the German tab stays selected and its name is marked`, (await page.getByRole("tab", { selected: true }).first().innerText()).startsWith(c.german) && (await name().getAttribute("aria-invalid")) === "true");
  check(`[${lang}] focus moves to the empty name field`, await page.evaluate(() => document.activeElement?.tagName === "INPUT" && document.activeElement.value === ""));
  check(`[${lang}] nothing saved`, (await knifeData(page)).name.en === "Kapellbrücke pocket knife");
  await page.screenshot({ path: `${OUT}/m12-required-${lang}.png` });

  // DE missing is a warning: the English name back, German left empty, it saves.
  await tab("en").click();
  await wait(200);
  await name().fill("Kapellbrücke pocket knife");
  await tab("de").click();
  await wait(300);
  check(`[${lang}] the German tab warns what is missing and what guests see`, await page.getByText(c.deWarning).isVisible());
  await page.screenshot({ path: `${OUT}/m12-de-missing-${lang}.png` });
  await save();
  const k2 = await knifeData(page);
  check(`[${lang}] DE missing still saves and stays published`, k2.name.en === "Kapellbrücke pocket knife" && !k2.name.de && k2.published !== false);
  await open(page, "#/store/products");
  check(`[${lang}] M11: the knife shows Published and DE missing`, /(Published|Veröffentlicht)[\s\S]*(DE missing|DE fehlt)/.test(await page.getByRole("list", { name: c.gifts }).getByRole("listitem").filter({ hasText: "Kapellbrücke pocket knife" }).innerText()));
  if (lang === "de") {
    await open(page, "#/gifts/kapellbruecke-pocket-knife");
    const c03de = await body(page);
    check(`[de] C03 in German falls back to the English name with the notice (R02)`, c03de.includes("Kapellbrücke pocket knife") && /nur auf Englisch/i.test(c03de), c03de.slice(0, 300));
  }
  await toM12();
  await tab("de").click();
  await name().fill("Kapellbrücke Taschenmesser");
  await save();

  // Stock below the units held by accepted orders (SK-1028 holds 1 Large).
  await toM12("options");
  await tab(lang).click();
  await setNumber(page, c.stockLarge, 0);
  await save();
  check(`[${lang}] stock below held: the error shows and nothing is saved`, (await page.getByText(c.belowHeld).isVisible()) && (await knifeData(page)).variants.find((v) => v.id === "l").stock === 2);
  check(`[${lang}] focus moves to the Large stock`, await page.getByLabel(c.stockLarge, { exact: true }).evaluate((el) => el === document.activeElement));
  await page.screenshot({ path: `${OUT}/m12-stock-${lang}.png` });
  await setNumber(page, c.stockLarge, 2);

  // Pickup places: none is an error; Bahnhof only reaches C03.
  await toM12("pickup");
  await page.getByRole("checkbox", { name: new RegExp(c.altstadt) }).uncheck({ force: true });
  await page.getByRole("checkbox", { name: new RegExp(c.bahnhof) }).uncheck({ force: true });
  await save();
  check(`[${lang}] no pickup place: the error shows`, await page.getByText(c.placesError).isVisible());
  await page.getByRole("checkbox", { name: new RegExp(c.bahnhof) }).check({ force: true });
  await save();
  check(`[${lang}] Bahnhof only is saved`, JSON.stringify((await knifeData(page)).pickupPlaceIds) === '["bahnhof"]');
  await open(page, "#/gifts/kapellbruecke-pocket-knife");
  await page.getByRole("button", { name: c.add }).click();
  await wait(700);
  const radios = await page.locator("#gift-place").getByRole("radio").count();
  check(`[${lang}] C03 offers only Bahnhof`, radios === 1 && (await page.locator("#gift-place").innerText()).includes(c.bahnhof), radios);
  await page.keyboard.press("Escape");
  await wait(300);
  check(`[${lang}] C03 pickup highlight names Bahnhof only`, !(await body(page)).includes(`${c.altstadt} ${lang === "en" ? "or" : "oder"} ${c.bahnhof}`));

  // Unpublish: gone from C02, C01, search and the story; back after republishing.
  // Revision 2: Unpublish and Publish are the Review step's buttons, not a switch.
  await toM12("review");
  await page.getByRole("button", { name: c.unpublish, exact: true }).click();
  await wait(500);
  check(`[${lang}] saved as a draft`, (await knifeData(page)).published === false);
  check(`[${lang}] the Review step explains the draft`, await page.getByText(c.draftNote).isVisible());
  await open(page, "#/store/products");
  check(`[${lang}] M11 shows Draft`, (await page.getByRole("list", { name: c.gifts }).getByRole("listitem").filter({ hasText: c.knife }).innerText()).includes(c.draft));
  await open(page, "#/gifts");
  check(`[${lang}] C02 no longer lists the knife`, !(await body(page)).includes(c.knife));
  await open(page, "#/");
  check(`[${lang}] C01 no longer shows the knife`, !(await body(page)).includes(c.knife));
  await open(page, "#/search?q=Kapell");
  check(`[${lang}] search no longer finds the knife`, !(await body(page)).includes(c.knife));
  await open(page, "#/stories/water-tower");
  check(`[${lang}] C20 drops the knife link and keeps the print link`, (await giftLinks("kapellbruecke-pocket-knife")) === 0 && (await giftLinks("limited-edition-print")) > 0);
  await toM12("review");
  await page.getByRole("button", { name: c.publish, exact: true }).click();
  await wait(500);
  await open(page, "#/gifts");
  check(`[${lang}] republished: back on C02`, (await body(page)).includes(c.knife));

  // Refresh drops unsaved edits.
  await toM12();
  await name().fill("Unsaved name");
  check(`[${lang}] the bar shows unsaved changes`, !(await page.getByText(c.noChanges).isVisible()));
  await page.reload();
  await wait(900);
  check(`[${lang}] a refresh drops the unsaved name`, (await name().inputValue()) !== "Unsaved name");

  await open(page, "#/store/products/gifts/nope");
  check(`[${lang}] an unknown gift shows the not-found state`, await page.getByText(c.notFound).isVisible());

  if (lang === "en") {
    await page.setViewportSize({ width: 1280, height: 900 });
    await toM12();
    // Revision 2: the two-column page became a stepper; 1280px shows the numbered step list
    // in a column beside the step.
    check(`[en] 1280px: the step list shows six numbered steps, Basics current`, await page.evaluate(() => {
      const nav = document.querySelector('nav[aria-label="Steps"]');
      const buttons = nav ? [...nav.querySelectorAll("button")] : [];
      return !!nav && nav.getBoundingClientRect().width > 0 && buttons.length === 6 && buttons[0].getAttribute("aria-current") === "step";
    }));
    await page.screenshot({ path: `${OUT}/m12-desktop-en.png` });
    await page.setViewportSize({ width: 375, height: 812 });
  }
  check(`[${lang}] no horizontal overflow`, !(await overflow()));
  check(`[${lang}] no console errors`, errors.length === 0, errors);
  await page.close();
}

await browser.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
