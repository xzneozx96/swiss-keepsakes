# Swiss Keepsakes delivery plan

Status: draft for owner review. Last updated 20.10.2026.

This plan turns the front-end prototype into the production app described in `docs/architecture/backend.md`. It covers the backend and the front-end together. Work is split into eight epics, E0 to E7, which follow the phases in section 14 of the architecture doc. Each epic holds stories, and each story names the automated test that proves it.

Sprints 0 and 1 are planned down to the pull request in `docs/development-plan/sprint-0-1.md`. Later sprints stay at story level and are refined at each sprint planning.

The Lark task list "Swiss Keepsakes" mirrors the story tables in this file, one task per story and one section per sprint. `docs/development-plan/sync-lark.mjs` pushes them. This file is the source of truth, so edit stories here and run the sync.

## 1. Working agreement

**Team.** One developer working with Claude agents, plus the owner, who reviews and decides. Risk R6 in the architecture doc applies. Tests and runbooks are written with the code so that the knowledge doesn't sit in one head.

**Sprints.** Two weeks each. Sprints are numbered, not dated, because the PRD (L494) says the start date, resources and budget aren't confirmed. Sprint 0 starts when the owner says go.

**Ceremonies.**

- **Sprint planning**, on the first day. Pick stories from the top of the backlog that meet the Definition of Ready. Split anything over 5 points. Refine the next sprint's stories to pull-request level.
- **Daily note.** One comment per active story on its Lark task. There is no meeting for a team of one.
- **Sprint review**, on the last day. The owner uses the sprint's stories on staging, or on screenshots and video before staging exists in Sprint 3. Each story the owner accepts moves to Done.
- **Retro.** Three lines in `docs/development-plan/retro.md`. What to keep, what to change, and what to try.

**Estimates.** Story points on the 1, 2, 3, 5, 8 scale. An 8 is split before it enters a sprint. The sprint map in section 5 is a guess until Sprint 2 ends. After that, it is rebuilt from the measured velocity.

**Story status.** Backlog, Ready, In progress, In review, Verified, Done, or Blocked.

- **Verified** means every item of the Definition of Done has its evidence.
- **Done** means the owner accepted the story at sprint review.
- **Blocked** names the owner decision or story it waits for.

**Story IDs.** `E<epic>.<n>`, such as `E4.6`. The UX scenarios keep their own IDs, S1 to S12, and the acceptance criteria keep AC01 to AC34. Spikes are SP1 to SP7.

### 1.1 Definition of Ready

A story enters a sprint only when all of these hold:

1. Its acceptance criteria are written as observable outcomes, each one with the ID of the test that will prove it.
2. The stories it depends on are Verified or Done.
3. Any open owner decision it needs is answered. If one isn't, the story stays Blocked.
4. It is 5 points or fewer.

### 1.2 Definition of Done

A story is Verified only when all of these items have evidence. The evidence is linked in a comment on the story's Lark task.

1. **Every acceptance criterion has a passing automated test.** The test title starts with the story ID in brackets, such as `[E3.3]`, and adds the UX scenario or acceptance ID when one applies, such as `[E3.3][S2]`. The traceability check (E0.9) fails CI when a Verified story has no test.
2. **Money and status changes show their trail.** A test that changes money or an order or booking status asserts the ledger rows and the audit rows after the change (architecture section 12).
3. **The gates pass.** Typecheck, lint with the layer boundary zones, unit tests, integration tests on the pull request's Neon branch, and an empty generated client diff.
4. **The real surface works.** The behaviour was driven on the running app, local or staging, and a screenshot or log is linked. A front-end story runs its Playwright scenario at 375 px wide in English and German, with no missing translation keys.
5. **No mock data remains for a moved feature.** When a feature moves to the API, its demo seed becomes a database seed, and its mock code is deleted in the same story. No feature reads from both sources.
6. **Operations are covered.** A new failure path gets an alert and a runbook in `docs/ops/`.
7. **It is deployed.** From Sprint 3 on, the story is on staging before sprint review.

### 1.3 Operator prerequisites for Sprint 0

The agent can't create these. The owner or the developer sets them up before Sprint 0 starts.

- A Neon project in AWS Frankfurt.
- A Fly.io organisation.
- A Stripe sandbox. SP4 also reads the pilot store's own account, which depends on Q2.
- A real iPhone with Safari on default settings, for SP6. Since 20.10.2026 it serves the sign-in check in E2.1.
- A GitHub Actions budget for the CI runs.

## 2. The verification harness

The harness is how we know the app works the way it should. It is built in E0 and E1, before most features, and every later story adds to it. Each level proves something the others can't.

| Level | Proves | Tool and place | Runs |
|---|---|---|---|
| Domain rules | Transition tables, `moneyState`, commission basis and offsets, the cart split, the discount split (Q9), Zurich dates and reminder times (Q5) | Vitest in `packages/domain` | Every commit |
| Use cases | Each use case's decisions, with in-memory fakes for every port and a controllable clock | Vitest in `api/test/application` | Every commit |
| Database | The two locking paths, unique indexes, composite store keys, the ledger view, pg-boss jobs created inside the transaction | Vitest against real Postgres. Docker locally, a Neon branch per pull request in CI | Every pull request |
| Payments | Every late-payment case in architecture section 6.4, webhook replay, the expiry job racing a webhook | A scriptable fake `PaymentGateway` timeline (succeed at t, processing, fail, cancel refused). A small live Stripe sandbox suite runs on demand | Every pull request, sandbox suite nightly |
| API | Route contracts, permissions per role, partner data limits | Vitest over the Hono app. The permission matrix is generated from the OpenAPI document, so a new route is tested without anyone writing a test for it | Every pull request |
| Contract | The front-end and the API agree | A regenerated OpenAPI client must match the committed one | Every pull request |
| Mail | Each of the 24 templates renders in EN and DE with the right data and recipients | Render tests, plus an in-memory `Mailer` that records each message. A short live suite sends to the test SMTP inbox on demand | Every pull request (render and in-memory), on demand (live SMTP) |
| End to end | UX scenarios S1 to S12 on a phone-sized screen in both languages | Playwright in `e2e/`, 375 px, EN and DE, against the local stack and against staging after each deploy | Every pull request (local stack), every deploy (staging) |
| Load | 50 concurrent guests on one departure never confirm more than capacity. Two staff accepting orders for the last unit give one success | k6 against staging | Before E4 and E7 sign-off, then monthly |
| Front-end budgets | First load size, render counts, 100-route EN and DE text diff | The existing `.check/drv` scripts (`compare-builds.mjs`, `render-count.mjs`, `docs/audit/measure-initial-load.mjs`), moved into `e2e/budgets/` | Every pull request that touches `front-end/` |
| Production | The live app is up and its jobs are moving | `/healthz`, an external uptime probe, Sentry alerts on dead jobs, stuck webhooks and money exceptions | Always |

Three rules hold the harness together.

1. **The prototype's flows become the first regression net.** The demo-mode drivers in `.check/drv` (`flow-gift.mjs`, `flow-tour.mjs`, `flow-merchant.mjs`, `language-check.mjs`) are untracked today. E0.8 turns them into tracked Playwright tests. Every migration story after that must keep them green, which is how "no behaviour change" gets proven.
2. **Time is a port.** Holds, deadlines and reminders read the `Clock` port. Tests move the clock instead of waiting, so a 15-minute hold is tested in milliseconds.
3. **Every story is traceable.** `scripts/trace.mjs` reads the story tables in this file and the test titles in the repository. It reports each story with its tests, and CI fails when a Verified or Done story has none.

## 3. Epics

| Epic | Goal | Exit criteria | Sprints (guess) |
|---|---|---|---|
| E0. Spikes and harness foundation | Answer the seven spikes and put a regression net under the prototype | SP1 to SP7 answered in writing. The prototype flows run as Playwright tests in CI | 0 |
| E1. Monorepo and seams | Split the code into packages, build the API skeleton and the platform layer, and put the demo store behind a data interface | No behaviour change. The E0.8 tests stay green. CI runs every gate | 1 to 2 |
| E2. Identity, catalogue and staging | Real sign-in, stores and staff, catalogue reads and edits, media, mail, and staging | Guests browse real data. Staff sign in and edit products and tours. A01, A02 and M01 work on staging | 3 to 4 |
| E3. Keepsake orders | The full order flow with payments recorded by staff | S1 to S4 and S6 pass on staging with external payments | 5 to 7 |
| E4. Tours and online payment | Bookings with seat holds, Stripe payments, webhooks, refunds | The concurrency, late-payment and replay tests pass. S7 and S9 pass with the TWINT and card test flows | 8 to 11 |
| E5. Partners | Referral links, attribution, commission, partner reports and payouts | S5 passes. The partner report matches the ledger. The S9 figures come out the same | 12 to 13 |
| E6. Content, requests, reports and admin | Articles, comments, reviews, advice and private-tour requests, reports, analytics, privacy | S10 to S12 pass. GA4 loads only after consent | 14 to 16 |
| E7. Going live | Production, a restore drill, runbooks, live payments | The go-live checklist is signed | 17 |

## 4. Backlog

Side is BE for backend, FE for front-end, Both, or Ops. Points are a first guess and are re-estimated at sprint planning. Priority is High for a story on the critical path that other stories wait for, Medium for a story the epic's exit criteria need, and Low for a story that can slip a sprint without blocking anything.

### E0. Spikes and harness foundation

Each spike is a throwaway branch with a written answer in `docs/spikes/SPn.md`. The pass conditions come from architecture section 16.

| ID | Story | Side | Pts | Priority | Depends | Acceptance and proof |
|---|---|---|---|---|---|---|
| E0.1 | SP1. Hono with `@hono/zod-openapi`, Stripe signature checks on the raw body, and the SPA served with an index fallback | BE | 3 | Medium | | A booking hold and a webhook round trip work locally with the Stripe CLI. Proof is `docs/spikes/SP1.md` with the CLI log |
| E0.2 | SP2. pg-boss jobs created through Drizzle inside a transaction. Timing of a deferred job and behaviour across two machines | BE | 3 | High | | A deferred job fires within 5 seconds of its time. A cron job runs once across two `ROLE=all` processes. Proof is `docs/spikes/SP2.md` with timings |
| E0.3 | SP3. 50 concurrent hold requests for one free seat against Neon Frankfurt from Fly `fra` | BE | 3 | High | E0.1 | Exactly one `pending_payment`. p95 latency recorded in `docs/spikes/SP3.md` |
| E0.4 | SP4. Stripe sandbox behaviour. Cancel after success, TWINT in the Payment Element, the store account's capabilities | BE | 2 | Medium | | Each behaviour observed and written in `docs/spikes/SP4.md` |
| E0.5 | SP5. Neon Object Storage presigned upload and public read | BE | 2 | Medium | | Upload and public read both work, or the decision moves to Cloudflare R2. Proof is `docs/spikes/SP5.md` |
| E0.6 | SP6. Neon Auth in our SPA. Email code sign-in, the JWT field, token lifetime, code limits, iOS Safari | Both | 5 | High | E0.1 | On iOS Safari with default settings the guest stays signed in across reloads and a day later. The API resolves the actor from the JWT. Each gap is listed. If Safari fails, D8 moves to Better Auth inside the API before E2. Google sign-in is tested in E2.1 and the staff invitation in E2.3. Proof is `docs/spikes/SP6.md` with screenshots. Result on 20.10.2026. The E2.1 Playwright WebKit run refused Neon Auth's third-party session cookie, so D8 moved to Better Auth inside the API. The real iPhone check moved to E2.1 |
| E0.7 | SP7. Fly release command runs Drizzle migrations, plus a rollback drill | Ops | 2 | Medium | E0.1 | A deploy with a migration and a rollback both run on a test app without downtime. Proof is `docs/spikes/SP7.md` |
| E0.8 | Turn the prototype's demo flows into tracked Playwright tests in `e2e/` | FE | 5 | High | | The gift flow, tour flow, merchant order flow and EN/DE switch run at 375 px against the demo build and pass in CI. Tests `[E0.8]` |
| E0.9 | Traceability check `scripts/trace.mjs` | Both | 2 | Medium | E0.8 | It lists every story with its test titles and exits non-zero when a Verified or Done story has none. Its own fixture test `[E0.9]` |

### E1. Monorepo and seams

| ID | Story | Side | Pts | Priority | Depends | Acceptance and proof |
|---|---|---|---|---|---|---|
| E1.1 | pnpm workspace root with `front-end`, `api` and `packages/*`, and Vitest at the root | Both | 2 | High | E0.8 | `pnpm build`, `pnpm typecheck` and `pnpm test` pass from the root. The E0.8 tests pass unchanged |
| E1.2 | Extract the prototype types and pure rules from `front-end/src/features/*/types.ts` and `lib/*` into `packages/domain` | FE | 5 | High | E1.1 | The front-end imports from `@sk/domain`. The E0.8 tests and the 100-route text diff show no change. Tests `[E1.2]` |
| E1.3 | Order and booking transition tables | Both | 3 | High | E1.2 | Every allowed and every refused transition is tested. `no_show` can't reach `completed`. Only `pending_payment` can confirm. Tests `[E1.3]` |
| E1.4 | `moneyState` and the payment labels | Both | 3 | High | E1.2 | The UX section 2.3 label figures come out exactly (total 89.00, paid 26.70, balance 62.30; refunds 20.00 and 54.00). A duplicate payment can't make a balance negative. Tests `[E1.4]` |
| E1.5 | Commission basis, adjustments and offsets, and the discount split (Q9) | Both | 3 | Medium | E1.2 | CHF 100 + 10 − 10 with delivery 5 gives a basis of 100. The S9 offset figures come out exactly. A discount splits by line value to the Rappen, and the last line takes the remainder. Tests `[E1.5][S9]` |
| E1.6 | Zurich date rules, pickup windows and reminder times (Q5) | Both | 2 | Medium | E1.2 | The reminder set from Q5 lands at the right Zurich times across both DST changes. Tests `[E1.6]` |
| E1.7 | Layer boundary lint zones | Both | 2 | Medium | E1.2 | A fixture file that breaks each rule fails lint. The real code passes. Test `[E1.7]` |
| E1.8 | API skeleton. Hono app, Zod config, logger, RFC 9457 errors, request id, `/healthz`, `ROLE` switch, Docker Compose with Postgres and Mailpit (Mailpit was removed in E2.8, D12) | BE | 5 | High | E1.1, E0.1 | `pnpm dev` starts the API and the worker. A bad env value stops startup with a clear message. Tests `[E1.8]` |
| E1.9 | Platform layer. Unit of work, `audit_log`, `idempotency_keys`, `webhook_events`, pg-boss inside the transaction, `Clock` port | BE | 5 | High | E1.8, E0.2 | A rolled-back command leaves no audit row and no job. A repeated idempotency key replays the first response, and a different body gets 422. Integration tests `[E1.9]` |
| E1.10 | `packages/api-contract` with the generated client and the contract diff gate | Both | 3 | Medium | E1.8 | CI fails when the committed client differs from a fresh build. Test `[E1.10]` |
| E1.11 | TanStack Query in the front-end, with a `DataClient` interface under the query functions and the demo store behind it (D19) | FE | 5 | Medium | E1.2 | Demo mode works as before. Each feature's hooks use `useQuery` and `useMutation` over `DataClient`, so a feature can switch to the API alone. The E0.8 tests pass |
| E1.12 | `packages/i18n` for strings shared by the SPA and the mail templates, with a missing-key check | Both | 3 | Medium | E1.1 | CI fails on a key present in EN but not DE, or the reverse. Test `[E1.12][S11]` |
| E1.13 | CI pipeline. Gates, a Neon branch per pull request with migrations and seeds, integration tests, one image build | Ops | 5 | High | E1.9, E1.10 | A pull request shows every gate. The Neon branch is deleted when it closes. Proof is a green run link |

### E2. Identity, catalogue and staging

| ID | Story | Side | Pts | Priority | Depends | Acceptance and proof |
|---|---|---|---|---|---|---|
| E2.1 | Sign-in sheet C05 on Better Auth (D8). Google and email code on our own origin, the session in an HttpOnly cookie, no token in JavaScript, Better Auth's `createAuthClient` with the `emailOTPClient` plugin loaded by a dynamic `import()`, the SPA's current language sent with the code request, the Vite dev server proxying `/api` to the API | FE | 5 | High | E2.2, E1.11 | A guest signs in with the emailed code and stays signed in across reloads on Playwright WebKit, against the API on the same origin, with no `test.fail` mark. The auth client is not in the first-load bundle. A code requested in German arrives as the German N01. The code copy in `front-end/src/i18n` (`auth.code.hint` and `auth.code.expired`) says 5 minutes in EN and DE, as the server's N01 does. The SPA signs in only through `signIn.emailOtp` and never calls `checkVerificationOtp`, which the API disables. `/sign-in` reads `?error=<code>`, because Better Auth sends a failed Google sign-in there. A real iPhone in Safari with default settings repeats the check, since Playwright WebKit doesn't reproduce Safari's tracking prevention. No token appears in JavaScript, `localStorage` or `sessionStorage`, and the session cookie is HttpOnly. Google sign-in completes on localhost and staging and creates the user, and the consent screen shows our own Google OAuth app. Playwright `[E2.1][AC01]` |
| E2.2 | Better Auth server in the API (D8). The `emailOTP` plugin and Google, the session to the actor, the guest profile on the first authenticated call, N01 through the `mail` job | BE | 5 | High | E1.9, E2.8 | Better Auth answers at `/api/auth/*` with only the `emailOTP` plugin and Google on, and its option names are checked against the installed `better-auth` 1.7.7 or later. A request without a session is anonymous, and a revoked or expired session gets 401 on a guarded route. A code expires after 5 minutes and allows 3 tries. Requesting one queues N01 through the `mail` job without waiting for it, in the language the SPA sent, or EN when none came. The first authenticated call creates the guest profile. Rate limits keep their counters in Postgres, per IP. Tests `[E2.2]` |
| E2.3 | Stores and the first Owner. Super Admin invites the Owner (A01, N20). The store can't sell until A02's conditions are met. The identity module implements the `InvitationLink` port of `notifications` against `store_invitations.token_hash`, and the N20 mail job stores the invitation id, never the token (`docs/architecture/backend.md` section 8). A Super Admin never takes a store role. The A02 screen removes the invitation token from the URL on load, before any sign-in redirect (section 8) | Both | 5 | Medium | E2.1, E2.10, E2.8 | S8. A staff invitation is sent and accepted after sign-in through Better Auth (D8) only when the signed-in email matches the invited email, which adds the `store_memberships` row. A signed-in user with another email is refused. Playwright `[E2.3][S8]` |
| E2.4 | Owner invites a Store Manager (M22 members, N18, M01). The N18 mail job stores the invitation id, and E2.3's `InvitationLink` builds the M01 link when the mail is sent | Both | 3 | Medium | E2.1, E2.3 | The invitee signs in through Better Auth with the invited email, accepts and sees only that store. Another email can't accept the invitation. Before sign-in, M01 reads the store, role and inviter from `POST /api/public/invitations/preview`, and `GET /api/me` lists the user's stores. Playwright `[E2.4][AC02]` |
| E2.5 | Catalogue schema and public reads. Products, variants, sub-categories, pickup places, tours, departures. C01 to C03 and C08 to C10 read from the API | Both | 8 | High | E1.13, E1.11 | The guest pages show seeded data from the database. The catalogue demo seed and its mock code are deleted. Playwright `[E2.5]` |
| E2.6 | Merchant catalogue edits M11 to M14 and M26, with `If-Match` and the publish rule | Both | 8 | Medium | E2.5, E2.10 | A stale edit gets 412. A tour complete in only EN or only DE can be published (S11). Tests `[E2.6][S11]` |
| E2.7 | Media. Signed upload URLs, `sharp` variants in the worker, the public bucket | Both | 5 | Medium | E0.5, E2.6 | A merchant uploads a photo and the guest page shows the resized image. Tests `[E2.7]` |
| E2.8 | Notifications module. SMTP adapter behind the `Mailer` port with the `SMTP_*` config, an in-memory `Mailer` for tests, Mailpit removed from Docker Compose, EN and DE templates, the `mail` job with retries | BE | 5 | Medium | E1.9, E1.12 | N18 and N20 render in both languages and the SMTP adapter delivers them to the test inbox. A failing send retries and then alerts. The sign-in code mail N01 goes through the same job, and E2.2 queues it (D8). Tests `[E2.8]` |
| E2.9 | Staging. Fly `sk-staging`, Neon `staging` branch, Sentry EU, deploy on merge, smoke tests after each deploy. Sentry receives the `mail.failed` error log lines, which are the mail alert until then (`docs/ops/mail.md`) | Ops | 5 | High | E1.13, E0.7 | A merge to `main` reaches staging, and the E0.8 and E2 Playwright tests pass there. Proof is the deploy log and the run link |
| E2.10 | Request guards, split from E2.2 on 20.10.2026. The `Origin` check, memberships, `can()` and the generated permission matrix | BE | 3 | High | E2.2 | One rule checks `Origin` on every POST, PUT, PATCH and DELETE under `/api/`, `/api/auth/*` included, and excludes `/webhooks/stripe` by name. Tests refuse a JSON POST, a form POST, a PUT, a PATCH and a DELETE from a foreign origin with 403, let the same requests from our origin through, cover a request without `Origin`, and show `/webhooks/stripe` is not checked. Every `/api/store/*` route returns 403 to a member of another store, checked by the generated permission matrix. Tests `[E2.10][AC02]` |

### E3. Keepsake orders

| ID | Story | Side | Pts | Priority | Depends | Acceptance and proof |
|---|---|---|---|---|---|---|
| E3.1 | Cart submit. The cart splits into orders by merchant and payment policy (B5). Orders start awaiting acceptance with no stock held. N02 and N03. C04, C06 and C07 call the API | Both | 8 | High | E2.5, E2.8 | S1. Two orders are created, no money is taken, and no stock is held. Playwright `[E3.1][S1]` and integration tests |
| E3.2 | Merchant order screens M02, M03 and M04 on the API | Both | 5 | Medium | E3.1 | The merchant sees the new requests with both labels. Playwright `[E3.2]` |
| E3.3 | Accept with stock holds, variants locked in ID order. Reject (N06). A pickup change by staff. N04 and N05 | Both | 8 | High | E3.2 | S2. Two staff accepting orders for the last unit give exactly one success, and the other order shows the shortage. Tests `[E3.3][S2][AC05]` |
| E3.4 | First-payment deadline job and the sweeper. An overdue order cancels itself (N23) | BE | 5 | Medium | E3.3, E1.9 | S3. A pay-later order and a deposit-paid order are not cancelled. The clock is moved in the test. Tests `[E3.4][S3]` |
| E3.5 | External payments. Staff record a payment (M08). Only the Owner can adjust or void one, with a reason (M09) | Both | 5 | High | E3.3, E1.4 | S6. The original entry stays in the history. The test checks the ledger and audit rows. Tests `[E3.5][S6][AC08]` |
| E3.6 | Ready, handover and completion. Handover lowers `stock_on_hand`. Completion is locked while a balance is due. N12 and N15 | Both | 5 | Medium | E3.5 | S4. Tests `[E3.6][S4][AC09]` |
| E3.7 | Cancel and refund for orders paid outside the app (M10), per line and partial | Both | 5 | Medium | E3.5 | Cancelling releases stock not yet handed over. A refund can't exceed what was paid on that line. Tests `[E3.7][S9]` |
| E3.8 | Reviews. The guest reviews after completion (C18). The merchant replies (M23) | Both | 3 | Low | E3.6 | A review is possible only after completion, once per item. Tests `[E3.8]` |
| E3.9 | Guest order screens C14 and C15 on the API. The order demo seed and its mock code are deleted | FE | 3 | Medium | E3.6 | Playwright `[E3.9]` |
| E3.10 | S1 to S4 and S6 as one staging suite | FE | 3 | Medium | E3.9, E2.9 | The suite passes on staging in EN and DE. Proof is the run link |

### E4. Tours and online payment

Q2 (the pilot merchant's Swiss business status, CHF account and TWINT legal notice) blocks E4.12 and the TWINT parts of E4.13.

| ID | Story | Side | Pts | Priority | Depends | Acceptance and proof |
|---|---|---|---|---|---|---|
| E4.1 | Bookings and the seat hold. `lockDepartureForHold`, availability counted lazily from `hold_until > now()`, the 15-minute hold with no grace (Q14) | BE | 8 | High | E2.5, E1.3 | 50 parallel holds on one free seat give one `pending_payment`. A reload doesn't extend the hold. Tests `[E4.1][AC05][S7]` |
| E4.2 | Pay-later bookings. Confirmed at once with no timer. The balance-overdue job follows each departure's policy | Both | 5 | Medium | E4.1 | S7, pay-later part. Tests `[E4.2][S7][AC07]` |
| E4.3 | Money module. `payment_attempts`, the `PaymentGateway` port, the fake timeline, the Stripe adapter | BE | 5 | High | E1.9, E0.4 | The fake gateway can script every case in architecture section 6.4. Tests `[E4.3]` |
| E4.4 | Payment Element on C11 and C12. Server confirmation with a ConfirmationToken, refused under 60 seconds left. Cards use manual capture. The return page C13 syncs with Stripe | Both | 8 | High | E4.3, E4.1 | A deposit tour paid by test card confirms and shows 70 percent due. A confirm with under 60 seconds left is refused. Playwright `[E4.4][S7][AC06]` |
| E4.5 | Stripe webhooks. Signature check, `webhook_events` dedupe, the `provider-event` job | BE | 5 | High | E4.3 | The same event replayed twice leaves the ledger unchanged. Tests `[E4.5]` |
| E4.6 | Hold expiry. The job cancels the PaymentIntent at `hold_until`. A late success becomes a `money_exceptions` row with an automatic refund and N22 | BE | 8 | High | E4.4, E4.5 | Every late-payment row in architecture section 12 passes, including the expiry job racing a webhook. Tests `[E4.6]` |
| E4.7 | Balance payment and reminders. N07 to N10 and N13 at the Q5 times | Both | 5 | Medium | E4.4, E1.6 | A deposit booking's balance is paid later and the labels update. Reminders go out at the Q5 times. Tests `[E4.7][AC08]` |
| E4.8 | Online refunds (M10) through Stripe Refunds. N14 shows processing, succeeded and failed | Both | 5 | Medium | E4.5 | S9, online part. A processing refund never shows as refunded. Tests `[E4.8][S9]` |
| E4.9 | Departure screens M05 and M06. Service results, no-show, completion. M07 | Both | 5 | Medium | E4.2 | S7, after-tour part. A no-show booking never completes, earns no commission, and opens no review. Tests `[E4.9][S7][AC09]` |
| E4.10 | Online payment for accepted keepsake orders. N21 to staff | Both | 3 | Medium | E4.4, E3.3 | S3, online part. Each order in a cart is paid on its own. Tests `[E4.10][S3]` |
| E4.11 | Provider sync and the nightly reconcile, with alerts | BE | 3 | Medium | E4.5 | A webhook held back is caught by the return page or the nightly job. Tests `[E4.11]` |
| E4.12 | Store payment account in M22. The pilot store's restricted key, the `charges_enabled` and TWINT checks in A02 | Both | 3 | Medium | E4.3, E2.3 | Blocked by Q2. A store with charges disabled can't sell. Tests `[E4.12][AC03]` |
| E4.13 | S7 and S9 on staging with the TWINT and card test flows, and the k6 hold test | Both | 3 | Medium | E4.6 to E4.12 | Both scenarios pass on staging. k6 shows no booking past capacity. Proof is the run links |

### E5. Partners

| ID | Story | Side | Pts | Priority | Depends | Acceptance and proof |
|---|---|---|---|---|---|---|
| E5.1 | Partners M15 and M16. QR and link, `/r/{code}` records a visit and attributes later orders and bookings | Both | 5 | Medium | E3.1, E4.1 | An order placed inside the attribution window carries the partner. Tests `[E5.1]` |
| E5.2 | Commission. Recorded once at completion (unique index), adjusted on refund, offset against later commission | BE | 5 | High | E5.1, E3.6, E4.9, E1.5 | The S9 figures come out exactly. A second recorded row fails. Tests `[E5.2][S9]` |
| E5.3 | Partner access P01 and report P02. Token link, emailed code (N19), session cookie | Both | 5 | High | E5.2 | S5. No `/api/partner/*` response contains email, phone, address, engraving or notes, checked against the response schemas. Every partner mutation route is under `/api/partner/`, so the `Origin` rule covers it, and a test sends one from a foreign origin and gets 403. Tests `[E5.3][S5]` |
| E5.4 | Partner payouts recorded in M16 by Owner or Manager. Revoke a leaked link | Both | 3 | Medium | E5.3 | S5, payout part. The report updates and keeps who recorded it. Tests `[E5.4][S5]` |
| E5.5 | Partner screens on the API. The partner demo seed and its mock code are deleted. The S5 staging run | FE | 2 | Medium | E5.4 | Playwright `[E5.5][S5]` on staging |

### E6. Content, requests, reports and admin

| ID | Story | Side | Pts | Priority | Depends | Acceptance and proof |
|---|---|---|---|---|---|---|
| E6.1 | Articles. M17 editor, C19 list, C20 reader, a notice when a translation is missing | Both | 8 | Medium | E2.7 | AC32 and AC33. S11, article part. Tests `[E6.1][S10][S11]` |
| E6.2 | Comments on articles, sign-in required. Moderation in M18 | Both | 3 | Low | E6.1, E2.1 | Tests `[E6.2][S10]` |
| E6.3 | Trip advice C21 with the M19 question set, and private-tour requests C22 and M20. N16 and N17 | Both | 5 | Medium | E2.8 | S10. A guest without an email is asked for one and keeps what they typed. AC34. Tests `[E6.3][S10]` |
| E6.4 | Reports M21 and cost data M24 as SQL views. M02 figures | Both | 8 | Medium | E3.6, E4.9, E5.2 | S12. Profit shows only when every cost is in. Tests `[E6.4][S12]` |
| E6.5 | Plausible, the consent banner, GA4 after consent | FE | 3 | Low | E2.9 | GA4 never loads before consent. No personal data, engraving or chat text is sent. Playwright `[E6.5]` |
| E6.6 | Ledger CSV export for the accountant (Q11) | Both | 2 | Low | E4.8 | The CSV totals match the ledger view. Tests `[E6.6]` |
| E6.7 | Guest data export and account deletion. Retention jobs, 10 years for ledger and orders (Q12) | Both | 5 | Medium | E2.10, E2.8 | Deletion runs through Better Auth's `deleteUser` (D8). A guest without a password confirms through the link in the new mail N24, sent in the language the SPA sends, or EN when none came. A signed-out click on that link opens the sign-in sheet C05 and returns to the deletion confirmation after sign-in. Our step before the delete anonymises the guest profile, Better Auth removes the user and its sessions, and the ledger and order rows stay because they point at the guest profile, never at Better Auth's user row (architecture section 5). Tests `[E6.7]` |
| E6.8 | S10 to S12 as one staging suite | FE | 2 | Medium | E6.1 to E6.7 | The suite passes on staging in EN and DE. Proof is the run link |

### E7. Going live

Q2 and Q6 block E7.5 and E7.6.

| ID | Story | Side | Pts | Priority | Depends | Acceptance and proof |
|---|---|---|---|---|---|---|
| E7.1 | Production. Neon `main` at 0.5 CU or more with scale to zero off and 7 days of restore history. Fly `sk` with 2 machines | Ops | 3 | High | E6.8 | The settings are checked by a script and recorded. Proof is the script output |
| E7.2 | Restore drill. Branch from a past timestamp and check the data | Ops | 2 | High | E7.1 | Proof is `docs/ops/restore-drill.md` with times |
| E7.3 | Runbooks in `docs/ops/` reviewed against architecture section 13 | Ops | 3 | Medium | E7.1 | Each runbook was followed once on staging |
| E7.4 | Security. OWASP ASVS level 2 checklist, CSP, dependency audit, secret rotation | Ops | 5 | High | E7.1 | The checklist is filled in with links |
| E7.5 | Live Stripe keys on the pilot account, TWINT live check, legal notice | Ops | 2 | High | E7.4 | Blocked by Q2. A real CHF 1 payment and refund with the owner watching |
| E7.6 | Data inventory and the lawyer's confirmation | Ops | 2 | Medium | E7.4 | Blocked by Q6. The signed note is linked |
| E7.7 | Full S1 to S12 run on production settings, then the first real order with the owner watching | Both | 3 | High | E7.5, E7.6 | The go-live checklist is signed |

## 5. Sprint map

This is a guess for one developer with Claude agents. It is rebuilt from measured velocity after Sprint 2.

| Sprint | Goal | Stories |
|---|---|---|
| 0 | Spikes answered, regression net in place | E0.1 to E0.9 |
| 1 | Packages and domain rules | E1.1 to E1.7 |
| 2 | API skeleton, platform layer, CI | E1.8 to E1.13 |
| 3 | Better Auth in the API and the request guards first, then sign-in, stores and staff. Mail is already built | E2.2, E2.10, E2.1, E2.3, E2.4, E2.8 |
| 4 | Catalogue, media, staging | E2.5 to E2.7, E2.9 |
| 5 | Cart submit and merchant order screens | E3.1, E3.2 |
| 6 | Acceptance, deadlines, external payments | E3.3 to E3.5 |
| 7 | Completion, refunds, reviews, guest screens | E3.6 to E3.10 |
| 8 | Seat holds, pay-later, money module | E4.1 to E4.3 |
| 9 | Payment Element and webhooks | E4.4, E4.5 |
| 10 | Late payments, balances, reminders | E4.6, E4.7, E4.11 |
| 11 | Refunds, after-tour, order payments, sign-off | E4.8 to E4.10, E4.12, E4.13 |
| 12 | Partners and commission | E5.1, E5.2 |
| 13 | Partner reports and payouts | E5.3 to E5.5 |
| 14 | Articles and comments | E6.1, E6.2 |
| 15 | Requests and reports | E6.3, E6.4 |
| 16 | Analytics, export, privacy, sign-off | E6.5 to E6.8 |
| 17 | Going live | E7.1 to E7.7 |

## 6. Owner decisions that block work

| Decision | Blocks | Needed by |
|---|---|---|
| Q2. Pilot merchant's Swiss business status, CHF account, TWINT legal notice | E4.12, the TWINT half of E4.13, E7.5 | Sprint 8 for the test account, Sprint 17 for live |
| Q6. Lawyer confirms Frankfurt hosting and the SMTP provider | E7.6 | Sprint 16 |
| Q15. The store's own mail host: SMTP host, credentials and sending domain | E2.9 for real guests, E7.6 | Before staging mail leaves the test account |
| Q1. Stripe platform entity | Nothing in Phase 1. It matters before a second merchant | After launch |
| PRD open items for tours (minimum group size, cutoffs, rescheduling, weather and merchant cancellation, PRD L255) | E4.2 and E4.9 rules. Each rule is a pure function, so a late answer changes one function and its test | Sprint 8 |

## 7. Risks

The full list is architecture section 15. These are the ones that change the plan.

- **SP6 failed on WebKit, so auth moved.** On 20.10.2026 the E2.1 Playwright WebKit run refused Neon Auth's third-party session cookie, and the owner moved D8 to Better Auth inside the API. E2.2 grew from 3 to 8 points, and on 20.10.2026 the owner split it into E2.2 (5) and E2.10 (3), which come first in Sprint 3. Sprint 3 holds 26 points where it held 21. The real iPhone check stays in E2.1 and is not verified until it runs.
- **Better Auth security advisories.** The auth code now runs in our process (R13). `better-auth` is pinned at 1.7.7 or later, and each advisory can add an unplanned upgrade.
- **The sprint map is a guess.** It is rebuilt after Sprint 2. Until then no date is promised.
- **Payments are the hardest part.** E4 has the most points and the most tests. If it slips, E5 and E6 move, not the E4 tests.
- **One developer.** The harness, the runbooks and this plan are the handover.

## 8. Reading list

- `docs/architecture/backend.md` is the design every story builds on.
- `docs/PRD/Swiss_keepsakes_PRD.md` holds the product rules.
- `docs/ux/ux-spec-phase1.md` holds the screens (C, M, P, A), the mails (N01 to N24), the acceptance criteria (AC01 to AC34) and the scenarios (S1 to S12).
- `docs/development-plan/sprint-0-1.md` is the pull-request plan for Sprints 0 and 1.
