import { randomUUID } from 'node:crypto'
import { relative } from 'node:path'
import { serveStatic } from '@hono/node-server/serve-static'
import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi'
import type Stripe from 'stripe'

export type HoldStatus = 'pending_payment' | 'confirmed'

export interface Hold {
  id: string
  seatId: string
  status: HoldStatus
  expiresAt: string
}

export interface AppOptions {
  stripe: Stripe
  webhookSecret: string
  spaDir: string
}

const HoldBody = z.object({ seatId: z.string().min(1), guestId: z.string().min(1) })
const HoldResponse = z.object({
  id: z.string(),
  seatId: z.string(),
  status: z.enum(['pending_payment', 'confirmed']),
  expiresAt: z.string(),
})
const ProblemResponse = z.object({ type: z.string(), title: z.string(), status: z.number() })

const holdRoute = createRoute({
  method: 'post',
  path: '/api/holds',
  request: { body: { content: { 'application/json': { schema: HoldBody } }, required: true } },
  responses: {
    201: { content: { 'application/json': { schema: HoldResponse } }, description: 'Hold created' },
    409: { content: { 'application/problem+json': { schema: ProblemResponse } }, description: 'Seat already held' },
  },
})

const getHoldRoute = createRoute({
  method: 'get',
  path: '/api/holds/{id}',
  request: { params: z.object({ id: z.string() }) },
  responses: {
    200: { content: { 'application/json': { schema: HoldResponse } }, description: 'Hold' },
    404: { content: { 'application/problem+json': { schema: ProblemResponse } }, description: 'Unknown hold' },
  },
})

export function buildApp(options: AppOptions) {
  const holds = new Map<string, Hold>()
  const seatToHold = new Map<string, string>()
  const seenEvents = new Set<string>()
  const events: { id: string; type: string }[] = []

  const app = new OpenAPIHono()

  app.openapi(holdRoute, (c) => {
    const body = c.req.valid('json')
    if (seatToHold.has(body.seatId)) {
      return c.json({ type: 'about:blank', title: 'Seat already held', status: 409 }, 409, {
        'content-type': 'application/problem+json',
      })
    }
    const hold: Hold = {
      id: randomUUID(),
      seatId: body.seatId,
      status: 'pending_payment',
      expiresAt: new Date(Date.now() + 15 * 60_000).toISOString(),
    }
    holds.set(hold.id, hold)
    seatToHold.set(hold.seatId, hold.id)
    return c.json(hold, 201)
  })

  app.openapi(getHoldRoute, (c) => {
    const hold = holds.get(c.req.valid('param').id)
    if (!hold) return c.json({ type: 'about:blank', title: 'Unknown hold', status: 404 }, 404)
    return c.json(hold, 200)
  })

  app.doc('/api/openapi.json', { openapi: '3.1.0', info: { title: 'SP1 spike', version: '0.0.0' } })

  app.post('/webhooks/stripe', async (c) => {
    const signature = c.req.header('stripe-signature')
    if (!signature) return c.json({ error: 'missing signature' }, 400)
    const rawBody = await c.req.text()
    let event: Stripe.Event
    try {
      event = options.stripe.webhooks.constructEvent(rawBody, signature, options.webhookSecret)
    } catch {
      return c.json({ error: 'invalid signature' }, 400)
    }
    if (seenEvents.has(event.id)) return c.json({ received: true, duplicate: true })
    seenEvents.add(event.id)
    events.push({ id: event.id, type: event.type })
    if (event.type === 'payment_intent.succeeded') {
      const holdId = (event.data.object as Stripe.PaymentIntent).metadata?.hold_id
      const hold = holdId ? holds.get(holdId) : undefined
      if (hold) hold.status = 'confirmed'
    }
    return c.json({ received: true })
  })

  const root = relative(process.cwd(), options.spaDir) || '.'
  app.get('*', serveStatic({ root }))
  app.get('*', async (c, next) => {
    const path = c.req.path
    const looksLikeFile = /\.[a-z0-9]+$/i.test(path)
    if (path.startsWith('/api/') || path.startsWith('/webhooks/') || looksLikeFile) return c.notFound()
    return serveStatic({ path: `${root}/index.html` })(c, next)
  })

  app.notFound((c) => c.json({ type: 'about:blank', title: 'Not found', status: 404 }, 404))

  return { app, holds, events }
}
