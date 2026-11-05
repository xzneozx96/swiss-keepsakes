import { sql } from 'drizzle-orm'
import { PgDialect } from 'drizzle-orm/pg-core'
import { describe, expect, it } from 'vitest'
import { searchKey, searchOrder, searchTerm } from '../../../src/platform/db/search.ts'

const dialect = new PgDialect()
const text = sql`t.search_text`
const tsv = sql`t.search_tsv`

describe('[ADR-033][slice 6] the search SQL helpers', () => {
  it('folds the typed text in SQL like the stored titles, and matches by full text, substring or trigram word similarity', () => {
    const query = dialect.sqlToQuery(searchTerm('Löwen').matches(text, tsv))

    expect(query.sql).toContain('t.search_tsv @@ (plainto_tsquery(\'english\'::regconfig, platform.search_fold($1::text)) || plainto_tsquery(\'german\'::regconfig, platform.search_fold($2::text)))')
    expect(query.sql).toContain('t.search_text like platform.search_fold($3::text)')
    expect(query.sql).toContain('platform.search_fold($4::text) <% t.search_text')
    expect(query.params).toEqual(['Löwen', 'Löwen', '%Löwen%', 'Löwen'])
  })

  it('escapes the characters LIKE treats as wildcards, so 100% is searched as text', () => {
    const query = dialect.sqlToQuery(searchTerm('100%_a\\b').matches(text, tsv))

    expect(query.params).toContain('%100\\%\\_a\\\\b%')
  })

  it('ranks by full-text rank plus word similarity, both as double precision', () => {
    const query = dialect.sqlToQuery(searchTerm('lion').score(text, tsv))

    expect(query.sql).toMatch(/^\(ts_rank\(t\.search_tsv, .*\)::float8 \+ word_similarity\(.*\)::float8\)$/)
  })

  it('pages by rank, id, kind, all descending, with the rank cast to float8', () => {
    expect(dialect.sqlToQuery(sql.join(searchKey.map(k => k.column), sql`, `)).sql).toBe('score, id, kind')
    expect(searchKey.map(k => k.cast)).toEqual(['float8', 'uuid', 'text'])
    expect(dialect.sqlToQuery(searchOrder).sql).toBe('score desc, id desc, kind desc')
  })
})
