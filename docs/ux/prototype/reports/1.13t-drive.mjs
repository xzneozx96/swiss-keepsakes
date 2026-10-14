// Step 1.13t verification: the posted review on C15 without a solid bordered box, and C03 reviews.
// Usage: node 1.13t-drive.mjs <screens dir>   (Vite on port 5224; needs playwright-core via a node_modules symlink next to the script)
// Posts a review on the completed order SK-1012, shoots C15 and the C03 gift page in EN and DE at
// 375px, and checks the posted-review box's computed border, shadow and background.
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
page.on("console", (m) => { if (m.type() === "error") log("CONSOLE", m.text().slice(0, 300)); });
page.on("pageerror", (e) => log("PAGEERROR", e.message));
const overflow = () => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
const shot = async (name) => {
  await page.waitForTimeout(400);
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
const TEXT = "Lovely chocolates, and the pickup at the counter took a minute.";

await page.goto(BASE);
await page.evaluate(() => localStorage.clear());
await page.goto(BASE + "#/account");
await page.waitForTimeout(800);
await page.getByRole("button", { name: "Sign in", exact: true }).click();
await page.getByRole("button", { name: /Continue with Google/ }).click();
await page.waitForTimeout(1500);

// Post a review on the completed order.
await page.goto(BASE + "#/account/orders/sk-1012");
await page.waitForTimeout(900);
await page.getByRole("button", { name: "Write a review" }).click();
await page.getByRole("dialog").waitFor();
await page.waitForTimeout(400);
await page.getByRole("dialog").getByText("5 out of 5 stars").click({ force: true });
await page.getByRole("dialog").getByRole("textbox").fill(TEXT);
await page.getByRole("dialog").getByRole("button", { name: "Post review" }).click();
await page.waitForTimeout(1200);

const posted = page.locator('main section[aria-label^="Your review"], main section[aria-label^="Ihre Bewertung"]');
check("posted review shown on C15", (await posted.count()) === 1);

const style = () => posted.evaluate((el) => {
  const s = getComputedStyle(el);
  const card = el.closest('section[aria-labelledby="order-headline"]');
  return {
    border: ["Top", "Right", "Bottom", "Left"].map((x) => s[`border${x}Width`]).join(" "),
    shadow: s.boxShadow,
    bg: s.backgroundColor,
    cardShadow: card ? getComputedStyle(card).boxShadow : null,
    cardBg: card ? getComputedStyle(card).backgroundColor : null,
  };
});

for (const lang of ["EN", "DE"]) {
  const l = lang.toLowerCase();
  await setLang(lang);
  await page.goto(BASE + "#/account/orders/sk-1012");
  await page.waitForTimeout(900);
  const s = await style();
  log(`posted review style (${lang})`, JSON.stringify(s));
  check(`${lang}: posted review has no border`, s.border === "0px 0px 0px 0px", s.border);
  check(`${lang}: posted review has no own shadow (inside the ticket card)`, s.shadow === "none", s.shadow);
  check(`${lang}: posted review is an inset (background differs from the card)`, s.bg !== s.cardBg && s.bg !== "rgba(0, 0, 0, 0)", `${s.bg} vs card ${s.cardBg}`);
  check(`${lang}: the ticket card carries the shadow`, !!s.cardShadow && s.cardShadow !== "none", s.cardShadow);
  if (lang === "DE") check("DE: no raw review keys", !/review\.\w/.test(await page.locator("main").innerText()));
  await shot(`c15-completed-reviewed-${l}`);
  await posted.screenshot({ path: `${OUT}/c15-posted-review-crop-${l}.png` });

  // C03: the same review in the gift's review list.
  await posted.getByRole("link").click();
  await page.waitForTimeout(1200);
  check(`${lang}: link opens the gift page`, page.url().includes("#/gifts/"), page.url());
  const onC03 = page.getByText(TEXT).first();
  check(`${lang}: review listed on C03`, (await onC03.count()) > 0);
  await shot(`c03-gift-reviews-${l}`);
  if (await onC03.count()) {
    await onC03.scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${OUT}/c03-reviews-viewport-${l}.png` });
  }
}

log(`\n${pass} PASS, ${fail} FAIL`);
await browser.close();
process.exit(fail ? 1 : 0);
