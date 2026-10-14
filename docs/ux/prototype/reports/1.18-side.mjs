// 1.18 side paths (outline §1 table) + error and keyboard states, real screens: node side.mjs en|de
import { writeFileSync } from "node:fs";
import { start, OUT } from "./1.18-lib.mjs";
const L = process.argv[2] || "en";
const S = await start();
const { selectAll, cartContinue, page, T, check, text, mainText, shot, setLang, openBar, role, demo, setClock, closeToasts, go, mail } = S;
const sheet = () => page.getByRole("dialog").last();
const step = async (name, fn) => {
  try { await fn(); } catch (e) { check(`${name}: step ran without error`, false, e.message.split("\n")[0]); await page.screenshot({ path: `${OUT}/ERR-${name.replace(/\W+/g, "_")}-${L}.png` }); }
};
const M = "Merchant · Store Manager";
const altstadt = /Altstadt/;
const fresh = async () => {
  await go(""); await page.evaluate(() => localStorage.clear()); await go("");
  await setLang(L);
  await openBar(); await page.getByRole("button", { name: "Via Hotel am See QR" }).click(); await page.waitForTimeout(700);
};
async function add(slug, { variant, day, place = altstadt } = {}) {
  await go("#/gifts/" + slug);
  await page.getByRole("button", { name: T("detail.bar.add"), exact: true }).last().click();
  await sheet().waitFor();
  if (variant) await sheet().getByRole("row", { name: variant }).click();
  await sheet().getByRole("gridcell").filter({ hasText: new RegExp(`^${day}$`) }).first().click();
  await sheet().getByRole("radio", { name: place }).check({ force: true });
  await sheet().getByRole("button", { name: new RegExp("^" + T("detail.bar.add")) }).last().click();
  await page.waitForTimeout(600);
}
const signInGoogle = async () => {
  await go("#/account");
  if (await page.getByRole("button", { name: T("auth.google") }).count() === 0) await page.getByRole("button", { name: /Sign in|Anmelden/ }).first().click();
  await page.getByRole("button", { name: T("auth.google") }).click();
  await page.waitForTimeout(1500);
};
const send = async () => {
  await go("#/cart", 1300); await closeToasts();
  await cartContinue(); await page.waitForTimeout(1300); await closeToasts();
  const before = (await demo()).data.orders.length;
  await page.getByRole("button", { name: T("checkout.bar.send") }).click();
  await page.waitForTimeout(1400);
  return (await demo()).data.orders.slice(before).map((o) => o.ref);
};
const ord = async (ref) => (await demo()).data.orders.find((o) => o.ref === ref);
const m04 = async (ref) => { await go(`#/store/orders/${ref.toLowerCase()}`, 1300); await closeToasts(); };
const c15 = async (ref) => { await go(`#/account/orders/${ref.toLowerCase()}`, 1300); await closeToasts(); };
const accept = async (ref) => {
  await m04(ref);
  await page.getByRole("button", { name: T("merchantOrder.action.accept"), exact: true }).click();
  await sheet().waitFor(); await page.waitForTimeout(300);
  await sheet().getByRole("button", { name: new RegExp(`^(${T("merchantOrder.accept.confirmPayLater")}|${T("merchantOrder.accept.confirm", { amount: "X" }).split(" ")[0]} )`) }).click();
  await page.waitForTimeout(900);
};
const ctl = async (name) => { await openBar(); await page.getByRole("button", { name }).click(); await page.waitForTimeout(900); };
// Availability as the guest sees it: the C03 sheet's "N available" line for the default option.
const availUI = async (slug) => {
  await go("#/gifts/" + slug, 1200);
  await page.getByRole("button", { name: T("detail.bar.add"), exact: true }).last().click();
  await sheet().waitFor(); await page.waitForTimeout(300);
  const m = (await text(sheet())).match(/(\d+) (available|verfügbar)/);
  await page.keyboard.press("Escape"); await page.waitForTimeout(400);
  return m ? Number(m[1]) : NaN;
};

// ---- Setup A: knife + gift box + chocolate sent by Anna; merchant accepts all three
let knife, box, choc, chocBefore;
await step("setup A", async () => {
  await fresh();
  await add("kapellbruecke-pocket-knife", { variant: /Medium|Mittel/, day: 21 });
  await add("lucerne-gift-box", { day: 20 });
  await add("chocolate-set", { day: 20, place: /Bahnhof/ });
  await signInGoogle();
  const refs = await send();
  const d = await demo();
  [knife, box, choc] = ["p-knife", "p-giftbox", "p-chocolate"].map((p) => d.data.orders.find((o) => refs.includes(o.ref) && o.lines[0].productId === p).ref);
  check("setup: three orders sent", refs.length === 3, refs.join(","));
  chocBefore = await availUI("chocolate-set");
  await role(M);
});

// Pay-later gift (AC07)
await step("pay later", async () => {
  await m04(choc);
  await page.getByRole("button", { name: T("merchantOrder.action.accept"), exact: true }).click();
  await sheet().waitFor(); await page.waitForTimeout(300);
  const s = await text(sheet());
  check("pay-later: accept sheet says no payment requested now", s.includes(T("merchantOrder.accept.payLater", { amount: "CHF 24.00", due: "X" }).split(".")[0]), s.slice(0, 300));
  await shot("side-paylater-accept-sheet");
  const before = (await demo()).data.payments?.length;
  await sheet().getByRole("button", { name: T("merchantOrder.accept.confirmPayLater") }).click();
  await page.waitForTimeout(900);
  const o = await ord(choc);
  const t = await mainText();
  check("pay-later: 'Confirmed, being prepared · Pay later · CHF 24.00, due …'", o.status === "preparing" && t.includes(T("order.status.preparing")) && /24\.00/.test(t) && t.includes(T("order.payment.payLater", { amount: "X", due: "Y" }).split(" · ")[0]), t.slice(0, 300));
  check("pay-later: N05 sent, no payment created", (await mail()).some((x) => x.startsWith("N05>guest")) && (o.payments ?? []).length === 0);
  await shot("side-paylater-m04");
});

// Declined order: decline the knife, gift box unaffected
await step("decline", async () => {
  await m04(knife);
  await page.getByRole("button", { name: T("merchantOrder.action.decline"), exact: true }).click();
  await sheet().waitFor(); await page.waitForTimeout(300);
  await sheet().getByRole("radio", { name: T("merchantOrder.decline.reason.date") }).check({ force: true });
  await shot("side-decline-sheet");
  await sheet().getByRole("button", { name: T("merchantOrder.decline.submit") }).click();
  await page.waitForTimeout(600);
  const dlg = page.getByRole("alertdialog");
  check("decline: shared confirm dialog asks first", await dlg.count() === 1);
  const focused = await page.evaluate(() => document.activeElement?.textContent);
  check("decline: focus starts on 'Keep request'", (focused || "").includes(T("merchantOrder.decline.keep")), focused);
  await shot("side-decline-confirm");
  await dlg.getByRole("button", { name: T("merchantOrder.decline.confirm") }).click();
  await page.waitForTimeout(900);
  check("decline: knife declined, N06", (await ord(knife)).status === "declined" && (await mail()).some((x) => x.startsWith("N06>guest")));
  check("decline: gift box still requested", (await ord(box)).status === "requested");
  await role("Guest");
  await c15(knife);
  const t = await mainText();
  check("decline: guest sees 'Declined by seller' with the reason", t.includes(T("order.status.declined")) && t.includes(T("guestOrder.notice.declined.title")), t.slice(0, 400));
  await shot("side-decline-c15");
  const chocAfter = await availUI("chocolate-set");
  check("pay-later: stock still reserved after accept (C03 availability -1)", chocAfter === chocBefore - 1, `${chocBefore} → ${chocAfter}`);
  await role(M);
});

// Overdue first payment → cancelled, stock released, Request again re-sends through C06
await step("overdue", async () => {
  await accept(box);
  const heldBefore = (await demo());
  await role("Guest");
  const held = await availUI("lucerne-gift-box");
  await c15(box);
  await ctl("Expire this order’s payment deadline");
  const o = await ord(box);
  const t = await mainText();
  check("overdue: 'Cancelled · payment overdue'", o.status === "cancelled" && t.includes(T("order.status.cancelled.overdue")), t.slice(0, 300));
  check("overdue: N23 to guest and staff", (await mail()).filter((x) => x.startsWith("N23")).length === 2);
  check("overdue: Pay button gone", await page.getByRole("link", { name: /26\.70/ }).count() + await page.getByRole("button", { name: /26\.70/ }).count() === 0);
  check("overdue: chocolate order unchanged", (await ord(choc)).status === "preparing");
  await shot("side-overdue-c15", { full: true });
  const released = await availUI("lucerne-gift-box");
  check("overdue: stock released (C03 availability +1)", released === held + 1, `${held} → ${released}`);
  await c15(box);
  await page.getByRole("button", { name: T("guestOrder.action.requestAgain") }).click();
  await page.waitForTimeout(1200);
  check("overdue: Request again opens C04 with the gift box, nothing sent", /#\/cart$/.test(page.url()) && (await demo()).data.cart.length === 1 && (await demo()).data.orders.filter((x) => x.status === "requested" && x.guestId === "g-anna").length === 0, page.url());
  await closeToasts();
  await shot("side-request-again-c04");
  check("overdue: re-added line is not ticked by default (1.5d)", (await demo()).data.cart.every((l) => !l.selected));
  await cartContinue();
  await page.waitForTimeout(1300);
  check("overdue: Continue (signed in) → C06", /#\/cart\/review/.test(page.url()), page.url());
  const refs = await send();
  check("overdue: new request created through C06/C07", refs.length === 1 && /#\/cart\/sent/.test(page.url()), refs.join(","));
  box = refs[0];
});

// Guest cancels before paying, with confirm, stock released
await step("guest cancel", async () => {
  await role(M); await accept(box);
  const d0 = await demo();
  await role("Guest");
  const heldC = await availUI("lucerne-gift-box");
  await c15(box);
  await page.getByRole("button", { name: T("guestOrder.action.cancel") }).click();
  await page.waitForTimeout(500);
  const dlg = page.getByRole("alertdialog");
  const dt = await text(dlg);
  check("guest cancel: confirm says free, nothing to refund", dt.includes(T("guestOrder.cancel.body").slice(0, 40)), dt);
  await shot("side-guest-cancel-confirm");
  await page.keyboard.press("Escape"); await page.waitForTimeout(400);
  check("guest cancel: Esc keeps the order", (await ord(box)).status === "accepted");
  await page.getByRole("button", { name: T("guestOrder.action.cancel") }).click();
  await page.waitForTimeout(500);
  await page.getByRole("alertdialog").getByRole("button", { name: T("guestOrder.cancel.confirm") }).click();
  await page.waitForTimeout(900);
  const t = await mainText();
  check("guest cancel: 'Cancelled by you · Nothing paid'", t.includes(T("order.status.cancelled.byYou")) && t.includes(T("order.payment.none")), t.slice(0, 200));
  await shot("side-guest-cancelled");
  const relC = await availUI("lucerne-gift-box");
  check("guest cancel: stock released (C03 availability +1)", relC === heldC + 1, `${heldC} → ${relC}`);
});

// Payment fails → retry (N08); Processing → no second Pay; late provider result
let knife2;
await step("payment fail/processing/late", async () => {
  await go("#/cart");
  await add("kapellbruecke-pocket-knife", { variant: /Small|Klein/, day: 22 });
  [knife2] = await send();
  await role(M); await accept(knife2);
  await role("Guest"); await c15(knife2);
  await page.getByRole("link", { name: /54\.00|49\.00|\d+\.00/ }).filter({ hasText: /CHF/ }).first().click();
  await page.waitForTimeout(1300);
  await page.getByRole("button", { name: T("payment.choose.fail") }).click();
  await page.waitForTimeout(900);
  const f = await mainText();
  const focused = await page.evaluate(() => document.activeElement?.textContent);
  check("fail: 'Payment declined' + Try again focused, N08", f.includes(T("payment.failed.title")) && (focused || "").includes(T("payment.failed.retry")) && (await mail()).some((x) => x.startsWith("N08")), focused);
  await shot("side-payment-failed");
  await page.getByRole("button", { name: T("payment.failed.retry") }).click();
  await page.waitForTimeout(500);
  await page.getByRole("button", { name: T("payment.choose.processing") }).click();
  await page.waitForTimeout(1300);
  const p = await mainText();
  check("processing: C15 'Payment processing', no Pay, no Cancel", p.includes(T("order.payment.processing")) && await page.getByRole("button", { name: T("guestOrder.action.cancel") }).count() === 0 && await page.locator("a[href$='/pay']").count() === 0, p.slice(0, 300));
  await shot("side-payment-processing");
  await ctl("Expire this order’s payment deadline");
  await ctl("Provider confirms the payment");
  const o = await ord(knife2);
  const t = await mainText();
  check("late result: stays cancelled, 'Received after cancellation · awaiting reconciliation'", o.status === "cancelled" && t.includes(T("order.payment.afterCancellation")), t.slice(0, 400));
  check("late result: no N07/N21 for it", !(await mail()).some((x) => /^N0?7|^N21/.test(x) && x.includes(knife2)));
  await shot("side-late-result", { full: true });
});

// Last item race: seeded SK-1032 and SK-1033 want the one print
await step("last item race", async () => {
  await role(M);
  await accept("SK-1032");
  check("race: SK-1032 accepted", (await ord("SK-1032")).status === "accepted");
  await m04("SK-1033");
  const t = await mainText();
  check("race: SK-1033 shows the short line", t.includes(T("merchantOrder.stock.short", { available: 0, needed: 1 })), t.slice(0, 500));
  const n = (await mail()).length;
  await page.getByRole("button", { name: T("merchantOrder.action.accept"), exact: true }).click();
  await page.waitForTimeout(700);
  const t2 = await text();
  check("race: Accept names the short item, stays awaiting, no mail", (await ord("SK-1033")).status === "requested" && /Water Tower/.test(t2) && (await mail()).length === n, t2.slice(0, 300));
  await shot("side-race-m04");
  await shot("side-race-m04", { width: 1024 });
});

// Ready and fully paid → combined button (seeded SK-1025 is preparing and paid?)
await step("combined button", async () => {
  await role("Guest");
  await go("#/cart");
  await add("kapellbruecke-pocket-knife", { variant: /Large|Gross/, day: 23 });
  const [ref] = await send();
  await role(M); await accept(ref);
  await role("Guest"); await c15(ref);
  await page.locator("a[href$='/pay']").first().click(); await page.waitForTimeout(1300);
  await page.getByRole("button", { name: /^(Pay|Bezahlen|CHF)|CHF/ }).first().click(); await page.waitForTimeout(1500);
  const paidPrep = await ord(ref);
  check("combined: knife paid online and preparing", paidPrep.status === "preparing", paidPrep.status);
  await role(M);
  await m04(paidPrep.ref);
  await page.getByRole("button", { name: T("fulfilment.action.ready") }).click();
  await page.waitForTimeout(900);
  check("combined: only 'Handed over and complete'", await page.getByRole("button", { name: T("fulfilment.action.handOverAndComplete") }).count() === 1 && await page.getByRole("button", { name: T("fulfilment.action.handOver"), exact: true }).count() === 0);
  await shot("side-combined");
  await page.getByRole("button", { name: T("fulfilment.action.handOverAndComplete") }).click();
  await page.waitForTimeout(900);
  check("combined: completed in one step", (await ord(paidPrep.ref)).status === "completed");
});

// M08 duplicate + above balance on seeded SK-1021 (ready, CHF 62.30 owed)
await step("M08 duplicate", async () => {
  await m04("SK-1021");
  await page.getByRole("button", { name: T("fulfilment.action.record") }).first().click();
  await sheet().waitFor(); await page.waitForTimeout(400);
  const amount = sheet().getByRole("textbox", { name: T("recordPayment.amount") });
  await amount.fill("70"); await amount.press("Tab"); await page.waitForTimeout(400);
  const s1 = await text(sheet());
  check("M08: above balance blocked", /More than|Mehr als/.test(s1), s1.slice(0, 300));
  await shot("side-m08-above-balance");
  await amount.fill("20"); await amount.press("Tab"); await page.waitForTimeout(300);
  await sheet().getByRole("button", { name: /20\.00/ }).last().click();
  await page.waitForTimeout(900); await closeToasts();
  await page.getByRole("button", { name: T("fulfilment.action.record") }).first().click();
  await sheet().waitFor(); await page.waitForTimeout(400);
  const a2 = sheet().getByRole("textbox", { name: T("recordPayment.amount") });
  await a2.fill("20"); await a2.press("Tab"); await page.waitForTimeout(400);
  const s2 = await text(sheet());
  check("M08: same amount within 10 min shows duplicate warning", s2.includes(T("recordPayment.duplicate.title")), s2.slice(0, 400));
  await shot("side-m08-duplicate");
  await page.keyboard.press("Escape"); await page.waitForTimeout(500);
  const f = await page.evaluate(() => document.activeElement?.textContent);
  check("M08: Esc returns focus to Record payment", (f || "").includes(T("fulfilment.action.record")), f);
});

// Stock changed on send
await step("stock changed", async () => {
  await role("Guest");
  await add("lucerne-gift-box", { day: 22 });
  await go("#/cart", 1200); await closeToasts();
  await cartContinue(); await page.waitForTimeout(1200);
  await ctl("Make an item sell out");
  await go("#/cart/review", 1200);
  const before = JSON.stringify((await demo()).data.cart);
  await page.getByRole("button", { name: T("checkout.bar.send") }).click();
  await page.waitForTimeout(900);
  const a = await text(page.getByRole("alert").first());
  check("stock changed: error names the item and keeps the cart", a.includes(T("checkout.error.stock.title")) && /gift box|Geschenkbox/i.test(a) && JSON.stringify((await demo()).data.cart) === before, a);
  await shot("side-stock-changed");
});

// C04 nothing ticked: Continue explains and focuses Select all (1.5d)
await step("cart nothing ticked", async () => {
  await go("#/cart", 1200); await closeToasts();
  await selectAll(false);
  await page.getByRole("button", { name: T("cart.bar.continue"), exact: true }).last().click();
  await page.waitForTimeout(500);
  const t = await text();
  const f = await page.evaluate(() => document.activeElement?.closest("[data-select-all]") !== null);
  check("C04 nothing ticked: reason shown, focus on Select all, no navigation", t.includes(T("cart.bar.noneSelected")) && f && /#\/cart$/.test(page.url()), page.url());
  await shot("side-cart-none-ticked");
});

// C04 invalid date
await step("cart invalid date", async () => {
  await ctl("Make a cart date too early");
  await closeToasts();
  const t = await mainText();
  check("C04 invalid date: reason + earliest date offered", t.includes(T("cart.invalid.earliest", { date: "" }).split(" ")[0]) && /can no longer be requested|nicht mehr möglich/.test(t), t.slice(0, 400));
  await cartContinue();
  await page.waitForTimeout(500);
  const f = await page.evaluate(() => document.activeElement?.textContent);
  check("C04 invalid date: Continue focuses the fix button", /instead|stattdessen/i.test(f || ""), f);
  await shot("side-cart-invalid-date");
});

// Missing translation: print in DE
await step("missing translation", async () => {
  await go("#/gifts/limited-edition-print", 1400);
  const t = await mainText();
  if (L === "de") check("print in DE: English text with language notice, UI stays German", /Text auf Englisch|auf Englisch/i.test(t) && /Water Tower/.test(t) && /Drucke|Bewertungen/.test(t), t.slice(0, 500));
  else check("print in EN: no language notice", !/only in German/.test(t));
  await shot("side-print", { full: true });
});

// Sign-in error states: expired 999999, lock after 5
await step("sign-in errors", async () => {
  await go("#/account");
  await page.getByRole("button", { name: /Sign out|Abmelden/ }).click(); await page.waitForTimeout(500);
  await page.getByRole("button", { name: /Sign in|Anmelden/ }).first().click(); await sheet().waitFor();
  await sheet().getByRole("button", { name: T("auth.email.send") }).click(); await page.waitForTimeout(500);
  await page.locator("#sign-in-code").focus(); await page.keyboard.type("999999"); await page.waitForTimeout(800);
  check("sign-in: 999999 expired", (await text(sheet())).includes(T("auth.code.sendNew")));
  await shot("side-signin-expired");
  await sheet().getByRole("button", { name: T("auth.code.sendNew") }).click(); await page.waitForTimeout(500);
  for (let i = 0; i < 5; i++) { await page.locator("#sign-in-code").focus(); for (let k = 0; k < 6; k++) await page.keyboard.press("Backspace"); await page.keyboard.type("000000"); await page.waitForTimeout(500); }
  const s = await text(sheet());
  check("sign-in: locked after 5 wrong codes", /Too many|Zu viele/.test(s), s.slice(0, 300));
  await shot("side-signin-locked");
  await page.keyboard.press("Escape");
});

await step("later-phase stubs", async () => {
  for (const h of ["#/tours", "#/store/bookings"]) {
    await go(h, 1200);
    const t = await text();
    check(`stub ${h}: 'later phase' placeholder`, /later phase|späteren Phase/i.test(t), t.slice(0, 200));
  }
});
check("no console or page errors", S.errors.length === 0, S.errors.join(" | "));
writeFileSync(`${OUT}/../../reports/1.18-results-side-${L}.json`, JSON.stringify(S.results, null, 1));
console.log(`TOTAL ${S.results.filter((r) => r.pass).length} PASS, ${S.results.filter((r) => !r.pass).length} FAIL`);
await S.browser.close();
