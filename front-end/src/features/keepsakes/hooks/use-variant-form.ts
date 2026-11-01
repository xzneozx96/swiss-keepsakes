import type { ProductOption, ProductVariant, VariantCreateBody, VariantSaveBody } from '@sk/api-contract'
import type { Outcome } from './use-keepsake-editor'

import { useState } from 'react'

import { useLocale } from '@/contexts/locale-context'
import { toRappen } from '../lib/keepsake-rules'
import { checkVariantValues, combinationName, suggestCode, variantRefusalText } from '../lib/option-rules'
import { problemMessageKey } from '../lib/problems'
import { codeProblem, findTwin, isComplete, missingCombinations } from '../lib/variant-rules'

/** Nothing open, a new variant, "all" (the Add all combinations form), or a variant id. */
export type Editing = null | 'new' | 'all' | string

interface Form {
  values: Record<string, string>
  /** Undefined while the code follows the suggestion. */
  typedCode?: string
  /** In francs, as typed. */
  price?: number
  status: 'published' | 'draft'
}

const EMPTY: Form = { values: {}, status: 'published' }

const formOf = (variant: ProductVariant): Form => ({ values: { ...variant.values }, typedCode: variant.skuCode, price: variant.priceRappen / 100, status: variant.status === 'draft' ? 'draft' : 'published' })

/**
 * The one variant being created or edited in the Variants step, and what the rules say about it (ADR-017, ADR-027).
 * `variants` is every variant, archived ones too: an archived combination stays taken. A twin shows at once, since it is
 * information; the other problems wait for a save that was tried. The same hook serves a saved keepsake (the commands
 * call the API) and a new one (they change the draft in the browser).
 */
export function useVariantForm({ options, variants, codeFallback, onCreate, onSave }: {
  options: ProductOption[]
  variants: ProductVariant[]
  /** The code offered when the keepsake has no option, so the values cannot make one. */
  codeFallback: string
  onCreate: (body: VariantCreateBody) => Promise<Outcome>
  onSave: (variantId: string, body: VariantSaveBody) => Promise<Outcome>
}) {
  const { t, language } = useLocale()
  const [editing, setEditing] = useState<Editing>(null)
  const [form, setForm] = useState<Form>(EMPTY)
  const [tried, setTried] = useState(false)
  const [server, setServer] = useState<{ values?: string, code?: string, failure?: string }>({})
  const [isPending, setIsPending] = useState(false)

  const live = variants.filter(variant => variant.status !== 'archived')
  const archived = variants.filter(variant => variant.status === 'archived')
  const current = editing && editing !== 'new' && editing !== 'all' ? variants.find(variant => variant.id === editing) : undefined
  const others = variants.filter(variant => variant.id !== current?.id)
  const possible = options.reduce((total, option) => total * option.values.length, 1)
  const complete = isComplete(options, form.values)
  const twin = findTwin(options, others, form.values)
  const suggestion = options.length === 0 ? codeFallback : complete ? suggestCode(form.values, options) : ''
  const code = (form.typedCode ?? suggestion).trim()
  const combination = combinationName(form.values, options, language)
  const refusals = checkVariantValues(options, others, form.values, 'values', code)
  const codeIssue = codeProblem(code, others)
  const priceRappen = toRappen(form.price)

  const shownValues = server.values ?? (twin || tried ? (refusals[0] ? variantRefusalText(t, refusals[0], combination) : undefined) : undefined)
  const shownCode = server.code ?? (tried && codeIssue ? t(codeIssue === 'required' ? 'keepsakes.variant.codeRequired' : codeIssue === 'invalid' ? 'keepsakes.variant.codeInvalid' : 'keepsakes.variant.codeTaken', { code }) : undefined)
  const shownPrice = tried && priceRappen === undefined ? t('keepsakes.variant.priceInvalid') : undefined

  const open = (target: Editing) => {
    setTried(false)
    setServer({})
    setEditing(target)
    const variant = target && target !== 'new' && target !== 'all' ? variants.find(v => v.id === target) : undefined

    setForm(variant ? formOf(variant) : EMPTY)
  }
  const patch = (change: Partial<Form>) => {
    setServer({})
    setForm(f => ({ ...f, ...change }))
  }

  return {
    options,
    editing,
    current,
    form,
    live,
    archived,
    possible,
    code,
    suggestion,
    twin,
    /** The clashing variant when it can be opened (it is not archived). */
    openable: twin && twin.status !== 'archived' ? twin : undefined,
    complete,
    combination,
    canCreate: variants.length < possible,
    /** Combinations no variant has yet, archived ones counted as taken. */
    missing: missingCombinations(options, variants),
    isPending,
    shown: { values: shownValues, code: shownCode, price: shownPrice },
    failure: server.failure,
    /** The live variant a value would collide with, once the other options are chosen. */
    soldWith: (optionId: string, valueId: string) => findTwin(options, others, { ...form.values, [optionId]: valueId }),
    open,
    close: () => open(null),
    setValue: (optionId: string, valueId: string) => patch({ values: { ...form.values, [optionId]: valueId } }),
    setCode: (next: string) => patch({ typedCode: next.toUpperCase() }),
    setPrice: (next: number | undefined) => patch({ price: next === undefined || Number.isNaN(next) ? undefined : next }),
    setStatus: (status: Form['status']) => patch({ status }),
    /** Creates or saves. Problems stay on the form; it closes when the save worked. */
    async submit() {
      setTried(true)
      setServer({})
      if (refusals.length > 0 || codeIssue || priceRappen === undefined)
        return
      setIsPending(true)
      const body = { skuCode: code, priceRappen, status: form.status, ...(options.length > 0 && { values: form.values }) }
      const outcome = current ? await onSave(current.id, body) : await onCreate(body)

      setIsPending(false)
      if (outcome.ok) {
        open(null)

        return
      }
      const first = outcome.refusals?.[0]

      if (outcome.type === 'sku-code-taken')
        setServer({ code: t('keepsakes.variant.codeTaken', { code }) })
      else if (first)
        setServer({ values: variantRefusalText(t, first, combination) })
      else
        setServer({ failure: t(problemMessageKey(outcome.type)) })
    },
  }
}

export type VariantForm = ReturnType<typeof useVariantForm>
