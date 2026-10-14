// 1.12t: default reviewer-style avatar for Anna Keller. 375px EN and DE screenshots + checks.
// Run from a folder with playwright-core installed: node 1.12t-drive.mjs <out dir> <repo root>
import { chromium } from "playwright-core";
import { readdirSync } from "node:fs";
const home = process.env.HOME + "/.cache/ms-playwright/";
const dir = readdirSync(home).filter((d) => d.startsWith("chromium_headless_shell-")).sort().pop();
const exe = `${home}${dir}/chrome-headless-shell-linux64/chrome-headless-shell`;
const OUT = process.argv[2];
const ROOT = process.argv[3];
const PHOTO = `${ROOT}/front-end/src/assets/photos/chocolate-bar.jpg`;
const BASE = "http://localhost:5220/";
const browser = await chromium.launch({ executablePath: exe });
const context = await browser.newContext({ viewport: { width: 375, height: 812 }, deviceScaleFactor: 2 });
const page = await context.newPage();
let pass = 0, fail = 0;
const check = (name, ok, extra = "") => { ok ? pass++ : fail++; console.log(ok ? "PASS" : "FAIL", name, extra); };
page.on("console", (m) => { if (m.type() === "error") console.log("CONSOLE", m.text()); });
page.on("pageerror", (e) => console.log("PAGEERROR", e.message));
const bodyText = async () => (await page.locator("body").innerText()).replace(/\n+/g, " | ");
const shot = async (name, fullPage = false) => {
  await page.waitForTimeout(500);
  if (fullPage) {
    const h = await page.evaluate(() => document.documentElement.scrollHeight);
    await page.setViewportSize({ width: 375, height: Math.max(812, h) });
    await page.waitForTimeout(200);
  }
  await page.screenshot({ path: `${OUT}/${name}.png` });
  await page.setViewportSize({ width: 375, height: 812 });
  check(`no horizontal overflow (${name})`, (await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)) <= 0);
  if (name.endsWith("-de")) check(`no raw i18n keys (${name})`, !/\baccount\.[a-z]/.test(await bodyText()));
};
const setLang = async (id) => { await page.getByRole("group", { name: "Language" }).getByRole("button", { name: id }).first().click(); await page.waitForTimeout(300); };
const both = async (name, fullPage) => { await shot(`${name}-en`, fullPage); await setLang("DE"); await shot(`${name}-de`, fullPage); await setLang("EN"); };
const signIn = async () => {
  await page.goto(BASE + "#/sign-in?returnTo=/account"); await page.waitForTimeout(700);
  await page.getByRole("button", { name: /Continue with Google/ }).click();
  await page.waitForURL(/#\/account$/); await page.waitForTimeout(700);
};
const stored = () => page.evaluate(() => { const s = JSON.parse(localStorage.getItem("sk.demo")); return { version: s.version, avatar: s.data.guests.find((g) => g.id === "g-anna").avatar }; });
// The three places the guest's identity shows: hub header, Edit profile photo, Account tab.
const headerImg = () => page.locator("main header img");
const tabImg = () => page.locator("nav img");
const isSample = async (loc) => /anna-k.*\.svg/.test((await loc.first().getAttribute("src")) ?? "");

// Fresh browser: the seed carries the default photo.
await page.goto(BASE);
await page.evaluate(() => localStorage.clear());
await signIn();
let s = await stored();
check("seed: DEMO_VERSION 12", s.version === 12, String(s.version));
check("seed: Anna's avatar = sample:anna-k", s.avatar === "sample:anna-k", s.avatar);
check("hub header shows the default avatar", await isSample(headerImg()));
check("Account tab shows the default avatar", await isSample(tabImg()));
await both("hub", true);

// Old stored state (version 11, no avatar) is replaced by the new seed on load.
await page.evaluate(() => { const st = JSON.parse(localStorage.getItem("sk.demo")); st.version = 11; delete st.data.guests.find((g) => g.id === "g-anna").avatar; localStorage.setItem("sk.demo", JSON.stringify(st)); });
await page.reload(); await page.waitForTimeout(700);
s = await stored();
check("v11 data is replaced by the v12 seed with the avatar", s.version === 12 && s.avatar === "sample:anna-k", JSON.stringify(s));
await signIn();

// Edit profile shows it with Remove photo available.
await page.goto(BASE + "#/account?tab=edit"); await page.waitForTimeout(700);
check("Edit profile shows the default avatar", await isSample(page.locator("main section img")));
check("Remove photo offered for the default", (await page.getByRole("button", { name: "Remove photo" }).count()) === 1);
await both("edit");

// Change photo replaces it.
await page.locator('[data-testid="avatar-input"]').setInputFiles(PHOTO);
await page.getByRole("dialog").waitFor();
await page.getByRole("button", { name: "Save photo" }).click();
await page.waitForTimeout(600);
s = await stored();
check("Change photo replaces the default with a JPEG data URL", s.avatar?.startsWith("data:image/jpeg"));
check("tab bar shows the new photo", ((await tabImg().first().getAttribute("src")) ?? "").startsWith("data:image/jpeg"));
await shot("edit-changed-en");

// Remove asks first through ConfirmDialog and falls back to initials.
await page.getByRole("button", { name: "Remove photo" }).click();
await page.getByRole("alertdialog").waitFor();
check("remove asks first", (await bodyText()).includes("Remove your profile photo?"));
await page.getByRole("alertdialog").getByRole("button", { name: "Remove photo" }).click();
await page.waitForTimeout(500);
s = await stored();
check("removed: no avatar stored", !s.avatar);
check("removed: initials AK in Edit profile", (await page.locator("main section span[aria-hidden]").first().innerText()) === "AK");
check("removed: tab bar back to the icon", (await tabImg().count()) === 0);
await both("edit-removed");
await page.goto(BASE + "#/account"); await page.waitForTimeout(700);
check("removed: hub header shows initials", (await headerImg().count()) === 0);
await both("hub-removed", true);

// Reset demo restores the default photo.
await page.getByRole("region", { name: "Prototype controls" }).getByRole("button").first().click();
await page.getByRole("dialog").waitFor();
await page.getByRole("button", { name: "Reset demo" }).click();
await page.waitForTimeout(800);
s = await stored();
check("reset restores sample:anna-k", s.avatar === "sample:anna-k", s.avatar);
await signIn();
check("after reset: hub header default avatar", await isSample(headerImg()));
check("after reset: tab bar default avatar", await isSample(tabImg()));
await both("hub-reset", true);
await page.goto(BASE + "#/account?tab=edit"); await page.waitForTimeout(700);
check("after reset: Edit profile default avatar", await isSample(page.locator("main section img")));
await both("edit-reset");

// The review list still resolves reviewer avatars from the same folder (no regression).
const sizes = await page.evaluate(async () => {
  const r = await fetch("/src/assets/avatars/anna-k.svg"); return [r.status, (await r.text()).includes("CC0")];
});
check("anna-k.svg served and carries the CC0 licence", sizes[0] === 200 && sizes[1], String(sizes));

console.log(`\n${pass} PASS, ${fail} FAIL`);
await browser.close();
