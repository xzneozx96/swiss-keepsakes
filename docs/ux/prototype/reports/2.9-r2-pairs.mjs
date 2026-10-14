// 2.7/2.9 round 2: gift-vs-tour screenshot pairs at 375px (tour also in DE), plus C13 for R1.
// Usage: node 2.9-r2-pairs.mjs [repo root]   (Vite on 5232, no HMR; playwright-core resolvable)
// Writes screens/2.9-r2/<screen>-{gift,tour}-<lang>.png and screens/2.7-r2/<screen>-…png.
import { chromium } from "playwright-core";
import { mkdirSync, readdirSync } from "node:fs";

const home = process.env.HOME + "/.cache/ms-playwright/";
const dir = readdirSync(home).filter((d) => d.startsWith("chromium_headless_shell-")).sort().pop();
const exe = `${home}${dir}/chrome-headless-shell-linux64/chrome-headless-shell`;
const ROOT = process.argv[2] ?? "/home/ross-geller/Projects/minastik/swiss-keepsakes";
const SCREENS = `${ROOT}/docs/ux/prototype/screens`;
const BASE = "http://localhost:5232/";
for (const step of ["2.7-r2", "2.9-r2"]) mkdirSync(`${SCREENS}/${step}`, { recursive: true });
const browser = await chromium.launch({ executablePath: exe });
const context = await browser.newContext({ viewport: { width: 375, height: 812 }, deviceScaleFactor: 2 });
const page = await context.newPage();
let pass = 0, fail = 0;
const check = (name, ok, extra = "") => { ok ? pass++ : fail++; console.log(ok ? "PASS" : "FAIL", name, extra === "" ? "" : `| ${extra}`); };
page.on("console", (m) => { if (m.type() === "error") console.log("CONSOLE", m.text().slice(0, 300)); });
page.on("pageerror", (e) => console.log("PAGEERROR", e.message));
const wait = (ms = 400) => page.waitForTimeout(ms);
const go = async (hash) => { await page.goto(BASE + "#" + hash); await wait(900); };
const text = async () => (await page.locator("body").innerText()).replace(/[  ]/g, " ");
// Full page by growing the viewport, so sticky and fixed bars render once and lazy photos load.
const shot = async (step, name) => {
  await page.evaluate(() => window.scrollTo(0, 0));
  await wait(400);
  const h = await page.evaluate(() => document.documentElement.scrollHeight);
  await page.setViewportSize({ width: 375, height: Math.max(812, h) });
  await wait(600);
  await page.screenshot({ path: `${SCREENS}/${step}/${name}.png` });
  await page.setViewportSize({ width: 375, height: 812 });
  check(`no horizontal overflow (${step}/${name})`, (await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)) <= 0);
  if (name.endsWith("-de")) {
    const raw = (await text()).match(/\b(tourBooking|tours|guestOrder|review|account)\.[a-zA-Z.-]+/);
    check(`no raw i18n keys (${step}/${name})`, !raw, raw?.[0] ?? "");
  }
};
const lang = async (id) => {
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.getByRole("group", { name: "Language" }).getByRole("button", { name: id }).first().click();
  await wait(400);
};
const control = async (name) => {
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.getByRole("region", { name: "Prototype controls" }).getByRole("button").first().click();
  await page.getByRole("dialog").waitFor();
  await wait(300);
  await page.getByRole("dialog").getByRole("button", { name }).click();
  await wait(900);
  if (await page.getByRole("dialog").count()) { await page.keyboard.press("Escape"); await wait(300); }
};
const tourId = (ref) => page.evaluate((r) => JSON.parse(localStorage.getItem("sk.demo")).data.tours.bookings.find((b) => b.ref === r).id, ref);
const postReview = async (body) => {
  await page.getByRole("button", { name: "Write a review" }).click();
  await page.getByRole("dialog").waitFor();
  await wait(300);
  await page.getByRole("dialog").getByText("5 out of 5 stars").click({ force: true });
  await page.getByRole("dialog").getByRole("textbox").fill(body);
  await page.getByRole("dialog").getByRole("button", { name: "Post review" }).click();
  await wait(900);
  // Reload so the "Review posted" toast does not cover the review in the shot.
  await page.reload();
  await wait(1000);
};
// Computed style of the card that holds an element: border width and box-shadow.
const cardStyle = (selector) => page.evaluate((sel) => {
  const el = document.querySelector(sel);
  if (!el) return null;
  const s = getComputedStyle(el);
  return { border: s.borderTopWidth, radius: s.borderTopLeftRadius, shadow: s.boxShadow };
}, selector);

// Setup: fresh store, signed in, every sample gift order and tour booking.
await page.goto(BASE);
await page.evaluate(() => localStorage.clear());
await go("/sign-in?returnTo=%2Faccount");
await page.getByRole("button", { name: /Continue with Google/ }).click();
await wait(1200);
await control("Add sample orders in every state");
await control("Add sample tour bookings in every state");

// Reference card style: a gift C15 card.
await go("/account/orders/sk-1044");
const giftCard = await cardStyle('section[aria-labelledby="order-headline"]');

// --- 2.9: C14 rows -------------------------------------------------------------------------
await go("/account?tab=orders");
await shot("2.9-r2", "c14-gift-en");
await go("/account?tab=bookings");
await shot("2.9-r2", "c14-tour-en");
const row = await cardStyle('a[href*="/account/bookings/"]');
check("C14 tour row: no border, gift card shadow and radius", row?.border === "0px" && row?.shadow === giftCard?.shadow && row?.radius === giftCard?.radius, JSON.stringify(row));
await lang("DE");
await shot("2.9-r2", "c14-tour-de");
await lang("EN");
// Keyboard: Tab reaches the first booking row, which shows a focus ring only while focused.
await page.evaluate(() => { document.activeElement?.blur(); window.scrollTo(0, 0); });
let reached = false;
for (let i = 0; i < 60 && !reached; i++) {
  await page.keyboard.press("Tab");
  reached = await page.evaluate(() => !!document.activeElement?.getAttribute("href")?.includes("/account/bookings/"));
}
const ring = () => page.evaluate(() => { const s = getComputedStyle(document.activeElement); return `${s.outlineStyle} ${s.outlineWidth} | ${s.boxShadow}`; });
const focused = reached ? await ring() : "";
const visible = reached && (await page.evaluate(() => document.activeElement.matches(":focus-visible")));
await page.screenshot({ path: `${SCREENS}/2.9-r2/c14-tour-focus-en.png` });
await page.evaluate(() => { window.__row = document.activeElement; document.activeElement.blur(); });
await wait(300);
const blurred = await page.evaluate(() => { const s = getComputedStyle(window.__row); return `${s.outlineStyle} ${s.outlineWidth} | ${s.boxShadow}`; });
check("keyboard: C14 tour row reachable by Tab with a visible focus ring", reached && visible && focused !== blurred, `focused ${focused} / blurred ${blurred}`);

// --- 2.9: C16 against C15 -------------------------------------------------------------------
// Money owed with a deadline: gift payment due (SK-1044) vs tour balance overdue (SK-T1042).
await go("/account/orders/sk-1044");
await shot("2.9-r2", "c16-deadline-gift-en");
await go(`/account/bookings/${await tourId("SK-T1042")}`);
await shot("2.9-r2", "c16-deadline-tour-en");
check("C16 overdue headline", /Balance due by .*\n*.*The balance deadline has passed/s.test(await text()));
await lang("DE");
await shot("2.9-r2", "c16-deadline-tour-de");
await lang("EN");
// Balance after the service: gift handed over (SK-1048) vs tour delivered (SK-T904).
await go("/account/orders/sk-1048");
await shot("2.9-r2", "c16-balance-gift-en");
await go(`/account/bookings/${await tourId("SK-T904")}`);
await shot("2.9-r2", "c16-balance-tour-en");
await lang("DE");
await shot("2.9-r2", "c16-balance-tour-de");
await lang("EN");
// Activity: gift Progress tab (SK-1050) vs tour activity (SK-T903), element shots.
await go("/account/orders/sk-1050?tab=timeline");
await page.locator("main ol[aria-label]").screenshot({ path: `${SCREENS}/2.9-r2/c16-activity-gift-en.png` });
await go(`/account/bookings/${await tourId("SK-T903")}`);
await page.locator("main ol[aria-label]").screenshot({ path: `${SCREENS}/2.9-r2/c16-activity-tour-en.png` });
const ol = await cardStyle("main ol[aria-label]");
check("C16 activity: gift stepper card style", ol?.border === "0px" && ol?.shadow === giftCard?.shadow, JSON.stringify(ol));
// Posted review: gift completed (SK-1012) vs tour completed (SK-T905).
await go("/account/orders/sk-1012");
await postReview("Lovely chocolates, picked up without a wait.");
await shot("2.9-r2", "c16-reviewed-gift-en");
await go(`/account/bookings/${await tourId("SK-T905")}`);
await postReview("Great walk, our guide knew every façade.");
await shot("2.9-r2", "c16-reviewed-tour-en");
const review = await cardStyle('main section[aria-label^="Your review"]');
check("C16 posted review: no border, shared shadow", review?.border === "0px" && review?.shadow === giftCard?.shadow, JSON.stringify(review));
await lang("DE");
await shot("2.9-r2", "c16-reviewed-tour-de");
await lang("EN");
// C13 (R1's screen) picks up the BookingMoney restyle: confirmed deposit booking SK-T2001.
await go(`/account/bookings/${await tourId("SK-T2001")}/confirmed`);
await shot("2.9-r2", "c13-confirmed-tour-en");

// --- 2.7: expiry states against C15 overdue and money after cancellation --------------------
// Expired with money after it: gift SK-1050 vs tour SK-T903.
await go("/account/orders/sk-1050");
await shot("2.7-r2", "c16-expired-reconciliation-gift-en");
await go(`/account/bookings/${await tourId("SK-T903")}`);
await shot("2.7-r2", "c16-expired-reconciliation-tour-en");
const expired = await cardStyle('section[aria-labelledby="booking-expired"]');
check("C16 expired notice: gift headline card style", expired?.border === "0px" && expired?.shadow === giftCard?.shadow && expired?.radius === giftCard?.radius, JSON.stringify(expired));
const alert = await page.locator('main [role="status"]').first().evaluate((el) => getComputedStyle(el).backgroundColor);
const giftNote = await (async () => { await go("/account/orders/sk-1050"); return page.locator("main [role=alert], main .alert").last().evaluate((el) => getComputedStyle(el).backgroundColor); })();
check("C16 reconciliation notice: same Alert surface as the gift note", alert === giftNote, `${alert} vs ${giftNote}`);
await go(`/account/bookings/${await tourId("SK-T903")}`);
await lang("DE");
await shot("2.7-r2", "c16-expired-reconciliation-tour-de");
await lang("EN");
// Expired without money: gift overdue (SK-1044 after its deadline is expired) vs tour SK-T902.
await go("/account/orders/sk-1044");
await control(/Expire this order/);
await go("/account/orders/sk-1044");
await shot("2.7-r2", "c16-expired-gift-en");
await go(`/account/bookings/${await tourId("SK-T902")}`);
await shot("2.7-r2", "c16-expired-tour-en");
await lang("DE");
await shot("2.7-r2", "c16-expired-tour-de");
await lang("EN");
// C12 old link on an expired hold: the restyled notice above the provider page.
await go(`/account/bookings/${await tourId("SK-T902")}/pay`);
await shot("2.7-r2", "c12-expired-tour-en");
await lang("DE");
await shot("2.7-r2", "c12-expired-tour-de");
await lang("EN");

console.log(`\nRESULT ${pass} passed, ${fail} failed`);
await browser.close();
process.exitCode = fail ? 1 : 0;
