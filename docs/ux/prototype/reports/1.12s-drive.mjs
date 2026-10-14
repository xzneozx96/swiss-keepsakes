// 1.12s: drive the settings-style account hub at 375px in EN and DE; screenshots + checks.
// Run from a folder with playwright-core installed: node 1.12s-drive.mjs <out dir> <repo root>
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
const log = (...a) => console.log(...a);
let pass = 0, fail = 0;
const check = (name, ok, extra = "") => { ok ? pass++ : fail++; log(ok ? "PASS" : "FAIL", name, extra); };
page.on("console", (m) => { if (m.type() === "error") log("CONSOLE", m.text()); });
page.on("pageerror", (e) => log("PAGEERROR", e.message));
const overflow = () => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
const bodyText = async () => (await page.locator("body").innerText()).replace(/\n+/g, " | ").replace(/[  ]/g, " ");
const noRawKeys = (text) => !/\b(account|transactions|guestOrder|tripProfile|tourBooking)\.[a-z]/.test(text);
const shot = async (name, { fullPage = true } = {}) => {
  await page.waitForTimeout(500);
  if (fullPage) {
    const h = await page.evaluate(() => document.documentElement.scrollHeight);
    await page.setViewportSize({ width: 375, height: Math.max(812, h) });
    await page.waitForTimeout(200);
  }
  await page.screenshot({ path: `${OUT}/${name}.png` });
  await page.setViewportSize({ width: 375, height: 812 });
  check(`no horizontal overflow (${name})`, (await overflow()) <= 0);
  if (name.endsWith("-de")) check(`no raw i18n keys (${name})`, noRawKeys(await bodyText()));
};
const setLang = async (id) => {
  await page.getByRole("group", { name: "Language" }).getByRole("button", { name: id }).first().click();
  await page.waitForTimeout(300);
};
const both = async (name, fn) => {
  await fn?.("en"); await shot(`${name}-en`);
  await setLang("DE"); await fn?.("de"); await shot(`${name}-de`); await setLang("EN");
};
const go = async (hash) => { await page.goto(BASE + hash); await page.waitForTimeout(700); };
const guest = () => page.evaluate(() => JSON.parse(localStorage.getItem("sk.demo")).data.guests.find((g) => g.id === "g-anna"));

// Signed out
await page.goto(BASE);
await page.evaluate(() => localStorage.clear());
await go("#/account");
check("signed-out prompt", /Sign in to see your orders/.test(await bodyText()));
await both("signed-out");

// Sign in through C05 and come back to the hub
await page.getByRole("button", { name: "Sign in", exact: true }).click();
await page.getByRole("button", { name: /Continue with Google/ }).click();
await page.waitForURL(/#\/account/);
await page.waitForTimeout(600);
let text = await bodyText();
check("hub: name, email, Edit profile", text.includes("Anna Keller") && text.includes("anna.keller@example.com") && text.includes("Edit profile"));
check("hub: grouped rows", ["Your activity", "Your orders", "Tour bookings", "Payments and history", "Profile and preferences", "Language and trip", "English · Trip profile open", "Emails and notifications", "Sign out"].every((s) => text.includes(s)), text.slice(0, 400));
check("hub: initials avatar AK", (await page.locator("main header span[aria-hidden]").first().innerText()) === "AK");
await both("hub-seed");

// Fixtures (as in 1.12r): SK-1099 accepted + unpaid (Due now), SK-1098 requested, two guest mails.
await page.evaluate(() => {
  const s = JSON.parse(localStorage.getItem("sk.demo"));
  const src = s.data.orders.find((o) => o.id === "sk-1028");
  s.data.orders.push({ ...src, id: "sk-1099", ref: "SK-1099", guestId: "g-anna", createdAt: new Date(Date.parse(src.createdAt) + 3600e3 * 20).toISOString() });
  const req = s.data.orders.find((o) => o.status === "requested");
  s.data.orders.push({ ...req, id: "sk-1098", ref: "SK-1098", guestId: "g-anna" });
  s.data.mail.push(
    { id: "m-fx1", at: req.createdAt, to: "guest", guestId: "g-anna", language: "en", template: "N01", params: { code: "123456", email: "anna.keller@example.com" } },
    { id: "m-fx2", at: req.createdAt, to: "guest", guestId: "g-anna", language: "de", template: "N02", orderId: "sk-1098", params: { orderRef: "SK-1098", pickupDate: req.pickupDate, pickupPlaceId: req.pickupPlaceId } },
  );
  localStorage.setItem("sk.demo", JSON.stringify(s));
});
await page.reload(); await page.waitForTimeout(700);
text = await bodyText();
check("hub: next pickup preview", /Next pickup \w{3} \d{1,2} \w{3} · /.test(text), text.match(/Next pickup[^|]*/)?.[0]);
check("hub: due now on Payments row", /CHF\s[\d.]+ due now/.test(text), text.match(/CHF\s[\d.]+ due now/)?.[0]);
check("hub: last mail subject on Notifications row (DE mail)", (await page.locator('main [lang="de"]').count()) >= 1);
await both("hub");

// Keyboard: Tab reaches the Edit profile link then Your orders; Enter drills in.
await page.locator("body").press("Tab");
for (let i = 0; i < 30; i++) {
  const label = await page.evaluate(() => document.activeElement?.textContent?.trim() ?? "");
  if (label.startsWith("Your orders")) break;
  await page.keyboard.press("Tab");
}
await shot("hub-focus-en", { fullPage: false });
await page.keyboard.press("Enter");
await page.waitForTimeout(600);
check("Enter on Your orders opens ?tab=orders", page.url().endsWith("#/account?tab=orders"), page.url());

// Orders sub-screen
text = await bodyText();
check("orders: Coming up + Past + both labels", text.includes("Coming up") && text.includes("Past orders") && text.includes("SK-1099"));
await both("orders");
await page.getByRole("link", { name: /SK-1099/ }).first().click();
await page.waitForTimeout(600);
check("order row opens C15", page.url().includes("#/account/orders/sk-1099"), page.url());
await page.goBack(); await page.waitForTimeout(500);
check("browser back from C15 returns to Orders", page.url().endsWith("?tab=orders"), page.url());
await page.getByRole("button", { name: "Back" }).first().click();
await page.waitForTimeout(500);
check("sub-screen Back returns to the hub", page.url().endsWith("#/account"), page.url());

// Bookings
await page.getByRole("link", { name: /Tour bookings/ }).click();
await page.waitForTimeout(500);
check("bookings sub-screen", page.url().endsWith("?tab=bookings"));
await both("bookings");
await page.getByRole("button", { name: "Back" }).first().click(); await page.waitForTimeout(400);

// Payments
await page.getByRole("link", { name: /Payments and history/ }).click();
await page.waitForTimeout(500);
text = await bodyText();
check("payments: Due now card with Pay", text.includes("Due now") && /Pay CHF\s[\d.]+/.test(text));
check("payments: month group heading", /(January|February|March|April|May|June|July|August|September|October|November|December) 20\d\d/.test(text));
check("payments: history row has ref, method, date, status", /SK-1012 · Cash · \d{2}\.\d{2}\.\d{4}/.test(text) && text.includes("Received"));
check("payments: methods = Saved cards come later", text.includes("Saved cards come later"));
const payHref = await page.getByRole("link", { name: /^Pay CHF/ }).first().getAttribute("href");
check("Pay links to the C12 pay route", /#\/account\/orders\/sk-1099\/pay$/.test(payHref ?? ""), payHref);
await both("payments", async (l) => { if (l === "de") { const t = await bodyText(); check("payments DE month + methods", /Oktober 2026/.test(t) && t.includes("Gespeicherte Karten folgen später")); } });
await page.getByRole("button", { name: "Back" }).first().click(); await page.waitForTimeout(400);

// Language and trip
await page.getByRole("link", { name: /Language and trip/ }).click();
await page.waitForTimeout(500);
await both("profile");
await page.getByRole("button", { name: "Back" }).first().click(); await page.waitForTimeout(400);

// Notifications
await page.getByRole("link", { name: /Emails and notifications/ }).click();
await page.waitForTimeout(500);
text = await bodyText();
check("notifications: address + mails", text.includes("anna.keller@example.com") && text.includes("SK-1098"));
await both("notifications");
await page.getByRole("button", { name: "Back" }).first().click(); await page.waitForTimeout(400);

// Edit profile
await page.getByRole("link", { name: "Edit profile" }).first().click();
await page.waitForTimeout(500);
check("edit profile opens ?tab=edit", page.url().endsWith("?tab=edit"));
check("no Remove photo without a photo", (await page.getByRole("button", { name: "Remove photo" }).count()) === 0);
check("Save disabled until the name changes", await page.getByRole("button", { name: "Save", exact: true }).isDisabled());
await both("edit");

// Oversize file -> error, no sheet
const input = page.locator('[data-testid="avatar-input"]');
await input.setInputFiles({ name: "big-photo.jpg", mimeType: "image/jpeg", buffer: Buffer.alloc(3.4 * 1024 * 1024, 1) });
await page.waitForTimeout(300);
check("oversize error", /This photo is 3.4 MB\. Choose one up to 2 MB\./.test(await bodyText()));
check("no crop sheet after oversize", (await page.getByRole("dialog").count()) === 0);
await shot("avatar-oversize-error-en", { fullPage: false });
await setLang("DE");
await input.setInputFiles({ name: "big-photo.jpg", mimeType: "image/jpeg", buffer: Buffer.alloc(3.4 * 1024 * 1024, 1) });
await page.waitForTimeout(300);
check("oversize error DE", /Dieses Foto ist 3[.,]4 MB gross/.test(await bodyText()));
await shot("avatar-oversize-error-de", { fullPage: false });
await setLang("EN");
await input.setInputFiles({ name: "notes.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4") });
await page.waitForTimeout(300);
check("non-image error", (await bodyText()).includes("That file isn’t a photo"));
await shot("avatar-type-error-en", { fullPage: false });

// Pick a real photo -> crop sheet; drag + zoom; save
for (const lang of ["de", "en"]) {
  if (lang === "de") await setLang("DE");
  await input.setInputFiles(PHOTO);
  await page.getByRole("dialog").waitFor();
  await page.waitForTimeout(500);
  check(`error cleared after a valid pick (${lang})`, !(await bodyText()).includes("3.4 MB") && !(await bodyText()).includes("3,4 MB") && !(await bodyText()).includes("ist 3.4 MB"));
  if (lang === "de") {
    await shot("avatar-picked-de", { fullPage: false });
    const f = page.getByRole("button", { name: /Fotoposition/ });
    const b = await f.boundingBox();
    await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2); await page.mouse.down();
    await page.mouse.move(b.x + b.width / 2 + 60, b.y + b.height / 2, { steps: 5 }); await page.mouse.up();
    await page.getByRole("slider").focus();
    for (let i = 0; i < 40; i++) await page.keyboard.press("ArrowRight");
    await shot("avatar-cropped-de", { fullPage: false });
    await page.getByRole("button", { name: "Abbrechen" }).last().click(); await page.waitForTimeout(400); await setLang("EN");
  }
}
await shot("avatar-picked-en", { fullPage: false });
const frame = page.getByRole("button", { name: /Photo position/ });
const box = await frame.boundingBox();
const imgBefore = await frame.locator("img").evaluate((el) => el.style.left);
await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
await page.mouse.down();
await page.mouse.move(box.x + box.width / 2 + 60, box.y + box.height / 2, { steps: 5 });
await page.mouse.up();
const imgAfterDrag = await frame.locator("img").evaluate((el) => el.style.left);
check("drag moves the photo", imgBefore !== imgAfterDrag, `${imgBefore} -> ${imgAfterDrag}`);
const thumb = page.getByRole("slider");
await thumb.focus();
for (let i = 0; i < 40; i++) await page.keyboard.press("ArrowRight");
const zoomW = await frame.locator("img").evaluate((el) => parseFloat(el.style.height));
check("zoom enlarges the photo", zoomW > 248, String(zoomW));
await frame.focus();
const topBefore = await frame.locator("img").evaluate((el) => el.style.top);
await page.keyboard.press("ArrowUp");
const topAfter = await frame.locator("img").evaluate((el) => el.style.top);
check("arrow key moves the photo", topBefore !== topAfter, `${topBefore} -> ${topAfter}`);
await shot("avatar-cropped-en", { fullPage: false });
await page.getByRole("button", { name: "Save photo" }).click();
await page.waitForTimeout(600);
const g = await guest();
check("avatar stored as JPEG data URL", g.avatar?.startsWith("data:image/jpeg;base64,"));
check("stored avatar is small (<80 KB)", (g.avatar?.length ?? 1e9) < 80_000, String(g.avatar?.length));
const dims = await page.evaluate((src) => new Promise((r) => { const i = new Image(); i.onload = () => r([i.naturalWidth, i.naturalHeight]); i.src = src; }), g.avatar);
check("stored avatar is 256×256", dims[0] === 256 && dims[1] === 256, String(dims));
check("Remove photo appears", (await page.getByRole("button", { name: "Remove photo" }).count()) === 1);
check("tab bar shows the photo", (await page.locator('nav img[src^="data:image/jpeg"]').count()) === 1);
await both("avatar-saved");

// Rename + Save returns to the hub with the new name and photo
await page.getByRole("textbox", { name: "Name" }).fill("");
check("empty name blocks Save", await page.getByRole("button", { name: "Save", exact: true }).isDisabled());
await page.getByRole("textbox", { name: "Name" }).fill("Anna M. Keller");
await page.getByRole("button", { name: "Save", exact: true }).click();
await page.waitForTimeout(600);
text = await bodyText();
check("Save returns to the hub with the new name", page.url().endsWith("#/account") && text.includes("Anna M. Keller"), page.url());
check("hub header shows the photo", (await page.locator('main header img[src^="data:image/jpeg"]').count()) === 1);
await both("hub-avatar");

// Remove photo: shared ConfirmDialog, Cancel keeps it, confirm removes it
await page.getByRole("link", { name: "Edit profile" }).first().click(); await page.waitForTimeout(500);
await page.getByRole("button", { name: "Remove photo" }).click();
await page.getByRole("alertdialog").waitFor();
check("remove asks first", (await bodyText()).includes("Remove your profile photo?"));
await shot("remove-confirm-en", { fullPage: false });
await page.getByRole("alertdialog").getByRole("button", { name: "Cancel" }).click();
await page.waitForTimeout(400);
check("Cancel keeps the photo", Boolean((await guest()).avatar));
await setLang("DE");
await page.getByRole("button", { name: "Foto entfernen" }).click();
await page.getByRole("alertdialog").waitFor();
await shot("remove-confirm-de", { fullPage: false });
await page.getByRole("alertdialog").getByRole("button", { name: "Foto entfernen" }).click();
await page.waitForTimeout(500);
await setLang("EN");
check("confirm removes the photo", !(await guest()).avatar);
check("initials are back (AM K -> AK)", (await page.locator("main section span[aria-hidden]").first().innerText()) === "AK");
check("tab bar back to the icon", (await page.locator("nav img").count()) === 0);
await shot("avatar-removed-en", { fullPage: false });

// Legacy 1.12r deep links still land on the content; without history Back goes to the hub
const fresh = await context.newPage();
await fresh.setViewportSize({ width: 375, height: 812 });
await fresh.goto(BASE + "#/account?tab=payments"); await fresh.waitForTimeout(800);
check("legacy ?tab=payments opens Payments", (await fresh.locator("body").innerText()).includes("Payment history"));
await fresh.getByRole("button", { name: "Back" }).first().click(); await fresh.waitForTimeout(500);
check("Back without history goes to the hub", fresh.url().endsWith("#/account"), fresh.url());
await fresh.goto(BASE + "#/account?tab=bookings"); await fresh.waitForTimeout(800);
check("tour flow ?tab=bookings opens Tour bookings", (await fresh.locator("h1").first().innerText()) === "Tour bookings");
await fresh.goto(BASE + "#/account?tab=nonsense"); await fresh.waitForTimeout(800);
check("unknown tab falls back to the hub", (await fresh.locator("body").innerText()).includes("Your activity"));
await fresh.close();

// Empty states: remove orders through the prototype controls
await go("#/account?tab=payments");
await page.getByRole("region", { name: "Prototype controls" }).getByRole("button").first().click();
await page.getByRole("dialog").waitFor();
await page.getByRole("button", { name: "Remove my orders" }).click();
await page.waitForTimeout(600);
await go("#/account");
text = await bodyText();
check("hub empty: No gift orders yet + Nothing due", text.includes("No gift orders yet") && text.includes("Nothing due"));
await shot("hub-empty-en");
await go("#/account?tab=payments");
check("payments empty: No payments yet", (await bodyText()).includes("No payments yet."));
await both("payments-empty");

// Sign out returns to the prompt; signing in from a sub-screen returns there
await go("#/account");
await page.getByRole("button", { name: "Sign out" }).click();
await page.waitForTimeout(500);
check("sign out shows the prompt", /Sign in to see your orders/.test(await bodyText()));
await go("#/account?tab=notifications");
await page.getByRole("button", { name: "Sign in", exact: true }).click();
await page.getByRole("button", { name: /Continue with Google/ }).click();
await page.waitForURL(/#\/account/); await page.waitForTimeout(600);
check("sign-in from a sub-screen returns to it", page.url().endsWith("?tab=notifications"), page.url());

log(`\n${pass} PASS, ${fail} FAIL`);
await browser.close();
