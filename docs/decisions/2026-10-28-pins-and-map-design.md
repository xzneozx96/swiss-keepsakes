# Map and pins design: guest map B "Cards" and merchant editor S "Steps"

- Date: 2026-10-28
- Status: **design approved on 2026-10-28** (approval given in chat by the person who made the request). Seven differences from PRD v3 came with the design. They were put to the requester the same day and are settled in the table below. One stays open: the folded map credits.
- Changes: `docs/ux/pins-design.md` (new), `docs/PRD/Swiss_keepsakes_PRD.md` (§11.1, AC42, AC88, AC89, new AC93, revision note 8), `docs/adr/ADR-006`, `ADR-029`, `ADR-030`, `docs/specs/001-storytelling-pivot/data-model.md` and `architecture.md` (amendment notes), `docs/development-plan/screen-inventory.md` (N02, N03, N16, N17, D10), `docs/development-plan/delivery-plan.md` (E4.2, E4.6, E4.7)
- Source: the requester's message "current design on /lab/pins is approved", on the lab page built by a coding agent the requester started on 2026-10-28
- Related: `docs/decisions/2026-10-27-map-pins-and-events.md` (the pin model and the map rules this design implements)

## Intent

Slice S4 needed designs for the guest map and pin card (N02, N03) and for the merchant pins list and editor (N16, N17). A coding agent built one lab page, `/lab/pins`, that shows the merchant dashboard beside the guest phone on one shared list of pins, so an edit in the editor shows on the map as it is typed. The requester approved the page as it opens.

## What is approved

"The current design" is the state the lab page opens in:

- **Guest map and pin card (N02, N03): option B "Cards".** Photo pins. A Categories button opens the app's sheet of top-level categories (checkboxes, Select all, Deselect all, Clear filter). A row of place cards above the tab bar swipes in step with the pins. "Show more" opens the place in the app's sheet, laid out like the tour stop sheet, with a photo carousel and Previous and Next place. A Map and List switch gives a list alternative. The lab marks this option "(chosen)".
- **Merchant pins list (N16):** the one list design in the lab, a table on desktop and rows on phones.
- **Merchant pin editor (N17): option S "Steps, like the tour editor".** Six steps: Place on the map, Text and photo, Hours and dates, Categories and tags, Story and link, Review and publish.
- **Tour route map panel:** the route map on the same flat style as the guest map.

Not covered by this decision: the category editor N23 (not designed yet), the media library N18 (designed later, see `docs/decisions/2026-10-29-media-library-design.md`), and the Wanderlog-style map option W, which stays in the lab only as a rejected alternative.

## Rejected (kept in the lab for reference)

- Guest map: W "Wanderlog" (round pins in category colours with rank numbers), A "Sheet" (floating chips and one draggable sheet), C "Numbers" (numbered pins, Map and List switch and a full sheet card).
- Merchant editor: A "One page with a section bar", B "Tabs and a save bar", C "Form and live guest card".

## Differences from PRD v3 and how they were settled

The design did things the PRD, ADRs or data model did not say. The requester decided each one on 2026-10-28.

| # | Design | PRD v3 said | Decision | Documents changed |
| --- | --- | --- | --- | --- |
| 1 | The card's directions action is one link, "Open in Google Maps", opened in a new tab (the Google Maps app opens on phones that have it). Destination only | "Open in Google or Apple Maps" (§11.1, AC89) | **Google Maps only.** | PRD §11.1, AC42, AC89, ADR-006, architecture |
| 2 | A pin has a main photo and more photos. The "Show more" sheet has a photo carousel | One shared photo (§11.1) | **Several photos.** | PRD §11.1, ADR-029, data model note. **Follow-up:** E4.2 designs the ordered table for the extra photos, and N18 (media library, now designed in `docs/ux/media-design.md`) lists the pins that use a photo, and who orders a pin's extra photos is open |
| 3 | A Categories button opens a sheet of top-level category checkboxes. The map dims the pins outside the chosen categories. The list and the card row hold only the chosen ones | A chip rail that highlights and dims, with no pin hidden by a chip (§11.1, AC88, E4.6) | **Keep the sheet.** | PRD §11.1, AC88, E4.6, ADR-030, architecture |
| 4 | A Map and List switch gives a ranked list of the same pins | Not mentioned | **Accepted with the approval.** New AC93 | PRD §11.1, AC93, E4.6 |
| 5 | Option B folds the credits to one short line (© swisstopo · © OpenStreetMap) with an info button that shows all four | The four credits are shown (§11.1, ADR-006) | **Open.** Check the providers' terms. If folding is not allowed, show all four | Noted in ADR-006 and the spec. No PRD change |
| 6 | "Show more" opens a modal sheet (`SheetFrame`) with Previous and Next place | Not mentioned | **Accepted with the approval.** | PRD §11.1 |
| 7 | The lab needed small edits to shared components: optional `container` and `tightBottom` on `SheetFrame`, an optional `quietTitle` on `StepLayout`, and a new `OpenInMapsIcon` export | Product code outside the lab | **Accepted: commit them with the lab files.** Review them in the code review of E4.2 and E4.6 | None |

## What this changes (once the differences are settled)

- `docs/ux/pins-design.md` is the specification a coding agent reads when it builds E4.2, E4.6 and E4.7.
- The inventory rows N02, N03, N16 and N17 and the stories E4.2, E4.6 and E4.7 point to it.
- Differences 1 to 4 and 6 are now written into the PRD, the plan and the ADR notes (see the table). The data model still needs the extra-photo table (E4.2).

## Not verified

- I read the lab code and the page's own notes and opened the page on desktop. I did not click through every state, and I did not test the page on a phone, with a screen reader or with reduced motion.
- The German copy in the lab is unreviewed.
- Whether the lab files are committed: at the time of writing they were not.
