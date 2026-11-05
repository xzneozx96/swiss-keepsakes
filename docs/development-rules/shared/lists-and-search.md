# Lists, filters and search (front-end and back-end)

Read this when you add or change any list: an endpoint that returns several items, a screen that shows them, a filter, a tab with a count, a sort or a search box.

The rule in one line: **the API answers what the user asked for.** The browser never fetches a whole collection and then filters, counts, sorts, searches or pages it. Source: owner, 05.11.2026, after the stories list did exactly that. This project's numbers and the per-route table are in ADR-033 (`docs/adr/ADR-033-list-pagination.md`).

## Choose the kind of list

Every list endpoint is one of three kinds. Decide before you write the route, and write the choice in the route's description.

| Kind | Use it for | Request | Response |
| :-- | :-- | :-- | :-- |
| **Cursor pages** | Lists that can grow without a known bound, and lists a visitor scrolls (infinite scroll or "Load more") | `limit`, `cursor`, named filters | `{ items, nextCursor }`; `nextCursor` is null on the last page |
| **Numbered pages** | Admin or back-office tables of a bounded set, where people jump to page N | `page`, `pageSize`, named filters | `{ items, total, page, pageSize }`, plus the facet counts the screen shows |
| **Whole list** | Small sets a screen must hold completely: a filter's options, a map's markers, a picker of a handful of items | named filters only | `{ items }` |

- **Default to cursor pages.** Numbered pages are the exception for bounded tables, and they need a stated bound on how far a page may skip. A whole list needs a reason (the screen must draw every item at once) and an expected size. Write both in the project's decision record.
- **A whole list is reviewed when it grows.** Log a warning before it reaches the size it was chosen for, so it moves to paging or a different query (for a map: the visible area) before users notice.
- **Page size is small.** Pick one default and one maximum for the whole API and use them everywhere. A request above the maximum is refused with a validation error, never silently cut. Page size is how much one request returns; it is not a limit on how big a list may grow.

## Filters, counts, sorting and search

- **Filters are query parameters, applied in the database query.** One named parameter per filter, typed in the contract. Never send everything and let the client drop rows.
- **Counts come from the server.** A tab count, "N results" or "N stories" is computed by the query (a `total`, or facet counts per tab), never by counting a loaded array.
- **Sorting is a fixed set of named orders** (`sort=newest`), each backed by an index. The last sort key is the unique id, so the order is stable.
- **Search runs on the server**, in the database's text search or a search engine the project has chosen, and pages like any other list. No client-side matching over a fetched list.
- **A filter change is a new request.** The filter values live in the address (route search parameters) and in the query key.

## What the browser may still do

- Format and display what it received.
- Re-order the items of a loaded page by data that must stay on the device (for example a visitor's private preferences), when the project's decision allows it. It never fetches more items to do so.
- Keep the current filter in the address, so Back and a shared link reproduce the view.

## Don't

```ts
// Don't: fetch everything, then answer the user's filter in the browser.
const { data: stories } = useQuery(storiesQuery(lang))
const shown = stories.filter(s => s.categories.includes(category))
const count = shown.length

// Do: ask the API for the filtered page and its count.
const pages = useInfiniteQuery(storiesPageQuery({ lang, category }))
const count = pages.data?.pages[0]?.total
```

- Don't build tab counts by loading every row and grouping them.
- Don't loop over every page on load to rebuild a whole list. Ask the API for what the screen shows.
- Don't add a "fetch all" endpoint for a screen that shows a page.

## Checks

- Every list route either uses the shared page schema (cursor or numbered) or is listed as a whole list with its reason and expected size. A contract test fails otherwise. In this repo: see "Lists" in `docs/development-rules/backend/api-contract.md`.
- Reviewers reject a feature component that filters, counts or sorts a fetched list to answer a user's choice.

How to build each side: `docs/development-rules/backend/api-contract.md` ("Lists") and `docs/development-rules/frontend/api-integration.md` ("Lists, filters and search"). What to test: `docs/development-rules/shared/testing.md` ("Lists").
