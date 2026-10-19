# API integration

Read this before you call an API or read server data. Check `front-end/package.json` and the existing code first.

## State of this repo

- **TanStack Query v5** holds the shop's data in the browser (D19, E1.11). There is no API call yet: the demo `DataClient` answers from the browser-held demo store (`front-end/src/features/demo`). The **generated client** (D11) exists as `createApiClient` from `@sk/api-contract` (E1.10), and no screen imports it yet. It becomes the API implementation of a feature's client.
- The network calls today are the place search (`front-end/src/features/merchant/products/components/itinerary/use-place-search.ts`) and the map style and tiles (`front-end/src/features/tours/map/aerial-style.ts`).

## Shop data through the `DataClient` (in use)

- **One client per feature.** `front-end/src/features/<feature>/api/` has `client.ts` (the typed interface: reads and commands), `demo-client.ts` (the demo store implementation) and `queries.ts` (`queryOptions` and the read hooks). `front-end/src/features/data-client/data-client.ts` combines them. A feature moves to the API by replacing its own client.
- **Reads** use the feature's hook, such as `useOrders(select?)` or `useTourRecords()`. They wrap `useSuspenseQuery`, so `data` is always defined. Pass a `select` to subscribe to one item or a boolean: `useProducts(ps => ps.find(p => p.slug === slug))`.
- **Writes** use `useCommand(client.<feature>.<command>, [queryKeys...])`, a `useMutation` that invalidates the keys it lists and waits for them. Take `mutate` or `mutateAsync` from it, never the whole result.
- **Before you navigate to what you just wrote, `await mutateAsync`.** C07 after C06, the order after a payment, a new gift's editor: the next screen must not read the old cache.
- **Query keys** come from `front-end/src/features/data-client/query-keys.ts`. Never write a key array inline.
- **Browser-only state stays in the store**: the role, the demo clock, who is signed in, the cart, saved gifts, the advice and tour booking drafts and partner sessions. Read it with `useDemoSelector` and write it with `useDemoActions`. Never read shop data that way.
- **Demo simulations** (the payment provider, hold expiry, deadline jobs, the prototype bar and the `*-demo-control` panels) write the store directly. `bridgeStore` in `front-end/src/features/demo/data-client.ts` invalidates every collection the store changed, so the screens catch up.
- **Every demo collection is read before the first render** (`startDemo().ready`), and demo queries never go stale or get collected, so no screen waits on a demo read. A new `DemoData` key must be listed in `collections` or in `StoreOnlyKey`, and TypeScript enforces this.
- Guidance. **Typed input fields do not read from a query.** A query result arrives a macrotask after the write, so a controlled input that reads it can lose its caret. Keep the draft in component state or the store.
- **Tests** wrap hooks in a fresh `QueryClientProvider` and `DataClientProvider` per test (`front-end/tests/data-client.test.tsx`).

## Rules that apply today

- Keep calls in a feature's hook or `api` module, never inside a presentational component.
- Cancel requests that can be superseded with an `AbortController` to save work, and ignore stale results with a flag set in cleanup, because an abort alone does not stop a race (see `react-effects-and-refs.md`). `use-place-search.ts` shows the abort pattern.
- Start independent requests together (`Promise.all`). Do not await one after another when neither needs the other's result.
- Cache what the whole app reuses at module level, and keep only successful results. Example: `loadAerialStyle()` in `front-end/src/features/tours/map/aerial-style.ts` fetches once and drops a failed attempt so the next call retries.
- Guidance. Handle loading, error and empty as separate states in the UI. Do not leave a spinner or a blank screen on failure.
- Turn errors into messages the user can read. See `error-handling.md`.

## When the backend client exists (planned)

These follow `docs/architecture/backend.md` D11 and D19. The server-state patterns are the owner's, from agentic-rag (`frontend/CLAUDE.md`).

- **Call the API only through the generated client**, inside the feature's API `DataClient`. Do not write `fetch` calls to the same endpoints, and do not redefine its request or response types. Never edit the generated client by hand. CI fails if it differs from a fresh build.
- **An API feature sets its own query options.** The demo `QueryClient` defaults (`staleTime` and `gcTime` infinite, no retries, no structural sharing) suit the demo store only. Its screens need a pending state or a route loader, because `useSuspenseQuery` suspends while the first read is on the way.
- Lists that load more as you scroll use `useInfiniteQuery`.
- **Handle errors once, in the query client's cache.** Do not wrap each call in `try/catch` with a toast. A query that shows its error inline opts out with `meta: { silent: true }`.
- **Polling** uses `refetchInterval`, not `setInterval`. Return `false` when the work has finished. `docs/architecture/backend.md` section 8 has the merchant screens that poll.
- **A dialog whose fields start from a query** sets `refetchOnWindowFocus: false` on that query, so a refetch cannot overwrite what the user is typing.
- **Streams are not server state.** The planner chat stream stays outside TanStack Query.

If the project uses Zod without the generated client, define a schema for every request and response, parse at the boundary with `Schema.parse(await res.json())`, and take types from `z.infer`. If it uses neither, declare the types and check the data with a type guard. Do not cast a response with `as`.
