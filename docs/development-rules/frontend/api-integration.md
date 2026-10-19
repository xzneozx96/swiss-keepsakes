# API integration

Read this before you call an API or read server data. Check `front-end/package.json` and the existing code first.

## State of this repo

- There is no backend client yet. Data comes from the browser-held demo store (`front-end/src/features/demo`).
- The network calls today are the place search (`front-end/src/features/merchant/products/components/itinerary/use-place-search.ts`) and the map style and tiles (`front-end/src/features/tours/map/aerial-style.ts`).
- The backend design (`docs/architecture/backend.md`) chooses **TanStack Query v5** for server state (D19) and a **generated client** from the OpenAPI contract in `packages/api-contract` (D11). The client exists (`createApiClient` from `@sk/api-contract`, E1.10), and no screen imports it yet. TanStack Query is not installed. Do not add it until the backend work starts, and ask first.

## Rules that apply today

- Keep calls in a feature's hook or `api` module, never inside a presentational component.
- Cancel requests that can be superseded with an `AbortController` to save work, and ignore stale results with a flag set in cleanup, because an abort alone does not stop a race (see `react-effects-and-refs.md`). `use-place-search.ts` shows the abort pattern.
- Start independent requests together (`Promise.all`). Do not await one after another when neither needs the other's result.
- Cache what the whole app reuses at module level, and keep only successful results. Example: `loadAerialStyle()` in `front-end/src/features/tours/map/aerial-style.ts` fetches once and drops a failed attempt so the next call retries.
- Guidance. Handle loading, error and empty as separate states in the UI. Do not leave a spinner or a blank screen on failure.
- Turn errors into messages the user can read. See `error-handling.md`.

## When the backend client exists (planned)

These follow `docs/architecture/backend.md` D11 and D19. The server-state patterns are the owner's, from agentic-rag (`frontend/CLAUDE.md`).

- **Call the API only through the generated client.** Do not write `fetch` calls to the same endpoints, and do not redefine its request or response types. Never edit the generated client by hand. CI fails if it differs from a fresh build.
- **Reads** use `useQuery`. Lists that load more as you scroll use `useInfiniteQuery`.
- **Writes** use `useMutation`, and `onSuccess` invalidates the affected query keys.
- **Query keys** come from one factory module. Never write a key array inline.
- **Handle errors once, in the query client's cache.** Do not wrap each call in `try/catch` with a toast. A query that shows its error inline opts out with `meta: { silent: true }`.
- **Polling** uses `refetchInterval`, not `setInterval`. Return `false` when the work has finished. `docs/architecture/backend.md` section 8 has the merchant screens that poll.
- **A dialog whose fields start from a query** sets `refetchOnWindowFocus: false` on that query, so a refetch cannot overwrite what the user is typing.
- **Streams are not server state.** The planner chat stream stays outside TanStack Query.
- **Demo mode and the API share the same hooks.** A `DataClient` interface sits under the query functions (`docs/architecture/backend.md` D19).
- **Tests** wrap hooks and components in a fresh `QueryClientProvider` per test with retries off.

If the project uses Zod without the generated client, define a schema for every request and response, parse at the boundary with `Schema.parse(await res.json())`, and take types from `z.infer`. If it uses neither, declare the types and check the data with a type guard. Do not cast a response with `as`.
