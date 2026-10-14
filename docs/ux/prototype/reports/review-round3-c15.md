# Review round 3: C15 guest order detail capture (item 1.13)

This report covers a capture of C15 as it stands after 1.13r (tabbed redesign), 1.13s (shared shadow cards) and 1.13t (borderless posted-review inset). I changed no product code.

## What I did

- **Script:** `docs/ux/prototype/reports/review-round3-c15-capture.mjs`, run headless at 375px with deviceScaleFactor 2 and full-page shots, against Vite on port 5222. The log is in `review-round3-c15-capture.out`.
- **Setup:**
  1. Prototype bar → **Reset demo**.
  2. Sign in (Continue with Google).
  3. On C15, prototype bar → **Add sample orders in every state** (SK-1043 to SK-1050).
- **Controls used:** besides the setup above, only **Expire this order's payment deadline** (on SK-1044, for the overdue state). These are the controls the 1.13r report names. The posted review comes from the normal guest UI (Write a review → 5 stars → Post review), with no storage writes.
- **Manifest:** `docs/ux/prototype/screens/phase1-review/manifest-guest.json` was overwritten with 13 entries, all `item: "1.13"`, `width: 375`. All 13 files exist.
- I did not run `build-review.mjs`.

## Shots

All shots are in `docs/ux/prototype/screens/phase1-review/img/`.

| # | File | Order | What it shows |
|---|---|---|---|
| 01 | `1.13-r3-01-c15-payment-due-en-375.png` | SK-1044 | Header plus Overview tab. Payment due, with the auto-cancel warning, Pay and Cancel |
| 01 | `1.13-r3-01-c15-payment-due-de-375.png` | SK-1044 | The same state in DE |
| 02 | `1.13-r3-02-c15-tab-payments-en-375.png` | SK-1044 | Payments tab: amounts, "No payments yet." |
| 03 | `1.13-r3-03-c15-tab-progress-en-375.png` | SK-1044 | Progress tab: stepper on a shadow card |
| 04 | `1.13-r3-04-c15-tab-policy-en-375.png` | SK-1044 | Policy tab: policy, reference with Copy, Email and Call |
| 05 | `1.13-r3-05-c15-preparing-en-375.png` | SK-1046 | Being prepared, paid in full |
| 06 | `1.13-r3-06-c15-handed-over-balance-en-375.png` | SK-1048 | Handed over, CHF 62.30 left, Pay the rest |
| 07 | `1.13-r3-07-c15-handed-over-payments-en-375.png` | SK-1048 | Payments tab with the deposit received |
| 08 | `1.13-r3-08-c15-completed-en-375.png` | SK-1012 | Completed, Write a review |
| 09 | `1.13-r3-09-c15-completed-reviewed-en-375.png` | SK-1012 | Completed with the posted review as a borderless inset (1.13t) |
| 10 | `1.13-r3-10-c15-declined-en-375.png` | SK-1015 | Declined: "Nothing was charged" plus the seller's reason |
| 11 | `1.13-r3-11-c15-cancelled-overdue-en-375.png` | SK-1044 | Cancelled · payment overdue, Request again |
| 12 | `1.13-r3-12-c15-payment-processing-en-375.png` | SK-1049 | Payment processing: "Please don't pay again", no Pay link |

## Verification

- **Script checks:** 34 PASS, 0 FAIL.
  - Each shot asserts its state text, for example "Pay to keep this order", "The payment deadline passed", "Request again" and "Please don't pay again".
  - No shot overflows horizontally.
  - DE shows no raw i18n keys.
  - No Pay link appears while the payment is processing.
- **Console:** the run logged no page errors and no console errors.
- **I opened every image.** The first run had capture defects, not product defects:
  - The "Review posted. Thank you." toast was still showing in 09 and 10. In 10 it covered the bottom of the Gifts card.
  - The prototype-bar "Guest" pill kept a focus ring in 01, 11 and 12 after the bar closed.
  - A hover state made the Payments tab in 12 look greyed out.

  The script now closes toasts, blurs focus and moves the mouse away before each shot. I re-ran it and opened all 13 final images in full: all are clean. **No broken images in the final set.**
- **Dev server:** Vite on 5222 is stopped. `ss -ltnp | grep 5222` prints nothing.

## Things the reviewer may notice (product, not capture)

1. **DE tab row (01 DE):** "Bedingungen" ends very close to the right edge at 375px. It isn't clipped, but the margin is tight.
2. **Date format:** the Overview "Date" row and the payment chip use `21.10.2026` and `14.10.2026, 07:11`, while the ticket's date tile and the review use the short style ("Fri 9 Oct"). decisions.tsv prefers short dates such as "Wed 14 Oct".
3. **Totals on closed orders:** on the declined (10) and overdue-cancelled (11) orders, the Gifts card shows Total and Paid with no "Still to pay" row. This looks intended.
4. **Handed over (06):** the "Handed over" chip uses the hourglass (in-progress) icon. The headline uses a clock icon.
5. **Overdue deadline (11):** the overdue text names the missed deadline as "13.10.2026, 10:00", while 01 showed the deadline as "14.10.2026, 07:11". This comes from the prototype control Expire, which moves the deadline into the past. It is not a product bug.
