# Review round 2 (2b): merchant and partner screens

I captured the current state of the merchant items 1.9, 1.11 and 1.15. That is 62 PNGs in `screens/phase1-review/img/` and a manifest for the review page. No product code changed.

**Coordinator redirect (mid-task).** The owner approved 1.17 in round 2, and task 1.11s changed the M04 key facts into 4 standalone StatCards. So I dropped 1.17 from the script and the manifest, deleted my 1.17 PNGs, and retook 1.9, 1.11 and 1.15 against the current code. The shots show the 1.11s cards.

## 1. What I captured

- **Images.** `docs/ux/prototype/screens/phase1-review/img/<item>-<nn>-<screen>-<state>-<lang>-<width>.png`. Only the `1.9-`, `1.11-` and `1.15-` files are mine. The guest files (1.6, 1.8, 1.12, 1.13) in the same folder belong to another worker and I did not touch them.
- **Manifest.** `docs/ux/prototype/screens/phase1-review/manifest-merchant.json`, 62 entries in review order: item, then state number, EN before DE, 375 before 1024. No entry has an `issue`.
- **Script.** `docs/ux/prototype/reports/review-round2-2b-capture.mjs`, log `review-round2-2b-capture.out`. It is based on `1.19b-capture.mjs`.

### How the run works

One headless Chromium session against Vite on 5223 with HMR off (`reports/1.6-vite.nohmr.mjs`).

1. Prototype bar → **Reset demo**, then "Via Hotel am See QR".
2. As the guest Anna: knife (Medium, "Anna", 21 Oct, Altstadt) and gift box (20 Oct, Altstadt). Then C04 **Select all**, C05 email code, C06 **Send**, C07 skip. This creates SK-1043 (knife) and SK-1044 (gift box), so M02 and M04 have them.
3. Role switch, then everything below runs through the real screens.

There are no localStorage writes; the script reads `sk.demo` only to find order refs and statuses. Times are the live demo clock (10:00–10:03).

### Shots per item (each at 375 and 1024 unless noted; ★ = also DE)

| Item | States |
| --- | --- |
| 1.9 M02 Overview | 01 Today cards + All-time earnings + Analytics 7 days, full page ★; 02 Analytics 30 days; 03 This month; 04 All-time earnings widget; 05 chart hover tooltip (Sat 10 Oct, Collected CHF, Orders); 06 table view (one row per day); 07 Today empty state (every open order closed through M04, as in round 1) |
| 1.11 M04 requested | 01 header, key facts, action panel (375 Details tab, 1024 two columns) ★; 02 Payments tab (375); 03 Activity tab (375); 04 change sheet as it opens (current pickup, calendar); 05 change sheet: Bahnhof picked, "Add a note" error; 06 change sheet with note; 07 after the change, Activity log with the note; 08 accept sheet (summary card CHF 26.70, sentence); 09 accepted ("Wait for the first payment"); 10 decline sheet on SK-1031; 11 shared decline confirm (Keep request pressed after the shot); 12 stock short on SK-1033 after SK-1032 took the last print; 13 Accept pressed → "Not accepted" alert |
| 1.15 M04 fulfilment + M08 | 01 ready, CHF 62.30 owed, Complete locked "Not handed over yet"; 02 handed over, Complete locked "CHF 62.30 still owed" ★; 03 M08 sheet ★; 04 handed over and paid ("Close the order"); 05 completed, commission Recorded; 06 knife ready and paid → combined "Handed over and complete"; 07 M08 above balance (CHF 70 on SK-1021, button disabled); 08 M08 duplicate warning (CHF 20 twice on SK-1021) |

DE: one state per screen (M02, M04 decision, M04 fulfilment, M08).

## 2. Findings

- **Chart colours: no blue.** On every M02 shot (and on P02 before 1.17 was dropped), the script read the computed fill, stroke, stop-color and background of every element inside chart sections, including gradient stops. It found no blue-hue colours and none of the old hexes #2a78d6, #1baf7a or #6250d6. The only blue inside those sections is the `--info` status chip ("Confirmed, being prepared", #e6eef8 / #1f5fa8) on an M02 Next pickups row. That is a status chip, not a chart. All charts are red/ink: sparklines, the composed chart, the funnel, the bar lists, both all-time widgets, the P02 chart and the group bars.
- **No issues flagged.** No horizontal overflow, no raw i18n keys or `{param}`, no English in the DE shots, no console or page errors in the final run.
- **M02 crashed during the first run** (23:56). `#/store` showed "Something went wrong". The cause was `features/tours/merchant/today-queue.tsx` (`TourTodayQueue`, mounted in `routes/store/index.tsx`), which calls `tourMerchant.*` keys that were not in `en.ts`/`de.ts`; `t()` threw on the missing key. I asked the coordinator. The answer was to wait and not touch the tours files. I polled for 20 minutes; the keys were still missing at 00:15. The next full run rendered M02 with no error, because the tours code changed in the meantime. The 1.9 shots in the manifest come from that clean run. **9 `tourMerchant.*` keys are still missing from `en.ts`** (`back`, `nextDepartures`, `onHold`, `seatsBooked`, `taskLabel`, `today`, `todayCollect`, `todayEmpty`, `todayIntro`), so M02 may crash again if that code path renders. The tours worker should check this.
- **P02 (1.17, captured before the redirect, then dropped): empty period moved.** Round 1 used Sun 11 Oct. Since the tours work, Sun 11 Oct has a tour booking (SK-T1049), so it is no longer empty. The script now steps back day by day until it finds the first day with no transactions: Sat 10 Oct. My first run also showed a capture bug: the second width clicked Previous twice more (Fri 9 Oct). Each variant now reloads the page first.
- **Tours data now shows on merchant and partner screens**: a "Tours" block on M02 Today, a Tours group and tour bookings on P02. It belongs to the parallel tours work and is not part of these items.

## 3. Not captured

- **M02 Analytics "No orders yet" empty state.** This state needs `data.orders = []`. 1.9s reached it with a storage patch, and no prototype control does it. The brief rules out patching, so I captured only the Today empty state (07).

## 4. Decisions

```
2026-10-14	review-2b	P02 empty period found by stepping back day by day to the first day without transactions (Sat 10 Oct), not a fixed Sun 11 Oct	Tour booking SK-T1049 now falls on Sun 11 Oct	reports/review-round2-2b-capture.out "P02 first empty day"	PROPOSED
2026-10-14	review-2b	M02 Analytics "No orders yet" not captured; Today empty reached through M04	Needs data.orders = [] (storage patch); brief allows prototype controls only	1.9-07-m02-today-empty-*.png	PROPOSED
2026-10-14	review-2b	Element shots (all-time widgets, chart tooltip, table) grow the viewport to the page height first	At 375 the fixed bottom tab bar painted over the element otherwise	1.9-04-m02-alltime-earnings-en-375.png	PROPOSED
```

## 5. Touched outside my files

None. I wrote only to `screens/phase1-review/img/` (my own file names), `manifest-merchant.json` and `reports/review-round2-2b*`. I checked the schema by running `build-review.mjs` on a scratch copy: "8 items, 62 screenshots". I did not rebuild the shared `index.html`, so the guest worker's run keeps ownership of it.

## 6. Verification

- **Capture.** `node review-round2-2b-capture.mjs`, final run: 62 shots, `errors: []`.
- **Images opened.** I opened every PNG: tall pages as 3000–4000px slices, the rest at full size or on contact sheets. I found three capture problems and fixed them before the final run:
  - the bottom tab bar over element shots at 375;
  - the P02 empty-period date drifting between widths;
  - the change sheet opening scrolled to the end, which hid the "current pickup" panel. That panel now has its own shot (1.11-04).
- **Port.** Vite on 5223 is stopped; `ss -ltnp | grep 5223` prints nothing.
