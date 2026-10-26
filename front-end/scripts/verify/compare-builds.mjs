import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
// Renders the same routes from two builds with a frozen clock and diffs the visible text.
// Each folder is a Nitro `.output` (the Start build), see README.md.
// usage: node scripts/verify/compare-builds.mjs <baseDir> <newDir> <outDir>
// The exit code is 1 when any text differs, any page error occurs or any final address differs.
// COMPARE_TZ=host leaves the browser in the host time zone instead of Europe/Zurich (to see zone-dependent text).
import process from 'node:process'
import { appUrl, goTo, launchBrowser, serve, waitForBoot } from './browser.mjs'

const [baseDir, newDir, outDir] = process.argv.slice(2)

// A rendered route shows at least the prototype bar plus a heading; less means the page did not render.
const MIN_TEXT = 40
const SECTION_END = /[/?]/
const FROZEN = new Date('2026-10-14T09:30:00+02:00')

const SETS = [
  {
    name: 'guest',
    role: 'guest',
    routes: ['/', '/gifts', '/gifts/:gift', '/tours', '/stories', '/stories/musegg-morning', '/search', '/cart', '/plan', '/credits', '/account', '/account/orders/:order'],
  },
  {
    name: 'owner',
    role: 'owner',
    routes: ['/store', '/store/orders', '/store/orders/:order', '/store/calendar', '/store/sales', '/store/reports', '/store/reports/sales', '/store/reports/costs', '/store/reports/guests', '/store/reports/margin', '/store/partners', '/store/partners/:partner', '/store/partners/analytics', '/store/products', '/store/products/gifts/:gift', '/store/products/tours', '/store/products/tours/:tour', '/store/content', '/store/content/analytics', '/store/content/reviews', '/store/requests', '/store/requests/analytics', '/store/requests/questions', '/store/products/gifts/:gift?step=pickup', '/store/products/gifts/:gift?step=bogus', '/store/products/tours/:tour?step=departures', '/store/products/tours/:tour?step=bogus', '/store/products?tab=tours', '/store/products?tab=nope', '/store/content?lang=de', '/store/content?lang=en'],
  },
]

async function capture(label, dir) {
  const served = await serve(dir)
  const { server } = served
  const result = {}
  const errors = {}
  const problems = []
  const where = {}
  let browser

  try {
    browser = await launchBrowser()

    for (const lang of ['en', 'de']) {
      for (const set of SETS) {
        const context = await browser.newContext({ viewport: { width: 430, height: 932 }, ...(process.env.COMPARE_TZ === 'host' ? {} : { timezoneId: 'Europe/Zurich' }) })

        await context.clock.setFixedTime(FROZEN)
        const page = await context.newPage()

        await page.goto(appUrl(served, '/'))
        await waitForBoot(page)
        await page.waitForTimeout(1200)
        const ids = await page.evaluate(
          ({ role, lang }) => {
            const state = JSON.parse(localStorage.getItem('sk.demo'))
            const d = state.data
            const guest = d.guests.find(g => d.orders.some(o => o.guestId === g.id)) ?? d.guests[0]
            const booking = d.tours.bookings.find(b => b.guestId === guest.id) ?? d.tours.bookings[0]

            state.role = role
            d.signedInGuestId = booking.guestId
            localStorage.setItem('sk.demo', JSON.stringify(state))
            localStorage.setItem('sk.language', JSON.stringify(lang))

            return {
              gift: d.products[0].slug ?? d.products[0].id,
              giftId: d.products[0].id,
              booking: booking.id,
              departure: d.tours.departures[0].id,
              tour: d.tours.tours[0].id,
              order: d.orders.find(o => o.guestId === booking.guestId)?.id ?? d.orders[0].id,
              partner: d.partners[0].id,
            }
          },
          { role: set.role, lang },
        )

        await page.reload()
        await waitForBoot(page)
        await page.waitForTimeout(1200)

        for (const route of set.routes) {
          const path = route.replace(':gift', route.includes('/store/') ? ids.giftId : ids.gift).replace(':booking', ids.booking).replace(':departure', ids.departure).replace(':tour', ids.tour).replace(':order', ids.order).replace(':partner', ids.partner)
          const key = `${lang}${set.name}${route.replaceAll('/', '_')}`
          const messages = []
          const onError = e => messages.push(String(e.message).slice(0, 160))

          page.on('pageerror', onError)
          await goTo(page, served, path)
          await page.waitForTimeout(900)
          // eslint-disable-next-line unicorn/prefer-dom-node-text-content -- innerText is the text a visitor can see; textContent would include hidden nodes
          result[key] = await page.evaluate(() => document.body.innerText)
          // A vacuous comparison (blank pages, or a navigation that never happened) would pass as "identical".
          const at = await page.evaluate(() => location.pathname + location.search)

          // The app may redirect (`?tab=tours` becomes `/store/products/tours`), so check the section, and compare the final address between builds below.
          if (at.split(SECTION_END)[1] !== path.split(SECTION_END)[1])
            problems.push(`${label} ${key}: the page is at ${at}, expected ${path}`)
          where[key] = at
          if (result[key].trim().length < MIN_TEXT)
            problems.push(`${label} ${key}: only ${result[key].trim().length} characters of text`)
          errors[key] = messages
          page.off('pageerror', onError)
        }
        await context.close()
      }
    }
  }
  finally {
    await browser?.close()
    server.close()
  }

  mkdirSync(join(outDir, label), { recursive: true })
  writeFileSync(join(outDir, label, 'text.json'), JSON.stringify(result, null, 1))
  writeFileSync(join(outDir, label, 'errors.json'), JSON.stringify(errors, null, 1))

  if (problems.length)
    throw new Error(`${problems.length} routes did not load as requested in ${label}:\n${problems.join('\n')}`)

  return { result, errors, where }
}

mkdirSync(outDir, { recursive: true })
const a = await capture('base', baseDir)
const b = await capture('new', newDir)
let same = 0
const diffs = []

const addressDiffs = []

for (const key of Object.keys(a.result)) {
  if (a.where[key] !== b.where[key]) {
    addressDiffs.push(key)
    console.log(`ADDRESS ${key}: base ${a.where[key]}, new ${b.where[key]}`)
  }
  if (a.result[key] === b.result[key])
    same++
  else diffs.push(key)
}
const errA = Object.values(a.errors).flat().length
const errB = Object.values(b.errors).flat().length

console.log(`routes compared: ${Object.keys(a.result).length}, identical text: ${same}, different: ${diffs.length}`)
console.log(`page errors base: ${errA}, new: ${errB}`)
for (const key of diffs) {
  const x = a.result[key].split('\n')
  const y = b.result[key].split('\n')
  const changed = []

  for (let i = 0; i < Math.max(x.length, y.length); i++) {
    if (x[i] !== y[i])
      changed.push(`  - ${x[i] ?? ''}\n  + ${y[i] ?? ''}`)
  }
  console.log(`DIFF ${key} (${changed.length} lines)\n${changed.slice(0, 6).join('\n')}`)
}

if (addressDiffs.length) {
  console.error(`${addressDiffs.length} routes ended at a different address in the two builds`)
  process.exitCode = 1
}

if (diffs.length || errA + errB) {
  console.error(`${diffs.length} routes differ in text, ${errA + errB} page errors`)
  process.exitCode = 1
}
