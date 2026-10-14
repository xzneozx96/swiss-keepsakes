// Step 1.13s verification: C15 cards on the shared shadow surface, no solid outer border.
// Usage: node 1.13s-drive.mjs <screens dir>   (Vite on port 5224; run from front-end/ so playwright-core resolves)
// Shoots header + each tab (accepted order) and three key states in EN and DE at 375px, then
// compares every C15 card's computed border and box-shadow with an M02 card.
import { chromium } from "playwright-core";
import { readdirSync } from "node:fs";
const home = process.env.HOME + "/.cache/ms-playwright/";
const dir = readdirSync(home).filter((d) => d.startsWith("chromium_headless_shell-")).sort().pop();
const exe = `${home}${dir}/chrome-headless-shell-linux64/chrome-headless-shell`;
const OUT = process.argv[2];
const BASE = "http://localhost:5224/";
const browser = await chromium.launch({ executablePath: exe });
const context = await browser.newContext({ viewport: { width: 375, height: 812 }, deviceScaleFactor: 2 });
const page = await context.newPage();
const log = (...a) => console.log(...a);
let pass = 0, fail = 0;
const check = (name, ok, extra = "") => { ok ? pass++ : fail++; log(ok ? "PASS" : "FAIL", name, ok ? "" : extra); };
page.on("console", (m) => { if (m.type() === "error") log("CONSOLE", m.text()); });
page.on("pageerror", (e) => log("PAGEERROR", e.message));
const overflow = () => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
const mainText = async () => (await page.locator("main").innerText()).replace(/\n+/g, " | ");
const shot = async (name) => {
  await page.waitForTimeout(400);
  const h = await page.evaluate(() => document.documentElement.scrollHeight);
  await page.setViewportSize({ width: 375, height: Math.max(812, h) });
  await page.waitForTimeout(200);
  await page.screenshot({ path: `${OUT}/${name}.png` });
  await page.setViewportSize({ width: 375, height: 812 });
  check(`no horizontal overflow (${name})`, (await overflow()) <= 0);
};
let LANG = "EN";
const setLang = async (id) => {
  LANG = id;
  await page.getByRole("group", { name: "Language" }).getByRole("button", { name: id }).click();
  await page.waitForTimeout(300);
};
const open = async (id) => { await page.goto(BASE + `#/account/orders/${id}`); await page.waitForTimeout(800); };
const TABS = { EN: { overview: "Overview", payments: "Payments", timeline: "Progress", policy: "Policy" }, DE: { overview: "Übersicht", payments: "Zahlungen", timeline: "Verlauf", policy: "Bedingungen" } };
const tab = async (id) => { await page.getByRole("tab", { name: TABS[LANG][id] }).click(); await page.waitForTimeout(250); };

// Every boxed element in main: a surface background with a radius. Status Alerts and the
// review card (features/reviews, not this step's files) are listed separately.
const boxes = () => page.evaluate(() => {
  const surface = getComputedStyle(document.documentElement).getPropertyValue("--surface").trim();
  const probe = document.createElement("div");
  probe.style.background = `var(--surface)`;
  document.body.append(probe);
  const surfaceBg = getComputedStyle(probe).backgroundColor;
  probe.remove();
  return [...document.querySelectorAll("main *")]
    .filter((el) => el.closest('[role="tabpanel"], section[aria-labelledby="order-headline"]'))
    .map((el) => {
      const s = getComputedStyle(el);
      // Small shapes (stepper dots) are not boxes.
      const big = el.getBoundingClientRect().width >= 48;
      const solidOuter = big && ["Top", "Right", "Bottom", "Left"].every((side) => parseFloat(s[`border${side}Width`]) > 0 && s[`border${side}Style`] === "solid");
      return { el, s, solidOuter, isSurface: big && s.backgroundColor === surfaceBg && parseFloat(s.borderTopLeftRadius) >= 12 };
    })
    .filter((b) => (b.isSurface || b.solidOuter) && !b.el.closest('[role="alert"], [role="tablist"], button, a'))
    .map(({ el, s, solidOuter }) => ({
      tag: el.tagName.toLowerCase(),
      text: el.innerText.slice(0, 40).replace(/\n/g, " "),
      border: s.borderTopWidth + " " + s.borderTopStyle,
      solidOuter,
      radius: s.borderTopLeftRadius,
      shadow: s.boxShadow,
      isReview: !!el.closest('section[aria-label]:not([aria-labelledby])'),
      surface,
    }));
});

// --- reference: an M02 card's computed style --------------------------------------------
await page.goto(BASE);
await page.evaluate(() => localStorage.clear());
await page.goto(BASE + "#/store");
await page.waitForTimeout(1500);
const ref = await page.evaluate(() => {
  const el = document.querySelector("main .shadow-surface");
  if (!el) return null;
  const s = getComputedStyle(el);
  return { shadow: s.boxShadow, border: s.borderTopWidth, radius: s.borderTopLeftRadius };
});
check("M02 card found on #/store", !!ref, "store did not render a card");
log("M02 reference", JSON.stringify(ref));

// --- sign in, add the sample orders ------------------------------------------------------
await page.goto(BASE + "#/account");
await page.waitForTimeout(800);
await page.getByRole("button", { name: "Sign in", exact: true }).click();
await page.getByRole("button", { name: /Continue with Google/ }).click();
await page.waitForTimeout(1500);
await page.getByRole("region", { name: "Prototype controls" }).getByRole("button").first().click();
await page.getByRole("dialog").waitFor();
await page.waitForTimeout(300);
await page.getByRole("button", { name: "Add sample orders in every state" }).click();
await page.waitForTimeout(1200);

const audit = async (label) => {
  const found = await boxes();
  const own = found.filter((b) => !b.isReview);
  for (const b of own) {
    check(`${label}: ${b.tag} "${b.text}" border 0`, b.border.startsWith("0px") && !b.solidOuter, JSON.stringify(b));
    if (ref) check(`${label}: ${b.tag} "${b.text}" shadow = M02`, b.shadow === ref.shadow, `${b.shadow} vs ${ref.shadow}`);
    if (ref) check(`${label}: ${b.tag} "${b.text}" radius = M02`, b.radius === ref.radius, `${b.radius} vs ${ref.radius}`);
  }
  for (const b of found.filter((x) => x.isReview)) log(`NOTE ${label}: review card (features/reviews) border ${b.border}`);
  return own.length;
};

for (const lang of ["EN", "DE"]) {
  await setLang(lang);
  const l = lang.toLowerCase();
  // Header + each tab on the accepted, payment-due order.
  await open("sk-1044");
  log(`cards on overview (${lang}):`, await audit(`accepted ${lang} overview`));
  await shot(`accepted-overview-${l}`);
  for (const t of ["payments", "timeline", "policy"]) {
    await tab(t);
    log(`cards on ${t} (${lang}):`, await audit(`accepted ${lang} ${t}`));
    if (lang === "DE") check(`DE ${t}: no raw keys`, !/guestOrder\.|detail\./.test(await mainText()));
    await shot(`accepted-${t}-${l}`);
  }
  // Three key states: balance after handover, completed with a review, money after cancel.
  for (const [name, id] of [["handed-over-balance", "sk-1048"], ["completed", "sk-1012"], ["received-after-cancellation", "sk-1050"]]) {
    await open(id);
    await audit(`${name} ${lang}`);
    await shot(`${name}-${l}`);
    if (name === "handed-over-balance") {
      await tab("payments");
      log(`cards on payments with history (${lang}):`, await audit(`${name} ${lang} payments`));
      await shot(`${name}-payments-${l}`);
    }
  }
}

log(`\n${pass} PASS, ${fail} FAIL`);
await browser.close();
process.exit(fail ? 1 : 0);
