// Step 1.15 verification: M04 next step (ready, handed over, complete) and M08 Record payment,
// outline steps 12–14 as Manager after the guest paid the deposit, in EN and DE at 375 and 1024px.
// Usage: node 1.15-drive.mjs <screens dir>   (Vite on port 5191; playwright-core via a node_modules symlink)
import { chromium } from "playwright-core";
import { readdirSync } from "node:fs";
const home = process.env.HOME + "/.cache/ms-playwright/";
const dir = readdirSync(home).filter((d) => d.startsWith("chromium_headless_shell-")).sort().pop();
const exe = `${home}${dir}/chrome-headless-shell-linux64/chrome-headless-shell`;
const OUT = process.argv[2];
const BASE = "http://localhost:5191/";
const browser = await chromium.launch({ executablePath: exe });
const context = await browser.newContext({ viewport: { width: 375, height: 812 }, deviceScaleFactor: 2 });
const page = await context.newPage();
const log = (...a) => console.log(...a);
let pass = 0, fail = 0;
const check = (name, ok, extra = "") => { ok ? pass++ : fail++; log(ok ? "PASS" : "FAIL", name, ok ? "" : extra); };
page.on("console", (m) => { if (m.type() === "error") log("CONSOLE", m.text()); });
page.on("pageerror", (e) => log("PAGEERROR", e.message));
const overflow = () => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
const norm = (s) => s.replace(/\n+/g, " | ").replace(/[\u00a0\u202f]/g, " ");
const mainText = async () => norm(await page.locator("main").innerText());
const sheet = () => page.getByRole("dialog");
const sheetText = async () => norm(await sheet().innerText());
const shot = async (name, { width = 375, full = true, el } = {}) => {
  await page.setViewportSize({ width, height: 812 });
  await page.waitForTimeout(400);
  check(`no horizontal overflow (${name})`, (await overflow()) <= 0);
  if (el) { await el.screenshot({ path: `${OUT}/${name}.png` }); }
  else if (full) {
    const h = await page.evaluate(() => document.documentElement.scrollHeight);
    await page.setViewportSize({ width, height: Math.max(812, h) });
    await page.waitForTimeout(200);
    await page.screenshot({ path: `${OUT}/${name}.png` });
  } else await page.screenshot({ path: `${OUT}/${name}.png` });
  await page.setViewportSize({ width: 375, height: 812 });
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
const state = () => page.evaluate(() => JSON.parse(localStorage.getItem("sk.demo")));
const order = async (id) => (await state()).data.orders.find((o) => o.id === id);
const mails = async (id) => (await state()).data.mail.filter((m) => m.orderId === id).map((m) => `${m.template}→${m.to}`);
const setRole = async (role) => {
  await page.evaluate((role) => { const s = JSON.parse(localStorage.getItem("sk.demo")); s.role = role; localStorage.setItem("sk.demo", JSON.stringify(s)); }, role);
  await page.reload();
  await page.waitForTimeout(800);
};
const m04 = async (id) => { await page.goto(BASE + `#/store/orders/${id}`); await page.waitForTimeout(900); return mainText(); };
const focused = () => page.evaluate(() => document.activeElement?.textContent?.trim() ?? document.activeElement?.tagName);
const amountField = (L) => sheet().getByRole("textbox", { name: L.amount });
const setAmount = async (L, v) => { await amountField(L).fill(v); await amountField(L).press("Tab"); await page.waitForTimeout(200); };
const confirmBtn = () => sheet().locator("footer button, [data-slot=drawer-footer] button").first();
const noRawKeys = (lang, name, text) => { if (lang === "DE") check(`${name} DE: no raw keys`, !/\b(fulfilment|recordPayment|merchantOrder|order\.(status|payment|block))\./.test(text), text); };

const T = {
  EN: { amount: "Amount received", ready: "Mark as ready", handOver: "Mark as handed over", complete: "Complete order", combined: "Handed over and complete", record: "Record payment",
        locked: "CHF 62.30 still owed", confirm: "Record CHF 62.30 cash. Balance will be CHF 0.00.", again: "Record CHF 26.70 cash again. Balance will be CHF 35.60.",
        dup: "CHF 26.70 was already recorded at", above: "More than the CHF 62.30 still owed", estimated: "Estimated, not recorded", recorded: "Recorded", completedBy: "Completed by Lukas ·",
        handedOver: "Handed over", completed: "Completed", bank: "Bank transfer", bankBtn: "Record CHF 62.30 by bank transfer. Balance will be CHF 0.00." },
  DE: { amount: "Erhaltener Betrag", ready: "Als abholbereit markieren", handOver: "Als übergeben markieren", complete: "Bestellung abschliessen", combined: "Übergeben und abschliessen", record: "Zahlung erfassen",
        locked: "Noch CHF 62.30 offen", confirm: "CHF 62.30 bar erfassen. Danach offen: CHF 0.00.", again: "CHF 26.70 bar nochmals erfassen. Danach offen: CHF 35.60.",
        dup: "CHF 26.70 wurde bereits", above: "Mehr als die offenen CHF 62.30", estimated: "Geschätzt", recorded: "Verbucht", completedBy: "Abgeschlossen von Lukas ·",
        handedOver: "Übergeben", completed: "Abgeschlossen", bank: "Banküberweisung", bankBtn: "CHF 62.30 per Banküberweisung erfassen. Danach offen: CHF 0.00." },
};

for (const lang of ["EN", "DE"]) {
  const L = T[lang], l = lang.toLowerCase();
  log(`\n=== ${lang} ===`);

  // Fresh demo, Anna signed in, sample orders (built only with T0 transitions).
  await page.goto(BASE);
  await page.evaluate(() => localStorage.clear());
  await page.goto(BASE + "#/account");
  await page.reload();
  await page.waitForTimeout(800);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.getByRole("button", { name: /Continue with Google/ }).click();
  await page.waitForTimeout(1500);
  await openControls();
  await page.getByRole("button", { name: "Add sample orders in every state" }).click();
  await page.waitForTimeout(1200);
  await setLang(lang);

  const s0 = await state();
  const mine = s0.data.orders.filter((o) => o.guestId === s0.data.signedInGuestId);
  const box = mine.find((o) => o.lines[0].productId === "p-giftbox" && o.status === "accepted").id;
  const knife = mine.find((o) => o.lines[0].productId === "p-knife" && o.status === "preparing").id;
  log("gift box", box, "knife (paid)", knife);
  // Fixture: the outline's gift box carries the source Hotel am See (step 1, AC11); the sample is direct.
  await page.evaluate((id) => { const s = JSON.parse(localStorage.getItem("sk.demo")); s.data.orders.find((o) => o.id === id).partnerId = "hotel-am-see"; localStorage.setItem("sk.demo", JSON.stringify(s)); }, box);
  await page.reload(); await page.waitForTimeout(800);

  // Step 12: the guest pays the gift box deposit on C12 (real screens).
  await page.goto(BASE + `#/account/orders/${box}`);
  await page.waitForTimeout(900);
  await page.locator("main a", { hasText: /^(Pay|.*bezahlen$)/ }).click();
  await page.waitForTimeout(600);
  await page.locator("main fieldset button").nth(0).click();
  await page.waitForTimeout(1200);
  let o = await order(box);
  check("deposit paid: preparing, CHF 26.70 succeeded", o.status === "preparing" && o.payments.some((p) => p.amount === 2670 && p.status === "succeeded"), JSON.stringify(o.payments));

  // Step 13 as Manager.
  await setRole("manager");
  let text = await m04(box);
  check("preparing: Mark as ready offered", text.includes(L.ready));
  noRawKeys(lang, "preparing", text);
  await shot(`m04-preparing-${l}-375`);
  await page.getByRole("button", { name: L.ready }).click();
  await page.waitForTimeout(600);
  o = await order(box);
  check("ready: status ready", o.status === "ready");
  check("ready: N12 to the guest", (await mails(box)).includes("N12→guest"), JSON.stringify(await mails(box)));
  check("ready: focus moved to Mark as handed over", (await focused()) === L.handOver, await focused());
  text = await mainText();
  check("ready with balance: Complete locked 'Not handed over yet' shown", text.includes(L.complete));
  await shot(`m04-ready-owed-${l}-375`);
  await shot(`m04-ready-owed-${l}-1024`, { width: 1024 });

  await page.getByRole("button", { name: L.handOver }).click();
  await page.waitForTimeout(600);
  o = await order(box);
  check("handed over: status handed_over", o.status === "handed_over");
  text = await mainText();
  check(`handed over: Complete locked with '${L.locked}'`, text.includes(L.locked), text);
  check("handed over: Complete button disabled", await page.getByRole("button", { name: L.complete }).isDisabled());
  check("handed over: progress chip", text.includes(L.handedOver));
  if (L.estimated) check("commission Estimated before complete", text.includes(L.estimated));
  check("handed over: focus moved to Record payment", (await focused()) === L.record, await focused());
  noRawKeys(lang, "handed over", text);
  await shot(`m04-handed-over-locked-${l}-375`);
  await shot(`m04-handed-over-locked-${l}-1024`, { width: 1024 });

  // Step 14: M08 sheet, opened with the keyboard.
  await page.keyboard.press("Enter");
  await sheet().waitFor();
  await page.waitForTimeout(500);
  let st = await sheetText();
  check("M08 opened with Enter", st.length > 0);
  check("M08 amount defaults to the balance", /62\.30/.test(await amountField(L).inputValue()), await amountField(L).inputValue());
  check(`M08 button: '${L.confirm}'`, norm(await confirmBtn().innerText()).trim() === L.confirm, await confirmBtn().innerText());
  noRawKeys(lang, "M08", st);
  await shot(`m08-sheet-${l}-375`, { full: false });
  await shot(`m08-sheet-${l}-1024`, { width: 1024, full: false });

  // Method changes the sentence.
  await sheet().getByRole("radio", { name: L.bank }).click({ force: true });
  await page.waitForTimeout(200);
  check("M08 bank transfer sentence", norm(await confirmBtn().innerText()).trim() === L.bankBtn, await confirmBtn().innerText());
  await sheet().getByRole("radio", { name: lang === "EN" ? "Cash" : "Bar" }).click({ force: true });

  // Duplicate: the online deposit of CHF 26.70 a few minutes ago.
  await setAmount(L, "26.70");
  st = await sheetText();
  check("duplicate warning shown", st.includes(L.dup), st);
  check(`duplicate button: '${L.again}'`, norm(await confirmBtn().innerText()).trim() === L.again, await confirmBtn().innerText());
  check("duplicate button enabled (warning, not a block)", !(await confirmBtn().isDisabled()));
  await shot(`m08-duplicate-${l}-375`, { full: false });

  // Above balance: blocked.
  await setAmount(L, "70");
  st = await sheetText();
  check("above balance error shown", st.includes(L.above), st);
  check("above balance: button disabled", await confirmBtn().isDisabled());
  await shot(`m08-above-balance-${l}-375`, { full: false });

  // Record CHF 62.30 cash.
  await setAmount(L, "62.30");
  check("back to the outline sentence", norm(await confirmBtn().innerText()).trim() === L.confirm, await confirmBtn().innerText());
  await sheet().getByRole("textbox", { name: lang === "EN" ? "Note (optional)" : "Notiz (optional)" }).fill(lang === "EN" ? "Paid at pickup" : "Bei Abholung bezahlt");
  await confirmBtn().click();
  await page.waitForTimeout(800);
  o = await order(box);
  const cash = o.payments.find((p) => p.method === "cash");
  check("payment recorded: CHF 62.30 cash by manager", cash && cash.amount === 6230 && cash.recordedBy === "manager", JSON.stringify(o.payments));
  check("still handed over until Complete", o.status === "handed_over");
  check("Complete now enabled", !(await page.getByRole("button", { name: L.complete }).isDisabled()));
  check("focus moved to Complete", (await focused()) === L.complete, await focused());
  await shot(`m04-paid-ready-to-complete-${l}-375`);

  // Recording again is now above balance (no Record button: nothing owed).
  check("Record payment hidden at balance 0", (await page.getByRole("button", { name: L.record }).count()) === 0);

  await page.getByRole("button", { name: L.complete }).click();
  await page.waitForTimeout(800);
  o = await order(box);
  check("completed by manager, time stored", o.status === "completed" && o.completedBy === "manager" && !!o.completedAt);
  check("commission recorded once at completion", o.commissionRecordedAt === o.completedAt);
  check("N15 review invite to the guest", (await mails(box)).includes("N15→guest"), JSON.stringify(await mails(box)));
  text = await mainText();
  check(`completed block '${L.completedBy}'`, text.includes(L.completedBy), text);
  check("commission label Recorded", text.includes(L.recorded) && !text.includes(L.estimated), text);
  check("log has the Completed row", text.includes(L.completed));
  noRawKeys(lang, "completed", text);
  await shot(`m04-completed-${l}-375`);
  await shot(`m04-completed-${l}-1024`, { width: 1024 });
  const recordedAt = o.commissionRecordedAt;
  await page.reload(); await page.waitForTimeout(900);
  check("commission not re-recorded on reload", (await order(box)).commissionRecordedAt === recordedAt);

  // Ready and fully paid: one combined button (the paid knife).
  await m04(knife);
  await page.getByRole("button", { name: L.ready }).click();
  await page.waitForTimeout(600);
  text = await mainText();
  check("paid + ready: combined button only", text.includes(L.combined) && !text.includes(L.handOver) && (await page.getByRole("button", { name: L.complete }).count()) === 0, text);
  await shot(`m04-ready-paid-combined-${l}-375`);
  await shot(`m04-ready-paid-combined-${l}-1024`, { width: 1024 });
  await page.getByRole("button", { name: L.combined }).click();
  await page.waitForTimeout(800);
  o = await order(knife);
  check("combined: completed in one step, commission recorded", o.status === "completed" && !!o.commissionRecordedAt && o.log.some((e) => e.type === "handed-over"));
  check("combined: N12 then N15", JSON.stringify(await mails(knife)).includes("N12") && JSON.stringify(await mails(knife)).includes("N15"));

  // Keyboard: Escape closes M08 and returns focus to Record payment (seeded ready order owing money).
  const owing = (await state()).data.orders.find((x) => x.status === "ready" && x.payments.length > 0 && x.id !== knife);
  if (owing) {
    await m04(owing.id);
    await page.getByRole("button", { name: L.record }).focus();
    await page.keyboard.press("Enter");
    await sheet().waitFor();
    await page.keyboard.press("Escape");
    await page.waitForTimeout(500);
    check("Escape closes M08, focus back on Record payment", (await sheet().count()) === 0 && (await focused()) === L.record, await focused());
  }

  // Show proposals: Handed over marked as a UX proposal.
  if (lang === "EN") {
    const fresh2 = (await state()).data.orders.find((x) => x.status === "ready" && x.payments.length > 0);
    if (fresh2) {
      await page.evaluate(() => localStorage.setItem("sk.showProposals", "true"));
      await m04(fresh2.id);
      await page.reload(); await page.waitForTimeout(900);
      check("proposal tag on Handed over", (await mainText()).includes("UX proposal: Handed over"));
      await shot(`m04-proposal-handed-over-en-375`, { full: false, el: page.locator("#fulfilment-title").locator("..") });
      await page.evaluate(() => localStorage.setItem("sk.showProposals", "false"));
    }
  }
}

log(`\nRESULT: ${pass} passed, ${fail} failed`);
await browser.close();
process.exit(fail ? 1 : 0);
