# Verify scripts

Two opt-in checks that drive a built copy of the app in a browser. They are too slow for every commit, so run them when you change rendering, routing, state or the build. Run them from `front-end/`.

Each script takes the Nitro output folder of a Start build (`front-end/.output` or a copy of it, with `server/index.mjs` inside). `serve()` runs `node <dir>/server/index.mjs` with `PORT` set, on the first free port in 5420 to 5425, and `server.close()` kills that process by its PID. A folder without `server/index.mjs` is an error.

The baseline of a comparison is a Nitro build of the E3.2 head `b22a283`, copied to a scratch folder (see below). Home and the public routes render on the server, and the other routes render on the client. The scripts wait for the prototype bar (`aria-label="Prototype controls"`) before they read storage or text. The bar is in the root layout, so `waitForBoot` works for both kinds of route.

Both scripts open the browser context in the time zone `Europe/Zurich`, the zone the app treats as the shop's. Server-rendered routes need one zone, so the article comment dates print the Zurich calendar day. Without it, a build compared on a host in another zone shows a different day (`/stories/musegg-morning` showed 06.10.2026 against 07.10.2026 on a +07 host).

## Build a Start output into a scratch folder

Nitro writes to `front-end/.output` and ignores `vite build --outDir`. Build, then copy the folder (it is self-contained, with no `node_modules`):

```
pnpm exec vite build
rm -rf /tmp/sk-new && cp -r .output /tmp/sk-new
```

Copy it again after every build, because the next build replaces `.output` (the `rm -rf` stops a second copy from nesting inside the first). `PORT=5421 node /tmp/sk-new/server/index.mjs` serves it. The production server has no `/api` forwarding (hosting owns it), so the demo checks need no API.

## Measure the first load of a Start build

The measuring script needs an `index.html` and the assets beside it. Save the HTML that the server sends for `/` and copy the assets next to it:

```
mkdir -p /tmp/sk-meas && PORT=5421 node /tmp/sk-new/server/index.mjs &
sleep 2 && curl -s localhost:5421/ -o /tmp/sk-meas/index.html; kill %1
cp -r /tmp/sk-new/public/assets /tmp/sk-meas/assets
node ../docs/front-end-audit/measure-initial-load.mjs /tmp/sk-meas
```

## Build the baseline outside the repo

The baseline is the E3.2 head `b22a283`. Do not use `git worktree`, `checkout` or `stash` for it. Export it into a scratch folder, install with the lockfile, build, and copy the Nitro output:

```
mkdir -p /tmp/sk-e33-base-src
git archive b22a283 | tar -x -C /tmp/sk-e33-base-src
cd /tmp/sk-e33-base-src && pnpm install --frozen-lockfile
cd front-end && pnpm exec vite build
rm -rf /tmp/sk-e33-e32 && cp -r .output /tmp/sk-e33-e32
```

The install needs the whole workspace (`api`, `e2e`, `spikes`, `.pnpmfile.cjs`), or the frozen lockfile check fails. The `/tmp/sk-e33-*` names are examples. Use scratch names that no other session uses.

| Command | What it proves |
| :-- | :-- |
| `pnpm verify:routes /tmp/sk-e33-e32 /tmp/sk-new /tmp/sk-out` | The visible text of 86 routes, in English and German with a frozen clock and the Zurich time zone, is identical in both builds, and each route ends at the same address in both (a difference fails the run). It prints every route that differs. The routes that only render NotFound (retired booking routes) are not in the list |
| `pnpm verify:renders /tmp/sk-new` | Component renders, commits and CPU time at 4x throttle for seven scenarios. `PROFILE=S5` lists the top components for one scenario |
| `node ../docs/front-end-audit/measure-initial-load.mjs <dir>` | First-load JavaScript and CSS, gzipped. It reads `<dir>/index.html`. A Start build has no `index.html`: see above |

Set `PLAYWRIGHT_CHANNEL=chrome` to use the installed Google Chrome. Without it the scripts use Playwright's Chromium (`pnpm exec playwright install chromium`). Render counts are stable between runs. CPU times are not, so run the CPU comparison with nothing else running and compare medians of three.

`verify:renders` measures one build at a time. To compare, run it on the baseline and on the new build. The E3.2 Start build rendered 1 to 2 % more than the E3.1 static build in S2, S4 and S5; that difference was not investigated.

Formatting-only changes cannot change compiled output. To prove a large reformat, build before and after and compare the CSS files byte for byte, as `docs/development-rules/frontend/linting.md` describes.
