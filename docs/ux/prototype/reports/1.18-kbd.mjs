// 1.18 keyboard-only pass: Tab/Enter/Escape/arrows on the flow's main actions. node kbd.mjs en|de
import { writeFileSync } from "node:fs";
import { start, OUT } from "./1.18-lib.mjs";
const L = process.argv[2] || "en";
const S = await start();
const { page, T, check, text, mainText, shot, setLang, openBar, role, demo, closeToasts, go } = S;
const active = () => page.evaluate(() => (document.activeElement?.getAttribute("aria-label") || document.activeElement?.labels?.[0]?.textContent || document.activeElement?.closest("label")?.textContent || document.activeElement?.textContent || document.activeElement?.tagName || "").trim().slice(0, 80));
const tabTo = async (re, max = 40) => { for (let i = 0; i < max; i++) { await page.keyboard.press("Tab"); if (re.test(await active())) return true; } return false; };
const step = async (name, fn) => { try { await fn(); } catch (e) { check(`${name}: ran`, false, e.message.split("\n")[0]); } };

await go(""); await page.evaluate(() => localStorage.clear()); await go(""); await setLang(L);
await go("#/account");
await page.getByRole("button", { name: /Sign in|Anmelden/ }).first().click();
await page.getByRole("button", { name: T("auth.google") }).click(); await page.waitForTimeout(1500);
await openBar(); await page.getByRole("button", { name: "Add sample orders in every state" }).click(); await page.waitForTimeout(1500);
const d = await demo();
const due = d.data.orders.find((o) => o.guestId === "g-anna" && o.status === "accepted" && o.lines[0].productId === "p-knife");

await step("C14 → C15 by keyboard", async () => {
  await go("#/account", 1500); await closeToasts();
  check("kbd C14: Tab reaches an order row", await tabTo(new RegExp(due.ref)));
  await page.keyboard.press("Enter"); await page.waitForTimeout(1300);
  check("kbd C14: Enter opens C15", page.url().includes(due.id), page.url());
});
await step("C15 Pay → C12 → pay by keyboard", async () => {
  check("kbd C15: Tab reaches Pay", await tabTo(/54\.00/));
  await shot("kbd-c15-pay-focus");
  await page.keyboard.press("Enter"); await page.waitForTimeout(1400);
  check("kbd C15: Enter opens C12", /\/pay$/.test(page.url()), page.url());
  check("kbd C12: Tab reaches Pay", await tabTo(/54\.00/));
  await page.keyboard.press("Enter"); await page.waitForTimeout(1500);
  check("kbd C12: Enter pays and returns to C15", !/\/pay$/.test(page.url()) && (await mainText()).includes(T("order.payment.paidInFull", { amount: "CHF 54.00" })));
});
await step("C18 by keyboard", async () => {
  await go("#/account/orders/sk-1012", 1400); await closeToasts();
  check("kbd C15: Tab reaches Write a review", await tabTo(new RegExp(T("review.write"))));
  await page.keyboard.press("Enter"); await page.waitForTimeout(700);
  check("kbd C18: Tab reaches star radio", await tabTo(/out of 5|von 5/, 10));
  await page.keyboard.press("Space"); await page.keyboard.press("ArrowRight"); await page.keyboard.press("ArrowRight"); await page.waitForTimeout(200);
  const checked = await page.evaluate(() => { const r = document.querySelector('input[type=radio]:checked'); return r ? (r.getAttribute("aria-label") || r.labels?.[0]?.textContent || r.closest("label")?.textContent || r.value) : null; });
  check("kbd C18: arrows choose 3 stars", /3/.test(checked || ""), checked);
  await page.keyboard.press("Escape"); await page.waitForTimeout(500);
  check("kbd C18: Escape closes and returns focus to Write a review", (await active()).includes(T("review.write")), await active());
});
await step("M04 Accept by keyboard", async () => {
  await role("Merchant · Store Manager");
  await go("#/store/orders/sk-1031", 1400); await closeToasts();
  check("kbd M04: Tab reaches Accept", await tabTo(new RegExp("^" + T("merchantOrder.action.accept") + "$")));
  await page.keyboard.press("Enter"); await page.waitForTimeout(700);
  check("kbd M04: Enter opens accept sheet", await page.getByRole("dialog").count() > 0);
  await shot("kbd-m04-accept-sheet");
  await page.keyboard.press("Escape"); await page.waitForTimeout(500);
  check("kbd M04: Escape returns focus to Accept", (await active()) === T("merchantOrder.action.accept"), await active());
});
await step("M02 → M03 by keyboard", async () => {
  await go("#/store", 1400);
  check("kbd M02: Tab reaches a task card", await tabTo(new RegExp(T("merchantToday.task.awaitingConfirmation"))));
  await shot("kbd-m02-focus");
  await page.keyboard.press("Enter"); await page.waitForTimeout(1200);
  check("kbd M02: Enter opens M03 tab", /status=awaiting-confirmation/.test(page.url()), page.url());
  await page.keyboard.press("Tab");
  await page.keyboard.press("ArrowRight"); await page.waitForTimeout(500);
});
check("no console or page errors", S.errors.length === 0, S.errors.join(" | "));
writeFileSync(`${OUT}/../../reports/1.18-results-kbd-${L}.json`, JSON.stringify(S.results, null, 1));
console.log(`TOTAL ${S.results.filter((r) => r.pass).length} PASS, ${S.results.filter((r) => !r.pass).length} FAIL`);
await S.browser.close();
