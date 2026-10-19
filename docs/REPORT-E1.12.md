# E1.12 shared i18n package

## What changed

- `packages/i18n` is a new workspace package, `@sk/i18n`, laid out like `packages/domain` (same `tsconfig.json`, `typecheck` script, `sideEffects: false`). It has three subpath exports and no root barrel: `@sk/i18n/en`, `@sk/i18n/de` and `@sk/i18n/key-drift`. EN and DE stay separate modules, so the German copy cannot be pulled into the English first load.
- What moved: all email copy, 107 keys per language, with lines and key names unchanged. That is `mail.*` (50 keys, from `front-end/src/i18n/en.ts` and `de.ts`), `tourMail.*` (41, from `features/tours/merchant/messages*.ts`) and `requestMail.*` (16, from `features/requests/messages*.ts`). The front-end `en.ts` spreads `mailEn` and `de.ts` spreads `mailDe`. `MessageKey`, the three mail renderers and every caller are unchanged.
- Why this cut: the story row says "strings shared by the SPA and the mail templates", and D12 renders all 23 templates on the server. Email copy is the only copy both sides need today. The other 2,880 front-end keys are UI copy that only the SPA reads.
- Not moved:
  - Problem `type` copy. Nothing emits a problem type yet.
  - `app.name`, `merchantRequests.language.en/de` and `merchantRequests.private.people.one/other`. The renderers read them, but the SPA UI shows them too. E2.8 needs them.
- `keyDrift(en, de)` returns `{ onlyEn, onlyDe }`. Two tests use it, every title tagged `[E1.12][S11]`, and both run in the root `pnpm test`:
  - `packages/i18n/tests/keys.test.ts` uses fixture copies with one missing key and one extra key (`tests/fixtures.ts`), and also checks the real `mailEn`/`mailDe` pair. `trace.mjs` counts its 3 tests.
  - `front-end/tests/i18n-keys.test.ts` checks the whole front-end `en`/`de` pair, 2,987 keys each. `trace.mjs` does not count it.
- Why a test and not only types: `de: Record<MessageKey, string>` fails type-checking on a missing German key. It does not catch an extra German key that comes in through a spread, and `tourDetailDe` has no type at all.
- Drift before this change: none. 2,987 keys per language, the same key sets, and the same placeholders.
- `front-end/package.json` adds `"@sk/i18n": "workspace:*"`. The lockfile changed only for that importer and the new package. No external dependency was added.
- `docs/development-rules/shared/domain-and-contract.md` gets one sentence saying where email copy lives and that `pnpm test` checks the keys.
- No library was wired, so no library docs were consulted.

## Output

- Root: `pnpm typecheck` passes for domain, i18n, spikes and front-end. `pnpm test` reports `Test Files 14 passed (14), Tests 261 passed (261)`. `pnpm lint:zones` exits 0.
- Front-end: `tsc --noEmit` exits 0. `pnpm lint` reports `47 problems (0 errors, 47 warnings)`. `typecheck:tests` and `pnpm build` exit 0.
- The package files and the front-end test were linted with the front-end antfu config through a temporary copy under `src/`, deleted afterwards: 0 problems.

Red, then green, on the real dictionaries. Each case was reverted with an edit, and git shows no diff afterwards.

1. `'mail.N23.demoOnlyEnglish'` added to `packages/i18n/src/en.ts` only. `pnpm test` exits 1 with 2 failed tests, showing `+ "onlyEn": [ + "mail.N23.demoOnlyEnglish",`. `tsc` also fails: `src/de.ts(4,14): error TS2741: Property '"mail.N23.demoOnlyEnglish"' is missing`.
2. `'mail.N23.demoOnlyGerman'` added to `packages/i18n/src/de.ts` only. `pnpm test` exits 1 with 2 failed tests, showing `+ "onlyDe": [ + "mail.N23.demoOnlyGerman",`. `tsc` fails with TS2353.
3. `'tourDetail.demoOnlyGerman'` added to the untyped `front-end/src/features/tours/detail/messages.de.ts`. `tsc --noEmit` exits 0, but `pnpm test` exits 1 with 1 failed test.
4. After the reverts: 14 files and 261 tests passed.

The German dictionary stays lazy. A trunk build (39a58c5) compared with a branch build:

- Both builds have 33 first-load files, and the de chunk is not among them.
- The German `mail.N23.stock`, `tourMail.N13.contact` and `requestMail.link.private` are only in `de.js`, in both builds.
- The English mail strings are in `locale-context.js` (first load) in both builds, as before.
- No chunk name was added or removed, and the first-load list is identical.
- measure-initial-load: first-load JS went from 1,111,498 to 1,111,507 bytes raw (+9) and from 352,800 to 353,125 bytes gzipped (+325), because the keys moved within the object. The de chunk went from 184,786 to 184,795 bytes.

The text did not change:

- `verify:routes`: `routes compared: 100, identical text: 100, different: 0`, and `page errors base: 0, new: 0`.
- Those routes show no email, so a scratch script injected 60 emails into each build's demo state: every keepsake, tour, request and partner template, in EN and DE, with the N08, N10 and N17 variants. It opened the Mail panel. Guest (336 lines), Staff (132) and Partner (16) were identical in both builds, with no page errors, raw keys, `undefined` or unfilled placeholders.
- The lines removed from the six front-end files match the package lines: 138 EN and 150 DE. The only lines added to the front-end files are the two imports and the two spreads.
- `E2E_PORT=4412 PLAYWRIGHT_CHANNEL=chrome pnpm e2e`: 8 passed.
- `node scripts/trace.mjs`: `E1.12 tests=3`. It exits 1 on E1.1 (Done with no tests), which was already the case on trunk.

## Not verified

- CI. E1.13 owns it.
- The server side. No API code uses `@sk/i18n` yet. E2.8 adds that.
- Problem `type` copy.
- The check compares key sets only. It misses placeholder differences (none exist today), empty strings, and a key defined in two spreads.
- `trace.mjs` does not count the front-end test.
- `verify:renders` was not run. Only where the strings are stored changed.
