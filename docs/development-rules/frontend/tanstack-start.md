# TanStack Start

Read this before you add or change a route, a loader, server code, the document head, or anything that renders on the server. Start 1.169.4 and Nitro 3.0.260903-beta are in use since E3.2 (`../tech-stack.md`, ADR-001). Facts about the build and the known traps are in `stack-notes.md`.

Each rule has a label.
- **Documented.** The shipped TanStack skills in `node_modules`, or the Start docs, say it.
- **Learned in this repo.** A spike, an incident or a ticket report found it.
- **Guidance.** Our choice, not enforced.

Examples use the repo's style. Every API in them exists in the installed version. The state they describe is the target state. Where `main` does not match yet, the rule says so.

## Where code runs

### 1. Loaders run on both sides, so they hold no secret and no browser API (Documented)

A loader runs on the server for the first request and in the browser for every later navigation. `process.env`, a secret, `window` and `localStorage` do not belong in it. Put code that must run on one side behind a boundary: `createServerOnlyFn`, `createClientOnlyFn`, `<ClientOnly>` or `useHydrated`. Only `VITE_` variables reach the browser, so a server secret never gets that prefix. Read server variables inside a function, never at module scope.

```ts
import { createServerOnlyFn } from '@tanstack/react-start'

// Don't: this line runs when the module loads, and it ends up in the client bundle.
const key = process.env.MAIL_KEY
// Do: it runs per call, and it throws if the browser calls it.
export const mailKey = createServerOnlyFn(() => process.env.MAIL_KEY)
```

### 2. The Hono API owns commands, auth and jobs, so we write no `createServerFn` by default (Learned in this repo)

ADR-001 keeps the Hono API as the only place for commands, auth and jobs. Start's shipped skills teach server functions first. Do not follow them here. If a server function is ever added, it needs four things: `.validator()`, an auth check inside the function (a `beforeLoad` guard protects the screen, not the endpoint), `useServerFn` when it throws `redirect` or `notFound`, and the CSRF middleware of rule 6. Ask first, because a server function is a second place for business rules.

```ts
const rename = createServerFn({ method: 'POST' })
  .validator((data: { id: string, name: string }) => data)
  .handler(async ({ data }) => {
    await requireSession() // inside the handler, not only in beforeLoad
    return renameStory(data)
  })
```

### 3. Use `.validator()`. `.inputValidator()` does not exist in 1.169.4 (Learned in this repo)

The web docs show `.inputValidator(...)`. The installed `createServerFn.d.ts` has only `.validator(...)`. In the spike the wrong name returned 500 on every route, and only `tsc --noEmit` caught it. Check a method name in `node_modules` before you copy it from a web page, and again after a Start upgrade.

```ts
// Don't: the docs' name, absent in 1.169.4
createServerFn().inputValidator((data: { id: string }) => data)
// Do
createServerFn().validator((data: { id: string }) => data)
```

### 4. A loader that reads the API uses the generated client with an absolute base (Learned in this repo)

A relative `fetch('/api/...')` in a loader fails during server rendering, because the server has no origin. Use `createApiClient` from `@sk/api-contract` (see `api-integration.md`). The server base is the API's internal address, read inside a function. The browser base is its own origin, and the paths already start with `/api`. A loader never imports API module code (`api/src/`). Today only the stores feature calls the API, from the browser (`front-end/src/features/stores/api/api-client.ts`). The name of the server variable is chosen with the first server-rendered loader. `API_ORIGIN` below is a placeholder.

```ts
const apiOrigin = createIsomorphicFn()
  .server(() => process.env.API_ORIGIN ?? 'http://127.0.0.1:5002')
  .client(() => window.location.origin)

// Don't: loader: () => fetch('/api/public/stories').then(r => r.json())
loader: async () => (await createApiClient(apiOrigin()).GET('/api/public/stories')).data,
```

## Rendering

### 5. Routes are client-only by default. Public routes opt in, private routes stay out and say so (Learned in this repo)

`defaultSsr: false` lives in `front-end/src/start.ts`, because Start reads it there and not from the router options. A route renders on the server only with `ssr: true`, and a parent's `false` wins over a child's `true`. So set `ssr: true` on every layout above a public route as well as on the route. Private routes (`store`, `admin`, `partner`, `lab`, `sign-in`, `invitation`, cart and account) keep `ssr: false`, and Start request middleware in `src/start.ts` adds `X-Robots-Tag: noindex` for their paths (owner gate G-E33-STARTMW). `main` has the root route with `ssr: true` and the default today. The public routes and the middleware arrive with E3.3. Two traps from E3.3: compare the lower-cased path, because the router matches paths without regard to case, and test the header against a built server, not only in dev.

```ts
// src/start.ts
const privateRoutes = createMiddleware().server(async ({ next, pathname }) => {
  const result = await next()
  if (pathname.toLowerCase().startsWith('/store'))
    result.response.headers.set('X-Robots-Tag', 'noindex')
  return result
})
export const startInstance = createStart(() => ({
  defaultSsr: false,
  requestMiddleware: [privateRoutes],
}))
```

`src/routes/__root.tsx` shows the root's `ssr: true`. Check with `curl -I localhost:<port>/store` on the built server.

### 6. Add CSRF middleware with the first server function or non-GET server route (Documented)

A server function is a POST endpoint that a form on another site can hit. `createCsrfMiddleware` checks `Sec-Fetch-Site`, `Origin` and `Referer`, and answers 403 on a mismatch. The `filter` below covers server functions. A non-GET server route needs its own filter, because `handlerType` is `'router'` for it. It covers Start's endpoints only, not the Hono API.

```ts
requestMiddleware: [
  createCsrfMiddleware({ filter: ctx => ctx.handlerType === 'serverFn' }),
  privateRoutes,
],
```

### 7. Server routes: `sitemap[.]xml.ts` and `robots[.]txt.ts`, with escaped XML and honest cache headers (Documented, Learned in this repo)

Write a file route with `server.handlers`. The `[.]` escapes the dot in the file name. Escape every value that goes into XML. ADR-001 sets the public cache header for content: `public, s-maxage=60, stale-while-revalidate=240`. A response that reads the session gets `private, no-store`, because a shared cache would serve one person's answer to the next.

```ts
export const Route = createFileRoute('/sitemap.xml')({
  server: {
    handlers: {
      GET: async () => new Response(await sitemapXml(), {
        headers: {
          'Content-Type': 'application/xml',
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=240',
        },
      }),
    },
  },
})
const escapeXml = (s: string) => s.replace(/[<>&'"]/g, c => `&#${c.charCodeAt(0)};`)
```

### 8. The head comes from loader data, with absolute URLs (Documented; hreflang from ADR-002)

`head()` receives `loaderData`, which can be `undefined` while a loader fails, so read it with `?.`. Build every URL from `import.meta.env.VITE_SITE_URL`: a canonical, Open Graph and JSON-LD URL must be absolute. JSON-LD carries no `offers` (the price rule, D10). The Start docs say nothing about hreflang. Add `rel: 'alternate'` links with `hreflang` yourself, as ADR-002 sets (`en`, `de`, `x-default`).

```ts
head: ({ loaderData }) => {
  const url = `${import.meta.env.VITE_SITE_URL}/en/stories/${loaderData?.slug}`
  return {
    meta: [{ title: loaderData?.title }, { property: 'og:title', content: loaderData?.title }],
    links: [
      { rel: 'canonical', href: url },
      { rel: 'alternate', hreflang: 'de', href: url.replace('/en/', '/de/') },
    ],
  }
},
```

### 9. Load global CSS with a side-effect import in `__root.tsx` (Learned in this repo)

The Start Vite and Tailwind guides show `import appCss from '../styles/app.css?url'` with `links: [{ rel: 'stylesheet', href: appCss }]`. In the spike that gave a 404 stylesheet and an unstyled first paint. The CSS-styling guide lists the side-effect import as the second, manifest-managed pattern. Keep the import. Do not "fix" it from the Vite guide.

```tsx
// Do: front-end/src/routes/__root.tsx
import '@/styles/globals.css'
// Don't
import appCss from '@/styles/globals.css?url'
```

### 10. The first render matches on the server and in the browser (Documented, Learned in this repo)

A mismatch makes React discard the server HTML (error #418 in E3.2). During render on a server-rendered route, do not read `Date.now`, `new Date()`, `Math.random`, `window`, `localStorage` or `navigator`. Render the same first output on both sides, then apply saved state after hydration. `AppProviders` does this: it starts from a seed store in English and restores the saved state and language in an effect (`front-end/src/app-providers.tsx`). Pin the locale and the time zone for any date text, or the server and the guest's phone print different days. Use `suppressHydrationWarning` only on one known node.

```tsx
const hydrated = useHydrated()
const day = dateTimeFormat('en-CH', { timeZone: 'Europe/Zurich', dateStyle: 'medium' })
// Don't: <p>{day.format(Date.now())}</p>
return <p>{hydrated ? day.format(Date.now()) : null}</p>
```

### 11. Keep server-only code out of the client bundle (Documented, Learned in this repo)

Name the file `*.server.ts`. Start's import protection then refuses the import from client code. The `server-only` marker import is the experimental alternative (rule 15). It is an error in a build and only a mock in dev, so run `pnpm build` after you add such a file. Import server functions statically, because the build swaps them for stubs. Import a heavy server-only helper with `import()` inside the handler, as ADR-001 says.

```ts
// src/lib/mail-keys.server.ts: import protection applies by the file name
export const mailKey = () => process.env.MAIL_KEY
// Heavy helper, inside a server handler
const { renderPdf } = await import('./render-pdf.server')
```

### 12. Make the QueryClient per request (Documented)

A module-level `new QueryClient()` shares one cache between every request the server handles, so one guest's data can reach the next. Start calls `getRouter` once per request on the server. `AppProviders` holds the client in `useState(startSeedDemo)`, which also runs once per request. `@tanstack/react-router-ssr-query` is not adopted. Ask before you add it (`../tech-stack.md`).

```ts
// Don't: export const queryClient = new QueryClient()
const [demo] = useState(startSeedDemo) // one store and one QueryClient per request
```

### 13. Keep route options in one order (Documented)

Type inference follows the order of the options. Write `validateSearch`, `loaderDeps`, `beforeLoad`, `loader`, then the rest. `loaderDeps` returns only the keys the loader uses, because the loader re-runs whenever its result changes.

```ts
export const Route = createFileRoute('/_guest/gifts/')({
  validateSearch: parseGiftsSearch,
  // Don't: loaderDeps: ({ search }) => search
  loaderDeps: ({ search }) => ({ subcategory: search.subcategory }),
  loader: ({ deps }) => loadGifts(deps.subcategory),
})
```

### 14. Unknown public slugs throw `notFound()` and answer 404 (Documented)

This is the target state for the content routes. Today an unknown slug shows the not-found panel with status 200, and a later ticket adds the loader. A search engine reads the status, not the panel. After you add the loader, check the status with `curl -I`. A failed loader is retried with `router.invalidate()`, which also resets the error boundary. Do not call `reset()` (`RouteError` in `front-end/src/components/route-fallbacks.tsx` uses `invalidate`).

```ts
loader: async ({ params }) => {
  const story = await loadStory(params.slug)
  if (!story)
    throw notFound()
  return story
},
```

### 15. Experimental APIs need an ADR, and docs come first (Guidance)

`Hydrate` with its strategies, the `transformAssets` plugin option and the `server-only` and `client-only` markers are marked experimental or new. Use one only with a reason written in an ADR. Before you use any Start API, read the shipped skill that matches the installed version, and check a web snippet against `package.json`, because `/latest` can be ahead. Find the skills with the command in `AGENTS.md`. A shipped skill is version-matched, but it is generic. Where it says "call a server function from the loader" or "use `createServerFn`", rules 2 and 4 of this file win.

```tsx
import { Hydrate } from '@tanstack/react-start'
import { visible } from '@tanstack/react-start/hydration'

<Hydrate when={visible()} fallback={null}><ReviewList /></Hydrate>
```

## How to check

- `pnpm exec tsc --noEmit` catches a wrong method name (rule 3). Run it in CI.
- `pnpm build`, then `node .output/server/index.mjs`, then `curl -I` for status and headers (rules 5, 7, 14). Dev mode is not proof.
- `pnpm verify:routes` and `pnpm verify:renders` compare two builds (`front-end/scripts/verify/README.md`).
- A hydration error shows in the browser console. Open a built page and read it.
