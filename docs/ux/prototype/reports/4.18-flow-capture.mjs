// 4.18 cross-track check: the paths that join the three merchant tracks, driven through the UI.
// AC31: the Owner unpublishes a story's linked gift in M12 → M17 flags it, C20 drops it; publishing
// it again brings it back. Navigation: every merchant section opens from the phone More sheet and
// the desktop sidebar (no generated-path warnings). D12: the Manager reaches M11, M17/M18 and M19/M20.
// 375px and 1280px, EN and DE. Run from a folder with playwright-core: node 4.18-flow-capture.mjs <screens dir>
import { chromium } from "playwright-core";
import { mkdirSync, readdirSync } from "node:fs";

const BASE = process.env.BASE ?? "http://localhost:5243/";
const OUT = process.argv[2];
mkdirSync(OUT, { recursive: true });
const home = `${process.env.HOME}/.cache/ms-playwright`;
const dir = readdirSync(home).filter((d) => d.startsWith("chromium_headless_shell")).sort().pop();
const browser = await chromium.launch({ executablePath: `${home}/${dir}/chrome-headless-shell-linux64/chrome-headless-shell` });

let pass = 0, fail = 0;
const check = (name, ok, detail = "") => {
  ok ? pass++ : fail++;
  console.log(`${ok ? "PASS" : "FAIL"} ${name}${detail === "" ? "" : ` | ${typeof detail === "string" ? detail : JSON.stringify(detail)}`}`);
};
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
// Gifts are called Keepsakes / Andenken now ("Keepsakes and tours" is the story editor's links region).
const copy = {
  en: { publish: "Publish", unpublish: "Unpublish", saved: "Saved", links: "Keepsakes and tours", unpublished: "Unpublished: hidden on the story", postcards: "Lucerne postcard set", linked: "Bring a piece of it home", more: "More", nav: { Products: "/store/products", Content: "/store/content", Requests: "/store/requests" }, titles: ["Products", "Content", "Requests"] },
  de: { publish: "Veröffentlichen", unpublish: "Zurückziehen", saved: "Gespeichert", links: "Andenken und Touren", unpublished: "Nicht veröffentlicht: in der Geschichte ausgeblendet", postcards: "Luzerner Postkartenset", linked: "Ein Stück davon mitnehmen", more: "Mehr", nav: { Produkte: "/store/products", Inhalte: "/store/content", Anfragen: "/store/requests" }, titles: ["Produkte", "Inhalte", "Anfragen"] },
};

async function setup(lang, role, width = 375) {
  const page = await browser.newPage({ viewport: { width, height: 900 }, deviceScaleFactor: width === 375 ? 2 : 1, reducedMotion: "reduce" });
  const errors = [], routeWarnings = [];
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
    if (/matched route/i.test(m.text())) routeWarnings.push(m.text());
  });
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.goto(BASE);
  await page.evaluate((l) => { localStorage.clear(); localStorage.setItem("sk.language", JSON.stringify(l)); }, lang);
  await page.reload();
  await wait(900);
  await page.evaluate((r) => { const s = JSON.parse(localStorage.getItem("sk.demo")); s.role = r; localStorage.setItem("sk.demo", JSON.stringify(s)); }, role);
  return { page, errors, routeWarnings };
}
const setRole = (page, r) => page.evaluate((r) => { const s = JSON.parse(localStorage.getItem("sk.demo")); s.role = r; localStorage.setItem("sk.demo", JSON.stringify(s)); }, r);
const go = async (page, hash, ms = 1000) => { await page.goto(`${BASE}#${hash}`); await page.reload(); await wait(ms); };

for (const lang of ["en", "de"]) {
  const c = copy[lang];
  const { page, errors, routeWarnings } = await setup(lang, "owner");

  // AC31 across tracks: M12 (products) → M17 (content) → C20 (guest).
  // Revision 2: M12 is a stepper; Unpublish and Publish sit on its Review step.
  const toggle = async (on) => {
    await go(page, "/store/products/gifts/p-postcards?step=review", 1200);
    await page.getByRole("button", { name: on ? c.publish : c.unpublish, exact: true }).click();
    await wait(600);
    return page.evaluate(() => JSON.parse(localStorage.getItem("sk.demo")).data.products.find((p) => p.id === "p-postcards").published);
  };
  check(`[${lang}] M12: unpublishing the postcards saves`, (await toggle(false)) === false);
  await go(page, "/store/content/articles/musegg-morning-en", 1400);
  const links = page.getByRole("region", { name: c.links });
  const linksText = await links.innerText();
  check(`[${lang}] M17: the story keeps the link with the unpublished warning`, linksText.includes(c.unpublished), linksText);
  await links.scrollIntoViewIfNeeded();
  await page.screenshot({ path: `${OUT}/m17-after-m12-unpublish-${lang}.png` });
  await setRole(page, "guest");
  await go(page, "/stories/musegg-morning", 1500);
  const linked = page.getByRole("region", { name: c.linked }).first();
  const linkedText = await linked.innerText();
  check(`[${lang}] C20: the unpublished gift is gone, the tour stays`, !linkedText.includes(c.postcards) && linkedText.length > 0, linkedText);
  await setRole(page, "owner");
  check(`[${lang}] M12: publishing again saves`, (await toggle(true)) !== false);
  await setRole(page, "guest");
  await go(page, "/stories/musegg-morning", 1500);
  check(`[${lang}] C20: the gift is back in the shop's order`, (await page.getByRole("region", { name: c.linked }).first().innerText()).includes(c.postcards));
  await linked.scrollIntoViewIfNeeded().catch(() => {});
  await page.screenshot({ path: `${OUT}/c20-links-restored-${lang}.png` });

  // Phone navigation: the More sheet opens each new section.
  await setRole(page, "owner");
  await go(page, "/store", 1000);
  for (const [label, path] of Object.entries(c.nav)) {
    await page.getByRole("button", { name: c.more }).click();
    await wait(400);
    await page.getByRole("dialog").getByRole("link", { name: label }).click();
    await wait(900);
    check(`[${lang}] More sheet → ${label} opens ${path}`, page.url().endsWith(`#${path}`), page.url());
    check(`[${lang}] ${label}: its own screen, not the placeholder`, (await page.getByRole("heading", { level: 1 }).first().innerText()).trim() === label);
  }
  check(`[${lang}] no route-matching warnings`, routeWarnings.length === 0, routeWarnings.slice(0, 2));
  check(`[${lang}] no console errors (owner, phone)`, errors.length === 0, errors.slice(0, 3));
  await page.close();

  // Desktop sidebar and the Manager role (D12).
  const desk = await setup(lang, "manager", 1280);
  await go(desk.page, "/store", 1000);
  for (const [label, path] of Object.entries(c.nav)) {
    await desk.page.getByRole("complementary").getByRole("link", { name: label }).click();
    await wait(900);
    check(`[${lang}] Manager, sidebar → ${label}`, desk.page.url().endsWith(`#${path}`) && (await desk.page.getByRole("heading", { level: 1 }).first().innerText()).trim() === label, desk.page.url());
    check(`[${lang}] Manager, ${label}: sidebar item active`, (await desk.page.getByRole("complementary").getByRole("link", { name: label }).getAttribute("data-status")) === "active");
  }
  await desk.page.screenshot({ path: `${OUT}/manager-requests-desktop-${lang}.png` });
  check(`[${lang}] no console errors (manager, desktop)`, desk.errors.length === 0, desk.errors.slice(0, 3));
  await desk.page.close();
}

await browser.close();
console.log(`\nRESULT ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
