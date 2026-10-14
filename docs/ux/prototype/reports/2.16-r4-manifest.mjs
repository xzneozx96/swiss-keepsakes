#!/usr/bin/env node
// 2.16-r4: builds Phase 2 review round 4 (2.4 option tiles, 2.17 trip answers per order or booking).
// Writes phase2-review/round4/{items.json, manifest-guest.json, img/, round.json}; refuses once round4/verdicts.json exists.
// Usage (from anywhere): node docs/ux/prototype/reports/2.16-r4-manifest.mjs
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const SCREENS = resolve(dirname(fileURLToPath(import.meta.url)), "../screens");
const OUT = resolve(SCREENS, "phase2-review", "round4");
if (existsSync(resolve(OUT, "verdicts.json"))) {
  console.error("2.16-r4-manifest: round4 already has verdicts.json; never overwrite a past round");
  process.exit(1);
}
const round1 = JSON.parse(readFileSync(resolve(SCREENS, "phase2-review/round1/items.json"), "utf8"));
const ITEMS = [
  { item: "2.4", title: round1.find((it) => it.item === "2.4").title + " · round 4: selected tile keeps its fill with a red border; circled check on the top-right corner (C03 and C10); round 5: C10 is a bottom sheet on C09 like C03's", report: "2.4-r2.md" },
  { item: "2.17", title: "Trip answers saved on each order or booking (owner decision, 14 Oct): asked on C07/C13, shown and edited on C15/C16, account trip card removed", report: "2.17.md" },
];
// [item, file under screens/, caption, lang, width]: pairs are before (left) and after (right).
const SHOTS = [
  ["2.4", "2.4-r4/corner-c03-en.png", "C03 option tile, selected: circled check centred on the rounded corner (close-up)", "en", 375],
  ["2.4", "2.4-r4/pair-c03-sheet-selected-en.png", "C03 option sheet, before (left) and after (right)", "en", 1024],
  ["2.4", "2.4-r4/pair-c03-sheet-selected-de.png", "C03 option sheet, before and after", "de", 1024],
  ["2.4", "2.4-r4/pair-c03-sheet-disabled-en.png", "C03 sold-out option stays muted, before and after", "en", 1024],
  ["2.4", "2.4-r4/pair-c03-sheet-keyboard-en.png", "C03 keyboard focus, before and after", "en", 1024],
  ["2.4", "2.4-r5/side-by-side-c03-c10-en.png", "C10 is now a bottom sheet on C09 (round 5, owner): gift C03 'Your gift' sheet left, tour C10 sheet right", "en", 1024],
  ["2.4", "2.4-r5/side-by-side-c03-c10-de.png", "C03 and C10 sheets side by side", "de", 1024],
  ["2.4", "2.4-r5/sheet-top-en.png", "C10 sheet: tour name as title, departure tiles with the corner check", "en", 375],
  ["2.4", "2.4-r5/sheet-top-de.png", "C10 sheet", "de", 375],
  ["2.4", "2.4-r5/sheet-bottom-en.png", "C10 sheet, scrolled: group counters and 'Review booking · CHF' button", "en", 375],
  ["2.4", "2.4-r5/sold-out-en.png", "C10 sheet: sold-out departure stays muted", "en", 375],
  ["2.4", "2.4-r5/over-capacity-en.png", "C10 sheet: group larger than the seats left", "en", 375],
  ["2.4", "2.4-r5/keyboard-en.png", "C10 sheet: keyboard focus stays inside the sheet", "en", 375],
  ["2.17", "2.17/c07-answered-en.png", "C07 Request sent: trip questions answered (saved on every order of this request)", "en", 375],
  ["2.17", "2.17/c07-answered-de.png", "C07 Request sent: trip questions answered", "de", 375],
  ["2.17", "2.17/c07-prefilled-en.png", "C07: pre-filled from an earlier purchase whose trip dates cover this pickup date", "en", 375],
  ["2.17", "2.17/c07-outside-blank-en.png", "C07: blank when no earlier trip covers this pickup date", "en", 375],
  ["2.17", "2.17/c13-answered-en.png", "C13 Booking confirmed: trip questions answered (saved on this booking)", "en", 375],
  ["2.17", "2.17/c13-prefilled-en.png", "C13: pre-filled from an earlier purchase on the same trip", "en", 375],
  ["2.17", "2.17/c15-answered-en.png", "C15 gift order, Overview: Your trip card with the answers", "en", 375],
  ["2.17", "2.17/c15-answered-de.png", "C15 gift order, Overview: Your trip card", "de", 375],
  ["2.17", "2.17/c15-not-answered-en.png", "C15: not answered yet, Answer now", "en", 375],
  ["2.17", "2.17/c15-sheet-en.png", "C15: edit sheet", "en", 375],
  ["2.17", "2.17/c16-answered-en.png", "C16 tour booking, Overview: Your trip card", "en", 375],
  ["2.17", "2.17/c16-answered-de.png", "C16 tour booking, Overview: Your trip card", "de", 375],
  ["2.17", "2.17/c16-not-answered-en.png", "C16: not answered yet, Answer now", "en", 375],
  ["2.17", "2.17/c16-sheet-en.png", "C16: edit sheet", "en", 375],
  ["2.17", "2.17/account-hub-en.png", "Account: the standalone trip card and hub line are gone", "en", 375],
];
rmSync(resolve(OUT, "img"), { recursive: true, force: true });
mkdirSync(resolve(OUT, "img"), { recursive: true });
const manifest = SHOTS.map(([item, src, caption, lang, width], i) => {
  const file = `img/r4-${item}-${String(i + 1).padStart(2, "0")}-${src.split("/").pop()}`;
  copyFileSync(resolve(SCREENS, src), resolve(OUT, file));
  return { item, file, caption, lang, width };
});
writeFileSync(resolve(OUT, "items.json"), JSON.stringify(ITEMS.map((it) => ({ ...it, report: `../../../reports/${it.report}` })), null, 1) + "\n");
writeFileSync(resolve(OUT, "manifest-guest.json"), JSON.stringify(manifest, null, 1) + "\n");
writeFileSync(resolve(OUT, "round.json"), JSON.stringify({ title: "Phase 2 review · round 4 (14 Oct 2026)", intro: "Round 4: the C03/C10 option tiles from your round 3 comments, C10 moved into a bottom sheet like the gift sheet, and trip answers saved on each order or booking. Mark each item Approved or Not approved; comment overall or on a specific screen. Your verdicts are saved in this browser." }) + "\n");
console.log(`2.16-r4-manifest: ${ITEMS.length} items, ${manifest.length} shots`);
