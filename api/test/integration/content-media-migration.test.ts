import { randomBytes, randomUUID } from 'node:crypto'
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { drizzle } from 'drizzle-orm/node-postgres'
import { migrate } from 'drizzle-orm/node-postgres/migrator'
import { Client, Pool } from 'pg'
import { afterAll, describe, expect, inject, it, vi } from 'vitest'
import { migrationsFolder } from '../../scripts/check-branch-migrations.ts'

vi.setConfig({ testTimeout: 120_000, hookTimeout: 180_000 })

interface Journal { entries: { idx: number }[] }

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

// A copy of api/migrations that stops after migration `last`.
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

describe('[E4.11][AC51] migration 0011_media_name', () => {
  it('[E4.11][AC51] names every existing file, keeps its version at 1, refuses a blank name and names a row that has none', async () => {
    const database = `sk_test_${randomBytes(6).toString('hex')}`
    scratchDatabases.push(database)
    await admin(`create database ${database}`)
    const pool = new Pool({ connectionString: withDatabase(inject('databaseUrlUnpooled'), database), max: 1 })
    pools.push(pool)
    const orm = drizzle({ client: pool })
    const lastBefore = JSON.parse(readFileSync(join(migrationsFolder, 'meta', '_journal.json'), 'utf8')).entries.find((entry: { tag: string }) => entry.tag === '0011_media_name').idx - 1
    await migrate(orm, { migrationsFolder: folderUpTo(lastBefore) })

    const storeId = randomUUID()
    const insertOld = async (kind: string, key: string, type: string) => {
      const { rows } = await pool.query<{ id: string }>(
        `insert into content.media (store_id, kind, storage_key, content_type, byte_size, sha256, status)
         values ($1, $2, $3, $4, 10, repeat('a', 64), 'ready') returning id`,
        [storeId, kind, key, type],
      )
      return rows[0]!.id
    }
    const photo = await insertOld('image', `${storeId}/x/original.jpg`, 'image/jpeg')
    const pdf = await insertOld('pdf', `${storeId}/y/original.pdf`, 'application/pdf')

    await migrate(orm, { migrationsFolder })

    const { rows } = await pool.query<{ id: string, name: string, file_name: string, version: number }>(
      'select id, name, file_name, version from content.media where store_id = $1 order by kind',
      [storeId],
    )
    expect(rows).toEqual([
      { id: photo, name: `image-${photo.slice(0, 8)}.jpg`, file_name: `image-${photo.slice(0, 8)}.jpg`, version: 1 },
      { id: pdf, name: `pdf-${pdf.slice(0, 8)}.pdf`, file_name: `pdf-${pdf.slice(0, 8)}.pdf`, version: 1 },
    ])

    const later = await pool.query<{ id: string, name: string }>(
      `insert into content.media (store_id, kind, storage_key, content_type, byte_size, sha256, status)
       values ($1, 'audio', $2, 'audio/mpeg', 10, repeat('b', 64), 'ready') returning id, name`,
      [storeId, `${storeId}/z/original.mp3`],
    )
    expect(later.rows[0]!.name).toBe(`audio-${later.rows[0]!.id.slice(0, 8)}.mp3`)

    for (const blank of ['', '   '])
      await expect(pool.query('update content.media set name = $2 where id = $1', [photo, blank])).rejects.toMatchObject({ constraint: 'media_name_check' })
    await expect(pool.query('update content.media set name = null where id = $1', [photo])).rejects.toMatchObject({ code: '23502' })
    await expect(pool.query('update content.media set version = 0 where id = $1', [photo])).rejects.toMatchObject({ constraint: 'media_version_check' })
  })
})
