#!/usr/bin/env node
// 2.16: picks the Phase 2 review screenshots, copies them unchanged into phase2-review/img
// (as Phase 1 did: 2x captures stay 2x, 1x captures are not upscaled) and writes the two
// manifests that phase2-review/build-review.mjs reads.
// Usage (from anywhere): node docs/ux/prototype/reports/2.16-manifest.mjs --round <N>
// Writes into phase2-review/round<N>/ (img/ and both manifests). Refuses a round that already has verdicts.json:
// past rounds are never overwritten.
// manifest-guest.json = steps 2.1-2.9 (guest booking); manifest-merchant.json = 2.10-2.15.
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const SCREENS = resolve(dirname(fileURLToPath(import.meta.url)), "../screens");
const roundAt = process.argv.indexOf("--round");
const ROUND = roundAt >= 0 ? process.argv[roundAt + 1] : null;
if (!/^\d+$/.test(ROUND ?? "")) { console.error("2.16-manifest: pass --round <N>"); process.exit(1); }
const OUT = resolve(SCREENS, "phase2-review", `round${ROUND}`);
if (existsSync(resolve(OUT, "verdicts.json"))) { console.error(`2.16-manifest: round${ROUND} already has verdicts.json; never overwrite a past round`); process.exit(1); }

// [manifest, item, step folder, file pattern with {lang}, caption, langs (default both), { issue }?]
const G = "guest", M = "merchant";
const PICKS = [
  [G, "2.1", "2.1", "c10-during-hold-{lang}", "C10 during a 15-minute hold: the held group's 3 seats are taken (Tue 20 Oct shows 9 of 12 available)"],
  [G, "2.1", "2.1", "c10-after-expiry-{lang}", "C10 after the hold deadline passed on the demo clock: the seats are free again (12 available); the deadline itself never moved"],

  [G, "2.2", "2.2", "c08-list-{lang}", "C08 Tour list: duration, from price, next departure; German-only tour card ('Text in German'), Sold out tour, Coming soon tour"],
  [G, "2.2", "2.2", "c08-card-focus-{lang}", "C08 keyboard focus ring on a tour card", ["en"]],
  [G, "2.2", "2.2", "c08-empty-{lang}", "C08 empty state (prototype control 'Empty the tour list'; Reset restores)"],

  [G, "2.3", "2.3", "c09-walk-{lang}", "C09 Tour detail, full page: gallery, stats, operator, highlights, about, reviews, itinerary map, inclusions, age-group prices, things to know"],
  [G, "2.3", "2.3", "c09-things-to-know-open-{lang}", "C09 things to know opened: payment depends on the departure (dates per policy), conditions, cancellation"],
  [G, "2.3", "2.3", "accordion-tour-{lang}", "C09 accordion labels flush with the divider (owner bug fixed: 0px, same as gift detail)", ["en"]],
  [G, "2.3", "2.3", "accordion-gift-{lang}", "Gift detail accordion for comparison (unchanged)", ["en"]],
  [G, "2.3", "2.3", "c09-night-{lang}", "C09 German-only tour 'Luzern bei Nacht': complete German text, language notice in EN, none in DE"],
  [G, "2.3", "2.3", "c09-workshop-sold-out-{lang}", "C09 sold-out tour: why no departure is available, action disabled, 'Sold out' in the action bar"],
  [G, "2.3", "2.3", "gift-list-{lang}", "Gift list after the shared ListingCard extraction (regression check)", ["en"]],
  [G, "2.3", "2.3", "gift-detail-{lang}", "Gift detail after the shared ListingDetail extraction (regression check)", ["en"]],
  [G, "2.3", "2.3", "gift-reviews-sheet-{lang}", "Gift reviews sheet still opens (regression check)", ["en"]],

  [G, "2.3-map", "2.3-map", "card-stop1-{lang}", "C09 map with the stop card inside it (stop 1): number, name, 2-line description, photo, previous/next, View more; whole map and card on one screen"],
  [G, "2.3-map", "2.3-map", "card-stop3-{lang}", "Pin 3 tapped: the card shows Musegg Wall, pin 3 highlighted, map flown to it", ["en"]],
  [G, "2.3-map", "2.3-map", "sheet-stop3-{lang}", "View more sheet: photo, stop number and time, full description, 'Good to know' note, previous/next stop"],
  [G, "2.3-map", "2.3-map", "card-closed-{lang}", "Card closed: no stop selected, focus on the pin; a pin reopens the card", ["en"]],
  [G, "2.3-map", "2.3-map", "fullscreen-{lang}", "Fullscreen map keeps the stop card"],
  [G, "2.3-map", "2.3-map", "fullscreen-sheet-{lang}", "View more sheet opens above the fullscreen map", ["en"]],
  [G, "2.3-map", "2.3-map", "card-night-{lang}", "German-only tour in EN: the card shows the German stop", ["en"]],
  [G, "2.3-map", "2.3-map", "map-error-{lang}", "Map service down: message and Reload map; the card still steps through the stops", ["en"]],

  [G, "2.4", "2.4", "c10-walk-{lang}", "C10 Departure and group: date, time, prices, payment policy and seats per departure; sold-out 18 Oct disabled; age-band counters; seat rule; payment summary"],
  [G, "2.4", "2.4", "c10-over-capacity-{lang}", "C10 group larger than the last-seats departure: warning and Review booking disabled"],
  [G, "2.4", "2.4", "c10-deposit-summary-{lang}", "C10 30% deposit: CHF 66.90 today, CHF 156.10 by Thu 15 Oct · 18:00"],
  [G, "2.4", "2.4", "c10-lake-pay-later-{lang}", "C10 pay-later tour: nothing due today, no card; this tour's own age bands (children from 4)"],
  [G, "2.4", "2.4", "c10-night-{lang}", "C10 for the German-only tour"],
  [G, "2.4", "2.4", "c10-workshop-sold-out-{lang}", "C10 sold-out tour: every departure disabled", ["en"]],
  [G, "2.4", "2.4", "c10-keyboard-focus-{lang}", "C10 keyboard: arrow keys skip the sold-out departure", ["en"]],

  [G, "2.5", "2.5", "c11-signed-out-{lang}", "C11 Review booking, signed out: departure, meeting point, group, total, due today, balance and due date; sign-in prompt"],
  [G, "2.5", "2.5", "c05-sign-in-{lang}", "C05 sign-in reached from C11; returns to C11 with inputs kept", ["en"]],
  [G, "2.5", "2.5", "c11-signed-in-{lang}", "C11 signed in: contact name, phone and the tour's configured participant field"],
  [G, "2.5", "2.5", "c11-error-contact-{lang}", "C11 validation: invalid phone, inputs kept"],
  [G, "2.5", "2.5", "c11-last-seats-taken-{lang}", "C11 capacity recheck: the last seats were just taken; inputs kept, no booking created"],
  [G, "2.5", "2.5", "c11-already-held-{lang}", "C11 when this guest already holds seats for the departure"],
  [G, "2.5", "2.5", "c11-german-only-{lang}", "C11 for the German-only tour: language notice in EN, required merchant question"],

  [G, "2.6", "2.6", "c12-full-hold-{lang}", "C12 hold timer: 15-minute hold with the remaining time and the full amount due"],
  [G, "2.6", "2.6", "c12-failed-{lang}", "C12 payment failed: retry within the original deadline, nothing charged"],
  [G, "2.6", "2.6", "c12-processing-{lang}", "C12 payment processing: no second Pay while the provider is busy"],
  [G, "2.6", "2.6", "c12-expired-after-fail-{lang}", "C12 hold expired after a failed attempt: old payment action gone, book again"],

  [G, "2.7", "2.7", "c12-old-link-expired-{lang}", "Old payment link after expiry: disabled, offers a new booking through C10"],
  [G, "2.7", "2.7", "c16-expired-session-closed-{lang}", "C16 expired booking: seats released, provider session closed, check availability again"],
  [G, "2.7", "2.7", "c10-rebook-{lang}", "Rebooking opens C10 with the old departure and group at today's price", ["en"]],
  [G, "2.7", "2.7", "c16-late-reconciliation-{lang}", "Late provider result after expiry: booking stays expired, money shown once as a reconciliation exception (payment time vs arrival time)"],

  [G, "2.8", "2.8", "c13-full-{lang}", "C13 confirmed, paid in full: reference, departure, meeting point, participants, booking and payment labels, Add to calendar, trip profile"],
  [G, "2.8", "2.8", "c13-deposit-{lang}", "C13 confirmed on the 30% deposit: CHF 156.10 balance and its deadline"],
  [G, "2.8", "2.8", "c13-pay-later-{lang}", "C13 pay later: confirmed without a card or hold timer; unpaid amount and deadline"],

  [G, "2.9", "2.9", "c14-list-{lang}", "C14 bookings alongside gift orders, separate status and payment labels"],
  [G, "2.9", "2.9", "c14-hub-{lang}", "Account hub row for tour bookings", ["en"]],
  [G, "2.9", "2.9", "c14-empty-{lang}", "C14 bookings empty state"],
  [G, "2.9", "2.9", "c16-held-{lang}", "C16 held booking: timeline, contact, meeting details, price and policy snapshots"],
  [G, "2.9", "2.9", "c16-expired-{lang}", "C16 expired booking"],
  [G, "2.9", "2.9", "c16-expired-reconciliation-{lang}", "C16 expired booking with money received after expiry (reconciliation)"],
  [G, "2.9", "2.9", "c16-confirmed-overdue-{lang}", "C16 confirmed, balance overdue: Pay balance"],
  [G, "2.9", "2.9", "c12-balance-{lang}", "C12 balance payment: no timer, no new hold, amount CHF 156.10", ["en"]],
  [G, "2.9", "2.9", "c16-delivered-balance-{lang}", "C16 delivered with debt: balance still owed, review locked"],
  [G, "2.9", "2.9", "c16-delivered-paid-{lang}", "C16 delivered and fully paid, not yet completed"],
  [G, "2.9", "2.9", "c16-completed-{lang}", "C16 completed: review offered"],
  [G, "2.9", "2.9", "c16-no-show-{lang}", "C16 no-show: money shown as it is, no pay action, no review"],

  [M, "2.10", "2.10", "m05-375-{lang}", "M05 Departure schedule: upcoming and ended departures, confirmed seats against capacity, holds separate, balances and attention chips"],
  [M, "2.10", "2.10", "m05-1024-{lang}", "M05 at 1024px: one Seats column (booked / holds / free)"],
  [M, "2.10", "2.10", "m02-tours-375-{lang}", "M02 Today: tour work card with 'Tour balances to collect'"],
  [M, "2.10", "2.10", "m02-tours-1024-{lang}", "M02 tour card at 1024px"],

  [M, "2.11", "2.11", "m06-upcoming-375-{lang}", "M06 guest list before the tour: group counts, contact, payment label; no result actions yet"],
  [M, "2.11", "2.11", "m06-ended-375-{lang}", "M06 after the tour ended: record Service delivered or No-show per booking"],
  [M, "2.11", "2.11", "m06-ended-1024-{lang}", "M06 ended departure at 1024px"],
  [M, "2.11", "2.11", "m06-confirm-delivered-375-{lang}", "Confirmation before recording a result", ["en"]],
  [M, "2.11", "2.11", "m06-after-delivered-375-{lang}", "M06 after recording service delivered"],
  [M, "2.11", "2.11", "m06-after-noshow-375-{lang}", "M06 after recording a no-show (money unchanged)", ["en"]],
  [M, "2.11", "2.15", "m11-m06-cancelled-departure-{lang}", "M06 merchant-cancelled departure: guests not classified as no-show (recaptured in 2.15 with the current cancelled chip)"],
  [M, "2.11", "2.11", "m06-cancelled-1024-{lang}", "M06 merchant-cancelled departure at 1024px", ["en"]],

  [M, "2.12", "2.12", "m07-tom-375-{lang}", "M07 booking detail: guest, departure, participants, referral source, price and policy snapshot, payments, commission, activity"],
  [M, "2.12", "2.12", "m07-tom-1024-{lang}", "M07 at 1024px"],
  [M, "2.12", "2.12", "m08-sheet-375-{lang}", "M08 record external payment from M07 (balance checks)"],
  [M, "2.12", "2.12", "m08-duplicate-375-{lang}", "M08 possible-duplicate warning", ["en"]],
  [M, "2.12", "2.12", "m07-tom-paid-375-{lang}", "M07 after the external payment: balance zero, payment history"],

  [M, "2.13", "2.13", "m07-delivered-debt-375-{lang}", "Delivered with debt: Complete locked with the owed balance; commission estimated only"],
  [M, "2.13", "2.13", "m07-paid-not-delivered-375-{lang}", "Fully paid, not delivered: Complete locked (record delivery first)"],
  [M, "2.13", "2.13", "m07-ready-to-complete-375-{lang}", "Delivered and fully paid: Complete available"],
  [M, "2.13", "2.13", "m07-completed-375-{lang}", "Completed once: commission recorded"],
  [M, "2.13", "2.13", "m07-completed-1024-{lang}", "Completed at 1024px", ["en"]],
  [M, "2.13", "2.13", "p02-before-375-{lang}", "P02 partner report before completion"],
  [M, "2.13", "2.13", "p02-after-375-{lang}", "P02 after completion: the booking's commission recorded once"],
  [M, "2.13", "2.13", "p02-after-1024-{lang}", "P02 at 1024px", ["en"]],
  [M, "2.13", "2.13", "c16-review-open-375-{lang}", "C16 completed booking: the guest's tour review (C18) opens"],
  [M, "2.13", "2.13", "m07-noshow-375-{lang}", "No-show with retained payment: no completion, commission or review; money and debt kept"],
  [M, "2.13", "2.13", "m07-merchant-cancelled-375-{lang}", "Merchant-cancelled tour: seeded cancellation, not a no-show", ["en", "de"]],

  [M, "2.14", "2.14", "m07-cancel-policy-before-375-{lang}", "Overdue cancel policy before the deadline"],
  [M, "2.14", "2.15", "m13-m07-overdue-cancelled-{lang}", "Overdue cancel policy after the deadline: cancelled, seats released once, N11 sent (recaptured in 2.15 with the current cancelled chip)"],
  [M, "2.14", "2.14", "m07-grace-375-{lang}", "Overdue grace policy: overdue shown with the grace period, not cancelled"],
  [M, "2.14", "2.14", "m07-merchant-decides-375-{lang}", "No overdue policy: the merchant decides, nothing automatic"],
  [M, "2.14", "2.14", "m07-cancelled-overdue-1024-{lang}", "Cancelled overdue at 1024px", ["en"]],
  [M, "2.14", "2.14", "mail-guest-375-{lang}", "Mail panel, guest emails (N07–N11, N13, N15, N22 demos; reminder timing labelled as a proposal)", ["en"]],
  [M, "2.14", "2.14", "mail-staff-375-{lang}", "Mail panel, Owner and Manager emails", ["en"]],

  [M, "2.15", "2.15", "g03-c09-map-card-{lang}", "Full flow: C09 map with the stop card"],
  [M, "2.15", "2.15", "g05-c10-{lang}", "Full flow: C10 departure and group"],
  [M, "2.15", "2.15", "g06-c11-signed-out-{lang}", "Full flow: C11 review booking"],
  [M, "2.15", "2.15", "g07-c12-hold-{lang}", "Full flow: C12 with the 15-minute hold"],
  [M, "2.15", "2.15", "g08-c13-deposit-{lang}", "Full flow: C13 confirmed on the deposit"],
  [M, "2.15", "2.15", "g09-c16-deposit-{lang}", "Full flow: C16 deposit paid, balance due", ["en"]],
  [M, "2.15", "2.15", "g10-c16-paid-in-full-{lang}", "Full flow: C16 after the balance payment, paid in full", ["en"]],
  [M, "2.15", "2.15", "g13-c11-last-seats-{lang}", "Last seats taken by a competing guest (simulated): inputs kept", ["en"]],
  [M, "2.15", "2.15", "g14-c12-failed-{lang}", "Failed payment within the hold", ["en"]],
  [M, "2.15", "2.15", "g15-c16-late-reconciliation-{lang}", "Late provider result: reconciliation exception", ["en"]],
  [M, "2.15", "2.15", "g16-c09-german-only-{lang}", "German-only tour with the language notice"],
  [M, "2.15", "2.15", "g19-c14-bookings-{lang}", "C14 bookings after the full flow", ["en"]],
  [M, "2.15", "2.15", "g20-c16-overdue-cancelled-{lang}", "C16 cancelled after the overdue deadline (cancel policy)"],
  [M, "2.15", "2.15", "g21-c18-review-{lang}", "C18 tour review form"],
  [M, "2.15", "2.15", "g17-c03-gift-reviews-{lang}", "Gift regression: C03 with reviews", ["en"]],
  [M, "2.15", "2.15", "g22-edit-profile-default-avatar-{lang}", "Regression: Edit profile with the default avatar", ["en"]],
  [M, "2.15", "2.15", "m01-m02-today-{lang}", "Merchant: M02 Today with tour work", ["en"]],
  [M, "2.15", "2.15", "m02-m05-desktop-{lang}", "Merchant desktop: M05 departure schedule"],
  [M, "2.15", "2.15", "m03-m06-walk13-desktop-{lang}", "Merchant desktop: M06 guest list after the tour", ["en"]],
  [M, "2.15", "2.15", "m05-m07-delivered-debt-desktop-{lang}", "Merchant desktop: M07 delivered with debt", ["en"]],
  [M, "2.15", "2.15", "m09-m07-completed-desktop-{lang}", "Merchant desktop: M07 completed, commission recorded", ["en"]],
  [M, "2.15", "2.15", "m04-m07-no-show-{lang}", "M07 no-show with retained payment", ["en"]],
  [M, "2.15", "2.15", "m10-p02-{lang}", "P02 partner report after the full flow", ["en"]],
  [M, "2.15", "2.15", "m11-m06-cancelled-departure-{lang}", "M06 merchant-cancelled departure", ["en"]],
  [M, "2.15", "2.15", "m12-m07-overdue-grace-{lang}", "M07 overdue, grace policy", ["en"]],
  [M, "2.15", "2.15", "m13-m07-overdue-cancelled-{lang}", "M07 overdue, cancel policy", ["en"]],
  [M, "2.15", "2.15", "m15-m07-cancelled-no-payment-{lang}", "M07 cancelled with no payment", ["en"]],
  [M, "2.15", "2.15", "m14-m04-guest-card-{lang}", "Gift regression: M04 guest card", ["en"]],
  [M, "2.15", "2.15", "c01-c10-over-capacity-{lang}", "Check: C10 above capacity", ["en"]],
  [M, "2.15", "2.15", "c02-c11-invalid-phone-{lang}", "Check: C11 invalid phone, inputs kept", ["de"]],
  [M, "2.15", "2.15", "c03-c18-no-stars-{lang}", "Check: C18 without stars asks for 1 to 5", ["en"]],
  [M, "2.15", "2.15", "c04-c08-empty-{lang}", "Check: C08 empty state", ["de"]],
  [M, "2.15", "2.15", "c05-m05-empty-{lang}", "Check: M05 empty state", ["en"]],
  [M, "2.15", "2.15", "c06-c09-map-loading-{lang}", "Check: C09 map loading while the map service is slow", ["en"]],
  [M, "2.15", "2.15", "c07-c09-map-error-{lang}", "Check: C09 map error, stops still usable", ["de"]],
  [M, "2.15", "2.15", "c08-m08-above-balance-{lang}", "Check: M08 amount above the balance", ["en"]],
  [M, "2.15", "2.15", "c09-gift-c15-paid-{lang}", "Gift regression: C15 paid order", ["en"]],
  [M, "2.15", "2.15", "c10-c16-overdue-before-merchant-check-{lang}", "Check: C16 overdue before the merchant decides", ["en"]],
];

rmSync(resolve(OUT, "img"), { recursive: true, force: true });
mkdirSync(resolve(OUT, "img"), { recursive: true });
const manifests = { guest: [], merchant: [] };
const seen = new Map();
const counters = new Map();
const missing = [];
let skipped = 0;

for (const [kind, item, folder, pattern, caption, langs = ["en", "de"], extra = {}] of PICKS) {
  const n = (counters.get(item) ?? 0) + 1;

  counters.set(item, n);
  for (const lang of langs) {
    const name = pattern.replace("{lang}", lang);
    const src = resolve(SCREENS, folder, `${name}.png`);

    if (!existsSync(src)) {
      missing.push(`${folder}/${name}.png`);
      continue;
    }
    const hash = createHash("md5").update(readFileSync(src)).digest("hex");

    if (seen.has(hash)) {
      skipped++;
      console.log(`skip ${folder}/${name}.png: identical to ${seen.get(hash)}`);
      continue;
    }
    seen.set(hash, `${folder}/${name}.png`);
    const width = /-1024|desktop/.test(name) ? 1024 : 375;
    const base = name.replace(/-(en|de)$/, "").replace(/-(375|1024)$/, "").replace(/-(375|1024)-/, "-");
    const file = `img/${item}-${String(n).padStart(2, "0")}-${base}-${lang}-${width}.png`;

    copyFileSync(src, resolve(OUT, file));
    manifests[kind].push({ item, file, caption, lang, width, ...(extra.issue ? { issue: extra.issue } : {}) });
  }
}

if (missing.length) {
  console.error(`missing source files:\n  ${missing.join("\n  ")}`);
  process.exit(1);
}
writeFileSync(resolve(OUT, "manifest-guest.json"), JSON.stringify(manifests.guest, null, 1) + "\n");
writeFileSync(resolve(OUT, "manifest-merchant.json"), JSON.stringify(manifests.merchant, null, 1) + "\n");
console.log(`2.16-manifest: ${manifests.guest.length} guest + ${manifests.merchant.length} merchant shots, ${skipped} duplicates skipped`);
