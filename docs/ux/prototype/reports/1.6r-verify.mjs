// 1.6r verification: the C05 sign-in screen at 375 (EN, DE) and 1024 (EN, DE), every state, and the
// return-to flows (cart Continue -> C06, Account, order detail, direct visit while signed in). Port 5215.
import { chromium } from "/home/ross-geller/.npm/_npx/9833c18b2d85bc59/node_modules/playwright-core/index.mjs";
import { mkdirSync, readdirSync, readFileSync } from "node:fs";

const BASE = "http://localhost:5215/";
const OUT = "/home/ross-geller/Projects/minastik/swiss-keepsakes/docs/ux/prototype/screens/1.6r";
const SRC = "/home/ross-geller/Projects/minastik/swiss-keepsakes/front-end/src/i18n/";
mkdirSync(OUT, { recursive: true });
const dict = (f) => {
  const out = {};
  const re = /"([A-Za-z0-9_.]+)":\s*("(?:\\.|[^"\\])*")/g;
  const text = readFileSync(SRC + f, "utf8");
  let m;
  while ((m = re.exec(text))) out[m[1]] = JSON.parse(m[2]);
  return out;
};
const DICT = { en: dict("en.ts"), de: dict("de.ts") };
const home = process.env.HOME + "/.cache/ms-playwright/";
const dir = readdirSync(home).filter((d) => d.startsWith("chromium_headless_shell-")).sort().pop();
const browser = await chromium.launch({ executablePath: `${home}${dir}/chrome-headless-shell-linux64/chrome-headless-shell` });
const results = [];
const check = (name, ok, info = "") => {
  results.push({ name, ok });
  console.log(`${ok ? "PASS" : "FAIL"} ${name}${ok ? "" : "  :: " + info}`);
};

async function session(lang, width, height = 812) {
  const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 2 });
  const p = await ctx.newPage();
  const errors = [];
  p.on("pageerror", (e) => errors.push(e.message));
  p.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  const T = (k, params = {}) => DICT[lang][k].replace(/\{(\w+)\}/g, (_, n) => params[n]);
  const shot = async (name) => {
    await p.waitForTimeout(500);
    const overflow = await p.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    const keys = await p.evaluate(() => (document.body.innerText.match(/\bauth\.[a-zA-Z.]+/g) || []).join(","));
    check(`${lang}@${width} ${name}: no overflow, no raw keys`, !overflow && !keys, `overflow=${overflow} keys=${keys}`);
    await p.screenshot({ path: `${OUT}/${name}-${lang}-${width}.png` });
  };
  const bar = p.getByRole("region", { name: "Prototype controls" });
  const go = async (hash) => {
    await p.goto(BASE + hash);
    // A hash-only change keeps the running app; reload so edited demo data is read again.
    await p.reload();
    await p.waitForTimeout(900);
  };
  await go("#/");
  await p.evaluate(() => localStorage.removeItem("sk.demo"));
  await go("#/");
  await bar.getByRole("button", { name: lang.toUpperCase(), exact: true }).click();
  const otp = () => p.locator("[data-input-otp]").first();
  const typeCode = async (c) => {
    await otp().focus();
    await p.keyboard.type(c);
    await p.waitForTimeout(200);
  };
  const signedIn = () => p.evaluate(() => JSON.parse(localStorage.getItem("sk.demo")).data.signedInGuestId);
  return { p, T, shot, bar, go, otp, typeCode, signedIn, errors, ctx };
}

// ---- 375 phone: all states, Account return, Mail panel round trip ----
for (const lang of ["en", "de"]) {
  const s = await session(lang, 375);
  const { p, T, shot, bar, go, typeCode, signedIn } = s;
  await go("#/account");
  await p.getByRole("button", { name: T("auth.account.signIn"), exact: true }).click();
  await p.waitForTimeout(700);
  check(`${lang} Account Sign in opens /sign-in with returnTo`, /#\/sign-in\?returnTo=/.test(p.url()) && /account/.test(decodeURIComponent(p.url())), p.url());
  await shot("start");
  const gTop = await p.getByRole("button", { name: T("auth.google") }).boundingBox();
  check(`${lang} Google button above the fold at 375x812`, gTop && gTop.y + gTop.height < 812, JSON.stringify(gTop));
  const email = p.getByRole("textbox", { name: T("auth.email.label"), exact: true });
  await email.fill("anna");
  await p.getByRole("button", { name: T("auth.email.send") }).click();
  await shot("email-invalid");
  await email.fill("anna.keller@example.com");
  await p.getByRole("button", { name: T("auth.email.send") }).click();
  await p.waitForTimeout(300);
  check(`${lang} focus lands in the code field`, await p.evaluate(() => document.activeElement?.hasAttribute("data-input-otp")));
  await shot("code-resend-timer");
  await typeCode("000000");
  await shot("code-wrong");
  // Mail panel opened mid-flow keeps the code step
  await bar.getByRole("button", { name: /^Mail/ }).click();
  await p.waitForTimeout(600);
  await shot("mail-panel-n01");
  await p.keyboard.press("Escape");
  await p.waitForTimeout(500);
  check(`${lang} code step kept after the Mail panel`, (await p.getByText(T("auth.code.label")).count()) > 0);
  // Show proposals on
  await bar.getByRole("button", { name: "Guest" }).click();
  await p.waitForTimeout(400);
  await p.getByRole("switch", { name: /Show proposals/ }).click({ force: true });
  await p.keyboard.press("Escape");
  await p.waitForTimeout(400);
  await typeCode("000000");
  await shot("code-wrong-proposal");
  for (let i = 0; i < 3; i++) await typeCode("000000");
  check(`${lang} locked after 5 wrong codes`, (await p.getByText(T("auth.code.locked")).count()) > 0);
  await shot("code-locked");
  await p.getByRole("button", { name: T("auth.code.sendNew") }).click();
  await p.waitForTimeout(300);
  await typeCode("999999");
  check(`${lang} expired message`, (await p.getByText(T("auth.code.expired")).count()) > 0);
  await shot("code-expired");
  await p.getByRole("button", { name: T("auth.code.sendNew") }).click();
  await p.waitForTimeout(31000);
  check(`${lang} resend unlocks after 30 s`, await p.getByRole("button", { name: T("auth.code.resend") }).isEnabled());
  await shot("code-resend-ready");
  await typeCode("123456");
  await p.waitForTimeout(800);
  check(`${lang} any 6 digits sign in and return to Account`, (await signedIn()) === "g-anna" && /#\/account/.test(p.url()) && !/sign-in/.test(p.url()), p.url());
  await shot("account-after-sign-in");
  // Direct visit while signed in redirects
  await go("#/sign-in?returnTo=%2Fgifts");
  check(`${lang} /sign-in while signed in goes to returnTo`, /#\/gifts/.test(p.url()), p.url());
  check(`${lang} no page errors`, s.errors.length === 0, s.errors.join(" | "));
  await s.ctx.close();
}

// ---- 375 EN: cart Continue -> sign in -> C06, Back skips sign-in; Google; order detail; bad returnTo ----
{
  const s = await session("en", 375);
  const { p, T, go, signedIn } = s;
  const sheet = () => p.getByRole("dialog").last();
  await go("#/gifts/lucerne-gift-box");
  await p.getByRole("button", { name: DICT.en["detail.bar.add"], exact: true }).last().click();
  await sheet().waitFor();
  await sheet().getByRole("gridcell").filter({ hasText: /^20$/ }).first().click();
  await sheet().getByRole("radio", { name: /Altstadt/ }).check({ force: true });
  await sheet().getByRole("button", { name: new RegExp("^" + DICT.en["detail.bar.add"]) }).last().click();
  await p.waitForTimeout(900);
  await go("#/cart");
  const box = p.locator("[data-select-all]").first();
  if ((await box.count()) && !(await box.locator("input").isChecked())) await box.locator("label").first().click();
  await p.waitForTimeout(300);
  await p.getByRole("button", { name: DICT.en["cart.bar.continue"], exact: true }).last().click();
  await p.waitForTimeout(700);
  check("cart Continue opens /sign-in?returnTo=/cart/review", decodeURIComponent(p.url()).includes("sign-in?returnTo=/cart/review"), p.url());
  // Back without signing in returns to the cart
  await p.getByRole("button", { name: T("auth.back") }).first().click();
  await p.waitForTimeout(700);
  check("Back from sign-in returns to C04", /#\/cart$/.test(p.url()), p.url());
  await p.getByRole("button", { name: DICT.en["cart.bar.continue"], exact: true }).last().click();
  await p.waitForTimeout(700);
  await p.getByRole("button", { name: T("auth.google") }).click();
  await p.waitForTimeout(500);
  await s.shot("google-pending");
  await p.waitForTimeout(900);
  check("Google signs in and lands on C06", (await signedIn()) === "g-anna" && /#\/cart\/review/.test(p.url()), p.url());
  await s.shot("c06-after-sign-in");
  await p.goBack();
  await p.waitForTimeout(700);
  check("Back from C06 goes to C04, not sign-in", /#\/cart$/.test(p.url()), p.url());
  // Order detail signed out -> returns to the same order
  await p.evaluate(() => {
    const d = JSON.parse(localStorage.getItem("sk.demo"));
    d.data.signedInGuestId = null;
    localStorage.setItem("sk.demo", JSON.stringify(d));
  });
  const orderId = await p.evaluate(() => JSON.parse(localStorage.getItem("sk.demo")).data.orders.find((o) => o.guestId === "g-anna")?.id);
  await go(`#/account/orders/${orderId}`);
  await p.getByRole("button", { name: T("auth.account.signIn"), exact: true }).click();
  await p.waitForTimeout(600);
  await p.getByRole("button", { name: T("auth.google") }).click();
  await p.waitForTimeout(1500);
  check("order detail sign-in returns to the same order", p.url().includes(`/account/orders/${orderId}`), p.url());
  // Unsafe returnTo falls back to Account
  await p.evaluate(() => {
    const d = JSON.parse(localStorage.getItem("sk.demo"));
    d.data.signedInGuestId = null;
    localStorage.setItem("sk.demo", JSON.stringify(d));
  });
  await go("#/sign-in?returnTo=%2F%2Fevil.example");
  await p.getByRole("button", { name: T("auth.google") }).click();
  await p.waitForTimeout(1500);
  check("unsafe returnTo falls back to /account", /#\/account/.test(p.url()) && !/evil/.test(p.url()), p.url());
  check("flows: no page errors", s.errors.length === 0, s.errors.join(" | "));
  await s.ctx.close();
}

// ---- 1024 and 1440: two columns ----
for (const [width, height] of [[1024, 768], [1440, 900]]) {
  for (const lang of ["en", "de"]) {
    const s = await session(lang, width, height);
    const { p, T, go, typeCode } = s;
    await go("#/sign-in?returnTo=%2Faccount");
    const img = await p.locator("figure img").boundingBox();
    const form = await p.getByRole("heading", { level: 1 }).boundingBox();
    check(`${lang}@${width} two columns: form left, photo right`, img && form && form.x < img.x && img.width > width * 0.4, JSON.stringify({ img, form }));
    await s.shot("start");
    if (width === 1024) {
      await p.getByRole("button", { name: T("auth.email.send") }).click();
      await p.waitForTimeout(300);
      await typeCode("000000");
      await s.shot("code-wrong");
    }
    await s.ctx.close();
  }
}

await browser.close();
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);
