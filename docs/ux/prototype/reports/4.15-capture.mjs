// 4.15 M20 check (spec M20, outline step 16, D9): the Private tours tab (kept in ?tab=private), each
// request's group size, dates, interests, email, language and time, New and Answered, "Mark
// answered" by hand with Undo, the reply link, a new C22 request arriving as New, the empty
// state, the Store Manager's access, and the desktop table.
// 375px DPR 2 in EN and DE, plus a 1280px desktop shot in EN.
// Run from a folder with playwright-core: node 4.15-capture.mjs <screens dir>
import { chromium } from "playwright-core";
import { mkdirSync, readdirSync } from "node:fs";

const BASE = process.env.BASE ?? "http://localhost:5253/";
const OUT = process.argv[2];
mkdirSync(OUT, { recursive: true });
const home = `${process.env.HOME}/.cache/ms-playwright`;
const dir = readdirSync(home).filter((d) => d.startsWith("chromium_headless_shell")).sort().pop();
const browser = await chromium.launch({ executablePath: `${home}/${dir}/chrome-headless-shell-linux64/chrome-headless-shell` });

let pass = 0, fail = 0;
const check = (name, ok, detail = "") => {
  ok ? pass++ : fail++;
  const text = typeof detail === "string" ? detail : JSON.stringify(detail);
  console.log(`${ok ? "PASS" : "FAIL"} ${name}${text === "" ? "" : ` | ${text.replace(/\n/g, " / ")}`}`);
};
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const copy = {
  en: { tab: "Private tours", new: "New", answered: "Answered", people6: "6 people", people4: "4 people", english: "English", answeredOn: "Answered on 07.10.2026, 09:00", mark: "Mark answered", marked: "Marked as answered.", undo: "Undo", reply: "Reply by email", none: "None given", empty: "No private tour requests yet. They appear here when a guest asks for a private tour.", from: "From", done: "Use this date", email: "Your email", send: "Send request" },
  de: { tab: "Private Touren", new: "Neu", answered: "Beantwortet", people6: "6 Personen", people4: "4 Personen", english: "Englisch", answeredOn: "Beantwortet am 07.10.2026, 09:00", mark: "Als beantwortet markieren", marked: "Als beantwortet markiert.", undo: "Rückgängig", reply: "Per E-Mail antworten", none: "Keine Angaben", empty: "Noch keine Anfragen für private Touren. Sie erscheinen hier, sobald ein Gast eine private Tour anfragt.", from: "Von", done: "Dieses Datum übernehmen", email: "Ihre E-Mail-Adresse", send: "Anfrage senden" },
};

const stored = (page) => page.evaluate(() => JSON.parse(localStorage.getItem("sk.demo")).data);
const overflow = (page) => page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
async function setRole(page, role) {
  await page.evaluate((r) => {
    const s = JSON.parse(localStorage.getItem("sk.demo"));
    s.role = r;
    localStorage.setItem("sk.demo", JSON.stringify(s));
  }, role);
  await page.reload();
  await wait(900);
}
async function go(page, hash) {
  await page.goto(`${BASE}${hash}`);
  await wait(900);
}
async function fresh(lang, width = 375) {
  const page = await browser.newPage({ viewport: { width, height: 812 }, deviceScaleFactor: width === 375 ? 2 : 1, reducedMotion: "reduce" });
  page.errors = [];
  page.on("console", (m) => m.type() === "error" && page.errors.push(m.text()));
  page.on("pageerror", (e) => page.errors.push(String(e)));
  await page.goto(BASE);
  await page.evaluate((l) => { localStorage.clear(); localStorage.setItem("sk.language", JSON.stringify(l)); }, lang);
  await page.reload();
  await wait(900);
  await setRole(page, "owner");
  return page;
}

for (const lang of ["en", "de"]) {
  const c = copy[lang];
  const page = await fresh(lang);
  await go(page, "#/store/requests?tab=private");
  check(`[${lang}] ?tab=private selects Private tours`, (await page.getByRole("tab", { selected: true }).innerText()).includes(c.tab));
  const cards = page.getByRole("list", { name: c.tab }).locator(":scope > li");
  check(`[${lang}] two requests, newest first`, (await cards.count()) === 2 && (await cards.nth(0).innerText()).includes("j.morgan@example.com") && (await cards.nth(1).innerText()).includes("s.baumann@example.com"));
  const first = await cards.nth(0).innerText();
  check(`[${lang}] the new request: New, group, dates, interests, language and time`, first.includes(c.new) && first.includes(c.people6) && first.includes("24.10.2026 – 25.10.2026") && first.includes("A family trip with grandparents in their eighties.") && first.includes(c.english) && first.includes("12.10.2026, 21:00"), first);
  check(`[${lang}] the date tile is the first preferred day`, /^(Sat|Sa\.?)\s*24\s*Okt|^(Sat|Sa\.?)\s*24\s*Oct/i.test(first.replace(/\n/g, " ")), first.slice(0, 20));
  const second = await cards.nth(1).innerText();
  check(`[${lang}] the answered request shows Answered and when, and no "Mark answered"`, second.includes(c.answered) && second.includes(c.answeredOn) && (await cards.nth(1).getByRole("button", { name: new RegExp(c.mark) }).count()) === 0, second);
  const reply1 = await cards.nth(0).getByRole("link", { name: c.reply }).getAttribute("href");
  const reply2 = await cards.nth(1).getByRole("link", { name: c.reply }).getAttribute("href");
  check(`[${lang}] the reply link is a mailto in each guest's language (D9)`, reply1 === "mailto:j.morgan@example.com?subject=Your%20private%20tour%20in%20Lucerne" && reply2 === "mailto:s.baumann@example.com?subject=Ihre%20private%20Tour%20in%20Luzern", [reply1, reply2]);
  check(`[${lang}] inbox: no horizontal overflow`, !(await overflow(page)));
  await page.screenshot({ path: `${OUT}/m20-inbox-${lang}.png`, fullPage: true });

  // Mark answered by hand, Undo, then mark again.
  await cards.nth(0).getByRole("button", { name: `${c.mark}: j.morgan@example.com` }).click();
  await wait(500);
  let pt1 = (await stored(page)).privateTourRequests.find((r) => r.id === "pt-1");
  check(`[${lang}] "Mark answered" saves when, shows a toast and the Answered state`, !!pt1.answeredAt && (await page.getByText(c.marked).isVisible()) && (await cards.nth(0).innerText()).includes(c.answered) && (await cards.nth(0).getByRole("button", { name: new RegExp(c.mark) }).count()) === 0);
  await page.screenshot({ path: `${OUT}/m20-marked-${lang}.png` });
  await page.getByRole("button", { name: c.undo }).click();
  await wait(500);
  pt1 = (await stored(page)).privateTourRequests.find((r) => r.id === "pt-1");
  check(`[${lang}] Undo makes it new again`, pt1.answeredAt === undefined && (await cards.nth(0).innerText()).includes(c.new));
  await cards.nth(0).getByRole("button", { name: `${c.mark}: j.morgan@example.com` }).click();
  await wait(500);
  check(`[${lang}] marked again, it stays answered after a refresh`, !!(await stored(page)).privateTourRequests.find((r) => r.id === "pt-1").answeredAt);
  await page.reload();
  await wait(900);
  check(`[${lang}] after the refresh the card reads Answered on …`, (await cards.nth(0).innerText()).includes(lang === "en" ? "Answered on" : "Beantwortet am"));

  // A new C22 request (single day, no interests) arrives as New.
  await setRole(page, "guest");
  await go(page, "#/tours/private-tour");
  const size = page.locator("input[inputmode=numeric], .quantity-stepper input").first();
  await size.fill("4");
  await size.press("Tab");
  await page.getByRole("button", { name: new RegExp(`^${c.from},`) }).click();
  await wait(400);
  await page.getByRole("dialog").locator("[data-slot=calendar-cell]:not([data-outside-month])").filter({ hasText: /^24$/ }).click();
  await page.getByRole("dialog").getByRole("button", { name: c.done }).click();
  await wait(400);
  await page.getByLabel(c.email).fill("group@example.com");
  await page.getByRole("button", { name: c.send }).click();
  await wait(800);
  check(`[${lang}] C22 sent`, page.url().includes("#/tours/private-tour/sent"), page.url());
  await setRole(page, "owner");
  await go(page, "#/store/requests?tab=private");
  const top = await cards.nth(0).innerText();
  check(`[${lang}] the new request tops M20 as New`, top.includes("group@example.com") && top.includes(c.new) && (await page.getByRole("tab", { name: new RegExp(c.tab) }).innerText()).includes("3"), top);
  check(`[${lang}] a single day shows one date; no interests reads "${c.none}"`, top.includes(c.people4) && top.includes("24.10.2026") && !top.includes("24.10.2026 –") && top.includes(c.none), top);

  // The Store Manager has the same access (D12).
  await setRole(page, "manager");
  await go(page, "#/store/requests?tab=private");
  check(`[${lang}] the Store Manager sees the inbox and can mark answered`, (await cards.count()) === 3 && (await cards.nth(0).getByRole("button", { name: new RegExp(c.mark) }).count()) === 1);

  // Empty state.
  await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem("sk.demo"));
    s.data.privateTourRequests = [];
    localStorage.setItem("sk.demo", JSON.stringify(s));
  });
  await page.reload();
  await wait(900);
  check(`[${lang}] empty: one sentence, count 0`, (await page.getByText(c.empty).first().isVisible()) && (await page.getByRole("tab", { name: new RegExp(c.tab) }).innerText()).includes("0"));
  await page.screenshot({ path: `${OUT}/m20-empty-${lang}.png` });
  check(`[${lang}] no console or page errors`, page.errors.length === 0, page.errors);
  await page.close();
}

// Desktop, 1280px, EN: the table with "Mark answered" in its own column.
{
  const page = await fresh("en", 1280);
  await go(page, "#/store/requests?tab=private");
  const table = page.getByRole("grid", { name: "Private tours" });
  check("[desktop] the inbox is a table with 2 rows", (await table.isVisible()) && (await table.getByRole("row").count()) === 3);
  const row = table.getByRole("row").nth(1);
  check("[desktop] the row shows group and dates, interests and New", (await row.innerText()).includes("6 people") && (await row.innerText()).includes("24.10.2026 – 25.10.2026") && (await row.innerText()).includes("New"));
  check("[desktop] the email is the reply link", (await row.getByRole("link", { name: "j.morgan@example.com" }).getAttribute("href")).startsWith("mailto:j.morgan@example.com"));
  await page.screenshot({ path: `${OUT}/m20-desktop.png` });
  await row.getByRole("button", { name: "Mark answered: j.morgan@example.com" }).click();
  await wait(500);
  check("[desktop] Mark answered in the table", (await row.innerText()).includes("Answered on") && (await row.getByRole("button").count()) === 0);
  check("[desktop] no horizontal overflow", !(await overflow(page)));
  check("[desktop] no console or page errors", page.errors.length === 0, page.errors);
  await page.close();
}

console.log(`\nRESULT ${pass} passed, ${fail} failed`);
await browser.close();
process.exit(fail ? 1 : 0);
