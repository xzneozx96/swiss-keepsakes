# Phase 2 round 2: gift-vs-tour visual comparison

Reviewer pass, 14 October 2026. No source code was edited.

**Scope.** The owner asked the tour screens to reuse the approved gift flow's visual style only. This review flags only differences in card surfaces, radius, type, spacing, chips, buttons, rows, sheets, banners and tiles. It does not flag a difference that exists because a booking has other content or steps. The visual-vs-UX test used throughout: a change is UX if it adds, removes or reorders a section, changes copy, adds an interaction, or comes from the data. Everything else is visual.

**Method.**
- I looked at every `*-gift-*` / `*-tour-*` pair in `screens/2.4-r2` … `2.14-r2` side by side, sliced at the same scroll position and scaled to the same width.
- I also looked at every other tour shot in those folders:
  - every DE shot, guest and merchant, at 375 and 1024;
  - the state variants: sold out, over capacity, signed out, pay later, expired, reconciliation, C12 old link, overdue (merchant decides), delivered with debt, ready to complete, P02 at 1024.
- I did not review the five keyboard-focus crops (`*-focus-*`). They are evidence of focus, not of style.
- The guest shots are 2× (750px wide). The merchant shots are 1× (375 or 1024px). The P02 gift shots are 2× copies from 1.9t. All values below are in CSS px.
- Every class cited comes from the source at the `file:line` given. Measured gaps are marked as measured.
- Where a live gift shot could stand in for the approved one, I checked:
  - `c16-deadline-gift-en.png` is pixel-identical to the approved `phase1-review/round3/img/1.13-r3-01-c15-payment-due-en-375.png` (AE 0).
  - `c14-gift-en.png` matches the approved 1.12s orders list (`round2/img/1.12-02-account-orders-en-375.png`) in styling. I compared them by eye, not by diff, because the seeded orders differ.

**Verdict rule.**
- **Inconsistent:** at least one high fix.
- **Minor gaps:** medium or low fixes only.
- **Consistent:** no fixes.

**Severity.**
- **High:** visibly inconsistent at a glance.
- **Medium:** noticeable when the pair is compared.
- **Low:** a detail.

All paths below are relative to `front-end/src/` unless they start with `docs/` or `screens/`. `screens/` means `docs/ux/prototype/screens/`.

## 1. Pairing table

| Tour screen (step, owner) | Gift reference | Pair images (`screens/`) | Verdict |
| --- | --- | --- | --- |
| C10 Departure and group (2.4, R1) | C03 choice sheet and QuantityBox (1.4, 1.5d) | `2.4-r2/c10-gift-en.png`, `c10-gift-sheet-place-en.png` ↔ `c10-tour-en.png`, `c10-tour-de.png`, `c10-over-capacity-tour-en.png`; side by side `c10-side-by-side-en.png` | **Inconsistent** (1 high) |
| C11 Review booking (2.5, R1) | C06 Review and send (1.7b) | `2.5-r2/c11-gift-en.png` ↔ `c11-tour-en.png`, `-de.png`, `c11-signed-out-tour-en.png`, `c11-pay-later-tour-en.png`; `c11-side-by-side-en.png` | Minor gaps |
| C05 Sign-in from C11 (2.5, R1) | C05 (1.6r) | `2.5-r2/c05-gift-en.png` ↔ `c05-tour-en.png`; `c05-side-by-side-en.png` | Consistent (same screen) |
| C13 Booking confirmed (2.8, R1; money card R2) | C07 Request sent (1.8r) | `2.8-r2/c13-gift-en.png` ↔ `c13-tour-en.png`, `-de.png`, `c13-pay-later-tour-en.png`; `c13-side-by-side-en.png` | Minor gaps |
| C14 Tour bookings list (2.9, R2) | Account hub orders list (1.12s) | `2.9-r2/c14-gift-en.png` ↔ `c14-tour-en.png`, `-de.png` | Minor gaps |
| C16 Guest booking detail (2.9, R2) | C15 order detail (1.13r/s/t, round 3) | `2.9-r2/c16-deadline-*`, `c16-balance-*`, `c16-activity-*`, `c16-reviewed-*` (gift ↔ tour, tour also DE) | **Inconsistent** (1 high) |
| Expiry and late-payment states on C16 and the C12 old link (2.7, R2) | C15 overdue headline and money-after-cancellation note (1.13r/s) | `2.7-r2/c16-expired-gift-en.png` ↔ `c16-expired-tour-en.png`; `c16-expired-reconciliation-gift-en.png` ↔ `c16-expired-reconciliation-tour-en.png`; `c12-expired-tour-en.png` (no gift pair) | Minor gaps |
| M02 tour work (2.10, R3) | M02 Today widgets (1.9r/s/t) | `2.10-r2/m02-375-gift-en.png` ↔ `m02-375-tour-en.png`; `m02-1024-gift-en.png` ↔ `m02-1024-tour-en.png` (gift shot = whole Today part, tour shot = tour block) | Minor gaps |
| M05 Departures (2.10, R3) | M03 tickets and table (1.10b/c) | `2.10-r2/m05-375-gift-en.png` ↔ `m05-375-tour-en.png`; `m05-1024-gift-en.png` ↔ `m05-1024-tour-en.png` | Minor gaps |
| M06 Guest list (2.11, R3) | M03 ticket, M04 header | `2.11-r2/m06-375-gift-en.png` ↔ `m06-375-tour-en.png`; `m06-1024-gift-en.png` ↔ `m06-1024-tour-en.png` | **Inconsistent** (1 high) |
| M07 Booking detail (2.12, R3) | M04 order detail (1.11s, 1.15r) | `2.12-r2/m07-375-gift-en.png` ↔ `m07-375-tour-en.png`; `m07-1024-*` | Minor gaps |
| Tour M08 Record payment (2.12, R3) | M08 (1.15r) | `2.12-r2/m08-375-*`, `m08-1024-*` (both show the open sheet) | Consistent |
| M07 completion actions (2.13, R3) | M04 fulfilment (1.15r) | `2.13-r2/m07-delivered-debt-*`, `m07-ready-to-complete-*`. The gift shot here is the same image as the 2.12 gift (SK-1021 "ready", lock reason "Not handed over yet"); I compared against the approved `phase1-review/round3/img/1.15-02-m04-handed-over-complete-locked-en-375.png` and `1.15-04-m04-handed-over-paid-en-375.png` instead | Minor gaps (DE button layout, see M07 fix 2) |
| P02 tour rows (2.13, R3) | P02 (1.17r, 1.9t) | `2.13-r2/p02-375-*`, `p02-1024-*` | Consistent (same component) |
| M07 overdue states (2.14, R3) | M04 decision block (1.11s) | `2.14-r2/m07-overdue-375-gift-en.png` ↔ `m07-overdue-grace-375-tour-en.png`, `m07-overdue-merchant-*`; 1024 likewise | Minor gaps |

## 2. Fixes per screen

Fixes are grouped by owning worker and ordered high → low inside each screen. "Shared" marks a fix that touches a file another worker also renders. Coordinate those before editing.

### R1: C10, C11, C13

#### C10 Departure and group

Tour file: `features/tours/discovery/tour-selection-page.tsx`. Gift reference: `features/catalog/components/gift-detail.tsx` (`GiftSheet`, :480–640).

1. **High: departure tiles are three times further apart than C03's option tiles.**
   - Tour (measured): 24px between tiles, and about 32px from the "Departure" label to the first tile.
   - Gift: 8px between tiles, and 8px under the label. C03 uses `TagGroup.List className="grid grid-cols-3 gap-2 pt-2"` (:528) under `Label className="text-heading"` (:526).
   - Cause: HeroUI gives every radio in a vertical RadioGroup a 16px top margin (`.radio-group[data-orientation=vertical] [data-slot=radio]{margin-top:calc(var(--spacing) * 4)}` in `@heroui/styles/dist/heroui.min.css`). That margin adds to `gap-2` on the RadioGroup (:126) and `pb-2` on the Label (:130).
   - Fix: zero the margin on the tile `Radio` (:139). Check in the browser that `mt-0` beats the HeroUI selector; use `!mt-0` if it does not. Also drop `pb-2` from the Label.
   - Re-measure: tile to tile 8px, label to first tile 8px.
2. **Medium: sticky header title is 14px sans.**
   - Tour: `<span className="min-w-0 truncate text-sm font-semibold">` (:105).
   - Gift: the in-flow headers show a serif title (C04 `cart-view.tsx:171` and C06 `review-view.tsx:83`, `font-serif text-title`), and so does C11 (`tour-review-page.tsx:146`).
   - Fix: keep the tour name and keep the body h1, but style the header title like the gift compact bar title, `min-w-0 flex-1 truncate font-serif text-card-title` (`components/layout/cart-button.tsx`, CompactBar, :156–188).
3. **Low: the selected tile only colours its first line.**
   - Tour: `group-data-[selected=true]:text-accent-soft-foreground` is on the date span only (:148). The price and policy `Description`s (:152, :156) stay grey on the soft red tile.
   - Gift: the selected C03 tag colours the name and the price.
   - Fix: add the same group-selected colour to both Descriptions. Keep the radio dot; it carries selection without colour.
4. **Low: the closing note is a tinted, bordered box.**
   - Tour: `InfoNote` (`alert--soft alert--info`, :282).
   - Gift: C03 ends the sheet with a plain icon line, `<p className="flex items-start gap-2 text-sm">` + `InfoIcon className="mt-0.5 shrink-0 text-muted" size={16}` (gift-detail.tsx:618–625).
   - Both styles are approved gift styles: InfoNote opens C06. Use the C03 line here only if the coordinator wants C10 to read as the C03 sheet.

#### C11 Review booking

Tour file: `features/tours/booking/tour-review-page.tsx`. Gift reference: `features/checkout/components/order-card.tsx`, `review-view.tsx`.

1. **Medium: the key figure is laid out differently.**
   - Tour: "Pay now" is an inline row, `flex items-baseline justify-between gap-3`, with dt `text-sm font-medium` and the serif figure right-aligned (:313–317).
   - Gift: C06 stacks a muted label over a left-aligned serif figure, `flex flex-col gap-0.5`, label `text-sm text-muted`, value `font-serif text-title tabular-nums` (order-card.tsx:113–115).
   - Fix: render the "Pay now" row with those three classes. Keep it in the same row position so the row order does not change.
2. **Medium: serif name beside the thumbnail.**
   - Tour: the tour name next to the 64px photo is `SurfaceCardTitle` (`font-serif text-card-title`, :167).
   - Gift: C06 uses serif only for the card title ("Order 1", order-card.tsx:82). The product name beside the photo is sans `font-semibold leading-snug` (order-card.tsx:172).
   - Fix: give the tour name `font-semibold leading-snug` and keep it an h2.
3. **Low: icon rows mix three tones.**
   - Tour: the date is `font-medium` (:175), the group is `text-sm text-muted` (`GroupSummary`, `booking-summary.tsx:50`), and "Where to meet:" is `text-muted` (:185).
   - Gift: C06 icon rows are plain `text-sm` (order-card.tsx:50).
   - Fix: plain text on all three rows at this call site. `GroupSummary` is shared with C13 and C14, so override locally.
4. **Low: card spacing.**
   - Tour: the cards are direct children of the `gap-5` column (:156), so 20px apart.
   - Gift: C06 stacks its cards in `flex flex-col gap-4 pt-1` (review-view.tsx:118), so 16px apart.
   - Fix: wrap the four cards in the same `gap-4 pt-1` stack.

Checked and consistent:
- header (same classes as C06);
- intro InfoNote;
- error Alerts (`alert--soft`, `size="sm" variant="tertiary"` buttons, as C06);
- "Edit departure or group" link row (C07 footer classes);
- cancellation heading (`text-sm font-medium`, the C06 accordion trigger style);
- signed-out block (C05 heading voice);
- full-width `size="lg"` bar button.

#### C13 Booking confirmed

Tour files: `features/tours/booking/tour-confirmed-page.tsx`, `booking-summary.tsx` (R1); `BookingMoney` and `BookingActions` in `guest-tour-booking-page.tsx` (R2). Gift reference: `features/checkout/components/request-sent.tsx`, `order-card.tsx`.

1. **Medium: the card opens with a chips-only block** (Shared: C16 renders the same blocks; apply together with C16 fix 1).
   - Tour: block 1 holds only `BookingStatusLabels` (tour-confirmed-page.tsx:63). The title and icon rows follow in the next block (booking-summary.tsx:66–75).
   - Gift: the C07/C06 card puts serif title → reference → chips → icon rows in one block (order-card.tsx:81–95; status slot request-sent.tsx:136–140).
   - Fix: move the chips under the title inside the same block. Nothing leaves the card.
2. **Medium: reference and meeting point as stacked label/value pairs** (Shared with C16).
   - Tour: muted dt above dd (`booking-summary.tsx:86–117`).
   - Gift: C07 shows the reference as one muted line under the title (`text-sm text-muted tabular-nums`, request-sent.tsx:137) and the place as a `PickupIcon` row (order-card.tsx:91). C11 already shows the meeting point as a `PickupIcon` row (tour-review-page.tsx:185).
   - Fix: reference as that muted line; meeting point as a fourth icon row. Contact, child's name and answers can stay in the dl block.
3. **Medium: section rhythm is half of C07's.**
   - Tour: one `gap-5` column (:36), with ad-hoc `pb-5` on the header (:37) and a `pt-5` wrapper around the trip profile (:93). So the summary card, the "Booking total" section and the buttons all sit 20px apart.
   - Gift: C07 puts `gap-10` between sections that have their own heading (request-sent.tsx:51), and `flex flex-col gap-4` inside a section (:69).
   - Fix:
     - `gap-10` page column, so 40px between the header, the summary card, the "Booking total" section and the trip profile;
     - Pay, Add to calendar and View booking in the "Booking total" section's `gap-4` stack, under the money card (once C16 fix 5 lands, Pay is inside the card);
     - drop the `pb-5` and `pt-5` patches.
4. **Low: mixed button heights.**
   - Tour: "Add to calendar" and "View booking" use the default size (`buttonVariants({ variant: "secondary", fullWidth: true })`, :69–92). Pay above them is `size="lg"` (BookingActions, guest-tour-booking-page.tsx:290).
   - Gift: C07's full-width action is `size: "lg"` (request-sent.tsx:106).
   - Fix: add `size: "lg"` to both secondary buttons.
5. **Low: no key figure in the money card (R2's BookingMoney).**
   - Tour: C13 shows the balance as a semibold row (guest-tour-booking-page.tsx:235). The C15 grammar is right for C16, which shares the component.
   - Gift: C07 leads its money block with a serif key figure, as C11 does.
   - No action unless the coordinator wants C13 to repeat C11's serif figure. See cross-cutting item 5.

C05 sign-in is the same screen on both paths. Its copy is an owner item (§4).

### R2: C14, C16, expiry states

#### C14 Tour bookings list

Tour file: `features/tours/booking/tour-booking-list.tsx`. Gift reference: `features/transactions/components/transaction-list.tsx`.

1. **Medium (coordinator decision, gift file): two ticket surfaces on one account hub.**
   - Gift: `rounded-2xl border border-separator bg-surface`, no shadow (transaction-list.tsx:90).
   - Tour: `rounded-3xl bg-surface shadow-surface`, no border (tour-booking-list.tsx:74).
   - The radius (16px vs 24px), border and shadow all differ. The approved 1.12s list has the bordered ticket. The owner's later 1.13s rule is "shadow, no solid borders".
   - Pick one. I recommend moving gift `OrderTicket` to the shadow surface. That edits a gift file and needs a gift pixel regression, so it is the coordinator's call. Do not change the tour side until it is decided.
2. **Low: the group line has no icon.**
   - Tour: the second meta row (`GroupSummary`, `text-sm text-muted`) has no icon, while the time row above it has `ClockIcon` (:94–98).
   - Fix: put the group in the same `flex min-w-0 items-center gap-1.5 text-sm text-muted` row with `TravelGroupIcon` size 16, as C11 and C13 do.

#### C16 Guest booking detail

Tour files: `features/tours/booking/guest-tour-booking-page.tsx`, `expired-notice.tsx`, `features/tours/reviews/tour-booking-review.tsx`; R1's `booking-summary.tsx` and `components/surface-card.tsx`. Gift reference: `features/transactions/order-detail/components/order-detail.tsx`.

1. **High: no ticket header.**
   - Gift: C15 opens with the pickup ticket (order-detail.tsx:136–159):
     - `DateTile size="lg"`;
     - serif title `line-clamp-2 font-serif text-card-title`;
     - muted icon line;
     - `Media className="size-14 shrink-0 rounded-xl"`;
     - chips `flex flex-wrap gap-2 px-4 pb-4`.
   - Tour: C16 opens with a chips-only block (guest-tour-booking-page.tsx:64–69), then a serif title with no date tile and no photo. The first screen reads as a different design from both C15 and the tour's own C14 row.
   - The tour C14 row already renders this header from existing data (tour-booking-list.tsx:78–104).
   - Fix: build the C16 first block like the C15 ticket: DateTile `lg` (departure), serif tour name, clock and group rows, chips under them.
   - The 56px photo is optional. C16 does not show one today, so the coordinator may count it as added content. The DateTile and the move of the chips under the title are pure restyle.
   - Shared: R1's `BookingSummary` block 1 changes too. Agree with R1 who owns it; C13 fix 1 is the same move.
2. **Medium: "Booking activity" heading over nothing.**
   - Tour: the h2 at guest-tour-booking-page.tsx:127 always renders, but the stepper renders only if `activity.length > 0` (:129). On SK-T1042, SK-T2001 and SK-T2004 the heading is followed straight by "Contact the organiser" (`c16-deadline-tour-en.png`, `-de.png`).
   - Gift: C14 renders no heading for an empty section (transaction-list.tsx:54, :66: `open.length > 0` / `past.length > 0` guards).
   - Fix: wrap the heading and the stepper in the same `activity.length > 0` guard. No copy changes.
   - Adding an empty-state line instead needs a new key; that option stays with the owner (§4).
3. **Medium: solid rules where C15 uses dashed ones.**
   - Gift: C15 separates the ticket header from the headline and actions, and the items from the amounts, with `border-t border-dashed border-separator` (order-detail.tsx:166, :345).
   - Tour: every C16 card uses SurfaceCard's solid `divide-y divide-separator` (surface-card.tsx:14), including BookingMoney's price → totals → deadline blocks (guest-tour-booking-page.tsx:193–258).
   - Fix: dashed top border on the block under the ticket header, and between price lines and totals.
   - This is item 6 in the worker's "left alone" list. It is visual.
4. **Medium: card padding mixes 16px and 20px on one page.**
   - Gift: C15 pads `p-4` (order-detail.tsx:140, :166, :378, :418).
   - Tour: C16 blocks pad `p-5` (`SurfaceCardBlock`, surface-card.tsx:25; payment rows `p-5`, :331). The activity stepper pads `p-4` (timeline-steps.tsx:23).
   - Fix: `p-4` on C16 blocks.
   - R1 reported that a smaller utility in `className` loses to the component's default (Tailwind orders same-property utilities by value). So `className="p-4"` on `SurfaceCardBlock` is not enough. Use a padding option agreed with R1, who owns surface-card.tsx, or local blocks.
5. **Medium: the Pay button sits outside the card** (Shared with C13).
   - Gift: C15 places headline → Pay (`primary`, `lg`, full width) → secondary action inside the ticket's dashed block (order-detail.tsx:166, :228–249).
   - Tour: `BookingActions` renders on the page under the money card (:82, :290).
   - Fix: render BookingActions as the last block of the money SurfaceCard, under the StateHeadline, in `flex w-full flex-col gap-2`. The order is unchanged.
6. **Low: the detail list has no icons** (Shared with C13 fix 2).
   - Tour: "Booking reference / Where to meet / Who should we contact? / Child's name" is a plain dt/dd list (booking-summary.tsx:86–117).
   - Gift: C15's detail card ("Confirmed pickup", order-detail.tsx:281) gives each fact a 24px leading icon, a small muted label and a larger value.
   - Fix: once C13 fix 2 lands, use the same icon rows here.
7. **Low: processing payment chip tone.**
   - Tour: `warning` (guest-tour-booking-page.tsx:352–360).
   - Gift: `info` (C15 hook, `features/transactions/order-detail/hooks/use-order-detail.ts:343–348`).
   - Fix: processing → `info`.
8. **Low: posted review on a white card.**
   - Tour: `SurfaceCard` (tour-booking-review.tsx:118).
   - Gift: the approved 1.13t review is a grey inset, `flex flex-col gap-3 rounded-2xl bg-surface-secondary p-4` (`features/reviews/components/order-reviews.tsx:82`).
   - Fix: the worker chose white because the review sits on the page, not inside a card. If the coordinator wants parity, put the inset inside a SurfaceCard block.

Checked and consistent:
- top bar (`text-[17px] font-semibold`, same header string as C15);
- `px-4` gutter and `gap-8` sections;
- sans section headings;
- payment history rows;
- policy rows;
- `TimelineSteps`;
- Email and Call buttons;
- white note Alerts.

The empty "Booking activity" heading is an owner item (§4).

#### Expiry and late-payment states (2.7)

Tour files: `features/tours/booking/expired-notice.tsx`, `guest-tour-booking-page.tsx`.

1. **Medium: the expired headline is its own card.**
   - Gift: C15 puts the overdue headline and "Request again" inside the ticket, under the dashed rule (order-detail.tsx:166–168, :240).
   - Tour: `ExpiredNotice` renders a separate `SurfaceCard` under the summary card (expired-notice.tsx:55).
   - Fix: on C16, render it as the ticket's last block with a dashed top border, together with C16 fix 1. Keep the standalone card for the C12 old-link view, where there is no ticket.
2. **Low: padding.** The expired block pads `p-5` against C15's `p-4`. This is the same fix as C16 fix 4.

Checked:
- danger `StateHeadline` and the `size="lg"` full-width primary "Check availability again" (expired-notice.tsx:68) match C15's headline and "Request again".
- The reconciliation note is the white C15 Alert shape (`Alert className="w-full" status="danger"`, :86). Its tone is a decision (§4).

### R3: M02, M05, M06, M07, M08, P02 tour parts

#### M02 tour work

Tour file: `features/tours/merchant/today-queue.tsx`. Gift reference: `features/merchant/today/components/merchant-today.tsx`, `overview-analytics.tsx` (`Widget`), `components/stat-card.tsx`.

1. **Medium: "Tour balances to collect" is a bare card beside a widget.**
   - Tour: a `StatCard isLarge` with an icon tile, inside `<dl className="lg:col-span-2">` (:272–280), next to the "Next departures" `Widget`.
   - Gift: the row pairs two Widgets. `CollectWidget` is `Widget className="lg:col-span-2"`, with the title in the grey frame and the total `text-3xl font-semibold tracking-tight tabular-nums` in the white inner card (merchant-today.tsx:200–206; frame classes overview-analytics.tsx:67–80).
   - At 1024 the tour's right column has no frame and its title sits inside the card.
   - Fix: wrap the figure in `Widget` (title `tourMerchant.todayCollect`) with the gift total classes. Drop the icon tile. No new copy.
2. **Medium: task counts are coloured.**
   - Tour: the value is `task.danger ? "text-danger" : "text-warning"` (:183).
   - Gift: 1.9t task tiles keep ink values (`Tile`, merchant-today.tsx:119–146). Colour appears only in the alerts card rows (`text-danger` / `text-warning`, :174, :182).
   - Fix: ink values, as the gift tiles. If the owner wants the warning colour kept, that is a decision for them; the worker's reason is in 2.10-r2 §6.
3. **Low: the next-departure date tile loses the big day number.**
   - Tour: `w-14`, three lines; day and month `text-xs`, time `text-sm font-semibold` (:222–236).
   - Gift: Next pickups tile is `w-12`, with weekday `text-xs leading-4 font-medium`, day `text-lg leading-6 font-semibold`, month `text-xs` (merchant-today.tsx:285–297).
   - Fix: the gift tile. Move the time into the sub-line (`text-sm text-muted tabular-nums`, :251), e.g. "10:00 · 5 of 12 booked".
4. **Low: link position.**
   - Tour: "All departures" sits in the section header (:153).
   - Gift: "All orders" sits in the widget's `actions` slot (merchant-today.tsx:264).
   - Fix: move the link into the Next departures Widget `actions`. Skip this if the coordinator counts it as moving an action.
5. **Low: in DE the task-tile counts sit at different heights.**
   - Tour (`m02-1024-tour-de.png`): each tile has a hint under its count (:189). The hints run two to four lines in DE, so the counts end up at different heights across the row ("1" and "2" are about 30px apart).
   - Gift: the Today tiles have no hint, so their values line up.
   - Fix: line the rows up with `StatCard isSubgrid` on a grid whose direct children are the tiles, as M04 KeyFacts does (order-sections.tsx:124–140). The current `li` wrapper (:166) has to go for the subgrid to work.

#### M05 Departures

Tour file: `features/tours/merchant/departures-page.tsx`. Gift reference: `features/merchant/orders/components/order-rows.tsx`.

1. **Medium: the date tile's day reads smaller.**
   - Tour: `DateTile` md, day `text-2xl` (24px), weekday `font-semibold tracking-wide` (date-tile.tsx:20–24; used at departures-page.tsx:107–114).
   - Gift: M03's inline tile is `w-12` with day `text-3xl` (30px) and weekday `text-[11px] font-medium uppercase` (order-rows.tsx:80–87).
   - Fix: see cross-cutting item 3. The quick local option is `size="lg"` (30px day, but `w-14`, 56px).
2. **Low: the two tables have different column widths at 1024.**
   - Tour: the "Upcoming" and "Ended" tables size their columns separately, so "Departure" wraps in "Ended" (m05-1024-tour-en.png).
   - Gift: M03 shows one table per tab.
   - Fix: give the columns fixed widths shared by both tables.

#### M06 Guest list

Tour file: `features/tours/merchant/manifest-page.tsx` (+ `shared.tsx`). Gift reference: `order-rows.tsx`, `features/merchant/order-detail/components/order-sections.tsx` (`OrderHeader`).

1. **High: the overdue pill becomes an oval blob in the 1024 table.**
   - Tour (`m06-1024-tour-en.png`, `-de.png`): `OverduePill` (`inline-flex w-fit items-center gap-1.5 rounded-full … text-sm`, shared.tsx:110) wraps "Overdue since 12 Oct 2026, 18:00" / "Überfällig seit 12.10.2026, 18:00" onto four lines inside a `rounded-full` shape. Nothing on the gift side looks like this.
   - Gift: M03 table chips also wrap in narrow cells ("Awaiting seller confirmation", `m06-1024-gift-en.png`). They stay rounded rectangles because `StatusChip` (`components/status-chip.tsx:41–46`) is not a full pill when wrapped.
   - Fix, table only (the phone ticket is fine):
     - Give the pill a wrap-safe shape: `rounded-2xl` in place of `rounded-full`. Or render it as `StatusChip tone="danger"`, as the M03 table does.
     - Do not use `whitespace-nowrap`. In DE it would push the Outcome column out of view, which is why the 2.11-r2 worker made the money rows wrap.
2. **Medium: the money cell reads as six lines.**
   - Tour: `Money` stacks each label over its amount in the narrow "Payment" column (row `flex flex-wrap items-baseline justify-between gap-x-3`, dt `text-muted`, :60–66). Rows are two to three times taller than M03's.
   - Gift: M03 table cells are a value plus a `text-label text-muted` secondary line (order-rows.tsx:198–220).
   - Fix: keep the wrapping, which DE needs. Make the labels `text-label text-muted` (13px) in the table so each label/amount pair reads as one secondary unit, and keep the booking total `font-semibold`.
3. **Medium: the phone ticket shows status as chips.**
   - Tour: two StatusChips in the middle block (`BookingStatusLabels`, :228).
   - Gift: the M03 ticket shows progress as a dot-and-words line (`flex items-start gap-2 text-sm font-medium ${progressText[tone]}`, dot `size-1.5`, order-rows.tsx:134–138) and payment as a toned footer value (`paymentText`, :164). M05 already uses the dot line (`ToneLine`, shared.tsx:96).
   - Fix: booking status as `ToneLine`. Payment status as a footer row whose value takes the payment tone, as M03's `paymentText`.
4. **Low: underlined links in the ticket sub-line.**
   - Tour: ref and phone are underlined links (:85, :97).
   - Gift: M03's sub-line is plain `text-xs text-muted` with a `·` separator (order-rows.tsx:95–101).
   - The ticket is not one link, so these must stay links. Optional: match the M03 size and separator and keep the underline.

#### M07 Booking detail

Tour file: `features/tours/merchant/booking-page.tsx`. Gift reference: `features/merchant/order-detail/components/order-sections.tsx`, `fulfilment-actions.tsx`.

1. **Medium: policy sentences in medium weight.**
   - Tour: in "Price and policies", `Facts` render dd `font-medium` (:60–64). The three policy sentences become heavy multi-line blocks (m07-1024-tour-en.png).
   - Gift: M04's PolicyCard uses dt `font-medium` and plain dd text (order-sections.tsx:363–371).
   - Fix: use the PolicyCard pattern for the policy facts in the snapshot card (:91–108). Keep `Facts` for the short values in Contact and Departure.
2. **Medium: in DE at 1024 the outcome buttons run into the card padding** (2.13, `features/tours/merchant/attendance-actions.tsx`).
   - Tour (`m07-1024-tour-de.png`, `m07-overdue-merchant-1024-tour-de.png`): "Leistung erbracht" + "Nicht erschienen" sit side by side in the ~370px work column. The second button ends about 10px past the card's content edge (measured from the screenshot), so it sits 10px from the card edge instead of 20px.
   - Cause: the row is `flex flex-col gap-2 sm:flex-row`, with Delivered `sm:flex-1` and No-show `sm:w-auto sm:px-6` (:104–129). `sm:` keys off the 1024px viewport, not the narrow column, so the pair never wraps. The capture's overflow check measures page overflow only, so it did not catch this.
   - Gift: M04's Change / Decline pair uses the same `sm:flex-row` pattern (decision-block.tsx:175–193) and fits in EN. I did not check the gift in DE.
   - Fix: stack the pair inside the two-column layout, e.g. `sm:flex-row lg:flex-col`, or let it wrap with `flex-wrap`. Do not edit the gift block for this.
3. **Low: key-fact cards are not on the subgrid.**
   - Tour: StatCards without `isSubgrid` (:584–589). Cards with a two-line label ("Outstanding balance") or value ("15 Oct 2026, 18:00") come out taller than their neighbours.
   - Gift: M04 uses `StatCard isSubgrid` (order-sections.tsx:129–140).
   - Fix: `isSubgrid`.
4. **Low: payment rows have no status chip.**
   - Tour: the method is plain `text-sm` text (:525).
   - Gift: M04 puts a payment `StatusChip` after the amount (order-sections.tsx:283).
   - Fix: a StatusChip with the same tones as C16.
5. **Low: the phone is a bare underlined link.**
   - Tour: (:461).
   - Gift: M04 shows contact as a `CopyText` inset (`flex items-center justify-between gap-3 rounded-2xl bg-surface-secondary px-4 py-3`, order-sections.tsx:462) plus a full-width secondary button (`buttonVariants({ variant: "secondary" })` + `w-full`, :242).
   - Fix: put the number in the inset.
6. **Low: the commission amount is a fact line** (2.13).
   - Tour: `CommissionCard` shows the amount as a `Facts` row (booking-page.tsx:163–187).
   - Gift: M04 PartnerCard ends with a total row, `flex justify-between gap-3 border-t border-separator pt-3 font-semibold tabular-nums` (order-sections.tsx:343).
   - Fix: render the amount as that total row.

Checked and consistent:
- header (same `OrderHeader` strings);
- ActionPanel band and tones;
- money inset (same strings as fulfilment-actions.tsx:134–150);
- `h-12 text-base size="lg"` Record payment;
- two-column layout at 1024 (same strings as merchant-order-detail.tsx:68–74);
- order-log timeline;
- ledger inset;
- the attendance and Complete button sizes (2.13 sizes match fulfilment-actions.tsx:171–198; see fix 2 for the DE layout);
- tour M08 (identical classes to the gift sheet);
- P02.

**Evidence note (2.13):** recapture the 2.13 gift pair with a handed-over M04 that still owes money (SK-1044, as in the approved 1.15-02 shot). The current `m07-delivered-debt-*-gift-en.png` shots are pixel-identical to the 2.12 gift shots (AE 0). They show a "ready" order locked for "Not handed over yet", not for money owed.

#### M07 overdue states (2.14)

Tour file: `features/tours/merchant/booking-page.tsx`. Gift reference: `features/merchant/order-detail/components/decision-block.tsx`.

1. **Medium: the overdue inset reads as a heavy text block.**
   - Tour: pill, then the policy sentence in `text-sm font-medium` (:411–413): three lines of dark medium text.
   - Gift: M04 decision-block insets lead with a muted header row (`flex items-center gap-3 text-xs text-muted` with a leading icon, :114). They keep the emphasised value short (`font-medium`) and put explanations in `text-xs text-muted` (:148).
   - Fix: a header row with `StatusDangerIcon` and the pill, then the sentence as `text-sm text-muted`.

## 3. Cross-cutting patterns

1. **Two card grammars on the guest side.**
   - C11 and C13 follow C06 and C07: `SurfaceCard`, `p-5`, solid dividers. That is correct.
   - C16 and the expiry states follow C15, which uses `p-4` and dashed rules between ticket header and body and between items and amounts. C16 still uses the C06 grammar.
   - Fix once: give `SurfaceCardBlock` the C15 density and divider style as an option (R1 owns `surface-card.tsx`; agree it with R2). Then apply C16 fixes 3 and 4.
   - Any change to `surface-card.tsx` must leave C10, C11 and C13 unchanged.
2. **One summary component, two screens.**
   - `BookingSummary` (R1) and `BookingMoney` / `BookingActions` (R2) render on both C13 and C16.
   - C13 fixes 1–2 and C16 fixes 1, 5 and 6 all touch them. Suggested sequence:
     1. R2 builds the C16 ticket header.
     2. R1 moves the chips and the reference into the title block in `BookingSummary`.
     3. R2 moves `BookingActions` into the money card.
     4. Both recapture C13 and C16.
3. **Date tiles come in three sizes.**
   - `DateTile` md (24px day): gift and tour C14, tour M05.
   - `DateTile` lg (30px day, `w-14`): C15.
   - M03's inline tile (30px day, `w-12`): gift M03.
   - Next to M03, M05's day reads smaller.
   - Coordinator decision: either add an M03-matching size to `DateTile` and move M03 onto it (gift file; needs a gift regression), or use `size="lg"` on M05.
   - Every `DateTile` change needs the gift regression R2 ran (`reports/2.9-r2-gift-regress.mjs`), because gift C14 and C15 render it.
4. **Account hub surface.** Gift C14 tickets have a border and no shadow; every tour card has a shadow and no border (C14 fix 1). Decide once for the hub. The owner's 1.13s rule points to shadow.
5. **Money voice along the booking flow.**
   - C11 shows the amount due as C06's serif key figure. C13 and C16 show it as C15's strong row.
   - Each matches its own gift reference: C06/C07 versus C15. Gift itself differs between C07 and C15 in the same way.
   - No change unless the coordinator wants one money voice across C11 → C13. In that case C13 would need its own key-figure block, because `BookingMoney` must stay C15-style for C16.
   - Likewise "Booking total" is a serif card title on C11 and a sans section heading on C13 and C16. That follows the same two references.
6. **Header titles.** Every tour header matches its gift counterpart except C10 (C10 fix 2):
   - C11 serif `text-title`, as C06;
   - C16 `text-[17px] font-semibold`, as C15;
   - C14 centred `text-base font-semibold`, as the account screens.
7. **Stacked label/value lists in place of the gift's icon rows or inline rows.**
   - Guest: C13/C16 block 3 (`booking-summary.tsx:86–117`) against icon rows on C07 and C15.
   - Merchant: the M06 table money cell and M07 policy facts against inline rows and PolicyCard.
   - Each is fixed in its own screen above. Watch for this pattern in new tour UI.
8. **Tinted versus white Alerts.** Checked and consistent per reference:
   - tinted, bordered `alert--soft`: C10/C11 info notes and C11 errors, as C04/C06;
   - white `Alert`: C16 notes, as C15.
   - The tinted hold banner on C16 lives in approved C12 (§4).
9. **Gift files touched by these fixes.**
   - Only C14 fix 1 (gift `transaction-list.tsx`) and cross-cutting item 3 (M03 `order-rows.tsx`, `date-tile.tsx`) touch gift code.
   - Both need the coordinator's OK and a gift pixel regression, as the round 2 brief requires for moves.

## 4. Items the workers left for the owner

**Visual** = fixable now as a restyle, if the coordinator agrees. **UX** = changes content, copy, sections, order or interaction, so it is the owner's call.

| Step | Item (worker's words, shortened) | Class | Note |
| --- | --- | --- | --- |
| 2.4 | C10 is a page, C03 is a bottom sheet | UX | Changes the flow. Keep. |
| 2.4 | Departure tiles full width, not three to a row | UX (content-driven) | Tiles carry date, prices, policy and seats. Keep. |
| 2.5 | Cancellation policy open on C11, accordion on C06 | UX | Adds an interaction and hides the policy before booking. |
| 2.5 | No price-breakdown sheet behind the bar total | UX | Adds an interaction. |
| 2.5 | C05 says "Anything in your cart stays there" on the tour path | UX (copy, Phase 1 screen) | Owner or Phase 1 call. |
| 2.5 | Large serif "CHF 0.00" key figure on pay-later | Visual | Emphasis only. Suggestion: when nothing is due now, keep the row but drop the serif figure style, so the booking total leads. Fixable in tour-review-page.tsx:313–317. |
| 2.8 | No "What happens next" timeline or "Back to Explore" bar on C13 | UX | Adds sections. |
| 2.8 | "View booking" as a button, not C07's "View order ›" row in the card | UX | Moves an action into the card. Recommend the owner approve it; it is the C07 pattern. |
| 2.8 | Trip profile says "don't change your pickup dates" on a tour | UX (copy, Phase 1 component) | Copy fix in a gift component. |
| 2.7 / 2.9 | `HoldNotice` stays a tinted, bordered alert | Locked | Lives in approved C12 (`tour-payment-page.tsx`). Owner decides whether C12 may change. |
| 2.7 | Long session-closed body in the expired headline | UX (copy) | Shortening or splitting is a copy change. |
| 2.7 / 2.9 | "Balance due by …" shown on held bookings | UX (content) | Hiding it changes content. |
| 2.7 | Reconciliation tone danger (tour) against warning (gift C15 note) | Visual, coordinator decision | The tone is shared with the merchant exception chip (`features/tours/components/booking-status.tsx`). Decide once for both. |
| 2.9 | Gift C14 tickets keep a 1px border | Visual, gift file | Coordinator decision (cross-cutting item 4). |
| 2.9 | C14 not split into Coming up / Past, no totals | UX | Changes order and content. |
| 2.9 | Empty "Booking activity" heading on seeded bookings | Visual part fixable now; the empty line is UX | Hiding the heading when there is no activity is C16 fix 2 and follows gift C14's empty-section rule. Showing an empty-state line instead needs a new key (owner). Gift precedent for a line: C15's "No payments yet." |
| 2.9 | Solid in-card rules against C15's dashed; stepper `p-4` against `p-5` | Visual | Fixable now: C16 fixes 3 and 4. |
| 2.10 | Zero-count tour tiles hidden (gift shows them muted) | UX (content) | Adds tiles. |
| 2.10 | Tour balance card is not a link | UX (navigation) | Adds an interaction. |
| 2.10 | `DateTile` 24px day against M03's 30px | Visual | Fixable now: M05 fix 1, cross-cutting item 3. |
| 2.10 | "Open guest list" text removed (the whole ticket is the link) | UX | Matches the M03 pattern. No action. |
| 2.11 | No date tile on the guest ticket | UX (content) | All bookings share the date. Agree, no action. |
| 2.11 | M06 ticket is not one link | UX | It holds buttons. No action. |
| 2.11 | Notices stay HeroUI Alerts | Visual, already consistent | Same Alert as gift. No action. |
| 2.12 | No phone tabs on M07 | UX | Hides sections. |
| 2.12 | No 5-step bar | UX | No tour step model approved. |
| 2.12 / 2.13 | Money panel and Next step stay two sections, not M04's single action panel | UX | Merges sections. |
| 2.12 | The amount appears three times (band, fact card, inset) | UX (content) | M04 does the same. No action. |
| 2.12 | No guest avatar on the contact card | Locked | Avatar code is off limits this phase. |
| 2.13 | No consequence line under Complete | UX (copy) | Adds copy. |
| 2.13 | Split the P02 "Tours" group per tour | UX (content) | Open from round 1. |
| 2.14 | No decision buttons in the overdue panel | UX | Tour cancellation is Phase 3. |
| 2.14 | Reminder timing, grace length, cancel-after-start, money on overdue cancellation | Policy | Open owner questions from round 1. |

**Additional owner-level observation (not in a worker report):** M05 shows a grey "Nothing to do" dot line on every open departure. M03 shows a single status line. Removing it changes content, so it is UX.
