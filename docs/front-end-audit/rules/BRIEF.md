# Rule-by-rule audit brief

Goal: give every Vercel react-best-practices rule in your family a verdict against `front-end/src`, backed by a repeatable detector. This is a read-only census. A later step fixes the violations.

## The app
Vite 8 SPA, React 19.3, TanStack Router (file routes, autoCodeSplitting), HeroUI v3, Tailwind 4, rolldown. There is no server and no SSR. State is a local external store (`front-end/src/features/demo/demo-store.tsx`, selector hooks `useDemoSelector`, `useDemoActions`). The React Compiler is on (`vite.config.ts`) and `eslint-plugin-react-hooks` 7.1.1 compiler rules are at error level, so memoization of values and callbacks inside components is already handled by the compiler. Do not credit the compiler for rules about how much state a component subscribes to (`rerender-defer-reads`, `rerender-derived-state`), or about effects and component identity.
There is real client-side async: the dictionary load in `src/main.tsx` and `src/contexts/locale-context.tsx`, lazy routes, the lazy mail list, the planner/advice chat streams, place search, image and font loading. Check async-style rules against those paths. Do not mark a rule not applicable just because there is no data fetching library.
A production build of the current tree is at `/tmp/claude-1000/-home-ross-geller-Projects-minastik-swiss-keepsakes/a1f20511-6771-4659-a149-e551095d143e/scratchpad/base` (chunks in `assets/`). `docs/audit/measure-initial-load.mjs <dir>` prints first-load weight. Source maps over-state what a chunk contains.

## Rules
Rule text: `~/.claude/skills/react-best-practices/rules/<rule-id>.md`. Read each rule file in full before you judge it. Rule list and impacts: `docs/audit/rule-coverage.tsv`.

## Hard constraints
- Read-only for the repo. Never edit anything under `front-end/`. Never run `eslint --fix`, `npm run lint` (it is `eslint --fix`), `git checkout/stash/reset/clean`, or any git write. Do not start a dev server. Do not install packages.
- Write only into `docs/audit/rules/<your-family>/`. Another worker owns each other family directory.
- Quote every shell path.
- Other sessions edit the tree. Evidence must cite `file:line` as you saw it.

## Verdicts (exactly one per rule)
- `SATISFIED`: you ran a detector over the whole tree and found no violation, or every hit was checked and is fine. Say the hit count.
- `VIOLATED`: at least one real violation. List every site as `file:line`, or the count plus the detector that re-lists them. Say whether each is hot (runs per render, per keystroke, per list item, on first load) or cold (seed time, one-off handler, merchant-only rarely used).
- `NOT_APPLICABLE`: the rule's premise cannot occur in this app. Give the reason in one sentence and the check that proves the premise absent (for example a grep for `"use server"` returning nothing).
- `INCONCLUSIVE`: you could not decide. Say what is missing.
A judgment rule you checked by reading a sample is never `SATISFIED`. Write `INCONCLUSIVE (sampled N of M)` or run a detector that covers the whole tree.

## Detectors
For each rule write a detector that can be re-run: a grep, an `rg`, or a small node script using the TypeScript compiler API (`typescript` is installed in `front-end/node_modules`; resolve it from there). Save detectors as `docs/audit/rules/<family>/detect-<rule-id>.sh` or `.mjs`, or one `detect.mjs` per family that handles all its rules and prints `rule<TAB>hits`. Run each one and paste its real output into the report. Where an eslint rule can detect it (for example `react/jsx-no-leaked-render`, `react/no-unstable-nested-components`, `react/jsx-no-constructed-context-values`), check `front-end/node_modules/eslint-plugin-react` has it and run it with a temporary config file placed in your own directory and `--no-fix`. Do not edit `front-end/eslint.config.mjs`.
A detector that returns 0 hits too easily is suspect. Seed-check it: write a tiny sample file under your own directory containing a known violation and confirm the detector flags it.

## Output
Write `docs/audit/rules/<family>/report.tsv` with this header and one row per rule:
`rule	applicable	detector	verdict	evidence	proposed_action`
Then reply with a short summary. Do not paste the TSV into the reply. The reply states: counts per verdict, the five highest-impact `VIOLATED` rules with site counts, anything that surprised you, and any rule you could not check and why. Be candid about doubt.
`proposed_action` is `fix` (name the minimal change), `leave` (give the reason, such as cold path), or `none`.
