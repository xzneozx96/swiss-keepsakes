# Verify scripts

Two opt-in checks that drive a built copy of the app in a browser. They are too slow for every commit, so run them when you change rendering, routing, state or the build. Run them from `front-end/`.

Build into a scratch folder first, once for the baseline (before your change) and once after:

```
pnpm exec vite build --outDir /tmp/sk-base --emptyOutDir
# make your change
pnpm exec vite build --outDir /tmp/sk-new --emptyOutDir
```

| Command | What it proves |
| :-- | :-- |
| `pnpm verify:routes /tmp/sk-base /tmp/sk-new /tmp/sk-out` | The visible text of 100 routes, in English and German with a frozen clock, is identical in both builds. It prints every route that differs |
| `pnpm verify:renders /tmp/sk-new` | Component renders, commits and CPU time at 4x throttle for seven scenarios. `PROFILE=S5` lists the top components for one scenario |
| `node ../docs/front-end-audit/measure-initial-load.mjs /tmp/sk-new` | First-load JavaScript and CSS, gzipped |

Both scripts serve the build with no API and answer `/api/auth/get-session` themselves (`browser.mjs`), so the app sees a signed-in user, as it does after a real sign-in. Compare a baseline build made from the same version of this rule, not one from before 23.10.2026, which signed in through `localStorage`.

Set `PLAYWRIGHT_CHANNEL=chrome` to use the installed Google Chrome. Without it the scripts use Playwright's Chromium (`pnpm exec playwright install chromium`). Render counts are stable between runs. CPU times are not, so run the CPU comparison with nothing else running and compare medians of three.

Formatting-only changes cannot change compiled output. To prove a large reformat, build before and after and compare the CSS files byte for byte, as `docs/development-rules/frontend/linting.md` describes.
