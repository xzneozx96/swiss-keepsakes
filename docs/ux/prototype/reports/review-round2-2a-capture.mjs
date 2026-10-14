// Review round 2 (2a): guest screens 1.6, 1.12, 1.8, 1.13. Each session starts from the prototype bar's Reset
// and drives the real flow; prototype controls only where a step report names one for the state
// (1.13r: Add sample orders in every state, Expire this order's payment deadline).
// node r2a-capture.mjs <A|B|D> <en|de>   (DE runs the same path and saves only the shots marked de)
import { writeFileSync } from "node:fs";
import { start, OUT } from "./review-round2-2a-lib.mjs";
const [SESSION, L] = [process.argv[2], process.argv[3] || "en"];
const SCRATCH = process.env.SCRATCH;
const PHOTO = "/home/ross-geller/Projects/minastik/swiss-keepsakes/front-end/src/assets/photos/chocolate-bar.jpg";
const S = await start();
const { generic, selectAll, page, T, setLang, openBar, role, demo, closeToasts, go } = S;
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
const shot = async (item, nn, screen, state, caption, { de = false, full, keepToasts = false, width = 375 } = {}) => {
  if (L === "de" && !de) return;
  if (!keepToasts) await closeToasts();
  if (width !== 375) { await page.setViewportSize({ width, height: 900 }); await wait(600); }
  await wait(450);
  const open = (await page.locator('[role="dialog"]:visible, [role="alertdialog"]:visible').count()) > 0;
  const scrolls = await page.evaluate(() => document.documentElement.scrollHeight > window.innerHeight + 1);
  const fullPage = full ?? (!open && scrolls);
  if (fullPage) { await page.evaluate(() => window.scrollTo(0, 0)); await wait(250); }
  const issues = await generic(`${item}-${nn}`);
  const file = `img/${item}-${String(nn).padStart(2, "0")}-${screen}-${state}-${L}-${width}.png`;
  const vh = width === 375 ? 812 : 900;
  if (fullPage) {
    // Grow the viewport to the page height so sticky and fixed bars sit at the real bottom,
    // not mid-page as they do in Playwright's stitched fullPage capture.
    const h = await page.evaluate(() => document.documentElement.scrollHeight);
    await page.setViewportSize({ width, height: h });
    await wait(400);
    await page.screenshot({ path: `${OUT}/../${file}` });
    await page.setViewportSize({ width, height: vh });
    await wait(300);
  } else await page.screenshot({ path: `${OUT}/../${file}` });
  if (width !== 375) { await page.setViewportSize({ width: 375, height: 812 }); await wait(500); }
  const entry = { item, nn, file, caption: /^[cmp]\d/.test(screen) ? `${screen.toUpperCase()} ${caption}` : caption, lang: L, width };
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
const typeCode = async (code) => {
  const otp = page.locator("[data-input-otp]").first();
  await otp.focus();
  for (let i = 0; i < 6; i++) await page.keyboard.press("Backspace");
  await page.keyboard.type(code);
  await wait(900);
};
// Account → Sign in (C05 screen) → Google → back on Account.
const signInGoogle = async () => {
  await go("#/account", 1300);
  await page.getByRole("button", { name: T("auth.account.signIn"), exact: true }).first().click();
  await wait(900);
  await page.getByRole("button", { name: T("auth.google") }).click();
  await wait(1800);
};
const c15 = async (ref) => { await go(`#/account/orders/${ref.toLowerCase()}`, 1400); await closeToasts(); };
const m04 = async (ref) => { await go(`#/store/orders/${ref.toLowerCase()}`, 1400); await closeToasts(); };
const tab = async (id) => { await page.getByRole("tab", { name: T(`guestOrder.tab.${id}`), exact: true }).click(); await wait(500); };
const hubRow = async (name) => { await go("#/account", 1300); await page.getByRole("link", { name }).first().click(); await wait(900); };
const MANAGER = "Merchant · Store Manager";
const payLink = () => page.locator("main a[href$='/pay']").first();

if (SESSION === "A") {
  let knifeRef, boxRef;
  await step("reset + cart", async () => {
    await reset();
    await add("kapellbruecke-pocket-knife", { variant: /Medium|Mittel/, day: 21, engraving: "Anna" }).catch(async () => {
      // Slug unknown: reach the knife through the catalogue as round 1 did.
      await go("", 1200);
      await page.getByRole("navigation", { name: T("home.categories") }).getByRole("link").first().click(); await wait(900);
      await page.getByRole("row", { name: L === "en" ? "Pocket knives" : "Taschenmesser" }).click(); await wait(700);
      await page.getByRole("link", { name: /Kapellbrücke/ }).first().click(); await wait(1400);
      await openChoices(); await fillChoices({ variant: /Medium|Mittel/, day: 21, engraving: "Anna" }); await confirmAdd(); await wait(1500);
    });
    await add("lucerne-gift-box", { day: 20 });
    await go("#/cart", 1400);
    await selectAll(true);
    await page.getByRole("button", { name: T("cart.bar.continue"), exact: true }).last().click();
    await wait(1400);
    if (!page.url().includes("sign-in")) throw new Error("cart Continue did not open sign-in: " + page.url());
  });
  await step("C05 sign in", async () => {
    await shot("1.6", 1, "c05", "options", "Sign-in screen from cart Continue: Lucerne photo on top, Continue with Google or email me a code", { de: true });
    await shot("1.6", 2, "c05", "options", "Sign-in screen at 1024: two columns, form left, Lucerne photo right with place and credit", { width: 1024 });
    await shot("1.6", 3, "c05", "options", "Sign-in screen at 1440: two columns, form left, Lucerne photo right", { de: true, width: 1440 });
    await page.getByRole("button", { name: T("auth.email.send") }).click();
    await wait(900);
    await shot("1.6", 4, "c05", "email-code", "Sign-in screen, code step: 6-digit code, resend countdown");
    await typeCode("000000");
    await shot("1.6", 5, "c05", "wrong-code", "Sign-in screen, wrong code (000000): error and tries left");
    await shot("1.6", 6, "c05", "wrong-code", "Sign-in screen at 1024, wrong code: two columns", { width: 1024 });
    await typeCode("123456");
    await wait(1200);
    if (!page.url().includes("/cart/review")) throw new Error("after sign-in not on C06: " + page.url());
    await shot("1.6", 8, "c06", "after-sign-in", "After sign-in: back on Review and send (C06), where cart Continue was headed");
  });
  await step("C07", async () => {
    const before = (await demo()).data.orders.length;
    await page.getByRole("button", { name: T("checkout.bar.send") }).click();
    await wait(1800);
    const created = (await demo()).data.orders.slice(before);
    knifeRef = created.find((o) => o.lines[0].productId === "p-knife")?.ref;
    boxRef = created.find((o) => o.lines[0].productId === "p-giftbox")?.ref;
    console.log("refs", knifeRef, boxRef, created.length);
    await shot("1.8", 1, "c07", "request-sent", "Request sent after sending two orders: C06 order cards with reference and chips, timeline, trip profile", { de: true });
    await page.getByRole("button", { name: T("tripProfile.skip") }).click();
    await wait(600);
    await shot("1.8", 2, "c07", "trip-skipped", "Request sent, trip profile skipped: one row with \"Answer now\"");
    await page.getByRole("button", { name: T("tripProfile.answerNow") }).click();
    await wait(600);
    await page.getByText(T("tripProfile.style.independent"), { exact: true }).click();
    await page.getByRole("button", { name: T("tripProfile.save") }).click();
    await wait(700);
    await shot("1.8", 3, "c07", "trip-answered", "Request sent, trip profile answered and saved: thanks line, answers as icon rows, Edit answers");
  });
  await step("account hub", async () => {
    await go("#/account", 1500);
    await shot("1.12", 1, "account", "hub", "Account hub, signed in: default avatar, Edit profile, grouped rows with live lines", { de: true });
    await hubRow(T("account.section.orders"));
    await shot("1.12", 2, "account", "orders", "Account › Your orders: Coming up pickup tickets and Past", { de: true });
    await hubRow(T("account.section.bookings"));
    await shot("1.12", 3, "account", "bookings", "Account › Tour bookings", { de: true });
    await hubRow(T("account.section.profile"));
    await shot("1.12", 5, "account", "profile", "Account › Language and trip: language list and trip profile card", { de: true });
    await hubRow(T("account.section.notifications"));
    await shot("1.12", 6, "account", "notifications", "Account › Emails and notifications: address and every guest email", { de: true });
    await hubRow(T("account.editProfile"));
    await shot("1.12", 7, "account", "edit-profile", "Account › Edit profile: default avatar, Change photo, Remove photo, name, email", { de: true });
  });
  await step("avatar", async () => {
    const input = page.locator('[data-testid="avatar-input"]');
    await input.setInputFiles({ name: "big-photo.jpg", mimeType: "image/jpeg", buffer: Buffer.alloc(3.4 * 1024 * 1024, 1) });
    await wait(700);
    await shot("1.12", 8, "account", "oversize-error", "Edit profile, 3.4 MB photo picked: size error, no crop sheet");
    await input.setInputFiles(PHOTO);
    await sheet().waitFor(); await wait(700);
    const frame = page.getByRole("button", { name: new RegExp(T("account.edit.crop.frame").split(".")[0]) });
    const b = await frame.boundingBox();
    await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2); await page.mouse.down();
    await page.mouse.move(b.x + b.width / 2 + 40, b.y + b.height / 2, { steps: 5 }); await page.mouse.up();
    await page.getByRole("slider").focus();
    for (let i = 0; i < 40; i++) await page.keyboard.press("ArrowRight");
    await wait(400);
    await shot("1.12", 9, "account", "avatar-crop", "Change photo: Position your photo sheet, dragged and zoomed");
    await page.getByRole("button", { name: T("account.edit.crop.save") }).click();
    await wait(900);
    await shot("1.12", 10, "account", "avatar-changed", "Edit profile after Save photo: the new photo, Remove photo");
    await page.getByRole("button", { name: T("account.edit.photo.remove") }).click();
    await page.getByRole("alertdialog").waitFor(); await wait(500);
    await shot("1.12", 11, "account", "remove-confirm", "Remove photo asks first in the shared confirmation dialog");
    await page.getByRole("alertdialog").getByRole("button", { name: T("account.edit.remove.confirm") }).click();
    await wait(700);
  });
  await step("signed out", async () => {
    await go("#/account", 1300);
    await page.getByRole("button", { name: T("auth.account.signOut") }).click();
    await wait(900);
    await shot("1.12", 12, "account", "signed-out", "Account after Sign out: sign-in prompt", { de: true });
    await page.getByRole("button", { name: T("auth.account.signIn"), exact: true }).first().click(); await wait(900);
    await page.getByRole("button", { name: T("auth.google") }).click(); await wait(1800);
  });
  await step("merchant accepts", async () => {
    await role(MANAGER);
    for (const [ref, amt] of [[boxRef, /26\.70/], [knifeRef, /54\.00/]]) {
      await m04(ref);
      await page.getByRole("button", { name: T("merchantOrder.action.accept"), exact: true }).click();
      await sheet().waitFor(); await wait(400);
      await sheet().getByRole("button", { name: amt }).click();
      await wait(900);
    }
    await role("Guest");
    // Both new orders are accepted and unpaid now, so Payments shows Due now next to the seeded history.
    await hubRow(T("account.hub.payments.title"));
    await shot("1.12", 4, "account", "payments", "Account › Payments after the seller accepted both orders: Due now with Pay, payment history by month, payment methods", { de: true });
  });
  await step("C15 payment due + tabs", async () => {
    await c15(knifeRef);
    await shot("1.13", 1, "c15", "payment-due", "Order detail, accepted: pickup-ticket header with Pay and Cancel, Overview tab", { de: true });
    await tab("payments");
    await shot("1.13", 2, "c15", "tab-payments", "Order detail, payment due: Payments tab (amounts, no payments yet)");
    await tab("timeline");
    await shot("1.13", 3, "c15", "tab-progress", "Order detail, payment due: Progress tab (stepper with logged and upcoming steps)");
    await tab("policy");
    await shot("1.13", 4, "c15", "tab-policy", "Order detail, payment due: Policy tab (policy at ordering, contact with reference)");
    await tab("overview");
    await payLink().click(); await wait(1400);
    await page.getByRole("button", { name: /54\.00/ }).first().click(); await wait(1800);
    await c15(knifeRef);
    await shot("1.13", 5, "c15", "preparing", "Order detail, paid: Confirmed, being prepared · Paid in full");
  });
  await step("deposit + handover", async () => {
    await c15(boxRef);
    await payLink().click(); await wait(1400);
    await page.getByRole("button", { name: /26\.70/ }).first().click(); await wait(1800);
    await role(MANAGER);
    await m04(boxRef);
    await page.getByRole("button", { name: T("fulfilment.action.ready") }).click(); await wait(900);
    await page.getByRole("button", { name: T("fulfilment.action.handOver") }).click(); await wait(900);
    await role("Guest");
    await c15(boxRef);
    await shot("1.13", 6, "c15", "handed-over-balance", "Order detail, handed over with CHF 62.30 still to pay: Pay the rest");
    await tab("payments");
    await shot("1.13", 7, "c15", "handed-over-payments", "Order detail, handed over with balance: Payments tab with the deposit received");
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
    await shot("1.13", 8, "c15", "completed", "Order detail, completed: Write a review in the header");
    await page.getByRole("button", { name: T("review.write") }).click();
    await sheet().waitFor(); await wait(500);
    await sheet().getByRole("radio", { name: T("review.rating.option", { rating: 5 }) }).click({ force: true });
    await sheet().getByRole("textbox").fill("Lovely box, easy pickup at the station.");
    await sheet().getByRole("button", { name: T("review.submit") }).click(); await wait(1200);
    await shot("1.13", 9, "c15", "completed-reviewed", "Order detail, completed after posting the review: Your review in the header");
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
    await shot("1.13", 10, "c15", "declined", "Order detail, declined by the seller: Nothing was charged, with the reason (seed order)");
  });
  await step("cancelled overdue", async () => {
    await c15(samples[1]);
    await ctl("Expire this order’s payment deadline");
    await closeToasts();
    await shot("1.13", 11, "c15", "cancelled-overdue", "Order detail, cancelled · payment overdue: Request again (prototype control expires the deadline)");
  });
  await step("processing", async () => {
    await c15(samples[6]);
    await shot("1.13", 12, "c15", "payment-processing", "Order detail, payment processing: Please don't pay again, no Pay button (sample order)");
  });
}

if (SESSION === "D") {
  await step("locked", async () => {
    await reset();
    await go("#/account", 1300);
    await page.getByRole("button", { name: T("auth.account.signIn"), exact: true }).first().click();
    await wait(900);
    await page.getByRole("button", { name: T("auth.email.send") }).click(); await wait(800);
    for (let i = 0; i < 5; i++) await typeCode("000000");
    await shot("1.6", 7, "c05", "attempts-locked", "Sign-in screen after 5 wrong codes: slots locked, Send a new code");
  });
}

if (S.errors.length) failures.push("console/page errors: " + S.errors.join(" | "));
writeFileSync(`${SCRATCH}/shots-${SESSION}-${L}.json`, JSON.stringify({ shots, failures }, null, 1));
console.log(`DONE ${SESSION} ${L}: ${shots.length} shots, ${failures.length} failures`);
failures.forEach((f) => console.log("FAIL", f));
await S.browser.close();
