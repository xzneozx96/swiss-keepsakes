// Step 1.14 verification: C12 simulated payment provider, every path in EN and DE at 375px.
// Usage: node 1.14-drive.mjs <screens dir>   (Vite on port 5190; playwright-core via a node_modules symlink)
import { chromium } from "playwright-core";
import { readdirSync } from "node:fs";
const home = process.env.HOME + "/.cache/ms-playwright/";
const dir = readdirSync(home).filter((d) => d.startsWith("chromium_headless_shell-")).sort().pop();
const exe = `${home}${dir}/chrome-headless-shell-linux64/chrome-headless-shell`;
const OUT = process.argv[2];
const BASE = "http://localhost:5190/";
const browser = await chromium.launch({ executablePath: exe });
const context = await browser.newContext({ viewport: { width: 375, height: 812 }, deviceScaleFactor: 2 });
const page = await context.newPage();
const log = (...a) => console.log(...a);
let pass = 0, fail = 0;
const check = (name, ok, extra = "") => { ok ? pass++ : fail++; log(ok ? "PASS" : "FAIL", name, ok ? "" : extra); };
page.on("console", (m) => { if (m.type() === "error") log("CONSOLE", m.text()); });
page.on("pageerror", (e) => log("PAGEERROR", e.message));
const overflow = () => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
const norm = (s) => s.replace(/\n+/g, " | ").replace(/[  ]/g, " ");
const mainText = async () => norm(await page.locator("main").innerText());
const shot = async (name, full = true) => {
  await page.waitForTimeout(400);
  if (full) {
    const h = await page.evaluate(() => document.documentElement.scrollHeight);
    await page.setViewportSize({ width: 375, height: Math.max(812, h) });
    await page.waitForTimeout(200);
  }
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
  await page.waitForTimeout(300);
};
const open = async (id) => {
  await page.goto(BASE + `#/account/orders/${id}`);
  await page.waitForTimeout(800);
  return mainText();
};
const payLink = () => page.locator("main a", { hasText: /^(Pay|.*bezahlen$)/ });
const choice = (i) => page.locator("main fieldset button").nth(i); // 0 Pay, 1 Fail, 2 Processing
const mails = () => page.evaluate(() => JSON.parse(localStorage.getItem("sk.demo")).data.mail.map((m) => `${m.template}→${m.to}:${m.orderId}`));
const order = (id) => page.evaluate((id) => JSON.parse(localStorage.getItem("sk.demo")).data.orders.find((o) => o.id === id), id);
const noRawKeys = (lang, name, text) => { if (lang === "DE") check(`${name} DE: no raw keys`, !/\bpayment\.|guestOrder\.|order\.(status|payment)\./.test(text), text); };

const fresh = async (lang) => {
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
};

const T = {
  EN: { seller: "Swiss Keepsakes Luzern", banner: "Simulated payment provider", paid: ["Confirmed, being prepared", "Paid in full · CHF 54.00"], deposit: ["Confirmed, being prepared", "Deposit paid · CHF 26.70 · CHF 62.30 left, due"], failed: ["Payment declined", "No money was taken"], processing: "Payment processing", reopen: "This payment is processing", late: ["Cancelled · payment overdue", "Received after cancellation · awaiting reconciliation"], blocked: "Nothing to pay here" },
  DE: { seller: "Swiss Keepsakes Luzern", banner: "Simulierter Zahlungsanbieter", paid: ["Bestätigt, in Vorbereitung", "Vollständig bezahlt · CHF 54.00"], deposit: ["Bestätigt, in Vorbereitung", "Anzahlung bezahlt · CHF 26.70 · noch CHF 62.30, fällig am"], failed: ["Zahlung abgelehnt", "Es wurde kein Geld abgebucht"], processing: "Zahlung in Bearbeitung", reopen: "Diese Zahlung ist in Bearbeitung", late: ["Nach Stornierung eingegangen · Abgleich ausstehend"], blocked: "Hier ist nichts zu bezahlen" },
};

for (const lang of ["EN", "DE"]) {
  const L = T[lang], l = lang.toLowerCase();

  // ---- Session A: knife full payment, gift box fail + retry + deposit ------------------
  await fresh(lang);

  await open("sk-1044");
  await payLink().click();
  await page.waitForTimeout(150);
  if (lang === "EN") await page.screenshot({ path: `${OUT}/loading-en.png` });
  await page.waitForTimeout(700);
  check(`${lang} C15 Pay opens C12`, page.url().endsWith("#/account/orders/sk-1044/pay"), page.url());
  let text = await mainText();
  for (const s of [L.banner, L.seller, "SK-1044", "CHF 54.00"]) check(`${lang} knife C12 shows "${s}"`, text.toLowerCase().includes(s.toLowerCase()), text);
  check(`${lang} knife C12 has three choices`, (await page.locator("main fieldset button").count()) === 3);
  noRawKeys(lang, "knife C12", text);
  await shot(`provider-knife-${l}`);

  if (lang === "EN") {
    // Keyboard: Tab reaches the Pay choice.
    let name = "";
    for (let i = 0; i < 25 && !/^Pay CHF/.test(name); i++) {
      await page.keyboard.press("Tab");
      name = await page.evaluate(() => (document.activeElement?.tagName === "BUTTON" ? document.activeElement.innerText : ""));
    }
    check("Pay choice reachable by keyboard", /^Pay CHF 54/.test(name.replace(/[  ]/g, " ")), name);
    await shot("focus-pay-en", false);
  }

  // Double tap on Pay: one payment only.
  await choice(0).dblclick();
  await page.waitForTimeout(900);
  check(`${lang} Pay returns to C15`, page.url().endsWith("#/account/orders/sk-1044"), page.url());
  text = await mainText();
  for (const s of L.paid) check(`${lang} knife paid: "${s}"`, text.includes(s), text);
  check(`${lang} knife paid: no Pay button`, (await payLink().count()) === 0);
  const knife = await order("sk-1044");
  check(`${lang} double tap made one payment`, knife.payments.length === 1 && knife.payments[0].status === "succeeded", JSON.stringify(knife.payments));
  let m = await mails();
  check(`${lang} N07 to guest and N21 to staff`, m.includes("N07→guest:sk-1044") && m.includes("N21→staff:sk-1044"), m.join(","));
  noRawKeys(lang, "knife paid", text);
  await shot(`knife-paid-${l}`);
  await page.goBack();
  await page.waitForTimeout(600);
  check(`${lang} Back from C15 skips the provider page`, !page.url().endsWith("/pay"), page.url());

  // Gift box: Fail, retry, then pay the deposit.
  await open("sk-1045");
  await payLink().click();
  await page.waitForTimeout(800);
  text = await mainText();
  check(`${lang} gift box C12 amount is the deposit`, text.includes("CHF 26.70") && text.includes("SK-1045"), text);
  await shot(`provider-giftbox-${l}`);
  await choice(1).click();
  await page.waitForTimeout(500);
  text = await mainText();
  for (const s of L.failed) check(`${lang} failed: "${s}"`, text.includes(s), text);
  check(`${lang} failed: stays on C12`, page.url().endsWith("/sk-1045/pay"), page.url());
  check(`${lang} failed: focus on Try again`, await page.evaluate(() => /Try again|Erneut versuchen/.test(document.activeElement?.innerText ?? "")));
  m = await mails();
  check(`${lang} N08 to guest`, m.includes("N08→guest:sk-1045"), m.join(","));
  noRawKeys(lang, "failed", text);
  await shot(`failed-${l}`);
  await page.locator("main [role=alert] button").click();
  await page.waitForTimeout(300);
  check(`${lang} retry shows the choices again`, (await page.locator("main fieldset button").count()) === 3);
  await choice(0).click();
  await page.waitForTimeout(900);
  text = await mainText();
  for (const s of L.deposit) check(`${lang} deposit: "${s}"`, text.includes(s), text);
  m = await mails();
  check(`${lang} deposit N07 + N21`, m.includes("N07→guest:sk-1045") && m.includes("N21→staff:sk-1045"), m.join(","));
  await shot(`giftbox-deposit-${l}`);

  // Nothing due: the provider says so instead of offering Pay.
  await page.goto(BASE + "#/account/orders/sk-1046/pay");
  await page.waitForTimeout(800);
  text = await mainText();
  check(`${lang} nothing due: blocked message, no choices`, text.includes(L.blocked) && (await page.locator("main fieldset button").count()) === 0, text);
  noRawKeys(lang, "blocked", text);
  await shot(`blocked-${l}`);

  // ---- Session B: processing, then late provider result ------------------------------
  await fresh(lang);
  await open("sk-1044");
  await payLink().click();
  await page.waitForTimeout(800);
  await choice(2).click();
  await page.waitForTimeout(900);
  check(`${lang} Processing returns to C15`, page.url().endsWith("#/account/orders/sk-1044"), page.url());
  text = await mainText();
  check(`${lang} C15 shows "${L.processing}"`, text.includes(L.processing), text);
  check(`${lang} processing: no second Pay`, (await payLink().count()) === 0);
  m = await mails();
  check(`${lang} processing sends no mail`, !m.some((x) => x.endsWith(":sk-1044")), m.join(","));
  await shot(`processing-${l}`);

  await page.goto(BASE + "#/account/orders/sk-1044/pay");
  await page.waitForTimeout(800);
  text = await mainText();
  check(`${lang} reopened C12 shows processing, no choices`, text.includes(L.reopen) && (await page.locator("main fieldset button").count()) === 0, text);
  await shot(`processing-reopen-${l}`);

  await open("sk-1044");
  await openControls();
  if (lang === "EN") await page.getByRole("dialog").screenshot({ path: `${OUT}/prototype-control-en.png` });
  await page.getByRole("button", { name: "Expire this order’s payment deadline" }).click();
  await page.waitForTimeout(600);
  await openControls();
  await page.getByRole("button", { name: "Provider confirms the payment" }).click();
  await page.waitForTimeout(800);
  text = await mainText();
  for (const s of L.late) check(`${lang} late result: "${s}"`, text.includes(s), text);
  const late = await order("sk-1044");
  check(`${lang} late result: order stays cancelled`, late.status === "cancelled" && late.payments[0].status === "succeeded", late.status);
  m = await mails();
  check(`${lang} late result: N23 only, no N07/N21`, m.includes("N23→guest:sk-1044") && !m.some((x) => /^(N07|N21|N08).*sk-1044/.test(x)), m.join(","));
  check(`${lang} late result: no Pay`, (await payLink().count()) === 0);
  noRawKeys(lang, "late", text);
  await shot(`late-result-${l}`);
}

// Not found and signed out (product states, EN).
await setLang("EN");
await page.goto(BASE + "#/account/orders/sk-1028/pay");
await page.waitForTimeout(800);
check("another guest's order → not found", (await mainText()).includes("We couldn’t find this order"));
await shot("not-found-en", false);
await page.evaluate(() => { const s = JSON.parse(localStorage.getItem("sk.demo")); s.data.signedInGuestId = null; localStorage.setItem("sk.demo", JSON.stringify(s)); });
await page.reload();
await page.waitForTimeout(900);
check("signed out → sign-in prompt", /Sign in/.test(await mainText()));
await shot("signed-out-en", false);

log(`\n${pass} PASS, ${fail} FAIL`);
await browser.close();
process.exit(fail ? 1 : 0);
