# Verify scripts

Two opt-in checks that drive a built copy of the app in a browser. They are too slow for every commit, so run them when you change rendering, routing, state or the build. Run them from `front-end/`.

Each script takes a build folder and picks the server from its layout:

| Folder | Build | Served with | URL form |
| :-- | :-- | :-- | :-- |
| contains `server/index.mjs` | Nitro output of the Start build (`front-end/.output`) | `node <dir>/server/index.mjs` with `PORT` set, on the first free port in 5420 to 5428. `server.close()` kills that process by its PID | `/store/orders` |
| contains `index.html` | Static `dist` of the E3.1 hash-history build (d52ce9e) | a small static server with an `index.html` fallback, same port range | `/index.html#/store/orders` |

So a comparison can take the E3.1 baseline and a Start build, or two builds of either kind. The app renders nothing on the server and on the first client render, so the scripts wait for the prototype bar (`aria-label="Prototype controls"`) before they read storage or text.

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

## Build the E3.1 baseline outside the repo

The baseline is the E3.1 commit `d52ce9e`. Do not use `git worktree`, `checkout` or `stash` for it. Export it into a scratch folder, install with the lockfile, and build a static `dist`:

```
mkdir -p /tmp/sk-base-src
git archive d52ce9e front-end api e2e spikes packages pnpm-lock.yaml pnpm-workspace.yaml package.json .pnpmfile.cjs .nvmrc | tar -x -C /tmp/sk-base-src
cd /tmp/sk-base-src && pnpm install --frozen-lockfile
cd front-end && pnpm exec vite build --outDir /tmp/sk-base-src/base-out
```

`/tmp/sk-base-src/base-out` has `index.html`, so it is served as a static hash-history build. The install needs the whole workspace (`api`, `e2e`, `spikes`, `.pnpmfile.cjs`), or the frozen lockfile check fails.

| Command | What it proves |
| :-- | :-- |
| `pnpm verify:routes /tmp/sk-base-src/base-out /tmp/sk-new /tmp/sk-out` | The visible text of 100 routes, in English and German with a frozen clock, is identical in both builds. It prints every route that differs |
| `pnpm verify:renders /tmp/sk-new` | Component renders, commits and CPU time at 4x throttle for seven scenarios. `PROFILE=S5` lists the top components for one scenario |
| `node ../docs/front-end-audit/measure-initial-load.mjs <dir>` | First-load JavaScript and CSS, gzipped. It reads `<dir>/index.html`, so it works on the static baseline as is. A Start build has no `index.html`: see below |

Set `PLAYWRIGHT_CHANNEL=chrome` to use the installed Google Chrome. Without it the scripts use Playwright's Chromium (`pnpm exec playwright install chromium`). Render counts are stable between runs. CPU times are not, so run the CPU comparison with nothing else running and compare medians of three.

`verify:renders` measures one build at a time. To compare, run it on the baseline and on the new build. On E3.2 the Start build showed 1 to 2 % more renders in S2, S4 and S5; that difference was not investigated.

Formatting-only changes cannot change compiled output. To prove a large reformat, build before and after and compare the CSS files byte for byte, as `docs/development-rules/frontend/linting.md` describes.
