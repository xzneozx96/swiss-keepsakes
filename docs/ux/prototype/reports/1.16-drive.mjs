// Step 1.16 verification: C18 Write a review from C15, shown on C03, in EN and DE at 375px.
// Usage: node 1.16-drive.mjs <screens dir>   (Vite on port 5192; needs playwright-core resolvable next to the script)
import { chromium } from "playwright-core";
import { readdirSync } from "node:fs";
const home = process.env.HOME + "/.cache/ms-playwright/";
const dir = readdirSync(home).filter((d) => d.startsWith("chromium_headless_shell-")).sort().pop();
const exe = `${home}${dir}/chrome-headless-shell-linux64/chrome-headless-shell`;
const OUT = process.argv[2];
const BASE = "http://localhost:5192/";
const browser = await chromium.launch({ executablePath: exe });
const context = await browser.newContext({ viewport: { width: 375, height: 812 }, deviceScaleFactor: 2 });
const page = await context.newPage();
const log = (...a) => console.log(...a);
let pass = 0, fail = 0;
const check = (name, ok, extra = "") => { ok ? pass++ : fail++; log(ok ? "PASS" : "FAIL", name, ok ? "" : String(extra).slice(0, 600)); };
page.on("console", (m) => { if (m.type() === "error") log("CONSOLE", m.text()); });
page.on("pageerror", (e) => log("PAGEERROR", e.message));
const overflow = () => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
const clean = (s) => s.replace(/\n+/g, " | ").replace(/[  ]/g, " ");
const mainText = async () => clean(await page.locator("main").innerText());
const dialogText = async () => clean(await page.getByRole("dialog").last().innerText());
const shot = async (name, full = true) => {
  await page.waitForTimeout(400);
  if (full) {
    const h = await page.evaluate(() => document.documentElement.scrollHeight);
    await page.setViewportSize({ width: 375, height: Math.max(812, h) });
    await page.waitForTimeout(200);
  }
  await page.screenshot({ path: `${OUT}/${name}.png` });
  await page.setViewportSize({ width: 375, height: 812 });
  check(`no horizontal overflow (${name})`, (await overflow()) <= 0);
};
const setLang = async (id) => {
  await page.getByRole("group", { name: /Language|Sprache/ }).getByRole("button", { name: id }).click();
  await page.waitForTimeout(300);
};
const openControls = async () => {
  await page.getByRole("region", { name: "Prototype controls" }).getByRole("button").first().click();
  await page.getByRole("dialog").waitFor();
  await page.waitForTimeout(300);
};
const open = async (id) => {
  await page.goto(BASE + `#/account/orders/${id}`);
  await page.waitForTimeout(900);
  return mainText();
};
const L = {
  EN: { write: "Write a review", title: "Write a review", rateErr: "Choose 1 to 5 stars.", textErr: "Write a few words about the gift.", star: (n) => `${n} out of 5 stars`, submit: "Post review", posted: "Review posted. Thank you.", yours: "Your review of", view: "See it on the gift page", purchased: "Purchased on", showAll: /^Show (all )?\d+ reviews?$/, text: "Lovely box, the shop wrapped it for the train. Pickup took two minutes.", stars: 4, translated: "Text auf Englisch" },
  DE: { write: "Bewertung schreiben", title: "Bewertung schreiben", rateErr: "Wählen Sie 1 bis 5 Sterne.", textErr: "Schreiben Sie ein paar Worte zum Geschenk.", star: (n) => `${n} von 5 Sternen`, submit: "Bewertung veröffentlichen", posted: "Bewertung veröffentlicht. Vielen Dank.", yours: "Ihre Bewertung von", view: "Auf der Geschenkseite ansehen", purchased: "Gekauft am", showAll: /^(Alle )?\d+ Bewertung(en)? anzeigen$/, text: "Schöne Schachtel, sauber verpackt. Die Abholung ging schnell.", stars: 5 },
};

async function signIn() {
  await page.goto(BASE + "#/account");
  await page.waitForTimeout(800);
  await page.locator("main").getByRole("button", { name: /^(Sign in|Anmelden)$/ }).first().click();
  await page.getByRole("button", { name: /Continue with Google|Weiter mit Google/ }).click();
  await page.waitForTimeout(1500);
}

async function run(lang) {
  const l = L[lang];
  const k = lang.toLowerCase();
  await page.goto(BASE);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForTimeout(600);
  await setLang(lang);
  await signIn();

  // Completed order: review button.
  let text = await open("sk-1012");
  const writeBtn = page.locator("main").getByRole("button", { name: l.write, exact: true });
  check(`${lang} completed order shows "${l.write}"`, (await writeBtn.count()) === 1, text);
  check(`${lang} no "coming later" placeholder`, !/later step|späteren Schritt/.test(text), text);
  await shot(`completed-${k}`);

  // Sheet: product reviewed, stars, text.
  await writeBtn.click();
  await page.getByRole("dialog").waitFor();
  await page.waitForTimeout(500);
  let d = await dialogText();
  check(`${lang} sheet title`, d.includes(l.title), d);
  check(`${lang} sheet shows the product reviewed`, /Chocolate|Schokolade/i.test(d), d);
  check(`${lang} five star radios`, (await page.getByRole("radio").count()) === 5);
  if (lang === "DE") check("DE sheet: no raw keys", !/review\.|detail\./.test(d), d);
  await page.screenshot({ path: `${OUT}/sheet-${k}.png` });
  check(`no horizontal overflow (sheet-${k})`, (await overflow()) <= 0);

  // Empty submit → both errors.
  await page.getByRole("button", { name: l.submit }).click();
  await page.waitForTimeout(300);
  d = await dialogText();
  check(`${lang} rating error`, d.includes(l.rateErr), d);
  check(`${lang} text error`, d.includes(l.textErr), d);
  await page.screenshot({ path: `${OUT}/sheet-errors-${k}.png` });

  // Keyboard: focus the stars, arrow to pick a rating.
  await page.getByRole("radio", { name: l.star(1) }).focus();
  await page.keyboard.press("Space");
  for (let i = 1; i < l.stars; i++) await page.keyboard.press("ArrowRight");
  await page.waitForTimeout(200);
  const checked = await page.getByRole("radio", { checked: true }).getAttribute("value");
  check(`${lang} keyboard picks ${l.stars} stars`, checked === String(l.stars), checked);
  await page.getByRole("textbox").fill(l.text);
  await page.waitForTimeout(200);
  d = await dialogText();
  check(`${lang} errors cleared once filled`, !d.includes(l.rateErr) && !d.includes(l.textErr), d);
  await page.screenshot({ path: `${OUT}/sheet-filled-${k}.png` });

  await page.getByRole("button", { name: l.submit }).click();
  await page.waitForTimeout(900);
  check(`${lang} sheet closed`, (await page.getByRole("dialog").count()) === 0);
  check(`${lang} toast "${l.posted}"`, (await page.getByText(l.posted).count()) > 0);
  await page.screenshot({ path: `${OUT}/posted-toast-${k}.png` });

  // Already reviewed: button replaced by the review.
  text = await mainText();
  check(`${lang} already reviewed: no write button`, (await writeBtn.count()) === 0, text);
  check(`${lang} already reviewed: shows the review`, text.includes(l.yours) && text.includes(l.text) && text.includes("Anna K.") && text.includes(l.purchased), text);
  await shot(`reviewed-${k}`);

  // Persists after reload.
  text = await open("sk-1012");
  check(`${lang} reviewed state persists after reload`, text.includes(l.yours) && (await writeBtn.count()) === 0, text);

  // C03: review on the gift page with the purchase line.
  await page.getByRole("link", { name: l.view }).click();
  await page.waitForTimeout(1200);
  check(`${lang} link opens C03`, /#\/gifts\//.test(page.url()), page.url());
  text = await mainText();
  check(`${lang} C03 shows the new review`, text.includes("Anna K.") && text.includes(l.text.slice(0, 30)), text);
  const annaPurchased = new RegExp(`Anna K\\. \\| ${l.purchased} `);
  check(`${lang} C03 review marked "${l.purchased} …"`, annaPurchased.test(text), text);
  await page.getByText("Anna K.").first().scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT}/c03-review-${k}.png` });
  await shot(`c03-${k}`);

  // All-reviews sheet: newest first.
  await page.getByRole("button", { name: l.showAll }).first().click();
  await page.getByRole("dialog").waitFor();
  await page.waitForTimeout(600);
  d = await dialogText();
  check(`${lang} all-reviews sheet lists it`, d.includes("Anna K.") && d.includes(l.text.slice(0, 30)), d);
  await page.screenshot({ path: `${OUT}/all-reviews-${k}.png` });
  await page.keyboard.press("Escape");
  await page.waitForTimeout(300);

  if (lang === "EN") {
    // The other language shows the translation notice on the stored text.
    await setLang("DE");
    text = await open("sk-1012");
    check("EN review read in DE shows translation notice", text.includes(L.EN.translated) && text.includes("Ihre Bewertung von"), text);
    await shot("reviewed-en-text-in-de");
    await setLang("EN");

    // Orders not completed: no review button.
    await openControls();
    await page.getByRole("button", { name: "Add sample orders in every state" }).click();
    await page.waitForTimeout(1200);
    for (const id of ["sk-1043", "sk-1044", "sk-1046", "sk-1047", "sk-1048", "sk-1049", "sk-1050", "sk-1015"]) {
      text = await open(id);
      check(`${id} (not completed): no review button`, (await page.getByRole("button", { name: /review/i }).count()) === 0 && !text.includes(l.yours), text);
    }
    await shot("handed-over-no-review-en");
  }
}

await run("EN");
await run("DE");
log(`\n${pass} PASS, ${fail} FAIL`);
await browser.close();
