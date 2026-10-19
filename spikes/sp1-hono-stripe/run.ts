import { execFileSync, spawn } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import type { AddressInfo } from 'node:net'
import { fileURLToPath } from 'node:url'
import { serve } from '@hono/node-server'
import Stripe from 'stripe'
import { finish, secret, tryEnv } from '../lib/env.ts'
import { buildApp } from './app.ts'

const SPIKE = 'SP1'
const spaDir = fileURLToPath(new URL('./spa', import.meta.url))
const checks: { name: string; ok: boolean; note?: string }[] = []
const check = (name: string, ok: boolean, note?: string) => {
  checks.push({ name, ok, note })
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${note ? ` (${note})` : ''}`)
}

function listen(fetchHandler: (req: Request) => Response | Promise<Response>, port = 0) {
  return new Promise<{ base: string; close: () => Promise<void> }>((resolve) => {
    const server = serve({ fetch: fetchHandler, port, hostname: '127.0.0.1' }, (info: AddressInfo) =>
      resolve({
        base: `http://127.0.0.1:${info.port}`,
        close: () => new Promise<void>((done) => server.close(() => done())),
      }),
    )
  })
}

async function localStage(): Promise<boolean> {
  const localSecret = `whsec_${randomBytes(24).toString('hex')}`
  const stripe = new Stripe(`rk_test_${randomBytes(24).toString('hex')}`)
  const { app, holds, events } = buildApp({ stripe, webhookSecret: localSecret, spaDir })
  const server = await listen(app.fetch)
  try {
    const hold = await fetch(`${server.base}/api/holds`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ seatId: 'seat-1', guestId: 'guest-1' }),
    })
    const holdBody = (await hold.json()) as { id: string; status: string }
    check('hold endpoint creates a pending_payment hold', hold.status === 201 && holdBody.status === 'pending_payment')

    const again = await fetch(`${server.base}/api/holds`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ seatId: 'seat-1', guestId: 'guest-2' }),
    })
    check('second hold for the same seat gets 409', again.status === 409)

    const invalid = await fetch(`${server.base}/api/holds`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ seatId: '' }),
    })
    check('zod-openapi rejects an invalid body with 400', invalid.status === 400)

    const spec = (await (await fetch(`${server.base}/api/openapi.json`)).json()) as { paths?: Record<string, unknown> }
    check('OpenAPI document lists /api/holds', Boolean(spec.paths && '/api/holds' in spec.paths))

    const payload = JSON.stringify({
      id: 'evt_local_1',
      object: 'event',
      type: 'payment_intent.succeeded',
      data: { object: { id: 'pi_local_1', object: 'payment_intent', metadata: { hold_id: holdBody.id } } },
    })
    const header = stripe.webhooks.generateTestHeaderString({ payload, secret: localSecret })
    const post = (body: string, sig: string) =>
      fetch(`${server.base}/webhooks/stripe`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'stripe-signature': sig },
        body,
      })

    const valid = await post(payload, header)
    check('webhook with a valid signature on the raw body is accepted (200)', valid.status === 200)
    check('valid webhook confirmed the hold', holds.get(holdBody.id)?.status === 'confirmed')

    const tampered = await post(payload.replace('pi_local_1', 'pi_local_2'), header)
    check('webhook with a tampered body is rejected (400)', tampered.status === 400)

    const reserialized = await post(JSON.stringify(JSON.parse(payload), null, 2), header)
    check('webhook with a re-serialised body is rejected (400), so only raw bytes verify', reserialized.status === 400)

    const wrongSecret = await post(payload, stripe.webhooks.generateTestHeaderString({ payload, secret: `whsec_${randomBytes(24).toString('hex')}` }))
    check('webhook signed with another secret is rejected (400)', wrongSecret.status === 400)

    const stale = await post(
      payload,
      stripe.webhooks.generateTestHeaderString({ payload, secret: localSecret, timestamp: Math.floor(Date.now() / 1000) - 3600 }),
    )
    check('webhook with a 1 hour old timestamp is rejected (400)', stale.status === 400)

    const noHeader = await fetch(`${server.base}/webhooks/stripe`, { method: 'POST', body: payload })
    check('webhook without a signature header is rejected (400)', noHeader.status === 400)

    const replay = await post(payload, header)
    check('replayed event id is acknowledged but not processed twice', replay.status === 200 && events.length === 1)

    const index = await fetch(`${server.base}/`)
    check('SPA index served at /', index.status === 200 && (await index.text()).includes('sp1-spa-index'))
    const deep = await fetch(`${server.base}/stores/lucerne/booking/42`)
    check('SPA deep link falls back to index.html', deep.status === 200 && (await deep.text()).includes('sp1-spa-index'))
    const asset = await fetch(`${server.base}/assets/app.js`)
    check('static asset is served as itself', asset.status === 200 && (await asset.text()).includes('dataset.ready'))
    const missingAsset = await fetch(`${server.base}/assets/missing.js`)
    check('missing asset is 404, not index.html', missingAsset.status === 404)
    const unknownApi = await fetch(`${server.base}/api/nope`)
    check('unknown /api path is 404 JSON, not index.html', unknownApi.status === 404 && (await unknownApi.json() as { status: number }).status === 404)
  } finally {
    await server.close()
  }
  return checks.every((c) => c.ok)
}

function cliAvailable(): boolean {
  try {
    execFileSync('stripe', ['version'], { stdio: 'ignore', timeout: 20000 })
    return true
  } catch {
    return false
  }
}

function printSecret(apiKey: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn('stripe', ['listen', '--print-secret'], { env: { ...process.env, STRIPE_API_KEY: apiKey } })
    let out = ''
    child.stdout.on('data', (d: Buffer) => (out += d.toString()))
    child.on('close', () => {
      const match = out.match(/whsec_\w+/)
      if (match) resolve(match[0])
      else reject(new Error('stripe listen --print-secret returned no whsec'))
    })
    setTimeout(() => child.kill(), 30000).unref()
  })
}

async function cliStage(env: { STRIPE_SECRET_KEY: string }): Promise<boolean> {
  console.log('--- Stripe CLI round trip (sandbox) ---')
  const stripe = new Stripe(env.STRIPE_SECRET_KEY)
  const webhookSecret = await printSecret(env.STRIPE_SECRET_KEY)
  const { app, holds } = buildApp({ stripe, webhookSecret, spaDir })
  const server = await listen(app.fetch)
  const forward = spawn('stripe', ['listen', '--forward-to', `${server.base}/webhooks/stripe`, '--events', 'payment_intent.succeeded'], {
    env: { ...process.env, STRIPE_API_KEY: env.STRIPE_SECRET_KEY },
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  try {
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('stripe listen not ready in 30 s')), 30000)
      const onData = (d: Buffer) => {
        if (d.toString().includes('Ready!')) {
          clearTimeout(timer)
          resolve()
        }
      }
      forward.stdout.on('data', onData)
      forward.stderr.on('data', onData)
    })
    const holdRes = await fetch(`${server.base}/api/holds`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ seatId: 'cli-seat-1', guestId: 'guest-cli' }),
    })
    const hold = (await holdRes.json()) as { id: string }
    const pi = await stripe.paymentIntents.create({
      amount: 1000,
      currency: 'chf',
      payment_method: 'pm_card_visa',
      confirm: true,
      automatic_payment_methods: { enabled: true, allow_redirects: 'never' },
      metadata: { hold_id: hold.id },
    })
    check('PaymentIntent for the hold succeeded in the sandbox', pi.status === 'succeeded', pi.status)
    const deadline = Date.now() + 30000
    while (Date.now() < deadline && holds.get(hold.id)?.status !== 'confirmed') {
      await new Promise((r) => setTimeout(r, 250))
    }
    check('webhook forwarded by the Stripe CLI confirmed the hold', holds.get(hold.id)?.status === 'confirmed')
  } finally {
    forward.kill()
    await server.close()
  }
  return checks.every((c) => c.ok)
}

const localPass = await localStage()
console.log(`LOCAL SP1: ${localPass ? 'PASS' : 'FAIL'}`)

const stripeEnv = tryEnv(SPIKE, { STRIPE_SECRET_KEY: secret('rk_test_') })
const missing: string[] = []
if (!stripeEnv) missing.push('STRIPE_SECRET_KEY')
else if (!cliAvailable()) {
  console.log('SKIP SP1: missing stripe CLI')
  missing.push('stripe CLI')
}

if (stripeEnv && missing.length === 0) {
  let remotePass = false
  try {
    remotePass = await cliStage(stripeEnv)
  } catch (error) {
    console.log(`FAIL SP1 stripe-cli: ${error instanceof Error ? error.message : 'unknown error'}`)
  }
  finish({ spike: SPIKE, ran: true, scope: 'local+remote', pass: localPass && remotePass, missing: [] })
}

finish({ spike: SPIKE, ran: true, scope: 'local', pass: localPass, missing, detail: 'local checks only' })
