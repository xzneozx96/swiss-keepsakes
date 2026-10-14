// 5.14 Phase 5 acceptance drive: AC11, AC12, AC13, S5, S9 (commission part), S12, at 375px.
// Runs on the private no-HMR copy (port 5232, hidden prototype controls restored), like 2.15:
//   node 5.14-phase5.mjs en|de
import { start } from "./2.15-lib.mjs";

const L = process.argv[2] === "de" ? "de" : "en";
const t = await start(L);
const { page, T, check, wait, text, has, go, store, patch, reset, viewAs, shot, finish } = t;
const ROLE = { owner: "Merchant · Owner", manager: "Merchant · Store Manager", partner: "Partner", guest: "Guest" };
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const pattern = (key) => new RegExp(esc(T(key)).replace(/\\\{\w+\\\}/g, ".+"));
const button = (name) => page.getByRole("button", { name, exact: true });
const dialog = () => page.getByRole("dialog").last();
// Full-page shots from the top, so the sticky header sits where it belongs; the fixed bottom
// nav is hidden for the capture, since a full-page shot would paint it over mid-page content.
const snap = async (name) => {
  await page.evaluate(() => {
    window.scrollTo(0, 0);
    for (const el of document.querySelectorAll("body *")) {
      const cs = getComputedStyle(el);
      if (cs.position === "fixed" && cs.bottom === "0px" && el.getBoundingClientRect().height < 120) el.dataset.snapHidden = el.style.visibility = "hidden";
    }
  });
  await wait(300); await shot(name);
  await page.evaluate(() => document.querySelectorAll("[data-snap-hidden]").forEach((el) => { el.style.visibility = ""; delete el.dataset.snapHidden; }));
};
// Amounts read off the screen, to compare the same figure across M15, M16, P02 and M21.
const CHF = "CHF\\s?[\\d’'.,]+";
const amountAfter = (body, label) => body.match(new RegExp(esc(label) + "\\s*(" + CHF + ")"))?.[1] ?? null;
const amountIn = (body, key) => body.match(new RegExp(esc(T(key)).replace(esc("{amount}"), "(" + CHF + ")")))?.[1] ?? null;
// The text of one partner's block: from its name to the next partner's name.
const NAMES = ["Hotel am See", "Guide Marco", "Guide Sophie"];
const block = (body, name) => {
  const from = body.indexOf(name);
  const ends = NAMES.filter((n) => n !== name).map((n) => body.indexOf(n, from + 1)).filter((i) => i > from);
  return from < 0 ? "" : body.slice(from, ends.length ? Math.min(...ends) : undefined);
};
const same = (values) => values.every((v) => v !== null && v === values[0]);
const seen = {};
const enterCode = async (code) => { await page.locator("#sign-in-code").fill(code); await wait(1200); };

await reset();

// ---- AC11: a partner link records the visit; the source is locked on the order ----
await go("/r/MARCO"); await wait(600);
let s = await store();
check("AC11 /r/MARCO records a Guide Marco visit", s.data.referralVisits.at(-1)?.partnerId === "guide-marco");
check("AC11 the guest lands on the home page, nothing says 'referred'", (await page.evaluate(() => location.hash)) === "#/");
await viewAs(ROLE.owner);
await go("/store/orders/sk-1033"); await wait(800);
check("AC11 M04 shows the order's partner source (SK-1033 → Guide Marco)", await has("Guide Marco"));
await patch(`s.data.partners.find((p) => p.id === "guide-sophie").archivedAt = "2026-10-13T08:00:00.000Z";`);
const before = (await store()).data.referralVisits.length;
await go("/r/SOPHIE"); await wait(600);
check("D17 an archived partner's QR link no longer credits the visit", (await store()).data.referralVisits.length === before);
await patch(`delete s.data.partners.find((p) => p.id === "guide-sophie").archivedAt;`);

// ---- M15 ----
await viewAs(ROLE.owner);
await go("/store/partners"); await wait(900);
const m15list = await text("main");
seen.marcoToPay = [amountAfter(block(m15list, "Guide Marco"), T("merchantPartners.toPay"))];
seen.hotelOffset = [amountAfter(block(m15list, "Hotel am See"), T("merchantPartners.toOffset"))];
check("M15 lists the three partners", (await has("Hotel am See")) && (await has("Guide Marco")) && (await has("Guide Sophie")));
// The label is uppercased by CSS, so compare without case.
const m15 = (await text("main")).toLowerCase();
check("M15 wording is link opens, never scans", m15.includes(T("merchantPartners.opens.short").toLowerCase()) && !/\bscans?\b/.test(m15));
await snap("5.14-m15");
// Empty state: no partner is archived.
await page.getByRole("row", { name: new RegExp("^" + esc(T("merchantPartners.filter.archived"))) }).click(); await wait(500);
check("M15 empty filter says so", await has(T("merchantPartners.emptyFilter", { filter: T("merchantPartners.filter.archived") })));
await page.getByRole("row", { name: new RegExp("^" + esc(T("merchantPartners.filter.all"))) }).click(); await wait(400);
await page.getByRole("tab", { name: T("merchantPartners.view.analytics") }).click(); await wait(900);
await snap("5.14-m15-analytics");
const m15compare = (await text("main")).split(T("partnerAnalytics.compare.title")).pop();
seen.hotelCommission = [amountAfter(block(m15compare, "Hotel am See"), T("partnerAnalytics.compare.commission"))];

// ---- AC13, S9 (commission part): the refund, the overpayment and its offsets ----
await go("/store/partners/hotel-am-see"); await wait(900);
check("M16 Hotel am See: nothing to pay while an overpayment is offset", await has(pattern("partnerDetail.next.offset")));
seen.hotelOffset.push(amountIn(await text("main"), "partnerDetail.next.offset"));
check("M16 ledger shows the refund adjustment and the offsets", (await has(pattern("partnerDetail.ledger.adjustment"))) && (await has(pattern("partnerDetail.ledger.offset"))));
await snap("5.14-m16-ledger");
await page.getByRole("tab", { name: T("partnerDetail.tabs.transactions") }).click(); await wait(500);
check("S9 the refunded order is 'Adjusted for refund', rate kept, no new charge to the partner", await has(T("partnerDetail.state.adjusted")));
await snap("5.14-m16-hotel");

// ---- AC13, S5: Owner records a payout (Guide Marco) ----
await go("/store/partners/guide-marco"); await wait(900);
seen.marcoToPay.push(amountAfter(await text("main"), T("merchantPartners.toPay")));
await page.getByRole("tab", { name: T("partnerDetail.tabs.links") }).click(); await wait(400);
await snap("5.14-m16-links");
// Keyboard: the sheet takes focus, Escape closes it and gives focus back to the button.
await button(T("partnerDetail.next.payButton")).focus(); await page.keyboard.press("Enter"); await wait(800);
check("Keyboard: the payout sheet opens with focus inside it", await page.evaluate(() => !!document.activeElement?.closest("[role=dialog]")));
await page.keyboard.press("Escape"); await wait(600);
check("Keyboard: Escape closes it and focus returns to 'Record as paid'", (await page.getByRole("dialog").count()) === 0 && (await page.evaluate(() => document.activeElement?.textContent?.trim())) === T("partnerDetail.next.payButton"));
await button(T("partnerDetail.next.payButton")).click(); await wait(800);
check("Payout sheet: amount defaults to what is still owed (CHF 49.60)", (await dialog().getByRole("textbox").first().inputValue()).includes("49.60"));
seen.marcoToPay.push(amountAfter(await dialog().innerText().then((x) => x.replace(/\s+/g, " ")), T("payout.owed")));
check("Same numbers: Guide Marco's still to pay on M15, M16 and the payout sheet", same(seen.marcoToPay) && seen.marcoToPay[0] === "CHF 49.60", seen.marcoToPay.join(" / "));
await shot("5.14-payout-sheet", { full: false });
// Validation: paying more than is owed needs a note (NumberField commits on Tab).
const amountField = dialog().getByRole("textbox").first();
await amountField.click(); await amountField.press("ControlOrMeta+a"); await amountField.fill("60"); await amountField.press("Tab"); await wait(400);
await dialog().getByRole("button", { name: pattern("payout.confirm") }).click(); await wait(500);
check("Validation: above what is owed asks for a note and records nothing", (await has(T("payout.noteRequired"))) && (await page.getByRole("dialog").count()) === 1);
await amountField.click(); await amountField.press("ControlOrMeta+a"); await amountField.fill("49.60"); await amountField.press("Tab"); await wait(400);
// After the shot: its viewport resize remounts the sheet.
await dialog().getByRole("textbox").last().fill("Transfer 13 Oct");
await dialog().getByRole("button", { name: pattern("payout.confirm") }).click(); await wait(1000);
check("S5 after the Owner's payout Guide Marco is settled", await has(T("partnerDetail.next.settled")));
await page.reload(); await wait(1200);
check("Refresh: the payout is kept", await has(T("partnerDetail.next.settled")));
// A hash jump between partners keeps M16 mounted, so its last tab (Transactions) stays selected.
await page.getByRole("tab", { name: T("partnerDetail.tabs.ledger") }).click(); await wait(400);
check("S5 the ledger keeps who recorded it and the reference", (await has("Transfer 13 Oct")) && (await has(pattern("partnerDetail.ledger.recordedBy"))));

// ---- S5: the Store Manager records a payout but cannot revoke (R10, Q5) ----
await viewAs(ROLE.manager);
await go("/store/partners/guide-sophie"); await wait(900);
await button(T("partnerDetail.next.payButton")).click(); await wait(800);
await dialog().getByRole("button", { name: pattern("payout.confirm") }).click(); await wait(1000);
check("S5 the Store Manager's payout settles Guide Sophie", await has(T("partnerDetail.next.settled")));
check("S5 the payout is recorded by Lukas", await has("Lukas"));
await page.getByRole("tab", { name: T("partnerDetail.tabs.links") }).click(); await wait(400);
// As buttons: in German the revoke label equals the "link revoked" status chip.
check("R10 the Store Manager sees no revoke or reissue", (await button(T("partnerDetail.revoke.button")).count()) === 0 && (await button(T("partnerDetail.issue.button")).count()) === 0 && (await has(T("partnerDetail.links.ownerOnly"))));

// ---- AC12, S5: the partner report needs the emailed code; own transactions only, no contact data ----
await viewAs(ROLE.partner);
await go("/partner"); await wait(1000);
check("AC12 the report link asks for a code first", (await has(T("partnerAccess.start.title"))) && (await has("g***@hotel-am-see.example")));
await shot("5.14-p01", { full: false });
await button(T("partnerAccess.start.send")).click(); await wait(800);
s = await store();
check("N19 is sent to the partner", s.data.mail.some((m) => m.to === "partner" && m.template === "N19" && m.partnerId === "hotel-am-see"));
await enterCode("000000");
check("AC12 a wrong code is refused", await has(T("auth.code.wrong")));
await shot("5.14-p01-wrong", { full: false });
await enterCode("123456");
const p02 = await text("main");
check("AC12 the right code opens P02", p02.includes(T("partnerReport.number.paid")));
const guests = s.data.guests.map((g) => g.email);
check("AC12 P02 shows no guest email, phone, engraving or notes", !guests.some((e) => p02.includes(e)) && !/\+41|\+49/.test(p02) && !p02.includes("Papa"));
check("AC12 P02 shows only Hotel am See's transactions", p02.includes("SK-1017") && !p02.includes("SK-1033") && !p02.includes("SK-1004"));
check("AC13 P02 shows payments, the refund and the offsets", (await has(T("partnerReport.payments.heading"))) && (await has(pattern("partnerReport.payments.adjustment"))) && (await has(T("partnerReport.payments.stillToOffset"))));
seen.hotelOffset.push(amountAfter(p02.split(T("partnerReport.payments.heading")).pop(), T("partnerReport.payments.stillToOffset")));
check("Same numbers: Hotel am See's still to offset on M15, M16 and P02", same(seen.hotelOffset) && seen.hotelOffset[0] === "CHF 11.10", seen.hotelOffset.join(" / "));
check("D16 P02 never shows a negative commission", !/CHF\s?-/.test(p02) && (await has(pattern("partnerReport.number.earned.hintRefund"))));
await snap("5.14-p02");
// A period switch keeps the scroll position (owner, 14 Oct).
await page.evaluate(() => window.scrollTo(0, 700)); await wait(300);
await page.getByRole("tab", { name: T("partnerReport.period.week") }).click(); await wait(900);
check("P02 switching the period keeps the scroll position", (await page.evaluate(() => window.scrollY)) >= 650);
await go("/partner/s9Hd3nQe"); await wait(800);
check("AC12 a revoked report link does not open", await has(T("partnerAccess.invalid.title")));
await shot("5.14-p01-revoked", { full: false });
await go("/partner/r7Kq2mVx"); await wait(800);
check("R10 the session opens P02 again without a code", (await text("main")).includes(T("partnerReport.number.paid")));

// ---- S12: reports keep money apart, call opens opens, and margin needs complete costs ----
await viewAs(ROLE.owner);
await go("/store/reports"); await wait(1000);
for (const k of ["value", "collected", "outstanding", "refunds", "commission"]) {
  check(`S12 money card '${k}' stands on its own`, await has(T(`reports.money.${k}`)));
}
check("S12 goods and tours are shown apart", await has(pattern("reports.money.goods")) && await has(pattern("reports.money.tours")));
await snap("5.14-m21-money");
await go("/store/reports?source=hotel-am-see"); await wait(1200);
seen.hotelCommission.push(amountAfter(await text("main"), T("reports.money.commission")));
check("Same numbers: Hotel am See's 30-day commission on M21 (source filter) and M15 Analytics", same(seen.hotelCommission), seen.hotelCommission.join(" / "));
await go("/store/reports"); await wait(1200);
// Keyboard: arrow keys move between the report tabs.
await page.getByRole("tab", { name: T("reports.tabs.money") }).focus(); await page.keyboard.press("ArrowRight"); await wait(600);
check("Keyboard: ArrowRight selects the Funnel tab", (await page.getByRole("tab", { name: T("reports.tabs.funnel") }).getAttribute("aria-selected")) === "true");
await page.getByRole("tab", { name: T("reports.tabs.funnel") }).click(); await wait(800);
check("S12 the funnel starts at visits (QR, links, direct), not scans", await has(T("reports.funnel.visits")));
check("S12 partial tracking is stated, not filled with zeros", await has(pattern("reports.funnel.coverage")));
await snap("5.14-m21-funnel");
await page.getByRole("tab", { name: T("reports.tabs.products") }).click(); await wait(800);
await snap("5.14-m21-products");
await page.getByRole("tab", { name: T("reports.tabs.margin") }).click(); await wait(800);
const marginBefore = await text("main");
check("S12 margin only from complete costs: 79 of 84, 5 left out", marginBefore.includes(T("reports.margin.partial", { complete: 79, sales: 84, missing: 5 })));
check("S12 tours without complete costs say 'Not enough data'", marginBefore.includes(T("reports.margin.noData")));
await snap("5.14-m21-margin");

// M24: completing one sale's costs moves it into the margin (R14).
await go("/store/reports/costs"); await wait(1000);
check("M24 starts at 130 of 135 complete", await has(T("costData.meter", { complete: 130, total: 135 })));
await snap("5.14-m24");
await page.getByRole("button", { name: T("costData.enter"), exact: true }).first().click(); await wait(800);
const boxes = dialog().getByRole("checkbox");
for (let i = 0; i < (await boxes.count()); i++) {
  if (!(await boxes.nth(i).isChecked())) {
    const field = dialog().getByRole("textbox").nth(i);
    if (!(await field.inputValue())) await boxes.nth(i).check({ force: true });
  }
}
await wait(300);
await shot("5.14-m24-sheet", { full: false });
await dialog().getByRole("button", { name: T("costData.save"), exact: true }).click(); await wait(900);
check("M24 after entering the missing cost: 131 of 135", await has(T("costData.meter", { complete: 131, total: 135 })));
await page.reload(); await wait(1200);
check("Refresh: the entered cost is kept", await has(T("costData.meter", { complete: 131, total: 135 })));
await go("/store/reports?tab=margin"); await wait(1000);
check("S12 the margin now covers 80 of 84", await has(T("reports.margin.partial", { complete: 80, sales: 84, missing: 4 })));

// ---- Reset: the prototype control brings the Phase 5 data back to the seed ----
await t.control("Reset demo");
await page.keyboard.press("Escape"); await wait(400); // 4.4: a sheet can stay open after Reset
await viewAs(ROLE.owner);
await go("/store/partners/guide-marco"); await wait(1000);
check("Reset: Guide Marco owes CHF 49.60 again", (amountAfter(await text("main"), T("merchantPartners.toPay")) === "CHF 49.60") && (await button(T("partnerDetail.next.payButton")).count()) === 1);
await go("/store/partners/guide-sophie"); await wait(1000);
check("Reset: Guide Sophie's payout is gone", !(await has(T("partnerDetail.next.settled"))) && (await button(T("partnerDetail.next.payButton")).count()) === 1);
await go("/store/reports/costs"); await wait(1000);
check("Reset: M24 is back to 130 of 135", await has(T("costData.meter", { complete: 130, total: 135 })));
await viewAs(ROLE.partner);
await go("/partner"); await wait(1000);
check("Reset: the report link asks for a code again", await has(T("partnerAccess.start.title")));

await finish();
