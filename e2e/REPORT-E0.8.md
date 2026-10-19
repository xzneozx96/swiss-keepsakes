# E0.8 report
1. `npm run e2e`: "8 passed" (4 flows x phone-en, phone-de), ~16 s.
2. Three consecutive runs: "8 passed (16.1s)", "8 passed (15.9s)", "8 passed (15.7s)"; retries are 0 in the config, no flaky lines.
3. Mutation: `checkout.bar.send` in front-end/src/i18n/en.ts set to "Send request · BROKEN". Result: 1 failed (phone-en gift), 7 passed. Message: `waiting for getByRole('button', { name: 'Send request · no payment yet' })`. Reverted; `git diff front-end` is empty.
4. `git log -1 --stat`: only .github/workflows/e2e.yml, e2e/**, package.json.
5. Preview server uses port 4317 and Playwright stops it on exit; `ss` shows nothing listening. The remaining playwright-mcp/chrome processes pre-existed.
Notes: `E2E_DIST` and `E2E_PORT` override the build dir and port (for trunk/head lane builds).
