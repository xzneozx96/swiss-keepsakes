# Sprint 8 manual test cases

- **Sprint:** 8 (release 1 polish and first sales groundwork)
- **Stories covered:** E6.3 stock, E6.5 opening stock, E6.6 pickup points, E8.7 analytics events, E4.3 stories (the story editor), the Lark sync and plan docs.
- **What to test:** each PR's branch, or the integration branch once the PRs are merged in the order below.
- **Written:** 2026-11-03. Updated 2026-11-04 (pickup Google Maps link, UI and fix cases). Format: `docs/development-rules/shared/manual-test-cases.md`.

## Order of the PRs

The cases are grouped by PR, in this merge order. Test and merge in this order. The database migrations 0021 to 0025 must reach the dev database in number order.

| PR | Content | Cases |
|---|---|---|
| 1 | Lark sync and plan docs (T-LARK, T-DOCS) | S8-LARK-01 to 03 |
| 2 | E6.3 stock: inventory page, stock in the keepsake editor (migration 0021) | S8-INV-01 to 09 |
| 3 | E6.5 opening stock for the five Victorinox knives | S8-STOCK-SEED-01 to 04 |
| 4 | E6.6 pickup points (migrations 0022 and 0025) | S8-PICKUP-01 to 18 |
| 5 | E8.7 analytics events and the map card tip fix (migration 0023) | S8-EVENTS-01 to 07, S8-MAP-01 |
| 6 | E4.3 story editor | S8-STORY-01 to 28 |
| 7 | UI consistency and story fixes (list headers, story Write layout, story header notice, members table) | S8-UI-01, S8-UI-02, S8-UI-03, S8-STORY-FIX-01 |

S8-FIX (the one-variant fix) is already on main (PR #95, commit 8b936dbc). The E6.3 stock cases in PR 2 depend on it, so run S8-FIX first on any build.

## Before you start

1. **Run the app.** From `api/` run `pnpm dev`. From `front-end/` run `pnpm dev`. Use the dev Neon database. Do not print or share the database URL.
2. **Accounts.** One browser profile per role: Owner (a merchant who owns the seeded store), and a signed-out guest. Use the demo owner account you normally test with.
3. **Language.** The cases use English. Switch language with the language switch in the header only where a case says so.
4. **Widths.** Desktop is 1280 px wide, phone is 375 px wide. Use the browser's device toolbar.
5. **Seed.** The five Victorinox knives and the Chapel Bridge place come from the curated seed. Do not delete them.
6. **SQL.** Cases that read the database use SELECT only. Ask the developer for a read-only connection. Do not write to the database by hand.
7. **Terminal cases** (S8-STOCK-SEED, S8-LARK) run in a terminal in the repository, not in the browser.

### Extra setup for PR 5 (analytics, S8-EVENTS and S8-MAP)

Events go to PostHog EU. Nothing is sent unless you switch it on.

1. In `front-end/.env.local` set these three lines. Use the project key from the PostHog project settings. Never commit the file and never paste the key into a case, a chat or a PR.

   ```
   VITE_SITE_ENV=development
   VITE_POSTHOG_ENABLED=true
   VITE_POSTHOG_KEY=<project key>
   ```

2. In PostHog, open the project's settings and turn on "Discard client IP data".
3. Restart the front-end dev server after every change to `.env.local`.
4. To see events, open the project in PostHog (EU) and go to Activity, then the live events view. Events appear within a few seconds. Note the newest event time before a case that expects no new event.
5. The sender needs all three lines. A missing key, `VITE_POSTHOG_ENABLED` other than `true`, or a `VITE_SITE_ENV` other than `development` or `staging` sends nothing. A missing `VITE_SITE_ENV` counts as production.

## Summary

| ID | Title | Story / AC | Priority | Result | Notes |
|---|---|---|---|---|---|
| S8-LARK-01 | The dry run lists the moves and writes nothing | T-LARK / AC-3 | P2 | ☐ Pass ☐ Fail ☐ Blocked | |
| S8-LARK-02 | The live sync puts every task in its sprint's section | T-LARK / AC-4 | P2 | ☐ Pass ☐ Fail ☐ Blocked | |
| S8-LARK-03 | The delivery plan matches the sprint 8 decisions | T-DOCS / AC-1 to AC-4 | P3 | ☐ Pass ☐ Fail ☐ Blocked | |
| S8-FIX-01 | A keepsake with no options shows an empty Price block, and a first price creates the one variant | One-variant fix (decision 27) | P1 | ☐ Pass ☐ Fail ☐ Blocked | |
| S8-FIX-02 | Deleting every variant, then every option, keeps the Price block | One-variant fix | P2 | ☐ Pass ☐ Fail ☐ Blocked | |
| S8-FIX-03 | A code or status chosen before the price is kept | One-variant fix | P3 | ☐ Pass ☐ Fail ☐ Blocked | |
| S8-FIX-04 | A new keepsake does the same before it is saved | One-variant fix | P2 | ☐ Pass ☐ Fail ☐ Blocked | |
| S8-FIX-05 | With only archived variants the Price block stays away | One-variant fix (open question) | P3 | ☐ Pass ☐ Fail ☐ Blocked | |
| S8-INV-01 | Inventory tabs and search filter variants | E6.3 / AC53 | P1 | ☐ Pass ☐ Fail ☐ Blocked | |
| S8-INV-02 | A bad quantity is refused at the box | E6.3 / AC05 | P2 | ☐ Pass ☐ Fail ☐ Blocked | |
| S8-INV-03 | Adjust stock from the item page | E6.3 / AC53 | P2 | ☐ Pass ☐ Fail ☐ Blocked | |
| S8-INV-04 | The item page shows an empty Reserved card | E6.3 / AC05 | P3 | ☐ Pass ☐ Fail ☐ Blocked | |
| S8-INV-05 | Quantity in the Price block of a keepsake with no options | E6.3 / AC53 | P1 | ☐ Pass ☐ Fail ☐ Blocked | |
| S8-INV-06 | A quantity typed before options fills new rows, and stock is not shared | E6.3 / AC53 | P1 | ☐ Pass ☐ Fail ☐ Blocked | |
| S8-INV-07 | A SKU code in use refuses the whole save | E6.3 / AC53 | P3 | ☐ Pass ☐ Fail ☐ Blocked | |
| S8-INV-08 | A SKU code in capitals still finds its stock | E6.3 / AC53 | P2 | ☐ Pass ☐ Fail ☐ Blocked | |
| S8-INV-09 | An archived variant keeps its stock and cannot be restored | E6.3 / AC53 | P2 | ☐ Pass ☐ Fail ☐ Blocked | |
| S8-STOCK-SEED-01 | The seed dry run lists the stock it would add and skip | E6.5 / AC53 | P2 | ☐ Pass ☐ Fail ☐ Blocked | |
| S8-STOCK-SEED-02 | Seeded knives show their opening stock | E6.5 / AC53 | P2 | ☐ Pass ☐ Fail ☐ Blocked | |
| S8-STOCK-SEED-03 | A second seed run changes nothing | E6.5 / AC53 | P3 | ☐ Pass ☐ Fail ☐ Blocked | |
| S8-STOCK-SEED-04 | A stock figure set by a person is not overwritten | E6.5 / AC53 (gate G-S8-D2) | P2 | ☐ Pass ☐ Fail ☐ Blocked | |
| S8-PICKUP-01 | Save two pickup points and keep them after reload | E6.6 / AC26 | P1 | ☐ Pass ☐ Fail ☐ Blocked | |
| S8-PICKUP-02 | Two spans on one day show in the row | E6.6 / AC26 | P2 | ☐ Pass ☐ Fail ☐ Blocked | |
| S8-PICKUP-03 | A span past midnight is kept, and opens equal to closes is refused | E6.6 / AC26 | P3 | ☐ Pass ☐ Fail ☐ Blocked | |
| S8-PICKUP-04 | One language is enough for a pickup point | E6.6 / AC26 | P2 | ☐ Pass ☐ Fail ☐ Blocked | |
| S8-PICKUP-05 | Archive and restore a pickup point | E6.6 / AC26 | P3 | ☐ Pass ☐ Fail ☐ Blocked | |
| S8-PICKUP-06 | The limit of 100 counts active points only | E6.6 / AC26 (gate G-S8-PICKUP-LIMIT) | P2 | ☐ Pass ☐ Fail ☐ Blocked | |
| S8-PICKUP-07 | A restored point goes to the end of the list | E6.6 / AC26 | P2 | ☐ Pass ☐ Fail ☐ Blocked | |
| S8-PICKUP-08 | Two spans with the same day and opening time are refused | E6.6 / AC26 | P2 | ☐ Pass ☐ Fail ☐ Blocked | |
| S8-PICKUP-09 | Pickup points is a page of its own | Owner fix 2026-11-03 / design 2026-10-29 | P1 | ☐ Pass ☐ Fail ☐ Blocked | |
| S8-PICKUP-10 | A Google Maps link sets the pin and fills the address | E6.6 / AC26 (gate G-S8-PICKUP-MAPS) | P1 | ☐ Pass ☐ Fail ☐ Blocked | |
| S8-PICKUP-11 | A short link is followed to its position | E6.6 / AC26 (gate G-S8-PICKUP-MAPS) | P2 | ☐ Pass ☐ Fail ☐ Blocked | |
| S8-PICKUP-12 | A missing or unreadable link is refused at the field | E6.6 / AC26 (gate G-S8-PICKUP-MAPS) | P2 | ☐ Pass ☐ Fail ☐ Blocked | |
| S8-PICKUP-13 | The merchant's own address is never overwritten, and a new link moves the pin | E6.6 / AC26 (gate G-S8-PICKUP-MAPS) | P2 | ☐ Pass ☐ Fail ☐ Blocked | |
| S8-PICKUP-14 | The Location block in German | E6.6 / AC26 (gate G-S8-PICKUP-MAPS) | P3 | ☐ Pass ☐ Fail ☐ Blocked | |
| S8-PICKUP-15 | Delete an active pickup point | E6.6 / AC26 (gate G-S8-PICKUP-DELETE) | P1 | ☐ Pass ☐ Fail ☐ Blocked | |
| S8-PICKUP-16 | Delete an archived pickup point | E6.6 / AC26 (gate G-S8-PICKUP-DELETE) | P2 | ☐ Pass ☐ Fail ☐ Blocked | |
| S8-PICKUP-17 | Cancel the delete, and the dialog in German | E6.6 / AC26 (gate G-S8-PICKUP-DELETE) | P3 | ☐ Pass ☐ Fail ☐ Blocked | |
| S8-PICKUP-18 | The pickup points table and the phone cards | Owner design 2026-11-04 (S8-PICKUP-TABLE) | P1 | ☐ Pass ☐ Fail ☐ Blocked | |
| S8-EVENTS-01 | Events arrive in PostHog with closed values only | E8.7 / AC37, AC60 | P1 | ☐ Pass ☐ Fail ☐ Blocked | |
| S8-EVENTS-02 | A merchant page and a switched-off build send nothing | E8.7 / AC37 | P2 | ☐ Pass ☐ Fail ☐ Blocked | |
| S8-EVENTS-03 | A guest's deep-linked pin is recorded once | E8.7 / AC60 | P2 | ☐ Pass ☐ Fail ☐ Blocked | |
| S8-EVENTS-04 | A signed-in merchant's deep-linked pin records nothing | E8.7 / AC37 | P2 | ☐ Pass ☐ Fail ☐ Blocked | |
| S8-EVENTS-05 | Signing in after the page loaded stops the tab reporting | E8.7 / AC37 | P1 | ☐ Pass ☐ Fail ☐ Blocked | |
| S8-EVENTS-06 | A production or unset site environment sends nothing | E8.7 / AC37 | P3 | ☐ Pass ☐ Fail ☐ Blocked | |
| S8-EVENTS-07 | A signed-in Super Admin on the guest site sends nothing | E8.7 / AC37 | P2 | ☐ Pass ☐ Fail ☐ Blocked | |
| S8-MAP-01 | The map place card shows no tip | E8.7 / owner decision 2026-11-03 | P2 | ☐ Pass ☐ Fail ☐ Blocked | |
| S8-STORY-01 | The stories list shows each language version's state | E4.3 / AC30 | P2 | ☐ Pass ☐ Fail ☐ Blocked | |
| S8-STORY-02 | New story opens the editor | E4.3 / AC30 | P1 | ☐ Pass ☐ Fail ☐ Blocked | |
| S8-STORY-03 | A draft saves itself while typing | E4.3 / AC45 | P1 | ☐ Pass ☐ Fail ☐ Blocked | |
| S8-STORY-04 | Leaving with unsaved edits asks first | E4.3 / AC45 | P2 | ☐ Pass ☐ Fail ☐ Blocked | |
| S8-STORY-05 | A save from a stale tab is refused | E4.3 / AC45 | P3 | ☐ Pass ☐ Fail ☐ Blocked | |
| S8-STORY-06 | Starting the German version carries the cover | E4.3 / AC30 | P3 | ☐ Pass ☐ Fail ☐ Blocked | |
| S8-STORY-07 | Formatting survives a save and reload | E4.3 / AC45 | P1 | ☐ Pass ☐ Fail ☐ Blocked | |
| S8-STORY-08 | Pasted text keeps only the allowed formatting | E4.3 / AC45 | P3 | ☐ Pass ☐ Fail ☐ Blocked | |
| S8-STORY-09 | Photo, video and recording between paragraphs | E4.3 / AC45 | P2 | ☐ Pass ☐ Fail ☐ Blocked | |
| S8-STORY-10 | Link a word to a pin | E4.3 / AC45 | P2 | ☐ Pass ☐ Fail ☐ Blocked | |
| S8-STORY-11 | A new story is blocked until four things are set | E4.3 / AC30 | P1 | ☐ Pass ☐ Fail ☐ Blocked | |
| S8-STORY-12 | Publish in one language only | E4.3 / AC30 | P1 | ☐ Pass ☐ Fail ☐ Blocked | |
| S8-STORY-13 | Publish changes and Unpublish | E4.3 / AC45 | P2 | ☐ Pass ☐ Fail ☐ Blocked | |
| S8-STORY-14 | Blog category choice rules | E4.3 / AC87 | P2 | ☐ Pass ☐ Fail ☐ Blocked | |
| S8-STORY-15 | An editorial review needs a place and a date | E4.3 / AC30 | P3 | ☐ Pass ☐ Fail ☐ Blocked | |
| S8-STORY-16 | Keepsakes stop at six and reorder by keyboard | E4.3 / AC33 | P2 | ☐ Pass ☐ Fail ☐ Blocked | |
| S8-STORY-17 | Related stories stop at three and are shared by both languages | E4.3 / AC33 | P3 | ☐ Pass ☐ Fail ☐ Blocked | |
| S8-STORY-18 | The preview shows the draft as guests will see it | E4.3 / AC45 | P2 | ☐ Pass ☐ Fail ☐ Blocked | |
| S8-STORY-19 | Delete a draft story from the list | E4.3 / AC30 | P1 | ☐ Pass ☐ Fail ☐ Blocked | |
| S8-STORY-20 | Delete a published story that pins and stories link to | E4.3 / AC30 | P1 | ☐ Pass ☐ Fail ☐ Blocked | |
| S8-STORY-21 | A failed delete keeps the dialog open | E4.3 / AC30 | P3 | ☐ Pass ☐ Fail ☐ Blocked | |
| S8-STORY-22 | Delete in German, and a second tab | E4.3 / AC30 | P3 | ☐ Pass ☐ Fail ☐ Blocked | |
| S8-STORY-23 | A review at 50 places refuses a 51st place | E4.3 / AC30 | P2 | ☐ Pass ☐ Fail ☐ Blocked | |
| S8-STORY-24 | The reviewed place cannot leave Places | E4.3 / AC30 | P2 | ☐ Pass ☐ Fail ☐ Blocked | |
| S8-STORY-25 | Leaving with a review that has no place asks first | E4.3 / AC30 | P3 | ☐ Pass ☐ Fail ☐ Blocked | |
| S8-STORY-26 | The header shows a failed Details save | E4.3 / AC45 | P3 | ☐ Pass ☐ Fail ☐ Blocked | |
| S8-STORY-27 | Deleting a story leaves no stale pin or story behind | E4.3 / AC30 | P1 | ☐ Pass ☐ Fail ☐ Blocked | |
| S8-STORY-28 | The cover picker waits for a new photo to finish processing | E4.3 / AC30 | P3 | ☐ Pass ☐ Fail ☐ Blocked | |
| S8-UI-01 | Merchant list screens share one header and toolbar | UI consistency, owner feedback 2026-11-03 | P1 | ☐ Pass ☐ Fail ☐ Blocked | |
| S8-UI-02 | Story Write screen: two columns, Short summary field, growing text boxes | E4.3 / AC30 (owner feedback 2026-11-03) | P2 | ☐ Pass ☐ Fail ☐ Blocked | |
| S8-UI-03 | Settings, Members is one table with an Invite sheet | E2.4 / AC02 (owner feedback 2026-11-04) | P1 | ☐ Pass ☐ Fail ☐ Blocked | |
| S8-UI-04 | Every merchant editor has the same header, and no floating save bar | UI consistency, owner 04.11.2026 option A | P1 | ☐ Pass ☐ Fail ☐ Blocked | |
| S8-UI-05 | The editor header stays under the store notice while the page scrolls | Owner 04.11.2026 option A (replaces the note under S8-STORY-FIX-01) | P1 | ☐ Pass ☐ Fail ☐ Blocked | |
| S8-UI-06 | On a phone the editor header's buttons are the laptop size, and a single Delete is an icon | Owner 04.11.2026 option A | P2 | ☐ Pass ☐ Fail ☐ Blocked | |
| S8-STORY-FIX-01 | Story editor header does not cover the store notice | E4.3 / owner fix 2026-11-03 | P1 | ☐ Pass ☐ Fail ☐ Blocked | |
| S8-SEED-STORY-01 | The seeded stories and reviews are in the Stories list | Seed stories / standing order 19 | P1 | ☐ Pass ☐ Fail ☐ Blocked | |
| S8-SEED-STORY-02 | A guest reads a story in English and in German, with photos | Seed stories / standing order 19 | P1 | ☐ Pass ☐ Fail ☐ Blocked | |
| S8-SEED-STORY-03 | Place pages show the main story | Seed stories / standing order 19 | P1 | ☐ Pass ☐ Fail ☐ Blocked | |
| S8-SEED-STORY-04 | More to discover | Seed stories / standing order 19 | P3 | ☐ Pass ☐ Fail ☐ Blocked | |
| S8-SEED-STORY-05 | The Manor review stays a draft until it has a cover | Seed stories / standing order 19 | P2 | ☐ Pass ☐ Fail ☐ Blocked | |
| S8-SEED-STORY-06 | The stories step changes nothing on a second run | Seed stories / standing order 19 | P2 | ☐ Pass ☐ Fail ☐ Blocked | |
| S8-SEED-STORY-07 | Facts read right (editorial check) | Seed stories / standing order 19 | P3 | ☐ Pass ☐ Fail ☐ Blocked | |

Counts: 81 cases. P1: 22, P2: 37, P3: 22.

## PR 1: Lark and plan docs

Terminal cases. `lark-cli` must be signed in.

### S8-LARK-01 The dry run lists the moves and writes nothing
- **Story / AC:** T-LARK / AC-3
- **Priority:** P2
- **Role and device:** Owner, terminal (no browser)
- **Preconditions:** `lark-cli` is signed in; some stories sit in a Lark section that differs from their sprint.

| # | Step | Expected result |
|---|---|---|
| 1 | Run `node docs/development-plan/sync-lark.mjs --dry-run`. | One line per drifted task, such as "E6.3: Sprint 7 to Sprint 8". The last line says "moves: {n}". When this file was written n was 52. |
| 2 | Open the Lark board. | Nothing has moved. |
| 3 | Run `git status` in the repository. | `lark.json` and `status.json` are unchanged. |

- **Postconditions:** none.
- **Result:** ☐ Pass ☐ Fail ☐ Blocked. Actual result, if failed:

### S8-LARK-02 The live sync puts every task in its sprint's section
- **Story / AC:** T-LARK / AC-4
- **Priority:** P2
- **Role and device:** Owner, terminal and the Lark board
- **Preconditions:** S8-LARK-01 passed.

| # | Step | Expected result |
|---|---|---|
| 1 | Run `node docs/development-plan/sync-lark.mjs` (live). | The output ends with "moves: {n}" and shows no error. |
| 2 | Open the Lark board and look at Sprint 8's section. | E4.3, E6.3, E6.5, E6.6 and E8.7 are in it. |
| 3 | Look at Sprint 7's section. | E4.7 is in it, not in Sprint 8. |
| 4 | Run the sync again. | It says "moves: 0" and makes no call. |

- **Postconditions:** the Lark board matches the plan.
- **Result:** ☐ Pass ☐ Fail ☐ Blocked. Actual result, if failed:

### S8-LARK-03 The delivery plan matches the sprint 8 decisions
- **Story / AC:** T-DOCS / AC-1 to AC-4
- **Priority:** P3
- **Role and device:** Owner, text editor
- **Preconditions:** none.

| # | Step | Expected result |
|---|---|---|
| 1 | Open `docs/development-plan/delivery-plan.md` and find the E6.5 row. | It describes opening stock for the five knives only. |
| 2 | Find the E6.3 and E8.7 rows. | E6.3 names `0021_inventory` and E8.7 names `0023_analytics`; a note "Sprint 8 migration numbers (03.11.2026)" lists the numbers. |
| 3 | Find the list of stories for sprint 7 and sprint 8 in section 5.2. | E4.7 is in sprint 7 and marked built (PR #94), not in sprint 8. |
| 4 | Search the file for "Blocked by O26". | No match. |

- **Postconditions:** none.
- **Result:** ☐ Pass ☐ Fail ☐ Blocked. Actual result, if failed:

## Already on main: the one-variant fix (S8-FIX)

Decision 27 of `docs/decisions/2026-11-02-keepsake-editor-steps.md`: a keepsake with no options always has its Price block.

### S8-FIX-01 A keepsake with no options shows an empty Price block, and a first price creates the one variant
- **Story / AC:** One-variant fix (decision 27)
- **Priority:** P1 (must pass for sign-off)
- **Role and device:** Owner, desktop 1280 px (repeat at phone 375 px)
- **Preconditions:** a saved keepsake with no options and no variant.

| # | Step | Expected result |
|---|---|---|
| 1 | Open the keepsake and step to Options and variants. | The Price block shows with an empty price and the status For sale. |
| 2 | Type 24.00 in Price and leave the box. | No error shows. |
| 3 | Reload the page. | The Price block shows 24.00 and For sale. |
| 4 | Open Inventory. | The keepsake has one row, with no option values. |

- **Postconditions:** the keepsake has one variant at 24.00.
- **Result:** ☐ Pass ☐ Fail ☐ Blocked. Actual result, if failed:

### S8-FIX-02 Deleting every variant, then every option, keeps the Price block
- **Story / AC:** One-variant fix (the "Explorer" case that started it)
- **Priority:** P2
- **Role and device:** Owner, desktop 1280 px
- **Preconditions:** a saved keepsake with one option and at least two variants.

| # | Step | Expected result |
|---|---|---|
| 1 | Delete every variant of the keepsake. | The variants list is empty. |
| 2 | Delete every option. | The Options block shows no option. |
| 3 | Read the step. | The Price block shows with empty fields. |

- **Postconditions:** the keepsake has no variant (S8-FIX-03 can reuse it).
- **Result:** ☐ Pass ☐ Fail ☐ Blocked. Actual result, if failed:

### S8-FIX-03 A code or status chosen before the price is kept
- **Story / AC:** One-variant fix
- **Priority:** P3
- **Role and device:** Owner, desktop 1280 px
- **Preconditions:** a keepsake with no variant and no options; the SKU switch is on.

| # | Step | Expected result |
|---|---|---|
| 1 | Type the code "SW-KEEP-1" in SKU code and leave the box. | The code stays in the box. Nothing is created yet. |
| 2 | Choose the status Draft. | The status shows Draft. |
| 3 | Type 15.00 in Price and leave the box. | No error shows. |
| 4 | Reload. | The card shows 15.00, the code "SW-KEEP-1" and the status Draft. |

- **Postconditions:** the keepsake has one draft variant.
- **Result:** ☐ Pass ☐ Fail ☐ Blocked. Actual result, if failed:

### S8-FIX-04 A new keepsake does the same before it is saved
- **Story / AC:** One-variant fix
- **Priority:** P2
- **Role and device:** Owner, desktop 1280 px
- **Preconditions:** none.

| # | Step | Expected result |
|---|---|---|
| 1 | Start a new keepsake and fill the earlier steps, then step to Options and variants. | The Price block shows with an empty price. |
| 2 | Press Next without a price. | The price field shows the invalid-price message. |
| 3 | Type 9.50 in Price and press Next. | The step moves on without an error. |
| 4 | Finish and save the keepsake, then open it. | The Price block shows 9.50. |

- **Postconditions:** a new keepsake with one variant.
- **Result:** ☐ Pass ☐ Fail ☐ Blocked. Actual result, if failed:

### S8-FIX-05 With only archived variants the Price block stays away
- **Story / AC:** One-variant fix (decision 27, open question for the owner)
- **Priority:** P3
- **Role and device:** Owner, desktop 1280 px
- **Preconditions:** a keepsake with no options whose only variant is archived (for example it was sold out and archived).

| # | Step | Expected result |
|---|---|---|
| 1 | Open the keepsake and step to Options and variants. | The Price block is not shown. |

- **Postconditions:** none. Tell the developer whether this is the behaviour you want; the rule is still open.
- **Result:** ☐ Pass ☐ Fail ☐ Blocked. Actual result, if failed:

## PR 2: E6.3 stock

### S8-INV-01 Inventory tabs and search filter variants
- **Story / AC:** E6.3 / AC53
- **Priority:** P1
- **Role and device:** Owner, desktop 1280 px (repeat at phone 375 px)
- **Preconditions:** at least 3 live variants, one at stock 0.

| # | Step | Expected result |
|---|---|---|
| 1 | Open Products, then Inventory. | The page title is "Inventory". The tabs All, In stock and Sold out show counts. Archived variants are not listed. |
| 2 | Open the Sold out tab. | Only variants with 0 available show, with "Sold out" in red. |
| 3 | Type part of a SKU code in lower case in the search field. | Only matching rows show. With no match the page says "No variant matches “{query}”." |

- **Postconditions:** none.
- **Result:** ☐ Pass ☐ Fail ☐ Blocked. Actual result, if failed:

### S8-INV-02 A bad quantity is refused at the box
- **Story / AC:** E6.3 / AC05
- **Priority:** P2
- **Role and device:** Owner, desktop 1280 px
- **Preconditions:** a variant in the list.

| # | Step | Expected result |
|---|---|---|
| 1 | Type abc in a variant's In stock box and leave it. | The box shows "Enter a whole number, 0 or more." and the figure is not saved. |
| 2 | Type -3 and press Enter. | The same message shows. After reload the row shows the old figure. |
| 3 | Type 7 and press Enter. | 7 is saved. After reload the row shows 7 in stock. |

- **Postconditions:** the variant has 7 in stock.
- **Result:** ☐ Pass ☐ Fail ☐ Blocked. Actual result, if failed:

### S8-INV-03 Adjust stock from the item page
- **Story / AC:** E6.3 / AC53
- **Priority:** P2
- **Role and device:** Owner, desktop 1280 px
- **Preconditions:** a variant with stock.

| # | Step | Expected result |
|---|---|---|
| 1 | Open a variant's row, then the menu Adjust stock. | A sheet titled "Adjust stock · {code}" opens with Save and Cancel. |
| 2 | Step the quantity to 0 and read the sheet. | It says "0 would be available. At 0 guests see it sold out; the other variants stay for sale." |
| 3 | Press Save. | The item page shows In stock 0 and Available "0, sold out" in red. |

- **Postconditions:** the variant is sold out.
- **Result:** ☐ Pass ☐ Fail ☐ Blocked. Actual result, if failed:

### S8-INV-04 The item page shows an empty Reserved card
- **Story / AC:** E6.3 / AC05
- **Priority:** P3
- **Role and device:** Owner, desktop 1280 px
- **Preconditions:** a variant with no orders.

| # | Step | Expected result |
|---|---|---|
| 1 | Open the item page of the variant. | The Reserved by orders card says "Nothing is reserved. Units are reserved when an order is accepted, and released when it is declined or cancelled." It shows no Total row. |

- **Postconditions:** none.
- **Result:** ☐ Pass ☐ Fail ☐ Blocked. Actual result, if failed:

### S8-INV-05 Quantity in the Price block of a keepsake with no options
- **Story / AC:** E6.3 / AC53
- **Priority:** P1
- **Role and device:** Owner, desktop 1280 px
- **Preconditions:** a keepsake with no options (S8-FIX-01 has run).

| # | Step | Expected result |
|---|---|---|
| 1 | Open the keepsake and step to Options and variants. | The Price block shows a Quantity field. |
| 2 | Type 12 and leave the field. | The editor shows no error. |
| 3 | Open Inventory. | The variant shows 12 in stock. |

- **Postconditions:** the variant has 12 in stock.
- **Result:** ☐ Pass ☐ Fail ☐ Blocked. Actual result, if failed:

### S8-INV-06 A quantity typed before options fills new rows, and stock is not shared
- **Story / AC:** E6.3 / AC53
- **Priority:** P1
- **Role and device:** Owner, desktop 1280 px
- **Preconditions:** a keepsake with no options.

| # | Step | Expected result |
|---|---|---|
| 1 | Type 6 in Quantity. | The field shows 6. |
| 2 | Add the option Size with the values Small and Large and create the variants. | Both new rows show 6 in their quantity box. |
| 3 | Set Small to 0 and save. | Small shows "Sold out". Large still shows 6. |

- **Postconditions:** Small is at 0, Large at 6.
- **Result:** ☐ Pass ☐ Fail ☐ Blocked. Actual result, if failed:

### S8-INV-07 A SKU code in use refuses the whole save
- **Story / AC:** E6.3 / AC53
- **Priority:** P3
- **Role and device:** Owner, desktop 1280 px
- **Preconditions:** one keepsake already has the SKU code "SKU-A". A second keepsake has no options and no variant.

| # | Step | Expected result |
|---|---|---|
| 1 | In the second keepsake, enter the code SKU-A and a quantity of 4, then a price. | The code field shows the code-in-use error. No variant is created. |
| 2 | Open Inventory. | No stock row was added for the second keepsake. |

- **Postconditions:** none.
- **Result:** ☐ Pass ☐ Fail ☐ Blocked. Actual result, if failed:

### S8-INV-08 A SKU code in capitals still finds its stock
- **Story / AC:** E6.3 / AC53 (fix: ids and codes are compared in lower case)
- **Priority:** P2
- **Role and device:** Owner, desktop 1280 px
- **Preconditions:** a variant with a SKU code, for example "sw-card-red-s", and stock 5.

| # | Step | Expected result |
|---|---|---|
| 1 | Open Inventory and type the code in capitals ("SW-CARD-RED-S") in the search field. | The row of that variant shows with 5 in stock. |
| 2 | Open the variant's item page, then change the variant id in the address bar to capitals and press Enter. | The same item page opens with 5 in stock, not a "not found" page. |
| 3 | Adjust the stock to 8 and press Save. | The item page shows In stock 8. |

- **Postconditions:** the variant has 8 in stock.
- **Result:** ☐ Pass ☐ Fail ☐ Blocked. Actual result, if failed:

### S8-INV-09 An archived variant keeps its stock and cannot be restored
- **Story / AC:** E6.3 / AC53 (fix: archived variants keep their stock; owner rule that an archived variant is not put back on sale)
- **Priority:** P2
- **Role and device:** Owner, desktop 1280 px
- **Preconditions:** a keepsake with options and a variant at stock 6. A read-only database connection for step 3.

| # | Step | Expected result |
|---|---|---|
| 1 | In the keepsake's variants block, archive that variant. | The variant moves to the archived list. |
| 2 | Open Inventory. | The archived variant is not listed. |
| 3 | SELECT the stock row of that variant, and its rows in `inventory.stock_adjustments`. | The stock row still holds 6 on hand and the history rows are unchanged. |
| 4 | In the keepsake's variants block, look at the archived variant. | No Restore action is offered. |

- **Postconditions:** one archived variant with its stock kept.
- **Result:** ☐ Pass ☐ Fail ☐ Blocked. Actual result, if failed:

## PR 3: E6.5 opening stock

Terminal cases except S8-STOCK-SEED-02 and 04, which use the browser. The seed may set 100 on a stock row only while it still holds 0 and has no history row (gate G-S8-D2).

### S8-STOCK-SEED-01 The seed dry run lists the stock it would add and skip
- **Story / AC:** E6.5 / AC53
- **Priority:** P2
- **Role and device:** Owner, terminal (no browser)
- **Preconditions:** the opening quantities in the data file are edited; the seed has not run yet.

| # | Step | Expected result |
|---|---|---|
| 1 | Run the curated seed in dry-run mode, from `api/`. | It lists each of the five knives with "0 to 100", names the owner it acts as, and lists any SKU a person has already set as skipped. |
| 2 | Read the end of the output. | There is no "Opening stock:" result line. |
| 3 | Open Inventory in the browser. | No figure changed. |

- **Postconditions:** none.
- **Result:** ☐ Pass ☐ Fail ☐ Blocked. Actual result, if failed:

### S8-STOCK-SEED-02 Seeded knives show their opening stock
- **Story / AC:** E6.5 / AC53
- **Priority:** P2
- **Role and device:** Owner, desktop 1280 px
- **Preconditions:** the seed has run on dev.

| # | Step | Expected result |
|---|---|---|
| 1 | Open Inventory. | The five knives show 100 in stock. |
| 2 | In the database, SELECT the newest rows of `inventory.stock_adjustments`. | There are five `set` rows from 0 to 100, each with the store owner as the acting user. |
| 3 | Open the keepsake list. | No knife is counted as sold out. |

- **Postconditions:** the five knives have 100 in stock.
- **Result:** ☐ Pass ☐ Fail ☐ Blocked. Actual result, if failed:

### S8-STOCK-SEED-03 A second seed run changes nothing
- **Story / AC:** E6.5 / AC53
- **Priority:** P3
- **Role and device:** Owner, terminal
- **Preconditions:** the seed has run once.

| # | Step | Expected result |
|---|---|---|
| 1 | Run the seed again. | The output says nothing was changed. |
| 2 | Open Inventory. | The quantities are the same as before. |

- **Postconditions:** none.
- **Result:** ☐ Pass ☐ Fail ☐ Blocked. Actual result, if failed:

### S8-STOCK-SEED-04 A stock figure set by a person is not overwritten
- **Story / AC:** E6.5 / AC53 (gate G-S8-D2: only rows still at 0 with no history are touched)
- **Priority:** P2
- **Role and device:** Owner, desktop 1280 px and terminal
- **Preconditions:** a dev database where the seed has not yet set one of the knives. If all five are already at 100, skip this case and mark it Blocked.

| # | Step | Expected result |
|---|---|---|
| 1 | In Inventory, set one knife to 40. | The row shows 40 in stock. |
| 2 | Run the seed in dry-run mode. | That knife is listed as skipped. The other knives show "0 to 100". |
| 3 | Run the seed for real, then reload Inventory. | The first knife still shows 40. The other knives show 100. |

- **Postconditions:** one knife at 40, the others at 100.
- **Result:** ☐ Pass ☐ Fail ☐ Blocked. Actual result, if failed:

## PR 4: E6.6 pickup points

### S8-PICKUP-01 Save two pickup points and keep them after reload
- **Story / AC:** E6.6 / AC26
- **Priority:** P1
- **Role and device:** Owner, desktop 1280 px (repeat at phone 375 px)
- **Preconditions:** the Pickup points tab is empty.

| # | Step | Expected result |
|---|---|---|
| 1 | Open Products, Pickup points, and add "Shop Hertensteinstrasse" with a Google Maps link, an address and Monday to Saturday 10:00 to 18:00. | The point shows as a table row with the hours "Mon to Sat · 10:00 – 18:00". |
| 2 | Add a second point with its own link and different hours. | Both rows show in order. |
| 3 | Reload. | Both are still there with their hours. |

- **Postconditions:** two active pickup points.
- **Result:** ☐ Pass ☐ Fail ☐ Blocked. Actual result, if failed:

### S8-PICKUP-02 Two spans on one day show in the row
- **Story / AC:** E6.6 / AC26
- **Priority:** P2
- **Role and device:** Owner, desktop 1280 px
- **Preconditions:** one pickup point.

| # | Step | Expected result |
|---|---|---|
| 1 | Edit the point and add 14:00 to 18:00 on Monday after 09:00 to 12:00. | Both spans show in the editor. |
| 2 | Save. | The hours cell reads "Mon · 09:00 – 12:00, 14:00 – 18:00" on one line, and the other days on their own lines. |

- **Postconditions:** the point has two spans on Monday.
- **Result:** ☐ Pass ☐ Fail ☐ Blocked. Actual result, if failed:

### S8-PICKUP-03 A span past midnight is kept, and opens equal to closes is refused
- **Story / AC:** E6.6 / AC26
- **Priority:** P3
- **Role and device:** Owner, desktop 1280 px
- **Preconditions:** one pickup point.

| # | Step | Expected result |
|---|---|---|
| 1 | Set a span that opens 22:00 and closes 02:00, then press Save. | The sheet saves. The hours cell shows the span the way the place hours editor shows one. |
| 2 | Reload. | The span is still there. |
| 3 | Set a span that opens 10:00 and closes 10:00, then press Save. | The field shows the refusal and the sheet stays open. |

- **Postconditions:** the point keeps the 22:00 to 02:00 span.
- **Result:** ☐ Pass ☐ Fail ☐ Blocked. Actual result, if failed:

### S8-PICKUP-04 One language is enough for a pickup point
- **Story / AC:** E6.6 / AC26
- **Priority:** P2
- **Role and device:** Owner, desktop 1280 px
- **Preconditions:** none.

| # | Step | Expected result |
|---|---|---|
| 1 | Add a point with a Google Maps link and a German name and address only, and press Save. | It saves. |
| 2 | Read its row. | The Languages column shows the warning chip "EN missing". |

- **Postconditions:** one point without English text.
- **Result:** ☐ Pass ☐ Fail ☐ Blocked. Actual result, if failed:

### S8-PICKUP-05 Archive and restore a pickup point
- **Story / AC:** E6.6 / AC26
- **Priority:** P3
- **Role and device:** Owner, desktop 1280 px
- **Preconditions:** one pickup point.

| # | Step | Expected result |
|---|---|---|
| 1 | Archive the point. | It leaves the list. |
| 2 | Open the archived list and restore it. | It returns with its hours. |

- **Postconditions:** the point is active again.
- **Result:** ☐ Pass ☐ Fail ☐ Blocked. Actual result, if failed:

### S8-PICKUP-06 The limit of 100 counts active points only
- **Story / AC:** E6.6 / AC26 (gate G-S8-PICKUP-LIMIT; fix: archived points do not count, and a restore at 100 active is refused)
- **Priority:** P2
- **Role and device:** Owner, desktop 1280 px
- **Preconditions:** a test store with exactly 100 active pickup points and at least one archived point. The UI cannot reach this state quickly, so the developer fills the store with a script on a scratch store; do not use the seeded store.
- **Test data:** the archived point "Old shop".

| # | Step | Expected result |
|---|---|---|
| 1 | Try to add a 101st point. | The save fails and no point is added. The sheet stays open with what you typed and shows "100 active pickup points. Archive one first." (German: "100 aktive Abholstellen. Archivieren Sie zuerst eine."), not the general failure message. |
| 2 | Open the archived list and restore "Old shop". | The restore fails, "Old shop" stays archived, and a red message shows the same words: "100 active pickup points. Archive one first." |
| 3 | Archive one active point. | The active list now holds 99 points. |
| 4 | Restore "Old shop". | It returns to the active list, which now holds 100. |

- **Postconditions:** 100 active points.
- **Result:** ☐ Pass ☐ Fail ☐ Blocked. Actual result, if failed:

### S8-PICKUP-07 A restored point goes to the end of the list
- **Story / AC:** E6.6 / AC26
- **Priority:** P2
- **Role and device:** Owner, desktop 1280 px
- **Preconditions:** three active pickup points in the order First, Second, Third.

| # | Step | Expected result |
|---|---|---|
| 1 | Archive "Second". | The list shows First, Third. |
| 2 | Open the archived list and restore "Second". | "Second" returns. |
| 3 | Read the active list, then reload. | The order is First, Third, Second, before and after the reload. |

- **Postconditions:** the order is First, Third, Second.
- **Result:** ☐ Pass ☐ Fail ☐ Blocked. Actual result, if failed:

### S8-PICKUP-08 Two spans with the same day and opening time are refused
- **Story / AC:** E6.6 / AC26
- **Priority:** P2
- **Role and device:** Owner, desktop 1280 px
- **Preconditions:** one pickup point.

| # | Step | Expected result |
|---|---|---|
| 1 | Edit the point. On Monday set 09:00 to 12:00, then add a second Monday span that opens 09:00 and closes 14:00. | The second span's field shows an error. |
| 2 | Press Save. | The sheet stays open and nothing is saved. |
| 3 | Change the second span to open on Tuesday at 09:00 and press Save. | The sheet saves. |
| 4 | Reload. | Monday 09:00 to 12:00 and Tuesday 09:00 to 14:00 are both there. |

- **Postconditions:** the point has one Monday span and one Tuesday span.
- **Result:** ☐ Pass ☐ Fail ☐ Blocked. Actual result, if failed:

### S8-PICKUP-09 Pickup points is a page of its own
- **Story / AC:** owner fix 2026-11-03 / design 2026-10-29
- **Priority:** P1
- **Role and device:** Owner, desktop 1280 px, then phone 375 px
- **Preconditions:** a store with at least one active and one archived pickup point.

| # | Step | Expected result |
|---|---|---|
| 1 | In the sidebar open Products, then "Pickup points". | The title is "Pickup points" with the line "Where guests collect their orders and where handovers meet." No Keepsakes or Tours tabs, no "Products" title. Pickup points is highlighted in the sidebar. |
| 2 | Press "Add pickup point". | The sheet opens empty. Press the back arrow; it closes. |
| 3 | Open Status, tick Archived, untick Active. | A chip "Status: Archived" shows; only the archived point is listed with Restore. "Clear all" removes the chip. |
| 4 | Untick everything except Active and archive the last active point. | The empty state "No pickup points yet." shows. |
| 5 | Switch the language to German and reload. | Title "Abholstellen", line "Wo Gäste ihre Bestellungen abholen und wo Übergaben stattfinden.", button "Abholstelle hinzufügen". |
| 6 | Open Products > Tours (old screen), press its "Pickup points" tab. | The Pickup points page opens (the tab shows no count). |

- **Postconditions:** none.
- **Result:** ☐ Pass ☐ Fail ☐ Blocked. Actual result, if failed:

### S8-PICKUP-10 A Google Maps link sets the pin and fills the address
- **Story / AC:** E6.6 / AC26 (gate G-S8-PICKUP-MAPS)
- **Priority:** P1
- **Role and device:** Owner, desktop 1280 px (repeat at phone 375 px)
- **Preconditions:** the Pickup points page, with no point named "Chapel Bridge shop".
- **Test data:** the full link `https://www.google.com/maps/place/Chapel+Bridge/@47.0516489,8.3075351,17z/data=!3d47.0516489!4d8.3075351`.

| # | Step | Expected result |
|---|---|---|
| 1 | Press "Add pickup point". | The sheet opens with a "Location" block on top: the field "Google Maps link", a map and the help line. Below it are the name, address and instructions fields. |
| 2 | Paste the test link into "Google Maps link". | The line under the field reads "Pin moved to the link." The map shows a pin at the Chapel Bridge. |
| 3 | Wait two seconds, then read the Address field in English and in German. | Both hold the same street address in Lucerne, filled in from the link. You can still click in and change it. |
| 4 | Type the name "Chapel Bridge shop" and press "Save pickup point". | The sheet closes and a toast says "Chapel Bridge shop saved". |
| 5 | Reload and open the point. | The link field holds the pasted link, the map shows the pin at the same place, and the address is as saved. |
| 6 | Ask the developer to run this read-only query: `select maps_link, latitude, longitude from catalog.pickup_places where archived = false`. | One row for the point with the link as pasted, latitude about 47.05165 and longitude about 8.30754. |

- **Postconditions:** one active pickup point with a link and a pin.
- **Result:** ☐ Pass ☐ Fail ☐ Blocked. Actual result, if failed:

### S8-PICKUP-11 A short link is followed to its position
- **Story / AC:** E6.6 / AC26 (gate G-S8-PICKUP-MAPS)
- **Priority:** P2
- **Role and device:** Owner, desktop 1280 px
- **Preconditions:** the Pickup points page. A short link from Google Maps (Share, then Copy link in the Google Maps app, which gives `https://maps.app.goo.gl/...`) for a place in Lucerne.

| # | Step | Expected result |
|---|---|---|
| 1 | Press "Add pickup point" and paste the short link into "Google Maps link". | The line under the field reads "Reading the link…" with a spinner, then "Pin moved to the link." |
| 2 | Read the map and the Address field. | The pin is on the place you copied. The address is filled in from it. |
| 3 | Fill the name, press "Save pickup point", then reload and open the point. | It saved with the short link in the field and the pin on the same place. |

- **Postconditions:** one active pickup point stored with a short link.
- **Result:** ☐ Pass ☐ Fail ☐ Blocked. Actual result, if failed:

### S8-PICKUP-12 A missing or unreadable link is refused at the field
- **Story / AC:** E6.6 / AC26 (gate G-S8-PICKUP-MAPS)
- **Priority:** P2
- **Role and device:** Owner, desktop 1280 px
- **Preconditions:** the Pickup points page.

| # | Step | Expected result |
|---|---|---|
| 1 | Press "Add pickup point", type a name and an address, leave the link empty and press "Save pickup point". | The sheet stays open. The field "Google Maps link" is red and says "A Google Maps link is needed." Nothing is saved. |
| 2 | Paste the text `hello` into the link field. | The field says "This link has no position we can read. Use a link from Google Maps." |
| 3 | Paste `https://www.example.com/maps` and press "Save pickup point". | The same refusal shows and the sheet stays open. Nothing is saved. |
| 4 | Paste a valid Google Maps link and press "Save pickup point". | It saves and the sheet closes. |

- **Postconditions:** one new active pickup point.
- **Result:** ☐ Pass ☐ Fail ☐ Blocked. Actual result, if failed:

### S8-PICKUP-13 The merchant's own address is never overwritten, and a new link moves the pin
- **Story / AC:** E6.6 / AC26 (gate G-S8-PICKUP-MAPS)
- **Priority:** P2
- **Role and device:** Owner, desktop 1280 px
- **Preconditions:** one pickup point saved with a link (case S8-PICKUP-10).
- **Test data:** a second full Google Maps link for another place in Lucerne.

| # | Step | Expected result |
|---|---|---|
| 1 | Open the point. Replace the English address with "Meet at the green door". | The field shows your text. |
| 2 | Clear the link field and paste the second link. | The line reads "Pin moved to the link." The map moves to the new place. The English address still reads "Meet at the green door". |
| 3 | Press "Save pickup point", reload and open the point. | The new link and pin are saved. The address is still "Meet at the green door". |
| 4 | Change only the name and save. | It saves. The link and the pin are unchanged. |

- **Postconditions:** the point has the second link and the typed address.
- **Result:** ☐ Pass ☐ Fail ☐ Blocked. Actual result, if failed:

### S8-PICKUP-14 The Location block in German
- **Story / AC:** E6.6 / AC26 (gate G-S8-PICKUP-MAPS)
- **Priority:** P3
- **Role and device:** Owner, desktop 1280 px
- **Preconditions:** the interface is set to German.

| # | Step | Expected result |
|---|---|---|
| 1 | Open "Abholstelle hinzufügen". | The block is titled "Standort" and the field "Google-Maps-Link" has a German help line. |
| 2 | Press "Abholstelle speichern" with the link empty. | The field says "Ein Google-Maps-Link ist erforderlich." and nothing is saved. |

- **Postconditions:** none.
- **Result:** ☐ Pass ☐ Fail ☐ Blocked. Actual result, if failed:

### S8-PICKUP-15 Delete an active pickup point
- **Story / AC:** E6.6 / AC26 (gate G-S8-PICKUP-DELETE)
- **Priority:** P1
- **Role and device:** Owner, desktop 1280 px
- **Preconditions:** the Pickup points page with at least two active points, "Point A" and "Point B". No order exists yet, so no point is named by one.

| # | Step | Expected result |
|---|---|---|
| 1 | Open the ⋯ menu at the end of Point A's row. | It lists "Edit", "Archive" and "Delete"; only "Delete" is red. |
| 2 | Press "Delete" in the menu. | A dialog asks "Delete Point A?" and says it can't be undone and that a point an order or a handover names should be archived instead. Nothing is deleted yet. |
| 3 | Press "Delete" in the dialog. | The button shows a spinner, then the dialog closes. The toast says "Point A deleted". Point A has left the list and Point B is still there. |
| 4 | Reload the page, then tick "Archived" in the Status filter. | Point A is in neither list. |
| 5 | Open Point B and check its hours. | They are unchanged. |

- **Postconditions:** Point A no longer exists. Point B is unchanged.
- **Result:** ☐ Pass ☐ Fail ☐ Blocked. Actual result, if failed:

### S8-PICKUP-16 Delete an archived pickup point
- **Story / AC:** E6.6 / AC26 (gate G-S8-PICKUP-DELETE)
- **Priority:** P2
- **Role and device:** Owner, desktop 1280 px
- **Preconditions:** one archived pickup point, "Point C" (archive one with case S8-PICKUP-05).

| # | Step | Expected result |
|---|---|---|
| 1 | Tick "Archived" in the Status filter, then open Point C's ⋯ menu. | Point C's status reads "Archived"; the menu lists "Restore" and "Delete", no "Edit". |
| 2 | Press "Delete" in Point C's menu and confirm. | The dialog asks "Delete Point C?". After you confirm, the toast says "Point C deleted" and the row leaves the list. |
| 3 | Reload and tick "Archived". | Point C is gone. |
| 4 | Add a new pickup point. | It saves. Deleting left no gap that blocks a new point. |

- **Postconditions:** Point C no longer exists.
- **Result:** ☐ Pass ☐ Fail ☐ Blocked. Actual result, if failed:

### S8-PICKUP-17 Cancel the delete, and the dialog in German
- **Story / AC:** E6.6 / AC26 (gate G-S8-PICKUP-DELETE)
- **Priority:** P3
- **Role and device:** Owner, desktop 1280 px
- **Preconditions:** one active pickup point; the interface is set to German.

| # | Step | Expected result |
|---|---|---|
| 1 | Open the ⋯ menu of the row and press "Löschen". | A dialog asks "<Name> löschen?" in German. |
| 2 | Press "Abbrechen". | The dialog closes. The point is still in the list. |
| 3 | Press "Löschen" in the menu again and confirm. | The toast says "<Name> gelöscht" and the point leaves the list. |

- **Postconditions:** the point no longer exists.
- **Result:** ☐ Pass ☐ Fail ☐ Blocked. Actual result, if failed:

### S8-PICKUP-18 The pickup points table and the phone cards
- **Story / AC:** owner design 2026-11-04 (S8-PICKUP-TABLE)
- **Priority:** P1
- **Role and device:** Owner, desktop 1440 px, then phone 375 px
- **Preconditions:** three active pickup points: "Point A" in EN and DE with Monday to Saturday 10:00 to 18:00; "Point B" in English only with Monday to Friday 09:00 to 18:30 and Saturday 09:00 to 16:00; "Point C" in EN and DE with Monday to Friday 08:00 to 12:00 and 13:30 to 18:00. One archived point, "Point D", with no hours.

| # | Step | Expected result |
|---|---|---|
| 1 | Open Products, Pickup points at 1440 px. | A table with the columns Pickup point, Opening hours, Languages, Status and Actions, like the Keepsakes and Places tables. Each name is bold with its address under it in grey. No instructions show in a row. |
| 2 | Read the Opening hours cells. | Point A: "Mon to Sat · 10:00 – 18:00". Point B: two lines, "Mon to Fri · 09:00 – 18:30" and "Sat · 09:00 – 16:00". Point C: one line, "Mon to Fri · 08:00 – 12:00, 13:30 – 18:00". |
| 3 | Read the Languages and Status columns. | Only Point B has a chip, the yellow "DE missing". Points A and C have none. Every status reads "● Active" in green dot text. |
| 4 | Press the name "Point A". | The edit sheet opens filled with Point A. Close it. |
| 5 | Tick "Archived" in the Status filter. | Point D shows "No opening hours set" and "○ Archived". Its name is plain text, not a button. |
| 6 | Switch to German. | The headers read Abholstelle, Öffnungszeiten, Sprachen, Status, Aktionen. Point B's chip reads "DE fehlt"; the hours read "Mo bis Fr · 09:00 – 18:30"; the status reads "Aktiv" or "Archiviert". |
| 7 | Narrow the window to 375 px (or open it on a phone). | The table becomes one card per point, as the Keepsakes list does: name, address, the hours lines, then the status and the chip, and the ⋯ menu at the end. Tapping a card opens the edit sheet. Nothing scrolls sideways. |
| 8 | Reload with a slow network (DevTools, Slow 4G). | While loading, the table shows its real headers with grey bars in each cell; at 375 px, grey cards in the card shape. |

- **Postconditions:** none.
- **Result:** ☐ Pass ☐ Fail ☐ Blocked. Actual result, if failed:

Not testable in the browser yet: a point that an order or a handover names is refused with "An order or a handover names this pickup point, so it can’t be deleted. Archive it instead." That needs E7.1, which wires `SalesDirectory.usedPickupPlaceIds`. Until then an integration test stands in for the order (`api/test/integration/catalog-pickup.test.ts`).

## PR 5: E8.7 analytics events and the map card

Do the PostHog setup in "Before you start" first. A sender that is off sends nothing, so a missing event means a missing setting before it means a bug. Allow a few seconds for events to show.

### S8-EVENTS-01 Events arrive in PostHog with closed values only
- **Story / AC:** E8.7 / AC37, AC60
- **Priority:** P1
- **Role and device:** Guest (signed out), desktop 1280 px, and PostHog live events
- **Preconditions:** the PostHog setup is done; PostHog live events is open for the project.

| # | Step | Expected result |
|---|---|---|
| 1 | Open the guest home, then a pin on the map, then that pin's story link, then an outbound link on the pin. | The pages load normally. |
| 2 | In PostHog live events, find the newest events. | There are page_view, pin_open, pin_to_story_click and outbound_click events. |
| 3 | Open one event and read its properties. | Only page type, content id, language, referrer class, device class and, if onboarding was answered, segment and interests. Beside them only the three transport fields `token`, `distinct_id` and `$process_person_profile` may appear. No URL, path, referrer, user agent or other `$` property, and no person profile. |
| 4 | In the browser's storage panel, look at cookies, local storage and session storage for the site. | Nothing from PostHog. |

- **Postconditions:** events from this visit exist in PostHog.
- **Result:** ☐ Pass ☐ Fail ☐ Blocked. Actual result, if failed:

### S8-EVENTS-02 A merchant page and a switched-off build send nothing
- **Story / AC:** E8.7 / AC37
- **Priority:** P2
- **Role and device:** Owner signed in as merchant, desktop 1280 px, and PostHog live events
- **Preconditions:** the PostHog setup is done; note the newest event time in PostHog.

| # | Step | Expected result |
|---|---|---|
| 1 | Browse several /store pages, then a /partner or /admin page. | The pages load. |
| 2 | Look at PostHog live events. | No new event appears. |
| 3 | Set `VITE_POSTHOG_ENABLED=false` in `.env.local`, restart the front-end dev server, sign out, then browse the guest home and a pin. | No new event appears. |

- **Postconditions:** set `VITE_POSTHOG_ENABLED=true` again before the next case.
- **Result:** ☐ Pass ☐ Fail ☐ Blocked. Actual result, if failed:

### S8-EVENTS-03 A guest's deep-linked pin is recorded once
- **Story / AC:** E8.7 / AC60
- **Priority:** P2
- **Role and device:** Guest (signed out), phone 375 px, and PostHog live events
- **Preconditions:** the PostHog setup is done; note the newest event time.
- **Test data:** a link to the guest map with a pin in it, `/en/map?place=<place id>` (use the Chapel Bridge place).

| # | Step | Expected result |
|---|---|---|
| 1 | Open the deep link in a new tab. | The map opens with that pin's card shown. |
| 2 | Look at PostHog live events. | One pin_open event for that place appears, even if the page answered slowly. |
| 3 | Tap the same pin again. | No second pin_open event appears for it. |

- **Postconditions:** none.
- **Result:** ☐ Pass ☐ Fail ☐ Blocked. Actual result, if failed:

### S8-EVENTS-04 A signed-in merchant's deep-linked pin records nothing
- **Story / AC:** E8.7 / AC37
- **Priority:** P2
- **Role and device:** Owner signed in as merchant, desktop 1280 px, and PostHog live events
- **Preconditions:** the PostHog setup is done; the merchant profile is signed in; note the newest event time.

| # | Step | Expected result |
|---|---|---|
| 1 | In a new tab open the same deep link as in S8-EVENTS-03. | The map opens with that pin's card shown. |
| 2 | Tap a second pin, then Show more. | The card and the sheet open. |
| 3 | Look at PostHog live events. | No new event appears. |

- **Postconditions:** none.
- **Result:** ☐ Pass ☐ Fail ☐ Blocked. Actual result, if failed:

### S8-EVENTS-05 Signing in after the page loaded stops the tab reporting
- **Story / AC:** E8.7 / AC37 (fix: a sign-in after load re-reads the session)
- **Priority:** P1
- **Role and device:** Owner, desktop 1280 px, two tabs, and PostHog live events
- **Preconditions:** the PostHog setup is done; the profile is signed out; the owner account belongs to a store.

| # | Step | Expected result |
|---|---|---|
| 1 | In tab A open the guest home, and open one pin. | PostHog shows a page_view and a pin_open event. Note the newest event time. |
| 2 | In tab B sign in as the merchant. Do not reload tab A. | Tab B opens the merchant area. |
| 3 | Back in tab A, browse to the map, open two other pins and press Show more. | The pages work normally. |
| 4 | Look at PostHog live events. | No event newer than the time noted in step 1 appears. |

- **Postconditions:** sign out of tab B.
- **Result:** ☐ Pass ☐ Fail ☐ Blocked. Actual result, if failed:

### S8-EVENTS-06 A production or unset site environment sends nothing
- **Story / AC:** E8.7 / AC37 (the switch fails closed)
- **Priority:** P3
- **Role and device:** Guest (signed out), desktop 1280 px, and PostHog live events
- **Preconditions:** the PostHog setup is done; note the newest event time.

| # | Step | Expected result |
|---|---|---|
| 1 | In `.env.local` delete the `VITE_SITE_ENV` line, restart the front-end dev server, browse the guest home and a pin. | No new event appears. |
| 2 | Set `VITE_SITE_ENV=production`, restart, browse the same pages. | No new event appears. |
| 3 | Set `VITE_SITE_ENV=development` again, restart, browse the same pages. | New page_view and pin_open events appear. |

- **Postconditions:** the setup is back to the one in "Before you start".
- **Result:** ☐ Pass ☐ Fail ☐ Blocked. Actual result, if failed:

### S8-EVENTS-07 A signed-in Super Admin on the guest site sends nothing
- **Story / AC:** E8.7 / AC37 (fix: a Super Admin has no store, and still counts as signed in)
- **Priority:** P2
- **Role and device:** Super Admin, then Guest (signed out), desktop 1280 px, and the browser Network tab
- **Preconditions:** the PostHog setup is done; the Super Admin account exists; the profile is signed out.

| # | Step | Expected result |
|---|---|---|
| 1 | Sign in as the Super Admin. | The platform area opens. |
| 2 | Open the guest site: the home page, a story and the map. Open a pin and follow its story link. | The pages work normally. |
| 3 | In the Network tab filter for the PostHog host. | No request to that host is sent on any of these pages. |
| 4 | Sign out and repeat steps 2 and 3 as a signed-out visitor. | page_view and pin_open requests are sent. |

- **Postconditions:** signed out.
- **Result:** ☐ Pass ☐ Fail ☐ Blocked. Actual result, if failed:

### S8-MAP-01 The map place card shows no tip
- **Story / AC:** E8.7 / guards the owner decision of 2026-11-03 ("No tip on the card")
- **Priority:** P2
- **Role and device:** Guest, phone 375 px
- **Preconditions:** a published place with a tip, a category and an upcoming date; the guest map is open.
- **Test data:** the place "Chapel Bridge" (or any place that has a tip).

| # | Step | Expected result |
|---|---|---|
| 1 | Open the guest map and tap the pin of the place. | The card opens with the photo, the title, an eyebrow (category and date), Show more and the map button. |
| 2 | Watch the card for two seconds. | The card keeps the same height. No tip text appears and nothing jumps. |
| 3 | Tap Show more. | The details sheet opens at once and shows the tip in full. |
| 4 | Close the sheet, then tap the map button on the card. | Google Maps opens at the place. |
| 5 | In the place editor, open Preview EN. | The preview card shows no tip either. The sheet there shows it. |

- **Postconditions:** none.
- **Result:** ☐ Pass ☐ Fail ☐ Blocked. Actual result, if failed:

## PR 6: E4.3 story editor

Open Content, Stories. Run the cases on a story with both an English and a German version unless a case says otherwise. Cases S8-STORY-23 to 28 cover review fixes: the 50-place limit, the reviewed place, the save status, delete and the cover picker.

### S8-STORY-01 The stories list shows each language version's state
- **Story / AC:** E4.3 / AC30
- **Priority:** P2
- **Role and device:** Owner, desktop 1280 px (repeat at phone 375 px)
- **Preconditions:** a story with an English draft and a story with a published German version.

| # | Step | Expected result |
|---|---|---|
| 1 | Open Content, Stories. | Each row shows the title, a thumbnail and the English and German state. |
| 2 | Open the Drafts tab. | Only stories with no published version show. |
| 3 | Search for text that matches no title. | The list says "No story matches “{query}”." |

- **Postconditions:** none.
- **Result:** ☐ Pass ☐ Fail ☐ Blocked. Actual result, if failed:

### S8-STORY-02 New story opens the editor
- **Story / AC:** E4.3 / AC30
- **Priority:** P1
- **Role and device:** Owner, desktop 1280 px
- **Preconditions:** none.

| # | Step | Expected result |
|---|---|---|
| 1 | Press New story. | The editor opens on an empty English draft. |
| 2 | Press Back to Stories. | The list shows the new story as an English draft. |

- **Postconditions:** none.
- **Result:** ☐ Pass ☐ Fail ☐ Blocked. Actual result, if failed:

### S8-STORY-03 A draft saves itself while typing
- **Story / AC:** E4.3 / AC45
- **Priority:** P1
- **Role and device:** Owner, desktop 1280 px (repeat at phone 375 px)
- **Preconditions:** an English draft.

| # | Step | Expected result |
|---|---|---|
| 1 | Type a title and wait two seconds. | The header shows "Saving…" and then "Saved {time}". |
| 2 | Reload. | The title is still there. |

- **Postconditions:** none.
- **Result:** ☐ Pass ☐ Fail ☐ Blocked. Actual result, if failed:

### S8-STORY-04 Leaving with unsaved edits asks first
- **Story / AC:** E4.3 / AC45
- **Priority:** P2
- **Role and device:** Owner, desktop 1280 px
- **Preconditions:** an open draft.

| # | Step | Expected result |
|---|---|---|
| 1 | Type a title and press Back at once. | A dialog "Leave without saving?" opens with Keep editing and Leave without saving. |
| 2 | Press Keep editing. | The editor stays open with the text. |

- **Postconditions:** none.
- **Result:** ☐ Pass ☐ Fail ☐ Blocked. Actual result, if failed:

### S8-STORY-05 A save from a stale tab is refused
- **Story / AC:** E4.3 / AC45
- **Priority:** P3
- **Role and device:** Owner, desktop 1280 px
- **Preconditions:** the same story open in two tabs.

| # | Step | Expected result |
|---|---|---|
| 1 | Change the title in tab 1 and wait for Saved. | Tab 1 shows "Saved {time}". |
| 2 | Change the title in tab 2 and wait. | Tab 2 shows "Someone saved this after you opened it. Reload and apply your change again." with a reload button. |

- **Postconditions:** none.
- **Result:** ☐ Pass ☐ Fail ☐ Blocked. Actual result, if failed:

### S8-STORY-06 Starting the German version carries the cover
- **Story / AC:** E4.3 / AC30
- **Priority:** P3
- **Role and device:** Owner, desktop 1280 px
- **Preconditions:** an English draft with a cover.

| # | Step | Expected result |
|---|---|---|
| 1 | Press Start this version on the German switch. | A German draft opens. |
| 2 | Look at the cover card. | It shows the English cover. |

- **Postconditions:** none.
- **Result:** ☐ Pass ☐ Fail ☐ Blocked. Actual result, if failed:

### S8-STORY-07 Formatting survives a save and reload
- **Story / AC:** E4.3 / AC45
- **Priority:** P1
- **Role and device:** Owner, desktop 1280 px (repeat at phone 375 px)
- **Preconditions:** an English draft.

| # | Step | Expected result |
|---|---|---|
| 1 | Write two paragraphs, make a word bold, add a link, an H2, a quote and a bullet list. | The editor shows each format. |
| 2 | Wait for Saved, then reload. | The body looks the same. |
| 3 | Read the line under the editor. | It shows the words, the minutes and "Contents: {k} sections" or "No contents list (needs 2 headings)". |

- **Postconditions:** none.
- **Result:** ☐ Pass ☐ Fail ☐ Blocked. Actual result, if failed:

### S8-STORY-08 Pasted text keeps only the allowed formatting
- **Story / AC:** E4.3 / AC45
- **Priority:** P3
- **Role and device:** Owner, desktop 1280 px
- **Preconditions:** an open draft; a web page with a table and code.

| # | Step | Expected result |
|---|---|---|
| 1 | Paste text with a table and code from a web page. | The text stays as paragraphs with no table and no code style. |

- **Postconditions:** none.
- **Result:** ☐ Pass ☐ Fail ☐ Blocked. Actual result, if failed:

### S8-STORY-09 Photo, video and recording between paragraphs
- **Story / AC:** E4.3 / AC45
- **Priority:** P2
- **Role and device:** Owner, desktop 1280 px
- **Preconditions:** a draft with two paragraphs; one photo and one recording in the library.

| # | Step | Expected result |
|---|---|---|
| 1 | Put the cursor between the paragraphs and press Insert, then pick a ready photo and Insert photo. | A photo block shows between the paragraphs. |
| 2 | Insert a YouTube link on the Video tab with a title. | The poster shows and the block is added. |
| 3 | Enter a Vimeo link. | The sheet says "This is not a YouTube link. Copy the address from the video’s Share button." |
| 4 | Wait for Saved and reload. | The blocks are in the same places. |

- **Postconditions:** none.
- **Result:** ☐ Pass ☐ Fail ☐ Blocked. Actual result, if failed:

### S8-STORY-10 Link a word to a pin
- **Story / AC:** E4.3 / AC45
- **Priority:** P2
- **Role and device:** Owner, desktop 1280 px
- **Preconditions:** a published pin with a website and a draft pin.

| # | Step | Expected result |
|---|---|---|
| 1 | Select a word, open the pin tool and pick the published pin, then Link this pin. | The word shows the pale red pin-link highlight. |
| 2 | Pick the draft pin for another word. | Its row says "Draft: shows as plain text until published" and it can be chosen. |

- **Postconditions:** none.
- **Result:** ☐ Pass ☐ Fail ☐ Blocked. Actual result, if failed:

### S8-STORY-11 A new story is blocked until four things are set
- **Story / AC:** E4.3 / AC30
- **Priority:** P1
- **Role and device:** Owner, desktop 1280 px (repeat at phone 375 px)
- **Preconditions:** a new empty draft.

| # | Step | Expected result |
|---|---|---|
| 1 | Press Review and publish. | The list says "4 things stop publishing" and Publish is off with "Fix what stops publishing first." |
| 2 | Use each Edit jump to add a cover, a title, an excerpt and the link. | Each check disappears as it is fixed. |
| 3 | Read the heading. | It says "Ready to publish". |

- **Postconditions:** none.
- **Result:** ☐ Pass ☐ Fail ☐ Blocked. Actual result, if failed:

### S8-STORY-12 Publish in one language only
- **Story / AC:** E4.3 / AC30
- **Priority:** P1
- **Role and device:** Owner, desktop 1280 px
- **Preconditions:** a draft ready to publish in English only.

| # | Step | Expected result |
|---|---|---|
| 1 | Press Publish English. | The toast says "English version published. Guests see it within about a minute." |
| 2 | Read the publish card. | English is Published, and German only warns that no Deutsch version exists. |

- **Postconditions:** none.
- **Result:** ☐ Pass ☐ Fail ☐ Blocked. Actual result, if failed:

### S8-STORY-13 Publish changes and Unpublish
- **Story / AC:** E4.3 / AC45
- **Priority:** P2
- **Role and device:** Owner, desktop 1280 px
- **Preconditions:** a published English version.

| # | Step | Expected result |
|---|---|---|
| 1 | Edit the title and open Review and publish. | The card says "Published · edits not live" with Publish changes (EN). |
| 2 | Press Publish changes (EN). | The card shows Published. |
| 3 | Press Unpublish and confirm. | The toast says "English version is a draft again." |

- **Postconditions:** none.
- **Result:** ☐ Pass ☐ Fail ☐ Blocked. Actual result, if failed:

### S8-STORY-14 Blog category choice rules
- **Story / AC:** E4.3 / AC87
- **Priority:** P2
- **Role and device:** Owner, desktop 1280 px
- **Preconditions:** categories Swiss history with Old Town, and Practical tips.

| # | Step | Expected result |
|---|---|---|
| 1 | Open Details, Blog categories, choose Old Town and Save categories. | A chip "Old Town in Swiss history" shows with "Swiss history is included through Old Town." |
| 2 | Reopen and choose Swiss history. | Only Swiss history is chosen. |
| 3 | Search "xyz". | The sheet says "No category matches “xyz”." |

- **Postconditions:** none.
- **Result:** ☐ Pass ☐ Fail ☐ Blocked. Actual result, if failed:

### S8-STORY-15 An editorial review needs a place and a date
- **Story / AC:** E4.3 / AC30
- **Priority:** P3
- **Role and device:** Owner, desktop 1280 px
- **Preconditions:** a plain story ready except for this card, with an English and a German version.

| # | Step | Expected result |
|---|---|---|
| 1 | Open Review and publish, open Editorial review, switch on "This is an editorial review". | The card shows the problem icon "Stops publishing"; the checks list "Choose the place this review is about." and "Add the day the facts were checked."; nothing is saved yet. |
| 2 | Choose a place ("Choose the place", pick a pin, "Use this place"), then pick a date. | Both checks disappear; there is no "Checked by" field; the place is also in the Places card. |
| 3 | Type a date after today. | "Choose today or an earlier day." and the date is not saved. |
| 4 | Reload the page. | The switch is on, with the place and date. |
| 5 | Open the German version and start it. | Facts checked on shows the English date; changing it leaves the English date as it was. |
| 6 | Close the card. | The summary reads "{place} · checked {date}". |
| 7 | Switch the review off. | The card says "No, a story"; after a reload it still does. |

- **Postconditions:** none.
- **Result:** ☐ Pass ☐ Fail ☐ Blocked. Actual result, if failed:

### S8-STORY-16 Keepsakes stop at six and reorder by keyboard
- **Story / AC:** E4.3 / AC33
- **Priority:** P2
- **Role and device:** Owner, desktop 1280 px
- **Preconditions:** at least 7 published keepsakes (the sprint 7 seed has 5; add test ones).

| # | Step | Expected result |
|---|---|---|
| 1 | Open Details, Keepsakes and choose six. | The button reads "Choose keepsakes · 6 of 6" and no price shows. |
| 2 | Try to choose a seventh. | Nothing changes. |
| 3 | Focus a grip and press Up. | The row moves up one place and the focus stays on the grip. |

- **Postconditions:** none.
- **Result:** ☐ Pass ☐ Fail ☐ Blocked. Actual result, if failed:

### S8-STORY-17 Related stories stop at three and are shared by both languages
- **Story / AC:** E4.3 / AC33
- **Priority:** P3
- **Role and device:** Owner, desktop 1280 px
- **Preconditions:** four other stories.

| # | Step | Expected result |
|---|---|---|
| 1 | Open More to discover and choose three stories. | The summary says "3 of 3". |
| 2 | Try a fourth. | Nothing changes. |
| 3 | Switch to the German version. | The same three show. |

- **Postconditions:** none.
- **Result:** ☐ Pass ☐ Fail ☐ Blocked. Actual result, if failed:

### S8-STORY-18 The preview shows the draft as guests will see it
- **Story / AC:** E4.3 / AC45
- **Priority:** P2
- **Role and device:** Owner, desktop 1280 px (repeat at phone 375 px)
- **Preconditions:** a draft with a cover, an H2, a photo and linked keepsakes.

| # | Step | Expected result |
|---|---|---|
| 1 | Open Review and publish. | A phone outline shows the cover with title and excerpt over a dark gradient. |
| 2 | Scroll inside the phone. | The body, places, "Keepsakes from this story" (no price) and "More to discover" show. |
| 3 | Switch to Deutsch and edit the title. | The preview shows the German version and the edit without reload. |

- **Postconditions:** none.
- **Result:** ☐ Pass ☐ Fail ☐ Blocked. Actual result, if failed:

### S8-STORY-19 Delete a draft story from the list
- **Story / AC:** E4.3 / AC30
- **Priority:** P1
- **Role and device:** Owner, desktop 1280 px
- **Preconditions:** a story with an English draft that was never published, no pin names it.
- **Test data:** the story "Delete me draft".

| # | Step | Expected result |
|---|---|---|
| 1 | Open Content, Stories. | The row "Delete me draft" shows with English Draft. |
| 2 | Open the row menu and choose Delete. | A dialog asks to delete the draft story, with no "live for guests" line and no link line. |
| 3 | Press Delete story. | The button shows a spinner, then the dialog closes. |
| 4 | Look at the list. | The row is gone, the tab counts dropped by one, and a toast says the story was deleted. |
| 5 | Reload the page. | The row is still gone. |

- **Postconditions:** the story no longer exists.
- **Result:** ☐ Pass ☐ Fail ☐ Blocked. Actual result, if failed:

### S8-STORY-20 Delete a published story that pins and stories link to
- **Story / AC:** E4.3 / AC30
- **Priority:** P1
- **Role and device:** Owner, desktop 1280 px
- **Preconditions:** a published story in English and German; one pin has it as main story; another story lists it under More to discover.
- **Test data:** story "Old Town walk", pin "Chapel Bridge", story "Lake views".

| # | Step | Expected result |
|---|---|---|
| 1 | Open "Old Town walk" in the editor and open the "More actions" menu. | The menu has "Delete story". |
| 2 | Choose Delete story. | A danger dialog says "This story is live for guests and will disappear. This story is the main story of 1 pin and is linked from 1 other story. Deleting it removes those links." |
| 3 | Press Cancel. | The dialog closes and nothing changes. |
| 4 | Choose Delete story again and press Delete story. | The editor closes, the list opens, a toast says the story was deleted, and the row is gone. |
| 5 | Open the pin "Chapel Bridge". | Its main story is empty. |
| 6 | Open "Lake views", Details, More to discover. | "Old Town walk" is no longer listed. |
| 7 | Open the story's old public address in English and in German. | Both show a not found page. |

- **Postconditions:** story and links gone; pin and "Lake views" still exist.
- **Result:** ☐ Pass ☐ Fail ☐ Blocked. Actual result, if failed:

### S8-STORY-21 A failed delete keeps the dialog open
- **Story / AC:** E4.3 / AC30
- **Priority:** P3
- **Role and device:** Owner, desktop 1280 px
- **Preconditions:** a story in the list; the browser can go offline (developer tools, Network, Offline).

| # | Step | Expected result |
|---|---|---|
| 1 | Open the row menu, choose Delete, then go offline. | The dialog is open. |
| 2 | Press Delete story. | The dialog stays open with an error in a danger notice, and both buttons work. |
| 3 | Go online and press Delete story again. | The story is deleted and the row is gone. |

- **Postconditions:** none.
- **Result:** ☐ Pass ☐ Fail ☐ Blocked. Actual result, if failed:

### S8-STORY-22 Delete in German, and a second tab
- **Story / AC:** E4.3 / AC30
- **Priority:** P3
- **Role and device:** Owner, desktop 1280 px, two tabs
- **Preconditions:** a story open in two tabs, the interface set to German in tab 1.

| # | Step | Expected result |
|---|---|---|
| 1 | In tab 1, delete the story from the list. | The dialog, the buttons and the toast are in German. |
| 2 | In tab 2, change the title and wait for the autosave. | The editor shows a save problem or "not found", and no story reappears in the list after a reload. |

- **Postconditions:** none.
- **Result:** ☐ Pass ☐ Fail ☐ Blocked. Actual result, if failed:

### S8-STORY-23 A review at 50 places refuses a 51st place
- **Story / AC:** E4.3 / AC30
- **Priority:** P2
- **Role and device:** Owner, desktop 1280 px
- **Preconditions:** a story with 50 places in Places and no editorial review; a pin that is not among them.
- **Test data:** the 50 places, one extra pin "Spare pin".

| # | Step | Expected result |
|---|---|---|
| 1 | Open Review and publish, then the card "Editorial review", and switch "This is an editorial review" on. | The switch is on; the header says "Stops publishing". |
| 2 | Press "Choose the place", press "Spare pin", press "Use this place". | The sheet closes. The card shows "50 chosen, the most a story can have. Remove one to add another." |
| 3 | Wait 3 seconds and look at the header save status. | It does not say "Saving…" or "Not saved". |
| 4 | Remove one place in the Places card, then repeat step 2. | The place is accepted and the message is gone. |

- **Postconditions:** the story is a review with "Spare pin" as its place.
- **Result:** ☐ Pass ☐ Fail ☐ Blocked. Actual result, if failed:

### S8-STORY-24 The reviewed place cannot leave Places
- **Story / AC:** E4.3 / AC30
- **Priority:** P2
- **Role and device:** Owner, desktop 1280 px
- **Preconditions:** a story that is an editorial review with place "Pin 1", and Places holding "Pin 1" and "Pin 2".

| # | Step | Expected result |
|---|---|---|
| 1 | Open the Places card. | The row "Pin 1" shows "The review is about this place. Change the reviewed place to remove it." and its remove button is greyed out. |
| 2 | Press "Remove Pin 2". | "Pin 2" leaves the list. |
| 3 | Press "Choose places", press "Pin 1" in the sheet. | "Pin 1" stays chosen; the sheet shows the same note. |
| 4 | Switch the review off in the Editorial review card. | The "Pin 1" remove button works again. |

- **Postconditions:** the story is a plain story with "Pin 1" in Places.
- **Result:** ☐ Pass ☐ Fail ☐ Blocked. Actual result, if failed:

### S8-STORY-25 Leaving with a review that has no place asks first
- **Story / AC:** E4.3 / AC30
- **Priority:** P3
- **Role and device:** Owner, desktop 1280 px
- **Preconditions:** a plain story.

| # | Step | Expected result |
|---|---|---|
| 1 | Open Review and publish, open "Editorial review", switch the review on, choose no place. | The header says "Stops publishing". |
| 2 | Wait 3 seconds, press "Back to writing", then "Back to Stories". | A dialog "Leave without saving?" opens. |
| 3 | Press "Keep editing". | The dialog closes and the editor stays open. |

- **Postconditions:** none.
- **Result:** ☐ Pass ☐ Fail ☐ Blocked. Actual result, if failed:

### S8-STORY-26 The header shows a failed Details save
- **Story / AC:** E4.3 / AC45
- **Priority:** P3
- **Role and device:** Owner, desktop 1280 px
- **Preconditions:** a story open on Review and publish. Block the network to the API in the browser developer tools (offline).

| # | Step | Expected result |
|---|---|---|
| 1 | Open the Stay card and pick "Multi-day". | The choice shows as selected. |
| 2 | Wait 3 seconds. | The header says "Not saved" and a retry notice shows. |
| 3 | Turn the network back on and press the retry button. | The header says "Saved" with a time. |

- **Postconditions:** the story's stay is "Multi-day".
- **Result:** ☐ Pass ☐ Fail ☐ Blocked. Actual result, if failed:

### S8-STORY-27 Deleting a story leaves no stale pin or story behind
- **Story / AC:** E4.3 / AC30
- **Priority:** P1
- **Role and device:** Owner, desktop 1280 px
- **Preconditions:** story A is the main story of pin P and is listed as "More to discover" in story B. Open B and P once before the delete, so they are cached.

| # | Step | Expected result |
|---|---|---|
| 1 | Open story A, open the menu "More actions", press "Delete story", confirm. | The Stories list opens and a toast says "Story deleted." |
| 2 | Open story B. | B no longer lists A in "More to discover". |
| 3 | In B, change the Stay to "Multi-day". | The header says "Saved" with a time and no "Someone saved this after you opened it" notice. |
| 4 | Open pin P in Places and change its note, then save. | The save works with no stale notice; P has no main story. |

- **Postconditions:** story A is gone; B and P are saved.
- **Result:** ☐ Pass ☐ Fail ☐ Blocked. Actual result, if failed:

### S8-STORY-28 The cover picker waits for a new photo to finish processing
- **Story / AC:** E4.3 / AC30
- **Priority:** P3
- **Role and device:** Owner, desktop 1280 px
- **Preconditions:** a story open on Write.

| # | Step | Expected result |
|---|---|---|
| 1 | In the cover card press "Change", then upload a large photo. | The wall shows the photo as "Processing" and a line says "Waiting for “name” to finish processing". |
| 2 | While it processes, look at "Use as cover". | It stays disabled. |
| 3 | Wait until processing ends. | The photo is chosen and "Use as cover" is enabled. |

- **Postconditions:** none until the merchant presses "Use as cover".
- **Result:** ☐ Pass ☐ Fail ☐ Blocked. Actual result, if failed:

## PR 7: UI consistency and story fixes

Merchant UI changes made after the first draft of this file. They are on main, not in the PRs above.

### S8-UI-01 Merchant list screens share one header and toolbar
- **Story / AC:** UI consistency, owner feedback 2026-11-03
- **Priority:** P1
- **Role and device:** Owner, desktop 1280 px, then phone 375 px (repeat the table at both widths)
- **Preconditions:** a store with keepsakes, stories, places, media files, pickup points (one archived), and stock rows with the code VICTORINOX-0.6223.G.

| # | Step | Expected result |
|---|---|---|
| 1 | Open Media. 1280 px. | Title and Upload button on one row; below it the tabs Photos · N, Audio · N, PDFs · N alone on one line; under that Use, Status and Select on the left, the search box on the right. |
| 2 | Open Keepsakes, Places, Pickup points. | Same Add button size as Upload (default size, plus icon). Status/filter buttons left, search right on one line. |
| 3 | Open Stories, Categories, Inventory. | Tabs left, search right on one line. Stories and Inventory tabs read "All · 13" style, no grey pill. |
| 4 | Pickup points: load the page. | No "Status: Active" chip; only active points listed. |
| 5 | Pickup points: tick Archived. | Only archived points. Tick Active too: both. Clear all: back to active only. |
| 6 | Pickup points: type part of a name, then of an address. | Tickets filter; a word that matches nothing shows "No pickup point matches. Try another word or remove a filter." and the button "Clear search and filters" empties the search. |
| 7 | Inventory: look at the table. | Same plain table as Keepsakes (no white card around it). The SKU code VICTORINOX-0.6223.G is on one line; type a number in In stock and it still saves. |
| 8 | Open a keepsake's Variants; narrow the window to 1024 px. | SKU codes never break at a hyphen. |
| 9 | Open Add pickup point and press Save with nothing filled. | "Complete the text in English or German to save." shows as a red tinted alert; a "can still publish" hint is amber tinted. |
| 10 | Repeat steps 1 to 3 at 375 px. | Order is header, action button full width under the intro, tabs, then filters, then the search box full width. Tabs stay pinned when scrolling Stories. |

- **Result:** ☐ Pass ☐ Fail ☐ Blocked. Actual result, if failed:

### S8-UI-02 Story Write screen: two columns, Short summary field, growing text boxes
- **Story / AC:** E4.3 / AC30 (owner feedback 2026-11-03)
- **Priority:** P2
- **Role and device:** Owner, desktop 1280 px, then phone 375 px; browsers Chrome and Firefox
- **Preconditions:** a story with a cover, a title and a body; the owner is signed in to the store.
- **Test data:** the story "A morning on the Musegg wall" (or any story), a 400-character text to paste.

| # | Step | Expected result |
|---|---|---|
| 1 | At 1280 px open the story, Write screen. | "Cover and title" card at the left (about 5/12 of the width), the story card at the right (about 7/12), side by side. |
| 2 | Scroll the page down. | Both cards scroll with the page; neither stays fixed. |
| 3 | Look at the summary field. | Label reads "Short summary" with the red star. Only the counter "0 / 300" (or the current count) sits under it: no "Under the title..." line and no "Written by ..." line. |
| 4 | Type three lines into Short summary, pressing Enter between them. | The box grows by one line each time; no scrollbar inside the box; no resize handle at its corner. |
| 5 | Paste 400 characters. | The box holds the first 300 characters, the counter shows "300 / 300", still no inner scrollbar. |
| 6 | Clear the summary and the title, press Review, press Back to writing. | The summary shows "Add a short summary to publish." |
| 7 | Press Review with the summary empty. | The check list says "Add a short summary." |
| 8 | Switch the page language to German and repeat steps 3, 6 and 7. | Label "Kurze Zusammenfassung"; errors "Kurze Zusammenfassung zum Veröffentlichen hinzufügen." and "Fügen Sie eine kurze Zusammenfassung hinzu."; no helper or author line. |
| 9 | Open Firefox, repeat step 4 in the same story. | Same behaviour: the box grows as you type, no inner scrollbar, no resize handle (Firefox uses the measured fallback). |
| 10 | At 375 px open the Write screen. | One column: "Cover and title" first, the story card below it, as before. |
| 11 | Open a merchant sheet with a text box (for example Record payment, note) and type five lines. | The box grows with the text; no inner scrollbar; no resize handle. |

- **Postconditions:** the summary text typed in step 4 is saved (clear it if not wanted).
- **Result:** ☐ Pass ☐ Fail ☐ Blocked. Actual result, if failed:

### S8-UI-03 Settings, Members is one table with an Invite sheet
- **Story / AC:** E2.4 / AC02 (owner feedback 2026-11-04)
- **Priority:** P1
- **Role and device:** Owner, desktop 1440 px, then phone 375 px
- **Preconditions:** a store with its Owner, one Store Manager who accepted, one open invitation and one expired invitation (invite an address and wait until its link expires, or use seeded data). Use test addresses only: an invitation sends a real mail.

| # | Step | Expected result |
|---|---|---|
| 1 | Open Settings, Members at 1440 px. | Under the Settings tabs: the line "Store Managers see orders and the catalogue, not the members or the payment account." and the red button "Invite a Store Manager" at the end. Below it, one table with the columns Member, Role, Status, Member since and Actions, like the Pickup points table. No "Who belongs to the store" or "Invitations" headings. |
| 2 | Read the rows. | The Owner: "Owner", "● Active" in green, the date joined, and no ⋯ menu. The Manager: "Store Manager", "● Active", the date joined. The open invitation: "Store Manager", "○ Invited" with "Link works until <date>" under it, and "–" as the member-since. The expired one: "● Expired" in amber with "Expired on <date>". |
| 3 | Open the Manager's ⋯ menu, then an invitation's menu. | The Manager's menu has only "Remove", in red. An invitation's menu has "Send again" and "Revoke", Revoke in red. |
| 4 | Press "Send again" on the expired invitation. | The toast says the invitation was sent again; the row turns to "Invited" with a new date. |
| 5 | Press "Revoke" on the open invitation, then "Cancel"; press it again and confirm with "Withdraw invitation". | Cancel changes nothing. After confirming, the toast says it was revoked and the row leaves the table. |
| 6 | Press "Invite a Store Manager". | A dialog "Invite a Store Manager" opens with the Email address field, the mail language (English, Deutsch) and the buttons "Cancel" and "Send invitation" at their normal width. |
| 7 | Enter "nobody" and press "Send invitation". | "Enter a valid email address." under the field; nothing is sent. |
| 8 | Enter the Manager's own email and send. | "This person already belongs to the store." under the field; the dialog stays open with the address. |
| 9 | Enter a new test address, choose Deutsch and send. | The dialog closes, the toast says the invitation was sent, and the address shows as a new "Invited" row. The mail arrives in German. |
| 10 | Switch to German. | Headers Mitglied, Rolle, Status, Mitglied seit, Aktionen; statuses Aktiv, Eingeladen, Abgelaufen; the button "Shop-Manager einladen". |
| 11 | Narrow to 375 px. | The table becomes one card per row: the email, the role, the status with its line, "Member since <date>" for members, and the ⋯ menu (none on the Owner). The button is full width under the line. Nothing scrolls sideways. |
| 12 | Sign in as the Store Manager and open Settings. | No Members tab, so no table and no invite button. |

- **Postconditions:** one revoked invitation, one new open invitation.
- **Result:** ☐ Pass ☐ Fail ☐ Blocked. Actual result, if failed:

### S8-STORY-FIX-01 Story editor header does not cover the store notice
- **Story / AC:** E4.3 / owner fix 2026-11-03
- **Priority:** P1
- **Role and device:** Merchant owner, desktop 1280 px, then phone 375 px
- **Preconditions:** the store is not open for sale (yellow "Your store is not open for sale yet. Set up store" notice shows); one story exists.

| # | Step | Expected result |
|---|---|---|
| 1 | Open the story editor (Write). | The yellow notice is whole, including its bottom edge; the header (back arrow, title, EN/DE, Review and publish, menu) starts below it. |
| 2 | Open Review and publish, then go back. | Same on Review and on return to Write. |
| 3 | Reload and watch the loading state. | The loading bar sits below the notice too. Same for a keepsake edit screen. |
| 4 | Resize to 375 px. | Spacing is as before the fix; no gap or overlap. |
| 5 | Open a store where the notice is not shown. | The header sits flush at the top of the page, no extra gap. |

- **Postconditions:** none.
- **Result:** ☐ Pass ☐ Fail ☐ Blocked. Actual result, if failed:

- **Note:** scrolling the page down with the notice shown is checked by S8-UI-05 (fixed 04.11.2026: the header pins under the notice).

## Seeded stories and reviews (S8-SEED-STORY)

Run these after `pnpm exec tsx --env-file-if-exists=.env.local scripts/seed-curated.ts --stories-only` has run on dev (4 November 2026).

### S8-SEED-STORY-01 The seeded stories and reviews are in the Stories list
- **Story / AC:** Seed stories / standing order 19. **Priority:** P1. **Role and device:** Owner, desktop.

| # | Step | Expected result |
|---|---|---|
| 1 | Open Merchant > Stories. | 11 stories: 7 stories and the Bachmann, Coop and Migros reviews with EN and DE published, and the Manor review with both languages draft. The old prototype stories are gone. |
| 2 | Open "Crossing the Chapel Bridge". | The cover is a photo of the bridge with the Water Tower. The body has headings, short paragraphs and 8 photos, each with a caption. There is no Sources line. |

### S8-SEED-STORY-02 A guest reads a story in English and in German, with photos
- **Priority:** P1. **Role and device:** Guest, phone 375 px.

| # | Step | Expected result |
|---|---|---|
| 1 | Open /en/stories/the-dying-lion-of-lucerne. | Cover photo, headings, short paragraphs, 7 photos with captions, a bullet list under Visiting, reading time shown, no Sources line. |
| 2 | Switch to German (/de/stories/der-sterbende-loewe-von-luzern). | Natural German in the Sie form, same structure and photos, no English left, captions in German. |
| 3 | Tap a photo. | The photo opens larger, and its alt text is read by a screen reader (check with the reader on). |

### S8-SEED-STORY-03 Place pages show the main story
- **Priority:** P1. **Role and device:** Guest, phone.

| # | Step | Expected result |
### S8-UI-04 Every merchant editor has the same header, and no floating save bar
- **Story / AC:** UI consistency (owner 04.11.2026, option A of `/lab/editor-header`)
- **Priority:** P1
- **Role and device:** Merchant owner, desktop 1280 px
- **Preconditions:** one published keepsake, one draft story, one published place exist.

| # | Step | Expected result |
|---|---|---|
| 1 | Products > Keepsakes, open the published keepsake. | One bar at the top: a back arrow, the name, under it "● Published · Saved hh:mm", then EN / DE with a tick each, a → arrow (step 1 has no ← arrow), a red "Review and publish" button and a red-tinted bin button. No white bar floats at the bottom. |
| 2 | Point at the bin button. | A tooltip says "Delete keepsake". |
| 3 | Press the bin button, then Cancel. | The delete (or archive) question opens; Cancel closes it and nothing changes. |
| 4 | Press "Review and publish". | The Review and publish step opens; the red button leaves the header, and the line says what the checks say (for example "Ready to publish"). |
| 5 | Content > Stories, open the draft story. | The same bar: the story's name, "● English · Draft · Saved hh:mm", EN / DE, "Review and publish" and the bin button ("Delete story"). |
| 6 | Content > Places, open the published place. | The same bar: the name, "● Published · No changes", a → arrow, a red "Save changes" that is greyed out, and the bin button ("Delete place"). |
| 7 | Press the → arrow. | Step 2 "Text and photo" opens; the bar now has ← and → arrows. |
| 8 | Type one letter at the end of "Title in English". | The line says "Unsaved changes" and "Save changes" can be pressed. |
| 9 | Delete the letter again, then press the back arrow at the far left of the bar. | The Places list opens; nothing was saved. |
| 10 | Products > Keepsakes > Create. | The bar says "Not saved yet" with the red "Next"; no bin button. |

- **Postconditions:** none (nothing was saved).
- **Result:** ☐ Pass ☐ Fail ☐ Blocked. Actual result, if failed:

### S8-UI-05 The editor header stays under the store notice while the page scrolls
- **Story / AC:** owner 04.11.2026 option A; replaces the note under S8-STORY-FIX-01
- **Priority:** P1
- **Role and device:** Merchant owner, desktop 1280 px, then phone 375 px
- **Preconditions:** the store is not open for sale, so the yellow "Your store is not open for sale yet." notice shows.

| # | Step | Expected result |
|---|---|---|
| 1 | Open a story and scroll down to the end of the text. | The yellow notice stays whole at the top; the editor bar stays pinned right under it and never covers it. |
| 2 | Scroll the same way on a keepsake and on a place. | Same: the notice, then the bar; the step list on the left stays below the bar. |
| 3 | On the story, open Review and publish and scroll the checks on the right. | The phone preview and the checks column start under the bar and fit the window. |
| 4 | Close the notice with its ×, then scroll. | The bar pins at the very top of the window, with no gap. |
| 5 | At 375 px, scroll a story down. | The notice scrolls away; the bar pins at the top of the screen. |

- **Postconditions:** the notice is closed for this browser session.
- **Result:** ☐ Pass ☐ Fail ☐ Blocked. Actual result, if failed:

### S8-UI-06 On a phone the editor header's buttons are the laptop size, and a single Delete is an icon
- **Story / AC:** owner 04.11.2026 option A
- **Priority:** P2
- **Role and device:** Merchant owner, phone 375 px, then desktop 1280 px
- **Preconditions:** one published keepsake.

| # | Step | Expected result |
|---|---|---|
| 1 | Open the keepsake at 375 px. | The bar shows the back arrow, the name with its line, a red "Review" button and the bin button. The EN / DE switch sits under the bar with "English · Complete". |
| 2 | Compare the red button's height with the laptop's at 1280 px. | Both are the same height (36 px); the bin button is the same size at both widths. |
| 3 | At 375 px, press the → arrow next to "Step 1 of 3 · Details". | Step 2 "Options and variants" opens. |

- **Postconditions:** none.
- **Result:** ☐ Pass ☐ Fail ☐ Blocked. Actual result, if failed:

|---|---|---|
| 1 | Open the place pages of Weinmarkt, Jesuit Church, Spreuer Bridge, Lion Monument, Haus zum Fritschi, Alte Suidtersche Apotheke, both Chapel Bridge pins, Bachmann at Bahnhof Luzern UG, Coop Bahnhof Luzern and Migros Bahnhof Luzern. | Each shows its story or review as the main story link, in both languages. The three station shops also show a cover photo. |
| 2 | Open the Chapel Bridge story. | It names both Chapel Bridge pins' places. One story, not two. |
| 3 | Open the Manor Luzern place page. | No story link is shown, because its review is still a draft. |

### S8-SEED-STORY-04 More to discover
- **Priority:** P3. **Role and device:** Guest.

| # | Step | Expected result |
|---|---|---|
| 1 | Open "A pause on the Weinmarkt". | Three related stories: the old pharmacy, Fritschi and the Jesuit Church. |
| 2 | Open the Lion Monument story. | No related stories block. |

### S8-SEED-STORY-05 The Manor review stays a draft until it has a cover
- **Priority:** P2. **Role and device:** Owner, desktop.

| # | Step | Expected result |
|---|---|---|
| 1 | Open the Manor review in the editor. | Subject place Manor Luzern; Facts checked on 4 Nov 2026; no cover; both languages draft. |
| 2 | Try to publish. | Refused with "cover" missing. |
| 3 | Add a photo of the store as cover and publish both languages. | Publishes; the guest page shows the review and the Manor place page links to it. |

### S8-SEED-STORY-06 The stories step changes nothing on a second run
- **Priority:** P2 (developer). **Role and device:** Developer, terminal, under the Neon lock.

| # | Step | Expected result |
|---|---|---|
| 1 | From `api/`, run `scripts/seed-curated.ts --stories-only --dry-run` with the remote-database setting. | "Will upload 0 photos", "rewrite 0 story versions", "create 0 stories and reviews, skipping 11". |
| 2 | Run it again without `--dry-run`. | "Nothing was changed." |

### S8-SEED-STORY-07 Facts read right (editorial check)
- **Priority:** P3. **Role and device:** Owner or editor.

| # | Step | Expected result |
|---|---|---|
| 1 | Read each EN story against its sources in the data files (`api/scripts/seed-data/stories`). | No sentence copies a source. Dates and numbers match (Chapel Bridge about 1365 and the fire of 18 August 1993, Spreuer Bridge 1408, Jesuit Church 1666 to 1677, Lion Monument 1820 to 1821). |
| 2 | Open the opening hours in the Bachmann, pharmacy and Jesuit Church texts. | They match the operators' own pages and say "as of November 2026". |
| 3 | Read the Coop review. | It sends guests to coop.ch for hours and location. |
