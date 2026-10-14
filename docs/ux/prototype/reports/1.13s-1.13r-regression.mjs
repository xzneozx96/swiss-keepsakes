// Step 1.13r verification: C15 Guest order detail (tabbed redesign), every state in EN and DE at 375px.
// Usage: node 1.13r-drive.mjs <screens dir>   (Vite on port 5224; run from front-end/ so playwright-core resolves)
import { chromium } from "playwright-core";
import { readdirSync } from "node:fs";
const home = process.env.HOME + "/.cache/ms-playwright/";
const dir = readdirSync(home).filter((d) => d.startsWith("chromium_headless_shell-")).sort().pop();
const exe = `${home}${dir}/chrome-headless-shell-linux64/chrome-headless-shell`;
const OUT = process.argv[2];
const BASE = "http://localhost:5224/";
const browser = await chromium.launch({ executablePath: exe });
const context = await browser.newContext({ viewport: { width: 375, height: 812 }, deviceScaleFactor: 2 });
await context.grantPermissions(["clipboard-read", "clipboard-write"], { origin: "http://localhost:5224" });
const page = await context.newPage();
const log = (...a) => console.log(...a);
let pass = 0, fail = 0;
const check = (name, ok, extra = "") => { ok ? pass++ : fail++; log(ok ? "PASS" : "FAIL", name, ok ? "" : extra); };
page.on("console", (m) => { if (m.type() === "error") log("CONSOLE", m.text()); });
page.on("pageerror", (e) => log("PAGEERROR", e.message));
const overflow = () => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
const mainText = async () => (await page.locator("main").innerText()).replace(/\n+/g, " | ").replace(/[\u00a0\u202f]/g, " ");
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
  LANG = id;
  await page.getByRole("group", { name: "Language" }).getByRole("button", { name: id }).click();
  await page.waitForTimeout(300);
};
const openControls = async () => {
  await page.getByRole("region", { name: "Prototype controls" }).getByRole("button").first().click();
  await page.getByRole("dialog").waitFor();
  await page.waitForTimeout(300);
};
const open = async (id) => {
  await page.goto(BASE + `#/account/orders/${id}`);
  await page.waitForTimeout(800);
  return mainText();
};
const payLink = () => page.locator("main a[href$='/pay']");
const TABS = { EN: { overview: "Overview", payments: "Payments", timeline: "Progress", policy: "Policy" }, DE: { overview: "Übersicht", payments: "Zahlungen", timeline: "Verlauf", policy: "Bedingungen" } };
let LANG = "EN";
const tab = async (id) => { await page.getByRole("tab", { name: TABS[LANG][id] }).click(); await page.waitForTimeout(250); return mainText(); };

// --- setup: sign in, add the sample orders --------------------------------------------
await page.goto(BASE);
await page.evaluate(() => localStorage.clear());

// Signed out: C15 asks to sign in.
let text = await open("sk-1012");
check("signed out → sign-in prompt", /Sign in/.test(text), text);
await shot("signed-out-en", false);

await page.goto(BASE + "#/account");
await page.waitForTimeout(800);
await page.getByRole("button", { name: "Sign in", exact: true }).click();
await page.getByRole("button", { name: /Continue with Google/ }).click();
await page.waitForTimeout(1500);

// C14 row is a typed link into C15 now.
await page.goto(BASE + "#/account/orders/sk-1015"); // 1.13s: C14 rows moved off #/account since 1.13r
await page.waitForTimeout(150);
await page.screenshot({ path: `${OUT}/skeleton-en.png` });
await page.waitForTimeout(800);
check("C14 row opens C15", page.url().endsWith("#/account/orders/sk-1015") && (await mainText()).includes("Order SK-1015"), page.url());

await openControls();
await page.getByRole("button", { name: "Add sample orders in every state" }).click();
await page.waitForTimeout(1200);
text = await mainText();
check("sample orders listed on C14", ["SK-1043", "SK-1050"].every((r) => text.includes(r)), text);


// ref → state: header strings (always visible), then strings per tab; EN and DE.
const states = [
  ["requested", "sk-1043",
    { head: ["Awaiting seller confirmation", "Nothing to pay yet", "Your request is with the seller", "Requested pickup"], timeline: ["Seller confirms", "You pay, then the shop prepares your gifts"] },
    { head: ["Wartet auf Bestätigung", "Ihre Anfrage liegt beim Verkäufer", "Angefragte Abholung"] }, { pay: false, cancel: false }],
  ["accepted", "sk-1044",
    { head: ["Accepted, payment due", "Pay to keep this order", "the order is cancelled automatically", "Confirmed pickup"], overview: ["Engraving “Anna”", "Still to pay"], payments: ["No payments yet."], policy: ["Policy at the time of ordering", "SK-1044"] },
    { head: ["Angenommen, Zahlung fällig", "automatisch storniert"], overview: ["Gravur «Anna»"], payments: ["Noch keine Zahlungen."], policy: ["Bedingungen zum Zeitpunkt der Bestellung"] }, { pay: true, cancel: true }],
  ["accepted-changed-place", "sk-1045",
    { head: ["The shop moved your pickup from Shop Altstadt to Pickup point Bahnhof", "cancel free of charge"], timeline: ["Shop changed the pickup place to Pickup point Bahnhof"] },
    { head: ["kostenlos stornieren"] }, { pay: true, cancel: true }],
  ["preparing", "sk-1046",
    { head: ["Confirmed, being prepared", "Paid in full · CHF 49.00", "The shop is preparing your gifts"], payments: ["Received"] },
    { head: ["Bestätigt, in Vorbereitung", "Vollständig bezahlt"], payments: ["Eingegangen"] }, { pay: false, cancel: false }],
  ["ready", "sk-1047",
    { head: ["Ready for pickup at Shop Altstadt", "Pay later · CHF 24.00"] },
    { head: ["Abholbereit in Laden Altstadt", "Später bezahlen"] }, { pay: true, cancel: false }],
  ["handed-over-balance", "sk-1048",
    { head: ["Handed over", "Deposit paid · CHF 26.70 · CHF 62.30 left", "Pay the rest online or at the shop"], payments: ["CHF 26.70", "Received"], timeline: ["Handed over"] },
    { head: ["Übergeben", "Den Rest online oder im Laden bezahlen"], payments: ["Eingegangen"] }, { pay: true, cancel: false }],
  ["payment-processing", "sk-1049",
    { head: ["Payment processing", "Please don’t pay again"], payments: ["Processing"] },
    { head: ["Zahlung in Bearbeitung", "Bitte nicht noch einmal bezahlen"], payments: ["In Bearbeitung"] }, { pay: false, cancel: false }],
  ["received-after-cancellation", "sk-1050",
    { head: ["Cancelled · payment overdue", "The payment deadline passed", "arrived after the order was cancelled"], payments: ["Received after cancellation · awaiting reconciliation"] },
    { head: ["Die Zahlungsfrist ist abgelaufen", "nach der Stornierung eingegangen"], payments: ["Nach Stornierung eingegangen"] }, { pay: false, cancel: false }],
  ["completed", "sk-1012",
    { head: ["Completed", "Paid in full · CHF 48.00", "Picked up and paid. Thank you!", "Write a review"], payments: ["Cash"] },
    { head: ["Abgeschlossen", "Bewertung schreiben"], payments: ["Bar"] }, { pay: false, cancel: false }],
  ["declined", "sk-1015",
    { head: ["Declined by seller", "Nothing was charged", "The last print is already promised to another guest."], timeline: ["Declined by the seller"] },
    { head: ["Vom Verkäufer abgelehnt", "Es wurde nichts belastet"], policy: ["Text auf Englisch"] }, { pay: false, cancel: false }],
];

for (const lang of ["EN", "DE"]) {
  await setLang(lang);
  for (const [name, id, en, de, act] of states) {
    text = await open(id);
    const want = lang === "EN" ? en : de;
    check(`${name} ${lang}: opens on Overview`, (await page.getByRole("tab", { selected: true }).innerText()).trim() === TABS[lang].overview);
    for (const s of want.head) check(`${name} ${lang}: header "${s}"`, text.includes(s), text);
    check(`${name} ${lang}: Pay ${act.pay ? "shown" : "hidden"}`, ((await payLink().count()) > 0) === act.pay);
    const cancelName = lang === "EN" ? "Cancel order" : "Bestellung stornieren";
    check(`${name} ${lang}: Cancel ${act.cancel ? "shown" : "hidden"}`, ((await page.getByRole("button", { name: cancelName }).count()) > 0) === act.cancel);
    await shot(`${name}-${lang.toLowerCase()}`);
    for (const t of ["overview", "payments", "timeline", "policy"]) {
      text = await tab(t);
      for (const s of want[t] ?? []) check(`${name} ${lang} [${t}]: "${s}"`, text.includes(s), text);
      if (lang === "DE") check(`${name} DE [${t}]: no raw keys`, !/guestOrder\.|order\.(status|payment)\.|detail\./.test(text), text);
      if (["accepted", "handed-over-balance"].includes(name) && t !== "overview") await shot(`${name}-${t}-${lang.toLowerCase()}`);
    }
  }
}

// DE tab labels fit: no tab is clipped and the tab list does not scroll sideways.
await setLang("DE");
await open("sk-1044");
const tabFit = await page.evaluate(() => {
  const tabs = [...document.querySelectorAll('[role="tab"]')];
  const scrollers = [...document.querySelectorAll(".tabs__list-container *")].filter((el) => el.scrollWidth > el.clientWidth + 1).length;
  return { left: tabs[0].getBoundingClientRect().left, right: tabs.at(-1).getBoundingClientRect().right, clipped: tabs.filter((t) => t.scrollWidth > t.clientWidth + 1).length, scrollers, height: tabs[0].getBoundingClientRect().height };
});
check("DE tabs fit at 375px", tabFit.left >= 0 && tabFit.right <= 375 && tabFit.clipped === 0 && tabFit.scrollers === 0, JSON.stringify(tabFit));
check("tabs are 44px touch targets", tabFit.height >= 44, JSON.stringify(tabFit));
await setLang("EN");

// Tab is in the URL: a reload keeps it; the C14 link (no tab) opens on Overview.
await open("sk-1044");
await tab("payments");
check("tab in URL", page.url().endsWith("#/account/orders/sk-1044?tab=payments"), page.url());
await page.reload();
await page.waitForTimeout(900);
check("reload keeps the tab", (await page.getByRole("tab", { selected: true }).innerText()).trim() === "Payments");

// Sticky header and tabs while scrolled.
await open("sk-1048");
await page.evaluate(() => window.scrollTo(0, 600));
await page.waitForTimeout(300);
const stick = await page.evaluate(() => ({ header: document.querySelector("main header").getBoundingClientRect().top, tabs: document.querySelector('[role="tablist"]').getBoundingClientRect().top }));
check("header and tabs stay visible when scrolled", stick.header >= 0 && stick.tabs >= 50 && stick.tabs < 140, JSON.stringify(stick));
await page.screenshot({ path: `${OUT}/sticky-tabs-en.png` });

// Keyboard: arrow keys move between tabs.
await open("sk-1044");
await page.getByRole("tab", { name: "Overview" }).focus();
await page.keyboard.press("ArrowRight");
await page.waitForTimeout(250);
check("ArrowRight selects Payments", (await page.getByRole("tab", { selected: true }).innerText()).trim() === "Payments");

// Pay: deadline in the header, Tab reaches Pay, Pay opens C12.
await open("sk-1044");
text = await mainText();
check("deadline formatted dd.mm.yyyy, hh:mm in the header chip", /Payment due · CHF 54\.00 by \d\d\.\d\d\.2026, \d\d:\d\d/.test(text), text);
check("deadline shown once in the header", (text.match(/\d\d\.\d\d\.2026, \d\d:\d\d/g) ?? []).length === 1, text);
check("Pay button names the amount", (await payLink().innerText()).replace(/[\u00a0\u202f]/g, " ").includes("Pay CHF 54.00"));
let focused = "";
for (let i = 0; i < 20 && !focused.endsWith("/pay"); i++) {
  await page.keyboard.press("Tab");
  focused = await page.evaluate(() => document.activeElement?.getAttribute("href") ?? "");
}
check("Pay reachable by keyboard", focused.endsWith("/pay"), focused);
await shot("focus-pay-en", false);
await page.keyboard.press("Enter");
await page.waitForTimeout(1200);
check("Pay opens C12", page.url().endsWith("#/account/orders/sk-1044/pay"), page.url());
await page.screenshot({ path: `${OUT}/pay-c12-en.png` });

// Copy the order reference (Policy tab).
await open("sk-1044");
await tab("policy");
await page.getByRole("button", { name: "Copy" }).click();
await page.waitForTimeout(300);
check("copy feedback", (await mainText()).includes("Copied"));
check("clipboard holds the reference", (await page.evaluate(() => navigator.clipboard.readText())) === "SK-1044");
await shot("policy-copied-en", false);

// R04 note with "Show proposals" on.
await openControls();
await page.getByRole("switch", { name: /Show proposals/ }).click({ force: true });
await page.keyboard.press("Escape");
await page.waitForTimeout(300);
await open("sk-1045");
check("R04 note marked as a proposal", (await page.locator("main").innerText()).includes("R04 free cancel"));
await shot("accepted-changed-place-proposal-en", false);
await openControls();
await page.getByRole("switch", { name: /Show proposals/ }).click({ force: true });
await page.keyboard.press("Escape");
await page.waitForTimeout(300);

// Guest cancels (confirm dialog), on the R04 order; focus lands on the new headline.
await open("sk-1045");
await page.getByRole("button", { name: "Cancel order" }).click();
await page.waitForTimeout(400);
check("confirm dialog", (await page.getByRole("alertdialog").innerText()).includes("Cancel order SK-1045?"));
await page.screenshot({ path: `${OUT}/cancel-confirm-en.png` });
await page.getByRole("button", { name: "Keep order" }).click();
await page.waitForTimeout(300);
check("Keep order leaves it accepted", (await mainText()).includes("Accepted, payment due"));
await page.getByRole("button", { name: "Cancel order" }).click();
await page.waitForTimeout(300);
await page.getByRole("alertdialog").getByRole("button", { name: "Cancel order" }).click();
await page.waitForTimeout(700);
text = await mainText();
check("cancelled by you", text.includes("Cancelled by you") && text.includes("Nothing paid") && text.includes("Nothing to refund"), text);
check("cancelled by you: no Pay", (await payLink().count()) === 0);
check("focus moves to the headline", (await page.evaluate(() => document.activeElement?.id)) === "order-headline");
await shot("cancelled-by-guest-en");
await setLang("DE");
check("cancelled by you DE", (await mainText()).includes("Von Ihnen storniert"));
await shot("cancelled-by-guest-de");
await setLang("EN");

// Expire the knife's payment deadline (prototype bar) → overdue cancel.
await open("sk-1044");
await openControls();
const expire = page.getByRole("button", { name: "Expire this order’s payment deadline" });
check("expire enabled on an accepted unpaid order", await expire.isEnabled());
await page.screenshot({ path: `${OUT}/prototype-control-en.png` });
await expire.click();
await page.waitForTimeout(600);
text = await mainText();
check("overdue cancel", text.includes("Cancelled · payment overdue") && text.includes("The payment deadline passed"), text);
check("overdue: old Pay gone", (await payLink().count()) === 0);
check("overdue: Request again shown", (await page.getByRole("button", { name: "Request again" }).count()) === 1);
await shot("cancelled-overdue-en");
await setLang("DE");
check("overdue DE", (await mainText()).includes("Storniert · Zahlung überfällig"));
await shot("cancelled-overdue-de");
await setLang("EN");
await openControls();
check("expire disabled once cancelled", !(await expire.isEnabled()));
await page.keyboard.press("Escape");
await page.waitForTimeout(300);

const mail = await page.evaluate(() => JSON.parse(localStorage.getItem("sk.demo")).data.mail.map((m) => `${m.template}→${m.to}:${m.orderId}`));
check("N23 to guest and staff", mail.includes("N23→guest:sk-1044") && mail.includes("N23→staff:sk-1044"), mail.join(","));

// Write a review sheet opens from the header (completed order).
await open("sk-1012");
await page.getByRole("button", { name: "Write a review" }).click();
await page.waitForTimeout(600);
check("review sheet opens", (await page.getByRole("dialog").count()) > 0);
await page.screenshot({ path: `${OUT}/review-sheet-en.png` });
await page.keyboard.press("Escape");
await page.waitForTimeout(300);

// Request again → items back in the cart with the old date and place.
await open("sk-1044");
await page.getByRole("button", { name: "Request again" }).click();
await page.waitForTimeout(900);
check("Request again opens the cart", page.url().endsWith("#/cart"), page.url());
const cart = await page.evaluate(() => JSON.parse(localStorage.getItem("sk.demo")).data.cart);
check("cart holds the knife", cart.some((c) => c.productId === "p-knife" && c.engraving === "Anna" && c.pickupDate === "2026-10-21"), JSON.stringify(cart));
await shot("request-again-cart-en", false);

text = await open("sk-1028");
check("another guest's order is not shown", text.includes("We couldn’t find this order") && !text.includes("SK-1028"), text);
await shot("not-found-en", false);

log(`\n${pass} PASS, ${fail} FAIL`);
await browser.close();
process.exit(fail ? 1 : 0);
