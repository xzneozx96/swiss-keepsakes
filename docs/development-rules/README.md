# Development rules

These files tell people and AI coding agents how to build in this repo. `AGENTS.md` at the repo root links here. The rules are split by who must follow them.

| Folder | Applies to | Read it when you |
| :-- | :-- | :-- |
| `tech-stack.md` | Both | need to know which libraries and services are chosen, in use or only planned |
| `shared/` | Front-end and back-end | write any TypeScript, share a rule or a type across both sides, or write a test |
| `frontend/` | Front-end only (`front-end/`) | build UI, routes, forms, client data access, styling or lint config |
| `reference/` | Lookup only | want the full text of a React best-practice rule that another file cites by id. Do not read it end to end |
| `backend/` | Back-end only (`api/`, `packages/domain`, `packages/api-contract`) | build the API, data layer, jobs or security. **Mostly design**: the platform layer and the `notifications` module are built |

## Files

| File | Read it when you |
| :-- | :-- |
| `shared/code-style.md` | write TypeScript. It also lists the owner rules this repo does not follow yet |
| `shared/domain-and-contract.md` | a rule, a type or an API shape is used on both sides |
| `shared/testing.md` | write a test or decide what to verify |
| `frontend/code-structure.md` | add files, imports or routes |
| `frontend/components-and-hooks.md` | write components or hooks (this repo's own rules) |
| `frontend/react-rendering-and-state.md` | write a component, design or update state, handle events, render a list (React team rules) |
| `frontend/react-effects-and-refs.md` | write an effect, use a ref, extract a custom hook (React team rules) |
| `frontend/react-composition-and-context.md` | split a component, share data with context, use a reducer (React team rules) |
| `frontend/forms-and-validation.md` | build a form |
| `frontend/api-integration.md` | call an API or read server data |
| `frontend/error-handling.md` | show errors or toasts, or handle failures |
| `frontend/performance.md` | touch first load, lists, typing, scrolling, streaming, dependencies or icons |
| `frontend/heroui-and-styling.md` | build or restyle UI |
| `frontend/linting.md` | change lint config, add a rule, or format code |
| `frontend/stack-notes.md` | need Vite, React, router or compiler facts and traps |
| `frontend/tanstack-start.md` | add or change a route, a loader, server code, the document head or anything that renders on the server |
| `backend/architecture.md` | decide where backend code goes and what may import what |
| `backend/api-contract.md` | add or change an endpoint |
| `backend/data-jobs-security.md` | touch the database, jobs, configuration or security |

## How each file is written

Every rule is a "do" or "don't" with a short reason. It points to real code in this repo as the example, and it names the check that enforces it, if there is one. A rule comes from an incident in this repo, from a check, from the React team's docs at react.dev, from the owner's former `react-patterns` skill (deleted on 2026-10-19; its rules now live in these files), or from the owner's other projects. Anything else is marked "Guidance". In `frontend/tanstack-start.md` every rule carries one label: "Documented" (the TanStack docs or the skills shipped in `node_modules` say it), "Learned in this repo" (a spike, an incident or a ticket found it) or "Guidance".

Many rules are conditional. They start with "check `package.json` first" or "follow the existing pattern", so the same files work in a project that uses different libraries.

**Backend files mostly describe a design that is not built yet.** A "Built:" line under a rule points at the code that exists. Each file names its section in `docs/architecture/backend.md` and does not copy it. If they disagree, `docs/architecture/backend.md` wins and the rule file needs fixing.

## Keeping them current

- When you add a library the rules mention (a form library, Zod, TanStack Query, an API client), update the matching file and `tech-stack.md` in the same change.
- When a rule turns out wrong or stale, delete or fix it. A wrong rule costs more than no rule.
- Keep each file to about one page. Put long explanations in `docs/` and link to them.

## Not covered yet

- Accessibility, and error boundaries or error reporting.
- Backend route naming and rate limits (see `docs/architecture/backend.md` section 10).
- Rules for money, Stripe and the ledger. They are product-specific and live in `docs/architecture/backend.md` sections 6 and 7.

## Reusing these for another project

Copy `AGENTS.md` and this folder, then replace what is specific to the project. The generic parts are `shared/`, and most of `frontend/` and `backend/`. The project-specific parts are the "Rules that have bitten us" list in `AGENTS.md`, `tech-stack.md`, `frontend/stack-notes.md`, `frontend/heroui-and-styling.md`, and every example path. Paths start at the repo root. A path such as `front-end/src/features/<feature>/lib/search-params.ts` means that file in any feature folder.
