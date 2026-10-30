import {
  MAX_OPTIONS,
  MAX_VALUES,
  MAX_VARIANTS,
  OPTION_NAME_MAX,
  optionsSaveBodySchema,
  productCreateBodySchema,
  VALUE_LABEL_MAX,
  variantCreateBodySchema,
  variantSaveBodySchema,
} from '@sk/api-contract'
import { describe, expect, it } from 'vitest'

const uuid = (n: number) => `3f1c1d0e-8a57-4c0e-9b8e-${String(n).padStart(12, '0')}`
const value = (n: number, label = `Value ${n}`) => ({ ref: `v${n}`, label: { en: label } })
const option = (n: number, over: object = {}) => ({ ref: `o${n}`, name: { en: `Option ${n}` }, values: [value(1)], ...over })
const variant = (n: number) => ({ skuCode: `VX-${n}`, priceRappen: 100 })
const create = (over: object) => ({ name: { en: 'Knife' }, variants: [variant(1)], ...over })
const accepts = (schema: { safeParse: (input: unknown) => { success: boolean } }, input: unknown) => schema.safeParse(input).success

describe('[E6.2][AC52] the input limits of the options contract', () => {
  it('[E6.2][AC52] an option list holds MAX_OPTIONS options and refuses one more, on create and on the options save', () => {
    const fits = Array.from({ length: MAX_OPTIONS }, (_, n) => option(n))
    const over = Array.from({ length: MAX_OPTIONS + 1 }, (_, n) => option(n))

    expect(accepts(productCreateBodySchema, create({ options: fits }))).toBe(true)
    expect(accepts(productCreateBodySchema, create({ options: over }))).toBe(false)
    expect(accepts(optionsSaveBodySchema, { options: fits })).toBe(true)
    expect(accepts(optionsSaveBodySchema, { options: over })).toBe(false)
  })

  it('[E6.2][AC52] an option holds MAX_VALUES values and refuses one more', () => {
    const values = (count: number) => Array.from({ length: count }, (_, n) => value(n))

    expect(accepts(optionsSaveBodySchema, { options: [option(1, { values: values(MAX_VALUES) })] })).toBe(true)
    expect(accepts(optionsSaveBodySchema, { options: [option(1, { values: values(MAX_VALUES + 1) })] })).toBe(false)
    expect(accepts(productCreateBodySchema, create({ options: [option(1, { values: values(MAX_VALUES + 1) })] }))).toBe(false)
  })

  it('[E6.2][AC52] a create body holds MAX_VARIANTS variants, at least one, and refuses one more', () => {
    const variants = (count: number) => Array.from({ length: count }, (_, n) => variant(n))

    expect(accepts(productCreateBodySchema, create({ variants: variants(MAX_VARIANTS) }))).toBe(true)
    expect(accepts(productCreateBodySchema, create({ variants: variants(MAX_VARIANTS + 1) }))).toBe(false)
    expect(accepts(productCreateBodySchema, create({ variants: [] }))).toBe(false)
  })

  it('[E6.2][AC52] an options save names the values of MAX_VARIANTS variants and refuses one more', () => {
    const entries = (count: number) => Array.from({ length: count }, (_, n) => ({ variantId: uuid(n), values: { o1: 'v1' } }))

    expect(accepts(optionsSaveBodySchema, { options: [], variantValues: entries(MAX_VARIANTS) })).toBe(true)
    expect(accepts(optionsSaveBodySchema, { options: [], variantValues: entries(MAX_VARIANTS + 1) })).toBe(false)
  })

  it('[E6.2][AC52] an option name holds OPTION_NAME_MAX characters in each language and refuses one more', () => {
    const named = (en: string, de?: string) => ({ options: [option(1, { name: { en, de } })] })

    expect(accepts(optionsSaveBodySchema, named('a'.repeat(OPTION_NAME_MAX), 'b'.repeat(OPTION_NAME_MAX)))).toBe(true)
    expect(accepts(optionsSaveBodySchema, named('a'.repeat(OPTION_NAME_MAX + 1)))).toBe(false)
    expect(accepts(optionsSaveBodySchema, named('a', 'b'.repeat(OPTION_NAME_MAX + 1)))).toBe(false)
    expect(accepts(productCreateBodySchema, create({ options: [option(1, { name: { en: 'a'.repeat(OPTION_NAME_MAX + 1) } })] }))).toBe(false)
  })

  it('[E6.2][AC52] a value label holds VALUE_LABEL_MAX characters in each language and refuses one more', () => {
    const labelled = (label: object) => ({ options: [option(1, { values: [{ ref: 'v1', label }] })] })

    expect(accepts(optionsSaveBodySchema, labelled({ en: 'a'.repeat(VALUE_LABEL_MAX), de: 'b'.repeat(VALUE_LABEL_MAX) }))).toBe(true)
    expect(accepts(optionsSaveBodySchema, labelled({ en: 'a'.repeat(VALUE_LABEL_MAX + 1) }))).toBe(false)
    expect(accepts(optionsSaveBodySchema, labelled({ de: 'b'.repeat(VALUE_LABEL_MAX + 1) }))).toBe(false)
    expect(accepts(productCreateBodySchema, create({ options: [option(1, { values: [value(1, 'a'.repeat(VALUE_LABEL_MAX + 1))] })] }))).toBe(false)
  })

  it('[E6.2][AC52] a variant\'s values name at most MAX_OPTIONS options', () => {
    const refs = (count: number) => Object.fromEntries(Array.from({ length: count }, (_, n) => [`o${n}`, 'v1']))
    const ids = (count: number) => Object.fromEntries(Array.from({ length: count }, (_, n) => [uuid(n), uuid(100 + n)]))

    expect(accepts(productCreateBodySchema, create({ variants: [{ ...variant(1), values: refs(MAX_OPTIONS) }] }))).toBe(true)
    expect(accepts(productCreateBodySchema, create({ variants: [{ ...variant(1), values: refs(MAX_OPTIONS + 1) }] }))).toBe(false)
    expect(accepts(optionsSaveBodySchema, { options: [], variantValues: [{ variantId: uuid(1), values: refs(MAX_OPTIONS + 1) }] })).toBe(false)
    expect(accepts(variantCreateBodySchema, { ...variant(1), values: ids(MAX_OPTIONS) })).toBe(true)
    expect(accepts(variantCreateBodySchema, { ...variant(1), values: ids(MAX_OPTIONS + 1) })).toBe(false)
    expect(accepts(variantSaveBodySchema, { values: ids(MAX_OPTIONS + 1) })).toBe(false)
  })
})
