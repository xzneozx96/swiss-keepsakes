import { chromium } from "playwright";
const OUT = process.argv[2];
const b = await chromium.launch();
for (const ui of ["en", "de"]) {
const ctx = await b.newContext({ viewport: { width: 375, height: 812 } });
const p = await ctx.newPage();
const errs = []; p.on("pageerror", (e) => errs.push(e.message));
await p.goto("http://localhost:5182/#/account"); await p.waitForTimeout(800);
await p.evaluate((ui) => {
  const s = JSON.parse(localStorage.getItem("sk.demo"));
  const at = "2026-10-13T08:35:00.000Z";
  const g = (template, language, params) => ({ at, to: "guest", guestId: "g-anna", language, template, orderId: "x", params: { orderRef: "SK-1043", ...params } });
  const st = (template, language, params) => ({ at, to: "staff", language, template, orderId: "x", params: { orderRef: "SK-1043", ...params } });
  const list = [
    g("N04", "en", { pickupDate: "2026-10-20", pickupPlaceId: s.data.orders[0].pickupPlaceId, amount: 2670, dueAt: "2026-10-14T08:35:00.000Z" }),
    g("N04", "de", { pickupDate: "2026-10-20", pickupPlaceId: s.data.orders[0].pickupPlaceId, amount: 2670, dueAt: "2026-10-14T08:35:00.000Z" }),
    g("N07", "de", { amount: 2670, balance: 6230 }),
    g("N12", "en", { pickupDate: "2026-10-20", pickupPlaceId: s.data.orders[0].pickupPlaceId }),
    g("N23", "en", { dueAt: "2026-10-14T08:35:00.000Z" }),
    st("N21", "de", { amount: 2670, balance: 6230 }),
    st("N23", "en", { dueAt: "2026-10-14T08:35:00.000Z" }),
  ];
  s.data.mail = [...s.data.mail, ...list.map((m, i) => ({ ...m, id: "t" + i }))];
  localStorage.setItem("sk.demo", JSON.stringify(s));
  localStorage.setItem("sk.language", JSON.stringify(ui));
}, ui);
await p.reload(); await p.waitForTimeout(800);
const bar = p.getByRole("region", { name: "Prototype controls" });
await bar.getByRole("button", { name: /^Mail/ }).click(); await p.waitForTimeout(500);
await p.evaluate(() => document.querySelectorAll("details").forEach((d) => (d.open = true)));
const text = await p.getByRole("dialog").innerText();
console.log(`--- UI ${ui}, guest tab ---\n` + text.slice(0, 2500));
if (ui === "en") await p.screenshot({ path: `${OUT}/mail-panel-templates.png` });
await p.getByRole("tab", { name: /Staff/ }).click(); await p.waitForTimeout(300);
await p.evaluate(() => document.querySelectorAll("details").forEach((d) => (d.open = true)));
console.log(`--- staff tab ---\n` + (await p.getByRole("dialog").innerText()).slice(0, 1500));
if (ui === "en") await p.screenshot({ path: `${OUT}/mail-panel-staff.png` });
console.log("errors:", errs.join(" | ") || "none");
await ctx.close();
}
await b.close();
