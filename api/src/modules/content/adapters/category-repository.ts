import type { Tx } from '../../../platform/db/client.ts'
import type { CategoryKind, CategoryRepository, CategoryRow } from '../ports.ts'
import { sql } from 'drizzle-orm'

interface Row {
  id: string
  store_id: string
  name: CategoryRow['name']
  slug: string
  parent_id: string | null
  position: number
  child_count: number
  use_count: number
}

// Fixed SQL fragments per list, never built from input. `links` is the table that tags pins (map) or story groups (blog).
const tables = {
  map: { categories: sql`content.map_categories`, links: sql`content.place_categories` },
  blog: { categories: sql`content.blog_categories`, links: sql`content.story_categories` },
} as const

const json = (value: unknown) => JSON.stringify(value)

function toRow(row: Row): CategoryRow {
  return { id: row.id, storeId: row.store_id, name: row.name, slug: row.slug, parentId: row.parent_id, position: row.position, childCount: row.child_count, useCount: row.use_count }
}

async function select(tx: Tx, storeId: string, kind: CategoryKind, id: string | null): Promise<CategoryRow[]> {
  const { categories, links } = tables[kind]
  const found = await tx.execute<Row & Record<string, unknown>>(sql`
    select c.id, c.store_id, c.name, c.slug, c.parent_id, c.position,
           (select count(*)::int from ${categories} k where k.store_id = c.store_id and k.parent_id = c.id) as child_count,
           (select count(*)::int from ${links} l where l.store_id = c.store_id and l.category_id = c.id) as use_count
      from ${categories} c
     where c.store_id = ${storeId}${id === null ? sql`` : sql` and c.id = ${id}`}
     order by (c.parent_id is not null), c.position, c.id`)
  return found.rows.map(toRow)
}

// Every write takes the lock of its list first (the use cases do), so two requests on one list run one after the other:
// positions and the "next free slug" are read and written with nobody in between.
export function createCategoryRepository(): CategoryRepository<Tx> {
  return {
    list: (tx, storeId, kind) => select(tx, storeId, kind, null),

    async lockList(tx, storeId, kind) {
      await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${storeId}::text || ${kind}::text, 0))`)
    },

    async find(tx, storeId, kind, id) {
      return (await select(tx, storeId, kind, id))[0]
    },

    async slugsTaken(tx, storeId, kind) {
      const found = await tx.execute<{ slug: string }>(sql`select slug from ${tables[kind].categories} where store_id = ${storeId}`)
      return new Set(found.rows.map(row => row.slug))
    },

    async insert(tx, storeId, kind, input, at) {
      const inserted = await tx.execute<{ id: string }>(sql`
        insert into ${tables[kind].categories} (store_id, name, slug, parent_id, position, created_at, updated_at)
        values (${storeId}, ${json(input.name)}::jsonb, ${input.slug}, ${input.parentId}, ${input.position}, ${at}, ${at})
        returning id`)
      return (await select(tx, storeId, kind, inserted.rows[0]!.id))[0]!
    },

    // An empty change set only touches updated_at.
    async update(tx, storeId, kind, id, changes, at) {
      await tx.execute(sql`
        update ${tables[kind].categories} set
          name = case when ${changes.name !== undefined} then ${json(changes.name ?? null)}::jsonb else name end,
          parent_id = case when ${changes.parentId !== undefined} then ${changes.parentId ?? null}::uuid else parent_id end,
          position = coalesce(${changes.position ?? null}::int, position),
          updated_at = ${at}
        where store_id = ${storeId} and id = ${id}`)
      return (await select(tx, storeId, kind, id))[0]!
    },

    async setPositions(tx, storeId, kind, orderedIds, at) {
      if (orderedIds.length === 0)
        return
      await tx.execute(sql`
        update ${tables[kind].categories} c set position = o.position, updated_at = ${at}
          from unnest(${sql.param(orderedIds)}::uuid[]) with ordinality as o(id, position)
         where c.store_id = ${storeId} and c.id = o.id`)
    },

    async remove(tx, storeId, kind, id) {
      const deleted = await tx.execute(sql`delete from ${tables[kind].categories} where store_id = ${storeId} and id = ${id} returning id`)
      return deleted.rows.length > 0
    },
  }
}
