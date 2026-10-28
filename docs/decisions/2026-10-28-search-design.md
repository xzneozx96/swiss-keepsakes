# Search design: option S2 "One list", with tours and interest tiles

- Date: 2026-10-28
- Status: **approved on 2026-10-28** (approval given in chat by the person who made the request)
- Changes: `docs/ux/search-design.md` (new), `docs/PRD/Swiss_keepsakes_PRD.md` (§11.1 search sentence, new AC94, revision note), `docs/development-plan/delivery-plan.md` (E4.14), `docs/development-plan/screen-inventory.md` (row `_guest/search.tsx` now C24, slice S2, D11)
- Source: the requester's message "for the search, I approve the S2 option, please remove the other item" on the lab page `/lab/home`

## Decision

- **Search is option S2 "One list".** One result list ordered by how well the title matches, each row naming its kind, with a filter when more than one kind is present. An empty field shows the four fixed interests as photo tiles, and a tile lists everything with that interest.
- **S1 "Grouped" is rejected** and was removed from the lab.
- **Tours are searched.** Search covers stories, places (pins), tours and keepsakes. Tour results open the free tour information page.
- **Wording is specific.** The field label and placeholder name what can be found and show real examples. The earlier generic "Search places and stories" is not used.
- **Every interest tile photo must depict its label.** Where no honest photo exists, use a typographic tile.

## Differences from the plan and the PRD

| Before | Now |
| --- | --- |
| E4.14 searched stories and pins only. Keepsakes were added in E6.9 | Stories, places and **tours** from E4.14. Keepsakes still from E6.9 |
| The PRD said only that in-app search finds pins | PRD §11.1 and new AC94 describe the list, the kinds, the filter, the interest tiles and the no-price rule |
| No empty-query design | The empty field shows the four interests |

## Not decided here

- ~~Where search is entered.~~ Decided on 2026-10-28 in `docs/decisions/2026-10-28-home-local-briefing.md`: the search pill in the hero of the approved home.
- Better photos for Food and drink and for Shopping and keepsakes (the owner may supply them).

Full specification and build notes: `docs/ux/search-design.md`.
