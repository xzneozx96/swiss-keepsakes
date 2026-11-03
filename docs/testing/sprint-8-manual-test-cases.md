# Sprint 8 manual test cases

- **Sprint:** 8 (release 1 polish and first sales groundwork)
- **Stories covered:** E6.3 stock, E6.5 opening stock, E6.6 pickup points, E8.7 analytics events, E4.3 stories (the story editor), the Lark sync and plan docs.
- **What to test:** each PR's branch, or the integration branch once the PRs are merged in the order below.
- **Written:** 2026-11-03. Format: `docs/development-rules/shared/manual-test-cases.md`.

## Order of the PRs

The cases are grouped by PR, in this merge order. Test and merge in this order. The database migrations 0021, 0022 and 0023 must reach the dev database in number order.

| PR | Content | Cases |
|---|---|---|
| 1 | Lark sync and plan docs (T-LARK, T-DOCS) | S8-LARK-01 to 03 |
| 2 | E6.3 stock: inventory page, stock in the keepsake editor (migration 0021) | S8-INV-01 to 09 |
| 3 | E6.5 opening stock for the five Victorinox knives | S8-STOCK-SEED-01 to 04 |
| 4 | E6.6 pickup points (migration 0022) | S8-PICKUP-01 to 08 |
| 5 | E8.7 analytics events and the map card tip fix (migration 0023) | S8-EVENTS-01 to 07, S8-MAP-01 |
| 6 | E4.3 story editor | S8-STORY-01 to 28 |

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
| S8-PICKUP-02 | Two spans on one day show in the ticket | E6.6 / AC26 | P2 | ☐ Pass ☐ Fail ☐ Blocked | |
| S8-PICKUP-03 | A span past midnight is kept, and opens equal to closes is refused | E6.6 / AC26 | P3 | ☐ Pass ☐ Fail ☐ Blocked | |
| S8-PICKUP-04 | One language is enough for a pickup point | E6.6 / AC26 | P2 | ☐ Pass ☐ Fail ☐ Blocked | |
| S8-PICKUP-05 | Archive and restore a pickup point | E6.6 / AC26 | P3 | ☐ Pass ☐ Fail ☐ Blocked | |
| S8-PICKUP-06 | The limit of 100 counts active points only | E6.6 / AC26 (gate G-S8-PICKUP-LIMIT) | P2 | ☐ Pass ☐ Fail ☐ Blocked | |
| S8-PICKUP-07 | A restored point goes to the end of the list | E6.6 / AC26 | P2 | ☐ Pass ☐ Fail ☐ Blocked | |
| S8-PICKUP-08 | Two spans with the same day and opening time are refused | E6.6 / AC26 | P2 | ☐ Pass ☐ Fail ☐ Blocked | |
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

Counts: 65 cases. P1: 15, P2: 31, P3: 19.

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
| 1 | Open Products, Pickup points, and add "Shop Hertensteinstrasse" with an address and Monday to Saturday 10:00 to 18:00. | The point shows as a ticket with the line "Mon to Sat 10:00 to 18:00". |
| 2 | Add a second point with different hours. | Both tickets show in order. |
| 3 | Reload. | Both are still there with their hours. |

- **Postconditions:** two active pickup points.
- **Result:** ☐ Pass ☐ Fail ☐ Blocked. Actual result, if failed:

### S8-PICKUP-02 Two spans on one day show in the ticket
- **Story / AC:** E6.6 / AC26
- **Priority:** P2
- **Role and device:** Owner, desktop 1280 px
- **Preconditions:** one pickup point.

| # | Step | Expected result |
|---|---|---|
| 1 | Edit the point and add 14:00 to 18:00 on Monday after 09:00 to 12:00. | Both spans show in the editor. |
| 2 | Save. | The ticket line reads "Mon 09:00 to 12:00, 14:00 to 18:00". |

- **Postconditions:** the point has two spans on Monday.
- **Result:** ☐ Pass ☐ Fail ☐ Blocked. Actual result, if failed:

### S8-PICKUP-03 A span past midnight is kept, and opens equal to closes is refused
- **Story / AC:** E6.6 / AC26
- **Priority:** P3
- **Role and device:** Owner, desktop 1280 px
- **Preconditions:** one pickup point.

| # | Step | Expected result |
|---|---|---|
| 1 | Set a span that opens 22:00 and closes 02:00, then press Save. | The sheet saves. The ticket line shows the span the way the place hours editor shows one. |
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
| 1 | Add a point with a German name and address only, and press Save. | It saves. |
| 2 | Read the ticket. | It shows the missing-English notice. |

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
