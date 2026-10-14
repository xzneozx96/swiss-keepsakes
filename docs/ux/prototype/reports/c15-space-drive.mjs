// Gift C15 bottom space (owner bug, 14 Oct): the route hid the tab bar but kept its 88px reserve.
import { chromium } from "playwright-core";
const exe = process.env.HOME + "/.cache/ms-playwright/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell";
const B = process.env.BASE || "http://localhost:5240/", OUT = process.argv[2];
let pass = 0, fail = 0; const check = (n, ok, x = "") => { ok ? pass++ : fail++; console.log(ok ? "PASS" : "FAIL", n, x); };
const br = await chromium.launch({ executablePath: exe });
const page = await (await br.newContext({ viewport: { width: 375, height: 812 }, deviceScaleFactor: 2 })).newPage();
await page.goto(B); await page.evaluate(() => localStorage.clear()); await page.reload(); await page.waitForTimeout(500);
await page.goto(B + "#/sign-in?returnTo=/account"); await page.waitForTimeout(600);
await page.getByRole("button", { name: /Continue with Google/ }).click(); await page.waitForTimeout(800);
for (const lang of ["en", "de"]) {
  await page.goto(B + "#/account/orders/sk-1015"); await page.waitForTimeout(1500);
  if (lang === "de") { await page.getByRole("group", { name: "Language" }).getByRole("button", { name: "DE" }).first().click(); await page.waitForTimeout(500); }
  for (const tab of await page.getByRole("tab").all()) {
    const name = (await tab.innerText()).trim();
    await tab.click(); await page.waitForTimeout(500);
    const r = await page.evaluate(() => {
      const main = document.querySelector("main");
      const pad = parseFloat(getComputedStyle(main).paddingBottom);
      const leaves = [...document.querySelectorAll("main *")].filter((e) => e.getBoundingClientRect().height > 0 && (e.children.length === 0 || e.tagName === "BUTTON" || e.tagName === "A") && (e.textContent.trim() || e.tagName === "IMG"));
      const last = Math.max(...leaves.map((e) => e.getBoundingClientRect().bottom + scrollY));
      const doc = document.documentElement.scrollHeight;
      return { pad, doc, tall: doc > innerHeight + 1, gap: Math.round(doc - last) };
    });
    // A page shorter than the screen ends at the screen edge (background fill), so only taller pages are measured.
    check(`${lang} ${name}: no reserve for the hidden tab bar; a scrolling page ends within 72px of content`, r.pad === 0 && (!r.tall || r.gap <= 72), JSON.stringify(r));
    if (name === "Payments" || name === "Zahlungen") await page.screenshot({ path: `${OUT}/c15-payments-tour-${lang}.png`.replace("-tour", ""), fullPage: true });
  }
  if (lang === "de") { await page.getByRole("group", { name: "Language" }).getByRole("button", { name: "EN" }).first().click(); await page.waitForTimeout(300); }
}
// Pages that keep the tab bar still reserve its space.
await page.goto(B + "#/account"); await page.waitForTimeout(900);
check("account hub keeps the tab-bar reserve", await page.evaluate(() => parseFloat(getComputedStyle(document.querySelector("main")).paddingBottom) >= 88));
await br.close(); console.log(`${pass} passed, ${fail} failed`);
