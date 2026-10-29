import type { Media, Product, PublishCheck } from '@sk/api-contract'
import type { Language } from '@sk/domain/shared'
import type { MessageKey } from '@/i18n/en'

import { formatMoney } from '@sk/domain/shared'

/** What the editor holds while it is typed: a string for every language, empty when there is no text. */
export interface KeepsakeText {
  name: Record<Language, string>
  text: Record<Language, string>
}

export const LANGUAGES = ['en', 'de'] as const satisfies readonly Language[]
export const NAME_MAX = 90
export const TEXT_MAX = 1200
export const MAX_COMMISSION = 0.5
export const AUTOSAVE_MS = 1500

/** `skus_sku_code_check`: letters and digits joined by - _ or . */
const SKU_CODE = /^[A-Z0-9]+(?:[-_.][A-Z0-9]+)*$/i
const NOT_CODE = /[^A-Z0-9]+/g
const MARKS = /[\u0300-\u036F]/g
const EDGE_DASHES = /^-+|-+$/g

export type Translate = (key: MessageKey, params?: Record<string, string | number>) => string

export function textOf(value: { en?: string, de?: string }): Record<Language, string> {
  return { en: value.en ?? '', de: value.de ?? '' }
}

/** A language is full when its name and its text are both filled in (AC30). */
export function fullLanguages(value: KeepsakeText): Language[] {
  return LANGUAGES.filter(language => value.name[language].trim() !== '' && value.text[language].trim() !== '')
}

export type LanguageState = 'complete' | 'missing-text' | 'missing-name' | 'not-written'

export function languageState(value: KeepsakeText, language: Language): LanguageState {
  const hasName = value.name[language].trim() !== ''
  const hasText = value.text[language].trim() !== ''

  if (hasName && hasText)
    return 'complete'
  if (hasName)
    return 'missing-text'

  return hasText ? 'missing-name' : 'not-written'
}

/** The name in the reading language, else the other one; empty when neither is written. */
export function nameIn(name: { en?: string, de?: string }, language: Language): string {
  return name[language] || name[language === 'en' ? 'de' : 'en'] || ''
}

export function isSkuCode(code: string): boolean {
  return SKU_CODE.test(code)
}

/** A starting code from the name: "Victorinox Classic" gives "VICTORINOX-CLASSIC". */
export function suggestSkuCode(name: string): string {
  return name.toUpperCase().normalize('NFD').replace(MARKS, '').replace(NOT_CODE, '-').replace(EDGE_DASHES, '').slice(0, 24).replace(EDGE_DASHES, '')
}

export const chf = (rappen: number, locale: Parameters<typeof formatMoney>[1]) => formatMoney(rappen / 100, locale)

/** The price a merchant typed in francs as Rappen, or undefined when it is not above 0. */
export function toRappen(francs: number | undefined): number | undefined {
  if (francs === undefined || !Number.isFinite(francs) || francs <= 0)
    return undefined
  const rappen = Math.round(francs * 100)

  return rappen > 0 ? rappen : undefined
}

/** The smallest resized copy that is at least `width` wide, else the original; undefined until the file is ready. */
export function photoSrc(media: Pick<Media, 'publicUrl' | 'variants'>, width: number): string | undefined {
  const variant = [...media.variants].sort((a, b) => a.width - b.width).find(v => v.width >= width)

  return variant?.url ?? media.publicUrl ?? undefined
}

export type StatusTone = 'success' | 'warning' | 'neutral'

/** The keepsake's status as the screens say it. */
export function statusOf(keepsake: Pick<Product, 'status' | 'hasUnpublishedEdits'>): { tone: StatusTone, key: MessageKey } {
  if (keepsake.status === 'published')
    return keepsake.hasUnpublishedEdits ? { tone: 'warning', key: 'keepsakes.status.editsNotLive' } : { tone: 'success', key: 'keepsakes.status.published' }

  return { tone: 'neutral', key: 'keepsakes.status.draft' }
}

/** "{n} variants" ("1 variant"), and " · {k} sold out" when some are. */
export function variantSummary(t: Translate, variantCount: number, soldOutCount: number): string {
  const count = t(variantCount === 1 ? 'keepsakes.list.variants.one' : 'keepsakes.list.variants.other', { count: variantCount })

  return soldOutCount > 0 ? `${count}${t('keepsakes.list.soldOut', { count: soldOutCount })}` : count
}

/** The text of a publish check, from the API's code and numbers. */
export function checkText(t: Translate, check: PublishCheck): string {
  const codes = check.codes ?? []

  switch (check.code) {
    case 'language': return t('keepsakes.check.language')
    case 'photos': return t('keepsakes.check.photos')
    case 'variant-for-sale': return t('keepsakes.check.variantForSale')
    case 'other-language': {
      const other = check.language ?? 'de'

      return t('keepsakes.check.otherLanguage', { language: t(`keepsakes.language.${other}`), reader: t(`keepsakes.language.${other === 'en' ? 'de' : 'en'}`) })
    }
    case 'hidden':
      return t(codes.length === 1 ? 'keepsakes.check.hidden.one' : 'keepsakes.check.hidden.other', { count: check.count ?? codes.length, codes: codes.join(', ') })
    case 'commission-zero': return t('keepsakes.check.commissionZero')
    case 'option-labels': return t((check.count ?? 0) === 1 ? 'keepsakes.check.optionLabels.one' : 'keepsakes.check.optionLabels.other', { count: check.count ?? 0 })
  }
}
