// 4.17 notification check (spec §6 N16, N17; outline §5, D10, A2): sending C21 adds N16 to the
// simulated mailbox, to the M19 recipient address, in English, with every question as sent and
// its answer, the guest's email and language; sending C22 adds N17 to the Owner (English) and the
// Manager (German) with group size, dates, interests and the guest's email; each mail links to its
// request in M19 or M20 and opens it as a merchant; a changed recipient gets the next N16; the
// guest gets no email. 375px DPR 2, the guest in EN and in DE.
// Run from a folder with playwright-core: node 4.17-capture.mjs <screens dir>
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
  en: { send: "Send", sendTeam: "Send to the team", date: /Choose a date/, done: "Done", from: "From", to: "To", useDate: "Use this date", email: "Your email", sendRequest: "Send request", guestLang: "English", recipient: "Recipient email", save: "Save" },
  de: { send: "Senden", sendTeam: "An das Team senden", date: /Datum wählen/, done: "Fertig", from: "Von", to: "Bis", useDate: "Dieses Datum übernehmen", email: "Ihre E-Mail-Adresse", sendRequest: "Anfrage senden", guestLang: "German", recipient: "Empfänger-E-Mail", save: "Speichern" },
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

/** Answers every C21 question of the current set and sends with `email`. */
async function sendAdvice(page, c, email) {
  await go(page, "#/plan");
  const set = (await stored(page)).adviceQuestions;
  const composer = page.locator("[data-composer]");
  const thread = page.locator("ol").first();
  const tapSend = () => composer.getByRole("button", { name: c.send, exact: true }).click();
  for (const q of set.questions) {
    if (q.type === "number") await tapSend();
    else if (q.type === "single") await thread.getByRole("row").first().click();
    else if (q.type === "multi") { await thread.getByRole("row").first().click(); await tapSend(); }
    else if (q.type === "date") {
      await composer.getByRole("button", { name: c.date }).click();
      await wait(500);
      await page.getByRole("dialog").locator('[role="gridcell"]').filter({ hasText: /^20$/ }).first().click();
      await page.getByRole("dialog").getByRole("button", { name: c.done }).click();
      await wait(500);
      await tapSend();
    } else { await composer.locator("textarea").fill("A quiet dinner by the lake, please."); await tapSend(); }
    await wait(450);
  }
  await composer.locator("input").fill(email);
  await tapSend();
  await wait(600);
  await composer.getByRole("button", { name: c.sendTeam }).click();
  await wait(1000);
}

/** Sends C22: From the 24th, To the 25th when `to`, with interests when given. */
async function sendPrivateTour(page, c, { email, size, to, interests }) {
  await go(page, "#/tours/private-tour");
  const input = page.locator("input[inputmode=numeric], .quantity-stepper input").first();
  await input.fill(String(size));
  await input.press("Tab");
  const pick = async (half, day) => {
    await page.getByRole("button", { name: new RegExp(`^${half},`) }).click();
    await wait(400);
    await page.getByRole("dialog").locator("[data-slot=calendar-cell]:not([data-outside-month])").filter({ hasText: new RegExp(`^${day}$`) }).click();
    await page.getByRole("dialog").getByRole("button", { name: c.useDate }).click();
    await wait(400);
  };
  await pick(c.from, 24);
  if (to) await pick(c.to, 25);
  if (interests) await page.locator("textarea").fill(interests);
  await page.getByLabel(c.email).fill(email);
  await page.getByRole("button", { name: c.sendRequest }).click();
  await wait(800);
}

const mailButton = (page) => page.getByRole("button", { name: /^Mail, / });
async function openStaffMail(page) {
  await mailButton(page).click();
  await wait(600);
  await page.getByRole("tab", { name: /^Staff/ }).click();
  await wait(300);
  return page.getByRole("dialog").getByRole("tabpanel").locator("details");
}
async function closeMail(page) {
  await page.getByRole("button", { name: "Close mail" }).click();
  await wait(500);
}
const count = (mail, to) => mail.filter((m) => m.to === to).length;

for (const lang of ["en", "de"]) {
  const c = copy[lang];
  const page = await browser.newPage({ viewport: { width: 375, height: 812 }, deviceScaleFactor: 2, reducedMotion: "reduce" });
  const errors = [];
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.goto(BASE);
  await page.evaluate((l) => { localStorage.clear(); localStorage.setItem("sk.language", JSON.stringify(l)); }, lang);
  await page.reload();
  await wait(900);
  const start = (await stored(page)).mail;
  const guestMailBefore = count(start, "guest");

  // N16 after C21.
  await sendAdvice(page, c, "guest@example.com");
  let data = await stored(page);
  const request = data.adviceRequests.at(-1);
  const n16 = data.mail.at(-1);
  check(`[${lang}] C21 sends exactly one email: N16 to the shop`, data.mail.length === start.length + 1 && n16.template === "N16" && n16.to === "staff", n16);
  check(`[${lang}] N16 goes to the M19 recipient address, in English (D10)`, n16.recipient === "requests@swisskeepsakes.example" && n16.language === "en");
  check(`[${lang}] N16 keeps every question and answer as sent`, n16.params.count === request.answers.length && request.answers.every((a, i) => n16.params[`q${i}`] === a.question && n16.params[`a${i}`] === a.answer) && n16.params.requestId === request.id);
  check(`[${lang}] the guest gets no email (A2)`, count(data.mail, "guest") === guestMailBefore);

  const items = await openStaffMail(page);
  const n16Text = await items.first().innerText();
  check(`[${lang}] Mail panel: N16 is the newest staff mail, in EN`, n16Text.includes("N16") && n16Text.includes("EN ·") && n16Text.includes("New advice request from guest@example.com"), n16Text.slice(0, 80));
  check(`[${lang}] N16: To the request address`, n16Text.includes("To: requests@swisskeepsakes.example"));
  check(`[${lang}] N16: every question with its answer, in the wording the guest saw`, request.answers.every((a) => n16Text.includes(`${a.question} — ${a.answer}`)) && (lang === "de" ? n16Text.includes("Wie viele Erwachsene reisen mit? — 1") : n16Text.includes("How many adults are travelling? — 1")));
  check(`[${lang}] N16: the guest's email and language`, n16Text.includes("Guest email: guest@example.com") && n16Text.includes(`Guest language: ${c.guestLang}`));
  check(`[${lang}] mail panel: no horizontal overflow`, !(await overflow(page)));
  await page.screenshot({ path: `${OUT}/mail-n16-${lang}.png` });
  await items.first().getByRole("link", { name: "Open the request" }).scrollIntoViewIfNeeded();
  await page.screenshot({ path: `${OUT}/mail-n16-link-${lang}.png` });

  await items.first().getByRole("link", { name: "Open the request" }).click();
  await wait(1000);
  data = await stored(page);
  check(`[${lang}] the N16 link opens the request in M19 as the Owner`, page.url().endsWith(`#/store/requests/advice/${request.id}`) && (await page.evaluate(() => JSON.parse(localStorage.getItem("sk.demo")).role)) === "owner" && (await page.getByRole("dialog").count()) === 0, page.url());
  check(`[${lang}] …and opening it marks it read`, !!data.adviceRequests.find((r) => r.id === request.id).readAt);

  // A changed recipient gets the next N16.
  await go(page, "#/store/requests?tab=questions");
  await page.getByLabel(c.recipient).fill("advice@swisskeepsakes.example");
  await page.getByRole("button", { name: c.save, exact: true }).click();
  await wait(500);
  await setRole(page, "guest");
  await sendAdvice(page, c, "second@example.com");
  data = await stored(page);
  check(`[${lang}] after a recipient change the next N16 goes to the new address`, data.mail.at(-1).template === "N16" && data.mail.at(-1).recipient === "advice@swisskeepsakes.example" && data.mail.at(-1).params.email === "second@example.com");

  // N17 after C22: one to the Owner in English, one to the Manager in German.
  const before17 = data.mail.length;
  await sendPrivateTour(page, c, { email: "group@example.com", size: 6, to: true, interests: "History and a coffee stop." });
  data = await stored(page);
  const n17 = data.mail.slice(before17);
  const owner = n17.find((m) => m.params.staffRole === "owner");
  const manager = n17.find((m) => m.params.staffRole === "manager");
  check(`[${lang}] C22 sends two N17, to the Owner and the Manager`, n17.length === 2 && n17.every((m) => m.template === "N17" && m.to === "staff") && !!owner && !!manager, n17.map((m) => m.recipient));
  check(`[${lang}] each in their interface language: Owner EN, Manager DE`, owner.language === "en" && owner.recipient === "Chị Ngọc (Owner)" && manager.language === "de" && manager.recipient === "Lukas (Store Manager)");
  check(`[${lang}] the guest still gets no email (A2)`, count(data.mail, "guest") === guestMailBefore);

  const items17 = await openStaffMail(page);
  // Newest first: the Manager's mail, then the Owner's.
  await items17.nth(1).locator("summary").click();
  await wait(300);
  const managerText = await items17.nth(0).innerText();
  const ownerText = await items17.nth(1).innerText();
  check(`[${lang}] N17 to the Owner, in English: group, dates, interests, guest email`, ownerText.includes("N17") && ownerText.includes("New private tour request: 6 people, 24.10.2026 – 25.10.2026") && ownerText.includes("To: Chị Ngọc (Owner)") && ownerText.includes("Hello Chị Ngọc,") && ownerText.includes("Group: 6 people") && ownerText.includes("Preferred dates: 24.10.2026 – 25.10.2026") && ownerText.includes("Interests: History and a coffee stop.") && ownerText.includes("Guest email: group@example.com"), ownerText);
  check(`[${lang}] N17 to the Manager, in German`, managerText.includes("DE ·") && managerText.includes("Neue Anfrage für eine private Tour: 6 Personen, 24.10.2026 – 25.10.2026") && managerText.includes("To: Lukas (Store Manager)") && managerText.includes("Grüezi Lukas") && managerText.includes("Gruppe: 6 Personen") && managerText.includes("Gewünschte Daten: 24.10.2026 – 25.10.2026") && managerText.includes("Interessen: History and a coffee stop.") && managerText.includes("E-Mail des Gastes: group@example.com") && managerText.includes(`Sprache des Gastes: ${lang === "de" ? "Deutsch" : "Englisch"}`), managerText);
  await page.screenshot({ path: `${OUT}/mail-n17-${lang}.png` });
  await items17.nth(0).getByRole("link", { name: "Anfragen für private Touren öffnen" }).click();
  await wait(1000);
  check(`[${lang}] the Manager's N17 link opens M20 as the Store Manager`, page.url().endsWith("#/store/requests?tab=private") && (await page.evaluate(() => JSON.parse(localStorage.getItem("sk.demo")).role)) === "manager" && (await page.getByRole("tab", { selected: true }).innerText()).includes(lang === "en" ? "Private tours" : "Private Touren"), page.url());
  check(`[${lang}] …where the request is listed first`, (await page.getByRole("list", { name: lang === "en" ? "Private tours" : "Private Touren" }).locator(":scope > li").first().innerText()).includes("group@example.com"));

  // A single day without interests.
  await setRole(page, "guest");
  const beforeSolo = (await stored(page)).mail.length;
  await sendPrivateTour(page, c, { email: "solo@example.com", size: 1, to: false });
  data = await stored(page);
  check(`[${lang}] the second C22 sends two more N17`, data.mail.length === beforeSolo + 2);
  const soloItems = await openStaffMail(page);
  await soloItems.nth(1).locator("summary").click();
  await wait(300);
  const soloEn = await soloItems.nth(1).innerText();
  const soloDe = await soloItems.nth(0).innerText();
  check(`[${lang}] a single day shows one date, 1 person, and no interests line`, soloEn.includes("New private tour request: 1 person, 24.10.2026") && !soloEn.includes("24.10.2026 –") && !soloEn.includes("Interests:") && soloDe.includes("1 Person, 24.10.2026") && !soloDe.includes("Interessen:"), soloEn);
  check(`[${lang}] the guest tab is unchanged after four requests (A2)`, (await page.getByRole("tab", { name: /^Guest/ }).innerText()).includes(`(${guestMailBefore})`));
  await closeMail(page);
  check(`[${lang}] no console or page errors`, errors.length === 0, errors);
  await page.close();
}

console.log(`\nRESULT ${pass} passed, ${fail} failed`);
await browser.close();
process.exit(fail ? 1 : 0);
