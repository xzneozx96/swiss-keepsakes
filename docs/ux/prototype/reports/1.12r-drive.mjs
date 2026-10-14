// 1.12r: drive the account hub at 375px in EN and DE; screenshots + checks.
import { chromium } from "playwright-core";
import { readdirSync } from "node:fs";
const home = process.env.HOME + "/.cache/ms-playwright/";
const dir = readdirSync(home).filter((d) => d.startsWith("chromium_headless_shell-")).sort().pop();
const exe = `${home}${dir}/chrome-headless-shell-linux64/chrome-headless-shell`;
const OUT = process.argv[2];
const BASE = "http://localhost:5216/";
const browser = await chromium.launch({ executablePath: exe });
const page = await browser.newPage({ viewport: { width: 375, height: 812 }, deviceScaleFactor: 2 });
const log = (...a) => console.log(...a);
let pass = 0, fail = 0;
const check = (name, ok, extra = "") => { ok ? pass++ : fail++; log(ok ? "PASS" : "FAIL", name, extra); };
page.on("console", (m) => { if (m.type() === "error") log("CONSOLE", m.text()); });
page.on("pageerror", (e) => log("PAGEERROR", e.message));
const overflow = () => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
const mainText = async () => (await page.locator("main").innerText()).replace(/\n+/g, " | ").replace(/[  ]/g, " ");
const shot = async (name, fullPage = true) => {
  await page.waitForTimeout(500);
  if (fullPage) {
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
};
const tab = (name) => page.getByRole("tab", { name, exact: true });
// Every tab label fits its equal-width tab with at least 8px to spare (no touching labels, no scroll).
const tabsFit = () => page.evaluate(() => [...document.querySelectorAll('[role="tab"]')].every((el) => {
  const r = document.createRange(); r.selectNodeContents([...el.childNodes].find((n) => n.nodeType === 3));
  return r.getBoundingClientRect().width + 8 <= el.getBoundingClientRect().width;
}) && document.querySelector('[role="tablist"]').scrollWidth <= document.querySelector('[role="tablist"]').clientWidth + 1);
const noRawKeys = (text) => !/\b(account|transactions|guestOrder|tripProfile)\.[a-z]/.test(text);

await page.goto(BASE);
await page.evaluate(() => localStorage.clear());
await page.goto(BASE + "#/account");
await page.waitForTimeout(800);
check("signed out prompt", /Sign in to see your orders/.test(await mainText()));
await shot("signed-out-en");
await setLang("DE"); await shot("signed-out-de"); await setLang("EN");

// Sign in through C05, now a screen (1.6r): Sign in opens /sign-in, which returns to Account.
await page.getByRole("button", { name: "Sign in", exact: true }).click();
await page.waitForTimeout(600);
check("Sign in opens the C05 screen", page.url().includes("#/sign-in"), page.url());
await page.getByRole("button", { name: /Continue with Google/ }).click();
await page.waitForURL(/#\/account/);
await page.waitForTimeout(100);
await page.screenshot({ path: `${OUT}/orders-skeleton-en.png` });
await page.waitForTimeout(900);
let text = await mainText();
log("ORDERS EN:", text);
check("header name + email", text.includes("Anna Keller") && text.includes("anna.keller@example.com"));
check("four tabs", (await page.getByRole("tab").count()) === 4);
check("Orders selected by default", (await tab("Orders").getAttribute("aria-selected")) === "true");
// Fresh seed: Anna has only the two closed orders from step 1.12.
check("seed: past group only", !text.includes("Coming up") && text.includes("Past orders"));
check("both labels on past rows", text.includes("Paid in full · CHF 48.00") && text.includes("Declined by seller") && text.includes("Nothing paid"));
check("past newest first", text.indexOf("SK-1015") < text.indexOf("SK-1012"));
await shot("orders-seed-en");

let focused = "";
for (let i = 0; i < 60 && !focused.includes("/account/orders/"); i++) {
  await page.keyboard.press("Tab");
  focused = await page.evaluate(() => document.activeElement?.getAttribute("href") ?? "");
}
check("first ticket reachable by keyboard", focused.includes("#/account/orders/"), focused);
await shot("orders-focus-en", false);
await page.keyboard.press("Enter");
await page.waitForTimeout(800);
check("Enter opens C15", /#\/account\/orders\/sk-/.test(page.url()), page.url());
await page.goBack();
await page.waitForTimeout(900);

await setLang("DE");
text = await mainText();
check("DE orders", text.includes("Frühere Bestellungen") && noRawKeys(text));
check("DE tabs fit without scrolling", await tabsFit());
await shot("orders-seed-de");

// Fixtures, as in step 1.12: SK-1099 = accepted, unpaid order of Anna's whose place the shop
// changed (R04 note); SK-1098 = a copy of a seeded requested order, so "Coming up" has two tickets.
await page.evaluate(() => {
  const s = JSON.parse(localStorage.getItem("sk.demo"));
  const src = s.data.orders.find((o) => o.id === "sk-1028");
  const at = new Date(Date.parse(src.acceptedAt) - 60000).toISOString();
  const done = s.data.orders.find((o) => o.id === "sk-1012");
  done.log = [...done.log, { type: "pickup-changed", field: "date", from: "2026-10-08", to: "2026-10-09", note: "fixture", at: done.acceptedAt, actor: "owner" }];
  s.data.orders.push({
    ...src, id: "sk-1099", ref: "SK-1099", guestId: "g-anna", createdAt: new Date(Date.parse(src.createdAt) + 3600e3 * 20).toISOString(),
    log: [...src.log, { type: "pickup-changed", field: "place", from: "altstadt", to: "bahnhof", note: "fixture", at, actor: "manager" }],
  });
  const req = s.data.orders.find((o) => o.status === "requested");
  s.data.orders.push({ ...req, id: "sk-1098", ref: "SK-1098", guestId: "g-anna" });
  // Guest mails shaped like create-orders.ts (N02) and use-sign-in.ts (N01) send them.
  s.data.mail.push(
    { id: "m-fx1", at: req.createdAt, to: "guest", guestId: "g-anna", language: "en", template: "N01", params: { code: "123456", email: "anna.keller@example.com" } },
    { id: "m-fx2", at: req.createdAt, to: "guest", guestId: "g-anna", language: "de", template: "N02", orderId: "sk-1098", params: { orderRef: "SK-1098", pickupDate: req.pickupDate, pickupPlaceId: req.pickupPlaceId } },
  );
  localStorage.setItem("sk.demo", JSON.stringify(s));
  window.__pickups = { a: src.pickupDate, b: req.pickupDate };
});
const pickups = await page.evaluate(() => window.__pickups);
await page.reload();
await page.waitForTimeout(1200);
text = await mainText();
log("ORDERS FIXTURE DE:", text, pickups);
check("DE coming up", text.includes("Demnächst") && text.includes("Frühere Bestellungen"));
check("open before past", text.indexOf("SK-1099") < text.indexOf("SK-1015") && text.indexOf("SK-1098") < text.indexOf("SK-1015"));
check("soonest pickup first", (pickups.a <= pickups.b) === (text.indexOf("SK-1099") < text.indexOf("SK-1098")));
check("R04 note DE once", text.includes("SK-1099") && text.split("kostenlos stornieren").length === 2, "");
await shot("orders-r04-fixture-de");
await setLang("EN");
text = await mainText();
check("R04 note EN", text.includes("You can cancel free of charge") && text.includes("Accepted, payment due"));
check("open ticket labels", text.includes("Awaiting seller confirmation") && text.includes("Nothing to pay yet"));
await shot("orders-r04-fixture-en");

// Payments.
await tab("Payments").click();
await page.waitForTimeout(400);
check("tab in URL", page.url().includes("tab=payments"), page.url());
text = await mainText();
log("PAYMENTS EN:", text);
check("due now lists SK-1099", text.includes("Due now") && text.includes("SK-1099") && text.includes("Payment due · CHF 64.00"));
check("history shows the cash payment", text.includes("Payment history") && text.includes("CHF 48.00") && text.includes("Cash") && text.includes("Received"));
check("saved methods placeholder", text.includes("Saved payment methods") && text.includes("Not in the prototype"));
await shot("payments-en");
await setLang("DE");
text = await mainText();
check("DE payments", text.includes("Jetzt fällig") && text.includes("Zahlungsverlauf") && text.includes("Nicht im Prototyp") && noRawKeys(text));
await shot("payments-de");
await setLang("EN");
await page.getByRole("link", { name: /SK-1012 · Chocolate set/ }).click();
await page.waitForTimeout(900);
check("payment row opens C15 Payments tab", page.url().includes("orders/sk-1012") && page.url().includes("tab=payments"), page.url());
await page.goBack();
await page.waitForTimeout(900);

// Bookings.
await tab("Bookings").click();
await page.waitForTimeout(400);
check("bookings empty", (await mainText()).includes("Tours come later."));
await shot("bookings-en");
await setLang("DE");
check("DE bookings", (await mainText()).includes("Touren folgen später."));
await shot("bookings-de");
await setLang("EN");

// Profile.
await tab("Profile").click();
await page.waitForTimeout(400);
text = await mainText();
log("PROFILE EN:", text);
check("profile sections", ["Personal details", "Language", "Help us understand your trip", "Not answered yet", "Emails we sent"].every((s) => text.includes(s)));
check("mail list rendered, no raw params", text.includes("SK-1098") && !/[{}]/.test(text) && !text.includes("No emails yet") && noRawKeys(text));
await shot("profile-en");
await setLang("DE");
text = await mainText();
check("DE profile", text.includes("Persönliche Angaben") && text.includes("Gesendete E-Mails") && noRawKeys(text));
await shot("profile-de");
await setLang("EN");
await page.getByRole("link", { name: /Anfrage SK-1098 erhalten/ }).click();
await page.waitForTimeout(900);
check("mail row opens its order", page.url().endsWith("#/account/orders/sk-1098"), page.url());
await page.goBack();
await page.waitForTimeout(900);

await page.getByRole("button", { name: "Edit", exact: true }).click();
await page.getByRole("dialog").waitFor();
await page.getByRole("textbox", { name: "Name" }).fill("");
await page.waitForTimeout(200);
check("empty name blocks save", await page.getByRole("button", { name: "Save" }).isDisabled());
await shot("profile-name-sheet-invalid-en", false);
await page.getByRole("textbox", { name: "Name" }).fill("Anna Keller-Meier");
await shot("profile-name-sheet-en", false);
await page.getByRole("button", { name: "Save" }).click();
await page.waitForTimeout(500);
check("header shows new name", (await mainText()).includes("Anna Keller-Meier"));

await page.getByRole("button", { name: "Answer now" }).click();
await page.waitForTimeout(300);
await page.getByRole("radio", { name: /On my own/ }).check({ force: true });
await shot("profile-trip-form-en");
await page.getByRole("button", { name: "Save answers" }).click();
await page.waitForTimeout(400);
text = await mainText();
check("trip answers saved", text.includes("Thanks, your answers are saved."), "");
await shot("profile-trip-answered-en");

await page.getByRole("radio", { name: "Deutsch" }).check({ force: true });
await page.waitForTimeout(400);
check("language radio switches the app", (await mainText()).includes("Persönliche Angaben"));
await page.getByRole("radio", { name: "English" }).check({ force: true });
await page.waitForTimeout(300);

// Empty: prototype control lands on the Orders tab.
await openControls();
await page.getByRole("button", { name: "Remove my orders" }).click();
await page.waitForTimeout(1200);
text = await mainText();
check("empty lands on Orders", (await tab("Orders").getAttribute("aria-selected")) === "true" && text.includes("No gift orders yet.") && text.includes("Go to Explore"));
await shot("orders-empty-en");
await tab("Payments").click();
await page.waitForTimeout(300);
check("payments empty", (await mainText()).includes("No payments yet."));
await shot("payments-empty-en");
await tab("Orders").click();
await setLang("DE");
check("DE empty", (await mainText()).includes("Noch keine Geschenkbestellungen."));
await shot("orders-empty-de");

await page.getByRole("button", { name: "Abmelden" }).click();
await page.waitForTimeout(400);
check("sign out shows prompt", (await mainText()).includes("Anmelden und Bestellungen sehen"));

log(`\n${pass} PASS, ${fail} FAIL`);
await browser.close();
process.exit(fail ? 1 : 0);
