// 4.5 C21 check (chat, R19 / AC34): the AI assistant asks the shop's questions one message at
// a time, the composer shows the matching input, answers become the guest's messages,
// optional questions skip, the untranslated question (D7), the email gate (AC18, R08), the
// summary with Change and Send, the thank-you, the saved request and its wording snapshot,
// refresh, and the open request keeping its question set. 375px, DPR 2, EN and DE.
// Run from a folder with playwright-core: node 4.5-capture.mjs <screens dir>
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
  en: { title: "Trip assistant", ai: "AI", greeting: "I'm the AI travel assistant", send: "Send", skip: "Skip", skipped: "Skipped", required: "Please answer this question to continue.", notice: "This question is only available in English.", emailAsk: "Which email address should our team reply to?", emailMissing: "Enter your email so our team can reply.", emailInvalid: "Check the email address.", summary: "Here is what I'll pass on to our team:", change: "Change: How many adults are travelling?", sendTeam: "Send to the team", thanks: "Thank you! Our team has received your details and will contact you at guest@example.com to continue the conversation.", back: "Back" },
  de: { title: "Reiseassistent", ai: "KI", greeting: "Ich bin der KI-Reiseassistent", send: "Senden", skip: "Überspringen", skipped: "Übersprungen", required: "Bitte beantworten Sie diese Frage, um weiterzufahren.", notice: "Diese Frage gibt es nur auf Englisch.", emailAsk: "An welche E-Mail-Adresse soll unser Team antworten?", emailMissing: "Geben Sie Ihre E-Mail-Adresse ein, damit unser Team antworten kann.", emailInvalid: "Prüfen Sie die E-Mail-Adresse.", summary: "Das gebe ich an unser Team weiter:", change: "Ändern: Wie viele Erwachsene reisen mit?", sendTeam: "An das Team senden", thanks: "Vielen Dank! Unser Team hat Ihre Angaben erhalten und meldet sich unter guest@example.com, um das Gespräch weiterzuführen.", back: "Zurück" },
};

for (const lang of ["en", "de"]) {
  const c = copy[lang];
  // Reduced motion skips the typing pause, so each step can be checked straight away; the
  // typing rhythm itself is checked separately below with normal motion.
  const page = await browser.newPage({ viewport: { width: 375, height: 812 }, deviceScaleFactor: 2, reducedMotion: "reduce" });
  const errors = [];
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.goto(BASE);
  await page.evaluate((l) => { localStorage.clear(); localStorage.setItem("sk.language", JSON.stringify(l)); }, lang);
  await page.reload();
  await wait(900);
  const data = await page.evaluate(() => JSON.parse(localStorage.getItem("sk.demo")).data);
  const qs = data.adviceQuestions.questions;
  const qText = (i) => qs[i].text[lang] ?? qs[i].text.en;
  const composer = page.locator("[data-composer]");
  const thread = page.locator("ol").first();
  // The last message, not the options offered under a choice question.
  const lastAssistant = async () => (await thread.locator(":scope > li").filter({ hasNot: page.getByRole("grid") }).last().innerText()).trim();
  const tapSend = () => composer.getByRole("button", { name: c.send, exact: true }).click();

  await page.goto(`${BASE}#/plan`);
  await wait(900);
  const headerText = await page.locator("header").last().innerText();
  check(`[${lang}] header: trip assistant with the AI label`, headerText.includes(c.title) && headerText.split(/\s+/).includes(c.ai), headerText);
  check(`[${lang}] the assistant greets and introduces itself as AI`, (await thread.innerText()).includes(c.greeting));
  check(`[${lang}] the first question is an assistant message`, (await lastAssistant()).includes(qText(0)));
  check(`[${lang}] no sign-in asked`, !page.url().includes("sign-in"));
  check(`[${lang}] no free-text box while a count is asked (nothing typed freely gets an answer)`, (await composer.locator("textarea").count()) === 0);
  const count = composer.locator("input").first();
  check(`[${lang}] the adults count starts at 1`, (await count.inputValue()) === "1");
  await page.screenshot({ path: `${OUT}/c21-start-${lang}.png` });
  await count.fill("2");
  await count.press("Tab");
  await tapSend();
  await wait(400);
  check(`[${lang}] the answer appears as the guest's message`, (await thread.innerText()).includes("\n2\n") || (await thread.locator("li").filter({ hasText: /^2$/ }).count()) === 1);
  check(`[${lang}] the next question follows`, (await lastAssistant()).includes(qText(1)));

  await page.getByRole("button", { name: c.back }).first().click();
  await wait(400);
  check(`[${lang}] Back returns to the previous question with its answer`, (await lastAssistant()).includes(qText(0)) && (await composer.locator("input").first().inputValue()) === "2");
  await tapSend();
  await wait(400);
  await tapSend(); // children untouched: 0
  await wait(400);
  check(`[${lang}] an untouched count sends 0`, (await lastAssistant()).includes(qText(2)) && (await thread.locator("li").filter({ hasText: /^0$/ }).count()) === 1);

  await tapSend();
  await wait(300);
  check(`[${lang}] a required question without an answer shows a message`, (await composer.getByText(c.required).isVisible()) && (await lastAssistant()).includes(qText(2)));
  const replies = thread.getByRole("row");
  check(`[${lang}] choices are offered in the conversation, not the composer`, (await replies.count()) === qs[2].options.length && (await composer.getByRole("row").count()) === 0);
  await replies.nth(0).click();
  await replies.nth(1).click();
  check(`[${lang}] multiple choice: chosen options are selected`, (await replies.nth(0).getAttribute("aria-selected")) === "true" && (await replies.nth(1).getAttribute("aria-selected")) === "true");
  const chosenBorder = await replies.nth(0).evaluate((el) => getComputedStyle(el).borderTopColor);
  const plainBorder = await replies.nth(2).evaluate((el) => getComputedStyle(el).borderTopColor);
  check(`[${lang}] a chosen option has the gift style's red border and check`, chosenBorder !== plainBorder && (await replies.nth(0).locator("svg").isVisible()) && !(await replies.nth(2).locator("svg").isVisible()), { chosenBorder, plainBorder });
  await page.screenshot({ path: `${OUT}/c21-multi-${lang}.png` });
  await tapSend();
  await wait(400);

  await page.reload();
  await wait(1200);
  check(`[${lang}] refresh keeps the conversation`, (await lastAssistant()).includes(qText(3)) && (await thread.locator("li").filter({ hasText: /^2$/ }).count()) === 1);
  check(`[${lang}] an optional question offers Skip`, (await composer.getByRole("button", { name: c.skip }).count()) === 1);
  await composer.getByRole("button", { name: lang === "en" ? /Choose a date/ : /Datum wählen/ }).click();
  await wait(500);
  check(`[${lang}] the date opens in a sheet, the composer stays compact`, await page.getByRole("dialog").isVisible());
  await page.getByRole("dialog").locator('[role="gridcell"]').filter({ hasText: /^20$/ }).first().click();
  await page.screenshot({ path: `${OUT}/c21-date-${lang}.png` });
  await page.getByRole("dialog").getByRole("button", { name: lang === "en" ? "Done" : "Fertig" }).click();
  await wait(500);
  await tapSend();
  await wait(400);
  await composer.getByRole("button", { name: c.skip }).click(); // departure
  await wait(400);
  check(`[${lang}] a skipped question shows as "Skipped"`, (await thread.getByText(c.skipped, { exact: true }).count()) === 1);
  check(`[${lang}] a single choice offers no Send; a tap answers`, (await composer.getByRole("button", { name: c.send, exact: true }).count()) === 0);
  await thread.getByRole("row").first().click(); // style, answers on tap
  await wait(400);

  check(`[${lang}] untranslated question: notice only in DE`, lang === "de" ? (await thread.getByText(c.notice).isVisible()) : (await thread.getByText(c.notice).count()) === 0);
  check(`[${lang}] untranslated question shows its English wording`, (await lastAssistant()).includes(qs[6].text.en));
  await composer.locator("textarea").fill(lang === "en" ? "We travel with a stroller." : "Wir reisen mit Kinderwagen.");
  await page.screenshot({ path: `${OUT}/c21-notes-${lang}.png` });
  await tapSend();
  await wait(500);

  check(`[${lang}] the assistant asks for the email`, (await lastAssistant()).includes(c.emailAsk));
  const emailButton = composer.getByRole("button", { name: c.send, exact: true });
  await emailButton.click();
  await wait(300);
  check(`[${lang}] sending without email shows the message`, await composer.getByText(c.emailMissing).first().isVisible());
  await composer.locator("input").fill("guest@example");
  await emailButton.click();
  await wait(300);
  check(`[${lang}] an invalid email is caught`, await composer.getByText(c.emailInvalid).first().isVisible());
  await composer.locator("input").fill("guest@example.com");
  await page.screenshot({ path: `${OUT}/c21-email-${lang}.png` });
  await emailButton.click();
  await wait(600);

  check(`[${lang}] the summary card lists every question and the email`, (await thread.innerText()).includes(c.summary) && (await thread.locator("dl > div").count()) === 8);
  await page.screenshot({ path: `${OUT}/c21-summary-${lang}.png` });
  await page.getByRole("button", { name: c.change }).click();
  await wait(400);
  check(`[${lang}] Change reopens that question`, (await lastAssistant()).includes(qText(0)));
  await composer.locator("input").first().fill("3");
  await composer.locator("input").first().press("Tab");
  await tapSend();
  await wait(500);
  check(`[${lang}] answering it returns to the summary with the new answer`, (await thread.innerText()).includes(c.summary) && (await thread.locator("dl > div").first().innerText()).includes("3"));

  await composer.getByRole("button", { name: c.sendTeam }).click();
  await wait(1000);
  check(`[${lang}] the assistant thanks the guest; the team replies by email`, page.url().includes("#/plan/sent") && (await page.getByText(c.thanks).isVisible()));
  const after = await page.evaluate(() => JSON.parse(localStorage.getItem("sk.demo")).data);
  const req = after.adviceRequests[after.adviceRequests.length - 1];
  check(`[${lang}] request saved with language and email`, after.adviceRequests.length === data.adviceRequests.length + 1 && req.language === lang && req.email === "guest@example.com");
  check(`[${lang}] answers saved with the wording as shown`, req.answers.length === 6 && req.answers[0].question === qText(0) && req.answers[0].answer === "3" && req.answers[1].answer === "0" && !req.answers.some((a) => a.questionId === "departure"));
  const notes = req.answers.find((a) => a.questionId === "notes");
  check(`[${lang}] the untranslated question is saved in English`, notes?.questionLanguage === "en" && notes.question === qs[6].text.en);
  check(`[${lang}] the draft is cleared`, after.adviceDraft === undefined);
  const pageText = await page.locator("body").innerText();
  check(`[${lang}] no reply time and no plan promised`, !/within|innerhalb|hours|Stunden|plan|Plan/.test(pageText));
  await page.screenshot({ path: `${OUT}/c21-sent-${lang}.png` });

  // An open conversation keeps the question set it started with (AC18).
  await page.goto(`${BASE}#/plan`);
  await wait(800);
  await composer.locator("input").first().fill("4");
  await composer.locator("input").first().press("Tab");
  await wait(300);
  await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem("sk.demo"));
    s.data.adviceQuestions.questions[1].text = { en: "EDITED children question", de: "BEARBEITETE Kinderfrage" };
    localStorage.setItem("sk.demo", JSON.stringify(s));
  });
  await page.reload();
  await wait(1000);
  await tapSend();
  await wait(400);
  check(`[${lang}] an edit by the shop does not change an open conversation`, (await lastAssistant()).includes(qText(1)));

  const pageScroll = await page.evaluate(() => document.documentElement.scrollHeight - window.innerHeight);
  check(`[${lang}] the page itself does not scroll; only the conversation does`, pageScroll <= 1, pageScroll);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  check(`[${lang}] no horizontal overflow`, overflow === 0, overflow);
  check(`[${lang}] no console or page errors`, errors.length === 0, errors);
  await page.close();

  // Typing rhythm with normal motion: after an answer the assistant types, then asks.
  const live = await browser.newPage({ viewport: { width: 375, height: 812 }, deviceScaleFactor: 2 });
  await live.goto(BASE);
  await live.evaluate((l) => { localStorage.clear(); localStorage.setItem("sk.language", JSON.stringify(l)); }, lang);
  await live.goto(`${BASE}#/plan`);
  await live.reload();
  await wait(1200);
  await live.locator("[data-composer]").getByRole("button", { name: c.send, exact: true }).click();
  await wait(150);
  const typingShown = await live.getByRole("status").isVisible();
  await live.screenshot({ path: `${OUT}/c21-typing-${lang}.png` });
  await wait(1100);
  const askedAfter = (await live.locator("ol").first().innerText()).includes(qText(1));
  check(`[${lang}] the assistant types briefly, then asks the next question`, typingShown && askedAfter && (await live.getByRole("status").count()) === 0);
  await live.close();
}

console.log(`\nRESULT ${pass} passed, ${fail} failed`);
await browser.close();
process.exit(fail ? 1 : 0);
