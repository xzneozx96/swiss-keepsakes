import { chromium } from "playwright-core";
import { readdirSync } from "node:fs";
const home = process.env.HOME + "/.cache/ms-playwright/";
const dir = readdirSync(home).filter((d) => d.startsWith("chromium_headless_shell-")).sort().pop();
const exe = `${home}${dir}/chrome-headless-shell-linux64/chrome-headless-shell`;
const OUT = process.argv[2];
const BASE = "http://localhost:5188/";
const browser = await chromium.launch({ executablePath: exe });
const page = await browser.newPage({ viewport: { width: 375, height: 812 }, deviceScaleFactor: 2 });
const log = (...a) => console.log(...a);
let pass = 0, fail = 0;
const check = (name, ok, extra = "") => { ok ? pass++ : fail++; log(ok ? "PASS" : "FAIL", name, extra); };
page.on("console", (m) => { if (m.type() === "error") log("CONSOLE", m.text()); });
page.on("pageerror", (e) => log("PAGEERROR", e.message));
const overflow = () => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
const mainText = async () => (await page.locator("main").innerText()).replace(/\n+/g, " | ").replace(/[\u00a0\u202f]/g, " ");
const shot = async (name) => {
  await page.waitForTimeout(500);
  const h = await page.evaluate(() => document.documentElement.scrollHeight);
  await page.setViewportSize({ width: 375, height: Math.max(812, h) });
  await page.waitForTimeout(200);
  await page.screenshot({ path: `${OUT}/${name}.png` });
  await page.setViewportSize({ width: 375, height: 812 });
  check(`no horizontal overflow (${name})`, (await overflow()) <= 0);
};
const setLang = async (id) => {
  await page.getByRole("group", { name: "Language" }).getByRole("button", { name: id }).click();
  await page.waitForTimeout(300);
};
const openControls = async () => {
  await page.getByRole("region", { name: "Prototype controls" }).getByRole("button").first().click();
  await page.getByRole("dialog").waitFor();
};

await page.goto(BASE);
await page.evaluate(() => localStorage.clear());
await page.goto(BASE + "#/account");
await page.waitForTimeout(800);
check("signed-out prompt still shown", /Sign in to see your orders/.test(await mainText()));
await shot("account-signed-out-en");

// Sign in through C05 (Google, simulated).
await page.getByRole("button", { name: "Sign in", exact: true }).click();
await page.getByRole("button", { name: /Continue with Google/ }).click();
await page.waitForTimeout(900);
await page.screenshot({ path: `${OUT}/list-skeleton-en.png` });
await page.waitForTimeout(800);
let text = await mainText();
log("EN text:", text);
check("heading", text.includes("My transactions"));
check("both seeded rows", text.includes("SK-1015") && text.includes("SK-1012"));
check("newest first", text.indexOf("SK-1015") < text.indexOf("SK-1012"));
check("progress + payment labels (completed)", text.includes("Completed") && text.includes("Paid in full · CHF 48.00"));
check("progress + payment labels (declined)", text.includes("Declined by seller") && text.includes("Nothing paid"));
check("amount, reference, date", text.includes("CHF 119.00") && text.includes("SK-1012 · Pickup 09.10.2026"));
await shot("list-en");

// Keyboard: tab to the first row and open it.
let focused = "";
for (let i = 0; i < 40 && !focused.includes("/account/orders/"); i++) {
  await page.keyboard.press("Tab");
  focused = await page.evaluate(() => document.activeElement?.getAttribute("href") ?? "");
}
check("row reachable by keyboard", focused === "#/account/orders/sk-1015", focused);
await page.screenshot({ path: `${OUT}/list-focus-en.png` });
await page.keyboard.press("Enter");
await page.waitForTimeout(500);
check("row opens C15 path", page.url().endsWith("#/account/orders/sk-1015"), page.url());
log("C15 placeholder body:", (await page.locator("body").innerText()).replace(/\n+/g, " | ").slice(0, 200));
await page.screenshot({ path: `${OUT}/row-tap-before-1.13.png` });

await page.goto(BASE + "#/account");
await page.waitForTimeout(900);
await setLang("DE");
await page.waitForTimeout(500);
text = await mainText();
log("DE text:", text);
check("DE heading", text.includes("Meine Transaktionen"));
check("DE no raw keys", !/transactions\.|order\.(status|payment)\./.test(text));
check("DE pickup", text.includes("Abholung 09.10.2026"));
await shot("list-de");

// Fixture (screenshot only): an accepted order of Anna's whose pickup the shop changed (R04 note).
await page.evaluate(() => {
  const s = JSON.parse(localStorage.getItem("sk.demo"));
  const src = s.data.orders.find((o) => o.id === "sk-1028");
  const at = new Date(Date.parse(src.acceptedAt) - 60000).toISOString();
  // Negative case: a completed order with a changed pickup must not promise a free cancel.
  const done = s.data.orders.find((o) => o.id === "sk-1012");
  done.log = [...done.log, { type: "pickup-changed", field: "date", from: "2026-10-08", to: "2026-10-09", note: "fixture", at: done.acceptedAt, actor: "owner" }];
  s.data.orders.push({
    ...src, id: "sk-1099", ref: "SK-1099", guestId: "g-anna", createdAt: new Date(Date.parse(src.createdAt) + 3600e3 * 20).toISOString(),
    log: [...src.log, { type: "pickup-changed", field: "place", from: "altstadt", to: "bahnhof", note: "fixture", at, actor: "manager" }],
  });
  localStorage.setItem("sk.demo", JSON.stringify(s));
});
await page.reload();
await page.waitForTimeout(1200);
text = await mainText();
check("R04 note DE", text.includes("kostenlos stornieren") && text.includes("SK-1099"), "");
check("R04 note only on the cancellable order", text.split("kostenlos stornieren").length === 2);
await shot("list-r04-fixture-de");
await setLang("EN");
text = await mainText();
log("R04 EN text:", text); check("R04 note EN", text.includes("You can cancel free of charge"));
check("accepted labels EN", text.includes("Accepted, payment due") && text.includes("Payment due · CHF 64.00"));
await shot("list-r04-fixture-en");

// Empty state through the prototype control.
await openControls();
await page.getByRole("button", { name: "Remove my orders" }).click();
await page.waitForTimeout(1200);
text = await mainText();
check("empty state EN", text.includes("No transactions yet.") && text.includes("Go to Explore"));
await shot("empty-en");
await setLang("DE");
text = await mainText();
check("empty state DE", text.includes("Noch keine Transaktionen.") && text.includes("Zu Entdecken"));
await shot("empty-de");
await page.getByRole("link", { name: "Zu Entdecken" }).click();
await page.waitForTimeout(500);
check("empty action goes to Explore", /#\/$/.test(page.url()), page.url());

// Sign out still returns to the prompt.
await page.goto(BASE + "#/account");
await page.waitForTimeout(800);
await page.getByRole("button", { name: "Abmelden" }).click();
await page.waitForTimeout(400);
check("sign out shows prompt", (await mainText()).includes("Anmelden und Bestellungen sehen"));
await shot("account-signed-out-de");

log(`\n${pass} PASS, ${fail} FAIL`);
await browser.close();
process.exit(fail ? 1 : 0);
