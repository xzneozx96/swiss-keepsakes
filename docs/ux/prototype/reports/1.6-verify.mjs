import { chromium } from "playwright";
const OUT = process.argv[2];
const b = await chromium.launch();
const log = (...a) => console.log(...a);

async function run(lang) {
  const ctx = await b.newContext({ viewport: { width: 375, height: 812 } });
  const p = await ctx.newPage();
  const errs = [];
  p.on("pageerror", (e) => errs.push(e.message));
  p.on("console", (m) => m.type() === "error" && errs.push(m.text()));
  const L = lang === "de";
  const T = (en, de) => (L ? de : en);
  const shot = async (name) => {
    await p.waitForTimeout(450);
    const overflow = await p.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    const keys = await p.evaluate(() => (document.body.innerText.match(/\b(auth|mail|proto)\.[a-zA-Z.]+/g) || []).join(","));
    log(`${lang} ${name}: overflow=${overflow} rawKeys=[${keys}]`);
    await p.screenshot({ path: `${OUT}/${name}-${lang}.png` });
  };
  const bar = p.getByRole("region", { name: "Prototype controls" });

  await p.goto("http://localhost:5182/#/account");
  await p.waitForTimeout(600);
  await bar.getByRole("button", { name: lang.toUpperCase(), exact: true }).click();
  await shot("account-signed-out");

  // Sign-in sheet: start step, invalid email
  await p.getByRole("button", { name: T("Sign in", "Anmelden"), exact: true }).click();
  await shot("sheet-start");
  const email = p.getByRole("textbox", { name: T("Email", "E-Mail"), exact: true });
  await email.fill("anna");
  await p.getByRole("button", { name: T("Email me a code", "Code per E-Mail senden") }).click();
  await shot("email-invalid");
  await email.fill("anna.keller@example.com");
  await p.getByRole("button", { name: T("Email me a code", "Code per E-Mail senden") }).click();
  await p.waitForTimeout(300);
  const focused = await p.evaluate(() => document.activeElement?.id);
  log(`${lang} focus after send: ${focused}`);
  await shot("code-resend-timer");

  // Wrong code
  await p.keyboard.type("000000");
  await shot("code-wrong");

  // Turn on Show proposals: close the sheet (state kept), use the bar, reopen
  await p.keyboard.press("Escape");
  await p.waitForTimeout(400);
  await bar.getByRole("button", { name: "Guest" }).click();
  await p.waitForTimeout(400);
  await p.getByRole("switch", { name: /Show proposals/ }).click({ force: true });
  await p.waitForTimeout(200);
  await shot("proto-controls");
  await p.keyboard.press("Escape");
  await p.waitForTimeout(400);
  await p.getByRole("button", { name: T("Sign in", "Anmelden"), exact: true }).click();
  await p.waitForTimeout(300);
  const stillCode = await p.getByText(T("Code from the email", "Code aus der E-Mail")).count();
  log(`${lang} code step kept after reopen: ${stillCode > 0}`);
  await shot("code-wrong-proposal");

  // Attempt limit: 4 more wrong codes
  for (let i = 0; i < 4; i++) {
    await p.locator("#sign-in-code").focus();
    await p.keyboard.type("000000");
    await p.waitForTimeout(150);
  }
  await shot("code-locked");
  await p.getByRole("button", { name: T("Send a new code", "Neuen Code senden") }).click();
  await p.waitForTimeout(300);

  // Expired
  await p.locator("#sign-in-code").focus();
  await p.keyboard.type("999999");
  await shot("code-expired");
  await p.getByRole("button", { name: T("Send a new code", "Neuen Code senden") }).click();

  // Resend unlocks after 30 s
  await p.waitForTimeout(31000);
  await shot("code-resend-ready");

  // Mail panel shows N01
  await p.keyboard.press("Escape");
  await p.waitForTimeout(400);
  await bar.getByRole("button", { name: /^Mail/ }).click();
  await shot("mail-panel");
  const mailText = await p.getByRole("dialog").innerText();
  const code = mailText.match(/(\d{6})/)?.[1];
  log(`${lang} N01 code in mail: ${code}`);
  await p.keyboard.press("Escape");
  await p.waitForTimeout(400);

  // Sign in with the mailed code
  await p.getByRole("button", { name: T("Sign in", "Anmelden"), exact: true }).click();
  await p.waitForTimeout(300);
  await p.locator("#sign-in-code").focus();
  await p.keyboard.type(code);
  await p.waitForTimeout(500);
  await shot("account-signed-in");

  // Sign out, then Google
  await p.getByRole("button", { name: T("Sign out", "Abmelden") }).click();
  await p.getByRole("button", { name: T("Sign in", "Anmelden"), exact: true }).click();
  await p.waitForTimeout(300);
  await p.getByRole("button", { name: T("Continue with Google", "Weiter mit Google") }).click();
  await p.waitForTimeout(1200);
  const name = await p.getByText("Anna Keller").count();
  log(`${lang} Google sign-in shows Anna: ${name > 0}`);

  log(`${lang} errors: ${errs.length ? errs.join(" | ") : "none"}`);
  await ctx.close();
}
await run("en");
await run("de");
await b.close();
