// Round 3 (worker G, 14 Oct 2026): gift-vs-tour pairs for C13 (2.8), C14 and C16 (2.9), 375px,
// DPR 2, tour also in DE, plus computed-style and placement checks for each owner comment.
// From 2.9-r2b-pairs.mjs. Usage: node 2.9-r3-pairs.mjs [repo root]   (Vite on 5232, no HMR)
// Writes screens/2.{8,9}-r3/<screen>-{gift,tour}-<lang>.png.
import { chromium } from "playwright-core";
import { mkdirSync, readdirSync } from "node:fs";

const home = process.env.HOME + "/.cache/ms-playwright/";
const dir = readdirSync(home).filter((d) => d.startsWith("chromium_headless_shell-")).sort().pop();
const exe = `${home}${dir}/chrome-headless-shell-linux64/chrome-headless-shell`;
const ROOT = process.argv[2] ?? "/home/ross-geller/Projects/minastik/swiss-keepsakes";
const SCREENS = `${ROOT}/docs/ux/prototype/screens`;
const BASE = "http://localhost:5232/";
for (const step of ["2.8-r3", "2.9-r3"]) mkdirSync(`${SCREENS}/${step}`, { recursive: true });
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
    const raw = (await text()).match(/\b(tourBooking|tours|guestOrder|review|account|requestSent|tripProfile|transactions)\.[a-zA-Z.-]+/);
    check(`no raw i18n keys (${step}/${name})`, !raw, raw?.[0] ?? "");
  }
};
const lang = async (id) => {
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.getByRole("group", { name: "Language" }).getByRole("button", { name: id }).first().click();
  await wait(400);
};
const TABS = { EN: ["Overview", "Payments", "Progress", "Policy"], DE: ["Übersicht", "Zahlungen", "Verlauf", "Bedingungen"] };
const tab = async (i, l = "EN") => { await page.getByRole("tab", { name: TABS[l][i] }).click(); await wait(350); };
// Tour shot in EN and DE on tab i (C16 keeps the selected tab across the language switch).
const both = async (step, name, i = null) => {
  if (i !== null) await tab(i);
  await shot(step, `${name}-en`);
  await lang("DE");
  if (i !== null) await tab(i, "DE");
  await shot(step, `${name}-de`);
  await lang("EN");
  if (i !== null) await tab(0);
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
const store = () => page.evaluate(() => JSON.parse(localStorage.getItem("sk.demo")));
const tourId = async (ref) => (await store()).data.tours.bookings.find((b) => b.ref === ref).id;
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
  const r = el.getBoundingClientRect();
  return {
    border: `${s.borderTopWidth} ${s.borderTopStyle}`,
    radius: s.borderTopLeftRadius,
    shadow: s.boxShadow,
    bg: s.backgroundColor,
    padding: `${s.paddingTop} ${s.paddingLeft}`,
    font: `${s.fontSize} ${s.fontWeight} ${s.fontFamily.split(",")[0]}`,
    size: `${Math.round(r.width)}x${Math.round(r.height)}`,
  };
}, selector);
const same = (a, b, keys) => !!a && !!b && keys.every((k) => a[k] === b[k]);
const show = (a, b) => `${JSON.stringify(a)} vs ${JSON.stringify(b)}`;
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
const fresh = async () => {
  await page.goto(BASE);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await wait(800);
  await go("/sign-in?returnTo=%2Faccount");
  await page.getByRole("button", { name: /Continue with Google/ }).click();
  await wait(1200);
};

await fresh();

// --- 2.8: C13 against gift C07 ("pls add thumbnail image to the tour info block") ------------
await addGift("kapellbruecke-pocket-knife", "Medium", "Anna", 21, "Shop Altstadt");
await addGift("lucerne-gift-box", null, null, 20, "Shop Altstadt");
await go("/cart"); await wait(6000); // the "Added to cart" toast expires
await page.getByRole("checkbox", { name: "Select all" }).check({ force: true }); await wait(300);
await page.getByRole("button", { name: "Continue" }).click(); await wait(1200);
await page.getByRole("button", { name: "Send request · no payment yet" }).click(); await wait(1500);
await shot("2.8-r3", "c13-gift-en");
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
await shot("2.8-r3", "c13-tour-en");
const c13 = await page.evaluate(() => {
  const card = document.querySelector("main section.shadow-surface");
  const first = card?.firstElementChild;
  const photo = first?.querySelector(".size-14");
  const title = first?.querySelector("h2");
  const pr = photo?.getBoundingClientRect(), tr = title?.getBoundingClientRect();
  return {
    photosInCard: card?.querySelectorAll(".size-14").length,
    photoInFirstBlock: !!photo,
    besideTitle: !!pr && !!tr && pr.left > tr.right - 1 && pr.top < tr.bottom && pr.bottom > tr.top,
    src: photo?.querySelector("img")?.getAttribute("src") ?? photo?.getAttribute("src") ?? "",
    text: first?.textContent ?? "",
  };
});
check("C13: one tour thumbnail, in the tour info block, beside the title", c13.photosInCard === 1 && c13.photoInFirstBlock && c13.besideTitle, JSON.stringify({ ...c13, text: undefined }));
// Compared with the gift C14 ticket thumbnail once the samples exist (below).
const c13Photo = await style("main section.shadow-surface .size-14");
check("C13 first block still holds title, reference, both labels and the meeting row", /^Lucerne old-town walk/.test(c13.text) && /Booking reference SK-T/.test(c13.text) && /Confirmed/.test(c13.text) && /Deposit paid/.test(c13.text) && /Where to meet: Chapel Bridge/.test(c13.text));
check("C13 card keeps C07's surface", same(await style("main section.shadow-surface"), giftC07Card, ["border", "radius", "shadow", "bg"]));
const inCard = await page.evaluate(() => !!document.querySelector("main section[aria-labelledby=booking-total] section.shadow-surface button"));
check("C13 unchanged: Pay still sits inside its money card (C07)", inCard);
const heights = await page.evaluate(() => [...document.querySelectorAll("main section[aria-labelledby=booking-total] :is(a, button)")].map((el) => el.getBoundingClientRect().height));
check("C13 unchanged: Pay, Add to calendar and View booking the same height", heights.length === 3 && new Set(heights).size === 1, heights.join(", "));
await lang("DE");
await shot("2.8-r3", "c13-tour-de");
await lang("EN");
// Pay later.
await go("/tours/lake-lucerne-stories/book");
await page.locator(".radio").filter({ hasText: "17 Oct" }).click(); await wait(300);
await page.getByRole("button", { name: /Review booking/ }).last().click(); await wait(800);
await page.getByLabel("Contact name").fill("Anna Keller");
await page.getByLabel("Mobile number").fill("+41 79 123 45 67");
await page.locator("form button[type=submit]").click(); await wait(1500);
check("C13 pay later: one thumbnail in the info block", (await page.locator("main section.shadow-surface").first().locator(".size-14").count()) === 1);
await shot("2.8-r3", "c13-pay-later-tour-en");
await lang("DE");
await shot("2.8-r3", "c13-pay-later-tour-de");
await lang("EN");

// --- 2.9: samples on a fresh store (the C07 request above would shift the sample ids) ---------
await fresh();
await control("Add sample orders in every state");
await control("Add sample tour bookings in every state");
await go("/account/orders/sk-1044");
const giftTicket = await style('section[aria-labelledby="order-headline"]');

// C14 gift: "no need border around the card from Coming up … use light box-shadow"; "the past
// orders section should be wrapped into a light box-shadow white box".
await go("/account?tab=orders");
await shot("2.9-r3", "c14-gift-en");
const giftRow = await style("#orders-open + ul a");
const giftPastBox = await style("#orders-past + ul");
const giftPastRow = await style("#orders-past + ul a");
const giftHeading = await style("#orders-open");
const giftTicketPhoto = await style("#orders-open + ul a .size-14");
check("C13 thumbnail styled as the gift C14/C15 ticket thumbnail (56px, same radius)", same(c13Photo, giftTicketPhoto, ["radius", "size"]) && c13Photo.size === "56x56", show(c13Photo, giftTicketPhoto));
check("gift C14 Coming up: no border, the shared shadow (as the C15 ticket)", giftRow?.border.startsWith("0px") && giftRow.shadow === giftTicket?.shadow && giftRow.shadow !== "none", show(giftRow, giftTicket));
check("gift C14 Past: one white box with the shared shadow, no border", giftPastBox?.border.startsWith("0px") && giftPastBox.shadow === giftTicket?.shadow && giftPastBox.bg === giftTicket?.bg, JSON.stringify(giftPastBox));
check("gift C14 Past: items stay rows inside the box", (await page.locator("#orders-past + ul > li").count()) === 3 && giftPastRow?.shadow === "none", JSON.stringify(giftPastRow));

// C14 tour: same surface, Coming up and Past as on Your orders, a price on each item.
await go("/account?tab=bookings");
await shot("2.9-r3", "c14-tour-en");
const tourRow = await style("#bookings-open + ul a");
check("tour C14 ticket surface equals the gift C14 ticket (no border, same shadow and radius)", same(tourRow, giftRow, ["border", "radius", "shadow", "bg"]), show(tourRow, giftRow));
check("tour C14 Past box equals the gift Past box", same(await style("#bookings-past + ul"), giftPastBox, ["border", "radius", "shadow", "bg", "padding"]));
check("tour C14 Past rows equal the gift Past rows", same(await style("#bookings-past + ul a"), giftPastRow, ["border", "radius", "shadow", "padding"]));
check("tour C14 headings: 'Coming up' and 'Past bookings', in the gift heading style", (await page.locator("#bookings-open").innerText()) === "Coming up" && (await page.locator("#bookings-past").innerText()) === "Past bookings" && same(await style("#bookings-open"), giftHeading, ["font"]));
const groups = await page.evaluate(() => {
  const ids = (sel) => [...document.querySelectorAll(sel)].map((a) => ({ id: a.getAttribute("href").split("/").pop(), text: a.innerText.replace(/[  ]/g, " ") }));
  return { open: ids("#bookings-open + ul a"), past: ids("#bookings-past + ul a") };
});
const bookings = (await store()).data.tours.bookings;
const byId = (id) => bookings.find((b) => b.id === id);
const closed = ["expired", "cancelled", "completed", "no_show"];
check("tour C14 grouping: open bookings under Coming up, closed under Past, none missing", groups.open.every((r) => !closed.includes(byId(r.id).status)) && groups.past.every((r) => closed.includes(byId(r.id).status)) && groups.open.length + groups.past.length === bookings.filter((b) => b.guestId === "g-anna").length, `open ${groups.open.map((r) => byId(r.id).ref).join(",")} | past ${groups.past.map((r) => byId(r.id).ref).join(",")}`);
check("tour C14 Coming up: soonest departure first", groups.open.every((r, i, a) => i === 0 || byId(a[i - 1].id).startsAt <= byId(r.id).startsAt));
const priced = [...groups.open, ...groups.past].map((r) => ({ ref: byId(r.id).ref, ok: r.text.includes(`CHF ${(byId(r.id).total / 100).toFixed(2)}`) }));
check("tour C14: every item shows its booking total", priced.every((p) => p.ok), priced.map((p) => `${p.ref}${p.ok ? "" : " missing"}`).join(", "));
check("tour C14: every item has a thumbnail", (await page.locator("#bookings-open + ul a .size-14, #bookings-past + ul a .size-14").count()) === groups.open.length + groups.past.length);
await lang("DE");
await shot("2.9-r3", "c14-tour-de");
check("tour C14 DE headings", (await page.locator("#bookings-open").innerText()) === "Demnächst" && (await page.locator("#bookings-past").innerText()) === "Vergangene Buchungen");
await lang("EN");
// Keyboard: Tab reaches the first booking ticket, which shows a focus ring only while focused.
await page.evaluate(() => { document.activeElement?.blur(); window.scrollTo(0, 0); });
let reached = false;
for (let i = 0; i < 60 && !reached; i++) {
  await page.keyboard.press("Tab");
  reached = await page.evaluate(() => !!document.activeElement?.getAttribute("href")?.includes("/account/bookings/"));
}
const ring = () => page.evaluate(() => { const s = getComputedStyle(document.activeElement); return `${s.outlineStyle} ${s.outlineWidth} | ${s.boxShadow}`; });
const focused = reached ? await ring() : "";
const visible = reached && (await page.evaluate(() => document.activeElement.matches(":focus-visible")));
await page.screenshot({ path: `${SCREENS}/2.9-r3/c14-tour-focus-en.png` });
await page.evaluate(() => { window.__row = document.activeElement; document.activeElement.blur(); });
await wait(300);
const blurred = await page.evaluate(() => { const s = getComputedStyle(window.__row); return `${s.outlineStyle} ${s.outlineWidth} | ${s.boxShadow}`; });
check("keyboard: C14 tour ticket reachable by Tab with a visible focus ring", reached && visible && focused !== blurred, `focused ${focused} / blurred ${blurred}`);

// --- 2.9: C16 against C15 ("why don't have the tab-like style as on the order detail screens") -
const tabBar = () => page.evaluate(() => {
  const list = document.querySelector('[role="tablist"]');
  let container = list;
  while (container && getComputedStyle(container).position !== "sticky") container = container.parentElement;
  const sel = list?.querySelector('[role="tab"][aria-selected="true"]');
  const s = (el) => el && getComputedStyle(el);
  return {
    labels: [...(list?.querySelectorAll('[role="tab"]') ?? [])].map((t) => t.textContent.trim()).join("|"),
    sticky: `${s(container)?.position} ${s(container)?.top}`,
    tab: sel && `${s(sel).height} ${s(sel).fontSize} ${s(sel).fontWeight} ${s(sel).color}`,
    panel: (() => { const p = document.querySelector('[role="tabpanel"]'); return p && `${s(p).paddingTop} ${s(p).paddingLeft}`; })(),
  };
});
// Where Pay and the headline sit: the card that holds the date tile (the ticket).
const inTicket = (sel) => page.evaluate((sel) => {
  const el = document.querySelector(sel);
  const card = el?.closest("section.shadow-surface, section[aria-labelledby=order-headline]");
  return !!card?.querySelector(".w-14") && !el.closest('[role="tabpanel"]');
}, sel);
await go("/account/orders/sk-1044");
await shot("2.9-r3", "c16-deadline-gift-en");
const giftBar = await tabBar();
const giftPayInTicket = await inTicket('section[aria-labelledby="order-headline"] a[href*="/pay"]');
await go(`/account/bookings/${await tourId("SK-T1042")}`);
await shot("2.9-r3", "c16-deadline-tour-en");
const tourBar = await tabBar();
check("C16 has C15's tab bar: same four labels, sticky under the top bar, same tab and panel style", JSON.stringify(tourBar) === JSON.stringify(giftBar), show(tourBar, giftBar));
check("C16 ticket surface equals the C15 ticket", same(await style("main section.shadow-surface"), giftTicket, ["border", "radius", "shadow", "bg"]));
check("C16 Pay sits where C15 puts it: in the ticket, above the tabs", giftPayInTicket && (await inTicket("main section.shadow-surface button")) && /Pay remaining balance · CHF\s156\.10/.test(await page.locator("main section.shadow-surface").first().innerText()));
check("C16 deadline headline in the ticket (overdue sentence)", /Balance due by[\s\S]*The balance deadline has passed/.test((await page.locator("main section.shadow-surface").first().innerText())));
check("C16: one tour photo on the page (no duplicate)", (await page.locator("main .size-14").count()) === 1);
const facts = await style('[role="tabpanel"] dl');
await go("/account/orders/sk-1044");
const giftFacts = await style('[role="tabpanel"] dl');
const giftFact = await style('[role="tabpanel"] dl > div');
await go(`/account/bookings/${await tourId("SK-T1042")}`);
check("C16 Overview facts card equals C15's pickup card (surface and 16px rows)", same(facts, giftFacts, ["border", "radius", "shadow", "bg"]) && same(await style('[role="tabpanel"] dl > div'), giftFact, ["padding"]), show(facts, giftFacts));
check("C16 Overview: Booking total card has no Pay (moved to the ticket)", (await page.locator('[role="tabpanel"] section[aria-labelledby=booking-total] button').count()) === 0 && /Remaining balance\s+CHF\s156\.10/.test(await page.locator('[role="tabpanel"]').innerText()));
await lang("DE");
await shot("2.9-r3", "c16-deadline-tour-de");
check("C16 DE tab labels equal C15's", (await tabBar()).labels === TABS.DE.join("|"));
await lang("EN");
// Empty Progress (seeded booking without events).
await tab(2);
check("C16 Progress without events: heading and the empty line, no empty tab", /Booking activity\s+No activity recorded yet\./.test(await page.locator('[role="tabpanel"]').innerText()));
await tab(0);
await both("2.9-r3", "c16-progress-empty-tour", 2);

// Balance after the service: gift handed over (SK-1048) vs tour delivered (SK-T904), each tab.
await go("/account/orders/sk-1048");
await shot("2.9-r3", "c16-balance-gift-en");
for (const [i, name] of [[1, "payments"], [3, "policy"]]) {
  await go(`/account/orders/sk-1048?tab=${["overview", "payments", "timeline", "policy"][i]}`);
  await shot("2.9-r3", `c16-${name}-gift-en`);
}
const giftPolicyCard = await style('[role="tabpanel"] dl');
await go(`/account/bookings/${await tourId("SK-T904")}`);
await both("2.9-r3", "c16-balance-tour");
check("C16 balance: Pay remaining balance in the ticket", await inTicket("main section.shadow-surface button"));
await both("2.9-r3", "c16-payments-tour", 1);
await tab(3);
check("C16 Policy: both policies and the contact, as C15's Policy tab", /Payment policy[\s\S]*Cancellation policy[\s\S]*Contact the organiser[\s\S]*Email[\s\S]*Call/.test(await page.locator('[role="tabpanel"]').innerText()) && same(await style('[role="tabpanel"] section.shadow-surface'), giftPolicyCard, ["border", "radius", "shadow", "bg"]));
await tab(0);
await both("2.9-r3", "c16-policy-tour", 3);

// Progress: gift SK-1050 vs tour SK-T903 (logged events).
await go("/account/orders/sk-1050?tab=timeline");
await shot("2.9-r3", "c16-progress-gift-en");
const giftOl = await style("main ol[aria-label]");
await go(`/account/bookings/${await tourId("SK-T903")}`);
await tab(2);
check("C16 Progress: the gift stepper card", same(await style("main ol[aria-label]"), giftOl, ["border", "radius", "shadow", "padding"]));
await tab(0);
await both("2.9-r3", "c16-progress-tour", 2);

// Expired with money after it: gift SK-1050 vs tour SK-T903 (headline and rebook in the ticket).
await go("/account/orders/sk-1050");
await shot("2.9-r3", "c16-expired-reconciliation-gift-en");
await go(`/account/bookings/${await tourId("SK-T903")}`);
check("C16 expired: headline and rebook in the ticket, reconciliation note under it, above the tabs", (await inTicket("#booking-expired")) && (await page.getByRole("button", { name: "Check availability again" }).count()) === 1 && (await page.evaluate(() => { const n = document.querySelector('main [role="status"]'); return !!n && !n.closest("section.shadow-surface") && !n.closest('[role="tabpanel"]'); })));
await both("2.9-r3", "c16-expired-reconciliation-tour");
await go(`/account/bookings/${await tourId("SK-T902")}`);
await both("2.9-r3", "c16-expired-tour");

// Held: Finish payment in the ticket, the hold timer as a note under it.
await go(`/account/bookings/${await tourId("SK-T901")}`);
check("C16 held: Finish payment in the ticket, timer note above the tabs", (await inTicket("main section.shadow-surface button")) && /Finish payment · CHF\s89\.00/.test(await page.locator("main section.shadow-surface").first().innerText()) && /Places reserved for/.test(await text()));
await both("2.9-r3", "c16-held-tour");

// No-show: note above the tabs, no pay action.
await go(`/account/bookings/${await tourId("SK-T906")}`);
check("C16 no-show: note above the tabs, nothing to pay, no review", (await page.locator("main section.shadow-surface").first().locator("button").count()) === 0 && /no-show/i.test(await text()));
await both("2.9-r3", "c16-no-show-tour");

// Posted review: gift completed (SK-1012) vs tour completed (SK-T905); the review sits in the ticket.
await go(`/account/bookings/${await tourId("SK-T905")}`);
check("C16 completed: Write a review in the ticket, as C15", await inTicket("main section.shadow-surface button"));
await both("2.9-r3", "c16-completed-tour");
await go("/account/orders/sk-1012");
await postReview("Lovely chocolates, picked up without a wait.");
await shot("2.9-r3", "c16-reviewed-gift-en");
const giftInset = await style('main section[aria-label^="Your review"]');
await go(`/account/bookings/${await tourId("SK-T905")}`);
await postReview("Great walk, our guide knew every façade.");
await shot("2.9-r3", "c16-reviewed-tour-en");
check("C16 posted review: the gift 1.13t inset, inside the ticket as on C15", same(await style('main section[aria-label^="Your review"]'), giftInset, ["border", "radius", "shadow", "bg", "padding"]) && (await inTicket('main section[aria-label^="Your review"]')));
await lang("DE");
await shot("2.9-r3", "c16-reviewed-tour-de");
await lang("EN");

console.log(`\nRESULT ${pass} passed, ${fail} failed`);
await browser.close();
process.exitCode = fail ? 1 : 0;
