import { randomBytes, randomUUID } from 'node:crypto'
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { descriptionFromPlain } from '@sk/domain/content'
import { drizzle } from 'drizzle-orm/node-postgres'
import { migrate } from 'drizzle-orm/node-postgres/migrator'
import { Client, Pool } from 'pg'
import { afterAll, describe, expect, inject, it, vi } from 'vitest'
import { migrationsFolder } from '../../scripts/check-branch-migrations.ts'

vi.setConfig({ testTimeout: 120_000, hookTimeout: 180_000 })

interface Journal { entries: { idx: number, tag: string }[] }

const scratchDatabases: string[] = []
const pools: Pool[] = []
const folders: string[] = []

function withDatabase(url: string, database: string): string {
  const parsed = new URL(url)
  parsed.pathname = `/${database}`
  return parsed.toString()
}

async function admin(statement: string) {
  const client = new Client({ connectionString: inject('databaseUrlUnpooled') })
  await client.connect()
  try {
    await client.query(statement)
  }
  finally {
    await client.end()
  }
}

function folderUpTo(last: number): string {
  const folder = mkdtempSync(join(tmpdir(), 'sk-migrations-'))
  folders.push(folder)
  cpSync(migrationsFolder, folder, { recursive: true })
  const journalPath = join(folder, 'meta', '_journal.json')
  const journal = JSON.parse(readFileSync(journalPath, 'utf8')) as Journal
  journal.entries = journal.entries.filter(entry => entry.idx <= last)
  writeFileSync(journalPath, JSON.stringify(journal))
  return folder
}

afterAll(async () => {
  await Promise.allSettled(pools.map(pool => pool.end()))
  for (const folder of folders)
    rmSync(folder, { recursive: true, force: true })
  await Promise.allSettled(scratchDatabases.map(database => admin(`drop database if exists ${database} with (force)`)))
})

describe('[DESC-rich] migration 0014_keepsake_description_rich', () => {
  it('[DESC-rich] turns every plain text, draft and live, into a document of paragraphs, and leaves a document alone', async () => {
    const database = `sk_test_${randomBytes(6).toString('hex')}`
    scratchDatabases.push(database)
    await admin(`create database ${database}`)
    const pool = new Pool({ connectionString: withDatabase(inject('databaseUrlUnpooled'), database), max: 1 })
    pools.push(pool)
    const orm = drizzle({ client: pool })
    const journal = JSON.parse(readFileSync(join(migrationsFolder, 'meta', '_journal.json'), 'utf8')) as Journal
    const lastBefore = journal.entries.find(entry => entry.tag === '0014_keepsake_description_rich')!.idx - 1
    await migrate(orm, { migrationsFolder: folderUpTo(lastBefore) })

    const storeId = randomUUID()
    const plain = 'A knife.\nWith a cross.\r\n\r\n  \nTwo blades,   one saw.\n\n\n\nLast one.'
    const insert = async (draft: unknown, published: unknown, status = 'draft') => {
      const slug = status === 'published' ? { en: `knife-${randomBytes(3).toString('hex')}`, de: `messer-${randomBytes(3).toString('hex')}` } : null
      const { rows } = await pool.query<{ id: string }>(
        `insert into catalog.products (store_id, status, draft, published, slug) values ($1, $2, $3::jsonb, $4::jsonb, $5::jsonb) returning id`,
        [storeId, status, draft === null ? null : JSON.stringify(draft), published === null ? null : JSON.stringify(published), slug === null ? null : JSON.stringify(slug)],
      )
      return rows[0]!.id
    }
    const draftOnly = await insert({ name: { en: 'Knife' }, text: { en: plain, de: 'Ein Messer.' }, media: [] }, null)
    const live = await insert(null, { name: { en: 'Knife', de: 'Messer' }, text: { en: 'Live text.', de: 'Live\nGerman' } }, 'published')
    const both = await insert({ name: { en: 'Knife' }, text: { de: 'Entwurf' }, media: [] }, { name: { en: 'Knife', de: 'Messer' }, text: { en: 'Live' } }, 'published')
    const noText = await insert({ name: { en: 'Knife' }, text: {}, media: [] }, null)
    const doc = { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Already a document' }] }] }
    const already = await insert({ name: { en: 'Knife' }, text: { en: doc }, media: [] }, null)

    await migrate(orm, { migrationsFolder })
    await migrate(orm, { migrationsFolder })

    const read = async (id: string) => (await pool.query<{ draft: { text?: unknown } | null, published: { text?: unknown } | null, row_version: number }>('select draft, published, row_version from catalog.products where id = $1', [id])).rows[0]!

    expect((await read(draftOnly)).draft?.text).toEqual({ en: descriptionFromPlain(plain), de: descriptionFromPlain('Ein Messer.') })
    expect((await read(draftOnly)).draft?.text).toMatchObject({ en: { type: 'doc', content: [
      { type: 'paragraph', content: [{ type: 'text', text: 'A knife.' }, { type: 'hardBreak' }, { type: 'text', text: 'With a cross.' }] },
      { type: 'paragraph', content: [{ type: 'text', text: 'Two blades,   one saw.' }] },
      { type: 'paragraph', content: [{ type: 'text', text: 'Last one.' }] },
    ] } })
    expect((await read(live)).published?.text).toEqual({ en: descriptionFromPlain('Live text.'), de: descriptionFromPlain('Live\nGerman') })
    expect((await read(both)).draft?.text).toEqual({ de: descriptionFromPlain('Entwurf') })
    expect((await read(both)).published?.text).toEqual({ en: descriptionFromPlain('Live') })
    expect((await read(noText)).draft?.text).toEqual({})
    expect((await read(already)).draft?.text).toEqual({ en: doc })
    expect((await read(live)).row_version).toBe(1)
  })
})
