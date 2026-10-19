import type { TestProject } from 'vitest/node'
import { randomBytes } from 'node:crypto'
import process from 'node:process'
import { Client } from 'pg'
import { migrateDatabase } from '../../src/platform/db/migrate.ts'
import { createLogger } from '../../src/platform/logger.ts'
import { refusedDatabaseTarget } from '../support/database-target.ts'

declare module 'vitest' {
  export interface ProvidedContext {
    databaseUrl: string
    databaseUrlUnpooled: string
  }
}

function withDatabase(url: string, database: string): string {
  const parsed = new URL(url)
  parsed.pathname = `/${database}`
  return parsed.toString()
}

async function admin(url: string, statement: string) {
  const client = new Client({ connectionString: url })
  await client.connect()
  try {
    await client.query(statement)
  }
  finally {
    await client.end()
  }
}

// Each run gets its own database, created here, migrated like a release, and dropped at the end.
export default async function setup(project: TestProject) {
  const { DATABASE_URL, DATABASE_URL_UNPOOLED } = process.env
  const refused = refusedDatabaseTarget({ DATABASE_URL, DATABASE_URL_UNPOOLED }, process.env)
  if (refused || !DATABASE_URL || !DATABASE_URL_UNPOOLED)
    throw new Error(`Integration tests not started: ${refused}`)

  const database = `sk_test_${randomBytes(6).toString('hex')}`
  await admin(DATABASE_URL_UNPOOLED, `create database ${database}`)
  const databaseUrlUnpooled = withDatabase(DATABASE_URL_UNPOOLED, database)
  await migrateDatabase(databaseUrlUnpooled, createLogger('warn'))
  project.provide('databaseUrl', withDatabase(DATABASE_URL, database))
  project.provide('databaseUrlUnpooled', databaseUrlUnpooled)

  return async () => {
    await admin(DATABASE_URL_UNPOOLED, `drop database ${database} with (force)`)
  }
}
