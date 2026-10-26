# ADR-001: Render indexable pages with TanStack Start routes, and keep dashboards client-rendered

Status: accepted
Date: 2026-10-26
Source: AD-2
Applies to: `front-end/src/main.tsx`, `front-end/src/routes/**`, `front-end/vite.config.ts`, `front-end/vercel.json`, `front-end/package.json`, `api/src/platform/http/`, `Dockerfile`, `fly.toml`, `packages/domain/src/content/`

New dependencies, approved by the owner (gates S1 and S1b, 2026-10-26, confirmed by a passing spike): `@tanstack/react-start` 1.169.4 and `nitro` 3.0.260903-beta with its Node target. Nitro is a beta release. No new vendor or paid service.

## Context
PRD AC61 requires that each story and place page has its own address per language, that the full text is in the first HTML response, that no `noindex` is set, and that the page is in the sitemap. SM-1 (search traffic) depends on it. Merchants edit content at any time without a release (AC45), and the owner set the visible delay to about 60 seconds, 5 minutes at most (gate D5).

Today the SPA uses hash history (`front-end/src/main.tsx:41`), so search engines see one page, and `index.html` is an empty shell. The front-end is Vite 8 with TanStack Router file routes (89 route files, 25 with `validateSearch`, 194 files import the router), HeroUI 3.2.6, Tailwind 4.3 and the React Compiler.

The first version of this ADR proposed API-built HTML documents with an SPA takeover. The owner asked for a framework comparison, and two one-route spikes ran on 2026-10-26 (`.factory/runs/20261025-storytelling-pivot/spikes/`). The owner chose TanStack Start for the whole app (gates S1 and S1b).

## Decision
We will move the front-end to TanStack Start on Vite, server-render the public content routes, and keep every dashboard route client-rendered.

**Routes**
- Server-rendered: `/:lang` (home), `/:lang/stories`, `/:lang/stories/:slug`, `/:lang/places/:slug`, `/:lang/map`, `/:lang/tours`, `/:lang/tours/:slug`, `/:lang/gifts`, `/:lang/gifts/:slug`. Every one of these URLs must exist, including the home page and list pages that `/` redirects to.
- `ssr: false`: `store/*`, `admin`, `partner/*`, `lab/*`, `account`, cart and checkout, `sign-in`, `invitation`. They send `noindex`.
- Browser history replaces hash history. `base` in `vite.config.ts` is `/`.

**Head and sitemap**
- Each server-rendered route returns title, description, canonical, hreflang alternates (`en`, `de`, `x-default` English) and Open Graph from `head()`. Absolute URLs come from `VITE_SITE_URL`. The `lang` attribute follows the URL.
- `sitemap[.]xml` is a server route that reads published pages and writes `xhtml:link` alternates. `robots.txt` names it. Staging and local builds send `noindex` and a disallow-all `robots.txt` from one config value.
- JSON-LD carries no `offers`.

**Redirects and language** (details in ADR-002)
- A loader redirects with `redirect({ statusCode: 302 })`. The spike confirmed a real 302.
- `/` redirects to `/:lang` by the `sk_lang` cookie, then `Accept-Language` (German only if asked), then `en`. An address in a language without a version redirects to the version that exists, or returns 404.

**Caching**
- The content source keeps a 60-second in-process TTL per instance. Responses send `Cache-Control: public, s-maxage=60, stale-while-revalidate=240`. No publish broadcast is built. In the spike an edit showed at 46 seconds. With two instances each can be 60 seconds stale, and about 120 seconds behind a CDN, which stays under the 5-minute cap.
- The price and the stock availability are not part of the cached server text. The product page loads them from the product detail route (gate D10, AC52, AC53).
- Guest review text is not in the server-rendered text in Phase 1.

**Server**
- The build target is Nitro with the Node preset, run as `node .output/server/index.mjs` on Fly `fra`, one image.
- The Hono API and the Start web server run as two programs side by side in one Fly app, from one image (owner gate H1, 2026-10-26). Fly runs a `web` process (`node .output/server/index.mjs`) and an `api` process (Hono, with `ROLE` as in backend.md D1). The web server forwards `/api/**` and `/webhooks/**` to the API, the way the Vite dev server proxies `/api` to `API_PROXY_TARGET` today. The browser sees one origin (backend.md D3). The forwarding must keep cookies, the `Origin` header, the raw request body (Stripe signatures) and `Fly-Client-IP` (the rate limits read it).
- The Hono API stays the only place for commands, auth and jobs. Server loaders read content from the API over the local network with the generated `packages/api-contract` client. They do not import API module code. The spike read content in-process, so this hop is new. The web server keeps a 60-second TTL cache of those reads.

**Rules the spike found**
- Load CSS with a side-effect import in `__root.tsx` (`import '../styles/app.css'`). A `?url` import in `head().links` gave a 404 stylesheet and an unstyled first paint.
- Import server-only code dynamically inside the handler, so it never enters the client bundle.
- Run `tsc --noEmit` in CI. Docs show `.inputValidator(...)` but 1.169.4 needs `.validator(...)`. The wrong call returned 500 on every route and only `tsc` caught it. Pin the exact Start and Nitro versions.
- The map loads with `ClientOnly` and `React.lazy`. It needs `setWorkerUrl` with the MapLibre worker files in `public/`.
- About 109 `"use client"` warnings from HeroUI at build are harmless.

**Links and tokens**
- A hash-link migration shim maps old `#/path` links to their path once, on the client, so shared prototype links keep working.
- The invitation token stays in the URL fragment. `captureInvitations` is kept and tested under the new router. `takeGoogleReturn` is removed, because `/sign-in?error=` is now readable. Both flows need an end-to-end test, since each was written for hash history.
- The partner report token stays a path segment (gate D7). `/partner/*` sends `Referrer-Policy: no-referrer` and `X-Robots-Tag: noindex`, and the access log scrubs the token.
- A Start request middleware registered in `src/start.ts` sets these headers (and `noindex` on every private area) on pages, 404s and router redirects, matching the path the way the router does. Start answers a protocol-relative path such as `//partner/x` with a 308 before any middleware runs, so that one redirect has no headers (its target has). Gate G-E33-STARTMW.
- `/r/:code` records the visit and redirects to an optional same-origin target path, else `/:lang` (AC24).

**Price rule (gate D10).** No document, meta tag, JSON-LD, list page, list JSON or public list response carries a price. Price elements carry `data-nosnippet`.

## Consequences
- One renderer produces the page text for visitors and crawlers. The earlier parity test and string renderer are not needed.
- Everything in `front-end/` builds with Start and Nitro. A Nitro beta change or a Start API change can break the build, so versions are pinned.
- The migration is about 2 to 3 weeks for one developer (spine, "Migration from the prototype", from spike question 9, an estimate and not a measurement).
- First load is smaller than with Next.js in the spike: 597,965 bytes against 632,574 bytes in total, and 162,551 against 191,552 bytes of non-map JavaScript, about 15 percent less.
- Search engines get server HTML for public pages only. A visitor on a slow phone gets HTML first and the bundle after.
- The demo stays on Vercel static hosting until launch (owner gate H3, 2026-10-26, which amends H2). The Fly staging app hosts only the real app. Vercel is retired at launch, and `front-end/vercel.json` goes then.
- A request for a server-rendered page costs one extra local call to the API.

**Interim state and launch blocker (gate G-E33-D10, 2026-10-27).** E3.3 server-renders the prototype's guest routes as built, so their first HTML still carries CHF prices and guest comment and review text. This breaks the price rule and the review rule above until the pages are rebuilt. The Start server must not go live until E4.12 (tours), E4.13 (home), E4.14 (search, `ssr:false`) and E6.4 (product pages, with price and stock loaded in the browser) have removed prices and guest text from the server HTML. Each of those four stories has a spec check for it.

## Assumptions
- Start 1.169.4 and the Nitro beta stay stable enough to pin and upgrade deliberately. If Nitro's beta blocks a deploy, the fallback is another Start deployment preset.
- Real app providers (auth session, demo store, locale) run under server rendering. The spike did not test them. The owner moved this check to the start of the migration, with no separate spike (gate H1). Server rendering needs them to avoid `window` at render time (8 files use browser storage, 42 touch `window` or `document`, and dashboards stay `ssr:false`).
- Forwarding `/api` and `/webhooks` through the web server keeps cookies, `Origin`, the raw body and `Fly-Client-IP`. The dev server proxy already forwards `/api` for sign-in.
- A story page for a no-JavaScript visitor shows styled text after the CSS fix. Not re-checked in the spike.
- Fly runs two web instances and each is at most 60 seconds stale. If the owner wants faster for every visitor, a publish broadcast (Postgres `NOTIFY` or Redis) is needed.
- Not verified in the spike: `vite dev`, a real API as the content source, two Fly processes with forwarding, two instances, client navigation between stories through a server function, map tiles drawn, and a Fly deploy.

## Considered options
- **A. TanStack Start for the whole app (chosen, gates S1 and S1b).** Keeps the router, file routes and search-params pattern. Spike: all of questions 1 to 8 passed, 302 redirects, sitemap with alternates, 60-second TTL working, map client-only, smaller bundle. Cost: Nitro beta, no official SPA-to-Start guide, 2 to 3 weeks.
- **B. API-built HTML plus SPA takeover (the previous ADR-001).** No new dependency. Needs a second string renderer, a parity test, a document for every block type and a client takeover that Google calls acceptable but not preferred. Rejected, because the Start spike showed a single render path works with HeroUI.
- **C. Next.js App Router.** The spike also passed. The research found Next.js stronger on images, metadata and mature server components, with an official HeroUI setup. Against it: 89 route files and 25 `validateSearch` rewrites, typed `Link` lost, redirects return 307 unless a proxy file is added, the on-disk cache needs a custom handler with several instances, and its bundle was larger in the spike. A full migration takes weeks.
- **D. Next.js for the public site and the existing Vite SPA for dashboards.** Two frameworks and two build setups, with a shared design system in both. The owner chose one framework (gate S1b).
- **E. Prerender at build time, or a prerender service for crawlers.** A rebuild on every merchant save, or a new vendor that Google calls a workaround. Rejected.

## History
- 2026-10-26 proposed (API-built documents)
- 2026-10-26 revised, still proposed, for owner gates S1 and S1b and the two spikes
- 2026-10-26 accepted (gate DESIGN)
- 2026-10-26 amended (gate H3)
- 2026-10-27 amended (gate G-E33-D10): interim prices and guest text in prototype server HTML; launch blocked until E4.12, E4.13, E4.14, E6.4
- 2026-10-27 amended (gate G-E33-STARTMW): private-area headers set by Start request middleware
