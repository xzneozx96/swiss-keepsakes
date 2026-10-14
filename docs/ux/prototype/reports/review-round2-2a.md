# Review round 2, capture 2a: guest screens 1.6, 1.12, 1.8, 1.13

I captured the current state of the four guest items the owner rejected in round 1. I changed no product code.

## 1. What I captured

There are 47 PNGs in `screens/phase1-review/img/`, named `<item>-<nn>-<screen>-<state>-<lang>-<width>.png`, and listed in review order in `screens/phase1-review/manifest-guest.json`. That is 35 in EN and 12 in DE. No entry has an `issue`.

Every session starts from the prototype bar's **Reset demo** and drives the real flow. Prototype controls are used only where the 1.13r report names them: **Add sample orders in every state** and **Expire this order's payment deadline**. Shots are full page where the page scrolls. Shots with an open sheet or dialog show the viewport.

| Item | Shots | States (DE marked) |
|---|---|---|
| 1.6 C05 sign-in (1.6r) | 10 | Sign-in options at 375 (EN, DE), 1024 (EN) and 1440 (EN, DE), reached from cart Continue. Code step. Wrong code (000000) at 375 and at 1024. Locked after 5 wrong codes. Back on C06 after signing in from cart Continue. |
| 1.12 Account hub (1.12s, 1.12t) | 20 | Hub with the default Notionists avatar (DE). Your orders (DE). Tour bookings (DE). Payments with Due now, history and payment methods (DE). Language and trip (DE). Emails and notifications (DE). Edit profile (DE). 3.4 MB oversize error. Crop sheet (dragged and zoomed). Edit profile with the new photo. Remove photo confirm. Signed out (DE). |
| 1.8 C07 request sent (1.8r) | 4 | After sending two orders, with C06 order cards, timeline and open trip profile (DE). Trip profile skipped. Trip profile answered. |
| 1.13 C15 order detail (1.13r) | 13 | Payment due, Overview tab (DE). Payments, Progress and Policy tabs of the same order. Preparing (paid). Handed over with CHF 62.30 balance, Overview and Payments. Completed with Write a review. Completed after posting the review. Declined (seed SK-1015). Cancelled · payment overdue (Expire control). Payment processing (sample SK-1049). |

### Flow behind the states

- **Session A:**
  1. Add the Kapellbrücke knife (Medium, engraving "Anna", Wed 21 Oct) and the Lucerne gift box (Tue 20 Oct), then cart Select all → Continue. This lands on `/sign-in?returnTo=/cart/review`.
  2. Sign in: Email me a code → 000000 → 123456. This lands on C06.
  3. Send. C07 shows SK-1043 (knife) and SK-1044 (box).
  4. Account hub and sub-screens, opened by tapping the hub rows.
  5. Photo flow, then Sign out, then Google sign-in.
  6. The Store Manager accepts both orders. Account › Payments is captured at this point so that Due now has entries.
  7. C15 tabs.
  8. Pay the knife (preparing). Pay the box deposit; the merchant marks it ready and hands it over (balance). Record the payment and complete. Write a review.
- **Session B:** Reset, sign in, add the sample orders, then the declined, overdue and processing states.
- **Session D:** Reset, then from Account: Sign in → code → 5 wrong codes, which gives the locked state.

## 2. Decisions (paste into decisions.tsv)

```
2026-10-14	review	build-review.mjs accepts 1440 as a manifest width (1440 shots render wide like 1024)	1.6 sign-in brief asks for 1024 and 1440; coordinator chose option B	screens/phase1-review/build-review.mjs line 65	PROPOSED
2026-10-14	review	Account › Payments is captured after the seller accepts the new orders, so Due now and history show together	At Reset no order of Anna's has money due; the brief asks for due now plus history	img/1.12-04-account-payments-en-375.png	PROPOSED
```

## 2b. Touched outside my files

- `screens/phase1-review/build-review.mjs`: the coordinator approved option B, so the width check now accepts 1440. Line 65 is `![375, 1024, 1440].includes(e.width)`, the header comment on line 5 changed to match, and the thumbnail `wide` class now applies to widths of 1024 and above (`s.width >= 1024`, line 303).
- `screens/phase1-review/index.html`: I ran `node build-review.mjs` once to validate the manifest. That regenerated `index.html` from both manifests (8 items, 105 screenshots). The coordinator plans to rebuild it anyway.

## 3. Verification

- **Runs:** A en, A de, B en and D en. The final runs had 0 step failures and 0 console or page errors.
  - An earlier A en run logged one console error with only the text `%o`. I reran A en with the URL logged, and it did not occur again. I don't know the cause.
- **Per-shot checks** (from the 1.19a lib):
  - no horizontal overflow
  - no raw i18n keys or `{params}`
  - no English left in DE
  - None was flagged.
- **Manifest:** 47 entries. Every file exists, and every image of these four items in `img/` is listed. `node build-review.mjs manifest-guest.json` passed the schema.
- **Visual check:** I opened every saved image, EN and DE, in contact sheets, and the 1440 DE shot at full size. None is broken.
  - The first run had one content gap: Payments was captured before any order was accepted, so it showed no Due now card. I moved that shot after the merchant accepts both orders and reran.
  - I also increased the crop zoom so the slider visibly moves.
- **Scripts:**
  - `reports/review-round2-2a-capture.mjs <A|B|D> <en|de>`, with `SCRATCH=<dir>`
  - `review-round2-2a-lib.mjs`: the 1.19a lib on port 5222
  - `review-round2-2a-manifest.mjs <dir>`
  - They need `playwright-core` from `~/.npm/_npx/9833c18b2d85bc59/node_modules`, linked next to the scripts.
- **Dev server:** `npx vite --config reports/1.6-vite.nohmr.mjs --port 5222 --strictPort`, now stopped. `ss -ltnp | grep 5222` prints nothing.

## 4. Notes for the reviewer

- **1.12 hub, Payments row:** it shows "Nothing due" at the hub shot, which is correct then, because both new orders were still awaiting confirmation. The Payments sub-screen shot is taken later, after acceptance, and shows the two Due now cards.
- **1.12 Emails and notifications:** the sign-in-code subject is cut with an ellipsis by design (single-line row).
- **1.13 Policy and Payments tabs:** I captured them for the payment-due order only. For the other states, the header and the Overview tab are shown, plus Payments for the handed-over balance.

## 5. Open questions

1. One run logged a console error with only the text `%o`. I could not reproduce it, so the cause is unknown. If it matters, the next capture logs the URL.
2. The merchant capture may still be in progress. The `index.html` I regenerated includes `manifest-merchant.json` as it stood at that moment.
