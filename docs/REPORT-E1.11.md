# E1.11 TanStack Query over a `DataClient`, the demo store behind it

## What changed

- **Dependency.** `@tanstack/react-query` `^5.104.3` in `front-end/package.json` (the lockfile resolves 5.104.3, released 15.10.2026). Nothing else was added: no devtools and no `@tanstack/eslint-plugin-query`.
- **One `DataClient` per feature** (`front-end/src/features/<feature>/api/`).
  - `client.ts` is the typed interface: reads and commands, no `any`.
  - `demo-client.ts` implements it over the demo store.
  - `queries.ts` holds the `queryOptions` and the read hooks (`useOrders(select?)`, `useTourRecords()`, ...).
  - Features: account, catalog, content, notifications, orders, partners, reports, requests, reviews and tours.
  - `features/data-client/` holds the combined `DataClient` type, its context, the one query-key module and `useCommand`. `useCommand` is a `useMutation` that invalidates the keys it lists and waits for them.
  - A feature moves to the API by replacing its own client in `createDemoDataClient`.
- **One source of truth.** The demo store keeps the only copy of the data. A `queryFn` returns the store's own array. With `structuralSharing: false` the cache holds those same objects, so screens re-render exactly as they did with store selectors. Nothing calls `setQueryData`.
- **How other store changes reach the cache.** `bridgeStore` in `features/demo/data-client.ts` subscribes to the store once.
  - It compares each collection with the previous state and invalidates only the queries of collections that changed. Inactive queries are invalidated too, so no screen mounts on an old read.
  - This covers commands, the prototype bar (reset, role), the `*-demo-control` panels and the demo's payment provider, jobs and clock.
  - Other tabs: the store never listened for another tab's saves and still does not, so behaviour there is unchanged.
- **No pending state in demo mode.**
  - `startDemo().ready` reads every collection into the cache before the first render. It runs in the same `Promise.all` as the German dictionary load in `main.tsx`.
  - Demo queries have infinite `staleTime` and `gcTime`, no retries and `networkMode: 'always'`.
  - Reads use `useSuspenseQuery`, so `data` is typed as defined and never suspends in demo mode.
  - `collections` must list every `DemoData` key that is not in `StoreOnlyKey`, and the type checker enforces this.
- **What stays in the store as browser state:** role, demo clock, `signedInGuestId`, cart, saved gifts, the advice draft, the tour booking draft, partner sessions, and the order counter (only commands read it). Backend section 9 keeps the cart in the browser. Guest sign-in (C05) and partner access (P01) stay store writes, because they stand in for Neon Auth and the partner session cookie.
- **Tour records leave out the booking draft.** `TourRecords` is a new type in `@sk/domain/bookings`, and four selectors are narrowed to it.
  - The draft is typed into on C11, so it is read from the store and never waits on a query.
  - When only the draft changes, the demo client hands back the same records object, so tour screens do not re-render on every keystroke.
- **Commands** (about 55):
  - orders: submitCart and the ten transitions
  - tours: booking, pay, staff payment and outcome, tour and departure edits
  - catalog: gift save and archive, sub-categories, pickup places
  - content: articles, comments
  - reviews
  - account: profile, trip answers
  - requests
  - partners
  - reports: costs

  Each demo command runs the same recipe the hook used to run. Heavy recipe modules are loaded with `import()` inside the command: `orders/lib/transitions`, `checkout/lib/create-orders`, the tour transitions and the request mail.
- **Write-then-navigate awaits the command:** C06 to C07, order and booking payment, a new article, gift or tour opening its id, the profile name, and C22 to its sent screen. Synchronous guards still run on the screen's data, so `useOrderActions` and `useTourActions` keep their return shapes.
- **The demo storage budget** moves from the two product editors into the demo store (`updateWithinBudget`, `StorageFullError`). The editors still show the storage-full state when a save is refused.
- **Docs.**
  - `api-integration.md` explains how to read, write and test through the client, and what an API feature must set itself.
  - `tech-stack.md` marks TanStack Query as in use.
  - `components-and-hooks.md`, `testing.md`, `stack-notes.md`, `performance.md` and AGENTS.md rule 4 are updated to match.
  - `useDemo` had no callers left, so it is deleted. Lint now reports 46 react-refresh warnings, and AGENTS.md and `linting.md` say 46.
- **Trace.** `scripts/trace.mjs` now also searches `front-end/tests`, where tagged tests previously counted for nothing. The only change in its output is E1.11, from 0 to 7.
- **Tests:** 7 tests tagged `[E1.11]` in `front-end/tests/data-client.test.tsx`.
  - Every collection is in the cache at start, as the store holds it.
  - A command re-reads only the collection it changed.
  - A demo control and Reset reach the cache.
  - A change to the draft alone keeps the same tour records.
  - An oversized gift save is refused and changes nothing.
  - Mutation then invalidate: renders `useMerchantComments` with the demo client and no bridge, hides a comment, and sees the row hidden.

**Docs consulted**

- context7 `/tanstack/query`: queryOptions, invalidations from mutations, render optimizations and tracked properties, `no-unstable-deps`, testing, `staleTime`.
- The installed 5.104.3 source:
  - `notifyManager` schedules with `setTimeout(0)`.
  - `useMutation` re-renders on each state change.
  - `ensureQueryData` and `prefetchQuery` are deprecated in favour of `queryClient.query`.
- TanStack Router's `Match.tsx`: a route has no Suspense boundary of its own unless it has a `pendingComponent`.

**Where the docs differ from the plan:** D19 says `useQuery`. The code uses `useSuspenseQuery` so that data is always defined, and `api-integration.md` says so.

## Deviations from the plan

1. AGENTS.md rule 4 is rewritten. It now says: read shop data with feature query hooks and write with `useCommand`. `useDemoSelector` and `useDemoActions` are only for browser state. The known lint warning count goes from 47 to 46 in AGENTS.md and `linting.md`, because `useDemo` was deleted once it had no callers.
2. `scripts/trace.mjs` (the E0.9 script) now also searches `front-end/tests`. Without that, the `[E1.11]` unit tests counted 0.
3. `packages/domain` gains a `TourRecords` type (`TourData` without the draft). Four selectors are narrowed to it. Type-only change.
4. Reads use `useSuspenseQuery`, not the `useQuery` named in D19. An API feature will need a pending component or a route loader.
5. The localStorage budget check moved out of the gift and tour editors into the demo store.
6. `features/requests/hooks/use-advice.ts` had no importers on trunk either. It was migrated anyway. It is dead code, ready to delete.
7. Two timestamps now use the exact demo time instead of the 30-second `useDemoNow` tick: a partner's `archivedAt`, and a payout's id and `recordedAt`.
8. Guest sign-in (C05) and partner sign-in (P01) still write the store directly, because both stand in for auth. Demo simulations (payment provider, hold expiry, deadline and reminder jobs, clock skips, prototype bar, `*-demo-control` panels) also write the store directly. The store bridge refreshes the screens after each of these writes.

## Output

Front-end (`front-end/`):

```
pnpm exec tsc --noEmit        (no output, exit 0)
pnpm lint                     ✖ 46 problems (0 errors, 46 warnings)
pnpm test                     Test Files 3 passed (3)   Tests 20 passed (20)
pnpm typecheck:tests          (no output, exit 0)
pnpm build                    ✓ built in 21.28s
```

Root:

```
pnpm typecheck                packages/domain typecheck: Done / front-end typecheck: Done
pnpm test                     Test Files 13 passed (13)   Tests 264 passed (264)
pnpm lint:zones               (no output, exit 0)
PLAYWRIGHT_CHANNEL=chrome pnpm e2e    8 passed (17.2s): gift, tour, merchant, language in phone-en and phone-de
node scripts/trace.mjs docs/development-plan/delivery-plan.md    E1.11 tests=7
```

Mutation checks on the tests (each reverted afterwards):

- The mutation test fails when `useMerchantComments` invalidates the articles key instead of comments.
- The two bridge tests fail with the bridge turned off.
- The draft test fails when the tours client builds new records on every read.

Trunk (39a58c5) against head, from `front-end/`:

```
verify:routes    routes compared: 100, identical text: 100, different: 0 / page errors base: 0, new: 0
first load       trunk 352,800 B JS gz, 61,997 B CSS, 32 files
                 head  363,806 B JS gz, 61,997 B CSS, 32 files   (+11,006 B, +3.1 %)
```

According to the source maps, the head's first load adds only these modules: `@tanstack/query-core`, `@tanstack/react-query`, the ten `api/demo-client.ts` and `api/queries.ts` modules, `features/data-client/*`, `features/demo/store.ts`, `features/demo/data-client.ts` and `content/merchant/lib/staff.ts`. No transition, mail or report module moved into the first load. The roughly 11 KB increase matches the size of TanStack Query itself.

`verify:renders`, three runs each, renders and median CPU at 4x throttle:

| Scenario | Renders trunk | Renders head | CPU trunk | CPU head |
| :-- | --: | --: | --: | --: |
| S1 idle on /tours | 0 | 0 | 352 ms | 348 ms |
| S2 sales period taps | 877 | 877 | 530 ms | 510 ms |
| S3 save 3 favourites | 368 | 362 | 639 ms | 625 ms |
| S4 type in /search | 758 to 848 | 758 to 848 | 639 ms | 663 ms |
| S5 store orders tabs | 2064 to 2072 | 2064 | 960 ms | 1000 ms |
| S6 scroll a story | 5 | 5 | 241 ms | 252 ms |
| S7 planner stream | 1364 | 1364 | 1372 ms | 1399 ms |

- Renders are equal or fewer in every scenario. S4 varies on both builds with typing timing.
- CPU is within run-to-run noise except S5, which is about 4 % slower on the median: 953 to 961 ms on trunk, 993 to 1047 ms on head.
- A fourth, profiled run of S5 measured 941 ms on trunk against 963 ms on head, with the same top components.

Browser drive at 375 by 812 in English on the head build, using a Playwright script that drives the built app. Trunk and head both pass every check:

```
content-guest      stories list renders; posted comment shows on C20; comment saved; no page errors
content-merchant   hide shows its toast; hide changes the store; row offers Show again; save draft opens the
                   new id; editor shows the saved draft; draft listed on M17
guest-account      trip skip shows and is saved on the booking; review posted, saved and shown on the order;
                   profile name saved and shown on the account hub
merchant-reviews   reply shows on M23 and is saved
order-pay          staff accept SK-1032; its guest pays online; the order opens; payment stored
tour-typing        fast typing keeps every key; the caret stays where it was; draft stored
tour-staff         recorded toast; booking payment stored
merchant-products  sub-category added and listed; pickup point saved; a new gift opens its own id
requests           C22 sent screen; Mail panel counts the N17 email; opening an advice request marks it read;
                   a private tour marked answered
partners           /r/MARCO stores the visit and opens home; report link revoked; partner archived
costs              M24 costs stored with the new amount
```

In one full run, `content-guest` logged `net::ERR_NETWORK_CHANGED` for an external resource. Two reruns of that scenario passed with no page errors.

Remaining direct store use (`grep` over `front-end/src`):

```
useDemo():                      none (deleted)
useDemoSelector slices:         clockStartedAt 12, role 11, signedInGuestId 20, cart 3, favouriteProductIds 2,
                                partnerSessions 2, adviceDraft 1, nextOrderNumber 1, tours.draft 1
selector reads of shop data:    none
store writers (useDemoActions): merchant-shell, mail-list, planner-chat, prototype-bar (role, reset);
                                use-sign-in, account route, use-partner-access (sign-in stand-ins);
                                use-cart, use-favourites, use-advice, use-tours (cart, saved gifts, drafts);
                                use-orders, use-tours (demo provider, hold expiry, jobs, clock);
                                checkout, booking, tours, transactions and order-detail demo controls
```

## Not verified

- No API implementation of any client exists yet. "A feature can switch to the API alone" is shown by the types only. An API feature will need its own query options and a pending state or a route loader. `api-integration.md` says so.
- These commands were not driven in a browser. They run the same recipes as before through the command and type-check, but nobody clicked them:
  - orders: changePickup, markReady, handOver, complete, handOverAndComplete, cancel
  - tours: booking payment with a failed or processing outcome, recordOutcome, saveTour, tour archive, departures
  - catalog: gift archive; sub-category rename, move and delete
  - content: article update, shop reply, comment delete
  - reviews: reviews of bookings
  - requests: sendAdviceRequest (planner), saveQuestionSet
  - partners: addPartner, deletePartner, recordPayout, issueReportLink
- The storage-full refusal is unit-tested but was not driven.
- The browser drive did not cover German. The E0.8 flows do run in German, and `verify:routes` compares the German text of 100 routes.
- Not tested: offline (`networkMode: 'always'`), Safari, WebKit and a real phone.
- There is no global error toast for failed commands. Demo commands cannot fail except the storage refusal, which the editors show inline.
- The worker's browser driver lives only in scratch and is not tracked. It could become `[E1.11]` Playwright specs, as E0.8 did for the earlier drivers.
- `node scripts/trace.mjs` exits 1 for E1.1 on this branch, as on trunk. PR #10 fixes that.

## Open questions

- A global `MutationCache` error toast needs a decision when the first API feature lands.
- The demo `QueryClient` defaults are client-wide (`staleTime` and `gcTime` Infinity, retry off, `structuralSharing` off, `networkMode` always). API features probably need per-key defaults (`setQueryDefaults`) at E2.5.
- `payOnline` and `tours.pay` take the demo provider's outcome as input. The Payment Element flow will reshape these commands.
