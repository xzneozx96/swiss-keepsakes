import type { Localized, OptionInput, OptionsSave, Product, ProductOption, ProductVariant, Refusal, VariantInput } from '../ports.ts'
import { hasText } from '@sk/domain/content'

// The rules of section 7 of the keepsake design, as pure functions. The database holds the same rules as its backstop
// (migration 0010: the completeness trigger, skus_combination_key); these run first, so a refusal names the variants.

const MAX_CODES_NAMED = 3

export const labelOf = (text: Localized): string => text.en || text.de || ''

interface Valued {
  skuCode: string
  status?: string
  values: Record<string, string>
}

function usersOf(variants: ProductVariant[], optionId: string, valueId?: string): ProductVariant[] {
  return variants.filter(variant => (valueId === undefined ? variant.values[optionId] !== undefined : variant.values[optionId] === valueId))
}

// "Used by 2 variants (A, B)": the first three codes, the number of all of them.
function usedBy(users: ProductVariant[]): Record<string, string | number> {
  return { count: users.length, codes: users.slice(0, MAX_CODES_NAMED).map(user => user.skuCode).join(', '), more: Math.max(0, users.length - MAX_CODES_NAMED) }
}

// The options as a client names them: a name and a label in at least one language, at least one value, and every ref
// once. It does not look at variants.
export function checkOptionDefinitions(options: OptionInput[], base = 'options'): Refusal[] {
  const refusals: Refusal[] = []
  const seen = new Set<string>()
  const once = (ref: string, path: string) => {
    if (seen.has(ref))
      refusals.push({ code: 'refs-invalid', path })
    seen.add(ref)
  }

  for (const option of options) {
    once(option.ref, `${base}.${option.ref}`)
    if (!hasText(option.name))
      refusals.push({ code: 'option-name-required', path: `${base}.${option.ref}.name` })
    if (option.values.length === 0)
      refusals.push({ code: 'option-needs-value', path: `${base}.${option.ref}`, params: { option: labelOf(option.name) } })
    for (const value of option.values) {
      once(value.ref, `${base}.${option.ref}.values.${value.ref}`)
      if (!hasText(value.label))
        refusals.push({ code: 'value-name-required', path: `${base}.${option.ref}.values.${value.ref}` })
    }
  }

  return refusals
}

// A variant's values against the options, in ref space. A value of a missing or foreign option, or a missing value, is a
// refusal; a twin among `others` (archived ones too: the unique key ignores the status) is `combination-taken`.
export function checkVariantValues(options: Pick<ProductOption, 'id' | 'name' | 'values'>[], others: Valued[], values: Record<string, string>, path: string, code = ''): Refusal[] {
  if (options.length === 0) {
    const [other] = others

    return other ? [{ code: 'no-options-one-variant', path, params: { code: other.skuCode } }] : []
  }
  const refusals: Refusal[] = []

  for (const option of options) {
    const value = values[option.id]

    if (value === undefined)
      refusals.push({ code: 'values-missing', path: `${path}.${option.id}`, params: { code, option: labelOf(option.name) } })
    else if (!option.values.some(v => v.id === value))
      refusals.push({ code: 'value-unknown', path: `${path}.${option.id}`, params: { option: labelOf(option.name) } })
  }
  for (const key of Object.keys(values)) {
    if (!options.some(option => option.id === key))
      refusals.push({ code: 'value-unknown', path: `${path}.${key}` })
  }
  if (refusals.length === 0) {
    const twin = others.find(other => options.every(option => other.values[option.id] === values[option.id]))

    if (twin)
      refusals.push({ code: 'combination-taken', path, params: { code: twin.skuCode, archived: twin.status === 'archived' ? 1 : 0 } })
  }

  return refusals
}

// Can these options be saved with the variants' new values, in one save? `product` is the keepsake as it is now.
// A removed option or value that a variant uses is refused, and so is a variant that ends up without a value of
// an option or on the same combination as another (archived variants count in every check).
export function checkOptionsSave(product: Pick<Product, 'options' | 'variants'>, input: OptionsSave): Refusal[] {
  const refusals = checkOptionDefinitions(input.options)
  const existingOptions = new Map(product.options.map(option => [option.id, option]))
  const existingValueOwner = new Map(product.options.flatMap(option => option.values.map(value => [value.id, option.id] as const)))

  for (const option of input.options) {
    const isNew = !existingOptions.has(option.ref)

    for (const value of option.values) {
      const owner = existingValueOwner.get(value.ref)

      if (owner !== undefined && (isNew || owner !== option.ref))
        refusals.push({ code: 'refs-invalid', path: `options.${option.ref}.values.${value.ref}` })
    }
  }

  const kept = new Map(input.options.map(option => [option.ref, option]))

  for (const option of product.options) {
    const next = kept.get(option.id)

    if (!next) {
      const users = usersOf(product.variants, option.id)

      if (users.length > 0)
        refusals.push({ code: 'option-in-use', path: `options.${option.id}`, params: { option: labelOf(option.name), ...usedBy(users) } })
      continue
    }
    for (const value of option.values.filter(v => !next.values.some(n => n.ref === v.id))) {
      const users = usersOf(product.variants, option.id, value.id)

      if (users.length > 0)
        refusals.push({ code: 'value-in-use', path: `options.${option.id}.values.${value.id}`, params: { value: labelOf(value.label), ...usedBy(users) } })
    }
  }

  const known = new Set(product.variants.map(variant => variant.id))

  for (const entry of input.variantValues) {
    if (!known.has(entry.variantId))
      refusals.push({ code: 'refs-invalid', path: `variantValues.${entry.variantId}` })
  }

  const overrides = new Map(input.variantValues.map(entry => [entry.variantId, entry.values]))
  const finals: { variant: ProductVariant, values: Record<string, string>, complete: boolean }[] = []

  for (const variant of product.variants) {
    const given = overrides.get(variant.id) ?? {}
    const values: Record<string, string> = {}
    let complete = true

    for (const option of input.options) {
      const path = `variants.${variant.id}.values.${option.ref}`
      const override = given[option.ref]
      const value = override ?? (existingOptions.has(option.ref) ? variant.values[option.ref] : undefined)

      if (value === undefined) {
        complete = false
        refusals.push({ code: 'values-missing', path, params: { code: variant.skuCode, option: labelOf(option.name) } })
      }
      else if (!option.values.some(v => v.ref === value)) {
        complete = false
        // A kept value that was removed is already refused as value-in-use; a value the client just named is not known.
        if (override !== undefined)
          refusals.push({ code: 'value-unknown', path, params: { option: labelOf(option.name) } })
      }
      else {
        values[option.ref] = value
      }
    }
    finals.push({ variant, values, complete })
  }

  const seen = new Map<string, ProductVariant>()

  for (const { variant, values, complete } of finals) {
    if (!complete)
      continue
    const key = input.options.map(option => `${option.ref}:${values[option.ref]}`).join(',')
    const twin = seen.get(key)

    if (twin)
      refusals.push({ code: 'combination-duplicate', path: `variants.${variant.id}`, params: { code: variant.skuCode, twin: twin.skuCode } })
    else
      seen.set(key, variant)
  }

  return refusals
}

// A new keepsake's options and variants, in ref space. Every variant has one value of each option, no two share a
// combination or a code, and a keepsake with no option has exactly one variant.
export function checkNewProduct(options: OptionInput[], variants: VariantInput[]): Refusal[] {
  const refusals = checkOptionDefinitions(options)
  const pseudo: ProductOption[] = options.map(option => ({
    id: option.ref,
    name: option.name,
    values: option.values.map(value => ({ id: value.ref, label: value.label, swatch: value.swatch })),
  }))

  variants.forEach((variant, index) => {
    refusals.push(...checkVariantValues(pseudo, variants.slice(0, index), variant.values, `variants.${index}.values`, variant.skuCode))
    if (variants.slice(0, index).some(other => other.skuCode.toLowerCase() === variant.skuCode.toLowerCase()))
      refusals.push({ code: 'code-duplicate', path: `variants.${index}.skuCode`, params: { code: variant.skuCode } })
  })

  return refusals
}
