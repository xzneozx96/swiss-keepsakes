import { readFileSync } from 'node:fs'
import { categoryIconSchema } from '@sk/api-contract'
import { categoryIcons } from '@sk/domain/content'
import { describe, expect, it } from 'vitest'
import { migrationsFolder } from '../../scripts/check-branch-migrations.ts'

const sql = readFileSync(`${migrationsFolder}/0026_map_category_icon.sql`, 'utf8')

// The keys between the parentheses of `icon IN (...)`: the literal list the migration carries.
function literalKeys(): string[] {
  const list = /icon IN \(([^)]*)\)/.exec(sql)?.[1] ?? ''
  return Array.from(list.matchAll(/'([^']+)'/g), match => match[1]!)
}

describe('[E4.13][AC5] migration 0026 carries the domain icon list', () => {
  it('[E4.13][AC5] the CHECK literal list, the contract enum and the domain list hold the same keys in the same order', () => {
    expect(literalKeys()).toEqual([...categoryIcons])
    expect([...categoryIconSchema.options]).toEqual([...categoryIcons])
  })

  it('[E4.13][AC1] every statement can run twice: guarded add column, drop-then-add constraint, no data change', () => {
    expect(sql).toContain('ADD COLUMN IF NOT EXISTS icon text')
    expect(sql).toContain('DROP CONSTRAINT IF EXISTS map_categories_icon_check')
    expect(sql).not.toMatch(/\b(UPDATE|DELETE|INSERT)\b/)
  })
})
