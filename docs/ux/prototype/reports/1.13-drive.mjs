// Step 1.13 verification: C15 Guest order detail, every state in EN and DE at 375px.
// Usage: node 1.13-drive.mjs <screens dir>   (Vite on port 5189; run from front-end/ so playwright-core resolves)
import { chromium } from "playwright-core";
import { readdirSync } from "node:fs";
const home = process.env.HOME + "/.cache/ms-playwright/";
const dir = readdirSync(home).filter((d) => d.startsWith("chromium_headless_shell-")).sort().pop();
const exe = `${home}${dir}/chrome-headless-shell-linux64/chrome-headless-shell`;
const OUT = process.argv[2];
const BASE = "http://localhost:5189/";
const browser = await chromium.launch({ executablePath: exe });
const context = await browser.newContext({ viewport: { width: 375, height: 812 }, deviceScaleFactor: 2 });
await context.grantPermissions(["clipboard-read", "clipboard-write"], { origin: "http://localhost:5189" });
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
const payLink = () => page.locator("main a", { hasText: /^(Pay|.*bezahlen$)/ });

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
await page.locator("main a[href$='/account/orders/sk-1015']").click();
await page.waitForTimeout(150);
await page.screenshot({ path: `${OUT}/skeleton-en.png` });
await page.waitForTimeout(800);
check("C14 row opens C15", page.url().endsWith("#/account/orders/sk-1015") && (await mainText()).includes("Order SK-1015"), page.url());

await openControls();
await page.getByRole("button", { name: "Add sample orders in every state" }).click();
await page.waitForTimeout(1200);
text = await mainText();
check("sample orders listed on C14", ["SK-1043", "SK-1050"].every((r) => text.includes(r)), text);

// ref → state, expected EN strings, expected DE strings
const states = [
  ["requested", "sk-1043", ["Awaiting seller confirmation", "Nothing to pay yet", "Requested pickup", "Seller confirms", "You pay, then the shop prepares your gifts"], ["Wartet auf Bestätigung", "Angefragte Abholung"], { pay: false, cancel: false }],
  ["accepted", "sk-1044", ["Accepted, payment due", "If it isn’t paid by then, the order is cancelled automatically.", "Confirmed pickup", "Engraving “Anna”"], ["Angenommen, Zahlung fällig", "automatisch storniert"], { pay: true, cancel: true }],
  ["accepted-changed-place", "sk-1045", ["The shop moved your pickup from Shop Altstadt to Pickup point Bahnhof", "cancel free of charge", "Shop changed the pickup place to Pickup point Bahnhof"], ["kostenlos stornieren"], { pay: true, cancel: true }],
  ["preparing", "sk-1046", ["Confirmed, being prepared", "Paid in full · CHF 49.00", "Received"], ["Bestätigt, in Vorbereitung", "Vollständig bezahlt"], { pay: false, cancel: false }],
  ["ready", "sk-1047", ["Ready for pickup at Shop Altstadt", "Pay later · CHF 24.00"], ["Abholbereit in Laden Altstadt", "Später bezahlen"], { pay: true, cancel: false }],
  ["handed-over-balance", "sk-1048", ["Handed over", "Deposit paid · CHF 26.70 · CHF 62.30 left", "CHF 62.30 still to pay"], ["Übergeben", "Noch CHF 62.30 zu bezahlen"], { pay: true, cancel: false }],
  ["payment-processing", "sk-1049", ["Payment processing", "Please don’t pay again"], ["Zahlung in Bearbeitung", "nicht noch einmal bezahlen"], { pay: false, cancel: false }],
  ["received-after-cancellation", "sk-1050", ["Cancelled · payment overdue", "Received after cancellation · awaiting reconciliation", "arrived after the order was cancelled"], ["Nach Stornierung eingegangen", "nach der Stornierung eingegangen"], { pay: false, cancel: false }],
  ["completed", "sk-1012", ["Completed", "Paid in full · CHF 48.00", "Write a review", "Cash"], ["Abgeschlossen", "Bewertung schreiben", "Bar"], { pay: false, cancel: false }],
  ["declined", "sk-1015", ["Declined by seller", "The last print is already promised to another guest."], ["Vom Verkäufer abgelehnt", "Text auf Englisch"], { pay: false, cancel: false }],
];

for (const lang of ["EN", "DE"]) {
  await setLang(lang);
  for (const [name, id, en, de, act] of states) {
    text = await open(id);
    const want = lang === "EN" ? en : de;
    for (const s of want) check(`${name} ${lang}: "${s}"`, text.includes(s), text);
    check(`${name} ${lang}: Pay ${act.pay ? "shown" : "hidden"}`, ((await payLink().count()) > 0) === act.pay);
    const cancelName = lang === "EN" ? "Cancel order" : "Bestellung stornieren";
    check(`${name} ${lang}: Cancel ${act.cancel ? "shown" : "hidden"}`, ((await page.getByRole("button", { name: cancelName }).count()) > 0) === act.cancel);
    if (lang === "DE") check(`${name} DE: no raw keys`, !/guestOrder\.|order\.(status|payment)\.|detail\./.test(text), text);
    await shot(`${name}-${lang.toLowerCase()}`);
  }
}
await setLang("EN");

// Deadline with a comma before the time in Chrome (T0 open question 5).
text = await open("sk-1044");
check("deadline formatted dd.mm.yyyy, hh:mm", /Pay CHF 54\.00 by \d\d\.\d\d\.2026, \d\d:\d\d/.test(text), text);
check("Pay button names the amount", (await payLink().innerText()).replace(/[\u00a0\u202f]/g, " ").includes("Pay CHF 54.00"));
check("Pay links to the C12 route for 1.14", (await payLink().getAttribute("href")) === "#/account/orders/sk-1044/pay");

// Keyboard: Tab reaches the Pay link.
let focused = "";
for (let i = 0; i < 20 && !focused.endsWith("/pay"); i++) {
  await page.keyboard.press("Tab");
  focused = await page.evaluate(() => document.activeElement?.getAttribute("href") ?? "");
}
check("Pay reachable by keyboard", focused.endsWith("/pay"), focused);
await shot("focus-pay-en", false);

// Copy the order reference.
await page.getByRole("button", { name: "Copy" }).click();
await page.waitForTimeout(300);
check("copy feedback", (await mainText()).includes("Copied"));
check("clipboard holds the reference", (await page.evaluate(() => navigator.clipboard.readText())) === "SK-1044");

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

// Guest cancels (confirm dialog), on the R04 order.
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
await page.waitForTimeout(500);
text = await mainText();
check("cancelled by you", text.includes("Cancelled by you") && text.includes("Nothing paid") && text.includes("nothing to refund"), text);
check("cancelled by you: no Pay", (await payLink().count()) === 0);
await shot("cancelled-by-guest-en");
await setLang("DE");
await page.waitForTimeout(300);
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
check("overdue cancel", text.includes("Cancelled · payment overdue") && text.includes("Cancelled because the payment was overdue"), text);
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

// Mail panel: N23 for guest and staff.
const mail = await page.evaluate(() => JSON.parse(localStorage.getItem("sk.demo")).data.mail.map((m) => `${m.template}→${m.to}:${m.orderId}`));
check("N23 to guest and staff", mail.includes("N23→guest:sk-1044") && mail.includes("N23→staff:sk-1044"), mail.join(","));
check("sample orders sent no mail", !mail.some((m) => /sk-104[3-9]|sk-1050/.test(m) && !m.startsWith("N23")), mail.join(","));

// Request again → items back in the cart with the old date and place.
await page.getByRole("button", { name: "Request again" }).click();
await page.waitForTimeout(900);
check("Request again opens the cart", page.url().endsWith("#/cart"), page.url());
const cart = await page.evaluate(() => JSON.parse(localStorage.getItem("sk.demo")).data.cart);
check("cart holds the knife", cart.length === 1 && cart[0].productId === "p-knife" && cart[0].variantId === "m" && cart[0].engraving === "Anna" && cart[0].pickupDate === "2026-10-21", JSON.stringify(cart));
await shot("request-again-cart-en", false);

// Other guests' orders stay private.
text = await open("sk-1028");
check("another guest's order is not shown", text.includes("We couldn’t find this order") && !text.includes("SK-1028"), text);
await shot("not-found-en", false);

log(`\n${pass} PASS, ${fail} FAIL`);
await browser.close();
process.exit(fail ? 1 : 0);
