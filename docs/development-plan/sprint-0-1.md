# Sprint 0 and Sprint 1 plan

These seven pull requests put a regression net under the prototype and then split the code into packages without changing what guests or staff see.
They serve the owner, who keeps a working demo throughout, and the developer, who gets tests that catch any change in behaviour.
The rule is that no behaviour changes. The prototype flows produce the same output at trunk and at every head.
The spikes SP1 to SP7 also run in Sprint 0. They are throwaway branches with written answers in `docs/spikes/`, not pull requests, so they sit in Appendix A.
Pull requests in order are E0.8, E0.9, E1.1, E1.2, E1.7, E1.3+E1.4 and E1.5+E1.6. Story IDs match `docs/development-plan/delivery-plan.md`.

## How to read this

One box is one unit of work. Every box names the evidence that checks it. A nested box is a sub-step of the box above it. Check a box only when its evidence exists, a file, a log line, a screenshot, a test run, or a SHA. The body is a how-to. The appendices explain and record.

The program runs `skills/poteto-mode/playbooks/autopilot-stack.md` under the installed plugin. No owner merges. The root appends each verified pull request to one frozen bottom-to-top stack, and the operator lands every pull request herself.

Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.

## Program checklist

### Arm the program

- [ ] State the protocol and this plan to the operator, then stop. Start execution only on the operator's explicit go.
- [ ] On the operator's go, write the program objective into the standing orders and your todolist with this exact text. "Run `docs/development-plan/sprint-0-1.md`. Pull requests in order are E0.8, E0.9, E1.1, E1.2, E1.7, E1.3+E1.4, E1.5+E1.6. Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked. The operator lands every pull request. Done when all seven are verified and appended to the stack, and SP1 to SP7 each have a written answer in `docs/spikes/`."
- [ ] Read these from the installed plugin at program start. Re-read them at every tick.
  - [ ] `skills/poteto-mode/playbooks/autopilot-stack.md`
  - [ ] `skills/swarm/SKILL.md`
  - [ ] The Claude Code `verify` skill for the browser lanes and the `run` skill for the CLI lanes
  - [ ] `skills/poteto-mode/playbooks/opening-a-pr.md`
  - [ ] `skills/poteto-mode/playbooks/prototype.md`
  - [ ] `skills/architect/SKILL.md`
  - [ ] `skills/deslop/SKILL.md`
  - [ ] `skills/no-comments/SKILL.md`
- [ ] Arm the 30-minute audit tick as a real cadence. Never leave the cadence to memory.
- [ ] Use this tick prompt, verbatim. "Re-read the execution playbook from the installed plugin and the standing orders. Audit the operation against both and fix drift in this tick. Probe every active lane and judge progress by side effects only. Stand down a lane only on affirmative failure evidence, and dispatch its replacement in the same tick. Then send the operator a status message, whether or not anything changed, with the queue table of PR, owner, state, and head SHA, the verdicts since the last tick, what merged, open operator gates, and blockers."
- [ ] On the operator's hold or stand-down, send every owner a zero-writes order at once.

### Spawn owners

- [ ] Spawn one owner per PR with the full lifecycle the execution playbook names.
- [ ] Spawn one prototype owner per spike, SP1 to SP7, under `skills/poteto-mode/playbooks/prototype.md`. Each writes `docs/spikes/SPn.md` with the pass condition from architecture section 16 and the observed result.
- [ ] Follow this dependency graph. Start dependent work only after its parent merges, or rebase its branch onto the parent's exact tip when the execution playbook stacks. A same-repository child PR targets its parent branch. A fork child PR targets trunk while retaining local parent ancestry. Freeze the bottom-to-top order because fork PR bases do not encode it.
  - [ ] E0.8 is first and branches from `main`.
  - [ ] E0.9 after E0.8.
  - [ ] E1.1 after E0.9.
  - [ ] E1.2 after E1.1.
  - [ ] E1.7 after E1.2.
  - [ ] E1.3+E1.4 after E1.7.
  - [ ] E1.5+E1.6 after E1.3+E1.4.
- [ ] Hold the file boundaries. E0.8 touches only `e2e/**`, `.github/workflows/**` and the root `package.json`. E0.9 touches only `scripts/trace*`, `scripts/fixtures/**` and `.github/workflows/**`. E1.1 touches only package manifests, lockfiles and build config. E1.2 touches only `packages/domain/**`, `scripts/codemods/**` and the import lines in `front-end/src/**`. E1.7 touches only ESLint config and `scripts/fixtures/**`. E1.3+E1.4 and E1.5+E1.6 touch only `packages/domain/**` and the matching `front-end/src/features/**` call sites.
- [ ] Hold the review gate. No PR in this program changes an interaction, so none waits for an operator review before it enters the stack.

### PR mechanics, for every PR

- [ ] Resolve the forge once. Default to `gh`; if `command -v origin` succeeds and Origin can resolve the repository, use `origin pr` for every PR operation. Record any fallback to `gh`. Record the intended PR base repository as canonical `<base-repo>` and validate it through the active forge. Do not infer it from the checkout's default remote. Capture it as a shell variable and pass `--repo "$base_repo"` to every `gh pr` command. Resolve and validate `<head-url>` through Shipping step 1 and capture it as `head_url` for the live-lane fetch. When the head repository is a fork, validate its identity and record its owner and repository name as `<fork-owner>` and `<head-name>`. Never require `gt`.
- [ ] Open the PR before self-proof and follow the readiness rule in `skills/poteto-mode/playbooks/opening-a-pr.md`. Open it ready by default. When repository instructions require a draft until named evidence exists, keep it draft until that evidence is recorded. Use `origin pr create --status open --base "$base_branch"` or `gh pr create --base "$base_branch" --repo "$base_repo"` for a ready same-repository PR. A same-repository stack child targets its parent branch. Every fork PR targets trunk. With GitHub, capture the approved PR title and body as `<title>` and `<body>`, then create it with `gh api --method POST "repos/$base_repo/pulls" -f "title=$title" -f "body=$body" -f "head=$fork_owner:$branch" -f "head_repo=$head_name" -f "base=$trunk" --jq .html_url`; add `-F draft=true` when repository instructions require a draft. Otherwise use the resolved Origin command. Stacked fork branches retain local parent ancestry.
- [ ] Run the repo's lint and typecheck once before the PR-facing push. Push with hooks on.
- [ ] Run `/deslop` before each commit and `/no-comments` before review.
- [ ] Triage every Bugbot and security-reviewer comment per `skills/poteto-mode/references/bugbot-triage.md` under the installed plugin.
- [ ] Before babysit, rebase each independent PR and stack root onto current trunk. Rebase each unmerged stack child onto its parent's exact tip. After its parent merges, use Shipping's explicit old-base-to-trunk rebase before the child's merge-ready report.
- [ ] Never run `git stash`, `git checkout` of shared files or `eslint --fix` in the operator's working tree. A parallel session edits the same tree. Every owner works in its own worktree.

### Verdict and merge, for every PR

- [ ] At the merge-ready head SHA, run the swarm per `skills/swarm/SKILL.md`. One gates lane. The ten live lanes from the PR's **Verify, live** block. The perf lane from its **Verify, perf** block. One audit lane that reads the diff and the receipts and distrusts the PR body.
- [ ] Clean only when every lane is `PASS`. Findings go back to the owner. A new head gets a fresh swarm and a fresh verdict.
- [ ] On a clean verdict at the exact head SHA, the root appends the PR to the frozen bottom-to-top stack and records the verdict SHA and the recorded patch base. After any rebase, compare the `git patch-id` of the patch-base-to-head diff against the one at the verdict SHA per `skills/poteto-mode/playbooks/shipping.md`. An unchanged patch ID keeps the verdict. A changed one gets a fresh swarm. No owner merges.

### Boot recipe, for every live lane

Each live lane is one `swarm workers` lane at the PR head, resolved through provider dispatch, in its own worktree or output directory, with its own receipt. Drive the surface only through the driver skill this plan names.

- [ ] `git fetch -- "$head_url" "refs/heads/$head_branch" && git checkout --detach "$head_sha"` in the lane's worktree.
- [ ] Copy the operator's untracked `.check/drv` folder, read-only, into `"$lane/drv"` and run `npm ci` there. Every `.check/drv/` path in a lane means the lane's copy. Never call `run-flow.sh`, because it writes fixed files under `/tmp` that parallel lanes would overwrite.
- [ ] The parity check on a flow runs the lane's copy of `<flow>.mjs` against the trunk build and the head build, writes `"$lane/<flow>-trunk.txt"` and `"$lane/<flow>-head.txt"`, diffs them, and prints `IDENTICAL` when they match. From E1.1 on, each lane also runs the tracked suite with `npm run e2e` against both builds.
- [ ] Run `npm ci`, then build the demo app twice into scratch folders, trunk into `"$lane/trunk-dist"` and head into `"$lane/head-dist"`, with `npm --prefix front-end run build -- --outDir "$lane/<side>-dist"`. Serve each with `npx vite preview --outDir "$lane/<side>-dist" --port <port>` on a port unique to the lane. Wait until the port answers with HTTP 200.
- [ ] Browser lanes deliver input only through the `verify` skill at a 375 by 812 viewport, with the clock fixed at `2026-10-14T09:30:00+02:00` as in `.check/drv/flow-lib.mjs`. CLI lanes deliver input only through the `run` skill. Read-only diagnostics are the browser console, the page error log and `git diff --stat`.
- [ ] Save every screenshot to `.check/swarm-<pr-id>/worker-<n>/<slug>.png` and return the paths with the receipt path.
- [ ] Stop every preview server and browser the lane started before it reports.

## Turn the prototype flows into tracked Playwright tests (E0.8)

**Depends on.** None.

**Files.**

- [ ] Create `e2e/package.json` with `@playwright/test`.
- [ ] Create `e2e/playwright.config.ts` with a 375 px phone project in English and one in German, a fixed clock, and a `webServer` that serves the demo build.
- [ ] Create `e2e/fixtures/demo.ts` that seeds the demo store role and guest the way `.check/drv/flow-lib.mjs` does.
- [ ] Create `e2e/flows/gift.spec.ts`, `e2e/flows/tour.spec.ts`, `e2e/flows/merchant.spec.ts` and `e2e/flows/language.spec.ts`, ported from `.check/drv/flow-gift.mjs`, `flow-tour.mjs`, `flow-merchant.mjs` and `language-check.mjs`.
- [ ] Create `.github/workflows/e2e.yml` that builds the demo app and runs the suite.
- [ ] Edit the root `package.json` to add an `e2e` script.

**Build.**

- [ ] Port each flow's steps and assertions to Playwright `test()` blocks. Each test title starts with `[E0.8]`. Assert on visible text and roles, never on CSS classes.
- [ ] Fail any test that logs a page error, as `flow-lib.mjs` collects them today.

**You see.**

- [ ] `npm run e2e` prints `8 passed` for four flows in two languages.
- [ ] The GitHub Actions run for the PR shows the `e2e` job green.

**Verify, unit.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.

- [ ] The suite is the unit evidence here. Run `npm run e2e` three times in a row. All three runs pass with no retries, which shows the tests aren't flaky.
- [ ] Break one guest label in a scratch copy of `front-end/src/i18n/en.ts` and run `npm run e2e`. The gift test fails and names the missing text.

**Verify, live.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked. Ten lanes on the configured `swarm workers` role at the PR head, per the boot recipe.

- [ ] Lane 1. Regression lane against trunk. Run the parity check on `flow-gift`. Trunk has no Playwright suite, so the lane records that and gates the new suite's gift test against the old driver's output. Save `gift-parity.png`. Pass when the old driver prints `IDENTICAL` and the new gift test passes on the head build.
- [ ] Lane 2. Drive the gift flow by hand from C01 to C07 in English. Save `gift-c07-en.png`. Pass when every step the gift test asserts is visible on screen in the same order.
- [ ] Lane 3. Drive the tour flow from C08 to C13 in English. Save `tour-c13-en.png`. Pass when the screens match the tour test's assertions.
- [ ] Lane 4. Drive the merchant flow from M02 to M04 as the demo Owner. Save `merchant-m04.png`. Pass when the merchant test's assertions all hold on screen.
- [ ] Lane 5. Switch to German on C01, C03 and C09. Save `language-de.png`. Pass when no English system string and no raw translation key shows.
- [ ] Lane 6. Run the gift test against a build with the C06 submit button label changed. Save `mutation-c06.png`. Pass when the test fails with a message naming the button.
- [ ] Lane 7. Run the tour test against a build with one departure's seat count changed in the demo seed. Save `mutation-seats.png`. Pass when the test fails on the seat count.
- [ ] Lane 8. Run the merchant test against a build that throws inside M04. Save `mutation-error.png`. Pass when the test fails and quotes the page error.
- [ ] Lane 9. Run the suite with the German project only. Save `de-project.png`. Pass when four tests run and pass, and the screenshots show German text.
- [ ] Lane 10. Open the GitHub Actions run for the PR. Save `ci-run.png`. Pass when the `e2e` job is green and its artifact holds the Playwright report.

**Verify, perf.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.

- [ ] Metric. Wall time of the whole suite in CI, and the first-load gzip size of the demo build from `docs/audit/measure-initial-load.mjs`.
- [ ] Probe. Run `node docs/audit/measure-initial-load.mjs` on the trunk build and the head build, alternating three times. Trunk has no suite, so time the head suite alone in CI three times.
- [ ] Baseline. Record the trunk first-load gzip size first. It must equal the head size, since this PR doesn't touch `front-end/`.
- [ ] Rule. Fail if the first-load size differs by any byte, or if the median suite time exceeds 300 seconds.

**Review gate.** None. E0.8 is not review-gated.

**Merge.**

- [ ] Root's clean verdict at the exact head SHA.
- [ ] Bugbot triage done.
- [ ] After the verdict, an owner merge uses Shipping step 4 to move the PR from its recorded patch base onto current trunk. An appended stack child keeps its recorded parent tip until that parent lands. Record the current landing SHA. Preserve the verdict only when the patch ID stays unchanged.
- [ ] The root appends E0.8 to the frozen bottom-to-top stack as its root, and the operator lands it. Same-repository child PRs target their parent branch.

## Add the story traceability check (E0.9)

**Depends on.** E0.8.

**Files.**

- [ ] Create `scripts/trace.mjs`.
- [ ] Create `scripts/fixtures/trace/plan.md` and `scripts/fixtures/trace/tests/` with one covered story, one Verified story without a test, and one Backlog story without a test.
- [ ] Create `scripts/trace.test.mjs`.
- [ ] Edit `.github/workflows/e2e.yml` to run `node scripts/trace.mjs docs/development-plan/delivery-plan.md`.

**Build.**

- [ ] `trace.mjs` reads the story tables from the plan, reads test titles from `e2e/**`, `packages/**` and `api/**` by matching `[E<n>.<n>]`, and reads each story's status from `docs/development-plan/status.json`, which `docs/development-plan/sync-lark.mjs` writes from Lark.
- [ ] It prints one line per story with its test count, and exits 1 when a Verified or Done story has none.

**You see.**

- [ ] `node scripts/trace.mjs docs/development-plan/delivery-plan.md` prints `E0.8 tests=8` and exits 0.

**Verify, unit.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.

- [ ] `scripts/trace.test.mjs` covers a passing plan, a Verified story with no test, an unknown story ID in a test title, and a malformed table row. Run `node --test scripts/trace.test.mjs`.

**Verify, live.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked. Ten lanes on the configured `swarm workers` role at the PR head, per the boot recipe.

- [ ] Lane 1. Regression lane against trunk. Trunk has no `trace.mjs`, so the lane records that and gates the new command on the real plan. Run `node scripts/trace.mjs docs/development-plan/delivery-plan.md` at head. Save `trace-real.png`. Pass when it exits 0 and lists every story ID in the plan.
- [ ] Lane 2. Run it on the fixture plan. Save `trace-fixture.png`. Pass when it exits 1 and names the Verified story with no test.
- [ ] Lane 3. Mark E0.8 as Done in a scratch `status.json` and delete one E0.8 test title. Save `trace-done.png`. Pass when the count for E0.8 drops by one and the exit code stays 0.
- [ ] Lane 4. Delete every E0.8 test title in a scratch copy. Save `trace-missing.png`. Pass when it exits 1 and names E0.8.
- [ ] Lane 5. Add a test titled `[E9.9]`. Save `trace-unknown.png`. Pass when it warns about an unknown story ID.
- [ ] Lane 6. Run it with no `status.json`. Save `trace-nostatus.png`. Pass when it treats every story as Backlog and exits 0.
- [ ] Lane 7. Run it from a subdirectory with a relative plan path. Save `trace-cwd.png`. Pass when the output equals lane 1's.
- [ ] Lane 8. Run it on a plan whose table has a missing column. Save `trace-malformed.png`. Pass when it exits 2 and quotes the row.
- [ ] Lane 9. Open the CI run for the PR. Save `trace-ci.png`. Pass when the trace step ran and passed.
- [ ] Lane 10. Push a scratch branch where a Verified story lacks a test. Save `trace-ci-fail.png`. Pass when CI fails on the trace step.

**Verify, perf.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.

- [ ] Metric. Wall time of `node scripts/trace.mjs docs/development-plan/delivery-plan.md`.
- [ ] Probe. Run it ten times at head in a ten-run Node timing loop. Trunk has no such command, so the lane records that and sets an absolute budget.
- [ ] Baseline. Record the trunk result first, which is that trunk has no trace command, before measuring head.
- [ ] Rule. Fail if the median exceeds 2 seconds.

**Review gate.** None. E0.9 is not review-gated.

**Merge.**

- [ ] Root's clean verdict at the exact head SHA.
- [ ] Bugbot triage done.
- [ ] After the verdict, an owner merge uses Shipping step 4 to move the PR from its recorded patch base onto current trunk. An appended stack child keeps its recorded parent tip until that parent lands. Record the current landing SHA. Preserve the verdict only when the patch ID stays unchanged.
- [ ] The root appends E0.9 above E0.8 in the frozen stack, and the operator lands it. Its PR targets the E0.8 branch.

## Create the npm workspace root (E1.1)

**Depends on.** E0.8, stacked above E0.9.

**Files.**

- [ ] Create the root `package.json` workspaces entry for `front-end`, `api`, `packages/*` and `e2e`.
- [ ] Create `tsconfig.base.json`.
- [ ] Create `vitest.workspace.ts` and add Vitest to the root dev dependencies. The front-end has no test runner today.
- [ ] Edit `front-end/package.json` and `front-end/tsconfig*.json` to extend the base config.
- [ ] Delete `front-end/package-lock.json` in favour of the root lockfile.

**Build.**

- [ ] Root scripts `build`, `typecheck`, `lint` and `test` run the same script in every workspace. The root `lint` never passes `--fix`.

**You see.**

- [ ] `npm run build` at the root prints the Vite build summary for `front-end` with the same chunk list as trunk.

**Verify, unit.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.

- [ ] Run `npm run typecheck && npm run lint && npm run e2e` at the root. All pass.

**Verify, live.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked. Ten lanes on the configured `swarm workers` role at the PR head, per the boot recipe.

- [ ] Lane 1. Regression lane against trunk. Run the parity check on `flow-gift`. Save `gift-parity.png`. Pass when it prints `IDENTICAL`.
- [ ] Lane 2. Run the parity check on `flow-tour`. Save `tour-parity.png`. Pass when the output is identical.
- [ ] Lane 3. Run the parity check on `flow-merchant`. Save `merchant-parity.png`. Pass when the output is identical.
- [ ] Lane 4. Run `.check/drv/compare-builds.mjs` on the two builds. Save `route-diff.png`. Pass when all 100 routes match in EN and DE.
- [ ] Lane 5. Open C01 in German at head. Save `c01-de.png`. Pass when the German chunk loads lazily and no key is missing.
- [ ] Lane 6. Open M02 as the demo Owner at head. Save `m02.png`. Pass when the cards match trunk.
- [ ] Lane 7. Run `npm run dev` at the root and open C01. Save `dev-c01.png`. Pass when the dev server starts and the page renders with hot reload working.
- [ ] Lane 8. Run `npm ci` in a clean clone. Save `clean-install.png`. Pass when it succeeds with no peer dependency errors.
- [ ] Lane 9. Run `.check/drv/offline-german-check.mjs` on the head build. Save `offline-de.png`. Pass when it reports the same result as trunk.
- [ ] Lane 10. Open the CI run for the PR. Save `ci.png`. Pass when every job is green.

**Verify, perf.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.

- [ ] Metric. First-load gzip size of the demo build, and the front-end build time.
- [ ] Probe. Build trunk and head alternately three times each, then run `node docs/audit/measure-initial-load.mjs` on each output.
- [ ] Baseline. Record the trunk first-load gzip size and median build time first.
- [ ] Rule. Fail if the head first-load size differs by more than 0 bytes, or if the median build time is 20 percent slower than trunk. A build under 2 seconds also fails, since it means the React Compiler is off.

**Review gate.** None. E1.1 is not review-gated.

**Merge.**

- [ ] Root's clean verdict at the exact head SHA.
- [ ] Bugbot triage done.
- [ ] After the verdict, an owner merge uses Shipping step 4 to move the PR from its recorded patch base onto current trunk. An appended stack child keeps its recorded parent tip until that parent lands. Record the current landing SHA. Preserve the verdict only when the patch ID stays unchanged.
- [ ] The root appends E1.1 above E0.9 in the frozen stack, and the operator lands it. Its PR targets the E0.9 branch.

## Extract the prototype types and pure rules into packages/domain (E1.2)

**Depends on.** E1.1.

**Files.**

- [ ] Create `packages/domain/package.json` named `@sk/domain`, and `packages/domain/src/<module>/` folders per architecture section 4.2.
- [ ] Edit `front-end/src/features/*/types.ts` to re-export nothing. Move the types into `packages/domain/src/<module>/types.ts`.
- [ ] Edit the pure rule files in `front-end/src/features/*/lib/`, starting with `catalog/lib/pickup.ts`, to move into `packages/domain`.
- [ ] Edit every importer in `front-end/src/**` to import from `@sk/domain`.

**Build.**

- [ ] Write a codemod at `scripts/codemods/move-to-domain.mjs` that moves each file and rewrites its imports, and run it. The codemod is the artifact a reviewer reruns.
- [ ] Keep only types and pure functions in `packages/domain`. Anything that touches React, the DOM or the demo store stays in `front-end`.

**You see.**

- [ ] `rg "features/.*/types" front-end/src` prints nothing.

**Verify, unit.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.

- [ ] The front-end has no unit tests today. Write Vitest tests for each moved rule in `packages/domain`, pinned to the outputs the trunk code gives, with titles starting `[E1.2]`. Run `npm test -w packages/domain`.
- [ ] Run the codemod again on the result. It reports zero changes.

**Verify, live.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked. Ten lanes on the configured `swarm workers` role at the PR head, per the boot recipe.

- [ ] Lane 1. Regression lane against trunk. Run the parity check on `flow-gift`. Save `gift-parity.png`. Pass when it prints `IDENTICAL`.
- [ ] Lane 2. Run the parity check on `flow-tour`. Save `tour-parity.png`. Pass when the output is identical.
- [ ] Lane 3. Run the parity check on `flow-merchant`. Save `merchant-parity.png`. Pass when the output is identical.
- [ ] Lane 4. Run `.check/drv/compare-builds.mjs`. Save `route-diff.png`. Pass when all 100 routes match in EN and DE.
- [ ] Lane 5. Pick a pickup date on C03 for a keepsake with a preparation time, in English. Save `c03-pickup.png`. Pass when the offered dates equal trunk's.
- [ ] Lane 6. Open C04 with two items on different preparation rules. Save `c04-dates.png`. Pass when the valid dates per group equal trunk's.
- [ ] Lane 7. Open C15 for a deposit order. Save `c15-labels.png`. Pass when both labels and the amounts equal trunk's.
- [ ] Lane 8. Open M04 for an order awaiting acceptance. Save `m04-actions.png`. Pass when the action buttons equal trunk's.
- [ ] Lane 9. Open P02 for the demo partner. Save `p02.png`. Pass when every figure equals trunk's.
- [ ] Lane 10. Run `.check/drv/render-count.mjs` on both builds. Save `render-count.png`. Pass when no route renders more often at head.

**Verify, perf.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.

- [ ] Metric. First-load gzip size of the demo build.
- [ ] Probe. Build trunk and head alternately three times, then run `node docs/audit/measure-initial-load.mjs` on each output.
- [ ] Baseline. Record the trunk first-load gzip size first.
- [ ] Rule. Fail if the head first-load size is more than 1 percent larger than trunk.

**Review gate.** None. E1.2 is not review-gated.

**Merge.**

- [ ] Root's clean verdict at the exact head SHA.
- [ ] Bugbot triage done.
- [ ] After the verdict, an owner merge uses Shipping step 4 to move the PR from its recorded patch base onto current trunk. An appended stack child keeps its recorded parent tip until that parent lands. Record the current landing SHA. Preserve the verdict only when the patch ID stays unchanged.
- [ ] The root appends E1.2 above E1.1 in the frozen stack, and the operator lands it. Its PR targets the E1.1 branch.

## Enforce the layer boundaries in lint (E1.7)

**Depends on.** E1.2.

**Files.**

- [ ] Create `eslint.config.js` at the root with the `import/no-restricted-paths` zones from architecture section 4.1.
- [ ] Edit `front-end/eslint.config.*` to extend the root config and keep its existing rules.
- [ ] Create `scripts/fixtures/boundaries/` with one file per forbidden import direction.
- [ ] Create `scripts/boundaries.test.mjs`.

**Build.**

- [ ] One zone per forbidden direction. `packages/domain` imports only itself. `api/src/modules/*/application` imports no adapters and no platform code. No module imports another module's `application/` or `adapters/`. The zones for `api/` sit in the config now and bite once E1.8 adds the files.

**You see.**

- [ ] `npx eslint scripts/fixtures/boundaries` prints one `import/no-restricted-paths` error per fixture file.

**Verify, unit.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.

- [ ] `scripts/boundaries.test.mjs` runs ESLint on each fixture and asserts the rule fires, with titles starting `[E1.7]`. Run `node --test scripts/boundaries.test.mjs`.

**Verify, live.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked. Ten lanes on the configured `swarm workers` role at the PR head, per the boot recipe.

- [ ] Lane 1. Regression lane against trunk. Run `npx eslint front-end/src` at trunk and head. Save `lint-parity.png`. Pass when both print 0 messages.
- [ ] Lane 2. Add an import of `react` to a scratch file in `packages/domain`. Save `domain-react.png`. Pass when lint fails on it.
- [ ] Lane 3. Add an import of `front-end/src` to a scratch file in `packages/domain`. Save `domain-fe.png`. Pass when lint fails on it.
- [ ] Lane 4. Create a scratch `api/src/modules/a/application/x.ts` that imports `../adapters/y`. Save `app-adapter.png`. Pass when lint fails on it.
- [ ] Lane 5. Create a scratch file in module `a` that imports `modules/b/application/z`. Save `cross-module.png`. Pass when lint fails on it.
- [ ] Lane 6. Make the same scratch file import `modules/b/index`. Save `cross-index.png`. Pass when lint passes.
- [ ] Lane 7. Add an import of `@/features` to a file in `front-end/src/lib`. Save `shared-features.png`. Pass when the existing shared-layer rule still fails it.
- [ ] Lane 8. Run the React hooks rules on a component that writes a ref during render. Save `hooks-rule.png`. Pass when the existing compiler rule still fails it.
- [ ] Lane 9. Run the root `npm run lint`. Save `root-lint.png`. Pass when it exits 0 and no file was rewritten.
- [ ] Lane 10. Open the CI run for the PR. Save `ci.png`. Pass when the lint job ran the boundary test and passed.

**Verify, perf.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.

- [ ] Metric. Wall time of `npx eslint front-end/src`.
- [ ] Probe. Run it at trunk and head alternately five times each in a ten-run Node timing loop.
- [ ] Baseline. Record the trunk median first.
- [ ] Rule. Fail if the head median is more than 20 percent slower than trunk.

**Review gate.** None. E1.7 is not review-gated.

**Merge.**

- [ ] Root's clean verdict at the exact head SHA.
- [ ] Bugbot triage done.
- [ ] After the verdict, an owner merge uses Shipping step 4 to move the PR from its recorded patch base onto current trunk. An appended stack child keeps its recorded parent tip until that parent lands. Record the current landing SHA. Preserve the verdict only when the patch ID stays unchanged.
- [ ] The root appends E1.7 above E1.2 in the frozen stack, and the operator lands it. Its PR targets the E1.2 branch.

## Encode the status tables and the money labels in packages/domain (E1.3+E1.4)

**Depends on.** E1.7.

**Files.**

- [ ] Create `packages/domain/src/orders/transitions.ts` and `packages/domain/src/bookings/transitions.ts`.
- [ ] Create `packages/domain/src/money/money-state.ts`.
- [ ] Edit the front-end call sites in `front-end/src/features/orders`, `transactions` and `merchant` that decide buttons and payment labels, so they read the tables and `moneyState`.

**Build.**

- [ ] Each transition table is a typed record from status to the statuses it may move to, with the actor roles allowed. Run `skills/architect/SKILL.md` on the types before writing them.
- [ ] `moneyState` takes ledger entries and returns the paid amount, the balance and the two payment labels. It replaces the scattered label logic in the front-end.

**You see.**

- [ ] C15 and M04 show the same labels and buttons as trunk for every seeded order.

**Verify, unit.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.

- [ ] `packages/domain/src/orders/transitions.test.ts` and `bookings/transitions.test.ts` test every allowed and refused move. `no_show` can't reach `completed`. Only `pending_payment` can confirm. Titles start `[E1.3]`.
- [ ] `packages/domain/src/money/money-state.test.ts` reproduces the UX L584 figures and refuses a negative balance. Titles start `[E1.4]`. Run `npm test -w packages/domain`.

**Verify, live.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked. Ten lanes on the configured `swarm workers` role at the PR head, per the boot recipe.

- [ ] Lane 1. Regression lane against trunk. Run the parity check on `flow-merchant`. Save `merchant-parity.png`. Pass when it prints `IDENTICAL`.
- [ ] Lane 2. Run the parity check on `flow-gift`. Save `gift-parity.png`. Pass when the output is identical.
- [ ] Lane 3. Run the parity check on `flow-tour`. Save `tour-parity.png`. Pass when the output is identical.
- [ ] Lane 4. Open C14 for the demo guest. Save `c14.png`. Pass when every row's two labels equal trunk's.
- [ ] Lane 5. Open C15 for a deposit order with a balance due. Save `c15-deposit.png`. Pass when the paid amount, the balance and the labels equal trunk's.
- [ ] Lane 6. Open M04 for an accepted order and record an external payment in M08. Save `m04-m08.png`. Pass when the labels after the payment equal trunk's.
- [ ] Lane 7. Open M07 for a booking and mark it no-show. Save `m07-noshow.png`. Pass when the complete button is gone, as on trunk.
- [ ] Lane 8. Open M04 as the demo Manager. Save `m04-manager.png`. Pass when the adjust-payment button is hidden, as on trunk.
- [ ] Lane 9. Open C16 for a pay-later booking in German. Save `c16-de.png`. Pass when the German labels equal trunk's.
- [ ] Lane 10. Run `.check/drv/compare-builds.mjs`. Save `route-diff.png`. Pass when all 100 routes match in EN and DE.

**Verify, perf.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.

- [ ] Metric. First-load gzip size of the demo build.
- [ ] Probe. Build trunk and head alternately three times, then run `node docs/audit/measure-initial-load.mjs` on each output.
- [ ] Baseline. Record the trunk first-load gzip size first.
- [ ] Rule. Fail if the head first-load size is more than 1 percent larger than trunk.

**Review gate.** None. E1.3+E1.4 is not review-gated.

**Merge.**

- [ ] Root's clean verdict at the exact head SHA.
- [ ] Bugbot triage done.
- [ ] After the verdict, an owner merge uses Shipping step 4 to move the PR from its recorded patch base onto current trunk. An appended stack child keeps its recorded parent tip until that parent lands. Record the current landing SHA. Preserve the verdict only when the patch ID stays unchanged.
- [ ] The root appends E1.3+E1.4 above E1.7 in the frozen stack, and the operator lands it. Its PR targets the E1.7 branch.

## Encode commission math and Zurich date rules in packages/domain (E1.5+E1.6)

**Depends on.** E1.3+E1.4.

**Files.**

- [ ] Create `packages/domain/src/partners/commission.ts`.
- [ ] Create `packages/domain/src/orders/discount-split.ts`.
- [ ] Create `packages/domain/src/shared/zurich-date.ts` and `packages/domain/src/notifications/reminders.ts`.
- [ ] Edit the front-end call sites in `front-end/src/features/partners`, `reports`, `cart` and `catalog` that compute commission, discounts or dates.

**Build.**

- [ ] `commission.ts` computes the basis per line, adjustments on refund and offsets carried to the next period, as in PRD L338 and UX S9.
- [ ] `discount-split.ts` splits a discount by line value to the Rappen, and the last line takes the remainder (Q9).
- [ ] `reminders.ts` returns the send times for the Q5 reminder set in Europe/Zurich time.

**You see.**

- [ ] P02 and M21 show the same commission figures as trunk.

**Verify, unit.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.

- [ ] `commission.test.ts` reproduces every S9 figure, including the CHF 4 overpayment offset. Titles start `[E1.5][S9]`.
- [ ] `discount-split.test.ts` checks that the parts always sum to the discount. Titles start `[E1.5]`.
- [ ] `reminders.test.ts` checks the Q5 times across the March and October DST changes. Titles start `[E1.6]`. Run `npm test -w packages/domain`.

**Verify, live.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked. Ten lanes on the configured `swarm workers` role at the PR head, per the boot recipe.

- [ ] Lane 1. Regression lane against trunk. Run the parity check on `flow-gift`. Save `gift-parity.png`. Pass when it prints `IDENTICAL`.
- [ ] Lane 2. Open P02 for each demo partner. Save `p02.png`. Pass when every figure equals trunk's.
- [ ] Lane 3. Open M16 for a partner with a refund adjustment. Save `m16.png`. Pass when the ledger lines equal trunk's.
- [ ] Lane 4. Open M21 for the last 30 days. Save `m21.png`. Pass when the commission totals equal trunk's.
- [ ] Lane 5. Apply a discount on a three-line cart in C04. Save `c04-discount.png`. Pass when the line totals sum to the order total.
- [ ] Lane 6. Pick a pickup date on C03 with the clock set to 26 October 2026, the day after the DST change. Save `c03-dst.png`. Pass when the offered dates equal trunk's.
- [ ] Lane 7. Open C16 for a tour tomorrow. Save `c16-reminder.png`. Pass when any reminder time shown equals trunk's.
- [ ] Lane 8. Open M15 in German. Save `m15-de.png`. Pass when the amounts and labels equal trunk's.
- [ ] Lane 9. Run `.check/drv/compare-builds.mjs`. Save `route-diff.png`. Pass when all 100 routes match in EN and DE.
- [ ] Lane 10. Run `.check/drv/partner-overview-check.mjs` on the head build. Save `partner-overview.png`. Pass when its output equals trunk's.

**Verify, perf.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.

- [ ] Metric. First-load gzip size of the demo build.
- [ ] Probe. Build trunk and head alternately three times, then run `node docs/audit/measure-initial-load.mjs` on each output.
- [ ] Baseline. Record the trunk first-load gzip size first.
- [ ] Rule. Fail if the head first-load size is more than 1 percent larger than trunk.

**Review gate.** None. E1.5+E1.6 is not review-gated.

**Merge.**

- [ ] Root's clean verdict at the exact head SHA.
- [ ] Bugbot triage done.
- [ ] After the verdict, an owner merge uses Shipping step 4 to move the PR from its recorded patch base onto current trunk. An appended stack child keeps its recorded parent tip until that parent lands. Record the current landing SHA. Preserve the verdict only when the patch ID stays unchanged.
- [ ] The root appends E1.5+E1.6 above E1.3+E1.4 as the stack tip, and the operator lands it. Its PR targets the E1.3+E1.4 branch.

## Close the program

- [ ] Every box above is checked with its evidence.
- [ ] Reply to the operator with the report the execution playbook names.

## Appendix A. Prototype evidence

No prototype has run yet. The seven spikes below are open and run in Sprint 0 beside the pull requests. Each writes its answer to `docs/spikes/SPn.md`.

- SP1. Hono with `@hono/zod-openapi`, raw-body Stripe signatures and the SPA fallback. Unproven.
- SP2. pg-boss jobs inside a Drizzle transaction, deadline precision and two machines. Unproven.
- SP3. 50 concurrent holds on one seat against Neon Frankfurt from Fly. Unproven.
- SP4. Stripe sandbox behaviour for cancel after success, TWINT and account capabilities. Unproven.
- SP5. Neon Object Storage signed uploads and public reads. Unproven.
- SP6. Neon Auth sessions on iOS Safari, the JWT field and the code limits. Unproven, and it decides D8 before E2 starts. On 20.10.2026 the E2.1 WebKit run refused Neon Auth's session cookie, and D8 moved to Better Auth inside the API.
- SP7. Fly release-command migrations and a rollback drill. Unproven.

## Appendix B. Alternatives rejected

- **Ten live lanes for every story in every sprint.** About 60 stories at that depth would be a plan nobody reads. Only Sprints 0 and 1 are planned per pull request. Later sprints get the same treatment at their own sprint planning.
- **Starting with the API.** Without the E0.8 regression net, the package split in E1 could change behaviour unseen.
- **Keeping the `.check/drv` drivers untracked.** They prove a lot but nothing runs them in CI, and they live in one working tree.
- **Moving the demo store behind `DataClient` in Sprint 1.** It belongs with the API skeleton in Sprint 2 (E1.11), when there is a second implementation to switch to.

## Appendix C. Risks

- **Flaky end-to-end tests** (E0.8). The owner watches three consecutive green runs before the suite gates other pull requests.
- **Hidden behaviour in moved rules** (E1.2, E1.3+E1.4, E1.5+E1.6). A label or date can drift when scattered logic becomes one function. The 100-route EN and DE diff and the flow parity lanes catch it.
- **Shared working tree.** A parallel session edits the operator's tree. Every owner works in its own worktree and never stashes, checks out shared files or runs `eslint --fix` there.
- **Hash routing today.** The prototype uses hash URLs. History routing arrives with the API in E2, not here, so these pull requests keep hash URLs.
- **SP6 fails.** If Neon Auth can't keep a Safari session, D8 moves to Better Auth inside the API, and Sprint 3 grows. This happened on 20.10.2026 (delivery plan section 7).

## Appendix D. Links and reading list

- Read `docs/architecture/backend.md` sections 4, 12 and 16 before editing.
- Read `docs/development-plan/delivery-plan.md` sections 1 and 2 for the Definition of Done and the harness.
- Read `docs/audit/2026-10-18-react-audit.md` before touching `front-end/` build config.
- E1.3+E1.4 and E1.5+E1.6 get `skills/architect/SKILL.md` on their types first. E1.2 gets `skills/how/SKILL.md` on the front-end's current rule files before the codemod is written.
- Each owner keeps a `decisions.tsv` trail per `skills/show-me-your-work/SKILL.md`, uncommitted, and returns it in its report.
