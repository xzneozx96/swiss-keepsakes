import { chromium } from "playwright-core";
const exe = process.env.HOME + "/.cache/ms-playwright/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell";
const [G, OUT] = process.argv.slice(2);
const URL = "file://" + G + "/index.html";
let pass = 0, fail = 0;
const check = (n, ok, x = "") => { ok ? pass++ : fail++; console.log(ok ? "PASS" : "FAIL", n, x); };
const br = await chromium.launch({ executablePath: exe });
const ctx = await br.newContext({ viewport: { width: 375, height: 812 }, deviceScaleFactor: 2, permissions: ["clipboard-read", "clipboard-write"] });
const page = await ctx.newPage();
page.on("pageerror", (e) => console.log("PAGEERROR", e.message));
// Seed an "older build" state to test carry-over.
await page.goto(URL);
await page.evaluate(() => { localStorage.clear(); localStorage.setItem("phase2-review:2000-01-01T00:00:00.000Z", JSON.stringify({ "2.1": { verdict: "approved", comment: "old ok" } })); });
await page.reload(); await page.waitForTimeout(300);
check("verdict carried over from older build", (await page.locator("#item-2\\.1 .status").innerText()) === "Approved");
check("old overall comment carried over", (await page.locator("#c-2\\.1").inputValue()) === "old ok");
const card = page.locator("#item-2\\.2");
check("overall label renamed", await card.getByText("Overall comment").isVisible());
const notes = card.locator(".shot-note textarea");
check("each screen has a comment box", (await notes.count()) === (await card.locator(".thumb").count()), `${await notes.count()}`);
await notes.nth(0).fill("Price line wraps badly");
await page.waitForTimeout(100);
check("card shows screen comment count", (await card.locator(".screen-count").innerText()) === "1 screen comment");
check("commented screen highlighted", await card.locator("li.has-note").count() === 1);
// Not approved with only a screen comment needs no overall comment
await card.getByRole("button", { name: "Not approved" }).click();
check("no missing-comment hint when a screen comment exists", await card.locator(".hint").isHidden());
// viewer sync
await card.locator(".thumb").nth(0).click(); await page.waitForTimeout(300);
check("viewer shows the screen comment", (await page.locator("#v-note").inputValue()) === "Price line wraps badly");
await page.locator("#v-next").click();
await page.locator("#v-note").fill("Second screen note");
await page.locator("#v-note").press("ArrowLeft");
check("arrow keys inside the note do not change screen", (await page.locator("#v-count").innerText()).startsWith("2 /"));
await page.screenshot({ path: OUT + "/viewer-note-375.png" });
await page.locator("#v-close").click();
check("viewer comment appears in grid", (await notes.nth(1).inputValue()) === "Second screen note");
check("count updates to 2", (await card.locator(".screen-count").innerText()) === "2 screen comments");
// clearing a note removes it
await notes.nth(1).fill(""); await page.waitForTimeout(100);
check("clearing a note removes it", (await card.locator(".screen-count").innerText()) === "1 screen comment");
// item with not approved and no comments still blocks export
const c3 = page.locator("#item-2\\.3");
await c3.getByRole("button", { name: "Not approved" }).click();
await page.locator("#copy").click(); await page.waitForTimeout(200);
check("export blocked for item without any comment", (await page.locator("#notice").innerText()).includes("2.3"));
await c3.locator(".shot-note textarea").first().fill("Map card too tall");
await page.locator("#copy").click(); await page.waitForTimeout(300);
const text = await page.evaluate(() => navigator.clipboard.readText());
check("text export lists screen comments", text.includes("Screen ·") && text.includes("Price line wraps badly") && text.includes("Map card too tall"), "\n" + text.split("\n").filter((l) => /2\.[23] |Screen/.test(l)).join("\n"));
// download JSON contains screens
const [dl] = await Promise.all([page.waitForEvent("download"), page.locator("#download").click()]);
const json = JSON.parse(await (await import("node:fs")).promises.readFile(await dl.path(), "utf8"));
const i22 = json.items.find((i) => i.item === "2.2");
check("JSON export has screens with file and comment", i22.screens.length === 1 && i22.screens[0].comment === "Price line wraps badly" && i22.screens[0].file.startsWith("img/"), JSON.stringify(i22.screens[0]));
await page.reload(); await page.waitForTimeout(300);
check("screen comments persist across reload", (await page.locator("#item-2\\.2 .shot-note textarea").nth(0).inputValue()) === "Price line wraps badly");
await page.locator("#item-2\\.2").scrollIntoViewIfNeeded();
await page.locator("#item-2\\.2 .shot-note").first().scrollIntoViewIfNeeded();
await page.screenshot({ path: OUT + "/grid-note-375.png" });
check("no horizontal overflow at 375", await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
await page.evaluate(() => localStorage.clear());
await br.close();
console.log(`${pass} passed, ${fail} failed`);
