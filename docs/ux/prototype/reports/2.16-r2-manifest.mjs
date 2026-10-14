#!/usr/bin/env node
// 2.16-r2: builds Phase 2 review round 2 from the post-fix-pass captures in screens/2.N-r2b/.
// Each restyled tour screen is shown next to its approved gift reference ("Gift reference" captions).
// Writes phase2-review/round2/{items.json, manifest-guest.json, manifest-merchant.json, img/, round.json}.
// Refuses to run once round2/verdicts.json exists: past rounds are never overwritten.
// Usage (from anywhere): node docs/ux/prototype/reports/2.16-r2-manifest.mjs
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const SCREENS = resolve(dirname(fileURLToPath(import.meta.url)), "../screens");
const OUT = resolve(SCREENS, "phase2-review", "round2");
if (existsSync(resolve(OUT, "verdicts.json"))) {
  console.error("2.16-r2-manifest: round2 already has verdicts.json; never overwrite a past round");
  process.exit(1);
}

const round1 = JSON.parse(readFileSync(resolve(SCREENS, "phase2-review/round1/items.json"), "utf8"));
const title = (id) => round1.find((it) => it.item === id).title;

// Round 2 reviews every item rejected in round 1.
const ITEMS = [
  ["2.1", null, "2.1.md", "Data only, no visual change; the restyled screens are under 2.4–2.14"],
  ["2.4", "2.4-r2b", "2.4-r2.md"],
  ["2.5", "2.5-r2b", "2.5-r2.md"],
  ["2.7", "2.7-r2b", "2.7-r2.md"],
  ["2.8", "2.8-r2b", "2.8-r2.md"],
  ["2.9", "2.9-r2b", "2.9-r2.md"],
  ["2.10", "2.10-r2b", "2.10-r2.md"],
  ["2.11", "2.11-r2b", "2.11-r2.md"],
  ["2.12", "2.12-r2b", "2.12-r2.md"],
  ["2.13", "2.13-r2b", "2.13-r2.md"],
  ["2.14", "2.14-r2b", "2.14-r2.md"],
  ["2.15", null, "2.15-r2.md", "Complete-flow check after the restyle; evidence in the report"],
];
const MERCHANT = new Set(["2.10", "2.11", "2.12", "2.13", "2.14"]);

const SCREEN = {
  c05: "C05 Sign-in", c10: "C10 Departure and group", c11: "C11 Review booking", c12: "C12 old payment link",
  c13: "C13 Booking confirmed", c14: "C14 Bookings in My transactions", c16: "C16 Booking detail",
  m02: "M02 Overview, tour work", m05: "M05 Departures", m06: "M06 Guest list", m07: "M07 Booking detail",
  m08: "M08 Record payment", p02: "P02 Partner report",
};
// The approved gift screen each tour screen is compared with.
const GIFT = {
  c05: "C05 Sign-in from the cart", c10: "C03 Gift detail options", c11: "C06 Review and send", c13: "C07 Request sent",
  c14: "C14 My transactions, gift orders", c16: "C15 Gift order detail", m02: "M02 Overview, gift work",
  m05: "M03 Gift orders", m06: "M03 Gift orders", m07: "M04 Gift order detail", m08: "M08 Record payment, gift order",
  p02: "P02 Partner report",
};
const STATE = {
  "sheet-place": "pickup place sheet", "over-capacity": "over capacity", "sold-out": "sold out",
  "pay-later": "pay later", "signed-out": "signed out", expired: "expired hold",
  "expired-reconciliation": "expired, money arrived late (reconciliation)", activity: "booking activity",
  balance: "balance due", deadline: "payment deadline", reviewed: "posted review",
  "delivered-debt": "delivered with debt", "ready-to-complete": "ready to complete",
  "overdue-grace": "overdue, grace period", "overdue-merchant": "overdue, merchant decides", overdue: "overdue",
};
// Skipped: focus crops, chip-label probes and partial viewport crops (evidence, not review screens).
const SKIP = /(focus|^labels-|viewport)/;

function describe(file) {
  const base = file.replace(/\.png$/, "");
  const lang = base.endsWith("-de") ? "de" : "en";
  const side = base.includes("side-by-side");
  const gift = base.includes("-gift");
  const width = side || base.includes("-1024-") ? 1024 : 375;
  const key = base.split("-")[0];
  const state = base
    .replace(/^[a-z]\d\d-/, "")
    .replace(/-(gift|tour)(?=-|$)/, "")
    .replace(/-(en|de)$/, "")
    .replace(/(^|-)(375|1024)(-|$)/, "$1")
    .replace(/side-by-side/, "")
    .replace(/^-|-$/g, "");
  const parts = [(gift && !side ? GIFT[key] : SCREEN[key]) ?? key];
  if (state && STATE[state]) parts.push(STATE[state]);
  const prefix = side ? `Side by side, ${GIFT[key]} left, tour right · ` : gift ? "Gift reference (approved) · " : "";
  return { lang, width, gift, side, caption: prefix + parts.join(" · ") + (width === 1024 && !side ? " at 1024px" : "") };
}

rmSync(resolve(OUT, "img"), { recursive: true, force: true });
mkdirSync(resolve(OUT, "img"), { recursive: true });
const manifests = { guest: [], merchant: [] };
const items = [];
for (const [id, folder, report, note] of ITEMS) {
  items.push({ item: id, title: title(id) + (note ? ` · round 2: ${note}` : " · round 2 restyle"), report: `../../../reports/${report}` });
  if (!folder) continue;
  const files = readdirSync(resolve(SCREENS, folder)).filter((f) => f.endsWith(".png") && !SKIP.test(f));
  // Per screen: side-by-side, then gift reference, then tour EN, then tour DE.
  const rank = (f) => { const d = describe(f); return d.side ? 0 : d.gift ? 1 : d.lang === "en" ? 2 : 3; };
  files.sort((a, b) => a.split("-")[0].localeCompare(b.split("-")[0]) || describe(a).width - describe(b).width || a.replace(/-(gift|tour).*/, "").localeCompare(b.replace(/-(gift|tour).*/, "")) || rank(a) - rank(b));
  files.forEach((f, i) => {
    const d = describe(f);
    const file = `img/r2-${id}-${String(i + 1).padStart(2, "0")}-${f}`;
    copyFileSync(resolve(SCREENS, folder, f), resolve(OUT, file));
    (MERCHANT.has(id) ? manifests.merchant : manifests.guest).push({ item: id, file, caption: d.caption, lang: d.lang, width: d.width });
  });
}
writeFileSync(resolve(OUT, "items.json"), JSON.stringify(items, null, 1) + "\n");
writeFileSync(resolve(OUT, "manifest-guest.json"), JSON.stringify(manifests.guest, null, 1) + "\n");
writeFileSync(resolve(OUT, "manifest-merchant.json"), JSON.stringify(manifests.merchant, null, 1) + "\n");
writeFileSync(resolve(OUT, "round.json"), JSON.stringify({ title: "Phase 2 review · round 2 (14 Oct 2026)", intro: "Round 2: the tour screens rejected in round 1, restyled to the approved gift flow's UI style (visual only; the booking flow is unchanged). Each screen is shown next to its approved gift reference. Mark each item Approved or Not approved; comment overall or on a specific screen. Your verdicts are saved in this browser." }) + "\n");
console.log(`2.16-r2-manifest: ${items.length} items, ${manifests.guest.length} guest + ${manifests.merchant.length} merchant shots`);
