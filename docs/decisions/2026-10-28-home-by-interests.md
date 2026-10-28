# The home is organised by the interests, with a fifth interest

- Date: 2026-10-28
- Status: **superseded for the home layout by `2026-10-28-home-local-briefing.md`** (the home was approved there on 2026-10-28). The interest-organised structure below was approved the same day, then replaced when the requester approved "A local friend's briefing". Only the parts listed under "What still stands" remain in force.

**What still stands.**
- The fifth interest `local-activities`, "Local activities" (DE proposal "Lokale Aktivitäten"), and the interest order history-culture, food-drink, lake-mountains, shopping-keepsakes, local-activities. Onboarding and search use them (decision 2 and "Follow-up work in product code").
- Stay length only orders items, and nothing is hidden (decision 7), now applied to the routes and the food places on the home.
- Events are pins with dates, shown only while a date is ahead (decision 8). The home shows them in "While you're in town".
- Section titles are the same for every visitor, and the first screen never depends on the answers (decision 9).

**What is replaced.** The home sections by interest, the "Free and useful" section and its fixed `free` flag, the "More in Lucerne" strip, the default order and the answered order (decisions 3 to 6), the no-overlap rule (decision 4) and the kinds grouping on the home (decision 10). The `free` flag is no longer used by the home. Its replacement is a service type on a pin, and the build story (E4.2) decides whether to keep the flag.
- Changes: `docs/PRD/Swiss_keepsakes_PRD.md` (§3.3, §11.1, AC36, AC41, AC94, new AC95), `docs/adr/ADR-005`, `ADR-006`, `ADR-030`, `docs/ux/onboarding-design.md`, `docs/ux/search-design.md`, `docs/ux/pins-design.md`, `docs/development-plan/screen-inventory.md` (Area 2, D12), `docs/development-plan/delivery-plan.md` (E4.2, E4.13, E4.14)
- Source: the requester's messages of 28.10.2026 on the home redesign

## Why

All the home directions so far (a stay switch, four doors, need bars, a local's walk) asked the visitor again what the onboarding flow had already asked: how long they stay and what they like. The requester rejected them for that reason and chose a **content-only home**: no selectors, and the page is organised around the interests the guest already picked.

## Decision

1. **The home has no selectors.** No stay switch, doors, need bars, chips or tiles that pick a need or an interest, and no extra prompt for a visitor who has not answered (the onboarding flow and the story nudge card cover that).
2. **Five fixed interests.** A fifth interest is added to the four of PRD §3.3: `local-activities`, "Local activities" (DE proposal: „Lokale Aktivitäten"). It is where markets, concerts and meetups live. The list order for onboarding and search is: history-culture, food-drink, lake-mountains, shopping-keepsakes, local-activities.
3. **The home sections are the five interests, one section each, plus one section outside the interests:** "Free and useful" (`free-useful`: free water, toilets, SIM card information and other free facilities). It is driven by a **fixed flag `free`** on a pin, not by the merchant-edited "Free essentials" category. A small "More in Lucerne" strip at the very end holds any item that belongs to no section.
4. **No overlap.** An item is shown once, in the first section, in that visitor's order, that it belongs to. An item belongs to the sections of its own interests, plus `free-useful` when it carries the flag. A tour belongs to the sections of its own interests (Rigi and Pilatus under Lake and mountains, "The Things That Remain" under History and culture). Keepsakes belong to Shopping and keepsakes. An item with no interest and no flag goes to "More".
5. **Default order (no answers, or skipped):** Lake and mountains, Free and useful, Food and drink, Local activities, History and culture, Shopping and keepsakes, then More. The requester gave the order sightseeing, free things, food and drink, history and culture, keepsakes. Where Local activities sits (after Food and drink) is a proposal.
6. **An answered visitor:** their first chosen interest (the earliest in the default order) first, then Free and useful, then their other chosen interests in default order, then the remaining sections, then More. **Nothing is hidden.** Keepsakes may move up if the visitor chose Shopping and keepsakes; they are last only by default.
7. **Stay length only orders items inside a section** (items tagged for the visitor's stay first, an untagged or "both" item matches either). It never creates a section. The earlier "a few hours" and "a few days" sections are gone.
8. **Events** are pins with dates. They sit in their interest section (normally Local activities), listed first while a date is ahead, soonest first. An event whose last date has passed shows nowhere.
9. **Section titles are the same for every visitor.** The server renders the same HTML for everyone and the client re-ranks after load, so titles are declarative ("Lake and mountains", not "Only a few hours?"). The first screen (hero, search, map entry) never depends on the answers. The only personalisation signal on the page is the existing "Sorted for … · Change" line.
10. **Kinds never mix inside a section** (added on 2026-10-28 at the requester's request: a place next to a story next to a tour was confusing). Inside each interest section the items are grouped by kind, each group with a small label, in this order: events ("What's on"), stories, places, tours. Only the kinds the section has are shown, and the ranked order is kept inside each group. Lab rule: `kindGroups` in `front-end/src/features/lab/home-data.ts`.

## What this changes

- **PRD:** §3.3 lists five interests; AC36, AC41 and AC94 say five; §11.1 adds the fixed `free` flag; new AC95 describes the home structure; revision note 10.
- **Approved designs that now have five interests:** the onboarding flow step 2 (a fifth card), the search empty field (a fifth tile) and the pin editor (a fifth interest chip and the `free` switch).
- **Plan:** E4.13 (home) is rewritten around the sections; E4.14 (search tiles) and E4.5 (onboarding) get the fifth interest; E4.2 (pins) gets the `free` flag.
- **Inventory:** Area 2 is rewritten, the slice goal changes, and D12 records this decision.

## Follow-up work in product code (not done here)

The four interest codes exist in product code and the database. A fifth interest and the flag need a story:
- `packages/domain/src/content/localized.ts` and `packages/api-contract/src/content.ts` (and the generated `schema.ts` and `openapi.json`): add `local-activities`.
- `api/migrations/0007_platform_helpers.sql` defines the allowed codes, and `api/test/integration/content-schema.test.ts` checks them: a new migration must add `local-activities` to the check.
- A new boolean column `free` on pins, with the merchant switch.
- `docs/specs/001-storytelling-pivot/data-model.md` lists the codes.
Existing rows tagged for events keep their interests; the merchant retags events as `local-activities`.

## Open points

- The German label „Lokale Aktivitäten" and the Vietnamese label need review by the merchant.
- The photo for the fifth interest. The search tile uses `lucerne-old-town` (people in a lively old-town square), the same photo-tile style as the other four. A photo of an actual event or market would fit better if the owner supplies one.
- The label was shortened from "Local life and events" to "Local activities" on 2026-10-28 at the requester's request (code `local-activities`).
- Whether Keepsakes should stay last for visitors who did not choose Shopping and keepsakes (the default order keeps them last).
- The home layouts (three variants) are being designed; this record does not approve any of them.
