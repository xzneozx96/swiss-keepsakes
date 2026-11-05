import type { SQL } from 'drizzle-orm'
import type { KeyColumn } from './keyset.ts'
import { sql } from 'drizzle-orm'

// The SQL half of the guest search (ADR-033 slice 6; the columns, functions and indexes are in api/migrations/0028_public_search.sql).
// A table keeps `search_text` (the folded title, with the oe/ae/ue form beside it) and `search_tsv` (English and German
// vectors). A typed query is folded the same way, then matches by full text, by substring or by trigram word similarity.

const likeSpecials = /[\\%_]/g

// The page key of a search: the rank at full precision (a double as text round-trips exactly), the id, the kind. Descending.
export const searchKey: KeyColumn[] = [
  { column: sql`score`, cast: 'float8' },
  { column: sql`id`, cast: 'uuid' },
  { column: sql`kind`, cast: 'text' },
]

export const searchOrder = sql`score desc, id desc, kind desc`

/** `matches` is the `where` part and `score` the rank (higher is better) for a row whose folded title and vector are `text` and `tsv`. */
export function searchTerm(q: string): { matches: (text: SQL, tsv: SQL) => SQL, score: (text: SQL, tsv: SQL) => SQL } {
  const folded = sql`platform.search_fold(${q}::text)`
  // `like` escapes with a backslash; folding changes neither the backslash, % nor _.
  const pattern = sql`platform.search_fold(${`%${q.replace(likeSpecials, '\\$&')}%`}::text)`
  const tsq = sql`(plainto_tsquery('english'::regconfig, ${folded}) || plainto_tsquery('german'::regconfig, ${folded}))`

  return {
    matches: (text, tsv) => sql`(${tsv} @@ ${tsq} or ${text} like ${pattern} or ${folded} <% ${text})`,
    // `similarity` over the whole title puts a title that is close to the query as a whole (Lion Monument) above a longer one
    // that only contains the word (Public toilets at the Lion Monument), which the other two terms score the same.
    score: (text, tsv) => sql`(ts_rank(${tsv}, ${tsq})::float8 + word_similarity(${folded}, ${text})::float8 + similarity(${folded}, ${text})::float8)`,
  }
}
