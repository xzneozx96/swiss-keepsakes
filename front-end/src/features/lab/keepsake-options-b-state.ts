/** The new variant the three variant designs (B1 to B3) share: the chosen values, code, price and status, and what stops a create. */
import type { ProductId, Scenario, Variant } from './keepsake-options-data'

import { useState } from 'react'

import { keepsakes } from './keepsake-options-data'
import { combinationName, isCode, isComplete, labelOf, suggestCode, takenText, variantAt } from './keepsake-options-rules'

export interface VariantErrors { values?: string, code?: string, price?: string }

function seedValues(product: ProductId, scenario: Scenario): Record<string, string> {
  const first = keepsakes[product].variants[0]

  // "Taken": the first sold combination, picked again.
  return scenario === 'taken' && first ? { ...first.values } : {}
}

export function useVariantDraft(product: ProductId, scenario: Scenario) {
  const { options, prefix } = keepsakes[product]
  const [variants, setVariants] = useState<Variant[]>(keepsakes[product].variants)
  const [values, setValues] = useState(() => seedValues(product, scenario))
  const [typedCode, setTypedCode] = useState<string>()
  const [price, setPrice] = useState<number | undefined>(() => (scenario === 'taken' ? 29 : undefined))
  const [status, setStatus] = useState<Variant['status']>('published')
  const [tried, setTried] = useState(false)
  const [notice, setNotice] = useState('')

  const complete = isComplete(options, values)
  const twin = complete ? variantAt(variants, options, values) : undefined
  const suggestion = complete ? suggestCode(prefix, values, options) : ''
  // The code follows the choice until the merchant types one.
  const code = (typedCode ?? suggestion).trim()
  const noOptions = options.length === 0
  const blocked = noOptions && variants.length > 0

  const errors: VariantErrors = {}

  if (!noOptions && !complete)
    errors.values = `Choose ${options.map(option => `a ${labelOf(option.name).toLowerCase()}`).join(' and ')}.`
  else if (twin)
    errors.values = takenText(combinationName(values, options), twin.code)
  if (!code)
    errors.code = 'Enter a SKU code.'
  else if (!isCode(code))
    errors.code = 'Use capital letters, digits and dashes only.'
  else if (variants.some(variant => variant.code === code))
    errors.code = `${code} belongs to another variant.`
  if (price === undefined || price < 0 || Number.isNaN(price))
    errors.price = 'Enter a price in CHF.'

  return {
    options,
    variants,
    values,
    code,
    typedCode,
    suggestion,
    price,
    status,
    complete,
    twin,
    noOptions,
    blocked,
    notice,
    tried,
    /** The values problem shows live (it is information); the rest waits for a refused create. */
    shown: { values: complete && twin ? errors.values : tried ? errors.values : undefined, code: tried ? errors.code : undefined, price: tried ? errors.price : undefined } as VariantErrors,
    free: options.length > 0 && variants.length < options.reduce((n, option) => n * option.values.length, 1),

    setValue(optionRef: string, valueRef: string | undefined) {
      setValues((current) => {
        const next = { ...current }

        if (valueRef === undefined)
          delete next[optionRef]
        else
          next[optionRef] = valueRef

        return next
      })
      setNotice('')
    },
    setValues(next: Record<string, string>) {
      setValues(next)
      setNotice('')
    },
    setCode: (next: string) => setTypedCode(next.toUpperCase()),
    setPrice,
    setStatus,
    /** True and reset when created. `sticky` keeps the price, status and all but the last option, to add the next one fast. */
    create(sticky = false) {
      setTried(true)
      if (blocked || errors.values || errors.code || errors.price)
        return false
      const created: Variant = { id: `new-variant-${variants.length + 1}`, code, price: price!, status, stock: 0, values: { ...values } }

      setVariants(current => [...current, created])
      setNotice(`${code} created, 0 in stock. Set its stock in Inventory.`)
      setTried(false)
      setTypedCode(undefined)
      if (sticky) {
        const last = options.at(-1)

        setValues((current) => {
          const next = { ...current }

          if (last)
            delete next[last.ref]

          return next
        })
      }
      else {
        setValues({})
        setPrice(undefined)
        setStatus('published')
      }

      return true
    },
    reset() {
      setValues({})
      setTypedCode(undefined)
      setPrice(undefined)
      setStatus('published')
      setTried(false)
    },
  }
}

export type VariantDraft = ReturnType<typeof useVariantDraft>
