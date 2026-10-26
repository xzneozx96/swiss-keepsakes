import { afterAll, describe, expect, it, vi } from 'vitest'
import { openTestDatabase } from './support.ts'

vi.setConfig({ testTimeout: 60_000, hookTimeout: 120_000 })

const { pool } = openTestDatabase()

afterAll(async () => {
  await pool.end()
})

async function slugMapOk(value: string): Promise<boolean> {
  const { rows } = await pool.query<{ ok: boolean }>('select platform.valid_slug_map($1::jsonb) as ok', [value])
  return rows[0]?.ok === true
}

describe('[E2.5] migration 0007: platform helper functions', () => {
  it.each(['{"en":"a-b"}', '{"de":"x"}'])('[E2.5] valid_slug_map accepts %s', async (value) => {
    expect(await slugMapOk(value)).toBe(true)
  })

  it.each(['{}', '{"fr":"x"}', '{"en":null}', '{"en":5}', '{"en":"Old Town"}', '[]'])('[E2.5] valid_slug_map refuses %s', async (value) => {
    expect(await slugMapOk(value)).toBe(false)
  })

  it.each(['{}', '{history-culture,food-drink,lake-mountains,shopping-keepsakes}'])('[E2.5] valid_interests accepts %s', async (value) => {
    const { rows } = await pool.query<{ ok: boolean }>('select platform.valid_interests($1::text[]) as ok', [value])

    expect(rows[0]?.ok).toBe(true)
  })

  it.each(['{sport}', null])('[E2.5] valid_interests refuses %s', async (value) => {
    const { rows } = await pool.query<{ ok: boolean | null }>('select platform.valid_interests($1::text[]) as ok', [value])

    expect(rows[0]?.ok).toBe(false)
  })
})
