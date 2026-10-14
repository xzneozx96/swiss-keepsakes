// Review round 3: capture C15 guest order detail (item 1.13) after 1.13s and 1.13t.
// Starts from the prototype bar's Reset demo; uses only the 1.13r prototype controls
// (Add sample orders in every state, Expire this order's payment deadline) plus normal guest UI.
// Run: PW=<path to playwright-core> node review-round3-c15-capture.mjs   (Vite on 5222)
import { readdirSync, writeFileSync } from "node:fs";
const { chromium } = await import(process.env.PW ?? "playwright-core");

const ROOT = "/home/ross-geller/Projects/minastik/swiss-keepsakes/";
const REVIEW = ROOT + "docs/ux/prototype/screens/phase1-review/";
const BASE = "http://localhost:5222/";

const home = process.env.HOME + "/.cache/ms-playwright/";
const dir = readdirSync(home).filter((d) => d.startsWith("chromium_headless_shell-")).sort().pop();
const browser = await chromium.launch({ executablePath: `${home}${dir}/chrome-headless-shell-linux64/chrome-headless-shell` });
const ctx = await browser.newContext({ viewport: { width: 375, height: 812 }, deviceScaleFactor: 2 });
const page = await ctx.newPage();
const log = (...a) => console.log(...a);
let pass = 0, fail = 0;
const check = (name, ok, extra = "") => { ok ? pass++ : fail++; log(ok ? "PASS" : "FAIL", name, ok ? "" : extra); };
page.on("pageerror", (e) => log("PAGEERROR", e.message));
page.on("console", (m) => m.type() === "error" && log("CONSOLE", m.text().slice(0, 300)));

const wait = (ms) => page.waitForTimeout(ms);
const norm = (s) => s.replace(/[  ]/g, " ").replace(/\s+/g, " ");
const mainText = async () => norm(await page.locator("main").innerText());
const bar = page.getByRole("region", { name: "Prototype controls" });
const openBar = async () => { await bar.getByRole("button").first().click(); await page.getByRole("dialog").waitFor(); await wait(400); };
const closeBar = async () => { await page.keyboard.press("Escape"); await wait(400); };
let lang = "en";
const setLang = async (l) => {
  lang = l;
  await page.getByRole("group", { name: "Language" }).getByRole("button", { name: l.toUpperCase(), exact: true }).click();
  await wait(400);
};
const open = async (id) => { await page.goto(BASE + `#/account/orders/${id}`); await wait(1000); };
const TABS = { en: { payments: "Payments", timeline: "Progress", policy: "Policy" }, de: { payments: "Zahlungen", timeline: "Verlauf", policy: "Bedingungen" } };
const tab = async (id) => { await page.getByRole("tab", { name: TABS[lang][id] }).click(); await wait(400); };

const manifest = [];
const shot = async (nn, state, caption, expect) => {
  const text = await mainText();
  for (const s of expect) check(`${nn}-${state}-${lang}: shows "${s}"`, text.includes(s), text.slice(0, 400));
  if (lang === "de") check(`${nn}-${state}-de: no raw keys`, !/\b(guestOrder|review|orders)\.[a-z]\w*/.test(text));
  check(`${nn}-${state}-${lang}: no horizontal overflow`, await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
  // Capture hygiene: no leftover toast, focus ring or hover from earlier steps.
  for (const b of await page.locator(".toast__close-button").all()) await b.click({ force: true }).catch(() => {});
  await page.evaluate(() => document.activeElement?.blur());
  await page.mouse.move(0, 400);
  await wait(500);
  const h = await page.evaluate(() => document.documentElement.scrollHeight);
  await page.setViewportSize({ width: 375, height: Math.max(812, h) });
  await wait(300);
  const file = `img/1.13-r3-${nn}-c15-${state}-${lang}-375.png`;
  await page.screenshot({ path: REVIEW + file });
  await page.setViewportSize({ width: 375, height: 812 });
  manifest.push({ item: "1.13", file, caption, lang, width: 375 });
  log("SHOT", file);
};

// ---------- Reset, sign in as the guest, add the sample orders
await page.goto(BASE);
await wait(1000);
await openBar();
await page.getByRole("button", { name: "Reset demo" }).click();
await wait(1000);
await page.goto(BASE + "#/account");
await wait(1000);
const signIn = page.getByRole("button", { name: "Sign in", exact: true });
if (await signIn.count()) {
  await signIn.click();
  await page.getByRole("button", { name: /Continue with Google/ }).click();
  await wait(1500);
}
await open("sk-1012");
await openBar();
await page.getByRole("button", { name: "Add sample orders in every state" }).click();
await wait(1200);
await closeBar();

// ---------- Header and tabs on the accepted, payment-due order
await open("sk-1044");
await shot("01", "payment-due", "C15 Order detail, accepted and payment due: pickup-ticket header with the auto-cancel warning, Pay and Cancel, Overview tab",
  ["Order SK-1044", "Pay to keep this order", "the order is cancelled automatically", "Still to pay"]);
await setLang("de");
await shot("01", "payment-due", "C15 Order detail, accepted and payment due: pickup-ticket header with the auto-cancel warning, Pay and Cancel, Overview tab",
  ["SK-1044", "Übersicht"]);
await setLang("en");
await open("sk-1044");
await tab("payments");
await shot("02", "tab-payments", "C15 Order detail, payment due: Payments tab (payment label, amounts, no payments yet)", ["No payments yet."]);
await tab("timeline");
await shot("03", "tab-progress", "C15 Order detail, payment due: Progress tab (stepper with logged and upcoming steps)", ["Order SK-1044"]);
await tab("policy");
await shot("04", "tab-policy", "C15 Order detail, payment due: Policy tab (policy at the time of ordering, contact with the reference)",
  ["Policy at the time of ordering", "SK-1044"]);

// ---------- Key states
await open("sk-1046");
await shot("05", "preparing", "C15 Order detail, paid: confirmed and being prepared", ["The shop is preparing your gifts"]);
await open("sk-1048");
await shot("06", "handed-over-balance", "C15 Order detail, handed over with a balance still to pay: Pay the rest", ["Pay the rest online or at the shop"]);
await tab("payments");
await shot("07", "handed-over-payments", "C15 Order detail, handed over with a balance: Payments tab with the deposit received", ["Order SK-1048"]);

await open("sk-1012");
await shot("08", "completed", "C15 Order detail, completed: Write a review in the header", ["Write a review"]);
await page.getByRole("button", { name: "Write a review" }).click();
await page.getByRole("dialog").waitFor();
await wait(400);
await page.getByRole("dialog").getByText("5 out of 5 stars").click({ force: true });
await page.getByRole("dialog").getByRole("textbox").fill("Lovely chocolates, and the pickup at the counter took a minute.");
await page.getByRole("dialog").getByRole("button", { name: "Post review" }).click();
await wait(1200);
await open("sk-1012");
await shot("09", "completed-reviewed", "C15 Order detail, completed after posting a review: the posted review as a borderless inset in the header (1.13t)",
  ["Lovely chocolates"]);

await open("sk-1015");
await shot("10", "declined", "C15 Order detail, declined by the seller: Nothing was charged, with the seller's reason (seed order)", ["Nothing was charged"]);

await open("sk-1044");
await openBar();
await page.getByRole("button", { name: "Expire this order’s payment deadline" }).click();
await wait(800);
await closeBar();
await open("sk-1044");
await shot("11", "cancelled-overdue", "C15 Order detail, cancelled because the payment was overdue: Request again (prototype control Expire deadline)",
  ["The payment deadline passed", "Request again"]);

await open("sk-1049");
await shot("12", "payment-processing", "C15 Order detail, payment processing: Please don’t pay again, no Pay button (sample order)", ["Please don’t pay again"]);
check("12: no Pay link while processing", (await page.locator("main a[href$='/pay']").count()) === 0);

writeFileSync(REVIEW + "manifest-guest.json", JSON.stringify(manifest, null, 1) + "\n");
log(`\n${manifest.length} shots, ${pass} PASS, ${fail} FAIL`);
await browser.close();
process.exit(fail ? 1 : 0);
