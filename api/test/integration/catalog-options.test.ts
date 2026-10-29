import { randomUUID } from 'node:crypto'
import { afterAll, describe, expect, it, vi } from 'vitest'
import { createCatalogHttp } from './catalog-http.ts'
import { openTestDatabase } from './support.ts'

// Every sign-in is two round trips and several statements, which is slow against a Neon branch.
vi.setConfig({ testTimeout: 120_000, hookTimeout: 120_000 })

const testDatabase = openTestDatabase()
const { pool } = testDatabase

afterAll(async () => {
  await pool.end()
})

const env = createCatalogHttp(testDatabase)

const code = () => `VX-${randomUUID().slice(0, 8).toUpperCase()}`

interface Option { id: string, name: { en?: string, de?: string }, values: { id: string, label: { en?: string, de?: string }, swatch: string | null }[] }
interface Variant { id: string, skuCode: string, priceRappen: number, status: string, values: Record<string, string> }
interface View {
  id: string
  options: Option[]
  variants: Variant[]
  warnings: { code: string, count?: number }[]
  rowVersion: number
}
interface Problem { type: string, status: number, errors?: { path: string, code?: string, params?: Record<string, string | number>, message: string }[] }

const sizeOption = { ref: 'size', name: { en: 'Size', de: 'Grösse' }, values: [{ ref: 's', label: { en: 'Small', de: 'Klein' } }, { ref: 'l', label: { en: 'Large', de: 'Gross' } }] }
const themeOption = { ref: 'theme', name: { en: 'Theme' }, values: [{ ref: 'swan', label: { en: 'Swan' } }, { ref: 'lion', label: { en: 'Lion' } }] }

let sharedStore: ReturnType<typeof env.storeWithStaff> | undefined

async function setup(options: { fresh?: boolean } = {}) {
  const store = await (options.fresh ? env.storeWithStaff() : (sharedStore ??= env.storeWithStaff()))
  const photo = await env.readyPhoto(store.storeId)
  const { call, products, owner, manager } = { call: env.call, ...store }
  const create = (body: object) => call(products, {
    method: 'POST',
    headers: owner.headers,
    body: { name: { en: 'Victorinox Classic' }, text: { en: 'A Swiss knife.' }, photoIds: [photo], ...body },
  })
  // A keepsake with Size and Theme and the four combinations, as the create flow sends them.
  const withOptions = async (): Promise<View> => {
    const response = await create({
      options: [sizeOption, themeOption],
      variants: [
        { skuCode: code(), priceRappen: 3900, values: { size: 's', theme: 'swan' } },
        { skuCode: code(), priceRappen: 3900, values: { size: 'l', theme: 'swan' } },
        { skuCode: code(), priceRappen: 4900, values: { size: 's', theme: 'lion' } },
        { skuCode: code(), priceRappen: 4900, values: { size: 'l', theme: 'lion' } },
      ],
    })
    expect(response.status).toBe(201)
    return await response.json() as View
  }
  const plain = async (): Promise<View> => {
    const response = await create({ variants: [{ skuCode: code(), priceRappen: 3900 }] })
    expect(response.status).toBe(201)
    return await response.json() as View
  }
  const get = async (id: string) => await (await call(`${products}/${id}`, { headers: owner.headers })).json() as View
  const putOptions = (id: string, ifMatch: string | number | null, body: object, headers = owner.headers) =>
    call(`${products}/${id}/options`, { method: 'PUT', headers: { ...headers, ...(ifMatch === null ? {} : { 'If-Match': String(ifMatch) }) }, body })
  const postVariant = (id: string, body: object, headers = owner.headers) => call(`${products}/${id}/variants`, { method: 'POST', headers, body })
  const patchVariant = (id: string, skuId: string, body: object, headers = owner.headers) => call(`${products}/${id}/variants/${skuId}`, { method: 'PATCH', headers, body })
  return { ...store, manager, photo, create, withOptions, plain, get, putOptions, postVariant, patchVariant, call }
}

// The options as the editor sends them back: the existing ids as refs.
const asInput = (options: Option[]) => options.map(option => ({
  ref: option.id,
  name: option.name,
  values: option.values.map(value => ({ ref: value.id, label: value.label, swatch: value.swatch })),
}))

describe('[E6.2][AC52] creating a keepsake with options', () => {
  it('[E6.2][AC52] makes the options, their values in order, and a variant with one value of each option', async () => {
    const { withOptions } = await setup()

    const product = await withOptions()

    expect(product.options.map(o => o.name.en)).toEqual(['Size', 'Theme'])
    expect(product.options[0]!.values.map(v => v.label.en)).toEqual(['Small', 'Large'])
    expect(product.options[0]!.name.de).toBe('Grösse')
    expect(product.options[1]!.name.de).toBeUndefined()
    expect(product.variants).toHaveLength(4)
    for (const variant of product.variants)
      expect(Object.keys(variant.values).sort()).toEqual(product.options.map(o => o.id).sort())
    const keys = await pool.query<{ combination_key: string }>(`select combination_key from catalog.skus where product_id = $1`, [product.id])
    expect(new Set(keys.rows.map(row => row.combination_key)).size).toBe(4)
  })

  it('[E6.2][AC52] a swatch is saved, and a bad one is a 400', async () => {
    const { create } = await setup()
    const colour = { ref: 'colour', name: { en: 'Colour' }, values: [{ ref: 'red', label: { en: 'Red' }, swatch: '#c8102e' }] }

    const ok = await create({ options: [colour], variants: [{ skuCode: code(), priceRappen: 100, values: { colour: 'red' } }] })
    expect(((await ok.json()) as View).options[0]!.values[0]!.swatch).toBe('#c8102e')
    const bad = await create({ options: [{ ...colour, values: [{ ref: 'red', label: { en: 'Red' }, swatch: '#C8102E' }] }], variants: [{ skuCode: code(), priceRappen: 100, values: { colour: 'red' } }] })
    expect(bad.status).toBe(400)
  })

  it('[E6.2][AC52] with no option the keepsake has one variant, and a second is refused', async () => {
    const { plain, create } = await setup()

    expect((await plain()).options).toEqual([])
    const two = await create({ variants: [{ skuCode: code(), priceRappen: 100 }, { skuCode: code(), priceRappen: 100 }] })
    expect(two.status).toBe(422)
    expect((await two.json() as Problem).errors?.[0]).toMatchObject({ code: 'no-options-one-variant' })
  })

  it('[E6.2][AC52] one option still works', async () => {
    const { create } = await setup()

    const response = await create({ options: [sizeOption], variants: [{ skuCode: code(), priceRappen: 100, values: { size: 's' } }, { skuCode: code(), priceRappen: 100, values: { size: 'l' } }] })

    expect(response.status).toBe(201)
    expect(((await response.json()) as View).variants).toHaveLength(2)
  })

  it('[E6.2][AC52] refuses a duplicate combination, a missing value and nothing is created', async () => {
    const { create, products, owner, call } = await setup({ fresh: true })

    const duplicate = await create({ options: [sizeOption], variants: [{ skuCode: code(), priceRappen: 100, values: { size: 's' } }, { skuCode: code(), priceRappen: 100, values: { size: 's' } }] })
    const missing = await create({ options: [sizeOption, themeOption], variants: [{ skuCode: code(), priceRappen: 100, values: { size: 's' } }] })

    expect(duplicate.status).toBe(422)
    expect((await duplicate.json() as Problem).errors?.map(e => e.code)).toEqual(['combination-taken'])
    expect(missing.status).toBe(422)
    expect((await missing.json() as Problem).errors?.[0]).toMatchObject({ code: 'values-missing', params: { option: 'Theme' } })
    const list = await (await call(products, { headers: owner.headers })).json() as { items: unknown[] }
    expect(list.items).toHaveLength(0)
  })
})

describe('[E6.2][412] saving the options', () => {
  it('[E6.2][412] saves on the returned version and bumps it, an old version is 412, no header is 428', async () => {
    const { withOptions, putOptions, get } = await setup()
    const product = await withOptions()
    const body = { options: asInput(product.options) }

    const saved = await putOptions(product.id, product.rowVersion, body)
    expect(saved.status).toBe(200)
    expect(saved.headers.get('ETag')).toBe(`"${product.rowVersion + 1}"`)
    const stale = await putOptions(product.id, product.rowVersion, body)
    expect(stale.status).toBe(412)
    expect(await stale.json()).toMatchObject({ type: 'precondition-failed' })
    expect((await putOptions(product.id, null, body)).status).toBe(428)
    expect((await get(product.id)).rowVersion).toBe(product.rowVersion + 1)
  })

  it('[E6.2][412] two sessions: the one that saved second is refused and nothing of it is written', async () => {
    const { withOptions, putOptions, get } = await setup()
    const product = await withOptions()
    const first = { options: asInput(product.options).map((o, i) => (i === 0 ? { ...o, name: { en: 'Size (first)' } } : o)) }
    const second = { options: asInput(product.options).map((o, i) => (i === 0 ? { ...o, name: { en: 'Size (second)' } } : o)) }

    const [a, b] = [await putOptions(product.id, product.rowVersion, first), await putOptions(product.id, product.rowVersion, second)]

    expect([a.status, b.status]).toEqual([200, 412])
    expect((await get(product.id)).options[0]!.name.en).toBe('Size (first)')
  })

  it('[E6.2][412] an autosave and an options save share one version: the second is stale', async () => {
    const { withOptions, putOptions, patchName } = await setupWithPatch()
    const product = await withOptions()

    expect((await patchName(product.id, product.rowVersion)).status).toBe(200)
    expect((await putOptions(product.id, product.rowVersion, { options: asInput(product.options) })).status).toBe(412)
  })
})

// The autosave is E6.1's route; it moves the same row version.
async function setupWithPatch() {
  const s = await setup()
  return { ...s, patchName: (id: string, ifMatch: number) => s.call(`${s.products}/${id}`, { method: 'PATCH', headers: { ...s.owner.headers, 'If-Match': String(ifMatch) }, body: { name: { en: 'Renamed' } } }) }
}

describe('[E6.2][AC52] changing options and values', () => {
  it('[E6.2][AC52] renames, reorders and adds a value, and the order is what guests see', async () => {
    const { withOptions, putOptions, get } = await setup()
    const product = await withOptions()
    const [size, theme] = asInput(product.options)
    const reordered = { ...size!, name: { en: 'Size', de: 'Grösse' }, values: [...size!.values].reverse().concat({ ref: 'xl', label: { en: 'XL', de: 'XL' }, swatch: null }) }

    expect((await putOptions(product.id, product.rowVersion, { options: [theme!, reordered] })).status).toBe(200)
    const after = await get(product.id)

    expect(after.options.map(o => o.name.en)).toEqual(['Theme', 'Size'])
    expect(after.options[1]!.values.map(v => v.label.en)).toEqual(['Large', 'Small', 'XL'])
    expect(after.options[1]!.values[0]!.id).toBe(product.options[0]!.values[1]!.id)
  })

  it('[E6.2][AC52] a value a variant uses cannot be deleted, an archived variant counts, and nothing changes', async () => {
    const { withOptions, putOptions, get, patchVariant } = await setup({ fresh: true })
    const product = await withOptions()
    const theme = product.options[1]!
    const lion = theme.values[1]!
    const users = product.variants.filter(v => v.values[theme.id] === lion.id)
    expect((await patchVariant(product.id, users[0]!.id, { status: 'archived' })).status).toBe(200)
    const fresh = await get(product.id)
    const next = asInput(fresh.options).map(o => (o.ref === theme.id ? { ...o, values: o.values.filter(v => v.ref !== lion.id) } : o))

    const response = await putOptions(product.id, fresh.rowVersion, { options: next })

    expect(response.status).toBe(422)
    const problem = await response.json() as Problem
    expect(problem.errors).toEqual([expect.objectContaining({
      code: 'value-in-use',
      path: `options.${theme.id}.values.${lion.id}`,
      params: { value: 'Lion', count: 2, codes: users.map(u => u.skuCode).join(', '), more: 0 },
      message: expect.stringContaining('Used by 2 variants'),
    })])
    expect(await get(product.id)).toEqual(fresh)
  })

  it('[E6.2][AC52] an option that variants use cannot be deleted', async () => {
    const { withOptions, putOptions } = await setup()
    const product = await withOptions()

    const response = await putOptions(product.id, product.rowVersion, { options: asInput(product.options).slice(0, 1) })

    expect(response.status).toBe(422)
    expect((await response.json() as Problem).errors?.[0]).toMatchObject({ code: 'option-in-use', params: { option: 'Theme', count: 4 } })
  })

  it('[E6.2][AC52] an option with no value, or no name, is refused', async () => {
    const { withOptions, putOptions } = await setup()
    const product = await withOptions()
    const options = asInput(product.options)

    const response = await putOptions(product.id, product.rowVersion, { options: [{ ...options[0]!, name: {} }, { ...options[1]!, values: [] }] })

    expect(response.status).toBe(422)
    expect((await response.json() as Problem).errors?.map(e => e.code)).toEqual(expect.arrayContaining(['option-name-required', 'option-needs-value']))
  })

  it('[E6.2][AC52] a German label may be empty, and the publish card warns', async () => {
    const { withOptions, putOptions, get } = await setup()
    const product = await withOptions()
    const options = asInput(product.options).map(o => ({ ...o, name: { en: o.name.en }, values: o.values.map(v => ({ ...v, label: { en: v.label.en } })) }))

    expect((await putOptions(product.id, product.rowVersion, { options })).status).toBe(200)
    const after = await get(product.id)

    expect(after.options[0]!.name).toEqual({ en: 'Size' })
    expect(after.warnings).toContainEqual({ code: 'option-labels', card: 'options', count: 6 })
  })
})

describe('[E6.2][AC52] a new option', () => {
  const colour = { ref: 'new-colour', name: { en: 'Colour' }, values: [{ ref: 'red', label: { en: 'Red' }, swatch: '#c8102e' }, { ref: 'blue', label: { en: 'Blue' }, swatch: null }] }

  it('[E6.2][AC52] is refused until every variant has a value, archived ones too, and then saves in one request', async () => {
    const { withOptions, putOptions, get, patchVariant } = await setup()
    const product = await withOptions()
    await patchVariant(product.id, product.variants[3]!.id, { status: 'archived' })
    const fresh = await get(product.id)
    const options = [...asInput(fresh.options), colour]
    const some = fresh.variants.slice(0, 3).map(v => ({ variantId: v.id, values: { 'new-colour': 'red' } }))

    const refused = await putOptions(product.id, fresh.rowVersion, { options, variantValues: some })

    expect(refused.status).toBe(422)
    expect((await refused.json() as Problem).errors).toEqual([expect.objectContaining({ code: 'values-missing', params: { code: fresh.variants[3]!.skuCode, option: 'Colour' } })])
    expect(await get(product.id)).toEqual(fresh)

    const all = fresh.variants.map(v => ({ variantId: v.id, values: { 'new-colour': 'red' } }))
    const saved = await putOptions(product.id, fresh.rowVersion, { options, variantValues: all })

    expect(saved.status).toBe(200)
    const after = await saved.json() as View
    expect(after.options).toHaveLength(3)
    expect(after.options[2]!.values.map(v => v.swatch)).toEqual(['#c8102e', null])
    for (const variant of after.variants)
      expect(Object.keys(variant.values)).toHaveLength(3)
  })

  it('[E6.2][AC52] zero options to one option: the one variant keeps its code and price, and a second can be created', async () => {
    const { plain, putOptions, postVariant } = await setup()
    const product = await plain()
    const sized = { ref: 'size', name: { en: 'Size' }, values: [{ ref: 's', label: { en: 'Small' } }, { ref: 'l', label: { en: 'Large' } }] }

    const saved = await putOptions(product.id, product.rowVersion, { options: [sized], variantValues: [{ variantId: product.variants[0]!.id, values: { size: 's' } }] })

    expect(saved.status).toBe(200)
    const after = await saved.json() as View
    expect(after.variants[0]).toMatchObject({ skuCode: product.variants[0]!.skuCode, priceRappen: 3900 })
    const large = after.options[0]!.values[1]!.id
    const second = await postVariant(product.id, { skuCode: code(), priceRappen: 5000, values: { [after.options[0]!.id]: large } })
    expect(second.status).toBe(201)
  })

  it('[E6.2][AC52] two variants moved onto one combination are refused', async () => {
    const { withOptions, putOptions } = await setup()
    const product = await withOptions()
    const size = product.options[0]!
    const [swanSmall, swanLarge] = product.variants

    const response = await putOptions(product.id, product.rowVersion, {
      options: asInput(product.options),
      variantValues: [{ variantId: swanLarge!.id, values: { [size.id]: size.values[0]!.id } }],
    })

    expect(response.status).toBe(422)
    expect((await response.json() as Problem).errors).toEqual([expect.objectContaining({ code: 'combination-duplicate', params: { code: swanLarge!.skuCode, twin: swanSmall!.skuCode } })])
  })
})

describe('[E6.2][AC52] creating a variant', () => {
  it('[E6.2][AC52] a free combination is created at once and is for sale, a duplicate is refused', async () => {
    const { create, postVariant } = await setup()
    const first = await (await create({ options: [sizeOption, themeOption], variants: [{ skuCode: code(), priceRappen: 100, values: { size: 's', theme: 'swan' } }] })).json() as View
    const [size, theme] = first.options
    const values = { [size!.id]: size!.values[1]!.id, [theme!.id]: theme!.values[0]!.id }

    const created = await postVariant(first.id, { skuCode: code(), priceRappen: 4200, values })

    expect(created.status).toBe(201)
    const after = await created.json() as View
    expect(after.variants).toHaveLength(2)
    expect(after.variants[1]).toMatchObject({ priceRappen: 4200, status: 'published', values })
    expect(after.rowVersion).toBe(first.rowVersion)
    const again = await postVariant(first.id, { skuCode: code(), priceRappen: 4200, values })
    expect(again.status).toBe(422)
    expect((await again.json() as Problem).errors?.[0]).toMatchObject({ code: 'combination-taken', params: { code: after.variants[1]!.skuCode, archived: 0 } })
  })

  it('[E6.2][AC52] an archived twin still holds its combination', async () => {
    const { withOptions, postVariant, patchVariant } = await setup()
    const product = await withOptions()
    const twin = product.variants[0]!
    await patchVariant(product.id, twin.id, { status: 'archived' })

    const response = await postVariant(product.id, { skuCode: code(), priceRappen: 100, values: twin.values })

    expect(response.status).toBe(422)
    expect((await response.json() as Problem).errors?.[0]).toMatchObject({ code: 'combination-taken', params: { code: twin.skuCode, archived: 1 } })
  })

  it('[E6.2][AC52] a missing value, a value of another option, a bad code, a taken code and a price of 0 are refused', async () => {
    const { withOptions, postVariant, putOptions, get, create } = await setup()
    const product = await withOptions()
    const [size, theme] = product.options
    // A free combination: archive none, so add a third size first.
    const input = asInput(product.options)
    input[0]!.values.push({ ref: 'xl', label: { en: 'XL' }, swatch: null })
    const widened = await (await putOptions(product.id, product.rowVersion, { options: input })).json() as View
    const xl = widened.options[0]!.values[2]!.id
    const swan = theme!.values[0]!.id

    const missing = await postVariant(product.id, { skuCode: code(), priceRappen: 100, values: { [size!.id]: xl } })
    expect(missing.status).toBe(422)
    expect((await missing.json() as Problem).errors?.[0]).toMatchObject({ code: 'values-missing' })
    const crossed = await postVariant(product.id, { skuCode: code(), priceRappen: 100, values: { [size!.id]: swan, [theme!.id]: swan } })
    expect((await crossed.json() as Problem).errors?.[0]).toMatchObject({ code: 'value-unknown' })
    const spaced = await postVariant(product.id, { skuCode: 'VX XL', priceRappen: 100, values: { [size!.id]: xl, [theme!.id]: swan } })
    expect(spaced.status).toBe(422)
    const zero = await postVariant(product.id, { skuCode: code(), priceRappen: 0, values: { [size!.id]: xl, [theme!.id]: swan } })
    expect(zero.status).toBe(400)
    const other = await (await create({ variants: [{ skuCode: code(), priceRappen: 100 }] })).json() as View
    const taken = await postVariant(product.id, { skuCode: other.variants[0]!.skuCode, priceRappen: 100, values: { [size!.id]: xl, [theme!.id]: swan } })
    expect(taken.status).toBe(409)
    expect(await taken.json()).toMatchObject({ type: 'sku-code-taken' })
    expect((await get(product.id)).variants).toHaveLength(4)
  })

  it('[E6.2][AC52] with no option a second variant is refused', async () => {
    const { plain, postVariant } = await setup()
    const product = await plain()

    const response = await postVariant(product.id, { skuCode: code(), priceRappen: 100 })

    expect(response.status).toBe(422)
    expect((await response.json() as Problem).errors?.[0]).toMatchObject({ code: 'no-options-one-variant', params: { code: product.variants[0]!.skuCode } })
  })

  it('[E6.2][AC52] a manager may create a variant', async () => {
    const { create, postVariant, manager } = await setup()
    const made = await (await create({ options: [sizeOption], variants: [{ skuCode: code(), priceRappen: 100, values: { size: 's' } }] })).json() as View
    const size = made.options[0]!

    const response = await postVariant(made.id, { skuCode: code(), priceRappen: 100, values: { [size.id]: size.values[1]!.id } }, manager.headers)

    expect(response.status).toBe(201)
  })
})

describe('[E6.2][AC52] changing and archiving a variant', () => {
  it('[E6.2][AC52] new values move a variant to a free combination and a taken one is refused', async () => {
    const { create, putOptions, patchVariant } = await setup()
    const made = await (await create({ options: [sizeOption], variants: [{ skuCode: code(), priceRappen: 100, values: { size: 's' } }, { skuCode: code(), priceRappen: 100, values: { size: 'l' } }] })).json() as View
    const size = made.options[0]!
    const [small, large] = made.variants

    const taken = await patchVariant(made.id, large!.id, { values: { [size.id]: size.values[0]!.id } })
    expect(taken.status).toBe(422)
    expect((await taken.json() as Problem).errors?.[0]).toMatchObject({ code: 'combination-taken', params: { code: small!.skuCode } })
    const widened = asInput(made.options)
    widened[0]!.values.push({ ref: 'xl', label: { en: 'XL' }, swatch: null })
    const wide = await (await putOptions(made.id, made.rowVersion, { options: widened })).json() as View
    const moved = await patchVariant(made.id, large!.id, { values: { [size.id]: wide.options[0]!.values[2]!.id } })
    expect(moved.status).toBe(200)
    expect(((await moved.json()) as View).variants[1]!.values[size.id]).toBe(wide.options[0]!.values[2]!.id)
  })

  it('[E6.2][AC52] archiving keeps the variant, with its values, and it cannot be changed again', async () => {
    const { withOptions, patchVariant, get, call, products, owner } = await setup()
    const product = await withOptions()
    const target = product.variants[0]!

    const archived = await patchVariant(product.id, target.id, { status: 'archived' })

    expect(archived.status).toBe(200)
    const after = await get(product.id)
    expect(after.variants.find(v => v.id === target.id)).toMatchObject({ status: 'archived', values: target.values })
    expect(after.warnings.some(w => w.code === 'hidden')).toBe(false)
    for (const body of [{ status: 'published' }, { status: 'draft' }, { priceRappen: 100 }]) {
      const again = await patchVariant(product.id, target.id, body)
      expect(again.status).toBe(422)
      expect((await again.json() as Problem).errors?.[0]).toMatchObject({ code: 'variant-archived' })
    }
    const list = await (await call(products, { headers: owner.headers })).json() as { items: { id: string, variantCount: number }[] }
    expect(list.items.find(i => i.id === product.id)?.variantCount).toBe(3)
    const audit = await pool.query(`select action from platform.audit_log where entity = 'sku' and entity_id = $1`, [target.id])
    expect(audit.rows).toEqual([{ action: 'archived' }])
  })

  it('[E6.2][AC52] an archived variant can no longer be put on sale, so it is never for sale again', async () => {
    const { withOptions, patchVariant } = await setup()
    const product = await withOptions()
    await patchVariant(product.id, product.variants[0]!.id, { status: 'archived' })

    const response = await patchVariant(product.id, product.variants[0]!.id, { status: 'published' })

    expect(response.status).toBe(422)
  })
})

describe('[E6.2][AC52] stores and keepsakes are separate', () => {
  it('[E6.2][AC52] another store gets 404 for the options, a new variant and a change', async () => {
    const a = await setup({ fresh: true })
    const b = await setup({ fresh: true })
    const product = await a.withOptions()
    const foreign = (suffix: string) => `${b.products}/${product.id}${suffix}`
    const options = { options: asInput(product.options) }

    const put = await b.call(foreign('/options'), { method: 'PUT', headers: { ...b.owner.headers, 'If-Match': String(product.rowVersion) }, body: options })
    const post = await b.call(foreign('/variants'), { method: 'POST', headers: b.owner.headers, body: { skuCode: code(), priceRappen: 100, values: product.variants[0]!.values } })
    const patch = await b.call(foreign(`/variants/${product.variants[0]!.id}`), { method: 'PATCH', headers: b.owner.headers, body: { status: 'archived' } })

    expect([put.status, post.status, patch.status]).toEqual([404, 404, 404])
    expect(await a.get(product.id)).toEqual(product)
  })

  it('[E6.2][AC52] a variant of another keepsake in the same store is 404 on a change', async () => {
    const { withOptions, plain, patchVariant } = await setup()
    const one = await withOptions()
    const other = await plain()

    expect((await patchVariant(other.id, one.variants[0]!.id, { status: 'archived' })).status).toBe(404)
  })

  it('[E6.2][AC52] a ref that is the id of another keepsake option is a new key, and writes nothing to that keepsake', async () => {
    const { withOptions, plain, putOptions, get } = await setup()
    const one = await withOptions()
    const other = await plain()
    const stolen = one.options[0]!
    const claim = { ref: stolen.id, name: { en: 'Mine' }, values: [{ ref: stolen.values[0]!.id, label: { en: 'Not yours' }, swatch: null }] }

    const response = await putOptions(other.id, other.rowVersion, { options: [claim], variantValues: [{ variantId: other.variants[0]!.id, values: { [stolen.id]: stolen.values[0]!.id } }] })

    expect(response.status).toBe(200)
    const after = await response.json() as View
    expect(after.options[0]!.id).not.toBe(stolen.id)
    expect(after.options[0]!.values[0]!.id).not.toBe(stolen.values[0]!.id)
    expect((await get(one.id)).options).toEqual(one.options)
  })

  it('[E6.2][AC52] a signed-out visitor is 401 and a guest of no store is 403', async () => {
    const { withOptions, call, products } = await setup()
    const product = await withOptions()

    expect((await call(`${products}/${product.id}/options`, { method: 'PUT', headers: { 'If-Match': '1' }, body: { options: [] } })).status).toBe(401)
  })
})
