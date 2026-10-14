// Acceptance check for the 1.19c review gallery: drives screens/phase1-review/index.html from file:// in headless Chromium.
// Expects index.html built with a manifest that has screenshots for items 1.5 (4 shots, one with an issue) and 1.9.
// Run from a folder whose node_modules has playwright-core (see 1.18.md), e.g. `node 1.19c-check.mjs`.
import { chromium } from "playwright-core";
import { mkdirSync, readdirSync, readFileSync } from "node:fs";

const ROOT = "/home/ross-geller/Projects/minastik/swiss-keepsakes/docs/ux/prototype/screens/";
const URL = "file://" + ROOT + "phase1-review/index.html";
const OUT = ROOT + "1.19/";
mkdirSync(OUT, { recursive: true });

let failed = 0;
const check = (ok, msg) => { console.log((ok ? "PASS " : "FAIL ") + msg); if (!ok) failed++; };

const home = process.env.HOME + "/.cache/ms-playwright/";
const dir = readdirSync(home).filter((d) => d.startsWith("chromium_headless_shell-")).sort().pop();
const browser = await chromium.launch({ executablePath: `${home}${dir}/chrome-headless-shell-linux64/chrome-headless-shell` });
const ctx = await browser.newContext({ viewport: { width: 1024, height: 900 }, deviceScaleFactor: 2, acceptDownloads: true });
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
page.on("console", (m) => m.type() === "error" && errors.push("console: " + m.text()));
const requests = [];
page.on("request", (r) => { if (!r.url().startsWith("file://") && !r.url().startsWith("blob:") && !r.url().startsWith("data:")) requests.push(r.url()); });

const card = (id) => page.locator(`#item-${id.replace(".", "\\.")}`);
const counts = () => page.evaluate(() => ["n-ok", "n-no", "n-none"].map((id) => +document.getElementById(id).textContent));
const overflow = () => page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
// Screenshot once every thumbnail in view has loaded (they are lazy).
const shot = async (path, opts = {}) => {
  await page.waitForFunction(() => [...document.querySelectorAll(".thumb img")].filter((i) => { const r = i.getBoundingClientRect(); return r.bottom > 0 && r.top < innerHeight; }).every((i) => i.complete && i.naturalWidth > 0), null, { timeout: 5000 }).catch(() => console.log("WARN thumbnails still loading for " + path));
  await page.screenshot({ path, ...opts });
};

await page.goto(URL);
await page.evaluate(() => localStorage.clear());
await page.reload();
check((await page.title()) === "Phase 1 review", "title is 'Phase 1 review'");
const nItems = JSON.parse(readFileSync(ROOT + "phase1-review/items.json", "utf8")).length;
check((await page.locator("section.card").count()) === nItems, `one section per item (${nItems})`);
check(JSON.stringify(await counts()) === JSON.stringify([0, 0, nItems]), "counts start at 0 / 0 / all");
check((await card("1.4").locator(".noreport").textContent()) === "no report", "1.4 (missing report file) shows 'no report'");
check((await card("1.5").locator("a.report").getAttribute("href")) === "../../reports/1.5.md", "1.5 links its report");
check((await card("1.5").locator(".grid li").count()) === 4, "1.5 shows 4 thumbnails");
check((await card("1.5").locator("li.issue .issue-text").count()) === 1, "1.5 highlights its issue entry");
check((await card("1.9").locator("li.wide").count()) === 1, "1024px shot spans two columns");
check((await card("1.6").locator(".empty").count()) === 1, "item without screenshots shows a note");
check(await page.evaluate(() => [...document.images].every((i) => i.complete || i.loading === "lazy")), "images resolve");
check(!(await overflow()), "no horizontal overflow at 1024");
await shot(OUT + "gallery-1024.png");

// Verdicts
await card("1.5").getByRole("button", { name: "Approved", exact: true }).click();
await card("1.9").getByRole("button", { name: "Not approved" }).click();
check(await card("1.9").locator(".hint").isVisible(), "Not approved without comment shows the hint");
check(await page.evaluate(() => document.activeElement.id === "c-1.9"), "Not approved focuses the comment box");
await card("1.9").scrollIntoViewIfNeeded();
await shot(OUT + "gallery-not-approved-hint-1024.png");

let downloaded = false;
page.once("download", () => { downloaded = true; });
await page.click("#download");
await page.waitForTimeout(700);
check(!downloaded, "Download is blocked while a Not approved item has no comment");
check(((await page.textContent("#notice")) || "").includes("1.9"), "blocked Download names the item: " + (await page.textContent("#notice")));
await shot(OUT + "gallery-download-blocked-1024.png");

const COMMENT = "Header too tall on 1024.\nMove the date chips up.";
await card("1.9").locator("textarea").fill(COMMENT);
check(await card("1.9").locator(".hint").isHidden(), "hint hides once the comment is filled");
check(((await page.textContent("#notice")) || "") === "", "notice clears once every Not approved item has a comment");
check(JSON.stringify(await counts()) === JSON.stringify([1, 1, nItems - 2]), "counts 1 / 1 / rest");

// Reload keeps verdicts and comments
await page.reload();
check((await card("1.5").getByRole("button", { name: "Approved", exact: true }).getAttribute("aria-pressed")) === "true", "reload keeps 1.5 Approved");
check((await card("1.9").getByRole("button", { name: "Not approved" }).getAttribute("aria-pressed")) === "true", "reload keeps 1.9 Not approved");
check((await card("1.9").locator("textarea").inputValue()) === COMMENT, "reload keeps the 1.9 comment");
check(JSON.stringify(await counts()) === JSON.stringify([1, 1, nItems - 2]), "reload keeps counts");

// Download JSON
const [dl] = await Promise.all([page.waitForEvent("download"), page.click("#download")]);
check(dl.suggestedFilename() === "phase1-review.json", "download is named phase1-review.json");
const json = JSON.parse(readFileSync(await dl.path(), "utf8"));
const items = JSON.parse(readFileSync(ROOT + "phase1-review/items.json", "utf8"));
check(JSON.stringify(Object.keys(json)) === '["reviewedAt","items"]', "JSON has exactly reviewedAt and items");
check(!Number.isNaN(Date.parse(json.reviewedAt)), "reviewedAt is a date: " + json.reviewedAt);
check(json.items.length === items.length && json.items.every((x, i) => x.item === items[i].item && x.title === items[i].title), "every item present, in items.json order");
check(json.items.every((x) => JSON.stringify(Object.keys(x)) === '["item","title","verdict","comment"]'), "each entry has exactly item, title, verdict, comment");
const by = Object.fromEntries(json.items.map((x) => [x.item, x]));
check(by["1.5"].verdict === "approved" && by["1.5"].comment === "", "1.5 approved, comment ''");
check(by["1.9"].verdict === "not_approved" && by["1.9"].comment === COMMENT, "1.9 not_approved with the comment");
check(json.items.filter((x) => x.verdict === null && x.comment === "").length === items.length - 2, "unreviewed items have verdict null and comment ''");
await dl.saveAs(OUT + "phase1-review.sample.json");

// Copy as text (clipboard may be unavailable on file://; read back what was written either way)
await page.evaluate(() => {
  window.__copied = null;
  const orig = navigator.clipboard?.writeText?.bind(navigator.clipboard);
  if (navigator.clipboard) navigator.clipboard.writeText = (t) => { window.__copied = t; return orig ? orig(t).catch(() => {}) : Promise.resolve(); };
});
await page.click("#copy");
await page.waitForTimeout(200);
const copied = await page.evaluate(() => window.__copied);
check(typeof copied === "string" && copied.includes("1.5 C04 Cart (grouped into orders): Approved") && copied.includes("1.9 M02 Merchant Today: Not approved") && copied.includes("  Comment: Header too tall on 1024.\n  Move the date chips up."), "Copy as text produces readable lines");
check(await page.locator("#toast").isVisible(), "copy shows a toast");
console.log("--- copied text (head) ---\n" + (copied || "").split("\n").slice(0, 8).join("\n") + "\n---");

// Filters
await page.click('.filters button[data-filter="approved"]');
check((await page.locator("section.card:not([hidden])").count()) === 1, "filter Approved shows one item");
await page.click('.filters button[data-filter="none"]');
check((await page.locator("section.card:not([hidden])").count()) === nItems - 2, "filter Not reviewed shows the rest");
await page.click('.filters button[data-filter="all"]');

// Viewer, by keyboard
await card("1.5").locator(".thumb").first().focus();
await page.keyboard.press("Enter");
check(await page.locator("#viewer").evaluate((d) => d.open), "Enter on a thumbnail opens the viewer");
check((await page.textContent("#v-count")) === "1 / 4", "viewer shows 1 / 4");
await page.keyboard.press("ArrowRight");
await page.keyboard.press("ArrowRight");
await page.keyboard.press("ArrowRight");
check((await page.textContent("#v-count")) === "4 / 4", "ArrowRight walks to 4 / 4");
check(await page.locator("#v-issue").isVisible(), "issue shot shows its issue in the viewer");
check(await page.locator("#v-next").isDisabled(), "Next disabled on the last shot");
await page.waitForFunction(() => document.getElementById("v-img").complete); await page.screenshot({ path: OUT + "viewer-issue-1024.png" });
await page.click("#v-prev");
check((await page.textContent("#v-count")) === "3 / 4", "Prev button goes back");
await page.keyboard.press("Escape");
check(!(await page.locator("#viewer").evaluate((d) => d.open)), "Esc closes the viewer");
check(await page.evaluate(() => document.activeElement.classList.contains("thumb")), "focus returns to the thumbnail");

// Phone width
await page.setViewportSize({ width: 375, height: 812 });
check(!(await overflow()), "no horizontal overflow at 375");
await page.evaluate(() => window.scrollTo(0, 0));
await shot(OUT + "gallery-375.png");
await card("1.5").scrollIntoViewIfNeeded();
await shot(OUT + "gallery-item-375.png");
await card("1.5").locator(".thumb").first().click();
await page.waitForFunction(() => document.getElementById("v-img").complete); await page.screenshot({ path: OUT + "viewer-375.png" });
await page.keyboard.press("Escape");
await page.setViewportSize({ width: 1024, height: 900 });
await page.evaluate(() => window.scrollTo(0, 0));
await shot(OUT + "gallery-full-1024.png", { fullPage: true });

// Reset with confirm: dismiss keeps, accept clears
page.once("dialog", (d) => d.dismiss());
await page.click("#reset");
check(JSON.stringify(await counts()) === JSON.stringify([1, 1, nItems - 2]), "Reset cancelled keeps verdicts");
page.once("dialog", (d) => d.accept());
await page.click("#reset");
check(JSON.stringify(await counts()) === JSON.stringify([0, 0, nItems]), "Reset confirmed clears verdicts");
await page.reload();
check(JSON.stringify(await counts()) === JSON.stringify([0, 0, nItems]), "reset survives reload");

check(errors.length === 0, "no console errors" + (errors.length ? ": " + errors.join(" | ") : ""));
check(requests.length === 0, "no network requests" + (requests.length ? ": " + requests.join(" ") : ""));
await browser.close();
console.log(failed ? `${failed} FAILED` : "ALL PASS");
process.exit(failed ? 1 : 0);
