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

/** Serves a built folder on a free port. Unknown paths get index.html, like the static host. */
export function serve(dir) {
  const server = http.createServer((req, res) => {
    let file = join(dir, decodeURIComponent(req.url.split('?')[0]))

    if (!existsSync(file) || file === `${dir}/`)
      file = join(dir, 'index.html')
    res.setHeader('content-type', TYPES[extname(file)] ?? 'application/octet-stream')
    res.end(readFileSync(file))
  })

  return new Promise((resolve) => {
    server.listen(0, () => resolve({ server, port: server.address().port }))
  })
}

/** PLAYWRIGHT_CHANNEL=chrome uses the installed Google Chrome. Unset uses Playwright's Chromium. */
export function launchBrowser() {
  return chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL, args: ['--no-sandbox'] })
}

/**
 * These scripts serve a build with no API, so the session read answers here: a signed-in user, as the app
 * would see after a real sign-in. The app then signs in the demo guest, the same for every user.
 */
export function answerSession(context) {
  const now = new Date().toISOString()

  return context.route('**/api/auth/get-session', route => route.fulfill({
    json: {
      session: { id: 's1', userId: 'u1', token: 't', expiresAt: new Date(Date.now() + 86_400_000).toISOString(), createdAt: now, updatedAt: now },
      user: { id: 'u1', name: 'Guest', email: 'guest@example.ch', emailVerified: true, createdAt: now, updatedAt: now },
    },
  }))
}
