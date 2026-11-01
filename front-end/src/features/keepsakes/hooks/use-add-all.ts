import type { ProductOption, ProductVariant, VariantCreateBody } from '@sk/api-contract'
import type { Outcome } from './use-keepsake-editor'

import { useState } from 'react'

import { useLocale } from '@/contexts/locale-context'
import { mapLimit } from '@/lib/map-limit'
import { toRappen } from '../lib/keepsake-rules'
import { combinationName, suggestCode, variantRefusalText } from '../lib/option-rules'
import { problemMessageKey } from '../lib/problems'
import { ADD_ALL_CONFIRM_ABOVE, codeProblem, missingCombinations } from '../lib/variant-rules'

/** At most this many create requests at a time. */
const PARALLEL = 4

interface Summary { added: number, failed: { name: string, reason: string }[] }

/**
 * "Add all combinations": one price, and every combination no variant has yet is created, on sale, with the code
 * suggested the way a single add suggests it (ADR-017, ADR-027: an archived combination is taken). The creates run
 * four at a time; each answer updates the list. A code that is already used, here or by the server, and any other
 * refusal are collected in one summary; the variants that were added stay. Above 50 the first press asks.
 */
export function useAddAll({ options, variants, onCreate, onDone, onClose }: {
  options: ProductOption[]
  variants: ProductVariant[]
  onCreate: (body: VariantCreateBody) => Promise<Outcome>
  /** Called once every request has answered, before the form closes. */
  onDone?: () => void
  onClose: () => void
}) {
  const { t, language } = useLocale()
  const [price, setPrice] = useState<number>()
  const [tried, setTried] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [isPending, setIsPending] = useState(false)
  const [summary, setSummary] = useState<Summary>()
  const missing = missingCombinations(options, variants)
  const priceRappen = toRappen(price)
  const needsConfirm = missing.length > ADD_ALL_CONFIRM_ABOVE

  const reason = (outcome: Extract<Outcome, { ok: false }>, code: string, name: string) => {
    const first = outcome.refusals?.[0]

    if (outcome.type === 'sku-code-taken')
      return t('keepsakes.variant.codeTaken', { code })

    return first ? variantRefusalText(t, first, name) : t(problemMessageKey(outcome.type))
  }

  return {
    missing,
    price,
    needsConfirm,
    confirming,
    isPending,
    summary,
    priceError: tried && priceRappen === undefined ? t('keepsakes.variant.priceInvalid') : undefined,
    changePrice: (next: number | undefined) => {
      setConfirming(false)
      setPrice(next === undefined || Number.isNaN(next) ? undefined : next)
    },
    async submit() {
      setTried(true)
      setSummary(undefined)
      if (priceRappen === undefined || missing.length === 0)
        return
      if (needsConfirm && !confirming) {
        setConfirming(true)

        return
      }
      setConfirming(false)
      const failed: Summary['failed'] = []
      const planned: { body: VariantCreateBody, name: string }[] = []

      for (const values of missing) {
        const name = combinationName(values, options, language)
        const skuCode = suggestCode(values, options)

        if (codeProblem(skuCode, [...variants, ...planned.map(plan => plan.body)]))
          failed.push({ name, reason: t('keepsakes.variant.codeTaken', { code: skuCode }) })
        else
          planned.push({ name, body: { skuCode, priceRappen, status: 'published', values } })
      }
      setIsPending(true)
      const results = await mapLimit(planned, PARALLEL, plan => onCreate(plan.body))

      let added = 0

      results.forEach((result, index) => {
        const plan = planned[index]!

        if (result.status === 'fulfilled' && result.value.ok) {
          added++

          return
        }
        failed.push({ name: plan.name, reason: result.status === 'fulfilled' && !result.value.ok ? reason(result.value, plan.body.skuCode, plan.name) : t(problemMessageKey('unknown')) })
      })
      onDone?.()
      setIsPending(false)
      if (failed.length === 0)
        onClose()
      else
        setSummary({ added, failed })
    },
  }
}

export type AddAll = ReturnType<typeof useAddAll>
