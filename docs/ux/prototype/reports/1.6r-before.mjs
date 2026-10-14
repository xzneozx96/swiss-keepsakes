// 1.6r "before" captures: the C05 sign-in sheet as it was, 375px EN and DE, port 5215.
import { chromium } from "/home/ross-geller/.npm/_npx/9833c18b2d85bc59/node_modules/playwright-core/index.mjs";
import { mkdirSync, readdirSync } from "node:fs";

const OUT = "/home/ross-geller/Projects/minastik/swiss-keepsakes/docs/ux/prototype/screens/1.6r/before";
mkdirSync(OUT, { recursive: true });
const home = process.env.HOME + "/.cache/ms-playwright/";
const dir = readdirSync(home).filter((d) => d.startsWith("chromium_headless_shell-")).sort().pop();
const browser = await chromium.launch({ executablePath: `${home}${dir}/chrome-headless-shell-linux64/chrome-headless-shell` });

for (const lang of ["en", "de"]) {
  const p = await (await browser.newContext({ viewport: { width: 375, height: 812 }, deviceScaleFactor: 2 })).newPage();
  const T = (en, de) => (lang === "de" ? de : en);
  const shot = async (name) => {
    await p.waitForTimeout(500);
    await p.screenshot({ path: `${OUT}/${name}-${lang}-375.png` });
    console.log(lang, name);
  };
  await p.goto("http://localhost:5215/#/account");
  await p.waitForTimeout(800);
  await p.getByRole("region", { name: "Prototype controls" }).getByRole("button", { name: lang.toUpperCase(), exact: true }).click();
  await shot("account-signed-out");
  await p.getByRole("button", { name: T("Sign in", "Anmelden"), exact: true }).click();
  await shot("sheet-start");
  await p.getByRole("button", { name: T("Email me a code", "Code per E-Mail senden") }).click();
  await shot("sheet-code");
  await p.keyboard.type("000000");
  await shot("sheet-wrong");
  for (let i = 0; i < 4; i++) {
    await p.locator("[data-input-otp]").first().focus().catch(() => {});
    await p.keyboard.type("000000");
    await p.waitForTimeout(150);
  }
  await shot("sheet-locked");
  await p.getByRole("button", { name: T("Send a new code", "Neuen Code senden") }).click();
  await p.locator("[data-input-otp]").first().focus().catch(() => {});
  await p.keyboard.type("999999");
  await shot("sheet-expired");
}
await browser.close();
