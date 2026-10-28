// Counts component renders (React's PerformedWork flag, as DevTools does) and CPU time at 4x throttle for a few scenarios.
// usage: node scripts/verify/render-count.mjs <buildDir>     (PROFILE=S5 lists the top components for one scenario)
// GUEST_LANG=en measures a build whose guest routes sit under /en (E3.5); leave it unset for an older build.
// COMPARE_TZ=host leaves the browser in the host time zone instead of Europe/Zurich, as in compare-builds.mjs.
import process from 'node:process'
import { appUrl, goTo, guestPath, launchBrowser, serve, waitForBoot } from './browser.mjs'

const [dir] = process.argv.slice(2)
const served = await serve(dir)
const { server } = served
const browser = await launchBrowser()

async function scenario(name, role, start, act) {
  const context = await browser.newContext({ viewport: { width: 430, height: 932 }, ...(process.env.COMPARE_TZ === 'host' ? {} : { timezoneId: 'Europe/Zurich' }) })

  await context.addInitScript(() => {
    const stats = { commits: 0, renders: 0, by: {} }
    const COMPONENT_TAGS = new Set([0, 1, 11, 14, 15])

    window.__renderStats = stats
    window.__REACT_DEVTOOLS_GLOBAL_HOOK__ = {
      supportsFiber: true,
      renderers: new Map(),
      inject() { return 1 },
      checkDCE() {},
      onScheduleFiberRoot() {},
      onCommitFiberUnmount() {},
      onPostCommitFiberRoot() {},
      onCommitFiberRoot(_id, root) {
        stats.commits++
        const nameOf = (fiber) => {
          const t = fiber.type

          return t?.displayName || t?.name || t?.render?.name || t?.type?.name || t?.type?.render?.name || 'anon'
        }
        const count = (fiber) => {
          stats.renders++
          const name = nameOf(fiber)

          stats.by[name] = (stats.by[name] ?? 0) + 1
        }
        const mounted = (fiber) => {
          if (COMPONENT_TAGS.has(fiber.tag))
            count(fiber)
          for (let child = fiber.child; child; child = child.sibling) mounted(child)
        }
        // Like React DevTools: skip subtrees that bailed out (their fibers keep stale flags).
        const walk = (next, prev) => {
          if (next === prev)
            return
          if (COMPONENT_TAGS.has(next.tag) && (next.flags & 1) !== 0)
            count(next)
          if (next.child === prev.child)
            return
          for (let child = next.child; child; child = child.sibling) {
            if (child.alternate)
              walk(child, child.alternate)
            else mounted(child)
          }
        }

        if (root.current.alternate)
          walk(root.current, root.current.alternate)
        else mounted(root.current)
      },
    }
  })
  const page = await context.newPage()
  const errors = []

  page.on('pageerror', e => errors.push(String(e.message).slice(0, 120)))
  await page.goto(appUrl(served, '/'))
  await waitForBoot(page)
  await page.waitForTimeout(1200)
  await page.evaluate((role) => {
    const state = JSON.parse(localStorage.getItem('sk.demo'))

    state.role = role
    state.data.signedInGuestId = state.data.tours.bookings[0].guestId
    localStorage.setItem('sk.demo', JSON.stringify(state))
  }, role)
  await page.reload()
  await waitForBoot(page)
  await page.waitForTimeout(1000)
  await goTo(page, served, guestPath(start, process.env.GUEST_LANG))
  await page.waitForTimeout(1500)
  const cdp = await context.newCDPSession(page)

  await cdp.send('Performance.enable')
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 })
  const taskMs = async () => (await cdp.send('Performance.getMetrics')).metrics.find(m => m.name === 'TaskDuration').value * 1000

  await page.evaluate(() => { window.__renderStats.commits = 0; window.__renderStats.renders = 0; window.__renderStats.by = {} })
  const before = await taskMs()

  await act(page)
  const cpu = (await taskMs()) - before
  const stats = await page.evaluate(() => ({ ...window.__renderStats }))

  console.log(`${name.padEnd(34)} commits=${String(stats.commits).padStart(4)} renders=${String(stats.renders).padStart(6)} cpu4x=${cpu.toFixed(0).padStart(5)}ms errors=${errors.length}`)
  if (process.env.PROFILE === name.slice(0, 2))
    console.log('  top:', Object.entries(stats.by).sort((a, b) => b[1] - a[1]).slice(0, 22).map(([n, c]) => `${n}:${c}`).join(' '))
  await context.close()
}

try {
  await scenario('S1 idle 6s on /tours', 'guest', '/tours', p => p.waitForTimeout(6000))
  await scenario('S2 sales period taps', 'owner', '/store/sales', async (p) => {
    const chips = p.locator('[role=\'radio\'], [role=\'tab\']')
    const n = Math.min(await chips.count(), 6)

    for (let i = 0; i < n; i++) { await chips.nth(i).click({ force: true }).catch(() => {}); await p.waitForTimeout(250) }
  })
  await scenario('S3 save 3 favourites on /gifts', 'guest', '/gifts', async (p) => {
    const save = p.locator('button[aria-label^=\'Save \']')

    for (let i = 0; i < 3; i++) { await save.nth(i).click(); await p.waitForTimeout(300) }
  })
  await scenario('S4 type in /search (12 keys)', 'guest', '/search', async (p) => {
    const input = p.locator('input').first()

    await input.click()
    await input.pressSequentially('victorinox ch', { delay: 40 })
    await p.waitForTimeout(500)
  })
  await scenario('S5 store orders: switch tabs', 'owner', '/store/orders', async (p) => {
    const tabs = p.locator('[role=\'tab\']')
    const n = Math.min(await tabs.count(), 5)

    for (let i = 0; i < n; i++) { await tabs.nth(i).click({ force: true }).catch(() => {}); await p.waitForTimeout(250) }
  })
  await scenario('S6 scroll a story (24 steps)', 'guest', '/stories/musegg-morning', async (p) => {
    for (let i = 1; i <= 24; i++) { await p.evaluate(y => window.scrollBy(0, y), 160); await p.waitForTimeout(40) }
  })
  await scenario('S7 planner streams first answer', 'guest', '/plan', async (p) => {
    await p.getByText('Plan my day in Luzerne').first().click()
    await p.waitForTimeout(9000)
  })
}
finally {
  await browser.close()
  server.close()
}
