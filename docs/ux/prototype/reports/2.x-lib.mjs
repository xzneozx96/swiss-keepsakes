// Shared helpers for the 2.1–2.4 drivers (worker A). Port 5231, 375px, headless chromium shell.
// Run from a folder with playwright-core installed: node 2.N-drive.mjs <screens dir>
import { chromium } from "playwright-core";
import { mkdirSync, readdirSync } from "node:fs";

export const BASE = "http://localhost:5231/";
export const DEMO_START = Date.parse("2026-10-13T10:00:00+02:00");
const RAW_KEY = /\b(tourDiscovery|tourMap|tourDetail|tourBooking|tours|detail|card|home|gifts|nav)\.[a-zA-Z]/;

export async function setup(out, { webgl = false } = {}) {
  mkdirSync(out, { recursive: true });
  const home = process.env.HOME + "/.cache/ms-playwright/";
  const dir = readdirSync(home).filter((d) => d.startsWith("chromium_headless_shell-")).sort().pop();
  const browser = await chromium.launch({
    executablePath: `${home}${dir}/chrome-headless-shell-linux64/chrome-headless-shell`,
    // SwiftShader gives the headless shell WebGL so the MapLibre map can render.
    args: webgl ? ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] : [],
  });
  const context = await browser.newContext({ viewport: { width: 375, height: 812 }, deviceScaleFactor: 2 });
  // Other workers edit the shared code while this runs: stub only Vite's HMR socket so their
  // saves cannot hot-reload the page mid-check. page.reload() still loads the latest code.
  await context.addInitScript(() => {
    const Native = window.WebSocket;
    const Patched = function (url, protocols) {
      const list = [].concat(protocols ?? []);
      if (list.includes("vite-hmr") || list.includes("vite-ping")) return Object.assign(new EventTarget(), { readyState: 0, send() {}, close() {} });
      return new Native(url, protocols);
    };
    Patched.prototype = Native.prototype;
    Object.assign(Patched, { CONNECTING: 0, OPEN: 1, CLOSING: 2, CLOSED: 3 });
    window.WebSocket = Patched;
  });
  const page = await context.newPage();
  let pass = 0, fail = 0;
  const check = (name, ok, extra = "") => {
    ok ? pass++ : fail++;
    console.log(ok ? "PASS" : "FAIL", name, extra === "" ? "" : `· ${typeof extra === "string" ? extra : JSON.stringify(extra)}`);
  };
  page.on("console", (m) => { if (m.type() === "error") console.log("CONSOLE", m.text().slice(0, 200)); });
  const errors = [];
  page.on("pageerror", (e) => { errors.push(e.message); console.log("PAGEERROR", e.message); });
  const bodyText = async () => (await page.locator("body").innerText()).replace(/\n+/g, " | ");
  const wait = (ms = 400) => page.waitForTimeout(ms);
  const shot = async (name, { full = false } = {}) => {
    await wait(600);
    if (full) {
      const h = await page.evaluate(() => document.documentElement.scrollHeight);
      await page.setViewportSize({ width: 375, height: Math.min(Math.max(812, h), 8000) });
      await wait(300);
    }
    await page.screenshot({ path: `${out}/${name}.png` });
    await page.setViewportSize({ width: 375, height: 812 });
    check(`no horizontal overflow (${name})`, (await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)) <= 0);
    if (name.endsWith("-de")) {
      const raw = (await bodyText()).match(RAW_KEY);
      check(`no raw i18n keys (${name})`, !raw, raw ? raw[0] : "");
    }
  };
  const setLang = async (id) => {
    await page.getByRole("group", { name: "Language" }).getByRole("button", { name: id }).first().click();
    await wait(300);
  };
  // The language switch sits in the top bar; clicking it scrolls up, so restore the position.
  const keepScroll = async (fn) => { const y = await page.evaluate(() => scrollY); await fn(); await page.evaluate((top) => scrollTo(0, top), y); await wait(200); };
  const both = async (name, opts) => { await shot(`${name}-en`, opts); await keepScroll(() => setLang("DE")); await shot(`${name}-de`, opts); await keepScroll(() => setLang("EN")); };
  const go = async (hash) => { await page.goto(BASE + hash); await wait(700); };
  const fresh = async () => { await page.goto(BASE); await page.evaluate(() => localStorage.clear()); await page.reload(); await wait(700); };
  const stored = () => page.evaluate(() => JSON.parse(localStorage.getItem("sk.demo")));
  const writeStored = async (state) => { await page.evaluate((s) => localStorage.setItem("sk.demo", JSON.stringify(s)), state); await page.reload(); await wait(800); };
  const signIn = async (returnTo = "/account") => {
    await go(`#/sign-in?returnTo=${returnTo}`);
    await page.getByRole("button", { name: /Continue with Google/ }).click();
    await wait(900);
  };
  const panel = async () => {
    await page.getByRole("region", { name: "Prototype controls" }).getByRole("button").first().click();
    await wait(500);
  };
  const done = async () => { console.log(`\n${pass} passed, ${fail} failed`); await browser.close(); };
  return { errors, page, browser, check, bodyText, wait, shot, setLang, both, go, fresh, stored, writeStored, signIn, panel, done };
}

/** Free seats exactly as the app counts them (selectors.availableSeats). */
export function seatsLeft(state, departureId) {
  const now = DEMO_START + (Date.now() - state.clockStartedAt);
  const t = state.data.tours;
  const d = t.departures.find((x) => x.id === departureId);
  const taken = t.bookings
    .filter((b) => b.departureId === departureId && (b.status === "pending_payment" ? Date.parse(b.holdUntil) > now : !["expired", "cancelled"].includes(b.status)))
    .reduce((n, b) => n + b.adults + b.children, 0);
  return Math.max(0, d.capacity - taken);
}
