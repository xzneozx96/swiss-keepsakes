// 4.14 M19 check (spec M19, outline step 15, AC18, AC30, D7): the Requests page and its tabs, the
// advice inbox (new and read, language, email, time, the questions as sent), the request detail
// (opening marks it read, old wording kept), the question set editor (DE text clears the
// warning, reorder, optional, recipient, add with validation, change type, delete through the
// confirmation), C21 with the edited set, the open-conversation side path, the empty inbox and
// an unknown request. 375px DPR 2 in EN and DE, plus 1280px desktop shots in EN.
// Run from a folder with playwright-core: node 4.14-capture.mjs <screens dir>
import { chromium } from "playwright-core";
import { mkdirSync, readdirSync } from "node:fs";

const BASE = process.env.BASE ?? "http://localhost:5253/";
const OUT = process.argv[2];
mkdirSync(OUT, { recursive: true });
const home = `${process.env.HOME}/.cache/ms-playwright`;
const dir = readdirSync(home).filter((d) => d.startsWith("chromium_headless_shell")).sort().pop();
const launch = () => chromium.launch({ executablePath: `${home}/${dir}/chrome-headless-shell-linux64/chrome-headless-shell` });
// One browser per language: a single long run once hit net::ERR_INSUFFICIENT_RESOURCES.
let browser = await launch();
/** Reload or navigate, retrying once if the browser runs short of resources. */
async function retry(fn) {
  try { await fn(); } catch (e) {
    if (!String(e).includes("ERR_INSUFFICIENT_RESOURCES")) throw e;
    await wait(2000);
    await fn();
  }
}

let pass = 0, fail = 0;
const check = (name, ok, detail = "") => {
  ok ? pass++ : fail++;
  const text = typeof detail === "string" ? detail : JSON.stringify(detail);
  console.log(`${ok ? "PASS" : "FAIL"} ${name}${text === "" ? "" : ` | ${text.replace(/\n/g, " / ")}`}`);
};
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const copy = {
  en: { title: "Requests", advice: "Advice", private: "Private tours", questions: "Questions", new: "New", read: "Read", more4: "+4 more answers", detail: "Advice request", askedEn: "Asked in English", back: "Requests", warning: "1 question is missing a translation. Guests then see the other language.", deMissing: "DE missing", edit: "Edit", sheetDe: "Question in German", sheetEn: "Question in English", missingDeNote: "German-speaking guests see the English text.", save: "Save question", saved: "Question saved. New requests use it.", up: "Move up", down: "Move down", required: "Guests must answer", optional: "Optional", recipient: "Recipient email", recipientSave: "Save", recipientError: "Enter a valid email address.", recipientSaved: "Recipient saved.", add: "Add question", textError: "Write the question in at least one language.", type: "Answer type", single: "Single choice", text: "Short text", optionError: "Name this option in at least one language.", optionsError: "Add at least 2 options.", removeOption: "Remove option 2", del: "Delete question", deleted: "Question deleted.", empty: "No advice requests yet. They appear here when a guest sends the trip assistant’s questions.", notFound: "This request does not exist.", send: "Send", sendTeam: "Send to the team", date: /Choose a date/, done: "Done", note: "Changes apply to new requests only." },
  de: { title: "Anfragen", advice: "Beratung", private: "Private Touren", questions: "Fragen", new: "Neu", read: "Gelesen", more4: "+4 weitere Antworten", detail: "Beratungsanfrage", askedEn: "Auf Englisch gestellt", back: "Anfragen", warning: "Bei 1 Frage fehlt eine Übersetzung. Gäste sehen dann die andere Sprache.", deMissing: "DE fehlt", edit: "Bearbeiten", sheetDe: "Frage auf Deutsch", sheetEn: "Frage auf Englisch", missingDeNote: "Deutschsprachige Gäste sehen den englischen Text.", save: "Frage speichern", saved: "Frage gespeichert. Neue Anfragen verwenden sie.", up: "Nach oben", down: "Nach unten", required: "Gäste müssen antworten", optional: "Freiwillig", recipient: "Empfänger-E-Mail", recipientSave: "Speichern", recipientError: "Geben Sie eine gültige E-Mail-Adresse ein.", recipientSaved: "Empfänger gespeichert.", add: "Frage hinzufügen", textError: "Schreiben Sie die Frage in mindestens einer Sprache.", type: "Antworttyp", single: "Einfachauswahl", text: "Kurzer Text", optionError: "Benennen Sie diese Option in mindestens einer Sprache.", optionsError: "Fügen Sie mindestens 2 Optionen hinzu.", removeOption: "Option 2 entfernen", del: "Frage löschen", deleted: "Frage gelöscht.", empty: "Noch keine Beratungsanfragen. Sie erscheinen hier, sobald ein Gast die Fragen des Reiseassistenten sendet.", notFound: "Diese Anfrage gibt es nicht.", send: "Senden", sendTeam: "An das Team senden", date: /Datum wählen/, done: "Fertig", note: "Änderungen gelten nur für neue Anfragen." },
};

const stored = (page) => page.evaluate(() => JSON.parse(localStorage.getItem("sk.demo")).data);
const overflow = (page) => page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
async function setRole(page, role) {
  await page.evaluate((r) => {
    const s = JSON.parse(localStorage.getItem("sk.demo"));
    s.role = r;
    localStorage.setItem("sk.demo", JSON.stringify(s));
  }, role);
  await retry(() => page.reload());
  await wait(900);
}
async function patchData(page, fn) {
  await page.evaluate((src) => {
    const s = JSON.parse(localStorage.getItem("sk.demo"));
    // eslint-disable-next-line no-new-func
    new Function("d", src)(s.data);
    localStorage.setItem("sk.demo", JSON.stringify(s));
  }, fn);
  await retry(() => page.reload());
  await wait(900);
}
async function go(page, hash) {
  await retry(() => page.goto(`${BASE}${hash}`));
  await wait(900);
}
/** A new tab with the same demo state, so one long run doesn't exhaust a single tab. */
async function reopen(page, lang) {
  const state = await page.evaluate(() => localStorage.getItem("sk.demo"));
  const errors = page.errors;
  await page.close();
  const next = await browser.newPage({ viewport: { width: 375, height: 812 }, deviceScaleFactor: 2, reducedMotion: "reduce" });
  next.errors = errors;
  next.on("console", (m) => m.type() === "error" && next.errors.push(m.text()));
  next.on("pageerror", (e) => next.errors.push(String(e)));
  await next.goto(BASE);
  await next.evaluate(([l, s]) => { localStorage.setItem("sk.language", JSON.stringify(l)); localStorage.setItem("sk.demo", s); }, [lang, state]);
  await next.reload();
  await wait(900);
  return next;
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

/** Answers the C21 question on screen, whatever its type, then waits for the next message. */
async function answer(page, c, q) {
  const composer = page.locator("[data-composer]");
  const thread = page.locator("ol").first();
  const tapSend = () => composer.getByRole("button", { name: c.send, exact: true }).click();
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
  } else { await composer.locator("textarea").fill("A short answer."); await tapSend(); }
  await wait(450);
}
const lastAssistant = async (page) => (await page.locator("ol").first().locator(":scope > li").filter({ hasNot: page.getByRole("grid") }).last().innerText()).trim();
/** Sends the email and the summary; returns to the caller on the sent screen. */
async function finishChat(page, c, email) {
  const composer = page.locator("[data-composer]");
  await composer.locator("input").fill(email);
  await composer.getByRole("button", { name: c.send, exact: true }).click();
  await wait(600);
  await composer.getByRole("button", { name: c.sendTeam }).click();
  await wait(1000);
}
const shown = (q, lang) => q.text[lang] || q.text.en || q.text.de;
const questionsCard = (page) => page.locator("section", { has: page.locator("#m19-questions-title") });
const sheet = (page) => page.getByRole("dialog");
async function editQuestion(page, c, name) {
  await questionsCard(page).getByRole("button", { name: `${c.edit}: ${name}` }).click();
  await wait(600);
}

for (const lang of ["en", "de"]) {
  const c = copy[lang];
  if (lang !== "en") { await browser.close(); browser = await launch(); }
  let page = await fresh(lang);
  const seed = await stored(page);

  // The Requests page, Advice tab first.
  await go(page, "#/store/requests");
  check(`[${lang}] #/store/requests shows Requests, not the placeholder`, (await page.getByRole("heading", { level: 1 }).innerText()) === c.title);
  const tabs = await page.getByRole("tab").allInnerTexts();
  check(`[${lang}] tabs Advice, Private tours, Questions with counts 2, 2, 7`, tabs.length === 3 && tabs[0].includes(c.advice) && tabs[0].includes("2") && tabs[1].includes(c.private) && tabs[1].includes("2") && tabs[2].includes(c.questions) && tabs[2].includes("7"), tabs);
  check(`[${lang}] Advice is selected by default`, (await page.getByRole("tab", { selected: true }).innerText()).includes(c.advice));
  const cards = page.getByRole("list", { name: c.advice }).locator(":scope > li");
  check(`[${lang}] two advice cards, newest first`, (await cards.count()) === 2 && (await cards.nth(0).innerText()).includes("m.huber@example.com") && (await cards.nth(1).innerText()).includes("h.whitfield@example.com"));
  const first = await cards.nth(0).innerText();
  check(`[${lang}] the unopened request is New, the opened one Read`, first.includes(c.new) && (await cards.nth(1).innerText()).includes(c.read));
  check(`[${lang}] the card shows language, time and the questions as sent (German wording)`, first.includes(lang === "en" ? "German" : "Deutsch") && /12\.10\.2026, 19:00/.test(first) && first.includes("Wie viele Erwachsene reisen mit?") && first.includes(c.more4), first);
  check(`[${lang}] the card's questions carry their language`, (await cards.nth(0).locator('dt[lang="de"]').count()) === 3);
  check(`[${lang}] advice inbox: no horizontal overflow`, !(await overflow(page)));
  await page.screenshot({ path: `${OUT}/m19-advice-${lang}.png`, fullPage: true });

  // Detail: every answer as sent; opening marks it read.
  await cards.nth(0).locator("a").click();
  await wait(900);
  check(`[${lang}] a card opens #/store/requests/advice/adv-2`, page.url().endsWith("#/store/requests/advice/adv-2"), page.url());
  check(`[${lang}] detail: h1`, (await page.getByRole("heading", { level: 1 }).innerText()) === c.detail);
  const dts = page.locator("#m19-answers-title").locator("xpath=ancestor::section").locator("dl > div");
  check(`[${lang}] detail: all 7 questions and answers`, (await dts.count()) === 7);
  check(`[${lang}] detail: the untranslated question is marked as asked in English`, await page.getByText(c.askedEn).isVisible());
  const mailto = await page.getByRole("link", { name: lang === "en" ? "Reply by email" : "Per E-Mail antworten" }).getAttribute("href");
  check(`[${lang}] detail: the reply link is a mailto in the guest's language`, mailto === "mailto:m.huber@example.com?subject=Ihre%20Reise%20nach%20Luzern", mailto);
  await wait(300);
  check(`[${lang}] opening the request marks it read`, !!(await stored(page)).adviceRequests.find((r) => r.id === "adv-2").readAt);
  check(`[${lang}] detail: no horizontal overflow`, !(await overflow(page)));
  await page.screenshot({ path: `${OUT}/m19-detail-${lang}.png`, fullPage: true });
  await page.getByRole("link", { name: c.back }).first().click();
  await wait(900);
  check(`[${lang}] back on the list, the opened request reads Read`, (await page.getByRole("list", { name: c.advice }).locator(":scope > li").nth(0).innerText()).includes(c.read));

  // AC18: the older request keeps the wording it was sent with.
  await go(page, "#/store/requests/advice/adv-1");
  const oldText = await page.locator("main").innerText();
  check(`[${lang}] the older request keeps its old wording (AC18)`, oldText.includes("How many children (under 16)?") && oldText.includes("What are you interested in?") && !oldText.includes("How many children are travelling?"));

  // Questions tab.
  await go(page, "#/store/requests");
  await page.getByRole("tab", { name: new RegExp(c.questions) }).click();
  await wait(600);
  check(`[${lang}] the Questions tab is kept in ?tab=questions`, page.url().endsWith("?tab=questions"), page.url());
  check(`[${lang}] the note says changes reach new requests only`, await page.getByText(c.note).isVisible());
  const rows = questionsCard(page).locator("ol > li");
  check(`[${lang}] 7 questions in the set order`, (await rows.count()) === 7 && (await rows.nth(0).innerText()).includes("How many adults are travelling?") && (await rows.nth(6).innerText()).includes("Anything else we should know?"));
  check(`[${lang}] missing translation: the warning and the "DE missing" chip on question 7`, (await page.getByText(c.warning).isVisible()) && (await rows.nth(6).innerText()).includes(c.deMissing) && !(await rows.nth(5).innerText()).includes(c.deMissing));
  check(`[${lang}] rows show type and required`, (await rows.nth(2).innerText()).includes(lang === "en" ? "Multiple choice" : "Mehrfachauswahl") && (await rows.nth(3).innerText()).includes(c.optional));
  check(`[${lang}] the first row cannot move up, the last cannot move down`, (await rows.nth(0).getByRole("button", { name: new RegExp(`^${c.up}`) }).isDisabled()) && (await rows.nth(6).getByRole("button", { name: new RegExp(`^${c.down}`) }).isDisabled()));
  check(`[${lang}] questions: no horizontal overflow`, !(await overflow(page)));
  await page.screenshot({ path: `${OUT}/m19-questions-${lang}.png`, fullPage: true });

  // Add the missing DE text: the warning clears.
  const before = (await stored(page)).adviceQuestions.updatedAt;
  await editQuestion(page, c, "Anything else we should know?");
  check(`[${lang}] the edit sheet opens with the missing-German note`, (await sheet(page).isVisible()) && (await sheet(page).getByText(c.missingDeNote).isVisible()));
  check(`[${lang}] the sheet keeps the EN text`, (await sheet(page).getByLabel(c.sheetEn).inputValue()) === "Anything else we should know?");
  await page.screenshot({ path: `${OUT}/m19-sheet-${lang}.png` });
  await sheet(page).getByLabel(c.sheetDe).fill("Möchten Sie uns sonst noch etwas sagen?");
  await sheet(page).getByRole("button", { name: c.save }).click();
  await wait(700);
  let data = await stored(page);
  const notes = data.adviceQuestions.questions.find((q) => q.id === "notes");
  check(`[${lang}] the DE text is saved`, notes.text.de === "Möchten Sie uns sonst noch etwas sagen?" && notes.text.en === "Anything else we should know?");
  check(`[${lang}] saving shows a toast and stamps the set`, (await page.getByText(c.saved).isVisible()) && data.adviceQuestions.updatedAt !== before);
  check(`[${lang}] the warning and the chip are gone`, (await page.getByText(c.warning).count()) === 0 && !(await rows.nth(6).innerText()).includes(c.deMissing));

  // Reorder: travel style moves above departure.
  await rows.nth(5).getByRole("button", { name: new RegExp(`^${c.up}`) }).click();
  await wait(400);
  data = await stored(page);
  check(`[${lang}] move up swaps two questions`, data.adviceQuestions.questions.map((q) => q.id).join() === "adults,children,interests,arrival,style,departure,notes", data.adviceQuestions.questions.map((q) => q.id));
  check(`[${lang}] the list follows the new order`, (await rows.nth(4).innerText()).includes("How do you like to travel?"));

  // Mark the children question optional.
  await editQuestion(page, c, "How many children are travelling?");
  await sheet(page).getByText(c.required, { exact: true }).click();
  await sheet(page).getByRole("button", { name: c.save }).click();
  await wait(700);
  data = await stored(page);
  const children = data.adviceQuestions.questions.find((q) => q.id === "children");
  check(`[${lang}] the children question is now optional, still a number`, children.required === false && children.type === "number");
  check(`[${lang}] its row says Optional`, (await rows.nth(1).innerText()).includes(c.optional));

  // Recipient email.
  const recipient = page.getByLabel(c.recipient);
  await recipient.fill("advice@");
  await page.getByRole("button", { name: c.recipientSave, exact: true }).click();
  await wait(300);
  check(`[${lang}] a malformed recipient shows an error and is not saved`, (await page.getByText(c.recipientError).isVisible()) && (await stored(page)).adviceQuestions.recipientEmail === "requests@swisskeepsakes.example");
  await recipient.fill("advice@swisskeepsakes.example");
  await page.getByRole("button", { name: c.recipientSave, exact: true }).click();
  await wait(500);
  check(`[${lang}] the recipient is saved`, (await stored(page)).adviceQuestions.recipientEmail === "advice@swisskeepsakes.example" && (await page.getByText(c.recipientSaved).isVisible()));

  // Add a question: validation first.
  await questionsCard(page).getByRole("button", { name: c.add }).click();
  await wait(600);
  await sheet(page).getByRole("button", { name: c.save }).click();
  await wait(300);
  check(`[${lang}] add: saving an empty question shows the text error`, await sheet(page).getByText(c.textError).first().isVisible());
  await sheet(page).getByRole("button", { name: new RegExp(c.type) }).click();
  await wait(300);
  await page.getByRole("option", { name: c.single }).click();
  await wait(300);
  const optionInputs = sheet(page).locator("fieldset input");
  check(`[${lang}] a choice type starts with two empty options`, (await optionInputs.count()) === 4);
  await sheet(page).getByRole("button", { name: c.save }).click();
  await wait(300);
  check(`[${lang}] empty options show their error`, (await sheet(page).getByText(c.optionError).count()) === 2);
  await sheet(page).getByRole("button", { name: c.removeOption }).click();
  await wait(200);
  check(`[${lang}] one option is not enough`, await sheet(page).getByText(c.optionsError).isVisible());
  await sheet(page).getByRole("button", { name: lang === "en" ? "Add option" : "Option hinzufügen" }).click();
  await sheet(page).getByLabel(c.sheetEn).fill("Is this your first visit to Lucerne?");
  await sheet(page).getByLabel(c.sheetDe).fill("Ist das Ihr erster Besuch in Luzern?");
  await optionInputs.nth(0).fill("Yes");
  await optionInputs.nth(1).fill("Ja");
  await optionInputs.nth(2).fill("No");
  await sheet(page).getByText(c.required, { exact: true }).click();
  check(`[${lang}] an option without DE says so`, await sheet(page).getByText(lang === "en" ? "DE missing" : "DE fehlt").isVisible());
  await sheet(page).getByRole("button", { name: c.save }).click();
  await wait(700);
  data = await stored(page);
  const added = data.adviceQuestions.questions.at(-1);
  check(`[${lang}] the new question is saved last: required single choice with 2 options`, added.text.en === "Is this your first visit to Lucerne?" && added.type === "single" && added.required === true && added.options.length === 2 && added.options[1].label.de === undefined, added);
  check(`[${lang}] the new question has a fresh id`, !seed.adviceQuestions.questions.some((q) => q.id === added.id) && added.options[0].id !== added.options[1].id);
  check(`[${lang}] an option missing DE brings the warning back`, (await page.getByText(c.warning).isVisible()) && (await rows.nth(7).innerText()).includes(c.deMissing));
  await editQuestion(page, c, "Is this your first visit to Lucerne?");
  await sheet(page).locator("fieldset input").nth(3).fill("Nein");
  await sheet(page).getByRole("button", { name: c.save }).click();
  await wait(700);
  check(`[${lang}] filling the option's DE clears it`, (await page.getByText(c.warning).count()) === 0);

  // Change a type: travel style becomes short text, its options go.
  await editQuestion(page, c, "How do you like to travel?");
  await sheet(page).getByRole("button", { name: new RegExp(c.type) }).click();
  await wait(300);
  await page.getByRole("option", { name: c.text }).click();
  await wait(300);
  check(`[${lang}] a text type shows no options`, (await sheet(page).locator("fieldset").count()) === 0);
  await sheet(page).getByRole("button", { name: c.save }).click();
  await wait(700);
  const style = (await stored(page)).adviceQuestions.questions.find((q) => q.id === "style");
  check(`[${lang}] the type change is saved and the options dropped`, style.type === "text" && style.options === undefined);

  // Delete through the shared confirmation (after the save toast has gone, for a clear shot).
  for (const close of await page.locator('[data-slot="toast"]').getByRole("button", { name: lang === "en" ? "Close" : "Schliessen" }).all()) await close.click().catch(() => {});
  await wait(400);
  await editQuestion(page, c, "When do you arrive in Lucerne?");
  await sheet(page).getByRole("button", { name: c.del }).click();
  await wait(500);
  const confirmDialog = page.getByRole("alertdialog", { name: /When do you arrive in Lucerne/ });
  check(`[${lang}] delete asks first, naming the question`, (await confirmDialog.isVisible()) && (await confirmDialog.innerText()).includes("When do you arrive in Lucerne?"));
  await page.screenshot({ path: `${OUT}/m19-delete-${lang}.png` });
  await confirmDialog.getByRole("button", { name: c.del }).click();
  await wait(800);
  data = await stored(page);
  check(`[${lang}] the question is deleted`, !data.adviceQuestions.questions.some((q) => q.id === "arrival") && (await page.getByText(c.deleted).isVisible()));
  check(`[${lang}] the Questions count follows (7)`, (await page.getByRole("tab", { name: new RegExp(c.questions) }).innerText()).includes("7"));
  check(`[${lang}] editor after the edits: no horizontal overflow`, !(await overflow(page)));
  await page.screenshot({ path: `${OUT}/m19-questions-edited-${lang}.png`, fullPage: true });

  // C21 with the edited set: new order, new question, removed question, changed type.
  page = await reopen(page, lang);
  const set = data.adviceQuestions;
  await setRole(page, "guest");
  await go(page, "#/plan");
  const asked = [];
  for (const q of set.questions) {
    asked.push((await lastAssistant(page)).includes(shown(q, lang)));
    if (q.id === "children") check(`[${lang}] C21: an optional count offers Send (as shown) and Skip`, (await page.locator("[data-composer]").getByRole("button", { name: c.send, exact: true }).count()) === 1 && (await page.locator("[data-composer]").getByRole("button", { name: lang === "en" ? "Skip" : "Überspringen" }).count()) === 1);
    if (q.id === "style") check(`[${lang}] C21: the changed type asks with a text box`, (await page.locator("[data-composer] textarea").count()) === 1);
    if (q.id === added.id) check(`[${lang}] C21: the new single choice offers its 2 options`, (await page.locator("ol").first().getByRole("row").count()) === 2);
    await answer(page, c, q);
  }
  check(`[${lang}] C21 asks the edited set in its new order`, asked.every(Boolean), asked);
  await finishChat(page, c, "edited@example.com");
  data = await stored(page);
  const sent = data.adviceRequests.at(-1);
  check(`[${lang}] C21 sends with the edited set`, page.url().includes("#/plan/sent") && sent.email === "edited@example.com");
  check(`[${lang}] the saved request has the new wording and no deleted question`, sent.answers.map((a) => a.questionId).join() === set.questions.map((q) => q.id).join() && sent.answers.every((a, i) => a.question === shown(set.questions[i], lang)) && !sent.answers.some((a) => a.questionId === "arrival"), sent.answers.map((a) => a.question));
  check(`[${lang}] the added DE text is used for German guests`, sent.answers.find((a) => a.questionId === "notes").questionLanguage === lang);

  // Side path: an open conversation keeps the set it started with; the next one uses the new set.
  page = await reopen(page, lang);
  await go(page, "#/plan");
  await answer(page, c, set.questions[0]);
  await answer(page, c, set.questions[1]);
  await setRole(page, "owner");
  await go(page, "#/store/requests?tab=questions");
  await editQuestion(page, c, "How many adults are travelling?");
  await sheet(page).getByLabel(c.sheetEn).fill("How many adults are coming?");
  await sheet(page).getByLabel(c.sheetDe).fill("Wie viele Erwachsene kommen?");
  await sheet(page).getByRole("button", { name: c.save }).click();
  await wait(700);
  await setRole(page, "guest");
  await go(page, "#/plan");
  const thread = await page.locator("ol").first().innerText();
  check(`[${lang}] the open conversation keeps its wording after the shop's edit`, thread.includes(shown(set.questions[0], lang)) && !thread.includes(lang === "en" ? "How many adults are coming?" : "Wie viele Erwachsene kommen?"));
  const draftSet = (await stored(page)).adviceDraft.set.questions;
  for (const q of draftSet.slice(2)) await answer(page, c, q);
  await finishChat(page, c, "open@example.com");
  data = await stored(page);
  check(`[${lang}] the open request is saved with the wording it started with`, data.adviceRequests.at(-1).email === "open@example.com" && data.adviceRequests.at(-1).answers[0].question === shown(set.questions[0], lang));
  await go(page, "#/plan");
  check(`[${lang}] the next conversation uses the new wording`, (await lastAssistant(page)).includes(lang === "en" ? "How many adults are coming?" : "Wie viele Erwachsene kommen?"));

  // The new requests reach the inbox as New.
  page = await reopen(page, lang);
  await setRole(page, "owner");
  await go(page, "#/store/requests");
  const top = await page.getByRole("list", { name: c.advice }).locator(":scope > li").nth(0).innerText();
  check(`[${lang}] the newest C21 request tops the inbox as New`, top.includes("open@example.com") && top.includes(c.new) && (await page.getByRole("tab", { name: new RegExp(c.advice) }).innerText()).includes("4"));

  // Manager has the same access (D12).
  await setRole(page, "manager");
  await go(page, "#/store/requests");
  check(`[${lang}] the Store Manager sees the same inbox`, (await page.getByRole("list", { name: c.advice }).locator(":scope > li").count()) === 4);

  // Empty inbox and an unknown request.
  await patchData(page, "d.adviceRequests = [];");
  await go(page, "#/store/requests");
  // The sentence is in the phone card and in the (hidden) table, so take the first.
  check(`[${lang}] empty inbox: one sentence and an action`, (await page.getByText(c.empty).first().isVisible()) && (await page.getByRole("tab", { name: new RegExp(c.advice) }).innerText()).includes("0"));
  await page.screenshot({ path: `${OUT}/m19-empty-${lang}.png` });
  await go(page, "#/store/requests/advice/unknown");
  check(`[${lang}] an unknown request shows "not found" with a way back`, (await page.getByText(c.notFound).isVisible()) && (await page.getByRole("link", { name: c.back }).count()) >= 1);

  check(`[${lang}] no console or page errors`, page.errors.length === 0, page.errors);
  await page.close();
}

// Desktop, 1280px, EN: the table, the detail's two columns and the editor.
{
  await browser.close();
  browser = await launch();
  const page = await fresh("en", 1280);
  await go(page, "#/store/requests");
  const table = page.getByRole("grid", { name: "Advice" });
  check("[desktop] the advice inbox is a table with 2 rows", (await table.isVisible()) && (await table.getByRole("row").count()) === 3);
  await page.screenshot({ path: `${OUT}/m19-advice-desktop.png` });
  await table.getByRole("row").nth(1).click();
  await wait(900);
  check("[desktop] a table row opens the request", page.url().endsWith("#/store/requests/advice/adv-2"), page.url());
  const cols = await page.evaluate(() => {
    const a = document.querySelector("#m19-answers-title")?.closest("section")?.getBoundingClientRect();
    const g = document.querySelector("#m19-guest-title")?.closest("section")?.getBoundingClientRect();
    return a && g ? { answersRight: a.right, guestLeft: g.left, guestWidth: Math.round(g.width) } : null;
  });
  check("[desktop] detail: the guest card sits in a 300px column on the right", !!cols && cols.guestLeft > cols.answersRight && cols.guestWidth === 300, cols);
  await page.screenshot({ path: `${OUT}/m19-detail-desktop.png` });
  await go(page, "#/store/requests?tab=questions");
  await page.screenshot({ path: `${OUT}/m19-questions-desktop.png`, fullPage: true });
  check("[desktop] no horizontal overflow", !(await overflow(page)));
  check("[desktop] no console or page errors", page.errors.length === 0, page.errors);
  await page.close();
}

console.log(`\nRESULT ${pass} passed, ${fail} failed`);
await browser.close();
process.exit(fail ? 1 : 0);
