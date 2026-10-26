import { spawn } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import http from 'node:http'
import { extname, join } from 'node:path'
import process from 'node:process'
import { chromium } from '@playwright/test'

const TYPES = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.mp3': 'audio/mpeg',
}

// 5429 is the default port of the root e2e suite, so the verify scripts leave it alone.
const PORTS = Array.from({ length: 9 }, (_, i) => 5420 + i)

/** The first free port in 5420 to 5428. */
async function freePort() {
  for (const port of PORTS) {
    const free = await new Promise((resolve) => {
      const probe = http.createServer()

      probe.once('error', () => resolve(false))
      probe.listen(port, () => probe.close(() => resolve(true)))
    })

    if (free)
      return port
  }
  throw new Error(`No free port in ${PORTS[0]} to ${PORTS.at(-1)}`)
}

function waitUntilUp(port, child) {
  return new Promise((resolve, reject) => {
    const started = Date.now()
    const poll = () => {
      if (child.exitCode !== null)
        return reject(new Error(`The server exited with code ${child.exitCode}`))
      const req = http.get({ port, path: '/', host: '127.0.0.1' }, (res) => {
        res.resume()
        // Something answered. If that was another process on the port (EADDRINUSE), our child exits a moment later.
        setTimeout(() => (child.exitCode === null && child.signalCode === null ? resolve() : reject(new Error(`The server exited (code ${child.exitCode}); port ${port} may be taken`))), 400)
      })

      req.on('error', () => {
        if (Date.now() - started > 15_000)
          reject(new Error(`Nothing answered on port ${port}`))
        else setTimeout(poll, 100)
      })
    }

    poll()
  })
}

/** True for a Nitro output folder (`server/index.mjs` beside `public/`), false for a static vite `dist`. */
export function isNitroOutput(dir) {
  return existsSync(join(dir, 'server', 'index.mjs'))
}

/**
 * The address of an app path in a served build. The E3.1 baseline uses hash history (`/index.html#/store`),
 * the Start build uses browser history (`/store`).
 */
export function appUrl(served, path) {
  return served.mode === 'nitro' ? `http://localhost:${served.port}${path}` : `http://localhost:${served.port}/index.html#${path}`
}

/** Moves a page to an app path without a reload, in the history form of the served build. */
export function goTo(page, served, path) {
  return served.mode === 'nitro'
    ? page.evaluate((p) => { window.history.pushState({}, '', p); window.dispatchEvent(new PopStateEvent('popstate')) }, path)
    : page.evaluate((p) => { location.hash = p }, path)
}

/**
 * Serves a built folder on a free port from 5420 to 5428 and resolves `{ server, port, mode }`.
 * The folder layout picks the mode:
 * - Nitro output (`<dir>/server/index.mjs`, the Start build): runs `node <dir>/server/index.mjs` with PORT set.
 *   `server.close()` kills that child by its PID.
 * - Static folder (a vite `dist`, the E3.1 baseline): a small server where unknown paths get index.html, like the static host.
 */
export async function serve(dir) {
  const port = await freePort()

  if (isNitroOutput(dir)) {
    const child = spawn(process.execPath, [join(dir, 'server', 'index.mjs')], {
      env: { ...process.env, PORT: String(port), NITRO_PORT: String(port), HOST: '127.0.0.1' },
      stdio: 'ignore',
    })
    const server = {
      pid: child.pid,
      // SIGKILL at once: the demo server holds no state, and a graceful stop waits up to 5 s for open connections.
      close() {
        if (child.exitCode === null && child.signalCode === null)
          child.kill('SIGKILL')
      },
    }

    // Backstop: a script that throws before it calls close() must not leave the server behind.
    process.once('exit', () => server.close())

    try {
      await waitUntilUp(port, child)
    }
    catch (error) {
      server.close()
      throw error
    }

    return { server, port, mode: 'nitro' }
  }

  if (!existsSync(join(dir, 'index.html')))
    throw new Error(`${dir} is neither a Nitro output (server/index.mjs) nor a static build (index.html)`)

  const server = http.createServer((req, res) => {
    let file = join(dir, decodeURIComponent(req.url.split('?')[0]))

    if (!existsSync(file) || file === `${dir}/`)
      file = join(dir, 'index.html')
    res.setHeader('content-type', TYPES[extname(file)] ?? 'application/octet-stream')
    res.end(readFileSync(file))
  })

  await new Promise(resolve => server.listen(port, resolve))

  return { server, port, mode: 'static' }
}

/**
 * The app renders nothing on the server and on the first client render, so wait for the prototype bar (client-only today, because every route except the root and the test routes is client-only; E3.3 must change this wait when it sets ssr:true)
 * before reading text or storage.
 */
export function waitForBoot(page) {
  return page.locator('[aria-label="Prototype controls"]').first().waitFor({ state: 'attached', timeout: 15_000 })
}

/** PLAYWRIGHT_CHANNEL=chrome uses the installed Google Chrome. Unset uses Playwright's Chromium. */
export function launchBrowser() {
  return chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL, args: ['--no-sandbox'] })
}
