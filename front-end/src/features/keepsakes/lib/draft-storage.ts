import type { ProductVariant } from '@sk/api-contract'
import type { KeepsakeText } from './keepsake-rules'
import type { OptionDraft } from './option-rules'

import { readSessionStored, removeSessionStored, writeSessionStored } from '@/lib/storage'
import { storedDescription } from './description-doc'

/** The steps of a new keepsake in the browser. */
export const DRAFT_STEPS = ['details', 'options', 'variants', 'review'] as const

export type DraftStep = (typeof DRAFT_STEPS)[number]

/** What a new keepsake holds before it is created, so a reload of the page does not lose it. Photos are held by id. */
export interface StoredDraft {
  value: KeepsakeText
  photoIds: string[]
  commission: number
  options: OptionDraft[]
  variants: ProductVariant[]
  step: DraftStep
  reached: number
}

const keyOf = (storeId: string) => `sk:new-keepsake:${storeId}`

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null

function isDraft(value: unknown): value is StoredDraft {
  return isRecord(value)
    && isRecord(value.value) && isRecord(value.value.name) && isRecord(value.value.text)
    && Array.isArray(value.photoIds) && typeof value.commission === 'number'
    && Array.isArray(value.options) && Array.isArray(value.variants)
    && DRAFT_STEPS.includes(value.step as DraftStep) && typeof value.reached === 'number'
}

/** A draft written before descriptions were rich text holds strings: they become paragraphs. */
function withDocuments(draft: StoredDraft): StoredDraft {
  const { text } = draft.value

  return { ...draft, value: { ...draft.value, text: { en: storedDescription(text.en), de: storedDescription(text.de) } } }
}

/** The draft this browser tab kept for the store, or nothing when there is none or it cannot be read. */
export function readDraft(storeId: string): StoredDraft | undefined {
  const raw = readSessionStored(keyOf(storeId))

  if (raw === undefined)
    return undefined
  try {
    const parsed: unknown = JSON.parse(raw)

    return isDraft(parsed) ? withDocuments(parsed) : undefined
  }
  catch {
    return undefined
  }
}

export function writeDraft(storeId: string, draft: StoredDraft) {
  writeSessionStored(keyOf(storeId), JSON.stringify(draft))
}

export function clearDraft(storeId: string) {
  removeSessionStored(keyOf(storeId))
}
