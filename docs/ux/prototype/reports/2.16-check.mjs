// 2.16: checks the Phase 2 review gallery opened from disk (file://), at 375px and 1440px.
// Every image loads, every report link resolves, verdicts and comments survive a reload,
// export works (and is blocked while Not approved has no comment), filters, viewer, overflow.
// Run from a folder with playwright-core installed:
//   node 2.16-check.mjs <screens/2.16 dir> [path to phase2-review/index.html]
import { chromium } from "playwright-core";
import { existsSync, mkdirSync, readFileSync, readdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const OUT = process.argv[2];
const GALLERY = resolve(process.argv[3] ?? resolve(dirname(fileURLToPath(import.meta.url)), "../screens/phase2-review/index.html"));
const URL = pathToFileURL(GALLERY).href;
mkdirSync(OUT, { recursive: true });

const home = process.env.HOME + "/.cache/ms-playwright/";
const dir = readdirSync(home).filter((d) => d.startsWith("chromium_headless_shell-")).sort().pop();
const browser = await chromium.launch({ executablePath: `${home}${dir}/chrome-headless-shell-linux64/chrome-headless-shell` });
let pass = 0, fail = 0;
const check = (name, ok, extra = "") => { ok ? pass++ : fail++; console.log(ok ? "PASS" : "FAIL", name, extra === "" ? "" : `· ${extra}`); };
const items = JSON.parse(readFileSync(resolve(dirname(GALLERY), "items.json"), "utf8"));
const manifest = ["manifest-guest.json", "manifest-merchant.json"].flatMap((f) => JSON.parse(readFileSync(resolve(dirname(GALLERY), f), "utf8")));

for (const width of [375, 1440]) {
  const context = await browser.newContext({ viewport: { width, height: width === 375 ? 812 : 900 }, deviceScaleFactor: width === 375 ? 2 : 1, acceptDownloads: true });
  const page = await context.newPage();
  page.on("pageerror", (e) => console.log("PAGEERROR", e.message));
  page.on("console", (m) => { if (m.type() === "error") console.log("CONSOLE", m.text().slice(0, 160)); });
  page.on("dialog", (d) => d.accept());
  const at = `@${width}`;
  await page.goto(URL);
  await page.waitForTimeout(300);

  const cards = await page.locator("section.card").count();
  const thumbs = await page.locator(".thumb img").count();
  check(`${at} one card per item (2.1–2.15 and 2.3-map)`, cards === items.length && cards === 16, `${cards} cards`);
  check(`${at} every manifest screenshot is on the page`, thumbs === manifest.length, `${thumbs} thumbnails`);
  check(`${at} no horizontal overflow`, (await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)) <= 0);

  // Every image loads: lazy thumbnails are switched to eager and awaited.
  const images = await page.evaluate(async () => {
    const imgs = [...document.querySelectorAll(".thumb img")];
    imgs.forEach((i) => { i.loading = "eager"; });
    await Promise.all(imgs.map((i) => (i.complete ? null : new Promise((r) => { i.onload = i.onerror = r; }))));
    return { total: imgs.length, broken: imgs.filter((i) => !i.naturalWidth).map((i) => i.getAttribute("src")) };
  });
  check(`${at} every image loads`, images.broken.length === 0, `${images.total - images.broken.length}/${images.total} loaded${images.broken.length ? "; broken: " + images.broken.join(", ") : ""}`);

  // Every report link resolves to an existing file and opens.
  const links = await page.locator("a.report").evaluateAll((as) => as.map((a) => ({ text: a.textContent, href: a.href })));
  const unresolved = links.filter((l) => !existsSync(fileURLToPath(l.href)));
  check(`${at} every item links its report and every link resolves`, links.length === 16 && unresolved.length === 0 && (await page.locator(".noreport").count()) === 0, `${links.length} links${unresolved.length ? "; missing " + unresolved.map((l) => l.href).join(", ") : ""}`);
  if (width === 375) {
    const reportPage = await context.newPage();
    const opened = [];
    for (const l of links) {
      await reportPage.goto(l.href);
      opened.push((await reportPage.locator("body").innerText()).trimStart().startsWith("#"));
    }
    await reportPage.close();
    check(`${at} every report link opens a Markdown report`, opened.every(Boolean), `${opened.filter(Boolean).length}/${links.length}`);
    console.log("INFO items:", items.map((it) => `${it.item} (${manifest.filter((m) => m.item === it.item).length})`).join(", "));
  }

  if (width === 375) await page.screenshot({ path: `${OUT}/gallery-top-375.png` });
  else await page.screenshot({ path: `${OUT}/gallery-top-1440.png` });

  // Verdicts: approve one, not-approve another; export blocked until the comment exists.
  const card = (id) => page.locator(`section#item-${id.replace(".", "\\.")}`);
  await card("2.6").getByRole("button", { name: "Approved", exact: true }).click();
  await card("2.3-map").getByRole("button", { name: "Not approved", exact: true }).click();
  check(`${at} Not approved without a comment shows the hint`, await card("2.3-map").locator(".hint").isVisible());
  await page.getByRole("button", { name: "Download review" }).click();
  await page.waitForTimeout(300);
  check(`${at} Download blocked: notice names the item`, /Add a comment to every Not approved item first: 2\.3-map\./.test(await page.locator("#notice").innerText()));
  await card("2.3-map").locator(".verdict textarea").fill("Make the stop card photo larger.");
  await card("2.9").locator(".verdict textarea").fill("Note only, no verdict yet.");
  await page.waitForTimeout(200);
  const counts = async () => page.evaluate(() => ["n-ok", "n-no", "n-none"].map((id) => document.getElementById(id).textContent).join("/"));
  check(`${at} counts Approved/Not approved/Not reviewed`, (await counts()) === "1/1/14", await counts());
  if (width === 375) {
    await card("2.3-map").locator(".verdict").scrollIntoViewIfNeeded();
    await page.screenshot({ path: `${OUT}/gallery-verdict-375.png` });
  }

  await page.reload();
  await page.waitForTimeout(300);
  const persisted = {
    ok: await card("2.6").getByRole("button", { name: "Approved", exact: true }).getAttribute("aria-pressed"),
    no: await card("2.3-map").getByRole("button", { name: "Not approved", exact: true }).getAttribute("aria-pressed"),
    comment: await card("2.3-map").locator(".verdict textarea").inputValue(),
    note: await card("2.9").locator(".verdict textarea").inputValue(),
    status: await card("2.6").locator(".status").innerText(),
  };
  check(`${at} verdicts and comments persist across reload`, persisted.ok === "true" && persisted.no === "true" && persisted.comment === "Make the stop card photo larger." && persisted.note === "Note only, no verdict yet." && persisted.status === "Approved" && (await counts()) === "1/1/14", JSON.stringify(persisted));

  // Export
  const [download] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Download review" }).click()]);
  const exported = JSON.parse(readFileSync(await download.path(), "utf8"));
  const byId = Object.fromEntries(exported.items.map((i) => [i.item, i]));
  check(`${at} Download review exports every item with verdict and comment`, download.suggestedFilename() === "phase2-review.json" && exported.items.length === 16 && byId["2.6"].verdict === "approved" && byId["2.3-map"].verdict === "not_approved" && byId["2.3-map"].comment === "Make the stop card photo larger." && byId["2.1"].verdict === null, download.suggestedFilename());

  // Filter
  await page.locator('.filters button[data-filter="approved"]').click();
  check(`${at} filter Approved shows only 2.6`, (await page.locator("section.card:not([hidden])").count()) === 1 && (await page.locator("section.card:not([hidden]) .id").innerText()) === "2.6");
  await page.locator('.filters button[data-filter="all"]').click();

  // Viewer
  const first = card("2.6").locator(".thumb").first();
  await first.click();
  await page.waitForTimeout(400);
  const v1 = await page.locator("#v-count").innerText();
  await page.getByRole("button", { name: "Next screenshot" }).click();
  const v2 = await page.locator("#v-count").innerText();
  const vImg = await page.locator("#v-img").evaluate((i) => i.complete && i.naturalWidth > 0);
  if (width === 1440) await page.screenshot({ path: `${OUT}/gallery-viewer-1440.png` });
  else await page.screenshot({ path: `${OUT}/gallery-viewer-375.png` });
  await page.keyboard.press("Escape");
  await page.waitForTimeout(300);
  check(`${at} viewer opens, steps within the item, Escape closes and returns focus`, v1 === "1 / 8" && v2 === "2 / 8" && vImg && !(await page.locator("#viewer").evaluate((d) => d.open)) && (await page.evaluate(() => document.activeElement?.classList.contains("thumb"))), `${v1} → ${v2}`);

  if (width === 1440) {
    await card("2.15").scrollIntoViewIfNeeded();
    await card("2.15").locator("li.wide").first().scrollIntoViewIfNeeded();
    await page.waitForTimeout(400);
    await page.screenshot({ path: `${OUT}/gallery-desktop-shots-1440.png` });
    const flagged = page.locator("li.issue");
    { const expected = manifest.filter((m) => m.issue).length; check(`${at} flagged shots match the manifest's issue notes`, (await flagged.count()) === expected && (expected === 0 || (await flagged.first().locator(".issue-text").isVisible())), `${await flagged.count()} flagged, ${expected} expected`); }
    if (await flagged.count()) {
      await flagged.first().scrollIntoViewIfNeeded();
      await page.waitForTimeout(300);
      await page.screenshot({ path: `${OUT}/gallery-issue-1440.png` });
    }
  }
  await context.close();
}

console.log(`\n${pass} passed, ${fail} failed`);
await browser.close();
