// 1.19a review gallery, guest screens at 375px. Each session starts from the prototype bar's Reset
// and drives the real flow; prototype controls only where a step report names one for the state.
// node 1.19a-capture.mjs <A|B|C|D> <en|de>   (DE runs the same path and saves only the shots marked de)
import { writeFileSync } from "node:fs";
import { start, OUT } from "./1.19a-lib.mjs";
const [SESSION, L] = [process.argv[2], process.argv[3] || "en"];
const SCRATCH = process.env.SCRATCH;
const S = await start();
const { generic, selectAll, page, T, text, mainText, setLang, openBar, role, demo, closeToasts, go } = S;
const sheet = () => page.getByRole("dialog").last();
const wait = (ms) => page.waitForTimeout(ms);
const shots = [];
const failures = [];

const step = async (name, fn) => {
  try { await fn(); } catch (e) {
    failures.push(`${name}: ${e.message.split("\n")[0]}`);
    console.log(`STEP FAILED ${name}: ${e.message.split("\n")[0]}`);
    await page.screenshot({ path: `${SCRATCH}/ERR-${SESSION}-${name.replace(/\W+/g, "_")}-${L}.png` }).catch(() => {});
  }
};
// Full page when the document scrolls and no sheet or dialog is open; otherwise the viewport.
const shot = async (item, nn, screen, state, caption, { de = false, full, keepToasts = false, scrollTop = true } = {}) => {
  if (L === "de" && !de) return;
  if (!keepToasts) await closeToasts();
  await wait(450);
  const open = (await page.locator('[role="dialog"]:visible, [role="alertdialog"]:visible').count()) > 0;
  const scrolls = await page.evaluate(() => document.documentElement.scrollHeight > window.innerHeight + 1);
  const fullPage = full ?? (!open && scrolls);
  if (fullPage && scrollTop) { await page.evaluate(() => window.scrollTo(0, 0)); await wait(250); }
  const issues = await generic(`${item}-${nn}`);
  const file = `img/${item}-${String(nn).padStart(2, "0")}-${screen}-${state}-${L}-375.png`;
  if (fullPage) {
    // Grow the viewport to the page height so sticky and fixed bottom bars sit at the real bottom,
    // not mid-page as they do in Playwright's stitched fullPage capture.
    const h = await page.evaluate(() => document.documentElement.scrollHeight);
    await page.setViewportSize({ width: 375, height: h });
    await wait(400);
    await page.screenshot({ path: `${OUT}/../${file}` });
    await page.setViewportSize({ width: 375, height: 812 });
    await wait(300);
  } else await page.screenshot({ path: `${OUT}/../${file}` });
  const entry = { item, nn, file, caption: /^[cmp]\d/.test(screen) ? `${screen.toUpperCase()} ${caption}` : caption, lang: L, width: 375 };
  if (issues.length) entry.issue = issues.join("; ");
  shots.push(entry);
  console.log("SHOT", file, fullPage ? "full" : "viewport", issues.length ? "ISSUE " + issues.join("; ") : "");
};
const reset = async () => {
  await go("", 1300);
  await openBar();
  await page.getByRole("button", { name: "Reset demo" }).click();
  await wait(900);
  await setLang(L);
};
const ctl = async (name) => { await openBar(); await page.getByRole("button", { name }).click(); await wait(1000); };
const altstadt = /Altstadt/;
const openChoices = async () => {
  await page.getByRole("button", { name: T("detail.bar.add"), exact: true }).last().click();
  await sheet().waitFor(); await wait(400);
};
const fillChoices = async ({ variant, day, place = altstadt, engraving }) => {
  if (variant) await sheet().getByRole("row", { name: variant }).click();
  if (engraving) await sheet().getByLabel(new RegExp(T("detail.engraving.label").replace(/[()]/g, "."))).first().fill(engraving);
  await sheet().getByRole("gridcell").filter({ hasText: new RegExp(`^${day}$`) }).first().click();
  await sheet().getByRole("radio", { name: place }).check({ force: true });
};
const confirmAdd = async () => { await sheet().getByRole("button", { name: new RegExp("^" + T("detail.bar.add")) }).last().click(); };
const add = async (slug, opts) => { await go("#/gifts/" + slug, 1200); await openChoices(); await fillChoices(opts); await confirmAdd(); await wait(1500); };
const tick = async (re, on = true) => {
  const box = page.getByRole("checkbox", { name: re });
  if ((await box.isChecked()) !== on) await box.click({ force: true });
  await wait(350);
};
const scrollTo = async (loc, offset = 90) => {
  await loc.evaluate((el, off) => window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - off), offset);
  await wait(300);
};
const signInGoogle = async () => {
  await go("#/account", 1300);
  if ((await page.getByRole("button", { name: T("auth.google") }).count()) === 0 && (await page.getByRole("button", { name: T("auth.changeEmail") }).count()) === 0) await page.getByRole("button", { name: T("auth.account.signIn") }).first().click();
  await wait(500);
  // The sheet keeps its step when closed (1.6), so after the locked state it reopens on the code step.
  if ((await page.getByRole("button", { name: T("auth.changeEmail") }).count()) > 0) { await page.getByRole("button", { name: T("auth.changeEmail") }).last().click(); await wait(500); }
  await page.getByRole("button", { name: T("auth.google") }).click();
  await wait(1500);
};
const typeCode = async (code) => {
  await page.locator("#sign-in-code").focus();
  for (let i = 0; i < 6; i++) await page.keyboard.press("Backspace");
  await page.keyboard.type(code);
  await wait(900);
};
const c15 = async (ref) => { await go(`#/account/orders/${ref.toLowerCase()}`, 1400); await closeToasts(); };
const m04 = async (ref) => { await go(`#/store/orders/${ref.toLowerCase()}`, 1400); await closeToasts(); };
const ord = async (ref) => (await demo()).data.orders.find((o) => o.ref === ref);
const MANAGER = "Merchant · Store Manager";
const payLink = () => page.locator("a[href$='/pay']").first();

if (SESSION === "A") {
  let knifeRef, boxRef;
  await step("reset + partner entry", async () => {
    await reset();
    await openBar(); await page.getByRole("button", { name: "Via Guide Marco QR" }).click(); await wait(700);
    await openBar(); await page.getByRole("button", { name: "Via Hotel am See QR" }).click(); await wait(900);
    await go("#/account", 1300);
    await shot("1.6", 1, "account", "signed-out", "C14 Account tab, signed out: sign-in prompt");
  });
  await step("C03 knife", async () => {
    await go("", 1200);
    await page.getByRole("navigation", { name: T("home.categories") }).getByRole("link").first().click();
    await wait(900);
    await page.getByRole("row", { name: L === "en" ? "Pocket knives" : "Taschenmesser" }).click();
    await wait(700);
    await page.getByRole("link", { name: /Kapellbrücke/ }).first().click();
    await wait(1400);
    await shot("1.4", 1, "c03", "gift-detail", "Gift detail, Kapellbrücke pocket knife (full page)", { de: true });
    await page.getByRole("button", { name: new RegExp("^" + T("gallery.photo").split("{n}")[0] + "1\\b") }).first().click();
    await wait(800);
    await shot("1.4", 2, "c03", "gallery-viewer", "Gift detail, fullscreen photo viewer opened from the gallery");
    await page.keyboard.press("Escape"); await wait(500);
    await openChoices();
    await shot("1.4", 3, "c03", "choices-sheet", "Gift detail, choices sheet as opened (option, quantity, engraving)");
    await fillChoices({ variant: /Medium|Mittel/, day: 21, engraving: "Anna" });
    await scrollTo(sheet().getByRole("gridcell").filter({ hasText: /^21$/ }).first(), 300).catch(() => {});
    await sheet().getByRole("gridcell").filter({ hasText: /^21$/ }).first().scrollIntoViewIfNeeded();
    await shot("1.4", 4, "c03", "choices-date", "Gift detail, choices sheet: engraving \"Anna\", pickup date with pale days and reason");
    await sheet().getByText(T("detail.place.label"), { exact: true }).first().evaluate((el) => el.scrollIntoView({ block: "start" }));
    await shot("1.4", 5, "c03", "choices-place", "Gift detail, choices sheet: pickup place chosen, add button");
    await confirmAdd();
    await wait(200);
    await page.evaluate(() => document.getAnimations().forEach((a) => { a.pause(); const d = a.effect?.getComputedTiming().duration; a.currentTime = (typeof d === "number" ? d : 600) / 2; }));
    await shot("1.4b", 1, "c03", "fly-to-cart", "Gift detail, add to cart: item mid-flight to the cart (animation paused)", { keepToasts: true, full: false });
    await page.evaluate(() => document.getAnimations().forEach((a) => a.play()));
    await wait(1500);
    await page.evaluate(() => window.scrollTo(0, 0)); await wait(400);
    await shot("1.4b", 2, "c03", "toast-badge", "Gift detail, after add: cart badge 1 and \"Added to cart\" toast with View cart", { keepToasts: true, full: false });
  });
  await step("add box + chocolate", async () => {
    await add("lucerne-gift-box", { day: 20 });
    await add("chocolate-set", { day: 20, place: /Bahnhof/ });
  });
  await step("C04 cart", async () => {
    await go("#/cart", 1400);
    await shot("1.5d", 1, "c04", "none-selected", "Cart, 3 gifts, none selected by default, total CHF 0.00");
    await page.getByRole("button", { name: T("cart.bar.continue"), exact: true }).last().click();
    await wait(500);
    await shot("1.5d", 2, "c04", "nothing-selected-reason", "Cart, Continue with nothing selected: reason shown, focus on Select all", { full: false });
    await tick(/Kapellbrücke/); await tick(/gift box|Geschenkbox/i);
    await shot("1.5d", 3, "c04", "some-selected", "Cart, 2 of 3 selected: Select all indeterminate, total for reference", { de: true });
    await selectAll(true);
    await shot("1.5", 1, "c04", "all-selected", "Cart, all 3 gifts selected, flat list (split into orders happens on C06)");
    await page.evaluate(() => window.scrollTo(0, 0)); await wait(300);
    await shot("1.5e", 1, "c04", "info-alert", "Cart, top: tinted info Alert explaining requests and payment", { full: false });
    await scrollTo(page.getByRole("checkbox", { name: /gift box|Geschenkbox/i }), 260);
    await shot("1.5c", 1, "c04", "line-cards", "Cart, line cards (Gift slip) on the shared card surface", { full: false });
    await scrollTo(page.getByRole("checkbox", { name: /Kapellbrücke/ }), 200);
    await shot("1.5f", 1, "c04", "option-engraving-rows", "Cart, knife line: store, option and engraving rows, two pickup rows, highlighted price", { full: false });
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight)); await wait(400);
    await shot("1.5e", 3, "c04", "scrolled-to-end", "Cart scrolled to the end: last card clears the sticky bar", { full: false });
    await page.getByRole("button", { name: new RegExp(T("cart.bar.details")) }).first().click();
    await wait(700);
    await shot("1.5e", 2, "c04", "breakdown-sheet", "Cart, price details sheet opened from the bar");
    await page.keyboard.press("Escape"); await wait(500);
    await page.getByRole("button", { name: new RegExp(T("cart.line.removeAria", { name: "(Chocolate|Schokolade).*" })) }).first().click();
    await wait(600);
    await shot("1.5b", 1, "c04", "remove-confirm", "Cart, remove chocolate set: shared confirmation dialog, focus on Cancel");
    await page.keyboard.press("Escape"); await wait(500);
    await tick(/Chocolate|Schokolade/, false);
  });
  await step("C05 sign in", async () => {
    await page.getByRole("button", { name: T("cart.bar.continue"), exact: true }).last().click();
    await sheet().waitFor(); await wait(600);
    await shot("1.6", 2, "c05", "options", "Sign-in sheet: Continue with Google or email me a code", { de: true });
    await sheet().getByRole("button", { name: T("auth.email.send") }).click();
    await wait(700);
    await shot("1.6", 3, "c05", "email-code", "Sign-in sheet, code step: 6-digit code, resend countdown");
    await typeCode("000000");
    await shot("1.6", 4, "c05", "wrong-code", "Sign-in sheet, wrong code (000000): error and tries left");
    await typeCode("123456");
    await wait(900);
  });
  await step("C06 + C07", async () => {
    await shot("1.7", 1, "c06", "review", "Review and send: 2 orders with date, place, due after confirmation, rules", { de: true });
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight)); await wait(400);
    await shot("1.7b", 1, "c06", "scrolled-to-end", "Review and send scrolled to the end: slips like the cart, sticky bar", { full: false });
    await page.getByRole("button", { name: new RegExp(T("cart.bar.details")) }).first().click().catch(async () => {
      await page.locator("button[aria-label*='" + T("cart.bar.details") + "']").first().click();
    });
    await wait(700);
    await shot("1.7b", 2, "c06", "breakdown-sheet", "Review and send, price details sheet: due per order, combined total for reference");
    await page.keyboard.press("Escape"); await wait(500);
    const before = (await demo()).data.orders.length;
    await page.getByRole("button", { name: T("checkout.bar.send") }).click();
    await wait(1600);
    const created = (await demo()).data.orders.slice(before);
    knifeRef = created.find((o) => o.lines[0].productId === "p-knife")?.ref;
    boxRef = created.find((o) => o.lines[0].productId === "p-giftbox")?.ref;
    console.log("refs", knifeRef, boxRef);
    await shot("1.8", 1, "c07", "request-sent", "Request sent: both orders awaiting seller confirmation, trip profile", { de: true });
    await page.getByRole("button", { name: T("tripProfile.skip") }).click();
    await wait(600);
    await shot("1.8", 2, "c07", "trip-skipped", "Request sent, trip profile skipped: \"Answer now\"");
    await page.getByRole("button", { name: T("tripProfile.answerNow") }).click();
    await wait(600);
    await page.getByText(T("tripProfile.style.independent"), { exact: true }).click();
    await page.getByRole("button", { name: T("tripProfile.save") }).click();
    await wait(700);
    await shot("1.8", 3, "c07", "trip-answered", "Request sent, trip profile answered and saved");
  });
  await step("mail + account", async () => {
    await page.getByRole("button", { name: /^Mail/ }).click();
    await wait(800);
    await shot("1.6", 6, "mail", "panel-guest", "Mail panel (prototype bar, no screen ID), guest inbox: N01 sign-in code, N02 request received");
    await page.keyboard.press("Escape"); await wait(500);
    await go("#/account", 1500);
    await shot("1.6", 7, "account", "signed-in", "C14 Account tab, signed in as Anna: profile and sign out", { full: false });
    await shot("1.12", 1, "c14", "list", "My transactions: new requests and seeded orders with both labels", { de: true });
  });
  await step("merchant accepts", async () => {
    await role(MANAGER);
    await m04(boxRef);
    await page.getByRole("button", { name: T("merchantOrder.action.change") }).click();
    await sheet().waitFor(); await wait(400);
    await sheet().getByRole("radio", { name: /Bahnhof/ }).check({ force: true });
    await sheet().getByRole("textbox", { name: new RegExp("^" + T("merchantOrder.change.note")) }).fill("Guest asked by email, hotel is near the station");
    await sheet().getByRole("button", { name: T("merchantOrder.change.save") }).click();
    await wait(800);
    for (const [ref, amt] of [[boxRef, /26\.70/], [knifeRef, /54\.00/]]) {
      await m04(ref);
      await page.getByRole("button", { name: T("merchantOrder.action.accept"), exact: true }).click();
      await sheet().waitFor(); await wait(400);
      await sheet().getByRole("button", { name: amt }).click();
      await wait(900);
    }
    await role("Guest");
  });
  await step("C15 + C12 knife", async () => {
    await c15(knifeRef);
    await shot("1.13", 1, "c15", "payment-due", "Order detail, accepted: Pay CHF 54.00 by deadline, auto-cancel warning", { de: true });
    await c15(boxRef);
    await shot("1.13", 2, "c15", "changed-place", "Order detail, accepted after the shop moved the place: R04 free-cancel note");
    await c15(knifeRef);
    await payLink().click(); await wait(1400);
    await shot("1.14", 1, "c12", "choices", "Simulated payment provider: seller, amount, reference; Pay / Fail / Processing", { de: true });
    await page.getByRole("button", { name: T("payment.choose.fail") }).click(); await wait(900);
    await shot("1.14", 2, "c12", "failed", "Payment declined, no money taken: Try again (focused)");
    await page.getByRole("button", { name: T("payment.failed.retry") }).click(); await wait(600);
    await shot("1.14", 3, "c12", "retry-choices", "After Try again: the provider choices again");
    await page.getByRole("button", { name: /54\.00/ }).first().click(); await wait(1600);
    await shot("1.13", 3, "c15", "being-prepared", "Order detail: Confirmed, being prepared · Paid in full");
  });
  await step("deposit + handover", async () => {
    await c15(boxRef);
    await payLink().click(); await wait(1400);
    await page.getByRole("button", { name: /26\.70/ }).first().click(); await wait(1600);
    await role(MANAGER);
    await m04(boxRef);
    await page.getByRole("button", { name: T("fulfilment.action.ready") }).click(); await wait(900);
    await page.getByRole("button", { name: T("fulfilment.action.handOver") }).click(); await wait(900);
    await role("Guest");
    await c15(boxRef);
    await shot("1.13", 4, "c15", "handed-over-balance", "Order detail, handed over with CHF 62.30 still owed");
  });
  await step("complete + review", async () => {
    await role(MANAGER);
    await m04(boxRef);
    await page.getByRole("button", { name: T("fulfilment.action.record") }).first().click();
    await sheet().waitFor(); await wait(500);
    await sheet().getByRole("button", { name: /62\.30/ }).last().click(); await wait(1000);
    await closeToasts();
    await page.getByRole("button", { name: T("fulfilment.action.complete") }).click(); await wait(1000);
    await role("Guest");
    await c15(boxRef);
    await shot("1.13", 5, "c15", "completed", "Order detail, completed: Write a review button");
    await page.getByRole("button", { name: T("review.write") }).click();
    await sheet().waitFor(); await wait(500);
    await sheet().getByRole("radio", { name: T("review.rating.option", { rating: 5 }) }).click({ force: true });
    await sheet().getByRole("textbox").fill(L === "en" ? "Lovely box, easy pickup at the station." : "Schöne Box, einfache Abholung am Bahnhof.");
    await shot("1.16", 1, "c18", "review-sheet", "Write a review sheet: 5 stars and text for the gift box", { de: true });
    await sheet().getByRole("button", { name: T("review.submit") }).click(); await wait(1000);
    await shot("1.16", 2, "c15", "already-reviewed", "Order detail after posting: \"Your review\" replaces the button");
    await go("#/gifts/lucerne-gift-box", 1500);
    await shot("1.16", 3, "c03", "review-on-gift", "Gift detail, gift box: Anna K.'s review with \"Purchased on\"");
  });
}

if (SESSION === "B") {
  let samples = [];
  await step("samples", async () => {
    await reset();
    await signInGoogle();
    const before = (await demo()).data.orders.map((o) => o.ref);
    await ctl("Add sample orders in every state");
    samples = (await demo()).data.orders.map((o) => o.ref).filter((r) => !before.includes(r));
    console.log("samples", samples.join(","));
    if (samples.length !== 8) throw new Error("expected 8 samples, got " + samples.length);
  });
  await step("declined", async () => {
    const declined = (await demo()).data.orders.find((o) => o.guestId === "g-anna" && o.status === "declined");
    await c15(declined.ref);
    await shot("1.13", 6, "c15", "declined", "Order detail, declined by seller with the reason (seed order)");
  });
  await step("cancelled overdue", async () => {
    await c15(samples[1]);
    await ctl("Expire this order’s payment deadline");
    await shot("1.13", 7, "c15", "cancelled-overdue", "Order detail, cancelled · payment overdue: Request again (prototype control expires the deadline)");
  });
  await step("processing", async () => {
    await c15(samples[6]);
    await shot("1.13", 8, "c15", "payment-processing", "Order detail, payment processing: no second Pay button (sample order)");
    await go(`#/account/orders/${samples[6].toLowerCase()}/pay`, 1500);
    await shot("1.14", 4, "c12", "processing", "Provider reopened while processing: \"This payment is processing\", no choices");
  });
  await step("after cancellation", async () => {
    await c15(samples[7]);
    await shot("1.13", 9, "c15", "received-after-cancellation", "Order detail, cancelled; payment received after cancellation, awaiting reconciliation (sample order)");
  });
}

if (SESSION === "C") {
  await step("empty + invalid date", async () => {
    await reset();
    await go("#/cart", 1400);
    await shot("1.5", 2, "c04", "empty", "Cart, empty state with Browse gifts");
    await add("lucerne-gift-box", { day: 20 });
    await ctl("Make a cart date too early");
    await shot("1.5", 3, "c04", "invalid-date", "Cart, line date too early: reason and \"Request … instead\" (prototype control)");
    await page.getByRole("button", { name: new RegExp(T("cart.invalid.fix", { date: "" }).split(" ")[0]) }).first().click();
    await wait(600);
  });
  await step("stock error", async () => {
    await signInGoogle();
    await go("#/cart", 1300);
    await selectAll(true);
    await page.getByRole("button", { name: T("cart.bar.continue"), exact: true }).last().click();
    await wait(1400);
    await ctl("Make an item sell out");
    await go("#/cart/review", 1400);
    await page.getByRole("button", { name: T("checkout.bar.send") }).click();
    await wait(1000);
    await shot("1.7", 2, "c06", "stock-error", "Review and send, stock changed on send: error names the item, input kept (prototype control)", { full: false });
  });
}

if (SESSION === "D") {
  await step("locked", async () => {
    await reset();
    await go("#/account", 1300);
    await page.getByRole("button", { name: T("auth.account.signIn") }).first().click();
    await sheet().waitFor(); await wait(400);
    await sheet().getByRole("button", { name: T("auth.email.send") }).click(); await wait(600);
    for (let i = 0; i < 5; i++) await typeCode("000000");
    await shot("1.6", 5, "c05", "attempts-locked", "Sign-in sheet after 5 wrong codes: locked, send a new code");
    await page.keyboard.press("Escape"); await wait(500);
  });
  await step("C14 empty", async () => {
    await signInGoogle();
    await ctl("Remove my orders");
    await go("#/account", 1500);
    await shot("1.12", 2, "c14", "empty", "My transactions, no orders: empty state (prototype control removes them)");
  });
}

if (S.errors.length) failures.push("console/page errors: " + S.errors.join(" | "));
writeFileSync(`${SCRATCH}/shots-${SESSION}-${L}.json`, JSON.stringify({ shots, failures }, null, 1));
console.log(`DONE ${SESSION} ${L}: ${shots.length} shots, ${failures.length} failures`);
failures.forEach((f) => console.log("FAIL", f));
await S.browser.close();
