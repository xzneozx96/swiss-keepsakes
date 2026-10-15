# Dashboard audit: merchant and partner screens

Date 2026-10-15. Scope: `/store/*` (merchant) and `/partner/$token` (partner). Four checks:

1. **Skeleton** looks like the real screen (not pure rectangles).
2. **Table** has a trailing Actions column with a ⋯ menu (as products, partners, comments) and a pager.
3. **Sub-route** instead of an in-screen tab (page-level section tabs only; owner decision 15.10.2026).
4. **Tabs + filters** layout: tabs row, one round filter button at the right end, every active choice as a chip in one shared line under the tabs (owner decision 15.10.2026, third screenshot).

Legend: ✔ passes, ✘ fails, n/a not applicable, **veto?** means I assume n/a and the owner can overrule.

## What already exists (the levers)

| Piece | File | State |
| --- | --- | --- |
| One table with pager (10 rows) and empty state | `components/data-table.tsx` | Pager is built in, so every `DataTable` already paginates. No Actions column, no loading state. |
| ⋯ menu | copied 4 times: `product-rows`, `partner-rows`, `comment-rows`, `categories-page` | Same markup each time. |
| Filter | `components/merchant-filter.tsx` | Button + chips bound to each button. Used by products, partners, content, reports, cost data. |
| Sub-routes | `/store` + `/store/sales` behind `OverviewFrame` | Working precedent: phone tabs switch route, sidebar lists the pages. |
| Skeletons that mirror the UI | `today-overview.tsx`, `sales-overview.tsx` | The house reference. |

## Per screen

| # | Screen and route | Skeleton | Table | Sub-route | Tabs + filters | Planned fix |
| --- | --- | --- | --- | --- | --- | --- |
| M02 | Today `/store` | ✔ mirrors tiles, rows, widgets | n/a | ✔ | n/a | none |
| M02 | Sales `/store/sales` | ✔ mirrors widgets | n/a leaderboards (**veto?**) | ✔ | period control + filter: reuse as the model | none; its period + filter button is the reference |
| M03 | Orders `/store/orders` | ✘ 3 blocks | ✘ no Actions | status tabs stay (they are statuses of one list) | tabs only | `DataTable isLoading`, Actions: Open, Record payment |
| M11 | Products `/store/products` | ✘ 3 blocks | ✔ menu, ✔ pager | ✘ `?tab=gifts\|tours\|pickup\|stays\|experiences` | ✘ Show and Sub-category buttons, chips bound to each | routes `products/gifts`, `products/tours`, `products/pickup`, `products/stays`, `products/experiences`; one filter button + chip line |
| M14 | Pickup points (tab of M11) | ✘ via M11 | card grid, not a table (**veto?**) | with M11 | n/a | skeleton with card shape; pager if more than 10 |
| M26 | Categories `/store/products/categories` | no loading state | list with ⋯ ✔ | ✔ | n/a | none beyond shared menu component |
| M12/13 | Gift and tour editors `/store/products/{gifts,tours}/$id`, `new` | ✘ `EditorSkeleton` 3 blocks | n/a | language tabs stay (inside one record) | n/a | skeleton mirrors back bar, title, step cards |
| M15 | Partners `/store/partners` | ✘ blocks | ✔ menu, ✔ pager | ✘ `?view=analytics` | ✘ filter buttons | route `partners/analytics`; filter button + chip line |
| M16 | Partner detail `/store/partners/$partnerId` | ✘ 4 blocks | tables inside: n/a | detail tabs stay | n/a | skeleton mirrors header, summary, ledger card |
| M04 | Order detail `/store/orders/$orderId` | ✘ blocks | n/a | detail tabs stay | n/a | skeleton mirrors header, status, section cards |
| M17 | Content › Articles `/store/content` | ✘ blocks | ✘ no Actions | ✘ `?tab=comments\|reviews` | ✘ language filter button | routes `content/articles`, `content/comments`, `content/reviews`; Actions: Edit, Open |
| M18 | Content › Comments | ✘ | ✔ menu | with M17 | n/a | as M17 |
| M23 | Content › Reviews | ✘ | ✘ no Actions | with M17 | n/a | Actions: Reply, Open |
| M17 | Article editor `/store/content/articles/$articleId` | ✘ blocks | n/a | n/a | n/a | skeleton mirrors editor |
| M19 | Requests › Advice `/store/requests` | ✘ | ✘ no Actions | ✘ `?tab=private\|questions` | tabs only | routes `requests/advice`, `requests/private`, `requests/questions` |
| M20 | Requests › Private tours | ✘ | ✘ no Actions | with M19 | n/a | Actions: Open, Reply by email |
| M19 | Advice detail `/store/requests/advice/$requestId` | ✘ blocks | n/a | n/a | n/a | skeleton mirrors detail |
| M21 | Reports `/store/reports` | ✘ one 72px block | analytics tables n/a (**veto?**) | ✘ `?tab=money\|funnel\|products\|margin` | ✘ period select + filter selects | routes `reports/money` (default), `funnel`, `products`, `margin`; period + filters carried across; keep the C15 underline tabs; period segmented control + one filter button + chip line |
| M24 | Cost data `/store/reports/costs` | ✘ 3 blocks | card list, no table, no pager | ✔ own route | ✘ filter chips + week | `DataTable` with Actions (Enter cost) and pager; skeleton mirrors rows; chips into the shared line |
| M05 | Bookings › Departures `/store/bookings` | no loading state | ✔ pager, ✘ no Actions | ✔ | n/a | Actions: Open manifest; skeleton |
| M06 | Departure manifest `/store/bookings/departures/$id` | no loading state | ✔ pager, ✘ no Actions | ✔ | n/a | Actions from existing attendance and payment handlers |
| M07 | Tour booking `/store/bookings/$bookingId` | no loading state | lists inside cards: n/a | ✔ | n/a | skeleton |
| P02 | Partner report `/partner/$token` | ✘ 4 blocks | ✔ pager; read-only, "nothing here opens an order" (**veto?**) | period tabs are a time range, stay as the segmented control | period control only | skeleton mirrors all-time card, KPI row, chart, table |
| P01 | Partner access `/partner/$token` | n/a | n/a | n/a | n/a | none |
| Settings | `/store/settings` | placeholder | n/a | n/a | n/a | none (Phase 6) |

## Progress

**Batch 1, skeletons: done 15.10.2026, verified in the browser at 1280px and 390px with the loading timer held open.**

- `DataTable` has `isLoading`: the real headers, bars shaped per column (`skeleton: "line" | "two-line" | "lead" | "chip" | "action"`), a ticket-shaped card list on phones. Files: `components/data-table.tsx`, `components/data-table-skeleton.tsx`.
- Wired into Orders, Products, Partners, Articles, Comments, Reviews, Advice, Private tours, Departures, Manifest. Departures and Manifest had no loading state before.
- New mirrors in `components/layout/detail-skeletons.tsx`: order, partner, advice and the three editors (gift, tour, article). The partner report has its own all-time card and report skeleton. Pickup points and the question set have card-shaped skeletons.
- **Deferred to the end:** Reports (`reports-page`) and Cost data (`cost-data-page`). Another session is rewriting both right now (new `section-frame`, `reports/*` routes), so a skeleton written now would be overwritten.
- Not checked in the browser: the advice detail screen (needs a request id) and the question-set skeleton.

**Batch 2, tables: done 15.10.2026, verified in the browser (desktop tables, phone card menu, row link not triggered by ⋯).**

- New `components/row-actions.tsx` (`RowActions`, the one ⋯ menu) and a `rowActions` prop on `DataTable` that adds the trailing Actions column (header "Actions" / "Aktionen", loading bar included). The four copied menus (products, partners, comments, categories) now use it and their copies are deleted.
- New menus: Orders (Open order), Articles (Edit article), Advice (Open request), Departures (Open guest list), Reviews (Reply / Edit reply), Private tours (Reply by email, Mark answered). Pager was already in every `DataTable`.
- **Single-item menus:** Orders, Articles, Advice and Departures have only one existing action, so their ⋯ menu holds one item. I did not invent extra actions.
- **Left as they are:** the guest-list (manifest) table keeps its Attend / No-show / Record payment buttons (confirm dialogs, working-day controls); Cost data (deferred with its skeleton, the other session is rewriting it); Comments keeps its visible Reply button next to ⋯, as Partners keeps its QR button.

**Batch 3, sub-routes and filters: done 15.10.2026, verified in the browser at 1280px and 390px; all six old `?tab=` links redirect.**

- **Sub-routes.** Products: `/store/products` (Keepsakes), `/tours`, `/pickup`, `/stays`, `/experiences`, shown as a tabs row with counts (`components/route-tabs.tsx`). Content: `/store/content` (Articles), `/comments`, `/reviews`. Inquiries: `/store/requests` (Advice), `/private`, `/questions`. Content and Inquiries pages are listed in the sidebar and as phone tabs through `SECTION_PAGES`, next to the other session's Analytics pages, so there is no second tab row inside the page. Old `?tab=` URLs redirect in the route's `beforeLoad`; the links in the gift editor, categories, the tour/gift back links and the N17 mail now point at the new routes.
- **Filters.** One `components/filter-bar.tsx`: a round icon filter button (badge with the number ticked) that opens one menu with a section per filter, and every active choice from every section as a chip in one shared line. Used by Products (button at the end of the tabs row, chips below), Partners (beside the search field), and Content (a toolbar row). `MerchantFilter` is deleted.
- **Cost data** became a `DataTable` (Actions menu, pager, real skeleton, card list on phones). The single-choice status chips and the week chip stay as they were, already in one line.
- **Partners Analytics** had no loading state (blank); it now has a widget-shaped skeleton.

**Left as they are, on purpose:** Orders status tabs (statuses of one list), detail-screen tabs (order, partner), the editors' language tabs, the partner report's period tabs (a time range), the analytics tables (read-only).

**Not done / for review:** Stays and Experiences ("Soon") are tabs on Products only, not in the sidebar. The regression drives in `docs/ux/prototype/reports/*.mjs` still use the old tab selectors and were not rerun. Unused i18n keys remain (`products.column.actions`, `merchantContent.tabsLabel`, and similar).

**After the batches (15.10.2026, owner feedback during the run):**

- Table look: the plain-row style (HeroUI `secondary`) is only for a table inside a widget with a heading (`DataTable variant="card"`); page tables use the default look.
- Filters on phones open a bottom sheet (`FilterButton`); desktop keeps the dropdown.
- Phone tab rows are pinned (`components/layout/sticky-tabs.ts`): section pages, Overview, Products, Orders, order and partner detail (under the back bar), partner report period row.
- Four-page section tab rows use content-sized tabs at 13px so German labels do not collide.
- Phone navigation: the More sheet marks the current section (accent colour, filled icon, grey fill) and the More tab itself lights up whenever the open page belongs to a More section (`merchant-shell.tsx`).
- Phone bar rows (funnel and the other horizontal-bar charts) sit on a light red track showing the full width (`StackedRows` in `report-charts.tsx`).
- Period picker on phones is a bottom sheet (presets apply and close; Custom range shows the calendar inside the sheet); desktop keeps the dropdown and date field (`PeriodPicker`, `PeriodSheet` in `sales-overview.tsx`).
- Analytics headers on phones: the filter and period buttons sit on their own right-aligned row under the heading (Reports, Content and Inquiries analytics, Overview Sales).
- Bottom sheets slide up and down (they only faded before; hook `useSheetExit` in `components/sheet-exit.ts` used by `SheetFrame`, `ChoiceSheet`, `StorySheet`, `ReviewsSheet`, `WriteReviewSheet`, `AvatarCropSheet`, `DateSheet`, cart breakdown): a keyframe slide-in in `globals.css`, and `SheetFrame` plays a slide-out copy (`components/sheet-exit.ts`) because screens unmount the sheet the moment it closes.
- Review gallery with every screen, loaded and loading, both widths, menus, German: `docs/ux/prototype/screens/dashboard-audit-review/index.html` (rebuild with `build.py`).

## Order of work (3 batches, each verified in the browser)

1. **Skeletons.** `DataTable` gets `isLoading`: real headers, bars shaped like each column's content, and a ticket-shaped card on phones. Detail-route skeletons are rebuilt to mirror their screens.
2. **Tables.** One shared ⋯ menu component; `DataTable` gets a trailing Actions column; the four copies migrate and are deleted; pager stays. Only existing handlers are wired.
3. **Sub-routes and filters.** Generalise `OverviewFrame` into a section frame; `?tab=` links redirect; one filter button + shared chip line replaces `MerchantFilter` at every caller.

## Risks to watch

- Old `?tab=` / `?view=` / `?status=` links (M02 cards, N17 notifications, demo seed, editors linking `tab=pickup`, regression drives in `docs/ux/prototype/reports/*.mjs`) must redirect.
- Static routes (`partners/analytics`, `products/pickup`) next to `$partnerId` and `gifts/$productId` rely on TanStack static-over-dynamic ranking; verify after `routeTree.gen.ts` regenerates.
- Another session edits `front-end/src` at the same time: re-read and check mtime before every edit, exact-string edits only, `npx eslint <paths>` never `npm run lint`, browser checks only on port 5243.
