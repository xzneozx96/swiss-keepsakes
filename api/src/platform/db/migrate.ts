import type { Logger } from 'pino'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { drizzle } from 'drizzle-orm/node-postgres'
import { migrate } from 'drizzle-orm/node-postgres/migrator'
import { Pool } from 'pg'
import { PgBoss } from 'pg-boss'
import { loadConfig } from '../config.ts'
import { createLogger } from '../logger.ts'

// The same depth from src/ and from dist/.
const migrationsFolder = fileURLToPath(new URL('../../../migrations', import.meta.url))

// The release command (architecture section 11): our forward-only SQL migrations, then pg-boss's own
// schema. Running services start pg-boss with `migrate: false`, because the runtime role runs no DDL (section 5).
export async function migrateDatabase(directUrl: string, logger: Logger): Promise<void> {
  const pool = new Pool({ connectionString: directUrl, max: 1 })
  try {
    await migrate(drizzle({ client: pool }), { migrationsFolder })
  }
  finally {
    await pool.end()
  }
  const boss = new PgBoss({ connectionString: directUrl, max: 1, migrate: true, supervise: false, schedule: false, registerInstance: false })
  boss.on('error', error => logger.error({ err: error }, 'pg-boss error'))
  await boss.start()
  await boss.stop()
  logger.info('migrations applied')
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const loaded = loadConfig(process.env)
  if (!loaded.ok) {
    process.stderr.write(`${loaded.message}\n`)
    process.exit(1)
  }
  const logger = createLogger(loaded.config.LOG_LEVEL)
  migrateDatabase(loaded.config.DATABASE_URL_UNPOOLED, logger).catch((error: unknown) => {
    logger.fatal({ err: error }, 'migration failed')
    process.exitCode = 1
  })
}
