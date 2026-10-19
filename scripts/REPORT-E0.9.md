# E0.9 report
1. `node --test scripts/trace.test.mjs`: 8 pass, 0 fail (passing plan, Verified no test, Done no test, unknown ID, malformed row, no status.json, subdirectory, per-project count).
2. `node scripts/trace.mjs docs/development-plan/delivery-plan.md`: exit 0, 74 story lines, `E0.8 tests=8 status=Backlog`. Count rule: 4 test() titles x 2 Playwright projects read from e2e/playwright.config.ts (a test counts once per project in the nearest playwright.config.ts).
3. Fixture plan (`scripts/fixtures/trace/plan.md --tests scripts/fixtures/trace/tests`): exit 1, stderr "Verified or Done stories without a test: E0.2".
4. Run from scripts/fixtures with relative plan path: output identical (cmp).
5. 10 runs: median 0.027 s, max 0.035 s.
6. See git log -1 --stat.
