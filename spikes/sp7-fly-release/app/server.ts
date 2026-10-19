import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import pg from 'pg'

const appVersion = process.env.APP_VERSION ?? 'unknown'
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 3 })
const app = new Hono()

app.get('/healthz', (c) => c.json({ ok: true }))

app.get('/version', async (c) => {
  const migrations = await pool.query('select count(*)::int as n from drizzle.__drizzle_migrations')
  return c.json({ appVersion, appliedMigrations: (migrations.rows[0] as { n: number }).n })
})

serve({ fetch: app.fetch, port: Number(process.env.PORT ?? 8080), hostname: '0.0.0.0' })
