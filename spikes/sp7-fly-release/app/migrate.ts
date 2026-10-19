import { fileURLToPath } from 'node:url'
import { drizzle } from 'drizzle-orm/node-postgres'
import { migrate } from 'drizzle-orm/node-postgres/migrator'
import pg from 'pg'

const url = process.env.DATABASE_URL_DDL
if (!url) throw new Error('DATABASE_URL_DDL is not set')

const pool = new pg.Pool({ connectionString: url, max: 1 })
const folder = fileURLToPath(new URL('./drizzle', import.meta.url))
await migrate(drizzle(pool), { migrationsFolder: folder })
await pool.end()
console.log('migrations applied')
