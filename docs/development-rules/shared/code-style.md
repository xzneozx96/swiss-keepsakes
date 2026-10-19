# Code style (front-end and back-end)

Read this for any TypeScript code. These are the owner's shared rules, from `~/.claude/react-vite-ts.md` and the agentic-rag project. Formatting is the linter's job and is not repeated here. See `../frontend/linting.md`.

## Rules

- TypeScript strict. No `any`, and no `// @ts-ignore` without a comment that says why.
- Named exports for shared modules. A default export is for a page-level route component, or a component that is loaded lazily.
- `async` and `await`, not promise chains.
- Names say what the thing is. Abbreviate only when everyone knows the word (`id`, `url`, `i`).
- No commented-out code and no dead code. Delete it, because git keeps history.
- Do not add a package without asking.
- Read the code around you first. Use a pattern or helper that already exists. Do not write a second one.
- Do not make an abstraction for a single use. Three similar lines are better than a premature helper.
- Do not add feature flags or compatibility shims. Change the code.

## Owner rules this repo does not follow yet

This repo predates some of the owner's rules. Do not copy the old pattern into new code, and do not fix it in an unrelated change. Each item is a decision for the owner.

| Owner rule | What the code does | Measured |
| :-- | :-- | :-- |
| No Prettier. Format with `@antfu/eslint-config` | Followed since 2026-10-19 | See `../frontend/linting.md` |
| No `any` | Uses `any` in places | About 88 matches of `: any` or `as any` in `front-end/src` |
| Build conditional classes with a `cn()` helper (`clsx` plus `tailwind-merge`) | Uses template literals. `clsx` is used in 5 files and `tailwind-merge` is not installed | 307 `className={\`...\`}` sites |
| Read context with `use()` | Followed. The linter rewrote the 4 old `useContext` calls | 0 calls |
| Tailwind classes, not inline `style` | Uses `style={{ ... }}` | 98 sites, not split into static and computed |
| Run `lint --fix` after every change | Fix only your own files (`pnpm exec eslint --fix <files>`). `pnpm lint:fix` rewrites the whole tree, and other sessions edit it | Conflict, resolved in `AGENTS.md` |
| Route components live in `pages/` | Routes live in `front-end/src/routes/` (TanStack Router file routes) | Not applicable. The router decides |
| shadcn/ui rules | There is no shadcn here | Not applicable. See `../frontend/heroui-and-styling.md` |
