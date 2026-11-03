import type { Tx } from '../../../platform/db/client.ts'
import type { Localized, PickupPlace, PickupPlaceRepository, PickupSpan } from '../ports.ts'
import { sql } from 'drizzle-orm'

interface PlaceRow {
  id: string
  store_id: string
  name: Localized
  address: Localized
  instructions: Localized | null
  position: number
  archived: boolean
  row_version: number
}

interface HourRow {
  place_id: string
  weekday: number
  opens: string
  closes: string
}

const placeColumns = sql`p.id, p.store_id, p.name, p.address, p.instructions, p.position, (p.archived_at is not null) as archived, p.row_version`

// `time` holds 24:00 and to_char would show it as 00:00, so closing at midnight is named apart.
const hourColumns = sql`h.place_id, h.weekday::int as weekday, to_char(h.opens, 'HH24:MI') as opens,
  case when h.closes = '24:00'::time then '24:00' else to_char(h.closes, 'HH24:MI') end as closes`

const json = (value: unknown) => (value === null ? null : JSON.stringify(value))

function view(row: PlaceRow, hours: HourRow[]): PickupPlace {
  return {
    id: row.id,
    storeId: row.store_id,
    name: row.name,
    address: row.address,
    instructions: row.instructions,
    position: row.position,
    archived: row.archived,
    hours: hours.filter(hour => hour.place_id === row.id).map((hour): PickupSpan => ({ weekday: hour.weekday, opens: hour.opens, closes: hour.closes })),
    rowVersion: row.row_version,
  }
}

async function replaceHours(tx: Tx, storeId: string, placeId: string, hours: PickupSpan[]) {
  await tx.execute(sql`delete from catalog.pickup_place_hours where store_id = ${storeId} and place_id = ${placeId}`)
  if (hours.length === 0)
    return
  const values = hours.map(span => sql`(${placeId}, ${storeId}, ${span.weekday}, ${span.opens}::time, ${span.closes}::time)`)
  await tx.execute(sql`insert into catalog.pickup_place_hours (place_id, store_id, weekday, opens, closes) values ${sql.join(values, sql`, `)}`)
}

async function load(tx: Tx, storeId: string, placeId: string, lock: boolean): Promise<PickupPlace | undefined> {
  const found = await tx.execute<PlaceRow & Record<string, unknown>>(sql`
    select ${placeColumns} from catalog.pickup_places p where p.store_id = ${storeId} and p.id = ${placeId}${lock ? sql` for update` : sql``}`)
  const row = found.rows[0]
  if (!row)
    return undefined
  const hours = await tx.execute<HourRow & Record<string, unknown>>(sql`
    select ${hourColumns} from catalog.pickup_place_hours h where h.store_id = ${storeId} and h.place_id = ${placeId} order by h.weekday, h.opens`)
  return view(row, hours.rows)
}

export function createPickupRepository(): PickupPlaceRepository<Tx> {
  return {
    async list(tx, storeId, archived) {
      const places = await tx.execute<PlaceRow & Record<string, unknown>>(sql`
        select ${placeColumns} from catalog.pickup_places p
         where p.store_id = ${storeId} and (p.archived_at is not null) = ${archived}
         order by p.position, p.id`)
      const hours = await tx.execute<HourRow & Record<string, unknown>>(sql`
        select ${hourColumns} from catalog.pickup_place_hours h
          join catalog.pickup_places p on p.id = h.place_id and p.store_id = h.store_id
         where p.store_id = ${storeId} and (p.archived_at is not null) = ${archived}
         order by h.weekday, h.opens`)
      return places.rows.map(row => view(row, hours.rows))
    },

    find: (tx, storeId, placeId, lock = false) => load(tx, storeId, placeId, lock),

    async lockList(tx, storeId) {
      // Two creates or reorders of one store wait for each other (an advisory lock held to the end of the transaction); other stores do not.
      await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${`pickup_places:${storeId}`}, 0))`)
    },

    async insert(tx, storeId, input, at) {
      const inserted = await tx.execute<{ id: string }>(sql`
        insert into catalog.pickup_places (store_id, name, address, instructions, position, created_at, updated_at)
        values (${storeId}, ${JSON.stringify(input.name)}::jsonb, ${JSON.stringify(input.address)}::jsonb, ${json(input.instructions)}::jsonb,
                (select coalesce(max(position), 0) + 1 from catalog.pickup_places where store_id = ${storeId}), ${at}, ${at})
        returning id`)
      const id = inserted.rows[0]!.id
      await replaceHours(tx, storeId, id, input.hours)
      return (await load(tx, storeId, id, false))!
    },

    async save(tx, place, changes, at) {
      await tx.execute(sql`
        update catalog.pickup_places
           set name = ${JSON.stringify(changes.name ?? place.name)}::jsonb,
               address = ${JSON.stringify(changes.address ?? place.address)}::jsonb,
               instructions = ${json(changes.instructions === undefined ? place.instructions : changes.instructions)}::jsonb,
               row_version = row_version + 1, updated_at = ${at}
         where store_id = ${place.storeId} and id = ${place.id}`)
      if (changes.hours)
        await replaceHours(tx, place.storeId, place.id, changes.hours)
      return (await load(tx, place.storeId, place.id, false))!
    },

    async setPositions(tx, storeId, ids, at) {
      if (ids.length === 0)
        return
      const rows = ids.map((id, index) => sql`(${id}::uuid, ${index + 1}::int)`)
      await tx.execute(sql`
        update catalog.pickup_places p set position = v.position, updated_at = ${at}
          from (values ${sql.join(rows, sql`, `)}) as v(id, position)
         where p.store_id = ${storeId} and p.id = v.id`)
    },

    async setArchived(tx, place, archived, at) {
      await tx.execute(sql`
        update catalog.pickup_places
           set archived_at = ${archived ? at : null}, row_version = row_version + 1, updated_at = ${at}
         where store_id = ${place.storeId} and id = ${place.id}`)
      return (await load(tx, place.storeId, place.id, false))!
    },
  }
}
