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
| Server state | TanStack Query v5 | Planned | `docs/architecture/backend.md` D19 |
| API client | Generated from the OpenAPI contract in `packages/api-contract` | Planned | `docs/architecture/backend.md` D11 |
| Validation | Zod | Planned | `docs/architecture/backend.md` D11, D16 |
| Markdown rendering | Streamdown | Planned | `docs/architecture/backend.md` D20 |
| Tests | Vitest 4.1, jsdom 28, Testing Library 16, Playwright 1.64 | In use. Set up to match agentic-rag. See `shared/testing.md` | `front-end/package.json`, `front-end/vite.config.ts` |
| shadcn/ui | Not allowed | Not allowed | Owner decision |
| Prettier | Not allowed | Not allowed. Removed on 2026-10-19 | Owner decision |
| Redux, Zustand, Axios | Not used here | Not allowed in the owner's other React project (`agentic-rag/frontend/CLAUDE.md`). Not stated for this repo | agentic-rag |

## Back-end (`api/`)

The source is `docs/architecture/backend.md` section 1 and the decision numbers shown. Since E1.8, `api/` holds the service skeleton: config, logger, HTTP app with problem details and request ids, `/healthz` and the `ROLE` switch, in `api/src/platform/` and `api/src/main.ts`. It has no module and no database code yet.

| Area | Choice | State | Decision |
| :-- | :-- | :-- | :-- |
| Service | One TypeScript service on Node, Hono 4.13 on `@hono/node-server` 2.1. It runs the API, the worker or both, chosen by `ROLE`. `tsx watch` runs it in development | In use. The worker is a process shell until pg-boss arrives | D1 |
| Configuration | One Zod 4 schema over the environment, checked at startup (`api/src/platform/config.ts`) | In use | Section 11 |
| Logging | pino 10, JSON lines with the request id, redaction of the fields in section 13 (`api/src/platform/logger.ts`) | In use | Section 13 |
| Local services | `docker-compose.yml`: Postgres 18.6, MinIO, Mailpit | In use | Section 11 |
| Lint | `@antfu/eslint-config` for `api/` (`pnpm --filter @sk/api lint`). Layer rules come from the root `pnpm lint:zones` | In use | `frontend/linting.md` |
| Database | Neon Postgres 18, AWS Frankfurt, branches `production`, `staging`, `development` | Planned | D2 |
| ORM and migrations | Drizzle, SQL migrations that only move forward (expand and contract) | Planned | Section 1, 11 |
| Jobs and timers | pg-boss, queue in the application database | Planned | D4 |
| Auth | Neon Auth (managed Better Auth), JWTs verified with `jose` against the JWKS | Planned | D8 |
| API contract | REST with `@hono/zod-openapi`, committed generated client, RFC 9457 errors | `OpenAPIHono` and the RFC 9457 errors are in use. The contract package and client are planned | D11 |
| File storage | Neon Object Storage through the S3 API | Planned | D14 |
| Payments | Stripe Payment Element with PaymentIntents, per store account | Planned | D6, D7 |
| Email | Resend, EU sending region | Planned | D12 |
| Errors and analytics | Sentry EU, Plausible EU, Google Analytics 4 after consent | Planned | D13 |
| Hosting | Fly.io, region `fra`, one image that also serves the SPA | Planned | D3 |
| Architecture | Clean architecture in four layers, modules with their own Postgres schemas | Platform layer in use. No module yet | Section 4 |

## Shared

| Area | Choice | State | Source |
| :-- | :-- | :-- | :-- |
| Repository | pnpm workspace: `front-end/`, `api/`, `packages/domain`, `packages/api-contract`, `packages/i18n` | Planned. Today only `front-end/` is a package | `docs/architecture/backend.md` D16 |
| Package manager | pnpm 10.33.4, the same as agentic-rag | In use | `front-end/package.json` (`packageManager`), `front-end/pnpm-lock.yaml` |
| CI | GitHub Actions: typecheck, lint, tests, contract diff, build, deploy | Planned. No CI exists today | `docs/architecture/backend.md` section 11 |
| Hosting of the SPA now | Vercel, static build | In use | `front-end/vercel.json` |
