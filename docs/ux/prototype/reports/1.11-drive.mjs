// Step 1.11 driver: M04 merchant order detail. Headless playwright-core against Vite on 5187.
// Usage (from a folder whose node_modules has playwright-core): node 1.11-drive.mjs <screens dir>
// Anna's two requests (outline steps 9–10) are added as a fixture, because step 1.7 (C06 send)
// is not built yet; coordinator decision B: fixture in the driver only.
import { chromium } from "playwright-core";
import { readdirSync } from "node:fs";

const home = process.env.HOME + "/.cache/ms-playwright/";
const dir = readdirSync(home).filter((d) => d.startsWith("chromium_headless_shell-")).sort().pop();
const exe = `${home}${dir}/chrome-headless-shell-linux64/chrome-headless-shell`;
const OUT = process.argv[2];
const BASE = "http://localhost:5187/";
const browser = await chromium.launch({ executablePath: exe });
const page = await browser.newPage({ viewport: { width: 375, height: 812 }, deviceScaleFactor: 2 });
const log = (...a) => console.log(...a);
let failures = 0;
const check = (name, ok, extra = "") => {
  if (!ok) failures++;
  log(ok ? "PASS" : "FAIL", name, extra);
};
page.on("console", (m) => { if (m.type() === "error") log("CONSOLE", m.text()); });
page.on("pageerror", (e) => log("PAGEERROR", e.message));
const overflow = () => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
const shot = async (name, { full = true } = {}) => {
  await page.waitForTimeout(450);
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: full });
  log("shot", name, "overflow:", await overflow());
};
const state = () => page.evaluate(() => JSON.parse(localStorage.getItem("sk.demo")));
const main = () => page.locator("main").innerText();

/** Fresh seed, Manager, demo clock at 10:30, Anna's gift box and knife requests (Hotel am See). */
async function setup(language) {
  await page.goto(BASE);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForTimeout(500);
  await page.evaluate((language) => {
    const s = JSON.parse(localStorage.getItem("sk.demo"));
    const product = (id) => s.data.products.find((p) => p.id === id);
    const at = (min) => new Date(Date.parse("2026-10-13T10:00:00+02:00") + min * 60_000).toISOString();
    const order = (ref, productId, variantId, engraving, pickupDate, createdAt) => {
      const p = product(productId);
      const v = p.variants.find((x) => x.id === variantId);
      return {
        id: ref.toLowerCase(), ref, guestId: "g-anna", language: "en", createdAt,
        lines: [{ id: `${p.id}-${v.id}`, productId: p.id, variantId: v.id, productName: p.name,
          variantLabel: v.label, unitPrice: v.price, quantity: 1, engraving, commissionRate: p.commissionRate }],
        pickupDate, pickupPlaceId: "altstadt", paymentPolicy: p.paymentPolicy,
        cancellationPolicy: p.cancellationPolicy, status: "requested", partnerId: "hotel-am-see",
        payments: [], log: [{ type: "requested", at: createdAt, actor: "guest" }],
      };
    };
    const n = s.data.nextOrderNumber;
    s.data.orders.push(
      order(`SK-${n}`, "p-knife", "m", "Anna", "2026-10-21", at(-10)),
      order(`SK-${n + 1}`, "p-giftbox", "std", undefined, "2026-10-20", at(-10)),
    );
    s.data.nextOrderNumber = n + 2;
    s.role = "manager";
    s.clockStartedAt = Date.now() - 30 * 60_000; // demo time 10:30
    localStorage.setItem("sk.demo", JSON.stringify(s));
    localStorage.setItem("sk.language", JSON.stringify(language));
  }, language);
  const s = await state();
  const knife = s.data.orders.at(-2).id;
  const box = s.data.orders.at(-1).id;
  await page.reload();
  return { knife, box };
}

async function open(id) {
  await page.goto(BASE + "#/store/orders/" + id);
  await page.waitForTimeout(700);
}

const sheet = () => page.getByRole("dialog");

for (const lang of ["en", "de"]) {
  const T = lang === "en"
    ? { change: "Change date or place", save: "Save change", accept: "Accept", decline: "Decline", declineOrder: "Decline order", bahnhof: "Pickup point Bahnhof", other: "Other reason", date: "We can’t prepare it for the requested date" }
    : { change: "Datum oder Ort ändern", save: "Änderung speichern", accept: "Annehmen", decline: "Ablehnen", declineOrder: "Bestellung ablehnen", bahnhof: "Abholstelle Bahnhof", other: "Anderer Grund", date: "Wir können es zum gewünschten Datum nicht vorbereiten" };
  log(`\n=== ${lang.toUpperCase()} ===`);
  const { knife, box } = await setup(lang);
  await page.setViewportSize({ width: 375, height: 812 });

  if (lang === "en") {
    await page.goto(BASE + "#/store/orders/" + box);
    await page.waitForTimeout(80);
    await shot("m04-skeleton", { full: false });
  }

  // Step 9: gift box shows source Hotel am See, change the place with a note, then accept.
  await open(box);
  const text = await main();
  check("source Hotel am See", text.includes("Hotel am See"));
  check("guest email shown", text.includes("anna.keller@example.com"));
  await shot(`m04-requested-${lang}-375`);
  await page.setViewportSize({ width: 1024, height: 800 });
  await shot(`m04-requested-${lang}-1024`);
  await page.setViewportSize({ width: 375, height: 812 });

  await page.getByRole("button", { name: T.change }).click();
  await page.waitForTimeout(400);
  await sheet().getByRole("radio", { name: T.bahnhof }).click({ force: true });
  await sheet().getByRole("button", { name: T.save }).click();
  await page.waitForTimeout(300);
  const noteError = await sheet().locator("[data-slot=field-error], .field-error, [class*=field-error]").first().innerText().catch(() => "");
  check("note required error", noteError.length > 0, JSON.stringify(noteError));
  await shot(`m04-change-note-required-${lang}`, { full: false });
  await sheet().getByRole("textbox").fill("Guest asked by email, hotel is near the station");
  await sheet().getByRole("button", { name: T.save }).click();
  await page.waitForTimeout(500);
  const afterChange = await main();
  const changeLine = afterChange.split("\n").find((l) => l.includes("Bahnhof") && (l.includes("changed") || l.includes("geändert")));
  check("log: place changed", !!changeLine, JSON.stringify(changeLine));
  const metaLine = afterChange.split("\n").find((l) => l.startsWith("Guest asked by email"));
  check("log meta: note · Lukas · time", !!metaLine && metaLine.includes("Lukas"), JSON.stringify(metaLine));
  check("still requested after change", (await state()).data.orders.find((o) => o.id === box).status === "requested");

  await page.getByRole("button", { name: T.accept, exact: true }).click();
  await page.waitForTimeout(500);
  const sentence = await sheet().innerText();
  log("accept sheet:", JSON.stringify(sentence));
  check("accept sentence values", ["20.10.2026", T.bahnhof, "26.70", "24", "14.10.2026, 10:3"].every((s) => sentence.includes(s)));
  await shot(`m04-accept-sheet-${lang}-375`, { full: false });
  await sheet().getByRole("button", { name: /26\.70/ }).click();
  await page.waitForTimeout(600);
  let s = await state();
  const boxOrder = s.data.orders.find((o) => o.id === box);
  check("gift box accepted", boxOrder.status === "accepted", boxOrder.status);
  const chips = await page.locator("main header").innerText();
  log("chips:", JSON.stringify(chips));
  await shot(`m04-accepted-${lang}-375`);
  await page.setViewportSize({ width: 1024, height: 800 });
  await shot(`m04-accepted-${lang}-1024`);
  await page.setViewportSize({ width: 375, height: 812 });

  // Step 10: accept the knife.
  await open(knife);
  await page.getByRole("button", { name: T.accept, exact: true }).click();
  await page.waitForTimeout(400);
  log("knife sheet:", JSON.stringify(await sheet().innerText()));
  await sheet().getByRole("button", { name: /54\.00/ }).click();
  await page.waitForTimeout(600);
  s = await state();
  check("knife accepted", s.data.orders.find((o) => o.id === knife).status === "accepted");
  const n04 = s.data.mail.filter((m) => m.template === "N04");
  check("two N04 to the guest", n04.length === 2 && n04.every((m) => m.to === "guest" && m.language === "en"), JSON.stringify(n04.map((m) => m.params)));

  // Last-item race: SK-1032 takes the print, SK-1033 stays awaiting and names the short line.
  await open("sk-1032");
  await page.getByRole("button", { name: T.accept, exact: true }).click();
  await page.waitForTimeout(400);
  await sheet().getByRole("button", { name: /119\.00/ }).click();
  await page.waitForTimeout(500);
  await open("sk-1033");
  const shortText = await main();
  check("short line shown before accept", /0 (available|verfügbar)/.test(shortText));
  const mailBefore = (await state()).data.mail.length;
  await page.getByRole("button", { name: T.accept, exact: true }).click();
  await page.waitForTimeout(400);
  const alert = await page.getByRole("alert").first().innerText().catch(() => "");
  log("race alert:", JSON.stringify(alert));
  check("race names the short line", alert.includes("Water Tower") && /0 (available|verfügbar)/.test(alert));
  s = await state();
  check("SK-1033 still requested, no mail", s.data.orders.find((o) => o.id === "sk-1033").status === "requested" && s.data.mail.length === mailBefore);
  await shot(`m04-stock-short-${lang}-375`);
  await page.setViewportSize({ width: 1024, height: 800 });
  await shot(`m04-stock-short-${lang}-1024`);
  await page.setViewportSize({ width: 375, height: 812 });

  // Decline path: SK-1031 (Tom).
  await open("sk-1031");
  await page.getByRole("button", { name: T.decline, exact: true }).click();
  await page.waitForTimeout(400);
  await sheet().getByRole("radio", { name: T.other }).click({ force: true });
  await sheet().getByRole("button", { name: T.declineOrder }).click();
  await page.waitForTimeout(300);
  check("other needs a message", (await sheet().innerText()).match(/Write the reason|Schreiben Sie den Grund/) !== null);
  await shot(`m04-decline-sheet-${lang}`, { full: false });
  await sheet().getByRole("radio", { name: T.date }).click({ force: true });
  await sheet().getByRole("textbox").fill("Sorry, we are fully booked that week.");
  await sheet().getByRole("button", { name: T.declineOrder }).click();
  await page.waitForTimeout(500);
  const dialog = page.getByRole("alertdialog");
  log("confirm dialog:", JSON.stringify(await dialog.innerText()));
  await shot(`m04-decline-confirm-${lang}`, { full: false });
  await dialog.getByRole("button", { name: T.declineOrder }).click();
  await page.waitForTimeout(600);
  s = await state();
  const tom = s.data.orders.find((o) => o.id === "sk-1031");
  check("SK-1031 declined", tom.status === "declined");
  const n06 = s.data.mail.filter((m) => m.template === "N06");
  check("N06 reason in the guest's language (en)", n06.length === 1 && n06[0].params.reason === "We can’t prepare it for the requested date. Sorry, we are fully booked that week.", JSON.stringify(n06[0]?.params));
  await shot(`m04-declined-${lang}-375`);

  // Mail panel shows the guest emails of this run.
  await page.getByRole("button", { name: /Mail/ }).first().click().catch(() => {});
  await page.waitForTimeout(500);
  await shot(`mail-panel-${lang}`, { full: false });
  await page.keyboard.press("Escape");

  if (lang === "de") {
    const body = await page.locator("body").innerText();
    check("no raw i18n keys", !/merchantOrder\./.test(body));
  }
}

// Keyboard: Tab reaches Accept, Enter opens the sheet, Escape closes it with focus back.
await setup("en");
await open("sk-1031");
let reached = false;
for (let i = 0; i < 40; i++) {
  await page.keyboard.press("Tab");
  const name = await page.evaluate(() => document.activeElement?.textContent?.trim());
  if (name === "Accept") { reached = true; break; }
}
check("Tab reaches Accept", reached);
await page.keyboard.press("Enter");
await page.waitForTimeout(500);
check("Enter opens accept sheet", await sheet().isVisible());
await page.keyboard.press("Escape");
await page.waitForTimeout(500);
check("Escape closes, focus back on Accept", (await page.evaluate(() => document.activeElement?.textContent?.trim())) === "Accept");

// Unknown order and the read-only view of a past order.
await open("sk-9999");
await shot("m04-not-found");
await open("sk-1017");
await shot("m04-completed-en-375");

log(failures ? `\n${failures} FAILED` : "\nALL CHECKS PASSED");
await browser.close();
