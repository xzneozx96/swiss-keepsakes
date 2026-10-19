# React best practices: lookup copy

A verbatim copy of the rules from Vercel's `react-best-practices` that apply to this client-only Vite app. It is for looking a rule up by id when `docs/development-rules/frontend/performance.md` or the audit tracker cites one. Do not read it end to end, and do not edit the copies.

## Source and licence

- Source: the `react-best-practices` skill from Vercel Engineering, originally created by @shuding at Vercel (January 2026, version 1.0.0). The skill declares the licence as MIT in its `SKILL.md`. It shipped no separate licence file, so none is copied here.
- Copied on 2026-10-19 from `~/.agents/skills/react-best-practices/rules/`. Each file is unchanged.

## What is here

- `rules/<rule-id>.md` for the 56 rules the audit found applicable (satisfied, or violated and then fixed or left).
- `rules/_sections.md` describes the eight sections and their impact levels.
- Per-rule status in this repo is in `docs/front-end-audit/rule-coverage.tsv`.

## Left out (14 rules that cannot occur in a client-only app)

- `async-api-routes` (CRITICAL)
- `rendering-activity` (MEDIUM)
- `rendering-content-visibility` (HIGH)
- `rendering-hydration-suppress-warning` (LOW-MEDIUM)
- `server-after-nonblocking` (MEDIUM)
- `server-auth-actions` (CRITICAL)
- `server-cache-lru` (HIGH)
- `server-cache-react` (MEDIUM)
- `server-dedup-props` (LOW)
- `server-hoist-static-io` (HIGH)
- `server-no-shared-module-state` (HIGH)
- `server-parallel-fetching` (CRITICAL)
- `server-parallel-nested-fetching` (CRITICAL)
- `server-serialization` (HIGH)

## Keeping it current

This is a snapshot. If Vercel updates the skill, copy the changed rule files again and update the date above. A rule that matters for this repo belongs in `docs/development-rules/frontend/performance.md` with its id, not only here.
