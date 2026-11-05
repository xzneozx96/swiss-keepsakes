# ADR-033: Page guest lists with one opaque cursor, page merchant tables by number, and keep small lists whole with a stated cap

Status: accepted
Date: 2026-11-05
Source: owner, chat 05.11.2026. The question: "Do we have pagination? There will be hundreds of stories in the future, we can't pull everything and filter on the client. Do we have shared pagination logic across entities?" The owner then answered the open questions of the proposal on the same day (see "Owner decisions").
Applies to: `packages/api-contract/`, `api/src/platform/http/`, `api/src/platform/db/`, `api/src/modules/content/`, `api/src/modules/catalog/`, `api/src/modules/inventory/`, `api/src/modules/identity/`, `front-end/src/features/content/`, `front-end/src/features/home/`, `front-end/src/features/search/`, `front-end/src/features/seo/`, `front-end/src/features/tours/`, `front-end/src/components/`, `docs/development-rules/backend/api-contract.md`
Amends: ADR-006 (the answers rank within each loaded page, see its Amendments). Backend D11 says "Lists use cursor pagination". It gains one exception, the numbered pages of the per-store merchant tables (§ 6). The D11 text and `docs/development-rules/backend/api-contract.md` are updated in slice 1, when the shared code lands.

No new dependency, vendor or paid service. Everything below uses Postgres, Zod, Hono and TanStack Query, which we already run.

## Context

D11 says "Lists use cursor pagination." Only one list does it. The rest send every row.

What the API does today (05.11.2026, from `packages/api-contract/generated/openapi.json`):

- **One cursor list.** `GET /api/admin/stores` takes `limit` (1 to 100, default 50) and `cursor`, and answers `{ items, nextCursor }`. The cursor is the raw store id. That works only because the sort key is the id itself (a `uuidv7`, so newest first). It would not work for any other order. The front-end reads it with `useInfiniteQuery` and a "Load more" button (`front-end/src/features/stores/api/queries.ts`).
- **One offset list.** The media library (`GET /api/store/{storeId}/media`) takes `page` (up to 10,000) and `pageSize` (up to 100), and answers `total` and facet counts (`kinds`, `uses`, `statuses`). It runs `limit … offset …` with `count(*) over ()`. The owner approved this on 29.10.2026 (`docs/decisions/2026-10-29-media-library-design.md`, item 6). It already departs from D11.
- **Every other list sends everything** (17 list routes). Most already wrap the rows as `{ items }`, so adding a field is additive.
- **The front-end filters, counts, sorts and ranks on the client.**
  - The guest stories page (C19) reads every published story. It works out the category chips (`offeredCategories`), filters by category (`filterStories`), counts ("N stories") and ranks by the guest's answers (`rankByTags`). All of it runs in `front-end/src/features/content/`.
  - The home reads every story to show 3 (`home/lib/newest-stories.ts`), and every tour.
  - Search reads four whole lists and scores titles in the browser (`search/api/search-reads.ts`, `search/lib/search.ts`).
  - The sitemap reads every story and tour in both languages (`seo/api/public-pages.server.ts`).
  - Every merchant table uses the shared `DataTable`. Its `usePaged` slices a whole array into numbered pages of 10 (`front-end/src/components/list-pagination.tsx`, owner request 15.10.2026). Tab counts and search also run in the browser.

This is fine at today's size: 11 tours, tens of stories, tens of pins. It breaks down at hundreds of stories. Every guest page load carries every card, every cover address and every category. The SSR HTML grows with it.

### What the sources say

- **Keyset over offset.**
  - `OFFSET` still reads and sorts every skipped row. A row added between two requests shifts the next page, so a row repeats or goes missing ([Use The Index, Luke: no offset](https://use-the-index-luke.com/no-offset); [Zalando rule #160](https://opensource.zalando.com/restful-api-guidelines/#160)).
  - The keyset ("seek") method asks for the rows after the last one seen: `WHERE (sale_date, sale_id) < (?, ?) ORDER BY sale_date DESC, sale_id DESC`. It needs an index in the same column order ([Use The Index, Luke: fetch next page](https://use-the-index-luke.com/sql/partial-results/fetch-next-page)).
  - What keyset gives up is jumping to page N. That fits "Load more" and infinite scroll.
- **Deterministic order.** "Paging requires a deterministic sort order." Add a unique column as the last sort key (same source).
  - The JSON:API cursor profile requires the same thing: the server adds `id` when the asked-for sort is not unique ([JSON:API cursor pagination profile](https://jsonapi.org/profiles/ethanresnick/cursor-pagination/)).
- **Row comparison and NULL.** Postgres compares `(a, b) < (c, d)` left to right and stops at the first unequal pair. A NULL in that pair makes the result NULL, so the row drops out of the page ([Postgres docs 9.25.5](https://www.postgresql.org/docs/current/functions-comparisons.html#ROW-WISE-COMPARISON)). Sort keys must therefore be NOT NULL, or wrapped in `coalesce`.
- **Opaque cursors.**
  - A cursor is "an opaque pointer to a page, that must never be inspected or constructed by clients" ([Zalando rule #160](https://opensource.zalando.com/restful-api-guidelines/#160)).
  - Google's [AIP-158](https://google.aip.dev/158) adds four rules. Page tokens must be opaque and URL-safe. The other request parameters must match the call that made the token, or the server answers `INVALID_ARGUMENT`. A token grants no authorisation. An empty next token is the only end signal.
  - AIP-158 also warns that adding pagination to an existing list later is a breaking change.
  - Slack's `next_cursor` is opaque, may expire, and an empty value means the end. Slack also warns against inferring the end from a short page ([Slack pagination](https://docs.slack.dev/apis/web-api/pagination)).
- **Limits.** Stripe's lists take `limit` from 1 to 100, default 10, and answer `{ data, has_more }` ([Stripe pagination](https://docs.stripe.com/api/pagination)). GitHub caps most `per_page` at 100 ([GitHub REST pagination](https://docs.github.com/en/rest/using-the-rest-api/using-pagination-in-the-rest-api)). Slack recommends 100 to 200 ([Slack](https://docs.slack.dev/apis/web-api/pagination)).
- **Totals cost.**
  - Zalando rule #254 says avoid total counts: a count often needs a full index scan, and clients come to depend on it.
  - AIP-158 makes `total_size` optional and allows an estimate.
  - Postgres has to check row visibility to count. The planner's estimate (`reltuples`, or `EXPLAIN` rows) is the cheap substitute ([Postgres wiki: count estimate](https://wiki.postgresql.org/wiki/Count_estimate)).
- **Envelope.**
  - Stripe answers `has_more`. Slack and our admin stores answer `next_cursor`. Zalando and JSON:API answer `next`/`prev` links. GitHub sends an RFC 8288 `Link` header ([RFC 8288](https://www.rfc-editor.org/rfc/rfc8288)).
  - A header is invisible to an `openapi-fetch` client's typed body. A body field is typed by the generated `schema.ts`.
- **React Query.**
  - `useInfiniteQuery` takes `initialPageParam` and `getNextPageParam`. A `null` or `undefined` result means there is no next page.
  - A stale infinite query refetches its pages one after another from the first, which keeps cursors valid. `maxPages` bounds the memory and the refetch cost ([TanStack Query: infinite queries](https://tanstack.com/query/latest/docs/framework/react/guides/infinite-queries)).
- **Indexable lists.**
  - Googlebot follows `<a href>` links but does not click "Load more" buttons and does not scroll. Items must be reachable through crawlable links or a sitemap.
  - Filtered and sorted variants should not be indexed ([Google Search Central: pagination and incremental loading](https://developers.google.com/search/docs/specialty/ecommerce/pagination-and-incremental-page-loading)).

## Decision

We will use two paging modes and one rule for small lists.

- **Cursor.** Every guest list and every unbounded list that can grow past a few hundred rows pages with one shared keyset cursor (§ 1 to § 5).
- **Numbered pages.** The per-store merchant tables keep numbered pages. They page by offset with a total (§ 6). This is the one exception to the cursor rule.
- **Whole lists.** Every other list stays whole, with a cap written next to it (§ 10).

Two numbers must not be confused. The **page size** is how many rows one request of a paged list returns: 10 by default and at most 20, for every paged list (amended 05.11.2026). The **cap** is a safety limit on the few lists that stay whole (map pins, categories, pickup points, small store lists such as members). It is not a page size: a whole list returns all its rows in one answer, and the cap only says when that list must be reviewed.

### 1. Cursor request

- `limit`: an integer from 1 to 20, default 10, on every cursor list (owner, 05.11.2026). A screen may ask for fewer, as the home does.
  - A value above 20 answers 400 `validation-failed`, as `adminStoreListQuerySchema` does today with its own bound. It is not silently lowered.
- `cursor`: optional, an opaque string of at most 512 characters, URL-safe base64. It is absent on the first page.
- Filters are named query parameters of the route, for example `category=<slug>`. There is no generic filter language.
- `sort`: only where a screen offers more than one order. It is an enum of named orders, each of which maps to one fixed key list. The default order is the one the screen uses today.

### 2. Cursor response

```ts
{ items: T[], nextCursor: string | null }   // plus `total` only where § 5 allows it
```

- `nextCursor` is null on the last page, and only then. A short page does not mean the end.
- There is no `hasMore`, because it would repeat what a null `nextCursor` already says.
- There are no `next`/`prev` links and no `Link` header. The generated client types only the body, and the SPA calls one origin.
- No backward paging. No screen needs "previous" from the server: the infinite query keeps earlier pages in memory.

### 3. Cursor

- **Format.** URL-safe base64 of `{"v":1,"k":[<sort values…>,<id>],"f":"<hash>"}`.
  - `k` is the last row's sort key, the id last.
  - `f` is a short hash of the route, the filters, the `sort` and the `lang`.
  - The server builds the cursor and is the only one that reads it. The OpenAPI description says the cursor is opaque.
- **Wrong cursor.** A cursor that does not decode, has an unknown `v`, has values of the wrong type, or whose `f` does not match the request answers 400 `validation-failed` with `errors: [{ in: 'query', path: 'cursor', … }]`. No new problem code is needed.
- **Not signed.** A forged cursor can only start the same query at another position. The route guard and the `where` clause still decide what the caller may see (AIP-158: a token grants no authorisation). Signing would add a secret and a rotation for no gain.
- **No expiry.** The cursor holds values, not a server-side state. A cursor whose row was deleted still works, because the seek compares values and does not look the row up.

### 4. Ordering and the query

These rules hold for both modes. An offset page also needs a deterministic order, or rows repeat between pages.

- **Tie-break.** Every order ends with the row's unique id, in the same direction as the sort key. `(published_at desc, id desc)` is right. `(updated_at desc, id asc)` is wrong for a cursor: a single row comparison cannot express mixed directions. The merchant pins list sorts that way today (`pin-repository.ts`, `order by p.updated_at desc, p.id`). It is fixed in its slice so that both modes share one rule.
- **NOT NULL keys.** Every sort key is NOT NULL, or is wrapped in `coalesce` the same way in the `order by` and in the comparison (Postgres 9.25.5).
- **Full-precision keys.** A `timestamptz` holds microseconds, and a JS `Date` holds milliseconds. A cursor that carries the key through a `Date` skips rows. In descending order, take a last row at `.123456` and a next row at `.123200`. The cursor stores `.123`, the next page asks for `< .123`, and the `.123200` row never comes. The id tie-break cannot save it, because the first column already decides. So the cursor carries a timestamp as Postgres text (`published_at::text`) or as epoch microseconds, never as a `Date`.
- **Stable keys.** Prefer a key that does not change while someone pages, such as `created_at`, `first_published_at` or a `uuidv7` id. `updated_at` moves a row that someone edits. That row can then repeat or be skipped between two pages. The guest lists do not sort by it.
- **Cursor query shape.** `where <filters> and (k1, k2, id) < ($k1, $k2, $id) order by k1 desc, k2 desc, id desc limit $limit + 1`. The extra row tells the server whether `nextCursor` is set. `list-stores.ts` already does this.
- **Index.** One btree index per paged order, with the equality filters first and then the sort keys in `order by` order. Example: `(store_id, created_at desc, id desc)`. Add `where status = 'published'` when the list only shows published rows.

| Paged route | Mode | Order | Index today | Needed (no migration written here) |
|---|---|---|---|---|
| `GET /api/public/stories` | cursor | carried version `published_at desc`, group `id desc` | `story_versions_published_idx (language, published_at desc) where status = 'published'`; `story_categories_pkey (group_id, category_id)` | None at first. A stored group key and index only if § 11's check fails |
| `GET /api/public/keepsakes` | cursor | `created_at desc, id desc` (today's order) | `products_store_status_idx (store_id, status)`, no sort key | `catalog.products (created_at desc, id desc) where status = 'published'` |
| `GET /api/public/tours` | cursor | `id desc` (today's order, a `uuidv7`) | primary key | None while it sorts by id |
| `GET /api/admin/stores` | cursor | `id desc` (`uuidv7`) | primary key | None |
| `GET /api/store/{storeId}/story-groups` | offset | `created_at desc, id desc` (today the repository returns `g.id, v.language` and the screen sorts) | none for the order | `content.story_groups (store_id, created_at desc, id desc)` |
| `GET /api/store/{storeId}/pins` | offset | today `updated_at desc, id` (mixed); becomes `updated_at desc, id desc` | none for the order | `content.places (store_id, updated_at desc, id desc)` |
| `GET /api/store/{storeId}/products` | offset | `created_at desc, id desc` | `products_store_status_idx (store_id, status)` | `catalog.products (store_id, created_at desc, id desc)` |
| `GET /api/store/{storeId}/inventory` | offset | `sku_id` (a `uuidv7`) | primary key | None while it sorts by id |
| `GET /api/store/{storeId}/media` | offset (built) | `created_at desc, name, id desc` | `media_store_kind_created_idx (store_id, kind, created_at desc)` | None. The order is already deterministic |

### 5. Counts

- No `total` by default on a cursor list.
- A cursor list may send `total` (an exact count) when a screen shows the number **and** the counted set has a known upper bound, for example the published stories of the guest list.
  - The count uses the same filters as the page and runs in the same transaction.
  - The response sends it on every page, so a filter change needs no second request.
- A numbered-page table always sends `total` (§ 6). Its facet counts (tab counts) follow the media library's model (`kinds`, `uses`, `statuses`).
- A route over an unbounded table (orders, audit log) sends no exact total. It sends nothing, or the planner's estimate under a name that says so (`estimatedTotal`).

### 6. Numbered pages for per-store merchant tables (the exception to the cursor rule)

The owner keeps numbered pages on the merchant tables (05.11.2026). The media library already pages this way.

- **Request.** `page` (an integer from 1) and `pageSize` (default 10, the owner's rows per page from 15.10.2026; maximum 20, amended 05.11.2026), plus the table's named filters (`status`, `q`, tab).
- **Response.** `{ items, total, page, pageSize }`, plus the table's facet counts. This is the media library's shape.
- **Query.** `order by <keys>, id desc limit $pageSize offset ($page - 1) * $pageSize`, with `count(*) over ()` or a separate count in the same transaction. A page past the end returns no items and the real `total`, as the media library does.
- **Where it is allowed.** It is allowed only when all three of these hold:
  - The route is under `/api/store/{storeId}/` and every query filters on `store_id` first, so it counts and skips one store's rows only.
  - The set has a known bound: hundreds of rows per store, low thousands at most.
  - The table shows page numbers.
- **Where it is not allowed.** A list that is unbounded even within one store (orders, audit log, payouts) uses the cursor, even on a merchant screen.
- **Offset limit.** `(page - 1) * pageSize` may not exceed 10,000. A larger value answers 400 `validation-failed` on `page`. At 10 rows a page that allows page 1,001. It keeps the worst skip to 10,000 index entries of one store, which is a few milliseconds. The media library's existing limits (`page` up to 10,000, `pageSize` up to 100) stay as built until slice 5, which aligns them with this rule. Its photo wall shows 24 a page today (`docs/decisions/2026-10-29-media-library-design.md`, item 6). Under the maximum of 20 it shows 20 a page, unless the owner grants the wall 24.
- **Accepted cost.** An insert or delete while a merchant pages shifts a row onto the next page or off it. With one or two editors per store this is rare and harmless: the next read is correct.

### 6a. Caching of public pages

- Each public page keeps today's headers: `ETag` and `max-age=30` (ADR-006).
- The cursor and the filters are in the URL, so each page is its own cache entry. Page 1 with no filter is the one most guests hit.
- `total` is in the body, so a publish changes the `ETag` of every page. That is acceptable at 30 seconds.
- No CDN cache is added by this decision.

### 7. Shared code

| Where | What |
|---|---|
| `packages/api-contract/src/page.ts` | `pageQuery({ defaultLimit })` and `pageOf(itemSchema, id)` for the cursor mode: `limit`, `cursor`, `{ items, nextCursor }`. `numberedPageQuery()` and `numberedPageOf(itemSchema, id)` for the numbered mode: `page`, `pageSize`, `{ items, total, page, pageSize }`. Each list gives its own `.meta({ id })`. A list that counts extends the cursor shape with `total`. A schema imports only `zod` (api-contract rule). |
| `api/src/platform/http/cursor.ts` | `encodeCursor(key, scope)` and `decodeCursor(raw, scope)`. A bad cursor becomes the `validation-failed` problem of § 3. The route decodes it before calling the use case and encodes `nextCursor` from what the use case returns. |
| `api/src/platform/db/keyset.ts` | `after(columns, key)`: the Drizzle `sql` row comparison. `page(rows, limit, keyOf)`: drops the extra row and returns `{ items, next }`. The repository asks for `limit + 1` rows from `after`. |
| `api/src/platform/db/offset.ts` | `offsetOf(page, pageSize)` with the 10,000-row limit of § 6, and the past-the-end count. |
| `front-end/src/features/data-client/` | `pagedQueryOptions`, a thin wrapper of `infiniteQueryOptions` with `initialPageParam: undefined` and `getNextPageParam: page => page.nextCursor ?? undefined`. The filters go in the query key, so a new filter starts at page 1. |
| `front-end/src/components/infinite-list.tsx` | One shared infinite-scroll list for guest pages: the sentinel, the fallback button, the live region and the end and error states of § 8. |
| `front-end/src/components/list-pagination.tsx` and `data-table.tsx` | `Pager` and `DataTable` gain a server mode: the page number, `total` and `pageSize` come from the answer, not from slicing an array. The query uses `placeholderData: keepPreviousData`, so the table does not flash empty between pages. |

The use cases and ports take a decoded `{ limit, after?: Key }` and return `{ rows, next?: Key }`, or take `{ page, pageSize }` and return `{ rows, total }`. They never see the encoded cursor. `list-stores.ts` is the cursor template, and `media-library-repository.ts` is the offset template.

### 8. Guest lists: infinite scroll

The owner chose a page size of 10 with infinite scroll, not a "Load more" button (05.11.2026).

- **First page on the server.** The route loader reads the first 10 on the server, so the HTML carries them (ADR-001). The component seeds an infinite query with that page (`initialData: { pages: [first], pageParams: [undefined] }`).
- **Loading more.** An `IntersectionObserver` watches a sentinel under the last card, with a root margin of about one screen. When the sentinel nears the viewport and `nextCursor` is set, the list fetches the next page. One fetch at a time.
- **Keyboard and fallback.** The sentinel is a real "Load more" button, not an empty element.
  - A keyboard or switch user tabs to it and presses it.
  - It also covers a browser without `IntersectionObserver` and a sentinel that cannot be scrolled into view.
  - Scrolling triggers it, so most guests never press it.
- **Announcing.** A polite live region says what arrived, for example "10 more stories". Focus does not move.
- **The end.** When `nextCursor` is null, the button goes and a line says the list is complete, for example "That's all 143 stories".
- **Errors.** A failed page shows an inline "Try again" in place of the button. It never retries in a loop.
- **The page bottom.** The guest shell has a fixed tab bar and no page footer, so infinite scroll hides nothing below the list. Nothing may be placed under an infinite list as its only path.
- **Back navigation.** Coming back to the list keeps the loaded pages from the query cache and the scroll position. Story lists set no `maxPages`, so the restore works. `maxPages` is for unbounded lists only.
- **Search engines.** Googlebot does not scroll. The sitemap stays the crawl path to every story. A filter variant is not indexed: it keeps the list's canonical URL.

### 9. Ranking by the guest's answers: within each page (amends ADR-006)

The owner chose to rank within each page (05.11.2026). ADR-006's privacy rule stands: the answers never leave the browser.

- The server sends the default order in pages: newest first.
- After hydration, the browser applies `rankByTags` to each page as it arrives, inside that page. Rows already on screen do not move when the next page loads.
- **What changes.** Before, a well-fitting older story could rise above every newer story. Now it rises only within its own page of 10. It no longer rises above newer pages. ADR-006 records this as an amendment.
- The category filter, run on the server, is the main way to narrow hundreds of stories.

### 10. Which list does what

Sizes are estimates for the Lucerne store in its first two years.

"Whole, cap N" means:

- The repository reads N + 1 rows.
- From 80 % of N it logs a warning, so the list moves to paging before anything is lost.
- Above N it logs an error and returns the first N. This truncation applies to every whole list **except the map**.
- **The map never cuts pins** (owner, 05.11.2026). It returns every published pin at any count. From 80 % of its cap it logs a warning, so the map moves to a viewport query before the size matters.

A test seeds the cap's rows and checks the log.

| Route | Called from | Today | Grows to | Decision |
|---|---|---|---|---|
| `GET /api/public/stories` | stories route C19 (`routes/_guest/$lang/stories/index.tsx`), home (`home/api/home-reads.ts`), search (`search/api/search-reads.ts`), sitemap (`seo/api/public-pages.server.ts`) | Every published story, newest first. The client filters, counts and ranks | Hundreds, per the owner | **Cursor (slice 1).** Default 10, infinite scroll. `category=<slug>` on the server, where a parent includes its sub-categories. `total` for "N stories". The home asks for `limit=3`. The sitemap and search loop over pages at `limit=20` until slices 2 and 6 |
| `GET /api/public/blog-categories` | stories route C19 | Every category | Tens | **Whole, cap 200.** Each item gains `storyCount`: the published stories carried in that language, sub-categories included for a parent. The chips no longer need the whole story list (additive) |
| `GET /api/public/map-categories` | map, home | Every category | Tens | **Whole, cap 200** |
| `GET /api/public/map` | map, home, search | Every published pin, `ETag`, `max-age=30` | Hundreds | **Whole, never cut, warning from 800 pins** (ADR-006). The map needs every pin in view, and the home and search read the same cached list. ADR-006 names a viewport query or vector tiles above about a thousand pins. The warning starts that decision; it is not part of this one |
| `GET /api/public/tours` | tours list (`routes/_guest/$lang/tours/index.tsx`), home routes rail (`home/api/home-reads.ts`), search, sitemap | Every published tour | 11 now, more later (owner: "there might be more in the future") | **Cursor (slice 3)**, like the other guest lists: 10 a load, infinite scroll on the tours list (amended 05.11.2026). The home routes rail asks for the first page only (`limit=10`), and its stay ranking applies within that page. If the rail has no link to the tours list, slice 3 adds one. The sitemap loops over pages. Search loops over pages until the search slice (6) |
| `GET /api/public/keepsakes` | keepsake list, search | Every published keepsake | Tens to low hundreds | **Cursor (slice 3)** with infinite scroll and the category filter on the server (four fixed categories plus sub-categories, M26). Until then: whole, cap 300 |
| `GET /api/public/keepsakes/{slug}/pickup-points` | keepsake page | Active pickup points | Under 20 | **Whole, cap 50** |
| `GET /api/store/{storeId}/story-groups` | merchant stories table | Every story group. The tabs and the search run on the client | Hundreds | **Numbered pages (slice 4).** `status`, `q`, `total` and the tab counts on the server |
| `GET /api/store/{storeId}/pins` | merchant pins table | Every pin, `updated_at desc, id` | Hundreds (events add up) | **Numbered pages (slice 4).** The order becomes `updated_at desc, id desc` (§ 4) |
| `GET /api/store/{storeId}/pins/story-options` | story picker in the pin editor | Every story | Hundreds | **Search-as-you-type (slice 4):** `q`, the first 20 matches, no paging. The merchant refines the search |
| `GET /api/store/{storeId}/products` | merchant keepsakes table | Every product | Tens to low hundreds | **Numbered pages (slice 5)** |
| `GET /api/store/{storeId}/inventory` | stock screen | Every SKU, with `filter`, `q` and `counts` on the server | Hundreds of SKUs | **Numbered pages (slice 5).** It keeps its counts |
| `GET /api/store/{storeId}/media` | media library | Numbered pages, `total`, facets | Hundreds to thousands | **Numbered pages, as built.** It is the model for § 6 |
| `GET /api/store/{storeId}/media/{mediaId}/uses` | media sheet | Every page that uses the file | Tens | **Whole, cap 200** |
| `GET /api/store/{storeId}/categories/{kind}` | category editor (drag order) | Every category | Tens | **Whole, cap 200.** A drag-ordered list must be whole |
| `GET /api/store/{storeId}/pickup-places` | pickup editor (drag order) | Every pickup place | Under 20 | **Whole, cap 50** |
| `GET /api/store/{storeId}/members` | members tab | Members and open invitations | Under 10 | **Whole, cap 50** |
| `GET /api/store/{storeId}/story-groups/{groupId}/links` | story editor | Linked pins and stories | Tens | **Whole, cap 100** |
| `GET /api/admin/stores` | Super Admin A01 | Cursor, raw uuid, default 50 | Tens | **Cursor (slice 1).** Default 10 and maximum 20, as every cursor list (was 1 to 100, default 50). It moves to the opaque cursor. `nextCursor` changes from `uuid` to `string`: a small type change in the generated client |
| Orders, bookings, audit log, reviews and comments, partner transactions, advice requests (not built) | — | — | Thousands, unbounded | **Cursor from the first commit**, merchant screens included (AIP-158: adding paging later is breaking). Order by a `uuidv7` id or `(created_at, id)`. No exact `total` |

Detail reads (`/{slug}`, `/{id}`) are not lists and do not change.

### 11. The stories slice in detail (slice 1)

- **Language in SQL.** The story list shows one card per story group, in the asked-for language, or else in the other language (`pickLanguage`). Today the server loads every published version and picks in TypeScript. A keyset must run on the version that is carried. So the pick moves into SQL: `distinct on (g.id) … order by g.id, (v.language = $lang) desc`. The result then sorts by that version's `published_at desc, g.id desc`.
  - This is the date the card shows, and the home's "newest 3" already sorts by it (owner default, 05.11.2026).
  - Today's list sorts by the newest version in any language, so a story whose German version was published later can move a little. That is the one visible change.
- **Index.** The sort runs over the derived set of published groups. That is a sort of a few thousand rows at most, which is fast, but not an index seek.
  - The existing `story_versions_published_idx (language, published_at desc) where status = 'published'` serves the language match.
  - `story_categories_pkey (group_id, category_id)` serves the category `exists`.
  - Acceptance: `EXPLAIN ANALYZE` on a test database seeded with 5,000 published stories stays under 20 ms for page 1 and for page 10.
  - If it does not, add a stored `story_groups.list_published_at`, filled on publish and unpublish, and an index `(list_published_at desc, id desc) where list_published_at is not null`. Do not do this up front.
- **Category filter.** `category=<slug>`. A parent includes its direct sub-categories (ADR-030). An unknown slug returns an empty list on the server, not 404. Today the page behaves differently: `resolveCategory` ignores a slug that no story has, and the page shows every story (the old demo links rely on this). The client keeps that behaviour. It checks the slug against the offered chips (those with `storyCount > 0`) and sends `category` only when it matches.
- **Count.** `total` counts the same filtered set, so "N stories" stays (owner default, 05.11.2026).
- **Consumers in the same slice.**
  - The home switches to `limit=3`.
  - The sitemap and search loop over pages at `limit=20` (with a stop after 100 pages, 2,000 rows, and an error log). They keep today's result until slices 2 and 6.

### 12. Contract and deploy order

- **Additive in the generated types.** `limit`, `cursor`, `nextCursor`, `total`, `page`, `pageSize` and `storyCount` are new optional parameters or new fields.
- **Not additive in behaviour.** A default limit or page size cuts what an old caller gets. The SPA (Vercel) and the API (Fly) deploy separately, so a page loaded before a deploy may call the new API.
  - Rule: while a route moves to paging, a request **without** `limit` (or `page`) still gets the whole list (up to the route's cap) for one release. The front-end sends the parameter explicitly from the same slice.
  - The next slice removes the fallback and sets the default. The contract test (`api/test/contract.test.ts`) shows both steps in the diff.
- **Admin stores.** The `nextCursor` type change from `uuid` to `string` is safe: the only caller passes it back unread.

### 13. Tests

- **`platform/http/cursor.ts`:** round trip; wrong base64; wrong `v`; wrong `f` (the filter changed); wrong value types. Each answers `validation-failed` with `path: cursor`.
- **`platform/db/keyset.ts`** (integration, Neon test database):
  - Seed rows with equal sort keys and walk every page. Every row appears exactly once.
  - Insert and delete rows between two pages. No row already passed repeats.
  - Seed `limit` rows exactly. `nextCursor` is null after the first page and no empty page follows.
  - Seed rows whose timestamps differ by less than a millisecond and walk every page. Every row appears exactly once (§ 4, full-precision keys).
- **`platform/db/offset.ts`:** an offset over 10,000 answers `validation-failed` on `page`; a page past the end returns no items and the real `total`; equal sort keys never repeat a row across pages.
- **Per paged route:**
  - Walk pages with each filter and check them against a full read.
  - Check `total` and the tab counts against the full read.
  - Run the store guard matrix (`store-guards.test.ts`) with a cursor or page of another store, which must not widen access.
- **Per whole route:** the 80 % warning; above the cap the error and the first N; for the map, every pin above the cap and the warning only.
- **Front-end:**
  - The sentinel loads the next page when it nears the viewport, and the fallback button loads it from the keyboard.
  - The live region announces each new page, and focus stays put.
  - The end line shows when `nextCursor` is null. A failed page shows "Try again" and does not retry by itself.
  - A filter change starts at page 1.
  - Ranking applies inside each new page only.
  - The SSR HTML of C19 holds the first 10 cards in newest-first order.
  - A merchant table moves between numbered pages from the server's `total` without an empty flash.

## Slice plan

Each slice is one story and one PR. Each leaves every screen working.

1. **Shared cursor code and stories.**
   - `page.ts` (cursor part), `cursor.ts`, `keyset.ts`, `pagedQueryOptions` and `InfiniteList`.
   - `GET /api/public/stories` with `limit`, `cursor`, `category` and `total`.
   - The stories page C19 gets infinite scroll (10 a page) and the server filter.
   - The home sends `limit=3`. The sitemap and search loop over pages.
   - Admin stores move to the opaque cursor.
   - D11 and `docs/development-rules/backend/api-contract.md` get the two modes and the § 6 exception.
2. **Blog category counts.** `storyCount` on `GET /api/public/blog-categories`. The chips stop needing the whole list. This is small and could fold into slice 1.
3. **Guest keepsakes and tours.** Both move to the cursor with infinite scroll, in one slice because they share the shared list component and the stories template. Keepsakes get the category filter on the server. The tours list pages; the home routes rail asks for the first page; the sitemap loops over tour pages; search keeps its page loop until slice 6.
4. **Merchant content tables, numbered pages.**
   - `page.ts` (numbered part), `offset.ts`, and the server mode of `Pager` and `DataTable`.
   - Story groups and pins with `page`, `pageSize`, `total` and the tab counts.
   - The story picker as search-as-you-type.
5. **Merchant catalog tables, numbered pages.** Products and inventory. The media library's `page` and `pageSize` limits are aligned with § 6 (maximum 20).
6. **Search on the server.** `GET /api/public/search?lang&q&kind`, paged (10 a load, at most 20), over published titles. Engine decided by the owner on 05.11.2026: Postgres built in, full-text search with the English and German dictionaries plus the `pg_trgm` extension for typos, partial words and Swiss spellings ("Loewendenkmal" finds "Löwendenkmal"); no hosted search service. Needs a migration for the search columns and indexes, approved separately before it runs. It decides the interest-tile filter (owner decision 4). It replaces the page loops of slice 1.
7. **Caps.** The warnings and the cap on every whole list in § 10, and the map's warning at 800 pins.

## Consequences

- A guest list costs the same at 50 stories and at 5,000. The SSR HTML holds 10 cards, not all of them.
- Two modes, each with one template, so a new list copies a template and needs no new decision. A guest or unbounded list uses the cursor. A bounded per-store table with page numbers uses offset.
- Merchants keep page numbers and a jump to page N. The cost is the offset rules of § 6 and a row that can shift during an edit.
- Ranking by answers works within a page only. A well-fitting older story no longer rises above newer pages (§ 9).
- The category chips and "N stories" need two small server answers (`storyCount`, `total`). Today the client derives them from the full list.
- Two consumers (sitemap, search) loop over pages for a while. That is debt until slice 6.
- Infinite scroll needs care for keyboard and screen reader users (§ 8). The fallback button and the live region are part of the shared component, not of each screen.
- Whole lists get a visible warning before they grow too large. The map never hides a pin, so its size limit is a warning that starts the viewport decision.

## Assumptions

- At most a few thousand published stories per store in the next two years. Beyond that, the stored sort column of § 11 is needed.
- Guests rarely scroll past three pages. Ranking within a page is good enough until analytics show otherwise.
- The sitemap is the crawl path to every story, so later pages need no crawlable link.
- Merchants work with tens to a few hundred rows per table, so an exact count and an offset per store stay cheap.
- One or two people edit a store at the same time, so a row shifting between two numbered pages is rare.

## Considered options

- **A. Keyset cursor, opaque, `{ items, nextCursor }` (chosen for guest and unbounded lists).** Stable under inserts and deletes, cheap at any depth, and it matches D11 and the existing admin list. It gives up page numbers.
- **B. Offset (`page`, `pageSize`, `total`) (chosen for per-store merchant tables only).** It keeps the numbered pager the owner asked for, and the media library already does it. A deep page reads every row before it, and an insert shifts the pages (Use The Index, Luke; Zalando #160). § 6 bounds both costs. Rejected for guest and unbounded lists.
- **B2. Cursor with Prev/Next for merchant tables.** One mode everywhere, but no jump to page N. Rejected by the owner (05.11.2026).
- **C. Raw cursor (`?after=<id>`, as admin stores does today).** It works only when the sort key is the id. A list ordered by date needs the date in the cursor too, and the shape then leaks into clients that may start to build it (Zalando, AIP-158). Rejected.
- **D. Signed or encrypted cursor.** It stops clients reading or forging a cursor. But a forged cursor gains nothing (§ 3), and signing adds a secret to rotate. Rejected for now. The `v` field allows it later.
- **E. `Link` header (RFC 8288, GitHub style) or `next` links in the body (Zalando, JSON:API).** The `openapi-fetch` client does not type headers into the result, and links repeat the path the client already has. Rejected.
- **F. `hasMore` beside or instead of `nextCursor` (Stripe).** Stripe's cursor is the last object's id, so it needs a separate flag. Ours is opaque, so null already says "no more". Rejected as redundant.
- **G. Send the guest's answers so the server ranks the whole list.** This would keep whole-list ranking on a paged list. But ADR-006 forbids answers in any query, header or body, a contract test enforces it, and Q12 and G4 promise the server never sees them. Rejected (owner, 05.11.2026).
- **H. Keep whole lists and cache them harder (CDN, longer `max-age`).** It hides the cost for a while. The payload and the SSR HTML still grow with every story, and a phone still parses all of it. Rejected for stories. Kept for the map within ADR-006.
- **I. A bounded "whole" stories read (for example the newest 200), ranked on the client.** It keeps the ranking across what is loaded, with no paging code. But it silently drops older stories from the list and from the category filter. Rejected.
- **J. A "Load more" button instead of infinite scroll for guests.** Simpler, with no sentinel. Rejected by the owner (05.11.2026). The button survives as the keyboard fallback of § 8.

## Owner decisions (05.11.2026)

1. **Ranking: within each page.** The server sends newest first in pages. The browser reorders each loaded page by the saved answers. The answers never leave the browser, so ADR-006's privacy rule stays. ADR-006 is amended: a well-fitting older story no longer rises above newer pages (§ 9).
2. **Merchant tables: keep numbered pages.** Per-store tables use offset paging with a total. This is the one exception to the cursor rule, bounded as § 6 says: per-store sets only, page size 10 by default and 20 at most (amended 05.11.2026), at most 10,000 rows skipped, and never for an unbounded list. The media library already pages this way.
3. **Guest stories: 10 a page with infinite scroll**, not a "Load more" button. The server renders the first 10. The sitemap stays the crawl path. A keyboard-reachable fallback button and a live region that announces new items are part of the shared component (§ 8).
4. **Map: whole list, never cut pins.** A warning is logged from 80 % of the cap (800 pins), so the map moves to a viewport query before the size matters (§ 10).

The owner did not answer the remaining three questions. The coordinator's defaults are recorded here:

5. **Interest filter in search:** deferred to the search slice (slice 6) as its own decision. That decision says whether an `interest=` filter for the tiles is allowed under ADR-006.
6. **Order of the stories list:** accepted. It sorts by the date of the language version the card shows, as the home does (§ 11).
7. **"N stories":** kept, through `total` on the stories list. It is bounded per guest list (§ 5, § 11).

## Amendments
- 2026-11-05 (owner, chat 05.11.2026), two decisions after acceptance. The body above is updated to match.
  - **Page size.** Every paged list, cursor and numbered alike, returns 10 rows by default and at most 20 per request. This replaces the earlier maximum of 100 (§ 1, § 6). Admin stores move from default 50 to default 10. The sitemap and search loops use `limit=20`. The media library's photo wall (24 a page today) moves to 20 in slice 5: the owner chose 20 for consistency (05.11.2026). The page size is not the cap of a whole list (see the Decision).
  - **Tours are paged.** `GET /api/public/tours` moves from "whole, cap 200" to the cursor, 10 a load with infinite scroll, like the other guest lists, because "there might be more in the future". It lands in slice 3 with guest keepsakes. The home routes rail asks for the first page. Search reads tours through its page loop until the search slice (6).

- 2026-11-05: Merchant stories table default order is last updated first (`updated_at desc, id desc`), not created; owner decision, to keep the order merchants saw before and match the Updated column.

## History
- 2026-11-05 proposed (owner question on pagination; research and audit of every list route)
- 2026-11-05 accepted (owner, chat 05.11.2026): rank within each page; numbered pages for per-store merchant tables; 10 a page with infinite scroll for guest stories; the map never cuts pins. Coordinator defaults for search interest filter (deferred), story order (shown version's date) and "N stories" (kept)
- 2026-11-05 amended (owner, chat 05.11.2026): page size 10 by default and 20 at most on every paged list; tours paged like the other guest lists (slice 3)
- 2026-11-05 amended (owner): merchant stories table opens with the last updated story first (see Amendments)
