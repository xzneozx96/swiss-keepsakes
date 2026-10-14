// Step 1.5d verification: C04 flat cart with selection, info Alert, QuantityBox, C06 from the
// ticked lines only, Send keeps the unticked line. Run: node 1.5d-drive.mjs <outdir> <en|de>
// against vite --port 5199, with playwright-core resolvable (NODE_PATH or a local node_modules).
import { chromium } from "playwright-core";
import { readdirSync } from "node:fs";

const home = process.env.HOME + "/.cache/ms-playwright/";
const dir = readdirSync(home).filter((d) => d.startsWith("chromium_headless_shell-")).sort().pop();
const exe = `${home}${dir}/chrome-headless-shell-linux64/chrome-headless-shell`;
const OUT = process.argv[2];
const L = process.argv[3] ?? "en";
const BASE = "http://localhost:5199/";
const de = L === "de";
const T = {
  continue: de ? "Weiter" : "Continue",
  selectAll: de ? "Alle auswählen" : "Select all",
  send: de ? "Anfrage senden · noch keine Zahlung" : "Send request · no payment yet",
  emailCode: de ? "Code per E-Mail senden" : "Email me a code",
  removeConfirm: de ? "Aus dem Warenkorb entfernen" : "Remove from cart",
  cancel: de ? "Abbrechen" : "Cancel",
  knife: de ? /Taschenmesser/ : /pocket knife/,
  box: de ? /Geschenkbox|Geschenkset|gift box/i : /gift box/i,
  choc: de ? /Schokoladenset/ : /Chocolate set/,
};

const browser = await chromium.launch({ executablePath: exe });
const page = await browser.newPage({ viewport: { width: 375, height: 812 }, deviceScaleFactor: 2 });
const log = (...a) => console.log(...a);
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
const bar = page.getByRole("region", { name: "Prototype controls" });

const check = (name) =>
  page.evaluate(() => ({
    overflow: document.documentElement.scrollWidth - window.innerWidth,
    rawKeys: (document.body.innerText.match(/\b(checkout|cart|auth|detail)\.[a-zA-Z.]+/g) || []).join(","),
    eszett: document.body.innerText.includes("ß"),
  })).then((r) => log(name, JSON.stringify(r)));
const shot = async (name, full = true) => {
  await page.waitForTimeout(500);
  await check(name);
  if (full) {
    const h = await page.evaluate(() => document.documentElement.scrollHeight);
    await page.setViewportSize({ width: 375, height: h });
    await page.waitForTimeout(200);
  }
  await page.screenshot({ path: `${OUT}/${name}-${L}.png` });
  if (full) await page.setViewportSize({ width: 375, height: 812 });
};
const demo = () => page.evaluate(() => JSON.parse(localStorage.getItem("sk.demo")));
const selection = async () =>
  (await demo()).data.cart.map((l) => `${l.productId}:${l.selected ? "on" : "off"}`).join(" ");
const mainText = async () => (await page.locator("main").innerText()).replace(/\n+/g, " | ");
const barText = async () =>
  (await page.locator("div.fixed.bottom-0").last().innerText()).replace(/\n+/g, " | ");
// Toggle through the keyboard (Space on the focused checkbox): the input is visually hidden.
const setCheck = async (loc, on) => {
  if ((await loc.isChecked()) === on) return;
  await loc.focus();
  await page.keyboard.press("Space");
  await page.waitForTimeout(150);
};
const lineCheck = (re) => page.getByRole("checkbox", { name: re });
const slip = (re) => page.locator("li").filter({ has: page.getByRole("checkbox", { name: re }) });
const focused = () =>
  page.evaluate(() => {
    const a = document.activeElement;
    return `${a?.tagName} ${a?.getAttribute("aria-label") ?? ""} ${(a?.textContent ?? "").slice(0, 40)}`.trim();
  });

async function addGift(slug, variant, engraving, day, place) {
  await page.goto(BASE + "#/gifts/" + slug);
  await page.waitForTimeout(900);
  await page.getByRole("button", { name: /^Add to cart$/ }).last().click();
  const sheet = page.getByRole("dialog");
  await sheet.waitFor();
  if (variant) await sheet.getByRole("row", { name: new RegExp(variant) }).click();
  if (engraving) await sheet.getByLabel(/Engraving/).first().fill(engraving);
  await sheet.getByRole("gridcell").filter({ hasText: new RegExp(`^${day}$`) }).first().click();
  await sheet.getByRole("radio", { name: new RegExp(place) }).check({ force: true });
  await sheet.getByRole("button", { name: /Add to cart ·/ }).click();
  await page.waitForTimeout(1200);
  const badge = await page
    .getByRole("link", { name: /cart/i })
    .first()
    .innerText()
    .catch(() => "?");
  log(`added ${slug}: selection now [${await selection()}], cart button text "${badge.replace(/\n/g, " ")}"`);
}

// --- Three gifts added on C03 (EN), none ticked ---
await page.goto(BASE);
await page.evaluate(() => localStorage.clear());
await page.reload();
await page.waitForTimeout(600);
await addGift("kapellbruecke-pocket-knife", "Medium", "Anna", 21, "Shop Altstadt");
await addGift("lucerne-gift-box", null, null, 20, "Shop Altstadt");
await addGift("chocolate-set", null, null, 20, "Pickup point Bahnhof");

await page.goto(BASE + "#/cart");
await page.waitForTimeout(900);
// Close C03's "Added to cart" toast (1.4b, 6 s) so it does not cover the screenshots.
await page.locator('[data-slot="toast"] button, [role="alertdialog"] button').last().click().catch(() => {});
await page.waitForTimeout(5500);
if (de) {
  await bar.getByRole("button", { name: "DE", exact: true }).click();
  await page.waitForTimeout(400);
}
log("C04 none ticked:", await mainText());
log("bar:", await barText());
log("checkbox names:", (await page.getByRole("checkbox").evaluateAll((els) =>
  els.map((e) => `${e.getAttribute("aria-label") ?? e.closest("label")?.textContent}=${e.checked}`))).join(" ; "));
const alert = page.locator('[role="alert"], [data-slot="alert-root"], .alert').first();
log("info alert:", (await alert.innerText().catch(() => "none")).replace(/\n+/g, " | "));
log("info alert title colour:", await page.locator('[data-slot="alert-title"]').first()
  .evaluate((e) => getComputedStyle(e).color).catch(() => "?"));
await shot("cart-none");
await page.locator('[data-slot="alert-root"], .alert').first().screenshot({ path: `${OUT}/info-alert-${L}.png` }).catch(() => log("alert shot failed"));

// --- Continue with nothing ticked explains and focuses Select all ---
await page.getByRole("button", { name: T.continue, exact: true }).click();
await page.waitForTimeout(600);
log("continue nothing:", await barText(), "| url:", page.url(), "| focus:", await focused());
await shot("continue-nothing", false);

// --- Tick knife and gift box ---
await setCheck(lineCheck(T.knife), true);
await setCheck(lineCheck(T.box), true);
await page.waitForTimeout(400);
log("ticked 2:", await barText(), "| store:", await selection());
log("select-all state:", await page.getByRole("checkbox", { name: T.selectAll }).evaluate((e) => `${e.checked}/${e.indeterminate}`).catch(() => "?"));
await shot("some-selected");

// --- Select all, then untick the chocolate again ---
await setCheck(page.getByRole("checkbox", { name: T.selectAll }), true);
await page.waitForTimeout(400);
log("select all:", await barText(), "| store:", await selection());
await shot("select-all");
await setCheck(page.getByRole("checkbox", { name: T.selectAll }), false);
await page.waitForTimeout(300);
log("unselect all:", await barText(), "| store:", await selection());
await setCheck(lineCheck(T.knife), true);
await setCheck(lineCheck(T.box), true);

// --- QuantityBox on the chocolate line: keyboard arrows, buttons, cleared input ---
const choc = slip(T.choc);
const input = choc.locator('[data-slot="number-field-input"], input[inputmode]').first();
await input.focus();
await page.keyboard.press("ArrowUp");
await page.waitForTimeout(200);
log("ArrowUp:", await input.inputValue());
await page.keyboard.press("ArrowUp");
await page.waitForTimeout(200);
log("ArrowUp x2:", await input.inputValue(), "| line:", (await choc.innerText()).replace(/\n+/g, " | "));
await shot("quantity", false);
await page.keyboard.press("ArrowDown");
await page.keyboard.press("ArrowDown");
await page.keyboard.press("ArrowDown");
await page.waitForTimeout(200);
log("ArrowDown x3 (min 1):", await input.inputValue());
const plus = choc.locator('[data-slot="number-field-increment-button"]');
log("+ aria:", await plus.getAttribute("aria-label"));
await plus.click();
await page.waitForTimeout(200);
log("+ button:", await input.inputValue());
await input.fill("");
await input.blur();
await page.waitForTimeout(300);
log("cleared input -> ", await input.inputValue(), "| store qty:", (await demo()).data.cart.find((l) => l.productId === "p-chocolate").quantity);

// --- Reload keeps the ticks (coordinator option A) ---
await page.reload();
await page.waitForTimeout(1200);
log("after reload store:", await selection(), "| bar:", await barText());

// --- Invalid date: ticked knife made too early; Continue explains and focuses the fix ---
await bar.getByRole("button").first().click();
await page.getByRole("button", { name: "Make a cart date too early" }).click();
await page.waitForTimeout(900);
await page.keyboard.press("Escape").catch(() => {});
await page.waitForTimeout(300);
await page.getByRole("button", { name: T.continue, exact: true }).click();
await page.waitForTimeout(700);
log("continue invalid:", await barText(), "| focus:", await focused(), "| url:", page.url());
await shot("continue-invalid");
// An unticked invalid line does not block: untick the knife, Continue opens sign-in.
await setCheck(lineCheck(T.knife), false);
await page.waitForTimeout(300);
log("unticked invalid knife, bar:", await barText());
await setCheck(lineCheck(T.knife), true);
await page.locator("[data-date-fix]").first().click();
await page.waitForTimeout(500);
log("after fix:", (await slip(T.knife).innerText()).replace(/\n+/g, " | "), "| store:", await selection());

// --- Remove confirm still works (cancel keeps the line) ---
await choc.getByRole("button", { name: /Remove|entfernen/ }).click();
await page.waitForSelector('[role="alertdialog"]');
await page.waitForTimeout(400);
log("remove dialog:", (await page.getByRole("alertdialog").innerText()).replace(/\n+/g, " | "));
await shot("remove-confirm", false);
await page.getByRole("button", { name: T.cancel, exact: true }).click();
await page.waitForTimeout(400);
log("after cancel lines:", await page.locator("ul > li").count());

// --- Continue → sign in (C05) → C06 with the ticked lines only ---
await page.getByRole("button", { name: T.continue, exact: true }).click();
await page.waitForTimeout(700);
await page.getByRole("button", { name: T.emailCode }).click();
await page.waitForTimeout(400);
await page.locator("#sign-in-code").focus();
await page.keyboard.type("123456");
await page.waitForTimeout(1500);
log("after sign-in url:", page.url());
log("C06:", await mainText());
await shot("review");

await page.getByRole("button", { name: T.send }).click();
await page.waitForTimeout(1200);
const after = await demo();
log("after send url:", page.url());
log("orders created:", after.data.orders.slice(-2).map((o) => `${o.ref}:${o.lines.map((l) => l.productId).join("+")}:${o.paymentPolicy.kind}`).join(" ; "));
log("cart after send:", after.data.cart.map((l) => `${l.productId}:${l.selected ? "on" : "off"}`).join(" "));

await page.goto(BASE + "#/cart");
await page.waitForTimeout(1000);
log("C04 after send:", await mainText(), "| bar:", await barText());
await shot("after-send");

// --- Remove the remaining line through the dialog: empty state ---
await page.getByRole("button", { name: /Remove|entfernen/ }).first().click();
await page.waitForSelector('[role="alertdialog"]');
await page.getByRole("button", { name: T.removeConfirm }).click();
await page.waitForTimeout(800);
log("after confirm remove:", await mainText(), "| focus:", await focused());
await shot("empty");

log("errors:", errors.length ? errors.join("\n") : "none");
await browser.close();
