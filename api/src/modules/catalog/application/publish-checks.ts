import type { ProductDoc, ProductOption, ProductVariant } from '../ports.ts'
import { languagesOf } from '@sk/domain/content'

type Language = 'en' | 'de'

export interface PublishCheck {
  code: 'language' | 'photos' | 'variant-for-sale' | 'other-language' | 'hidden' | 'commission-zero' | 'option-labels'
  card: 'basics' | 'photos' | 'options' | 'variants' | 'commission'
  count?: number
  codes?: string[]
  language?: Language
}

const languages: Language[] = ['en', 'de']

// A language is full when its name and its text are both filled in (AC30). One full language is enough to publish.
export function fullLanguages(doc: Pick<ProductDoc, 'name' | 'text'>): Language[] {
  const named = languagesOf(doc.name)
  const written = languagesOf(doc.text)
  return languages.filter(language => named.includes(language) && written.includes(language))
}

// Option names and values that miss a language. German is optional (design open point 9), so this only warns.
export function unlabelledCount(options: ProductOption[]): number {
  const labels = options.flatMap(option => [option.name, ...option.values.map(value => value.label)])

  return labels.filter(label => !label.en?.trim() || !label.de?.trim()).length
}

export interface PublishChecks {
  blocking: PublishCheck[]
  warnings: PublishCheck[]
}

// The publish card's checks (design section 10). Blocking ones stop a publish and are also what the write validation
// refuses; warnings never do. Archived variants are not checked.
export function publishChecks(input: { doc: ProductDoc, variants: ProductVariant[], options: ProductOption[], commissionRate: number }): PublishChecks {
  const { doc, commissionRate } = input
  const variants = input.variants.filter(variant => variant.status !== 'archived')
  const full = fullLanguages(doc)
  const blocking: PublishCheck[] = []
  const warnings: PublishCheck[] = []

  if (full.length === 0)
    blocking.push({ code: 'language', card: 'basics' })
  if (doc.media.length === 0)
    blocking.push({ code: 'photos', card: 'photos' })
  if (!variants.some(variant => variant.status === 'published'))
    blocking.push({ code: 'variant-for-sale', card: 'variants' })

  if (full.length === 1)
    warnings.push({ code: 'other-language', card: 'basics', language: full[0] === 'en' ? 'de' : 'en' })
  const unlabelled = unlabelledCount(input.options)
  if (unlabelled > 0)
    warnings.push({ code: 'option-labels', card: 'options', count: unlabelled })
  const hidden = variants.filter(variant => variant.status === 'draft')
  if (hidden.length > 0)
    warnings.push({ code: 'hidden', card: 'variants', count: hidden.length, codes: hidden.map(variant => variant.skuCode) })
  if (commissionRate === 0)
    warnings.push({ code: 'commission-zero', card: 'commission' })

  return { blocking, warnings }
}

// The same blocking checks as the gaps the API names when a publish is refused.
export function publishGaps(checks: PublishChecks): ('name' | 'photos' | 'variants')[] {
  const gaps: ('name' | 'photos' | 'variants')[] = []
  for (const check of checks.blocking) {
    const gap = check.code === 'language' ? 'name' : check.code === 'photos' ? 'photos' : 'variants'
    if (!gaps.includes(gap))
      gaps.push(gap)
  }
  return gaps
}
