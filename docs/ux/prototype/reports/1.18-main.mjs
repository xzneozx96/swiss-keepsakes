// 1.18 main demo path (outline §1 steps 1–16), real screens only, in one language: node main.mjs en|de
import { writeFileSync } from "node:fs";
import { start, OUT } from "./1.18-lib.mjs";
const L = process.argv[2] || "en";
const S = await start();
const { selectAll, cartContinue, page, T, rx, check, text, mainText, shot, setLang, openBar, role, demo, setClock, closeToasts, go, mail } = S;
const P = (n) => `main-${String(n).padStart(2, "0")}`;
const sheet = () => page.getByRole("dialog").last();
const step = async (name, fn) => {
  try { await fn(); } catch (e) { check(`${name}: step ran without error`, false, e.message.split("\n")[0]); await page.screenshot({ path: `${OUT}/ERR-${name.replace(/\W+/g, "_")}-${L}.png` }); }
};

await go("");
await page.evaluate(() => localStorage.clear());
await go("");
await setLang(L);

// Step 1: partner entry, last click Hotel am See, C01 → C02 filtered
await step("S1 partner entry", async () => {
  await openBar(); await page.getByRole("button", { name: "Via Guide Marco QR" }).click(); await page.waitForTimeout(700);
  await openBar(); await page.getByRole("button", { name: "Via Hotel am See QR" }).click(); await page.waitForTimeout(900);
  const d = await demo();
  const visits = d.data.referralVisits.map((v) => v.partnerId);
  check("1 entry: both QR visits recorded, Hotel am See last", visits.length >= 2 && visits.at(-1) === "hotel-am-see", visits.join(","));
  check("1 C01 at #/", page.url().endsWith("#/"), page.url());
  const body = await mainText();
  check("1 C01 says nothing about 'referred by'", !/referred|empfohlen|Hotel am See|Guide Marco/i.test(body));
  await shot(P(1) + "-c01");
  await page.getByRole("navigation", { name: T("home.categories") }).getByRole("link").first().click();
  await page.waitForTimeout(900);
  await page.getByRole("row", { name: L === "en" ? "Pocket knives" : "Taschenmesser" }).click();
  await page.waitForTimeout(700);
  const list = await mainText();
  check("1 C02 filtered to Pocket knives", /Kapellbrücke/.test(list) && /\b2 (gifts|Geschenke)\b/.test(list), list.slice(0, 200));
  await shot(P(1) + "-c02-knives");
});

// Step 2: knife M, engraving Anna, 21 Oct, Shop Altstadt
await step("S1 knife", async () => {
  await page.getByRole("link", { name: /Kapellbrücke/ }).first().click();
  await page.waitForTimeout(1100);
  check("2 C03 knife opened", /kapellbruecke-pocket-knife/.test(page.url()), page.url());
  await page.getByRole("button", { name: T("detail.bar.add"), exact: true }).last().click();
  await sheet().waitFor();
  await sheet().getByRole("row", { name: /Medium|Mittel/ }).click();
  await sheet().getByLabel(new RegExp(T("detail.engraving.label").replace(/[()]/g, "."))).first().fill("Anna");
  const st = await text(sheet());
  check("2 engraving counter shows 4 of 12", st.includes(T("detail.engraving.counter", { count: 4, max: 12 })), st.slice(0, 300));
  check("2 pale-day reason 'Needs 3 working days to engrave'", /3 working days|3 Arbeitstage/.test(st), st.slice(0, 600));
  check("2 fixed request line shown", /seller confirms before you pay|bestätigt.*bevor Sie bezahlen|Verkäufer bestätigt/i.test(st), st.slice(0, 900));
  await sheet().getByRole("gridcell").filter({ hasText: /^21$/ }).first().click();
  await sheet().getByRole("radio", { name: /Altstadt/ }).check({ force: true });
  await shot(P(2) + "-c03-knife-sheet", { full: false });
  await sheet().getByRole("button", { name: new RegExp("^" + T("detail.bar.add")) }).last().click();
  await page.waitForTimeout(800);
});

// Step 3: gift box 20 Oct Altstadt
await step("S1 gift box", async () => {
  await go("#/gifts/lucerne-gift-box");
  await page.getByRole("button", { name: T("detail.bar.add"), exact: true }).last().click();
  await sheet().waitFor();
  const st = await text(sheet());
  check("3 gift box uses its own rule: 'Needs 2 days to prepare' (calendar days, not working days)", /Needs 2 days to prepare|2 Tage/.test(st) && !/working days|Arbeitstage/.test(st), st.slice(0, 500));
  await sheet().getByRole("gridcell").filter({ hasText: /^20$/ }).first().click();
  await sheet().getByRole("radio", { name: /Altstadt/ }).check({ force: true });
  await shot(P(3) + "-c03-giftbox-sheet");
  await sheet().getByRole("button", { name: new RegExp("^" + T("detail.bar.add")) }).last().click();
  await page.waitForTimeout(800);
});

// Step 4: cart (flat list since 1.5d; orders are grouped on C06)
let cartBefore;
await step("S1 cart", async () => {
  await go("#/cart");
  await closeToasts();
  const c = await mainText();
  check("4 C04 each line shows its payment rule (full / 30% deposit)", c.includes(T("cart.policy.full")) && c.includes(T("cart.policy.deposit", { percent: 30 })), c.slice(0, 600));
  check("4 C04 each line shows its requested date (21 / 20 Oct)", c.includes(T("cart.line.requestDate", { date: L === "en" ? "Wed 21 Oct" : "Mi., 21. Okt." })) && c.includes(T("cart.line.requestDate", { date: L === "en" ? "Tue 20 Oct" : "Di., 20. Okt." })), c.slice(0, 600));
  await selectAll(true);
  const b = await text();
  check("4 C04 Select all: total for reference CHF 143.00, 2 of 2 selected", /143\.00/.test(b) && b.includes(T("cart.bar.selectedCount", { selected: 2, total: 2 })), b.slice(-400));
  cartBefore = JSON.stringify((await demo()).data.cart);
  await shot(P(4) + "-c04-cart", { full: true });
  await page.getByRole("button", { name: new RegExp(T("cart.bar.details")) }).first().click();
  await page.waitForTimeout(600);
  const ps = await text(sheet());
  check("4 C04 price details sheet lists both gifts and CHF 143.00", /Kapellbrücke/.test(ps) && /143\.00/.test(ps), ps.slice(0, 300));
  await shot(P(4) + "-c04-price-sheet");
  await page.keyboard.press("Escape"); await page.waitForTimeout(400);
});

// Step 5: sign in, 000000 wrong code, resend locked, then any code
await step("S1 sign in", async () => {
  await cartContinue();
  await sheet().waitFor();
  await page.waitForTimeout(500);
  await shot(P(5) + "-c05-start");
  await sheet().getByRole("button", { name: T("auth.email.send") }).click();
  await page.waitForTimeout(600);
  await page.locator("#sign-in-code").focus();
  await page.keyboard.type("000000");
  await page.waitForTimeout(900);
  const st = await text(sheet());
  check("5 000000 shows the wrong-code error", st.includes(T("auth.code.wrong")), st.slice(0, 400));
  check("5 resend locked with countdown", /0:[0-3]\d/.test(st), st.slice(0, 400));
  await shot(P(5) + "-c05-wrong-code");
  const m = await mail();
  check("5 N01 sent to guest", m.some((x) => x.startsWith("N01>guest")), m.join(","));
  await page.locator("#sign-in-code").focus();
  for (let i = 0; i < 6; i++) await page.keyboard.press("Backspace");
  await page.keyboard.type("123456");
  await page.waitForTimeout(1500);
  check("5 lands on C06 after sign-in", /#\/cart\/review/.test(page.url()), page.url());
  check("5 cart unchanged by sign-in", JSON.stringify((await demo()).data.cart) === cartBefore);
});

// Step 6: review and send
await step("S1 review", async () => {
  await closeToasts();
  const r = await mainText();
  check("6 C06 shows Order 1 and Order 2 (AC28)", r.includes(T("cart.order.title", { n: 1 })) && r.includes(T("cart.order.title", { n: 2 })), r.slice(0, 300));
  check("6 C06 due after confirm 54.00 / 26.70", /54\.00/.test(r) && /26\.70/.test(r), r.slice(0, 500));
  check("6 C06 rest 62.30 named", /62\.30/.test(r));
  check("6 C06 combined total for reference", r.includes(T("checkout.bar.total")) || (await text()).includes(T("checkout.bar.total")), r.slice(-300));
  await shot(P(6) + "-c06-review", { full: true });
  await page.getByRole("button", { name: T("checkout.bar.send") }).click();
  await page.waitForTimeout(1400);
  check("6 send opens C07", /#\/cart\/sent\?orders=/.test(page.url()), page.url());
});

// Step 7: request sent
await step("S1 request sent", async () => {
  const r = await mainText();
  const awaiting = r.split(T("order.status.requested")).length - 1;
  check("7 C07 lists both orders awaiting seller confirmation", awaiting >= 2, r.slice(0, 600));
  check("7 C07 no response-time promise", !/(respond|reply|answer|confirm)s? within|(antwortet|bestätigt) innerhalb/i.test(r));
  check("7 trip profile shown", r.includes(T("tripProfile.title")));
  await shot(P(7) + "-c07-sent", { full: true });
  const m = await mail();
  check("7 N02 x2 to guest, N03 x2 to staff", m.filter((x) => x.startsWith("N02>guest")).length === 2 && m.filter((x) => x.startsWith("N03>staff")).length === 2, m.join(","));
  const d = await demo();
  const mine = d.data.orders.filter((o) => o.guestId === "g-anna" && o.status === "requested");
  check("7 orders created with source Hotel am See and order language", mine.length === 2 && mine.every((o) => o.partnerId === "hotel-am-see" && o.language === L), mine.map((o) => `${o.ref}:${o.partnerId}:${o.language}`).join(" "));
  await page.getByRole("button", { name: T("tripProfile.skip") }).click();
  await page.waitForTimeout(500);
});
const refs = (await demo()).data.orders.filter((o) => o.guestId === "g-anna" && o.status === "requested").map((o) => o.ref);
const knifeRef = (await demo()).data.orders.find((o) => refs.includes(o.ref) && o.lines[0].productId === "p-knife")?.ref;
const boxRef = (await demo()).data.orders.find((o) => refs.includes(o.ref) && o.lines[0].productId === "p-giftbox")?.ref;
console.log("refs", knifeRef, boxRef);
writeFileSync(`/tmp/claude-1000/-home-ross-geller-Projects-minastik-swiss-keepsakes/7c3eecae-ab8f-4bc7-9f65-4a7aadc7000d/scratchpad/drive/state-${L}.json`, JSON.stringify({ knifeRef, boxRef }));

if (process.env.PART === "A") { console.log("errors:", S.errors); await S.browser.close(); process.exit(0); }

const managerLabel = "Merchant · Store Manager";
const openM04 = async (ref) => { await go(`#/store/orders/${ref.toLowerCase()}`, 1300); await closeToasts(); };
const openC15 = async (ref) => { await go(`#/account/orders/${ref.toLowerCase()}`, 1300); await closeToasts(); };

// Step 8: Merchant Today
await step("S2 today", async () => {
  await setClock(10, 30);
  await role(managerLabel);
  check("8 Manager lands on M02 #/store", /#\/store$/.test(page.url()), page.url());
  const t = await mainText();
  const label = T("merchantToday.task.label.other", { title: T("merchantToday.task.awaitingConfirmation"), count: 5 });
  check("8 M02 awaiting confirmation = 5 (outline says 2; 3 seeded + Anna's 2)", (await page.getByRole("link", { name: label }).count()) === 1, t.slice(0, 400));
  await shot(P(8) + "-m02-today");
  await shot(P(8) + "-m02-today", { width: 1024 });
  const m = await mail();
  check("8 N03 in staff mail", m.some((x) => x.startsWith("N03>staff")));
  await page.getByRole("link", { name: label }).click();
  await page.waitForTimeout(1100);
  check("8 card opens M03 awaiting-confirmation tab", /status=awaiting-confirmation/.test(page.url()), page.url());
  const o = await mainText();
  check("8 M03 lists Anna's two requests", o.includes(knifeRef) && o.includes(boxRef), o.slice(0, 300));
  await shot(P(8) + "-m03-orders");
  await shot(P(8) + "-m03-orders", { width: 1024 });
  await page.getByRole("link", { name: new RegExp(boxRef) }).first().click();
  await page.waitForTimeout(1300);
  check("8 M03 row opens M04 of the gift box", page.url().includes(`/store/orders/${boxRef.toLowerCase()}`), page.url());
});

// Step 9: change place with note, accept gift box at 10:30
await step("S2 change + accept gift box", async () => {
  const t = await mainText();
  check("9 M04 shows source Hotel am See (AC11)", t.includes("Hotel am See"), t.slice(0, 300));
  await shot(P(9) + "-m04-requested", { full: true });
  await shot(P(9) + "-m04-requested", { width: 1024 });
  await page.getByRole("button", { name: T("merchantOrder.action.change") }).click();
  await sheet().waitFor(); await page.waitForTimeout(400);
  await sheet().getByRole("radio", { name: /Bahnhof/ }).check({ force: true });
  await sheet().getByRole("button", { name: T("merchantOrder.change.save") }).click();
  await page.waitForTimeout(400);
  const st = await text(sheet());
  check("9 change without a note is blocked", /Add a note|Notiz/.test(st), st.slice(0, 400));
  await sheet().getByRole("textbox", { name: new RegExp("^" + T("merchantOrder.change.note")) }).fill("Guest asked by email, hotel is near the station");
  await sheet().getByRole("button", { name: T("merchantOrder.change.save") }).click();
  await page.waitForTimeout(800);
  const t2 = await mainText();
  const logLine = T("merchantOrder.log.placeChanged", { from: L === "en" ? "Shop Altstadt" : "Laden Altstadt", to: L === "en" ? "Pickup point Bahnhof" : "Abholstelle Bahnhof" });
  check("9 log: place changed Altstadt → Bahnhof · note · Lukas · time", t2.includes(logLine) && /Guest asked by email/.test(t2) && /Lukas · 13\.10\.2026, 10:3\d/.test(t2), t2.slice(0, 900));
  await page.getByRole("button", { name: T("merchantOrder.action.accept"), exact: true }).click();
  await sheet().waitFor(); await page.waitForTimeout(400);
  const a = await text(sheet());
  const exp1 = T("merchantOrder.accept.prepare", { items: T("merchantOrder.accept.item"), date: "20.10.2026", place: L === "en" ? "Pickup point Bahnhof" : "Abholstelle Bahnhof" });
  check("9 accept sentence (prepare 1 item, 20.10.2026, Bahnhof)", a.includes(exp1), a.slice(0, 500));
  check("9 accept sentence (pay CHF 26.70 within 24 hours, by 14.10.2026, 10:3x)", /26\.70/.test(a) && /14\.10\.2026, 10:3\d/.test(a), a.slice(0, 500));
  check("9 stock shown per line before accept", /available|verfügbar/.test(t), "");
  await shot(P(9) + "-m04-accept-sheet");
  await sheet().getByRole("button", { name: /26\.70/ }).click();
  await page.waitForTimeout(900);
  const t3 = await mainText();
  check("9 gift box accepted, payment due CHF 26.70", t3.includes(T("order.status.accepted")) && /26\.70/.test(t3), t3.slice(0, 300));
  await shot(P(9) + "-m04-accepted");
});

// Step 10: accept the knife at 10:35
await step("S2 accept knife", async () => {
  await setClock(10, 35);
  await openM04(knifeRef);
  await page.getByRole("button", { name: T("merchantOrder.action.accept"), exact: true }).click();
  await sheet().waitFor(); await page.waitForTimeout(400);
  await sheet().getByRole("button", { name: /54\.00/ }).click();
  await page.waitForTimeout(900);
  const m = await mail();
  check("10 knife accepted; N04 x2 to guest", m.filter((x) => x.startsWith("N04>guest")).length === 2, m.join(","));
  await shot(P(10) + "-m04-knife-accepted");
});

// Step 11: guest pays the knife
await step("S3 guest pays knife", async () => {
  await role("Guest");
  await go("#/account", 1500);
  const c14 = await mainText();
  check("11 C14 shows both new orders", c14.includes(knifeRef) && c14.includes(boxRef), c14.slice(0, 500));
  check("11 C14 gift box shows the R04 free-cancel note", /cancel free|kostenlos stornieren/i.test(c14), c14.slice(0, 800));
  await shot(P(11) + "-c14", { full: true });
  await page.getByRole("link", { name: new RegExp(knifeRef) }).first().click();
  await page.waitForTimeout(1300);
  const c15 = await mainText();
  check("11 C15 knife: 'Pay CHF 54.00 by 14.10.2026, 10:35'", /54\.00/.test(c15) && /14\.10\.2026, 10:3[5-9]/.test(c15), c15.slice(0, 400));
  check("11 C15 knife: auto-cancel warning", c15.includes(T("guestOrder.notice.payDue.body")));
  await shot(P(11) + "-c15-knife-due");
  await page.getByRole("link", { name: /54\.00/ }).or(page.getByRole("button", { name: /54\.00/ })).first().click();
  await page.waitForTimeout(1300);
  check("11 Pay opens C12", /\/pay$/.test(page.url()), page.url());
  const c12 = await mainText();
  check("11 C12 labelled simulated provider, seller and ref", /Simulated payment provider|Simulierter Zahlungsanbieter/i.test(await text()) && c12.includes(knifeRef), c12.slice(0, 300));
  await shot(P(11) + "-c12-provider");
  await page.getByRole("button", { name: /54\.00/ }).first().click();
  await page.waitForTimeout(1500);
  const after = await mainText();
  check("11 back on C15: Confirmed, being prepared · Paid in full", after.includes(T("order.status.preparing")) && after.includes(T("order.payment.paidInFull", { amount: "CHF 54.00" })), after.slice(0, 400));
  const m = await mail();
  check("11 N07 to guest, N21 to staff", m.some((x) => x.startsWith("N07>guest")) && m.some((x) => x.startsWith("N21>staff")), m.join(","));
  await shot(P(11) + "-c15-knife-paid");
});

// Step 12: gift box deposit
await step("S3 guest pays deposit", async () => {
  await openC15(boxRef);
  const c15 = await mainText();
  check("12 C15 gift box shows the new place and free-cancel note", /Bahnhof/.test(c15) && c15.includes(T("guestOrder.notice.changed.body")), c15.slice(0, 500));
  await shot(P(12) + "-c15-giftbox-changed");
  await page.getByRole("link", { name: /26\.70/ }).or(page.getByRole("button", { name: /26\.70/ })).first().click();
  await page.waitForTimeout(1300);
  await page.getByRole("button", { name: /26\.70/ }).first().click();
  await page.waitForTimeout(1500);
  const after = await mainText();
  check("12 'Deposit paid · CHF 26.70 · CHF 62.30 left, due 24.10.2026'", after.includes(T("order.payment.depositPaid", { paid: "CHF 26.70", balance: "CHF 62.30", due: "24.10.2026" })), after.slice(0, 400));
  await shot(P(12) + "-c15-giftbox-deposit");
});

// Step 13: ready, handed over, complete locked
await step("S4 ready + handover", async () => {
  await role(managerLabel);
  await openM04(boxRef);
  await page.getByRole("button", { name: T("fulfilment.action.ready") }).click();
  await page.waitForTimeout(900);
  check("13 N12 sent", (await mail()).some((x) => x.startsWith("N12>guest")));
  await page.getByRole("button", { name: T("fulfilment.action.handOver") }).click();
  await page.waitForTimeout(900);
  const t = await mainText();
  const completeBtn = page.getByRole("button", { name: T("fulfilment.action.complete") });
  check("13 Complete locked with 'CHF 62.30 still owed'", (await completeBtn.isDisabled()) && /62\.30/.test(t) && t.includes(T("fulfilment.complete.locked")), t.slice(0, 400));
  await shot(P(13) + "-m04-locked");
  await shot(P(13) + "-m04-locked", { width: 1024 });
});

// Step 14: record payment, complete
await step("S4 record + complete", async () => {
  await page.getByRole("button", { name: T("fulfilment.action.record") }).first().click();
  await sheet().waitFor(); await page.waitForTimeout(500);
  const st = await text(sheet());
  check("14 M08 button 'Record CHF 62.30 cash. Balance will be CHF 0.00.'", /62\.30/.test(st) && /0\.00/.test(st), st.slice(0, 500));
  await shot(P(14) + "-m08");
  await shot(P(14) + "-m08", { width: 1024 });
  await sheet().getByRole("button", { name: /62\.30/ }).last().click();
  await page.waitForTimeout(1000);
  await closeToasts();
  const completeBtn = page.getByRole("button", { name: T("fulfilment.action.complete") });
  check("14 Record payment hidden at balance 0 (duplicate path not reachable here, see report)", (await page.getByRole("button", { name: T("fulfilment.action.record") }).count()) === 0);
  const before = await mainText();
  check("14 commission Estimated before complete", before.includes(T("order.commission.estimated")));
  await completeBtn.click();
  await page.waitForTimeout(1000);
  const after = await mainText();
  check("14 completed, by Lukas, commission Recorded", after.includes(T("fulfilment.completed.title")) && /Lukas/.test(after) && after.includes(T("order.commission.recorded")), after.slice(0, 500));
  const m = await mail();
  check("14 N15 review invite", m.some((x) => x.startsWith("N15>guest")));
  const o = (await demo()).data.orders.find((x) => x.ref === boxRef);
  check("14 commissionRecordedAt set once = completedAt", o.commissionRecordedAt && o.commissionRecordedAt === o.completedAt && o.completedBy === "manager");
  await shot(P(14) + "-m04-completed", { full: true });
  await shot(P(14) + "-m04-completed", { width: 1024 });
});

// Step 15: review
await step("S4 review", async () => {
  await role("Guest");
  await openC15(knifeRef);
  check("15 knife (not completed) has no review button", (await page.getByRole("button", { name: T("review.write") }).count()) === 0);
  await openC15(boxRef);
  await page.getByRole("button", { name: T("review.write") }).click();
  await sheet().waitFor(); await page.waitForTimeout(400);
  await sheet().getByRole("button", { name: T("review.submit") }).click();
  await page.waitForTimeout(300);
  const st = await text(sheet());
  check("15 empty review shows both errors", st.includes(T("review.rating.error")) && st.includes(T("review.text.error")));
  await sheet().getByRole("radio", { name: T("review.rating.option", { rating: 5 }) }).click({ force: true });
  await sheet().getByRole("textbox").fill(L === "en" ? "Lovely box, easy pickup at the station." : "Schöne Box, einfache Abholung am Bahnhof.");
  await shot(P(15) + "-c18-sheet");
  await sheet().getByRole("button", { name: T("review.submit") }).click();
  await page.waitForTimeout(900);
  await closeToasts();
  const t = await mainText();
  check("15 review posted, shown on C15", t.includes(T("review.yours", { name: L === "en" ? "Lucerne gift box" : "Luzerner Geschenkbox" })) || /Anna K\./.test(t), t.slice(0, 400));
  await shot(P(15) + "-c15-reviewed");
  await go("#/gifts/lucerne-gift-box", 1500);
  const c03 = await mainText();
  check("15 review appears on C03 with 'Purchased on' (decision 103 replaced 'Verified purchase')", /Anna K\./.test(c03) && c03.includes(T("detail.reviews.purchased", { date: "" }).trim().replace(/\s*$/, "")), c03.slice(0, 300));
  await shot(P(15) + "-c03-review", { full: true });
});

// Step 16: partner report
await step("S5 partner", async () => {
  await role("Partner");
  check("16 Partner lands on #/partner", /#\/partner/.test(page.url()), page.url());
  const t = await mainText();
  const d = await demo();
  const others = d.data.orders.filter((o) => o.partnerId && o.partnerId !== "hotel-am-see").map((o) => o.ref);
  check("16 P02 shows Anna's two orders", t.includes(knifeRef) && t.includes(boxRef), t.slice(0, 400));
  check("16 P02 shows none of Guide Marco's orders", others.every((r) => !t.includes(r)), others.join(","));
  check("16 P02 shows no email, phone, engraving or pickup", !/@|example\.com|\+41|Engraving|Gravur|Altstadt|Bahnhof/.test(t), (t.match(/@|example\.com|\+41|Engraving|Gravur|Altstadt|Bahnhof/) || [""])[0]);
  check("16 P02 gift box commission Recorded, knife Estimated", t.includes(T("order.commission.recorded")) && t.includes(T("order.commission.estimated")));
  await shot(P(16) + "-p02", { full: true });
  await shot(P(16) + "-p02", { width: 1024 });
});

// Mail panel at the end: guest + staff, all rendered
await step("mail panel", async () => {
  await page.getByRole("button", { name: /^Mail/ }).click();
  await page.waitForTimeout(700);
  const g = await text(page.getByRole("dialog"));
  check("mail: no literal {param} in guest mail", !/\{[a-zA-Z]+\}/.test(g), (g.match(/\{[a-zA-Z]+\}/) || [""])[0]);
  await page.screenshot({ path: `${OUT}/main-17-mail-guest-${L}.png` });
  await page.getByRole("tab", { name: /Staff|Personal|Mitarbeit|Team/ }).click();
  await page.waitForTimeout(400);
  const s = await text(page.getByRole("dialog"));
  check("mail: no literal {param} in staff mail", !/\{[a-zA-Z]+\}/.test(s));
  await page.screenshot({ path: `${OUT}/main-17-mail-staff-${L}.png` });
  await page.keyboard.press("Escape");
  const m = await mail();
  const tpl = [...new Set(m.map((x) => x.split(">")[0]))].sort();
  console.log("templates sent:", tpl.join(","));
  check("mail: main path sent N01 N02 N03 N04 N07 N12 N15 N21", ["N01", "N02", "N03", "N04", "N07", "N12", "N15", "N21"].every((x) => tpl.includes(x)), tpl.join(","));
  const langs = (await demo()).data.mail.filter((x) => x.to === "guest").map((x) => x.language);
  check(`mail: guest emails in order language (${L})`, langs.every((x) => x === L), langs.join(","));
});

check("no console or page errors", S.errors.length === 0, S.errors.join(" | "));
writeFileSync(`${OUT}/../../reports/1.18-results-main-${L}.json`, JSON.stringify(S.results, null, 1));
console.log(`TOTAL ${S.results.filter((r) => r.pass).length} PASS, ${S.results.filter((r) => !r.pass).length} FAIL`);
await S.browser.close();
