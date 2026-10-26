import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import http from 'node:http'
import { join } from 'node:path'
import process from 'node:process'
import { chromium } from '@playwright/test'

// Other agents and the root e2e suite use 5426 to 5429, so the verify scripts stay in 5420 to 5425.
const PORTS = Array.from({ length: 6 }, (_, i) => 5420 + i)

/** The first free port in 5420 to 5425. */
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

/** The address of an app path in a served build. */
export function appUrl(served, path) {
  return `http://localhost:${served.port}${path}`
}

/** Moves a page to an app path without a reload. */
export function goTo(page, served, path) {
  return page.evaluate((p) => { window.history.pushState({}, '', p); window.dispatchEvent(new PopStateEvent('popstate')) }, path)
}

/**
 * Serves a Nitro output folder (`<dir>/server/index.mjs`, the Start build) on a free port from 5420 to 5425
 * and resolves `{ server, port }`. Runs `node <dir>/server/index.mjs` with PORT set.
 * `server.close()` kills that child by its PID.
 */
export async function serve(dir) {
  if (!existsSync(join(dir, 'server', 'index.mjs')))
    throw new Error(`${dir} is not a Nitro output: server/index.mjs is missing`)

  const port = await freePort()
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
  // A killed script (Ctrl-C, SIGTERM) skips 'exit' handlers unless a signal handler ends the process.
  for (const signal of ['SIGINT', 'SIGTERM'])
    process.once(signal, () => { server.close(); process.exit(1) })

  try {
    await waitUntilUp(port, child)
  }
  catch (error) {
    server.close()
    throw error
  }

  return { server, port }
}

/**
 * Waits for the prototype bar, which sits in the root layout, so a server-rendered route has it in the first HTML and a
 * client-only route gets it on the first client render. Wait for it before reading text or storage.
 */
export function waitForBoot(page) {
  return page.locator('[aria-label="Prototype controls"]').first().waitFor({ state: 'attached', timeout: 15_000 })
}

/** PLAYWRIGHT_CHANNEL=chrome uses the installed Google Chrome. Unset uses Playwright's Chromium. */
export function launchBrowser() {
  return chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL, args: ['--no-sandbox'] })
}
