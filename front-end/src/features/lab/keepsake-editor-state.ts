import type { Keepsake, ProductOption, Sku } from './keepsake-editor-data'
import type { OptionsProblem, SkuErrors } from './keepsake-editor-rules'
import type { LabState } from './keepsake-editor-search-params'

import { useEffect, useRef, useState } from 'react'

import { HOLDS, victorinox } from './keepsake-editor-data'
import { hasErrors, optionsProblems, publishChecks, skuErrors, stockError } from './keepsake-editor-rules'

/** The Victorinox keepsake as a lab state opens it. */
function initialVictorinox(state: LabState): Keepsake {
  const p = victorinox()

  if (state === 'blocked') {
    // A draft with only an English name: language and photo stop publishing.
    return { ...p, status: 'draft', text: { en: '', de: '' }, name: { en: p.name.en, de: '' }, photos: [] }
  }

  return p
}

export type SaveState = 'saved' | 'unsaved' | 'saving'

/** Name, text, media and commission save themselves this long after the last edit (as M17). */
export const AUTOSAVE_MS = 1500
export const SAVE_MS = 700

const clock = () => new Date().toLocaleTimeString('en-CH', { hour: '2-digit', minute: '2-digit' })

/**
 * The shop's keepsakes in memory, for one lab frame. Two kinds of write, as in M17:
 *
 * - Name, text, media and commission autosave 1.5 s after the last edit (the product draft).
 * - Structure saves at once, whole or refused: one variant, the options with every variant's new
 *   values (sheets N14 and N15 with Save and Cancel), stock (`inventory.setOnHand`, never below held).
 */
export function useCatalog(state: LabState) {
  const [products, setProducts] = useState<Keepsake[]>(() => [initialVictorinox(state)])
  const [save, setSave] = useState<SaveState>(state === 'unsaved' ? 'unsaved' : 'saved')
  const [savedAt, setSavedAt] = useState('10:42')
  const timerRef = useRef<number | undefined>(undefined)
  const commitSave = () => {
    window.clearTimeout(timerRef.current)
    setSave('saving')
    timerRef.current = window.setTimeout(() => {
      setSave('saved')
      setSavedAt(clock())
    }, SAVE_MS)
  }
  const schedule = () => {
    setSave('unsaved')
    window.clearTimeout(timerRef.current)
    timerRef.current = window.setTimeout(commitSave, AUTOSAVE_MS)
  }

  useEffect(() => () => window.clearTimeout(timerRef.current), [])
  const update = (id: string, change: (p: Keepsake) => Keepsake) => setProducts(ps => ps.map(p => (p.id === id ? change(p) : p)))
  const codesOutside = (id: string) => new Set(products.filter(p => p.id !== id).flatMap(p => p.skus.map(s => s.code.toUpperCase())))

  /** Everything the screens do to one product. */
  const forProduct = (id: string) => {
    const product = products.find(p => p.id === id) ?? products[0]!
    const touched = (p: Keepsake) => ({ ...p, editsNotLive: p.status === 'published' })

    return {
      product,
      checks: publishChecks(product),
      save,
      savedAt,
      /** Name and text, photos, commission: the draft, autosaved. */
      patch: (next: Partial<Pick<Keepsake, 'name' | 'text' | 'photos' | 'commissionRate'>>) => {
        update(product.id, p => touched({ ...p, ...next }))
        schedule()
      },
      /** Adds or replaces one variant; refused with its errors. */
      saveSku: (sku: Sku): SkuErrors => {
        const errors = skuErrors(sku, product, codesOutside(product.id))

        if (!hasErrors(errors)) {
          update(product.id, p => ({
            ...p,
            skus: p.skus.some(s => s.id === sku.id) ? p.skus.map(s => (s.id === sku.id ? { ...sku, isNew: false } : s)) : [...p.skus, { ...sku, isNew: false }],
          }))
        }

        return errors
      },
      /** For sale, hidden or archived. Archiving keeps the variant for old orders; refused while units are held. */
      setSkuStatus: (skuId: string, status: Sku['status']): string | undefined => {
        const sku = product.skus.find(s => s.id === skuId)

        if (sku && status === 'archived' && sku.held > 0)
          return `${sku.held} ${sku.held === 1 ? 'unit is' : 'units are'} reserved by open orders. Archive it once they are handed over or released.`
        update(product.id, p => ({ ...p, skus: p.skus.map(s => (s.id === skuId ? { ...s, status } : s)) }))

        return undefined
      },
      /** N14: the options with every variant's values, in one save; refused with its problems. */
      saveOptions: (options: ProductOption[], skus: Sku[]): OptionsProblem[] => {
        const problems = optionsProblems(options, skus)

        if (!problems.length)
          update(product.id, p => ({ ...p, options, skus }))

        return problems
      },
      publish: () => {
        window.clearTimeout(timerRef.current)
        update(product.id, p => ({ ...p, status: 'published', editsNotLive: false }))
        setSave('saved')
        setSavedAt(clock())
      },
      unpublish: () => update(product.id, p => ({ ...p, status: 'draft', editsNotLive: false })),
    }
  }

  /** Stock is the inventory's write, by SKU, applied at once; refused below held. */
  const setStock = (skuId: string, onHand: number): string | undefined => {
    const sku = products.flatMap(p => p.skus).find(s => s.id === skuId)
    const error = sku ? stockError(onHand, sku.held) : 'Not found.'

    if (!error)
      setProducts(ps => ps.map(p => ({ ...p, skus: p.skus.map(s => (s.id === skuId ? { ...s, onHand } : s)) })))

    return error
  }

  return {
    products,
    holds: HOLDS,
    forProduct,
    setStock,
    /** The product and variant of a SKU id. */
    findSku: (skuId: string) => {
      const product = products.find(p => p.skus.some(s => s.id === skuId))

      return product ? { product, sku: product.skus.find(s => s.id === skuId)! } : undefined
    },
    codesOutside,
    create: (product: Keepsake) => setProducts(ps => [...ps, product]),
  }
}

export type Catalog = ReturnType<typeof useCatalog>
export type ProductModel = ReturnType<Catalog['forProduct']>
