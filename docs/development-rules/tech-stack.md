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
| Routing | TanStack Router 1.170, file routes, hash history | In use | `front-end/src/routes/`, `front-end/src/main.tsx` |
| UI library | HeroUI v3.2.6 (`@heroui/react`, `@heroui/styles`) | In use | `docs/ux/heroui-reference/` |
| Styling | Tailwind CSS 4.3 through `@tailwindcss/vite`, no `tailwind.config` file | In use | `vite.config.ts` |
| Class helpers | `clsx` (used in 5 files). `tailwind-variants` is installed and unused | In use | `package.json` |
| Icons | `reicon-react`, only through `front-end/src/components/icons.ts` | In use | `front-end/src/components/icons.ts` |
| Charts, maps, calendar, editor | Recharts 3.10, MapLibre GL 6, FullCalendar 7, Tiptap | In use | `package.json` |
| Assistant chat UI | `@ai-sdk/react` | In use | `package.json` |
| Dates | `@internationalized/date`, `temporal-polyfill` | In use | `package.json` |
| Lint | ESLint 9 with `@antfu/eslint-config` (`react`, `typescript`, jsx-a11y), `eslint-plugin-boundaries` for layers, react-hooks 7.1 compiler rules. Formatting is ESLint Stylistic | In use | `front-end/eslint.config.mjs`, `frontend/linting.md` |
| Server state | TanStack Query 5.104 (`@tanstack/react-query`), a `DataClient` per feature, the demo store behind it | In use since E1.11. No devtools | `front-end/src/features/data-client`, `frontend/api-integration.md`, `docs/architecture/backend.md` D19 |
| API client | `createApiClient` from `@sk/api-contract`: `openapi-fetch` 0.17 over types that `openapi-typescript` 7.13 generates from the API's OpenAPI document | Planned. The client exists in `packages/api-contract` (E1.10), and no screen uses it yet | `docs/architecture/backend.md` D11 |
| Validation | Zod | Planned | `docs/architecture/backend.md` D11, D16 |
| Markdown rendering | Streamdown | Planned | `docs/architecture/backend.md` D20 |
| Tests | Vitest 4.1, jsdom 28, Testing Library 16, Playwright 1.64 | In use. Set up to match agentic-rag. See `shared/testing.md` | `front-end/package.json`, `front-end/vite.config.ts` |
| shadcn/ui | Not allowed | Not allowed | Owner decision |
| Prettier | Not allowed | Not allowed. Removed on 2026-10-19 | Owner decision |
| Redux, Zustand, Axios | Not used here | Not allowed in the owner's other React project (`agentic-rag/frontend/CLAUDE.md`). Not stated for this repo | agentic-rag |

## Back-end (`api/`)

The source is `docs/architecture/backend.md` section 1 and the decision numbers shown. Since E1.8, `api/` holds the service skeleton: config, logger, HTTP app with problem details and request ids, `/healthz` and the `ROLE` switch, in `api/src/platform/` and `api/src/main.ts`. Since E1.9 it also holds the platform layer: the database pools, the unit of work, `audit_log`, `idempotency_keys`, `webhook_events`, pg-boss and the `Clock` port. Since E2.2 it verifies Bearer JWTs, loads the actor and guards `/api/store/{storeId}/*`, and the `identity` module holds `store_memberships` and `platform_admins`.

| Area | Choice | State | Decision |
| :-- | :-- | :-- | :-- |
| Service | One TypeScript service on Node, Hono 4.13 on `@hono/node-server` 2.1. It runs the API, the worker or both, chosen by `ROLE`. `tsx watch` runs it in development | In use. The worker runs pg-boss with no job handler yet | D1 |
| Configuration | One Zod 4 schema over the environment, checked at startup (`api/src/platform/config.ts`) | In use | Section 11 |
| Logging | pino 10, JSON lines with the request id (`api/src/platform/logger.ts`). Errors under `err` keep only type, code, constraint, table and stack frames. A fixed list of keys (email, phone, token, engraving, auth header and similar) is redacted at the top level, one and two levels down, and in arrays of objects up to one level down. Deeper fields and other key names are not covered | In use | Section 13 |
| Local services | `docker-compose.yml`: Postgres 18.6, Mailpit | In use. E2.8 removes Mailpit, because mail goes over SMTP (D12) | Section 11 |
| Lint | `@antfu/eslint-config` for `api/` (`pnpm --filter @sk/api lint`). Layer rules come from the root `pnpm lint:zones` | In use | `frontend/linting.md` |
| Database | Neon Postgres 18, AWS Frankfurt, branches `production`, `staging`, `development`. `pg` 8.23 pools: `DATABASE_URL` (pooled) for requests, `DATABASE_URL_UNPOOLED` (direct) for pg-boss and migrations (`api/src/platform/db/client.ts`) | The pools are in use against the compose Postgres. Neon is not connected yet | D2 |
| ORM and migrations | Drizzle ORM 0.45 and drizzle-kit 0.31. SQL migrations in `api/migrations/` that only move forward (expand and contract), applied by `pnpm --filter @sk/api db:migrate` (`api/src/platform/db/migrate.ts`) | In use for the `platform` schema | Section 1, 11 |
| Jobs and timers | pg-boss 12.38, queue in the application database, jobs created in the business transaction (`api/src/platform/jobs/`) | In use. No queue or handler yet | D4 |
| Auth | Neon Auth (managed Better Auth), JWTs verified with `jose` 6.2 against the JWKS at `NEON_AUTH_BASE_URL` | The API side is in use since E2.2 (`api/src/platform/http/auth.ts`, `can()` in `packages/domain/src/identity/`). Sign-in in the SPA is E2.1 | D8 |
| API contract | REST with `@hono/zod-openapi`, committed generated client, RFC 9457 errors | In use. `packages/api-contract` holds the Zod schemas, `generated/openapi.json` and `generated/schema.ts` (`pnpm contract:build`) and the client. The `[E1.10]` test in `pnpm test` fails when the committed files differ from a fresh build. See `backend/api-contract.md` | D11 |
| File storage | Neon Object Storage through the S3 API | Planned | D14 |
| Payments | Stripe Payment Element with PaymentIntents, per store account | Planned | D6, D7 |
| Email | SMTP through one `Mailer` port, configured by `SMTP_*` variables. The production provider is open (Q15) | Planned | D12 |
| Errors and analytics | Sentry EU, Plausible EU, Google Analytics 4 after consent | Planned | D13 |
| Hosting | Fly.io, region `fra`, one image that also serves the SPA | Planned. The image exists: the root `Dockerfile` builds the API (no SPA yet), and CI builds and smoke-tests it without pushing it. No Fly app yet | D3 |
| Architecture | Clean architecture in four layers, modules with their own Postgres schemas | Platform layer in use. The `identity` module has its schema and the actor loader (E2.2) | Section 4 |

## Shared

| Area | Choice | State | Source |
| :-- | :-- | :-- | :-- |
| Repository | pnpm workspace: `front-end/`, `api/`, `packages/domain`, `packages/api-contract`, `packages/i18n` | In use for `front-end/`, `api/`, `packages/domain`, `packages/api-contract`, `e2e/` and `spikes/` (`pnpm-workspace.yaml`). `packages/i18n` is planned. A package that `api/dist` imports builds to `dist/` and exports it under the `sk-compiled` condition (`packages/api-contract`, and `packages/domain` for `src/identity` only), which `pnpm --filter @sk/api start` and the E1.13 image CMD pass to Node. Every other tool reads the `.ts` source. See `backend/architecture.md` | `docs/architecture/backend.md` D16 |
| Package manager | pnpm 10.33.4, the same as agentic-rag | In use | Root `package.json` (`packageManager`), root `pnpm-lock.yaml` |
| CI | GitHub Actions: typecheck, lint, tests, contract diff, build, deploy | In use, except deploy (E2.9). `.github/workflows/ci.yml` runs the gates, the dependency audit, integration tests on a Neon branch per pull request, the API image build and Playwright. See `docs/ops/ci.md` | `docs/architecture/backend.md` section 11 |
| Hosting of the SPA now | Vercel, static build | In use | `front-end/vercel.json` |
