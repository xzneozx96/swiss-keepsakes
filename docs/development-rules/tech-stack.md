# Tech stack

The selected stack for the front-end and the back-end. Every item has one of three states.

- **In use.** It is in the code today. The source is `front-end/package.json` and the config files.
- **Planned.** It is chosen in `docs/architecture/backend.md` (a proposal, last updated 19.10.2026, pending owner review). It is not in the code yet.
- **Not allowed.** The owner ruled it out.

The lint standard is `@antfu/eslint-config` with no Prettier, adopted on 2026-10-19. See `frontend/linting.md`.

## Front-end (`front-end/`)

| Area | Choice | State | Source |
| :-- | :-- | :-- | :-- |
| Language | TypeScript 5.9, strict | In use | `tsconfig.json` |
| UI | React 19 with the React Compiler 1.0 (`@rolldown/plugin-babel`) | In use | `vite.config.ts` |
| Build | Vite 8 (Rolldown) | In use | `package.json` |
| Routing | TanStack Router 1.170 under TanStack Start 1.169.4 on Vite, file routes, browser history | In use since E3.2 | `front-end/src/routes/`, `front-end/src/router.tsx` (`getRouter`), `front-end/src/start.ts` (`defaultSsr: false`), `front-end/src/routes/__root.tsx` (document shell), `front-end/src/app-providers.tsx`. Change (ADR-001, ADR-002, owner gates S1 and S1b, 2026-10-26, accepted 2026-10-26): language-prefixed URLs and public content routes that render on the server (`ssr: true`, E3.3); dashboards stay client-rendered. |
| UI library | HeroUI v3.2.6 (`@heroui/react`, `@heroui/styles`) | In use | `docs/ux/heroui-reference/` |
| Styling | Tailwind CSS 4.3 through `@tailwindcss/vite`, no `tailwind.config` file | In use | `vite.config.ts` |
| Class helpers | `clsx` (used in 5 files). `tailwind-variants` is installed and unused | In use | `package.json` |
| Icons | `reicon-react`, only through `front-end/src/components/icons.ts` | In use | `front-end/src/components/icons.ts` |
| Charts, maps, calendar, editor | Recharts 3.10, MapLibre GL 6, FullCalendar 7, Tiptap | In use | `package.json` Production map tiles are decided later, with O23 (owner gate D4). ADR-006 compares the sources. The prototype uses swisstopo SWISSIMAGE, AWS Terrarium and OpenFreeMap, free and without a key or a checked SLA (ADR-006, proposed). |
| Assistant chat UI | `@ai-sdk/react` | In use | `package.json` |
| Dates | `@internationalized/date`, `temporal-polyfill` | In use | `package.json` |
| Framework for public pages | `@tanstack/react-start` 1.169.4 and `nitro` 3.0.260903-beta (Node target, beta), pinned exactly. `tsc --noEmit` in CI. Server routes for `sitemap.xml` and `robots.txt` are planned. Rules: `frontend/tanstack-start.md` | In use since E3.2 (`front-end/vite.config.ts`, `front-end/src/start.ts`). Approved by the owner (gates S1, S1b) | ADR-001, ADR-002 |
| Start and Query integration | `@tanstack/react-router-ssr-query` | Not adopted. Ask before you add it. `AppProviders` makes the `QueryClient` per request instead | `frontend/tanstack-start.md` rule 12 |
| TanStack reference for agents | The skills that `@tanstack/react-start`, `@tanstack/react-router` and their core packages ship in `node_modules`. They are MIT licensed and match the installed version. `@tanstack/intent` is not a dependency | In use as the reference, found with the command in `AGENTS.md`. Our rules win where they differ (the Hono API owns commands) | `frontend/tanstack-start.md` rule 15 |
| Content authoring | The in-app merchant editor over Postgres (extends `features/content/merchant`, Tiptap already in use). Payload, Sanity and Strapi rejected | Proposed. Owner gate S2. Not in the code | ADR-003 |
| Commerce engine | None. Own catalog, inventory, cart and order logic plus Stripe. Medusa 2, Shopify and WooCommerce rejected. Medusa's open-source schema is a study reference only. Server cart (gate M7), generic product options and category tables with no category UI in Phase 1 (gates M9, M10) are adopted | Proposed. Owner gate S3 | ADR-021 |
| Tour booking | Hidden: routes and entry points removed, feature code kept compiled | Proposed. Not in the code | ADR-012 |
| Lint | ESLint 9 with `@antfu/eslint-config` (`react`, `typescript`, jsx-a11y), `eslint-plugin-boundaries` for layers, react-hooks 7.1 compiler rules. Formatting is ESLint Stylistic | In use | `front-end/eslint.config.mjs`, `frontend/linting.md` |
| Server state | TanStack Query 5.104 (`@tanstack/react-query`), a `DataClient` per feature, the demo store behind it | In use since E1.11. No devtools | `front-end/src/features/data-client`, `frontend/api-integration.md`, `docs/architecture/backend.md` D19 |
| API client | `createApiClient` from `@sk/api-contract`: `openapi-fetch` 0.17 over types that `openapi-typescript` 7.13 generates from the API's OpenAPI document | In use for the stores feature (E2.3): `front-end/src/features/stores/api/api-client.ts` loads it with `import()` on the first call and sends the `Idempotency-Key` that the screen's `useIdempotencyKey` holds for the user's intent, as a header of each command. The other features still use their demo clients | `docs/architecture/backend.md` D11 |
| Auth client | Better Auth's `createAuthClient` with the `emailOTPClient` plugin, from `better-auth` 1.7.11, pinned exactly as in `api/package.json` (change both together), loaded with a dynamic `import()` (`front-end/src/features/auth/lib/auth-client.ts`, only through `auth-api.ts`). It calls `/api/auth/*` on the SPA's own origin, which the generated client does not cover. The Vite dev server proxies `/api` to `API_PROXY_TARGET` (default `http://127.0.0.1:5002`), through Nitro `routeRules` in `front-end/vite.config.ts`. The preview server has no proxy. `VITE_API_ENABLED=true` turns it on at build time. Unset, the prototype's demo sign-in runs, as on Vercel (owner decision, 23.10.2026, which reverses the removal of the demo sign-in) (`front-end/.env.example`) | In use since E2.1. Owner decision, 20.10.2026 | `docs/architecture/backend.md` D8, section 9 |
| Validation | Zod | Planned | `docs/architecture/backend.md` D11, D16 |
| Markdown rendering | Streamdown | Planned | `docs/architecture/backend.md` D20 Not needed in Phase 1 (PRD G10). |
| Tests | Vitest 4.1, jsdom 28, Testing Library 16, Playwright 1.64 | In use. Set up to match agentic-rag. See `shared/testing.md` | `front-end/package.json`, `front-end/vite.config.ts` |
| shadcn/ui | Not allowed | Not allowed | Owner decision |
| Prettier | Not allowed | Not allowed. Removed on 2026-10-19 | Owner decision |
| Redux, Zustand, Axios | Not used here | Not allowed in the owner's other React project (`agentic-rag/frontend/CLAUDE.md`). Not stated for this repo | agentic-rag |

## Back-end (`api/`)

The source is `docs/architecture/backend.md` section 1 and the decision numbers shown. Since E1.8, `api/` holds the service skeleton: config, logger, HTTP app with problem details and request ids, `/healthz` and the `ROLE` switch, in `api/src/platform/` and `api/src/main.ts`. Since E1.9 it also holds the platform layer: the database pools, the unit of work, `audit_log`, `idempotency_keys`, `webhook_events`, pg-boss and the `Clock` port. Since E2.8 it holds its first module, `notifications`, which sends mail. Since E2.2 it also holds `identity`, which has Better Auth's tables and the guest profile.

| Area | Choice | State | Decision |
| :-- | :-- | :-- | :-- |
| Service | One TypeScript service on Node, Hono 4.13 on `@hono/node-server` 2.1. It runs the API, the worker or both, chosen by `ROLE`. `tsx watch` runs it in development | In use. The worker runs the `mail` job (E2.8) | D1 |
| Configuration | One Zod 4 schema over the environment, checked at startup (`api/src/platform/config.ts`) | In use | Section 11 |
| Logging | pino 10, JSON lines with the request id (`api/src/platform/logger.ts`). Errors under `err` keep only type, code, constraint, table and stack frames. A fixed list of keys (email, phone, token, engraving, auth header and similar) is redacted at the top level, one and two levels down, and in arrays of objects up to one level down. Deeper fields and other key names are not covered | In use | Section 13 |
| Local services | `docker-compose.yml`: Postgres 18.6, optional for offline work. Integration tests run on the Neon `development` branch | In use. Mailpit was removed in E2.8, because mail goes over SMTP (D12) | Section 11 |
| Lint | `@antfu/eslint-config` for `api/` (`pnpm --filter @sk/api lint`). Layer rules come from the root `pnpm lint:zones` | In use | `frontend/linting.md` |
| Database | Neon Postgres 18, AWS Frankfurt, branches `production`, `staging`, `development`. `pg` 8.23 pools: `DATABASE_URL` (pooled) for requests, `DATABASE_URL_UNPOOLED` (direct) for pg-boss and migrations (`api/src/platform/db/client.ts`) | The pools are in use against the compose Postgres. Neon is not connected yet | D2 |
| ORM and migrations | Drizzle ORM 0.45 and drizzle-kit 0.31. SQL migrations in `api/migrations/` that only move forward (expand and contract), applied by `pnpm --filter @sk/api db:migrate` (`api/src/platform/db/migrate.ts`) | In use for the `platform`, `notifications` and `identity` schemas | Section 1, 11 |
| Jobs and timers | pg-boss 12.38, queue in the application database, jobs created in the business transaction (`api/src/platform/jobs/`) | In use. The `mail` queue and its dead-letter queue `mail-failed` (E2.8) | D4 |
| Auth | Better Auth inside the Hono API at `/api/auth/*`, `better-auth` 1.7.7 or later with the Drizzle adapter. Only the `emailOTP` plugin and Google are on. The session is an HttpOnly first-party cookie, with no JWT and no token in browser JavaScript | In use since E2.2, with `better-auth` 1.7.11 pinned exactly. Neon Auth was dropped on 20.10.2026 | D8 Change (ADR-010, owner gate D1, 2026-10-26, accepted 2026-10-26): guides sign in through Better Auth by invitation only and write order updates. Self sign-up yields the guest role only. Report links stay read-only. |
| API contract | REST with `@hono/zod-openapi`, committed generated client, RFC 9457 errors | In use. `packages/api-contract` holds the Zod schemas, `generated/openapi.json` and `generated/schema.ts` (`pnpm contract:build`) and the client. The `[E1.10]` test in `pnpm test` fails when the committed files differ from a fresh build. See `backend/api-contract.md` | D11 |
| File storage | Neon Object Storage through the S3 API | Planned | D14 Change (ADR-004, owner gates D3 and D9, accepted 2026-10-26): `sharp` is approved for image variants, one PDF per tour covers all languages, and the design adds tour PDFs, a private upload bucket, a public media bucket and versioned keys. |
| Payments | Stripe Payment Element with PaymentIntents, per store account | Planned | D6, D7 |
| Email | SMTP through one `Mailer` port, configured by `SMTP_*` variables. nodemailer 10.1 is the SMTP client (`api/src/platform/mail.ts`), and `api/src/modules/notifications/` holds the port, the SMTP adapter, the templates and the `mail` job. The production provider is open (Q15) | In use since E2.8 for N18 and N20, and since E2.2 for N01. The other 21 templates (N24 included) come with their stories. See `docs/ops/mail.md` | D12 |
| Errors and analytics | Sentry EU, Plausible EU, Google Analytics 4 after consent | Planned | D13 Change (ADR-007, owner gate D2, 2026-10-26, accepted 2026-10-26): SM-1 to SM-3 events go to a first-party event log. Plausible and GA4 are not used in Phase 1. |
| Hosting | Fly.io, region `fra`, one image that also serves the SPA | Planned. Change (ADR-001, accepted 2026-10-26): one image, two Fly processes: the Nitro Node server of TanStack Start (`web`) forwards `/api` and `/webhooks` to the Hono API (`api`, `ROLE` as before) (owner gate H1). The image exists: the root `Dockerfile` builds the API (no SPA yet), and CI builds and smoke-tests it without pushing it. No Fly app yet | D3 |
| Architecture | Clean architecture in four layers, modules with their own Postgres schemas | Platform layer and the `notifications` module in use | Section 4 |

## Shared

| Area | Choice | State | Source |
| :-- | :-- | :-- | :-- |
| Repository | pnpm workspace: `front-end/`, `api/`, `packages/domain`, `packages/api-contract`, `packages/i18n` | In use for `front-end/`, `api/`, `packages/domain`, `packages/api-contract`, `packages/i18n` (since E1.12), `e2e/` and `spikes/` (`pnpm-workspace.yaml`). `packages/domain` builds only its `identity` entry (since E2.10), which `api/` imports as `@sk/domain/identity`. Its other folders use extensionless imports that Node cannot load, so `api/` imports no other entry. A package that `api/dist` imports (`packages/api-contract`, `packages/i18n` since E2.8, and `packages/domain` since E2.10) builds to `dist/` and exports it under the `sk-compiled` condition, which `pnpm --filter @sk/api start` and the E1.13 image CMD pass to Node. Every other tool reads the `.ts` source. See `backend/architecture.md` | `docs/architecture/backend.md` D16 |
| Package manager | pnpm 10.33.4, the same as agentic-rag | In use | Root `package.json` (`packageManager`), root `pnpm-lock.yaml` |
| pnpm hook | `.pnpmfile.cjs` at the repository root, a `readPackage` hook that removes `drizzle-kit`, `vitest`, `react` and `react-dom` from `better-auth`'s optional peers. pnpm links an optional peer that the workspace has, even as a development dependency, so without the hook `pnpm install --prod` puts `drizzle-kit`, `tsx`, `vite`, `vitest`, `react` and `react-dom` into the API image. The hook's checksum is in `pnpm-lock.yaml`, so the Dockerfile copies the file and `.dockerignore` lets it through | In use since E2.2. Approved by the owner, 20.10.2026 | `Dockerfile`, `.dockerignore`, `scripts/image-smoke.sh` |
| CI | GitHub Actions: typecheck, lint, tests, contract diff, build, deploy | In use, except deploy (E2.9). `.github/workflows/ci.yml` runs the gates, the dependency audit, integration tests on a Neon branch per pull request, the API image build and Playwright. See `docs/ops/ci.md` | `docs/architecture/backend.md` section 11 |
| Hosting of the SPA now | Vercel, static build | In use for the demo. Real sign-in needs the SPA on the API's origin (D3, D8), so the Vercel build must not set `VITE_API_ENABLED` and signs guests in with the demo sign-in | `front-end/vercel.json` Change (ADR-001, owner gates H2 and H3, accepted 2026-10-26): the demo stays on Vercel static hosting until launch. The Fly staging app hosts only the real app. Vercel is retired at launch. |
