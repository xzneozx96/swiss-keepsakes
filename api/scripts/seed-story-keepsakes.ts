import type { Pool } from 'pg'
import type { StoryKeepsakeLinkSpec } from './seed-data/story-keepsake-links.ts'
import process from 'node:process'
import { pathToFileURL } from 'node:url'
import { Pool as PgPool } from 'pg'
import { storyKeepsakeLinks } from './seed-data/story-keepsake-links.ts'
import { isLocalDatabaseUrl } from './seed-guard.ts'

// `pnpm --filter @sk/api db:seed:story-keepsakes [--dry-run]` adds the keepsake links of `seed-data/story-keepsake-links.ts` to
// the seeded stories of one store (T-E4.4a). It only adds: a link that exists is left alone, a story gets each missing keepsake at
// the next free position after the links it has, and nothing is updated or deleted. Run it again and nothing changes. The guard and the store
// pick are those of `db:seed`: DATABASE_URL only, a remote host needs SEED_ALLOW_REMOTE_DATABASE=1, and the URL is never printed.

const maxLinks = 6

export interface LinkSnapshot {
  // Published stories of the store by slug (either language), with the links they have.
  stories: ReadonlyMap<string, { groupId: string, links: { position: number, productId: string }[] }>
  // Published keepsakes of the store by SKU code.
  products: ReadonlyMap<string, string>
}

export interface PlannedLink { story: string, code: string, groupId: string, productId: string, position: number }
export interface SkippedLink { story: string, code?: string, reason: string }

export function planStoryKeepsakeLinks(specs: readonly StoryKeepsakeLinkSpec[], snapshot: LinkSnapshot): { adds: PlannedLink[], skipped: SkippedLink[] } {
  const adds: PlannedLink[] = []
  const skipped: SkippedLink[] = []
  for (const spec of specs) {
    const found = snapshot.stories.get(spec.story)
    if (!found) {
      skipped.push({ story: spec.story, reason: 'no published story with this slug in the store' })
      continue
    }
    const linked = new Set(found.links.map(link => link.productId))
    const taken = new Set(found.links.map(link => link.position))
    for (const code of spec.keepsakes) {
      const productId = snapshot.products.get(code)
      if (!productId) {
        skipped.push({ story: spec.story, code, reason: 'no published keepsake with this SKU code in the store' })
        continue
      }
      if (linked.has(productId))
        continue
      // The cap counts the links; the position is the one after the last, or the lowest free one when the last is the 6th.
      if (taken.size >= maxLinks) {
        skipped.push({ story: spec.story, code, reason: `the story has ${maxLinks} links already` })
        continue
      }
      const after = Math.max(0, ...taken) + 1
      const position = after <= maxLinks ? after : Array.from({ length: maxLinks }, (_, i) => i + 1).find(free => !taken.has(free))!
      adds.push({ story: spec.story, code, groupId: found.groupId, productId, position })
      linked.add(productId)
      taken.add(position)
    }
  }
  return { adds, skipped }
}

async function readSnapshot(pool: Pool, storeId: string, specs: readonly StoryKeepsakeLinkSpec[]): Promise<LinkSnapshot> {
  const slugs = specs.map(spec => spec.story)
  const codes = [...new Set(specs.flatMap(spec => spec.keepsakes))]
  const groups = await pool.query<{ slug: string, group_id: string }>(
    `select slug, group_id from content.story_versions where store_id = $1 and status = 'published' and slug = any($2::text[])`,
    [storeId, slugs],
  )
  const links = await pool.query<{ group_id: string, position: number, product_id: string }>(
    `select group_id, position, product_id from content.story_keepsake_links where store_id = $1 and group_id = any($2::uuid[])`,
    [storeId, groups.rows.map(row => row.group_id)],
  )
  const products = await pool.query<{ sku_code: string, product_id: string }>(
    `select s.sku_code, s.product_id from catalog.skus s join catalog.products p on p.store_id = s.store_id and p.id = s.product_id
      where s.store_id = $1 and p.status = 'published' and s.sku_code = any($2::text[])`,
    [storeId, codes],
  )
  return {
    stories: new Map(groups.rows.map(row => [row.slug, { groupId: row.group_id, links: links.rows.filter(link => link.group_id === row.group_id).map(link => ({ position: link.position, productId: link.product_id })) }])),
    products: new Map(products.rows.map(row => [row.sku_code, row.product_id])),
  }
}

export async function storyKeepsakeLinksStep(pool: Pool, storeId: string, options: { dry: boolean, specs?: readonly StoryKeepsakeLinkSpec[] }): Promise<number> {
  const specs = options.specs ?? storyKeepsakeLinks
  const { adds, skipped } = planStoryKeepsakeLinks(specs, await readSnapshot(pool, storeId, specs))
  for (const add of adds)
    process.stdout.write(`${options.dry ? 'Would add' : 'Adding'} link: ${add.story} -> ${add.code} (position ${add.position})\n`)
  for (const skip of skipped)
    process.stdout.write(`Skipped: ${skip.story}${skip.code ? ` / ${skip.code}` : ''}: ${skip.reason}\n`)
  if (!options.dry) {
    for (const add of adds) {
      // On conflict a person's own write that landed in between wins; the next run plans again.
      await pool.query(
        `insert into content.story_keepsake_links (group_id, store_id, position, product_id) values ($1, $2, $3, $4) on conflict do nothing`,
        [add.groupId, storeId, add.position, add.productId],
      )
    }
  }
  process.stdout.write(`Story-keepsake links: ${adds.length} ${options.dry ? 'to add' : 'added'}, ${skipped.length} skipped.${adds.length === 0 ? ' Nothing was changed.' : ''}\n`)
  return 0
}

async function pickStore(pool: Pool): Promise<string | undefined> {
  const wanted = process.env.SEED_STORE_ID
  if (wanted) {
    const { rows } = await pool.query<{ id: string }>('select id from identity.stores where id::text = $1', [wanted])
    if (!rows[0])
      process.stderr.write('SEED_STORE_ID names no store. Nothing was written.\n')
    return rows[0]?.id
  }
  const { rows } = await pool.query<{ id: string }>('select id from identity.stores limit 2')
  if (rows.length !== 1)
    process.stderr.write(`${rows.length === 0 ? 'There is no store' : 'There is more than one store'}. Set SEED_STORE_ID to the store to seed. Nothing was written.\n`)
  return rows.length === 1 ? rows[0]!.id : undefined
}

async function main(): Promise<number> {
  const flags = process.argv.slice(2)
  const unknown = flags.filter(flag => flag !== '--dry-run')
  if (unknown.length > 0) {
    process.stderr.write(`Unknown flag: ${unknown.join(' ')}. Known: --dry-run. Nothing was written.\n`)
    return 2
  }
  const url = process.env.DATABASE_URL
  if (!url) {
    process.stderr.write('DATABASE_URL is not set.\n')
    return 2
  }
  if (!isLocalDatabaseUrl(url) && process.env.SEED_ALLOW_REMOTE_DATABASE !== '1') {
    process.stderr.write('Refused: host is not local. Set SEED_ALLOW_REMOTE_DATABASE=1 to seed a remote database. Nothing was written.\n')
    return 2
  }
  const pool = new PgPool({ connectionString: url, connectionTimeoutMillis: 5_000 })
  try {
    const storeId = await pickStore(pool)
    return storeId ? await storyKeepsakeLinksStep(pool, storeId, { dry: flags.includes('--dry-run') }) : 1
  }
  finally {
    await pool.end()
  }
}

// The tests import the plan above, so the run starts only when the file is the entry point.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().then(
    (code) => {
      process.exitCode = code
    },
    (error) => {
      // The error's message can quote the connection string, so only its type and code are printed.
      const { name, code } = error as { name?: string, code?: string }
      process.stderr.write(`The seed failed: ${name ?? 'Error'}${code ? ` ${code}` : ''}\n`)
      process.exitCode = 1
    },
  )
}
