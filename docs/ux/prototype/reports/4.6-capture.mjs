// 4.6 C22 check (D8, A1, A2, R03): the entry below the C08 list, the form (group 1–50, the
// date pair and sheet with no past days, optional interests, the email), inline errors that
// keep what was entered, the saved request for M20, the sent screen, Back after sending,
// single-day requests, the signed-in email prefill and the missing-request fallback.
// 375px, DPR 2, EN and DE. Run from a folder with playwright-core: node 4.6-capture.mjs <screens dir>
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
const copy = {
  en: { entry: "Travelling as a group?", action: "Request a private tour", title: "Private tour", from: "From", to: "To", done: "Use this date", datesError: "Choose the first day that suits you.", emailMissing: "Enter your email so our team can reply.", emailInvalid: "Check the email address.", email: "Your email", send: "Send request", sent: "Request sent", people6: "6 people", interests: "Interests", back: "Back to tours", missing: "This request is not on this device anymore.", dates: "Sat 24 Oct – Sun 25 Oct", single: "Mon 19 Oct" },
  de: { entry: "Mit einer Gruppe unterwegs?", action: "Private Tour anfragen", title: "Private Tour", from: "Von", to: "Bis", done: "Dieses Datum übernehmen", datesError: "Wählen Sie den ersten passenden Tag.", emailMissing: "Geben Sie Ihre E-Mail-Adresse ein, damit unser Team antworten kann.", emailInvalid: "Prüfen Sie die E-Mail-Adresse.", email: "Ihre E-Mail-Adresse", send: "Anfrage senden", sent: "Anfrage gesendet", people6: "6 Personen", interests: "Interessen", back: "Zurück zu den Touren", missing: "Diese Anfrage ist auf diesem Gerät nicht mehr vorhanden.", dates: "Sa., 24. Okt. – So., 25. Okt.", single: "Mo., 19. Okt." },
};

for (const lang of ["en", "de"]) {
  const c = copy[lang];
  const page = await browser.newPage({ viewport: { width: 375, height: 812 }, deviceScaleFactor: 2, reducedMotion: "reduce" });
  const errors = [];
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  page.on("pageerror", (e) => errors.push(String(e)));
  const overflow = () => page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  const stored = () => page.evaluate(() => JSON.parse(localStorage.getItem("sk.demo")).data);
  await page.goto(BASE);
  await page.evaluate((l) => { localStorage.clear(); localStorage.setItem("sk.language", JSON.stringify(l)); }, lang);
  await page.reload();
  await wait(900);
  const before = (await stored()).privateTourRequests.length;

  // Entry on C08, after the last tour card.
  await page.goto(`${BASE}#/tours`);
  await wait(900);
  const entry = page.getByRole("region", { name: c.entry });
  await entry.scrollIntoViewIfNeeded();
  check(`[${lang}] C08: the private tour entry is shown`, await entry.isVisible());
  const afterList = await page.evaluate((name) => {
    const list = document.querySelector("main ul, ul");
    const section = [...document.querySelectorAll("section")].find((s) => s.textContent.includes(name));
    return !!list && !!section && (list.compareDocumentPosition(section) & Node.DOCUMENT_POSITION_FOLLOWING) > 0;
  }, c.entry);
  check(`[${lang}] C08: the entry sits below the tour list`, afterList);
  await page.screenshot({ path: `${OUT}/c08-entry-${lang}.png` });
  await entry.getByRole("link", { name: c.action }).click();
  await wait(600);
  check(`[${lang}] the entry opens #/tours/private-tour`, page.url().endsWith("#/tours/private-tour"), page.url());
  check(`[${lang}] C22 renders, not the tour "not found" page`, (await page.getByRole("heading", { level: 1 }).innerText()) === c.title);
  check(`[${lang}] no sign-in asked`, !page.url().includes("sign-in") && (await page.getByRole("dialog").count()) === 0);
  check(`[${lang}] no tab bar on C22`, (await page.getByRole("navigation").count()) === 0 || !(await page.getByRole("navigation").first().isVisible()));

  // Group size 1–50.
  const size = page.locator("input[inputmode=numeric], .quantity-stepper input").first();
  check(`[${lang}] the group starts at 2`, (await size.inputValue()) === "2");
  await size.fill("0"); await size.press("Tab");
  check(`[${lang}] 0 is not possible: the count stays at 1 or more`, Number(await size.inputValue()) >= 1, await size.inputValue());
  await size.fill("99"); await size.press("Tab");
  check(`[${lang}] the count stops at 50`, (await size.inputValue()) === "50");
  await size.fill("6"); await size.press("Tab");
  check(`[${lang}] the email is empty for a signed-out guest`, (await page.getByLabel(c.email).inputValue()) === "");
  await page.screenshot({ path: `${OUT}/c22-form-${lang}.png` });

  // Send with no dates and no email: both errors, everything kept, focus on the first.
  const interests = "Our team of six, history and a short boat trip.";
  await page.locator("textarea").fill(interests);
  await page.getByRole("button", { name: c.send }).click();
  await wait(300);
  check(`[${lang}] missing dates: inline error`, await page.getByText(c.datesError).isVisible());
  check(`[${lang}] missing email: inline error`, await page.getByText(c.emailMissing).isVisible());
  check(`[${lang}] focus moves to the first invalid field (From)`, await page.evaluate((f) => document.activeElement?.getAttribute("aria-label")?.startsWith(f), c.from));
  check(`[${lang}] From is marked invalid`, (await page.getByRole("button", { name: new RegExp(`^${c.from},`) }).getAttribute("aria-invalid")) === "true");
  check(`[${lang}] the entered data is kept`, (await page.locator("textarea").inputValue()) === interests && (await size.inputValue()) === "6");
  check(`[${lang}] nothing was saved`, (await stored()).privateTourRequests.length === before);
  check(`[${lang}] still on C22`, page.url().endsWith("#/tours/private-tour"));
  // Viewport shots: a full-page capture would draw the sticky send bar over the email field.
  await page.getByText(c.datesError).scrollIntoViewIfNeeded();
  await page.screenshot({ path: `${OUT}/c22-errors-dates-${lang}.png` });
  await page.getByText(c.emailMissing).evaluate((el) => el.scrollIntoView({ block: "center" }));
  await wait(200);
  await page.screenshot({ path: `${OUT}/c22-errors-email-${lang}.png` });

  // Dates: past days are off; From then To, To cannot be before From.
  const pick = async (half, day) => {
    await page.getByRole("button", { name: new RegExp(`^${half},`) }).click();
    await wait(400);
    const sheet = page.getByRole("dialog");
    const cell = sheet.locator('[data-slot=calendar-cell]:not([data-outside-month])').filter({ hasText: new RegExp(`^${day}$`) });
    await cell.click();
    await sheet.getByRole("button", { name: c.done }).click();
    await wait(400);
  };
  await page.getByRole("button", { name: new RegExp(`^${c.from},`) }).click();
  await wait(400);
  const pastOff = await page.getByRole("dialog").locator('[data-slot=calendar-cell]:not([data-outside-month])').filter({ hasText: /^12$/ }).getAttribute("aria-disabled");
  check(`[${lang}] the date sheet: days before the demo today are off`, pastOff === "true");
  await page.screenshot({ path: `${OUT}/c22-date-${lang}.png` });
  await page.keyboard.press("Escape");
  await wait(300);
  await pick(c.from, 24);
  check(`[${lang}] choosing From clears the dates error`, (await page.getByText(c.datesError).count()) === 0);
  await page.getByRole("button", { name: new RegExp(`^${c.to},`) }).click();
  await wait(400);
  const beforeFromOff = await page.getByRole("dialog").locator('[data-slot=calendar-cell]:not([data-outside-month])').filter({ hasText: /^23$/ }).getAttribute("aria-disabled");
  check(`[${lang}] To cannot be before From`, beforeFromOff === "true");
  await page.keyboard.press("Escape");
  await wait(300);
  await pick(c.to, 25);

  // Bad email, then a good one.
  const email = page.getByLabel(c.email);
  await email.fill("guest@");
  await page.getByRole("button", { name: c.send }).click();
  await wait(300);
  check(`[${lang}] malformed email: inline error`, await page.getByText(c.emailInvalid).isVisible());
  check(`[${lang}] focus moves to the email`, await page.evaluate(() => document.activeElement?.getAttribute("type") === "email"));
  check(`[${lang}] long labels: no horizontal overflow`, !(await overflow()));
  await email.fill("guest@example.com");
  check(`[${lang}] typing clears the email error`, (await page.getByText(c.emailInvalid).count()) === 0);
  await page.getByRole("button", { name: c.send }).click();
  await wait(700);

  // Sent screen and the saved request.
  check(`[${lang}] sent: opens #/tours/private-tour/sent with the request`, /#\/tours\/private-tour\/sent\?request=pt-/.test(page.url()), page.url());
  const sentText = await page.locator("body").innerText();
  check(`[${lang}] sent: title`, (await page.getByRole("heading", { level: 1 }).innerText()) === c.sent);
  check(`[${lang}] sent: names the email the team replies to`, sentText.includes("guest@example.com"));
  check(`[${lang}] sent: group, dates and interests as sent`, sentText.includes(c.people6) && sentText.includes(c.dates) && sentText.includes(interests), sentText);
  check(`[${lang}] sent: no reply time promised`, !/\b(24|48)\s*(h|hours|Stunden)\b|within|innerhalb/i.test(sentText));
  check(`[${lang}] sent: no horizontal overflow`, !(await overflow()));
  await page.screenshot({ path: `${OUT}/c22-sent-${lang}.png`, fullPage: true });
  const saved = (await stored()).privateTourRequests;
  const req = saved.at(-1);
  check(`[${lang}] saved: one new request`, saved.length === before + 1);
  check(`[${lang}] saved: language, email, group, dates, interests, not answered`,
    req.language === lang && req.email === "guest@example.com" && req.groupSize === 6 && req.dateFrom === "2026-10-24" && req.dateTo === "2026-10-25" && req.interests === interests && req.answeredAt === undefined, req);

  // Back after sending does not reopen the filled form.
  await page.goBack();
  await wait(600);
  check(`[${lang}] Back after sending returns to C08, not the form`, page.url().endsWith("#/tours"), page.url());

  // A single day, no interests.
  await page.goto(`${BASE}#/tours/private-tour`);
  await wait(600);
  check(`[${lang}] a new form starts empty`, (await page.locator("textarea").inputValue()) === "" && (await page.getByLabel(c.email).inputValue()) === "");
  await pick(c.from, 19);
  await page.getByLabel(c.email).fill("single@example.com");
  await page.getByRole("button", { name: c.send }).click();
  await wait(700);
  const single = (await stored()).privateTourRequests.at(-1);
  check(`[${lang}] single day: To saved as From, interests empty`, single.dateFrom === "2026-10-19" && single.dateTo === "2026-10-19" && single.interests === "" && single.groupSize === 2, single);
  const singleText = await page.locator("body").innerText();
  check(`[${lang}] single day: one date, no interests row`, singleText.includes(c.single) && !singleText.includes(" – ") && !singleText.includes(`\n${c.interests}\n`), singleText);

  // Signed-in guest: the email is prefilled.
  await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem("sk.demo"));
    s.data.signedInGuestId = s.data.guests[0].id;
    localStorage.setItem("sk.demo", JSON.stringify(s));
  });
  await page.goto(`${BASE}#/tours/private-tour`);
  await page.reload();
  await wait(900);
  const guestEmail = (await stored()).guests[0].email;
  check(`[${lang}] signed in: the email is prefilled`, (await page.getByLabel(c.email).inputValue()) === guestEmail, guestEmail);

  // The header's back goes to the list.
  await page.getByRole("button", { name: c.back }).click();
  await wait(600);
  check(`[${lang}] the header back leaves C22`, !page.url().includes("private-tour"), page.url());

  // A request that is not on this device.
  await page.goto(`${BASE}#/tours/private-tour/sent?request=nope`);
  await wait(600);
  check(`[${lang}] sent with an unknown request: the fallback message`, await page.getByText(c.missing).isVisible());

  check(`[${lang}] no console errors`, errors.length === 0, errors);
  await page.close();
}

await browser.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
