// Round 2 fix pass (R2, 14 Oct 2026): gift-vs-tour pairs for C13 (2.8), C14 + C16 (2.9) and the
// expiry states (2.7), 375px, DPR 2, tour also in DE, plus computed-style checks for each fix.
// Usage: node 2.9-r2b-pairs.mjs [repo root]   (Vite on 5232, no HMR; playwright-core resolvable)
// Writes screens/2.{7,8,9}-r2b/<screen>-{gift,tour}-<lang>.png.
import { chromium } from "playwright-core";
import { mkdirSync, readdirSync } from "node:fs";

const home = process.env.HOME + "/.cache/ms-playwright/";
const dir = readdirSync(home).filter((d) => d.startsWith("chromium_headless_shell-")).sort().pop();
const exe = `${home}${dir}/chrome-headless-shell-linux64/chrome-headless-shell`;
const ROOT = process.argv[2] ?? "/home/ross-geller/Projects/minastik/swiss-keepsakes";
const SCREENS = `${ROOT}/docs/ux/prototype/screens`;
const BASE = "http://localhost:5232/";
for (const step of ["2.7-r2b", "2.8-r2b", "2.9-r2b"]) mkdirSync(`${SCREENS}/${step}`, { recursive: true });
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
    const raw = (await text()).match(/\b(tourBooking|tours|guestOrder|review|account|requestSent|tripProfile)\.[a-zA-Z.-]+/);
    check(`no raw i18n keys (${step}/${name})`, !raw, raw?.[0] ?? "");
  }
};
const lang = async (id) => {
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.getByRole("group", { name: "Language" }).getByRole("button", { name: id }).first().click();
  await wait(400);
};
const both = async (step, name) => { await shot(step, `${name}-en`); await lang("DE"); await shot(step, `${name}-de`); await lang("EN"); };
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
// Computed style of the first element matching a selector.
const style = (selector) => page.evaluate((sel) => {
  const el = document.querySelector(sel);
  if (!el) return null;
  const s = getComputedStyle(el);
  return {
    border: `${s.borderTopWidth} ${s.borderTopStyle}`,
    radius: s.borderTopLeftRadius,
    shadow: s.boxShadow,
    bg: s.backgroundColor,
    padding: s.paddingTop,
    ruleBelow: `${s.borderBottomWidth} ${s.borderBottomStyle}`,
  };
}, selector);
const same = (a, b, keys) => !!a && !!b && keys.every((k) => a[k] === b[k]);
async function addGift(slug, variant, engraving, day, place) {
  await go("/gifts/" + slug);
  await page.getByRole("button", { name: /^Add to cart$/ }).last().click();
  const sheet = page.getByRole("dialog"); await sheet.waitFor();
  if (variant) await sheet.getByRole("row", { name: new RegExp(variant) }).click();
  if (engraving) await sheet.getByLabel(/Engraving/).first().fill(engraving);
  await sheet.getByRole("gridcell").filter({ hasText: new RegExp(`^${day}$`) }).first().click();
  await sheet.getByRole("radio", { name: new RegExp(place) }).check({ force: true });
  await sheet.getByRole("button", { name: /Add to cart ·/ }).click(); await wait(400);
}

// Setup: fresh store, signed in.
await page.goto(BASE);
await page.evaluate(() => localStorage.clear());
await go("/sign-in?returnTo=%2Faccount");
await page.getByRole("button", { name: /Continue with Google/ }).click();
await wait(1200);

// --- 2.8: C13 against gift C07 --------------------------------------------------------------
await addGift("kapellbruecke-pocket-knife", "Medium", "Anna", 21, "Shop Altstadt");
await addGift("lucerne-gift-box", null, null, 20, "Shop Altstadt");
await go("/cart"); await wait(6000); // the "Added to cart" toast expires
await page.getByRole("checkbox", { name: "Select all" }).check({ force: true }); await wait(300);
await page.getByRole("button", { name: "Continue" }).click(); await wait(1200);
await page.getByRole("button", { name: "Send request · no payment yet" }).click(); await wait(1500);
await shot("2.8-r2b", "c13-gift-en");
const giftC07Card = await style("main section.shadow-surface");
// Tour: walk, Fri 16 Oct, 2 adults + 1 child, deposit paid, so C13 shows a balance.
await go("/tours/lucerne-old-town-walk/book");
await page.locator(".radio").filter({ hasText: "Fri 16 Oct" }).click(); await wait(300);
await page.getByRole("button", { name: /Review booking/ }).last().click(); await wait(800);
await page.getByLabel("Contact name").fill("Anna Keller");
await page.getByLabel("Mobile number").fill("+41 79 123 45 67");
await page.getByLabel("Child’s name (optional)").fill("Alex");
await page.locator("form button[type=submit]").click(); await wait(1000);
await page.getByRole("button", { name: /^Pay CHF/ }).click(); await wait(1500);
await both("2.8-r2b", "c13-tour");
const c13Block = await page.evaluate(() => {
  const first = document.querySelector("main section.shadow-surface")?.firstElementChild?.textContent ?? "";
  return { title: first.startsWith("Lucerne old-town walk"), ref: /Booking reference SK-T/.test(first), chips: /Confirmed/.test(first) && /Deposit paid/.test(first), meeting: /Where to meet: Chapel Bridge/.test(first) };
});
check("C13 fix 1-2: title, reference line, chips and the meeting row share the first block", Object.values(c13Block).every(Boolean), JSON.stringify(c13Block));
const c13Card = await style("main section.shadow-surface");
check("C13 card keeps C07's surface", same(c13Card, giftC07Card, ["border", "radius", "shadow", "bg"]), `${JSON.stringify(c13Card)} vs ${JSON.stringify(giftC07Card)}`);
const heights = await page.evaluate(() => [...document.querySelectorAll("main section[aria-labelledby=booking-total] :is(a, button)")].map((el) => `${el.textContent.trim().slice(0, 20)}=${el.getBoundingClientRect().height}`));
check("C13 fix 4: Pay, Add to calendar and View booking are the same large height", new Set(heights.map((h) => h.split("=")[1])).size === 1 && heights.length === 3, heights.join(", "));
const inCard = await page.evaluate(() => !!document.querySelector("main section[aria-labelledby=booking-total] section.shadow-surface button"));
check("C13/C16 fix 5: Pay sits inside the money card", inCard);
const gaps = await page.evaluate(() => { const col = document.querySelector("main section[aria-labelledby=booking-total]")?.parentElement; return col ? getComputedStyle(col).rowGap : ""; });
check("C13 fix 3: sections 40px apart", gaps === "40px", gaps);
// Pay later.
await go("/tours/lake-lucerne-stories/book");
await page.locator(".radio").filter({ hasText: "17 Oct" }).click(); await wait(300);
await page.getByRole("button", { name: /Review booking/ }).last().click(); await wait(800);
await page.getByLabel("Contact name").fill("Anna Keller");
await page.getByLabel("Mobile number").fill("+41 79 123 45 67");
await page.locator("form button[type=submit]").click(); await wait(1500);
await both("2.8-r2b", "c13-pay-later-tour");

// Samples for C14 and C16, on a fresh store: the C07 request above would shift the sample ids.
await page.goto(BASE);
await page.evaluate(() => localStorage.clear());
await page.reload();
await wait(800);
await go("/sign-in?returnTo=%2Faccount");
await page.getByRole("button", { name: /Continue with Google/ }).click();
await wait(1200);
await control("Add sample orders in every state");
await control("Add sample tour bookings in every state");
await go("/account/orders/sk-1044");
const giftTicket = await style('section[aria-labelledby="order-headline"]');

// --- 2.9: C14 rows ----------------------------------------------------------------------------
await go("/account?tab=orders");
await shot("2.9-r2b", "c14-gift-en");
const giftRow = await style('main a[href*="/account/orders/"]');
await go("/account?tab=bookings");
await shot("2.9-r2b", "c14-tour-en");
const tourRow = await style('main a[href*="/account/bookings/"]');
check("C14 fix 1 (D2): tour row surface equals the gift C14 ticket (border, radius, no shadow)", same(tourRow, giftRow, ["border", "radius", "shadow", "bg"]), `${JSON.stringify(tourRow)} vs ${JSON.stringify(giftRow)}`);
check("C14 fix 2: group row has its icon", (await page.locator('main a[href*="/account/bookings/"]').first().locator("svg").count()) >= 3);
await lang("DE");
await shot("2.9-r2b", "c14-tour-de");
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
await page.screenshot({ path: `${SCREENS}/2.9-r2b/c14-tour-focus-en.png` });
await page.evaluate(() => { window.__row = document.activeElement; document.activeElement.blur(); });
await wait(300);
const blurred = await page.evaluate(() => { const s = getComputedStyle(window.__row); return `${s.outlineStyle} ${s.outlineWidth} | ${s.boxShadow}`; });
check("keyboard: C14 tour row reachable by Tab with a visible focus ring", reached && visible && focused !== blurred, `focused ${focused} / blurred ${blurred}`);

// --- 2.9: C16 against C15 -------------------------------------------------------------------
await go("/account/orders/sk-1044");
await shot("2.9-r2b", "c16-deadline-gift-en");
await go(`/account/bookings/${await tourId("SK-T1042")}`);
await shot("2.9-r2b", "c16-deadline-tour-en");
const ticket = await page.evaluate(() => {
  const card = document.querySelector("main section.shadow-surface");
  const s = (el) => el && getComputedStyle(el);
  return {
    tile: !!card?.querySelector(".w-14"),
    photo: !!card?.querySelector(".size-14"),
    firstRule: `${s(card?.children[0])?.borderBottomWidth} ${s(card?.children[0])?.borderBottomStyle}`,
    detailsPadding: s(card?.children[1])?.paddingTop,
    chipsInHead: !!card?.children[0]?.textContent.includes("Balance overdue"),
  };
});
check("C16 fix 1: ticket head with the lg date tile, photo and chips under the title", ticket.tile && ticket.photo && ticket.chipsInHead, JSON.stringify(ticket));
check("C16 fix 3: dashed rule under the ticket head", ticket.firstRule === "1px dashed", ticket.firstRule);
check("C16 fix 4: ticket blocks pad 16px as C15", ticket.detailsPadding === "16px", ticket.detailsPadding);
check("C16 ticket card surface equals the C15 ticket", same(await style("main section.shadow-surface"), giftTicket, ["border", "radius", "shadow", "bg"]));
const money = await page.evaluate(() => {
  const card = document.querySelector("main section[aria-labelledby=booking-total] section.shadow-surface");
  const first = card && getComputedStyle(card.children[0]);
  return { rule: `${first?.borderBottomWidth} ${first?.borderBottomStyle}`, padding: first?.paddingTop, pay: !!card?.querySelector("button") };
});
check("C16 fix 3-5: money card has dashed rules, 16px blocks and Pay inside", money.rule === "1px dashed" && money.padding === "16px" && money.pay, JSON.stringify(money));
check("C16 fix 2: no 'Booking activity' heading on a booking without events (SK-T1042)", !(await text()).includes("Booking activity"));
check("C16 fix 6: facts carry icons", (await page.locator("main section.shadow-surface").first().locator("dl svg").count()) >= 3);
check("C16 overdue headline", /Balance due by .*\n*.*The balance deadline has passed/s.test(await text()));
await lang("DE");
await shot("2.9-r2b", "c16-deadline-tour-de");
await lang("EN");
// Balance after the service: gift handed over (SK-1048) vs tour delivered (SK-T904).
await go("/account/orders/sk-1048");
await shot("2.9-r2b", "c16-balance-gift-en");
await go(`/account/bookings/${await tourId("SK-T904")}`);
await shot("2.9-r2b", "c16-balance-tour-en");
await lang("DE");
await shot("2.9-r2b", "c16-balance-tour-de");
await lang("EN");
// Activity: gift Progress tab (SK-1050) vs tour activity (SK-T903), element shots.
await go("/account/orders/sk-1050?tab=timeline");
await page.locator("main ol[aria-label]").screenshot({ path: `${SCREENS}/2.9-r2b/c16-activity-gift-en.png` });
const giftOl = await style("main ol[aria-label]");
await go(`/account/bookings/${await tourId("SK-T903")}`);
await page.locator("main ol[aria-label]").screenshot({ path: `${SCREENS}/2.9-r2b/c16-activity-tour-en.png` });
check("C16 activity: the gift stepper card", same(await style("main ol[aria-label]"), giftOl, ["border", "radius", "shadow", "padding"]));
// Posted review: gift completed (SK-1012) vs tour completed (SK-T905).
await go("/account/orders/sk-1012");
await postReview("Lovely chocolates, picked up without a wait.");
await shot("2.9-r2b", "c16-reviewed-gift-en");
const giftInset = await style('main section[aria-label^="Your review"]');
await go(`/account/bookings/${await tourId("SK-T905")}`);
await postReview("Great walk, our guide knew every façade.");
await shot("2.9-r2b", "c16-reviewed-tour-en");
const tourInset = await style('main section[aria-label^="Your review"]');
check("C16 fix 8: posted review is the gift 1.13t grey inset", same(tourInset, giftInset, ["border", "radius", "shadow", "bg", "padding"]), `${JSON.stringify(tourInset)} vs ${JSON.stringify(giftInset)}`);
await lang("DE");
await shot("2.9-r2b", "c16-reviewed-tour-de");
await lang("EN");

// --- 2.7: expiry states -----------------------------------------------------------------------
// Expired with money after it: gift SK-1050 vs tour SK-T903.
await go("/account/orders/sk-1050");
await shot("2.7-r2b", "c16-expired-reconciliation-gift-en");
const giftNoteTitle = await page.locator("main .alert .alert__title").last().evaluate((el) => getComputedStyle(el).color);
await go(`/account/bookings/${await tourId("SK-T903")}`);
await shot("2.7-r2b", "c16-expired-reconciliation-tour-en");
const expiredInTicket = await page.evaluate(() => {
  const h = document.getElementById("booking-expired");
  const card = h?.closest("section.shadow-surface");
  const block = h?.closest("section.shadow-surface > *");
  const above = block?.previousElementSibling;
  return { inTicket: !!card?.querySelector(".w-14"), ruleAbove: above ? `${getComputedStyle(above).borderBottomWidth} ${getComputedStyle(above).borderBottomStyle}` : "", padding: block ? getComputedStyle(block).paddingTop : "" };
});
check("2.7 fix 1: expired headline is the ticket's last block under a dashed rule", expiredInTicket.inTicket && expiredInTicket.ruleAbove === "1px dashed", JSON.stringify(expiredInTicket));
check("2.7 fix 2: expired block pads 16px", expiredInTicket.padding === "16px", expiredInTicket.padding);
const tourNoteTitle = await page.locator('main [role="status"] .alert__title').first().evaluate((el) => getComputedStyle(el).color);
check("D3: reconciliation note in the gift note's warning tone", tourNoteTitle === giftNoteTitle, `${tourNoteTitle} vs ${giftNoteTitle}`);
await lang("DE");
await shot("2.7-r2b", "c16-expired-reconciliation-tour-de");
await lang("EN");
// Expired without money: gift overdue (SK-1044 after its deadline is expired) vs tour SK-T902.
await go("/account/orders/sk-1044");
await control(/Expire this order/);
await go("/account/orders/sk-1044");
await shot("2.7-r2b", "c16-expired-gift-en");
await go(`/account/bookings/${await tourId("SK-T902")}`);
await shot("2.7-r2b", "c16-expired-tour-en");
await lang("DE");
await shot("2.7-r2b", "c16-expired-tour-de");
await lang("EN");
// C12 old link: the standalone expired card (no ticket there).
await go(`/account/bookings/${await tourId("SK-T902")}/pay`);
await shot("2.7-r2b", "c12-expired-tour-en");
const c12 = await page.evaluate(() => {
  const card = document.querySelector('section[aria-labelledby="booking-expired"]');
  const s = card && getComputedStyle(card);
  return { shadow: s?.boxShadow, radius: s?.borderTopLeftRadius, padding: card && getComputedStyle(card.children[0]).paddingTop };
});
check("2.7 fix 2: C12 expired card keeps the shared surface, 16px block", c12.shadow === giftTicket?.shadow && c12.radius === giftTicket?.radius && c12.padding === "16px", JSON.stringify(c12));
await lang("DE");
await shot("2.7-r2b", "c12-expired-tour-de");
await lang("EN");

console.log(`\nRESULT ${pass} passed, ${fail} failed`);
await browser.close();
process.exitCode = fail ? 1 : 0;
