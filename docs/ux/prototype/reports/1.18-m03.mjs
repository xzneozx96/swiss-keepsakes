// 1.18 recheck of M03 after the 1.10b/1.10c rebuild: tabs, counts, deep links, cards → M04, empty state, keyboard, 1024. node m03.mjs en|de
import { writeFileSync } from "node:fs";
import { start, OUT } from "./1.18-lib.mjs";
const L = process.argv[2] || "en";
const S = await start();
const { page, T, check, text, mainText, shot, setLang, openBar, role, demo, go, closeToasts } = S;
const tabs = ["awaiting-confirmation", "awaiting-payment", "preparing", "ready", "owing", "completed", "cancelled"];
const keys = ["awaitingConfirmation", "awaitingPayment", "preparing", "ready", "owing", "completed", "cancelled"];
const tabCount = async (k) => { const n = await page.getByRole("tab", { name: new RegExp("^" + T(`merchantOrders.tab.${k}`)) }).first().innerText(); return Number((n.match(/(\d+)\s*$/) || [])[1]); };

await go(""); await page.evaluate(() => localStorage.clear()); await go(""); await setLang(L);
await role("Merchant · Store Manager");
await go("#/store/orders?status=owing", 1300);
const empty = await mainText();
check("M03 seed: Balance owed tab is empty with one action", empty.includes(T("merchantOrders.empty.action")), empty.slice(0, 200));
await shot("m03-empty");
await page.getByRole("link", { name: T("merchantOrders.empty.action") }).click(); await page.waitForTimeout(900);
check("M03 empty action → M02", /#\/store$/.test(page.url()), page.url());

// Fill every tab: Anna's sample orders in every state (1.13 control)
await role("Guest");
await go("#/account");
await page.getByRole("button", { name: /Sign in|Anmelden/ }).first().click();
await page.getByRole("button", { name: T("auth.google") }).click(); await page.waitForTimeout(1500);
await openBar(); await page.getByRole("button", { name: "Add sample orders in every state" }).click(); await page.waitForTimeout(1500);
await role("Merchant · Store Manager");

const d = await demo();
const expected = { requested: 0, accepted: 0, preparing: 0, ready: 0, handed_over: 0, completed: 0, cancelled: 0 };
for (const o of d.data.orders) expected[o.status === "declined" ? "cancelled" : o.status]++;
const want = [expected.requested, expected.accepted, expected.preparing, expected.ready, expected.handed_over, expected.completed, expected.cancelled];

for (let i = 0; i < tabs.length; i++) {
  await go(`#/store/orders?status=${tabs[i]}`, 1200); await closeToasts();
  const sel = await page.getByRole("tab", { selected: true }).innerText();
  check(`M03 ?status=${tabs[i]} selects its tab`, sel.startsWith(T(`merchantOrders.tab.${keys[i]}`)), sel);
  check(`M03 ${tabs[i]} count = ${want[i]} (from order data)`, (await tabCount(keys[i])) === want[i], await tabCount(keys[i]));
  const links = await page.locator("main a[href*='#/store/orders/']").count();
  check(`M03 ${tabs[i]} lists ${want[i]} order cards`, links === want[i], links);
  if (["awaiting-confirmation", "owing", "cancelled"].includes(tabs[i])) { await shot(`m03-${tabs[i]}`, { full: true }); await shot(`m03-${tabs[i]}`, { width: 1024 }); }
}
// Card opens M04, back link returns
await go("#/store/orders?status=ready", 1200);
const href = await page.locator("main a[href*='#/store/orders/']").first().getAttribute("href");
await page.locator("main a[href*='#/store/orders/']").first().click(); await page.waitForTimeout(1300);
check("M03 card opens its M04", page.url().endsWith(href.replace(/^\/?/, "")) || page.url().includes(href.split("#")[1]), `${href} → ${page.url()}`);
check("M04 header shows the order", (await mainText()).includes(T("merchantOrder.action.accept")) || /SK-\d+/.test(await mainText()));
// M02 card → M03
await go("#/store", 1300);
await page.getByRole("link", { name: new RegExp("^" + T("merchantToday.task.ready")) }).first().click(); await page.waitForTimeout(1100);
check("M02 Ready card → M03 ?status=ready", /status=ready/.test(page.url()), page.url());
// Keyboard: arrows move tabs and update ?status
await go("#/store/orders", 1200);
await page.getByRole("tab", { selected: true }).focus();
await page.keyboard.press("ArrowRight"); await page.waitForTimeout(600);
check("M03 ArrowRight moves to Awaiting payment and updates ?status", /status=awaiting-payment/.test(page.url()), page.url());
let ok = false;
for (let i = 0; i < 6 && !ok; i++) { await page.keyboard.press("Tab"); ok = await page.evaluate(() => /#\/store\/orders\/sk-/.test(document.activeElement?.getAttribute("href") || "")); }
check("M03 Tab reaches the first card", ok);
await page.keyboard.press("Enter"); await page.waitForTimeout(1200);
check("M03 Enter on a card opens M04", /#\/store\/orders\/sk-/.test(page.url()), page.url());
check("no console or page errors", S.errors.length === 0, S.errors.join(" | "));
writeFileSync(`${OUT}/../../reports/1.18-results-m03-${L}.json`, JSON.stringify(S.results, null, 1));
console.log(`TOTAL ${S.results.filter((r) => r.pass).length} PASS, ${S.results.filter((r) => !r.pass).length} FAIL`);
await S.browser.close();
