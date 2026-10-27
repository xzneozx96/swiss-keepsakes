import { randomUUID } from 'node:crypto'
import { afterAll, describe, expect, it, vi } from 'vitest'
import { count, openTestDatabase } from './support.ts'

vi.setConfig({ testTimeout: 60_000, hookTimeout: 120_000 })

const { pool } = openTestDatabase()

afterAll(async () => {
  await pool.end()
})

interface PgFailure { code?: string, constraint?: string, message?: string }

async function failure(promise: Promise<unknown>): Promise<PgFailure> {
  try {
    await promise
  }
  catch (error) {
    return error as PgFailure
  }
  throw new Error('the statement was expected to fail and succeeded')
}

// A published pin: insert the draft, then publish it with an English title, a slug and a location.
async function publishedPin(store: string, slug = `pin-${randomUUID().slice(0, 8)}`): Promise<string> {
  const { rows } = await pool.query<{ id: string }>('insert into content.places (store_id) values ($1) returning id', [store])
  const id = rows[0]!.id
  await pool.query(
    `update content.places set status = 'published', first_published_at = now(), slug = $2, latitude = 47.05, longitude = 8.3, published = '{"name":{"en":"X"}}' where id = $1`,
    [id, JSON.stringify({ en: slug })],
  )
  return id
}

function addDate(place: string, store: string, firstDay: string, lastDay: string, start: string | null = null, end: string | null = null) {
  return pool.query(
    'insert into content.place_dates (place_id, store_id, first_day, last_day, start_time, end_time) values ($1, $2, $3, $4, $5, $6)',
    [place, store, firstDay, lastDay, start, end],
  )
}

async function endsAtUtc(place: string): Promise<string[]> {
  const { rows } = await pool.query<{ at: string }>(
    `select to_char(ends_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as at from content.place_dates where place_id = $1 order by ends_at`,
    [place],
  )
  return rows.map(row => row.at)
}

async function listed(place: string) {
  const { rows } = await pool.query<{ next_first_day: string | null, next_last_day: string | null }>(
    `select next_first_day::text, next_last_day::text from content.public_pins where id = $1`,
    [place],
  )
  return rows
}

describe('[E2.11][AC86] date entries', () => {
  it.each([
    ['one day with a start and an end', '2026-11-14', '2026-11-14', '19:30', '21:00'],
    ['one day with a start and no end', '2026-11-14', '2026-11-14', '19:30', null],
    ['a range with no times', '2026-11-20', '2026-12-23', null, null],
  ])('[E2.11][AC86] a date entry shape is accepted: %s', async (_what, first, last, start, end) => {
    const store = randomUUID()
    const place = await publishedPin(store)

    await addDate(place, store, first, last, start, end)

    expect(await count(pool, 'select count(*) from content.place_dates where place_id = $1', [place])).toBe(1)
  })

  it.each([
    ['an end before the start', '2026-11-14', '2026-11-14', '19:30', '18:00', 'place_dates_end_after_start_check'],
    ['a last day before the first day', '2026-11-20', '2026-11-19', null, null, 'place_dates_days_check'],
    ['a range with times', '2026-11-20', '2026-11-21', '19:30', '21:00', 'place_dates_times_check'],
    ['an end time with no start', '2026-11-14', '2026-11-14', null, '21:00', 'place_dates_end_needs_start_check'],
  ])('[E2.11][AC86] a date entry shape is refused: %s', async (_what, first, last, start, end, constraint) => {
    const store = randomUUID()
    const place = await publishedPin(store)

    const refused = await failure(addDate(place, store, first, last, start, end))

    expect(refused).toMatchObject({ code: '23514', constraint })
    expect(await count(pool, 'select count(*) from content.place_dates where place_id = $1', [place])).toBe(0)
  })

  it('[E2.11][AC86] a pin holds several entries and overlaps are accepted', async () => {
    const store = randomUUID()
    const place = await publishedPin(store)

    await addDate(place, store, '2026-11-14', '2026-11-14', '19:30', '21:00')
    await addDate(place, store, '2026-11-14', '2026-11-14', '20:00', '22:00')
    await addDate(place, store, '2026-11-10', '2026-11-20')

    expect(await count(pool, 'select count(*) from content.place_dates where place_id = $1', [place])).toBe(3)
  })

  it.each([
    ['an end time in winter', '2026-11-14', '21:00', '2026-11-14T20:00:00Z'],
    ['no end time in winter (midnight CET)', '2026-11-14', null, '2026-11-14T23:00:00Z'],
    ['an end time in summer', '2026-07-14', '21:00', '2026-07-14T19:00:00Z'],
  ])('[E2.11][AC86] ends_at is in Europe/Zurich: %s', async (_what, day, end, expected) => {
    const store = randomUUID()
    const place = await publishedPin(store)

    await addDate(place, store, day, day, end === null ? null : '19:30', end)

    expect(await endsAtUtc(place)).toEqual([expected])
  })

  // The view reads now(), which a test cannot move, so this pins the predicate the view uses: ends_at > moment.
  it.each([
    ['14 Nov 20:00, the entry is running', '2026-11-14 20:00', true],
    ['14 Nov 21:01, after the end time', '2026-11-14 21:01', false],
  ])('[E2.11][AC86] the 14 Nov boundaries with an end time: %s', async (_what, moment, expected) => {
    const store = randomUUID()
    const place = await publishedPin(store)
    await addDate(place, store, '2026-11-14', '2026-11-14', '19:30', '21:00')

    const { rows } = await pool.query<{ not_ended: boolean }>(
      `select ends_at > ($2 || ' Europe/Zurich')::timestamptz as not_ended from content.place_dates where place_id = $1`,
      [place, moment],
    )

    expect(rows[0]?.not_ended).toBe(expected)
  })

  it.each([
    ['14 Nov 23:59, the day with no end time', '2026-11-14 23:59', true],
    ['15 Nov 00:00, the day with no end time', '2026-11-15 00:00', false],
  ])('[E2.11][AC86] the 14 Nov boundaries with no end time: %s', async (_what, moment, expected) => {
    const store = randomUUID()
    const place = await publishedPin(store)
    await addDate(place, store, '2026-11-14', '2026-11-14')

    const { rows } = await pool.query<{ not_ended: boolean }>(
      `select ends_at > ($2 || ' Europe/Zurich')::timestamptz as not_ended from content.place_dates where place_id = $1`,
      [place, moment],
    )

    expect(rows[0]?.not_ended).toBe(expected)
  })
})

describe('[E2.11][AC86] content.public_pins lists by the live clock', () => {
  // Zurich today and tomorrow, and an entry that ended an hour ago (yesterday when that would cross midnight).
  async function zurichDays() {
    const { rows } = await pool.query<{ today: string, tomorrow: string, yesterday: string, past_day: string, past_start: string, past_end: string, now_start: string }>(`
      with z as (select now() at time zone 'Europe/Zurich' as t)
      select t::date::text as today,
             (t::date + 1)::text as tomorrow,
             (t::date - 1)::text as yesterday,
             case when t::time >= time '02:00' then t::date else t::date - 1 end::text as past_day,
             case when t::time >= time '02:00' then to_char(t - interval '2 hours', 'HH24:MI') else '10:00' end as past_start,
             case when t::time >= time '02:00' then to_char(t - interval '1 hour', 'HH24:MI') else '11:00' end as past_end,
             to_char(t, 'HH24:MI') as now_start
        from z`)
    return rows[0]!
  }

  it('[E2.11][AC86] a pin with no entries is listed with no next date', async () => {
    const place = await publishedPin(randomUUID())

    expect(await listed(place)).toEqual([{ next_first_day: null, next_last_day: null }])
  })

  it('[E2.11][AC86] a pin whose only entry ended an hour ago is not listed', async () => {
    const store = randomUUID()
    const place = await publishedPin(store)
    const day = await zurichDays()

    await addDate(place, store, day.past_day, day.past_day, day.past_start, day.past_end)

    expect(await listed(place)).toEqual([])
  })

  it('[E2.11][AC86] a pin with an entry tomorrow is listed with that next date', async () => {
    const store = randomUUID()
    const place = await publishedPin(store)
    const day = await zurichDays()

    await addDate(place, store, day.tomorrow, day.tomorrow, '19:30', '21:00')

    expect(await listed(place)).toEqual([{ next_first_day: day.tomorrow, next_last_day: day.tomorrow }])
  })

  it('[E2.11][AC86] a past entry plus a future entry lists the future one as next', async () => {
    const store = randomUUID()
    const place = await publishedPin(store)
    const day = await zurichDays()

    await addDate(place, store, day.yesterday, day.yesterday, '19:30', '21:00')
    await addDate(place, store, day.tomorrow, day.tomorrow, '19:30', '21:00')

    expect(await listed(place)).toEqual([{ next_first_day: day.tomorrow, next_last_day: day.tomorrow }])
  })

  it('[E2.11][AC86] a day today with no end time is listed', async () => {
    const store = randomUUID()
    const place = await publishedPin(store)
    const client = await pool.connect()

    // One transaction, so now() is the same for the day, the insert and the view read (no race with Zurich midnight).
    try {
      await client.query('begin')
      const { rows: [day] } = await client.query<{ today: string, now_start: string }>(`
        select (now() at time zone 'Europe/Zurich')::date::text as today, to_char(now() at time zone 'Europe/Zurich', 'HH24:MI') as now_start`)
      await client.query(
        'insert into content.place_dates (place_id, store_id, first_day, last_day, start_time) values ($1, $2, $3, $3, $4)',
        [place, store, day!.today, day!.now_start],
      )
      const { rows } = await client.query('select next_first_day::text, next_last_day::text from content.public_pins where id = $1', [place])

      expect(rows).toEqual([{ next_first_day: day!.today, next_last_day: day!.today }])
    }
    finally {
      await client.query('rollback')
      client.release()
    }
  })

  it('[E2.11][AC86] a future entry brings an ended pin back and its status stays published', async () => {
    const store = randomUUID()
    const place = await publishedPin(store)
    const day = await zurichDays()
    await addDate(place, store, day.past_day, day.past_day, day.past_start, day.past_end)
    const before = await listed(place)

    await addDate(place, store, day.tomorrow, day.tomorrow)

    expect(before).toEqual([])
    expect(await listed(place)).toEqual([{ next_first_day: day.tomorrow, next_last_day: day.tomorrow }])
    expect(await count(pool, `select count(*) from content.places where id = $1 and status = 'published'`, [place])).toBe(1)
  })

  it('[E2.11][AC86] a draft pin and a hidden pin are never listed', async () => {
    const store = randomUUID()
    const { rows } = await pool.query<{ id: string }>('insert into content.places (store_id) values ($1) returning id', [store])
    const draft = rows[0]!.id
    const hidden = await publishedPin(store)
    const visible = await publishedPin(store)
    // every pin has a date that has not passed, so only its status can keep it out of the view
    for (const place of [draft, hidden, visible])
      await addDate(place, store, '2099-01-01', '2099-01-01', '19:30', '21:00')
    await pool.query(`update content.places set status = 'hidden' where id = $1`, [hidden])

    const { rows: seen } = await pool.query<{ id: string }>('select id from content.public_pins where store_id = $1', [store])

    expect(seen.map(row => row.id)).toEqual([visible])
  })

  it('[E2.11][AC86] the view has the next-date columns', async () => {
    const { rows } = await pool.query<{ column_name: string }>(
      `select column_name from information_schema.columns where table_schema = 'content' and table_name = 'public_pins'`,
    )

    expect(rows.map(row => row.column_name)).toEqual(expect.arrayContaining(['next_first_day', 'next_last_day', 'next_start_time', 'next_end_time']))
  })
})

describe('[E2.11][AC86] valid_weekly_hours', () => {
  async function hoursOk(value: string): Promise<boolean> {
    const { rows } = await pool.query<{ ok: boolean }>('select content.valid_weekly_hours($1::jsonb) as ok', [value])
    return rows[0]?.ok as boolean
  }

  it.each([
    '[]',
    '[{"day":1,"opens":"08:00","closes":"18:00"}]',
    '[{"day":7,"opens":"08:00","closes":"24:00"}]',
  ])('[E2.11][AC86] accepts %s', async (value) => {
    expect(await hoursOk(value)).toBe(true)
  })

  it.each([
    '[{"day":8,"opens":"08:00","closes":"18:00"}]',
    '[{"day":1,"opens":"18:00","closes":"08:00"}]',
    '{}',
    '[{"day":1,"opens":"08:00","closes":"9:00"}]',
    '[{"day":1,"opens":"08:00","closes":"18:00","note":"x"}]',
  ])('[E2.11][AC86] refuses %s', async (value) => {
    expect(await hoursOk(value)).toBe(false)
  })

  it('[E2.11][AC86] a pin row with bad hours is refused', async () => {
    const refused = await failure(pool.query(
      `insert into content.places (store_id, weekly_hours) values ($1, '[{"day":9,"opens":"08:00","closes":"18:00"}]')`,
      [randomUUID()],
    ))

    expect(refused).toMatchObject({ code: '23514', constraint: 'places_weekly_hours_check' })
  })
})
