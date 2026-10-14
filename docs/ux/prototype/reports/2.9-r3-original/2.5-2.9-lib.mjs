// Shared helpers for the 2.5–2.9 guest tour booking drivers (worker B, 13 Oct 2026).
// Run from a folder with playwright-core installed: node 2.N-drive.mjs <repo root>
// Dev server without HMR, so other sessions' edits cannot remount the page mid-run:
//   cd front-end && npx vite --config ../docs/ux/prototype/reports/1.6-vite.nohmr.mjs --port 5232 --strictPort
import { chromium } from "playwright-core";
import { mkdirSync, readdirSync } from "node:fs";

const home = process.env.HOME + "/.cache/ms-playwright/";
const dir = readdirSync(home).filter((d) => d.startsWith("chromium_headless_shell-")).sort().pop();
const exe = `${home}${dir}/chrome-headless-shell-linux64/chrome-headless-shell`;
export const BASE = process.env.BASE ?? "http://localhost:5232/";

export async function start(step) {
  const ROOT = process.argv[2] ?? "/home/ross-geller/Projects/minastik/swiss-keepsakes";
  const OUT = `${ROOT}/docs/ux/prototype/screens/${step}`;
  mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ executablePath: exe });
  const context = await browser.newContext({ viewport: { width: 375, height: 812 }, deviceScaleFactor: 2, acceptDownloads: true });
  const page = await context.newPage();
  let pass = 0, fail = 0;
  const check = (name, ok, extra = "") => { ok ? pass++ : fail++; console.log(ok ? "PASS" : "FAIL", name, extra === "" ? "" : `| ${extra}`); };
  page.on("console", (m) => { if (m.type() === "error") console.log("CONSOLE", m.text().slice(0, 300)); });
  page.on("pageerror", (e) => console.log("PAGEERROR", e.message));
  const wait = (ms = 400) => page.waitForTimeout(ms);
  // Intl money uses a no-break space between CHF and the amount.
  const text = async (sel = "body") => (await page.locator(sel).first().innerText()).replace(/[\u00a0\u202f]/g, " ");
  const body = async () => (await text("main, body")).replace(/\n+/g, " | ");
  const has = async (re) => re.test(await text());
  const store = () => page.evaluate(() => JSON.parse(localStorage.getItem("sk.demo")));
  const tours = async () => (await store()).data.tours;
  const booking = async (id) => (await tours()).bookings.find((b) => b.id === id);
  const go = async (hash) => { await page.goto(BASE + "#" + hash); await wait(700); };
  const bookingIdFromUrl = () => page.url().match(/bookings\/([^/?]+)/)?.[1];
  // The prototype strip scrolls away under the fixed compact bar: go to the top first.
  const top = () => page.evaluate(() => window.scrollTo(0, 0));
  const lang = async (id) => { await top(); await page.getByRole("group", { name: "Language" }).getByRole("button", { name: id }).first().click(); await wait(300); };
  const overflow = () => page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  const shot = async (name, fullPage = true) => {
    await wait(350);
    await page.screenshot({ path: `${OUT}/${name}.png`, fullPage });
    check(`no horizontal overflow (${name})`, (await overflow()) <= 0);
    if (name.endsWith("-de")) {
      const text = await page.locator("body").innerText();
      const raw = text.match(/\b(tourBooking|tours|tourDiscovery|guestOrder|payment)\.[a-zA-Z.-]+/);
      check(`no raw i18n keys (${name})`, !raw, raw?.[0] ?? "");
    }
  };
  // EN screenshot, then DE, back to EN.
  const both = async (name, fullPage = true) => { await shot(`${name}-en`, fullPage); await lang("DE"); await shot(`${name}-de`, fullPage); await lang("EN"); };
  const reset = async () => {
    await page.goto(BASE); await wait(300);
    await page.evaluate(() => localStorage.clear());
    await page.reload(); await wait(800);
  };
  const signIn = async (returnTo = "/account") => {
    await go(`/sign-in?returnTo=${encodeURIComponent(returnTo)}`);
    await page.getByRole("button", { name: /Continue with Google/ }).click();
    await wait(900);
  };
  // Prototype controls drawer: press a control button by name (most close the drawer).
  const control = async (name, { close = false } = {}) => {
    await top();
    await page.getByRole("region", { name: "Prototype controls" }).getByRole("button").first().click();
    await wait(500);
    const button = page.getByRole("dialog").getByRole("button", { name });
    const enabled = await button.isEnabled();
    if (enabled) await button.click();
    await wait(500);
    if (close || !enabled) { await page.keyboard.press("Escape"); await wait(400); }
    return enabled;
  };
  // Seats C10 shows for a departure label like "Fri 16 Oct".
  const seatsOnC10 = async (slug, dayLabel) => {
    await go(`/tours/${slug}/book`);
    const text = await page.locator("body").innerText();
    const i = text.indexOf(dayLabel);
    const m = text.slice(i, i + 160).match(/(\d+) seats? available|Sold out|Ausgebucht|(\d+) (?:freie )?Plätze?/);
    return m ? (m[1] ?? m[2] ?? m[0]) : null;
  };
  // Sum of seats held or booked on a departure, from stored data (same rule as availableSeats).
  const seatsTaken = async (departureId) => {
    const s = await store();
    const now = Date.parse("2026-10-13T10:00:00+02:00") + Math.max(0, Date.now() - s.clockStartedAt);
    return s.data.tours.bookings
      .filter((b) => b.departureId === departureId && (b.status === "pending_payment" ? Date.parse(b.holdUntil) > now : !["expired", "cancelled"].includes(b.status)))
      .reduce((sum, b) => sum + b.adults + b.children, 0);
  };
  // Simulated emails about one booking, oldest first, as "to:template" (e.g. "guest:N07").
  const mails = async (id) => (await store()).data.mail.filter((m) => m.bookingId === id).map((m) => `${m.to}:${m.template}`).join(",");
  const paid = (b) => b.payments.filter((p) => p.status === "succeeded").reduce((s, p) => s + p.amount, 0);
  // Keyboard: Tab from the top of the page until the focused element's name matches, then
  // compare its outline and shadow focused (keyboard, :focus-visible) and 400ms after blur.
  const keyboard = async (label, re, max = 80) => {
    await page.evaluate(() => { document.activeElement?.blur(); window.scrollTo(0, 0); });
    let reached = false;
    for (let i = 0; i < max && !reached; i++) {
      await page.keyboard.press("Tab");
      reached = re.test(await page.evaluate(() => { const el = document.activeElement; return (el?.getAttribute("aria-label") || el?.textContent || "").trim(); }));
    }
    if (!reached) return check(`keyboard: ${label} reachable by Tab`, false);
    await wait(250);
    const style = () => page.evaluate(() => { const s = getComputedStyle(document.activeElement); return `${s.outlineStyle} ${s.outlineWidth} ${s.outlineColor} | ${s.boxShadow}`; });
    const focused = await style();
    const visible = await page.evaluate(() => document.activeElement.matches(":focus-visible") || document.activeElement.hasAttribute("data-focus-visible"));
    await page.evaluate(() => { window.__last = document.activeElement; document.activeElement.blur(); });
    await wait(400);
    const blurred = await page.evaluate(() => { const s = getComputedStyle(window.__last); return `${s.outlineStyle} ${s.outlineWidth} ${s.outlineColor} | ${s.boxShadow}`; });
    check(`keyboard: ${label} reachable by Tab with a visible focus ring`, visible && focused !== blurred, `focused ${focused} / blurred ${blurred}`);
  };
  const finish = async () => {
    console.log(`\nRESULT ${pass} passed, ${fail} failed`);
    await browser.close();
    process.exitCode = fail ? 1 : 0;
  };
  return { page, context, text, check, wait, body, has, store, tours, booking, go, bookingIdFromUrl, lang, shot, both, reset, signIn, control, seatsOnC10, seatsTaken, paid, mails, keyboard, finish, OUT };
}

// C10 → C11 for a tour/departure with a group. Labels are the EN app copy.
export async function chooseDeparture(t, slug, dayLabel, group = null) {
  const { page, go, wait } = t;
  await go(`/tours/${slug}/book`);
  await page.getByText(dayLabel, { exact: false }).first().click();
  await wait(300);
  if (group) {
    // C10 steppers: Decrease/Increase pairs in the order adults, children, infants.
    const keys = ["adults", "children", "infants"];
    for (const [key, target] of Object.entries(group)) {
      const i = keys.indexOf(key);
      for (let n = 0; n < 10; n++) {
        const current = (await t.tours()).draft[key];
        if (current === target) break;
        await page.locator(`button[aria-label="${current < target ? "Increase" : "Decrease"}"]`).nth(i).click({ timeout: 5000 });
        await wait(150);
      }
    }
  }
}

export async function toReview(t) {
  await t.page.getByRole("button", { name: /Review/ }).last().click();
  await t.wait(700);
}

export async function fillContact(t, name = "Anna Keller", phone = "+41 79 123 45 67") {
  await t.page.getByLabel("Contact name").fill(name);
  await t.page.getByLabel("Mobile number").fill(phone);
}

export async function submitReview(t) {
  await t.page.locator("form button[type=submit]").click();
  await t.wait(900);
}
