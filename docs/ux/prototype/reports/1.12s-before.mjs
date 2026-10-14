// 1.12s: capture the 1.12r account hub before the settings-style redesign (375px, EN and DE).
import { chromium } from "playwright-core";
import { readdirSync } from "node:fs";
const home = process.env.HOME + "/.cache/ms-playwright/";
const dir = readdirSync(home).filter((d) => d.startsWith("chromium_headless_shell-")).sort().pop();
const exe = `${home}${dir}/chrome-headless-shell-linux64/chrome-headless-shell`;
const OUT = process.argv[2];
const BASE = "http://localhost:5220/";
const browser = await chromium.launch({ executablePath: exe });
const page = await browser.newPage({ viewport: { width: 375, height: 812 }, deviceScaleFactor: 2 });
const full = async (name) => {
  await page.waitForTimeout(700);
  const h = await page.evaluate(() => document.documentElement.scrollHeight);
  await page.setViewportSize({ width: 375, height: Math.max(812, h) });
  await page.waitForTimeout(200);
  await page.screenshot({ path: `${OUT}/${name}.png` });
  await page.setViewportSize({ width: 375, height: 812 });
};
const setLang = async (id) => { await page.getByRole("group", { name: "Language" }).getByRole("button", { name: id }).click(); await page.waitForTimeout(300); };
await page.goto(BASE);
await page.evaluate(() => localStorage.clear());
await page.goto(BASE + "#/account");
await full("signed-out-en");
await setLang("DE"); await full("signed-out-de"); await setLang("EN");
await page.getByRole("button", { name: "Sign in", exact: true }).click();
await page.getByRole("button", { name: /Continue with Google/ }).click();
await page.waitForURL(/#\/account/);
for (const tab of ["orders", "bookings", "payments", "profile"]) {
  await page.goto(BASE + `#/account${tab === "orders" ? "" : `?tab=${tab}`}`);
  await full(`${tab}-en`);
  await setLang("DE"); await full(`${tab}-de`); await setLang("EN");
}
await browser.close();
