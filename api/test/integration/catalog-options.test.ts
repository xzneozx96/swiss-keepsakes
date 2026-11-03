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

/** A description document of one paragraph. */
const rich = (text: string) => ({ type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text }] }] })

const code = () => `VX-${randomUUID().slice(0, 8).toUpperCase()}`

interface Option { id: string, name: { en?: string, de?: string }, values: { id: string, label: { en?: string, de?: string } }[] }
interface Variant { id: string, skuCode: string | null, mediaId: string | null, photo: { id: string } | null, priceRappen: number, status: string, values: Record<string, string> }
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
    body: { name: { en: 'Victorinox Classic' }, text: { en: rich('A Swiss knife.') }, photoIds: [photo], ...body },
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
  const patchVariants = (id: string, body: object, headers = owner.headers) => call(`${products}/${id}/variants`, { method: 'PATCH', headers, body })
  const patchVariant = (id: string, skuId: string, body: object, headers = owner.headers) => call(`${products}/${id}/variants/${skuId}`, { method: 'PATCH', headers, body })
  return { ...store, manager, photo, create, withOptions, plain, get, putOptions, postVariant, patchVariant, patchVariants, call }
}

// The options as the editor sends them back: the existing ids as refs.
function asInput(options: Option[]) {
  return options.map(option => ({
    ref: option.id,
    name: option.name,
    values: option.values.map(value => ({ ref: value.id, label: value.label })),
  }))
}

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

  it('[T-010] a swatch is gone: a value takes only a label, and a stray swatch key is a 400', async () => {
    const { create } = await setup()
    const colour = { ref: 'colour', name: { en: 'Colour' }, values: [{ ref: 'red', label: { en: 'Red' } }] }

    const ok = await create({ options: [colour], variants: [{ skuCode: code(), priceRappen: 100, values: { colour: 'red' } }] })
    expect(((await ok.json()) as View).options[0]!.values[0]).toEqual({ id: expect.any(String), label: { en: 'Red' } })
    const bad = await create({ options: [{ ...colour, values: [{ ref: 'red', label: { en: 'Red' }, swatch: '#c8102e' }] }], variants: [{ skuCode: code(), priceRappen: 100, values: { colour: 'red' } }] })
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
    const reordered = { ...size!, name: { en: 'Size', de: 'Grösse' }, values: [...size!.values].reverse().concat({ ref: 'xl', label: { en: 'XL', de: 'XL' } }) }

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
      params: { value: 'Lion', count: 1, archived: 1, codes: users[1]!.skuCode, more: 0 },
      message: expect.stringContaining(`Used by 1 live (${users[1]!.skuCode}) and 1 archived variant`),
    })])
    expect(await get(product.id)).toEqual(fresh)
  })

  it('[T-020][AC1] an option that variants use is dropped from every variant, live and archived, when the rows stay distinct', async () => {
    const { create, putOptions, get, patchVariants } = await setup({ fresh: true })
    const option = (ref: string, values: string[]) => ({ ref, name: { en: ref }, values: values.map(v => ({ ref: `${ref}-${v}`, label: { en: v } })) })
    const row = (theme: string, size: string, colour: string) => ({ skuCode: code(), priceRappen: 3900, values: { theme: `theme-${theme}`, size: `size-${size}`, colour: `colour-${colour}` } })
    const sizes = ['S', 'M', 'L']
    const response = await create({
      options: [option('theme', ['Light', 'Dark']), option('size', sizes), option('colour', ['Red', 'Blue'])],
      variants: [...sizes.map(size => row('Light', size, 'Red')), ...sizes.map(size => row('Dark', size, 'Blue'))],
    })
    expect(response.status).toBe(201)
    const product = await response.json() as View
    const themeSaved = product.options.find(o => o.name.en === 'theme')!
    const darkId = themeSaved.values.find(v => v.label.en === 'Dark')!.id
    const dark = product.variants.filter(variant => variant.values[themeSaved.id] === darkId)
    expect((await patchVariants(product.id, { variants: dark.map(variant => ({ id: variant.id, status: 'archived' })) })).status).toBe(200)
    const fresh = await get(product.id)
    const colour = fresh.options.find(o => o.name.en === 'colour')!

    const saved = await putOptions(product.id, fresh.rowVersion, { options: asInput(fresh.options).filter(o => o.ref !== colour.id) })
    expect(saved.status).toBe(200)
    const after = await saved.json() as View

    expect(after.options.map(o => o.name.en)).toEqual(['theme', 'size'])
    expect(after.variants).toHaveLength(6)
    expect(after.variants.filter(v => v.status === 'archived')).toHaveLength(3)
    for (const variant of after.variants)
      expect(Object.keys(variant.values).sort()).toEqual(after.options.map(o => o.id).sort())
    const keys = (await pool.query<{ combination_key: string }>('select combination_key from catalog.skus where product_id = $1', [product.id])).rows.map(r => r.combination_key)

    expect(new Set(keys).size).toBe(6)
    expect(keys.every(key => !key.includes(colour.id))).toBe(true)
    expect(Number((await pool.query('select count(*) from catalog.product_option_values where option_id = $1', [colour.id])).rows[0].count)).toBe(0)
  })

  it('[T-020][AC2] dropping an option that makes two live rows the same is refused, the groups are named, and nothing changes', async () => {
    const { withOptions, putOptions, get } = await setup({ fresh: true })
    const product = await withOptions()

    // Without Theme, Small/Swan and Small/Lion are both Small, and so are the two Large rows.
    const response = await putOptions(product.id, product.rowVersion, { options: asInput(product.options).slice(0, 1) })

    expect(response.status).toBe(422)
    const [error] = (await response.json() as Problem).errors!
    expect(error).toMatchObject({ code: 'option-drop-clash', path: `options.${product.options[1]!.id}`, params: { option: 'Theme', count: 4, sold: 0 } })
    expect(JSON.parse(String(error!.params!.groups))).toEqual([{ title: 'Small', count: 2, values: ['Swan', 'Lion'] }, { title: 'Large', count: 2, values: ['Swan', 'Lion'] }])
    expect(error!.message).toContain('Small: 2 rows (Swan, Lion)')
    expect(await get(product.id)).toEqual(product)
  })

  it('[T-020][AC3] the last option goes when one variant remains, and not when two would be the same', async () => {
    const { create, putOptions, get } = await setup({ fresh: true })
    const one = await (await create({ options: [sizeOption], variants: [{ skuCode: code(), priceRappen: 3900, values: { size: 's' } }] })).json() as View
    const two = await (await create({ options: [sizeOption], variants: [{ skuCode: code(), priceRappen: 3900, values: { size: 's' } }, { skuCode: code(), priceRappen: 3900, values: { size: 'l' } }] })).json() as View

    const refused = await putOptions(two.id, two.rowVersion, { options: [] })
    expect(refused.status).toBe(422)
    expect((await refused.json() as Problem).errors?.[0]).toMatchObject({ code: 'option-drop-clash', params: { count: 2 } })
    expect(await get(two.id)).toEqual(two)

    const accepted = await putOptions(one.id, one.rowVersion, { options: [] })
    expect(accepted.status).toBe(200)
    const after = await accepted.json() as View
    expect(after.options).toEqual([])
    expect(after.variants).toHaveLength(1)
    expect(after.variants[0]!.values).toEqual({})
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
  const colour = { ref: 'new-colour', name: { en: 'Colour' }, values: [{ ref: 'red', label: { en: 'Red' } }, { ref: 'blue', label: { en: 'Blue' } }] }

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
    expect(after.options[2]!.values.map(v => v.label.en)).toEqual(['Red', 'Blue'])
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
    input[0]!.values.push({ ref: 'xl', label: { en: 'XL' } })
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

  it('[FIX-one-variant][AC3] a keepsake with no option and no variant gets its one variant from the create route, with no values', async () => {
    const { plain, postVariant, patchVariant, get } = await setup()
    const product = await plain()

    // The merchant deleted the only variant (T-019): nothing is left in the database.
    expect((await patchVariant(product.id, product.variants[0]!.id, { status: 'removed' })).status).toBe(200)
    expect((await get(product.id)).variants).toEqual([])
    const response = await postVariant(product.id, { skuCode: null, priceRappen: 3900 })

    expect(response.status).toBe(201)
    const created = await response.json() as View
    expect(created.options).toEqual([])
    expect(created.variants).toEqual([expect.objectContaining({ skuCode: null, priceRappen: 3900, status: 'published', values: {} })])
    expect((await pool.query('select count(*)::int as n from catalog.skus where product_id = $1', [product.id])).rows[0].n).toBe(1)
    expect((await postVariant(product.id, { skuCode: null, priceRappen: 100 })).status).toBe(422)
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
    widened[0]!.values.push({ ref: 'xl', label: { en: 'XL' } })
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
    const claim = { ref: stolen.id, name: { en: 'Mine' }, values: [{ ref: stolen.values[0]!.id, label: { en: 'Not yours' } }] }

    const response = await putOptions(other.id, other.rowVersion, { options: [claim], variantValues: [{ variantId: other.variants[0]!.id, values: { [stolen.id]: stolen.values[0]!.id } }] })

    expect(response.status).toBe(200)
    const after = await response.json() as View
    expect(after.options[0]!.id).not.toBe(stolen.id)
    expect(after.options[0]!.values[0]!.id).not.toBe(stolen.values[0]!.id)
    expect((await get(one.id)).options).toEqual(one.options)
  })

  it('[E6.2][AC52] a signed-out visitor is 401 and a guest of no store is 403, on the options save, a new variant and a variant change', async () => {
    const { withOptions, call, products } = await setup()
    const product = await withOptions()
    const guest = await env.signIn()
    const target = `${products}/${product.id}`
    const attempts = (headers: Record<string, string>) => Promise.all([
      call(`${target}/options`, { method: 'PUT', headers: { ...headers, 'If-Match': String(product.rowVersion) }, body: { options: [] } }),
      call(`${target}/variants`, { method: 'POST', headers, body: { skuCode: code(), priceRappen: 100, values: {} } }),
      call(`${target}/variants/${product.variants[0]!.id}`, { method: 'PATCH', headers, body: { priceRappen: 200 } }),
    ])

    expect((await attempts({})).map(r => r.status)).toEqual([401, 401, 401])
    expect((await attempts(guest.headers)).map(r => r.status)).toEqual([403, 403, 403])
  })

  it('[E6.2][AC52] a variant id of another keepsake in an options save is 422 refs-invalid, and nothing is written', async () => {
    const { withOptions, plain, putOptions, get } = await setup()
    const one = await withOptions()
    const other = await plain()

    const response = await putOptions(one.id, one.rowVersion, { options: asInput(one.options), variantValues: [{ variantId: other.variants[0]!.id, values: {} }] })

    expect(response.status).toBe(422)
    expect((await response.json() as Problem).errors).toEqual([expect.objectContaining({ code: 'refs-invalid', path: `variantValues.${other.variants[0]!.id}` })])
    expect(await get(one.id)).toEqual(one)
    expect(await get(other.id)).toEqual(other)
  })
})

describe('[E6.2][AC52] keys that name no option are refused, never a 500', () => {
  const junk = randomUUID()

  it('[E6.2][AC52] a new keepsake with a value for an option it does not have is 422 value-unknown and nothing is created', async () => {
    const { create, products, owner, call } = await setup({ fresh: true })

    const bare = await create({ variants: [{ skuCode: code(), priceRappen: 100, values: { x: 'y' } }] })
    const sized = await create({ options: [sizeOption], variants: [{ skuCode: code(), priceRappen: 100, values: { size: 's', colour: 'red' } }] })

    expect(bare.status).toBe(422)
    expect((await bare.json() as Problem).errors).toEqual([expect.objectContaining({ code: 'value-unknown', path: 'variants.0.values.x' })])
    expect(sized.status).toBe(422)
    expect((await sized.json() as Problem).errors).toEqual([expect.objectContaining({ code: 'value-unknown', path: 'variants.0.values.colour' })])
    expect(((await (await call(products, { headers: owner.headers })).json()) as { items: unknown[] }).items).toHaveLength(0)
  })

  it('[E6.2][AC52] a variant change on a keepsake with no option, with ids that exist nowhere, is 422 value-unknown', async () => {
    const { plain, patchVariant, get } = await setup()
    const product = await plain()

    const response = await patchVariant(product.id, product.variants[0]!.id, { values: { [junk]: randomUUID() } })

    expect(response.status).toBe(422)
    expect((await response.json() as Problem).errors).toEqual([expect.objectContaining({ code: 'value-unknown', path: `values.${junk}` })])
    expect(await get(product.id)).toEqual(product)
  })

  it('[E6.2][AC52] a variant change with the option id of another keepsake is 422 value-unknown', async () => {
    const { withOptions, plain, patchVariant, get } = await setup()
    const one = await withOptions()
    const other = await plain()
    const foreign = one.options[0]!

    const response = await patchVariant(other.id, other.variants[0]!.id, { values: { [foreign.id]: foreign.values[0]!.id } })

    expect(response.status).toBe(422)
    expect((await response.json() as Problem).errors?.[0]).toMatchObject({ code: 'value-unknown' })
    expect(await get(other.id)).toEqual(other)
  })

  it('[E6.2][AC52] a new variant with a key that is not an option of the keepsake is 422 value-unknown', async () => {
    const { withOptions, postVariant, get } = await setup()
    const product = await withOptions()
    const free = { [product.options[0]!.id]: product.options[0]!.values[0]!.id, [product.options[1]!.id]: product.options[1]!.values[0]!.id }

    const response = await postVariant(product.id, { skuCode: code(), priceRappen: 100, values: { ...free, [junk]: randomUUID() } })

    expect(response.status).toBe(422)
    expect((await response.json() as Problem).errors).toEqual([expect.objectContaining({ code: 'value-unknown', path: `values.${junk}` })])
    expect(await get(product.id)).toEqual(product)
  })

  it('[E6.2][AC52] an options save with a value for an option that is not in the save is 422 value-unknown, and nothing is written', async () => {
    const { withOptions, putOptions, get } = await setup()
    const product = await withOptions()

    const response = await putOptions(product.id, product.rowVersion, { options: asInput(product.options), variantValues: [{ variantId: product.variants[0]!.id, values: { bogus: 'v' } }] })

    expect(response.status).toBe(422)
    expect((await response.json() as Problem).errors).toEqual([expect.objectContaining({ code: 'value-unknown', path: `variants.${product.variants[0]!.id}.values.bogus` })])
    expect(await get(product.id)).toEqual(product)
  })
})

describe('[E6.2][412] saves that run at the same time', () => {
  it('[E6.2][412] two options saves on one version: exactly one wins, the other is 412, and the stored options are the winner\'s', async () => {
    const { withOptions, putOptions, get } = await setup()

    for (let round = 0; round < 3; round++) {
      const product = await withOptions()
      const named = (name: string) => ({ options: asInput(product.options).map((o, i) => (i === 0 ? { ...o, name: { en: name } } : o)) })

      const [a, b] = await Promise.all([
        putOptions(product.id, product.rowVersion, named('Size (a)')),
        putOptions(product.id, product.rowVersion, named('Size (b)')),
      ])

      expect([a.status, b.status].sort()).toEqual([200, 412])
      const winner = a.status === 200 ? 'Size (a)' : 'Size (b)'
      const after = await get(product.id)
      expect(after.options[0]!.name.en).toBe(winner)
      expect(after.rowVersion).toBe(product.rowVersion + 1)
      expect(after.options[1]).toEqual(product.options[1])
    }
  })

  it('[E6.2][AC52] a new option racing a new variant on the old options never leaves a variant without a value for it', async () => {
    const { create, putOptions, postVariant, get } = await setup()
    const colour = { ref: 'new-colour', name: { en: 'Colour' }, values: [{ ref: 'red', label: { en: 'Red' } }] }

    for (let round = 0; round < 4; round++) {
      const response = await create({
        options: [sizeOption, themeOption],
        variants: [
          { skuCode: code(), priceRappen: 100, values: { size: 's', theme: 'swan' } },
          { skuCode: code(), priceRappen: 100, values: { size: 'l', theme: 'swan' } },
          { skuCode: code(), priceRappen: 100, values: { size: 's', theme: 'lion' } },
        ],
      })
      const product = await response.json() as View
      const [size, theme] = product.options
      const fourth = { skuCode: code(), priceRappen: 100, values: { [size!.id]: size!.values[1]!.id, [theme!.id]: theme!.values[1]!.id } }

      const [put, post] = await Promise.all([
        putOptions(product.id, product.rowVersion, {
          options: [...asInput(product.options), colour],
          variantValues: product.variants.map(v => ({ variantId: v.id, values: { 'new-colour': 'red' } })),
        }),
        postVariant(product.id, fourth),
      ])

      // One of them is first. The other then sees its result and is refused with values-missing.
      expect([[200, 422], [201, 422]]).toContainEqual([put.status, post.status].sort())
      const loser = put.status === 422 ? put : post
      expect(loser.status).toBe(422)
      expect((await loser.json() as Problem).errors?.[0]).toMatchObject({ code: 'values-missing' })
      const after = await get(product.id)
      for (const variant of after.variants)
        expect(Object.keys(variant.values)).toHaveLength(after.options.length)
      const counts = await pool.query<{ options: string, values: string }>(
        `select (select count(*) from catalog.product_options where product_id = $1) as options,
                (select count(*) from catalog.sku_option_values v join catalog.skus s on s.id = v.sku_id where s.product_id = $1) as values`,
        [product.id],
      )
      expect(Number(counts.rows[0]!.values)).toBe(Number(counts.rows[0]!.options) * after.variants.length)
    }
  })
})

describe('[E6.2][AC52] the input limits at the API', () => {
  const values = (count: number, prefix = 'v') => Array.from({ length: count }, (_, n) => ({ ref: `${prefix}${n}`, label: { en: `Value ${n}` } }))

  async function refused(response: Response, path?: string) {
    expect(response.status).toBe(400)
    const problem = await response.json() as Problem
    expect(problem.type).toBe('validation-failed')
    if (path)
      expect(problem.errors?.some(e => e.path.startsWith(path))).toBe(true)
  }

  it('[E6.2][AC52] an options save with 6 options, 51 values, an over-long name or label is 400 and nothing changes', async () => {
    const { withOptions, putOptions, get } = await setup()
    const product = await withOptions()
    const send = (options: object[], variantValues?: object[]) => putOptions(product.id, product.rowVersion, { options, variantValues })
    const option = (n: number, over: object = {}) => ({ ref: `o${n}`, name: { en: `Option ${n}` }, values: values(1), ...over })

    await refused(await send(Array.from({ length: 6 }, (_, n) => option(n))), 'options')
    await refused(await send([option(1, { values: values(51) })]), 'options')
    await refused(await send([option(1, { name: { en: 'a'.repeat(61) } })]), 'options')
    await refused(await send([option(1, { values: [{ ref: 'v', label: { de: 'b'.repeat(81) } }] })]), 'options')
    await refused(await send([], Array.from({ length: 301 }, (_, n) => ({ variantId: randomUUID(), values: { [`o${n}`]: 'v0' } }))), 'variantValues')
    await refused(await send([], [{ variantId: product.variants[0]!.id, values: Object.fromEntries(values(6).map(v => [v.ref, 'v0'])) }]), 'variantValues')
    expect(await get(product.id)).toEqual(product)
  })

  it('[E6.2][AC52] the limits themselves are accepted: 5 options, 50 values', async () => {
    const { create } = await setup()
    const options = Array.from({ length: 5 }, (_, n) => ({ ref: `o${n}`, name: { en: `Option ${n}` }, values: values(n === 0 ? 50 : 1, `o${n}-v`) }))

    const response = await create({ options, variants: [{ skuCode: code(), priceRappen: 100, values: Object.fromEntries(options.map(o => [o.ref, `${o.ref}-v0`])) }] })

    expect(response.status).toBe(201)
    expect(((await response.json()) as View).options[0]!.values).toHaveLength(50)
  })

  it('[E6.2][AC52] a new keepsake with 301 variants is 400, and nothing is created', async () => {
    const { create, products, owner, call } = await setup({ fresh: true })
    const variants = Array.from({ length: 301 }, (_, n) => ({ skuCode: `VX-LIM-${n}`, priceRappen: 100, values: { size: n % 2 ? 's' : 'l' } }))

    await refused(await create({ options: [sizeOption], variants }), 'variants')
    await refused(await create({ options: Array.from({ length: 6 }, (_, n) => ({ ref: `o${n}`, name: { en: 'x' }, values: values(1) })), variants: [{ skuCode: code(), priceRappen: 100 }] }), 'options')
    expect(((await (await call(products, { headers: owner.headers })).json()) as { items: unknown[] }).items).toHaveLength(0)
  })
})

describe('[T-008][AC1] an options save that creates variants', () => {
  it('[T-008][AC1] creates the new options, values and variants in one request, for sale, and moves the version once', async () => {
    const { plain, putOptions } = await setup()
    const product = await plain()
    const sized = { ref: 'size', name: { en: 'Size' }, values: [{ ref: 's', label: { en: 'Small' } }, { ref: 'l', label: { en: 'Large' } }, { ref: 'm', label: { en: 'Medium' } }] }
    const newVariants = [
      { skuCode: code(), priceRappen: 4500, values: { size: 'l' } },
      { skuCode: code(), priceRappen: 4700, values: { size: 'm' } },
    ]

    const saved = await putOptions(product.id, product.rowVersion, { options: [sized], variantValues: [{ variantId: product.variants[0]!.id, values: { size: 's' } }], newVariants })

    expect(saved.status).toBe(200)
    const after = await saved.json() as View
    const [small, large, medium] = after.options[0]!.values.map(v => v.id)
    expect(after.rowVersion).toBe(product.rowVersion + 1)
    expect(after.variants).toHaveLength(3)
    expect(after.variants.map(v => v.status)).toEqual(['published', 'published', 'published'])
    expect(after.variants.map(v => v.values[after.options[0]!.id])).toEqual([small, large, medium])
    expect(after.variants.slice(1).map(v => [v.skuCode, v.priceRappen])).toEqual(newVariants.map(v => [v.skuCode, v.priceRappen]))
  })

  it('[T-008][AC1] many new variants take one request and each gets its values, with an existing value by its id', async () => {
    const { withOptions, putOptions } = await setup()
    const product = await withOptions()
    const [size, theme] = product.options
    const extra = { ref: 'xl', label: { en: 'XL' } }
    const options = asInput(product.options).map(o => (o.ref === size!.id ? { ...o, values: [...o.values, extra] } : o))
    const newVariants = [
      { skuCode: code(), priceRappen: 5000, values: { [size!.id]: 'xl', [theme!.id]: theme!.values[0]!.id } },
      { skuCode: code(), priceRappen: 5100, values: { [size!.id]: 'xl', [theme!.id]: theme!.values[1]!.id } },
    ]

    const saved = await putOptions(product.id, product.rowVersion, { options, newVariants })

    expect(saved.status).toBe(200)
    const after = await saved.json() as View
    const xl = after.options.find(o => o.id === size!.id)!.values[2]!.id
    expect(after.variants).toHaveLength(6)
    expect(after.variants.filter(v => v.values[size!.id] === xl).map(v => v.values[theme!.id]).sort()).toEqual(theme!.values.map(v => v.id).sort())
  })

  it('[T-008][AC1] a failure in the new variants writes nothing, not even the new option or value', async () => {
    const { withOptions, putOptions, get } = await setup()
    const product = await withOptions()
    const [size, theme] = product.options
    const extra = { ref: 'xl', label: { en: 'XL' } }
    const options = asInput(product.options).map(o => (o.ref === size!.id ? { ...o, values: [...o.values, extra] } : o))
    const clash = { skuCode: code(), priceRappen: 100, values: { [size!.id]: size!.values[0]!.id, [theme!.id]: theme!.values[0]!.id } }

    const refused = await putOptions(product.id, product.rowVersion, { options, newVariants: [{ skuCode: code(), priceRappen: 100, values: { [size!.id]: 'xl', [theme!.id]: theme!.values[0]!.id } }, clash] })

    expect(refused.status).toBe(422)
    expect(await get(product.id)).toEqual(product)
  })

  it('[T-008][AC1] a new variant without a value of every option is refused and nothing stays', async () => {
    const { withOptions, putOptions, get } = await setup()
    const product = await withOptions()
    const [size] = product.options
    const refused = await putOptions(product.id, product.rowVersion, { options: asInput(product.options), newVariants: [{ skuCode: code(), priceRappen: 100, values: { [size!.id]: size!.values[0]!.id } }] })

    expect(refused.status).toBe(422)
    expect(await get(product.id)).toEqual(product)
  })
})

describe('[T-008][AC2] new variants that clash', () => {
  it('[T-008][AC2] a taken combination is a 422 naming the row, and nothing is written', async () => {
    const { withOptions, putOptions, get } = await setup()
    const product = await withOptions()
    const [size, theme] = product.options
    const twin = product.variants[0]!
    const free = { skuCode: code(), priceRappen: 100, values: { [size!.id]: size!.values[0]!.id, [theme!.id]: theme!.values[0]!.id } }
    expect(free.values).toEqual(twin.values)

    const refused = await putOptions(product.id, product.rowVersion, { options: asInput(product.options), newVariants: [free] })

    expect(refused.status).toBe(422)
    expect((await refused.json() as Problem).errors).toEqual([expect.objectContaining({ code: 'combination-taken', path: 'newVariants.0.values', params: { code: twin.skuCode, archived: 0 } })])
    expect(await get(product.id)).toEqual(product)
  })

  it('[T-008][AC2] a SKU code that the shop holds is a 422 naming the row, and nothing is written', async () => {
    const { plain, withOptions, putOptions, get } = await setup()
    const other = await plain()
    const product = await withOptions()
    const extra = { ref: 'xl', label: { en: 'XL' } }
    const options = asInput(product.options).map((o, index) => (index === 0 ? { ...o, values: [...o.values, extra] } : o))
    const [size, theme] = product.options
    const rows = [
      { skuCode: code(), priceRappen: 100, values: { [size!.id]: 'xl', [theme!.id]: theme!.values[0]!.id } },
      { skuCode: other.variants[0]!.skuCode, priceRappen: 100, values: { [size!.id]: 'xl', [theme!.id]: theme!.values[1]!.id } },
    ]

    const refused = await putOptions(product.id, product.rowVersion, { options, newVariants: rows })

    expect(refused.status).toBe(422)
    expect((await refused.json() as Problem).errors).toEqual([expect.objectContaining({ code: 'code-taken', path: 'newVariants.1.skuCode', params: { code: rows[1]!.skuCode } })])
    expect(await get(product.id)).toEqual(product)
  })

  it('[T-008][AC2] a code used twice in the request and a bad code are refused', async () => {
    const { plain, putOptions, get } = await setup()
    const product = await plain()
    const sized = { ref: 'size', name: { en: 'Size' }, values: [{ ref: 's', label: { en: 'Small' } }, { ref: 'l', label: { en: 'Large' } }, { ref: 'm', label: { en: 'Medium' } }] }
    const same = code()
    const base = { options: [sized], variantValues: [{ variantId: product.variants[0]!.id, values: { size: 's' } }] }

    const twice = await putOptions(product.id, product.rowVersion, { ...base, newVariants: [{ skuCode: same, priceRappen: 100, values: { size: 'l' } }, { skuCode: same.toLowerCase(), priceRappen: 100, values: { size: 'm' } }] })
    expect(twice.status).toBe(422)
    expect((await twice.json() as Problem).errors).toEqual([expect.objectContaining({ code: 'code-duplicate', path: 'newVariants.1.skuCode' })])
    const bad = await putOptions(product.id, product.rowVersion, { ...base, newVariants: [{ skuCode: 'VX L', priceRappen: 100, values: { size: 'l' } }] })
    expect(bad.status).toBe(422)
    expect(await get(product.id)).toEqual(product)
  })
})

describe('[T-008][AC3] changing several variants at once', () => {
  it('[T-008][AC3] sets the price and status of several variants in one request, live, with no row version', async () => {
    const { withOptions, patchVariants, get } = await setup()
    const product = await withOptions()
    const [a, b, c] = product.variants

    const saved = await patchVariants(product.id, { variants: [{ id: a!.id, priceRappen: 4100 }, { id: b!.id, status: 'draft' }, { id: c!.id, priceRappen: 4200, status: 'archived' }] })

    expect(saved.status).toBe(200)
    const after = await saved.json() as View
    expect(after.rowVersion).toBe(product.rowVersion)
    const byId = new Map(after.variants.map(v => [v.id, v]))
    expect(byId.get(a!.id)).toMatchObject({ priceRappen: 4100, status: 'published' })
    expect(byId.get(b!.id)).toMatchObject({ priceRappen: b!.priceRappen, status: 'draft' })
    expect(byId.get(c!.id)).toMatchObject({ priceRappen: 4200, status: 'archived' })
    expect(byId.get(product.variants[3]!.id)).toEqual(product.variants[3])
    expect(await get(product.id)).toEqual(after)
  })

  it('[T-008][AC3] an archived row refuses the whole request, and the other rows stay', async () => {
    const { withOptions, patchVariants, patchVariant, get } = await setup()
    const product = await withOptions()
    await patchVariant(product.id, product.variants[1]!.id, { status: 'archived' })
    const before = await get(product.id)

    const refused = await patchVariants(product.id, { variants: [{ id: product.variants[0]!.id, priceRappen: 100 }, { id: product.variants[1]!.id, priceRappen: 200 }] })

    expect(refused.status).toBe(422)
    expect((await refused.json() as Problem).errors).toEqual([expect.objectContaining({ code: 'variant-archived', path: 'variants.1.status' })])
    expect(await get(product.id)).toEqual(before)
  })

  it('[T-008][AC3] a variant of another keepsake in the same store is 404 and nothing is written', async () => {
    const { withOptions, plain, patchVariants, get } = await setup()
    const product = await withOptions()
    const other = await plain()

    const refused = await patchVariants(product.id, { variants: [{ id: product.variants[0]!.id, priceRappen: 100 }, { id: other.variants[0]!.id, priceRappen: 100 }] })

    expect(refused.status).toBe(404)
    expect(await get(product.id)).toEqual(product)
  })

  it('[T-008][AC3] another store gets 404, a signed-out visitor 401, a guest of no store 403, a bad body 400', async () => {
    const { withOptions, patchVariants, call, products } = await setup()
    const product = await withOptions()
    const other = await env.storeWithStaff()
    const stranger = await env.signIn()
    const body = { variants: [{ id: product.variants[0]!.id, priceRappen: 100 }] }

    expect((await call(`${other.products}/${product.id}/variants`, { method: 'PATCH', headers: other.owner.headers, body })).status).toBe(404)
    expect((await call(`${products}/${product.id}/variants`, { method: 'PATCH', body })).status).toBe(401)
    expect((await call(`${products}/${product.id}/variants`, { method: 'PATCH', headers: stranger.headers, body })).status).toBe(403)
    expect((await patchVariants(product.id, { variants: [] })).status).toBe(400)
  })
})

describe('[T-010] variants with no SKU code', () => {
  const twoOptions = async (setupResult: Awaited<ReturnType<typeof setup>>, codes: (string | null)[]) => {
    const response = await setupResult.create({
      options: [sizeOption, themeOption],
      variants: [
        { ...(codes[0] !== null && { skuCode: codes[0] }), priceRappen: 3900, values: { size: 's', theme: 'swan' } },
        { ...(codes[1] !== null && { skuCode: codes[1] }), priceRappen: 3900, values: { size: 'l', theme: 'swan' } },
        { skuCode: codes[2], priceRappen: 4900, values: { size: 's', theme: 'lion' } },
        { skuCode: codes[3], priceRappen: 4900, values: { size: 'l', theme: 'lion' } },
      ],
    })

    return response
  }

  it('[T-010][AC1] a keepsake is created with no codes, null or left out, and two of them sit in one shop', async () => {
    const env2 = await setup()
    const first = await twoOptions(env2, [null, null, null, null])
    const second = await twoOptions(env2, [null, null, null, null])

    expect(first.status).toBe(201)
    expect(second.status).toBe(201)
    const view = await first.json() as View
    expect(view.variants.map(v => v.skuCode)).toEqual([null, null, null, null])
    const stored = await pool.query<{ n: string }>(`select count(*) as n from catalog.skus where product_id = $1 and sku_code is null`, [view.id])
    expect(Number(stored.rows[0]!.n)).toBe(4)
  })

  it('[T-010][AC2] a code that the shop holds is still refused, and a code left out is not checked', async () => {
    const env2 = await setup()
    const taken = code()
    const one = await env2.create({ variants: [{ skuCode: taken, priceRappen: 100 }] })
    expect(one.status).toBe(201)

    const clash = await env2.create({ variants: [{ skuCode: taken, priceRappen: 100 }] })
    expect(clash.status).toBe(409)
    expect(((await clash.json()) as Problem).type).toBe('sku-code-taken')
    expect((await env2.create({ variants: [{ priceRappen: 100 }] })).status).toBe(201)
  })

  it('[T-010][AC1] the options save, the single create and the single save work with and without a code', async () => {
    const { plain, putOptions, postVariant, patchVariant, get } = await setup()
    const product = await plain()
    const sized = { ref: 'size', name: { en: 'Size' }, values: [{ ref: 's', label: { en: 'Small' } }, { ref: 'l', label: { en: 'Large' } }, { ref: 'm', label: { en: 'Medium' } }, { ref: 'x', label: { en: 'XL' } }] }
    const saved = await putOptions(product.id, product.rowVersion, {
      options: [sized],
      variantValues: [{ variantId: product.variants[0]!.id, values: { size: 's' } }],
      newVariants: [{ priceRappen: 100, values: { size: 'l' } }, { skuCode: null, priceRappen: 100, values: { size: 'm' } }],
    })

    expect(saved.status).toBe(200)
    const after = await saved.json() as View
    expect(after.variants.map(v => v.skuCode === null)).toEqual([false, true, true])

    const sizeId = after.options[0]!.id
    const xl = after.options[0]!.values[3]!.id
    expect((await postVariant(product.id, { priceRappen: 100, values: { [sizeId]: xl } })).status).toBe(201)
    const withNew = await get(product.id)
    expect(withNew.variants.at(-1)!.skuCode).toBeNull()

    const named = code()
    expect(((await (await patchVariant(product.id, withNew.variants.at(-1)!.id, { skuCode: named })).json()) as View).variants.at(-1)!.skuCode).toBe(named)
    expect(((await (await patchVariant(product.id, withNew.variants.at(-1)!.id, { skuCode: null })).json()) as View).variants.at(-1)!.skuCode).toBeNull()
    expect(((await (await patchVariant(product.id, withNew.variants.at(-1)!.id, { priceRappen: 200 })).json()) as View).variants.at(-1)!.skuCode).toBeNull()
  })

  it('[T-010][AC3] one bulk request clears every code, sets one, and refuses a taken or repeated one', async () => {
    const env2 = await setup()
    const product = await (await twoOptions(env2, [code(), code(), code(), code()])).json() as View

    const cleared = await env2.patchVariants(product.id, { variants: product.variants.map(v => ({ id: v.id, skuCode: null })) })
    expect(cleared.status).toBe(200)
    expect(((await cleared.json()) as View).variants.map(v => v.skuCode)).toEqual([null, null, null, null])

    const [a, b] = product.variants
    const set = await env2.patchVariants(product.id, { variants: [{ id: a!.id, skuCode: 'BULK-A', priceRappen: 500 }, { id: b!.id }] })
    const after = await set.json() as View
    expect(after.variants.map(v => v.skuCode)).toEqual(['BULK-A', null, null, null])
    expect(after.variants[0]!.priceRappen).toBe(500)

    const repeated = await env2.patchVariants(product.id, { variants: [{ id: a!.id, skuCode: 'DUP-1' }, { id: b!.id, skuCode: 'dup-1' }] })
    expect(repeated.status).toBe(422)
    expect(((await repeated.json()) as Problem).errors).toEqual([expect.objectContaining({ code: 'code-duplicate', path: 'variants.1.skuCode' })])
    const clash = await env2.patchVariants(product.id, { variants: [{ id: b!.id, skuCode: 'BULK-A' }] })
    expect(clash.status).toBe(422)
    expect(((await clash.json()) as Problem).errors).toEqual([expect.objectContaining({ code: 'code-taken', path: 'variants.0.skuCode', params: { code: 'BULK-A' } })])
    // A row may keep or re-set its own code.
    expect((await env2.patchVariants(product.id, { variants: [{ id: a!.id, skuCode: 'BULK-A' }] })).status).toBe(200)
  })

  it('[T-010] a refusal names a variant with no code by its values', async () => {
    const env2 = await setup()
    const product = await (await twoOptions(env2, [null, null, null, null])).json() as View
    const [size, theme] = product.options
    const refused = await env2.postVariant(product.id, { values: { [size!.id]: size!.values[0]!.id, [theme!.id]: theme!.values[0]!.id }, priceRappen: 100 })

    expect(refused.status).toBe(422)
    expect(((await refused.json()) as Problem).errors).toEqual([expect.objectContaining({ code: 'combination-taken', params: { code: 'Small / Swan', archived: 0 } })])
  })

  it('[T-010] the list names the options of every keepsake, for the editor\'s name suggestions', async () => {
    const env2 = await setup({ fresh: true })

    expect((await env2.create({ options: [sizeOption, themeOption], variants: [{ priceRappen: 100, values: { size: 's', theme: 'swan' } }] })).status).toBe(201)
    expect((await env2.create({ variants: [{ priceRappen: 100 }] })).status).toBe(201)
    const list = await (await env2.call(env2.products, { headers: env2.owner.headers })).json() as { items: { optionNames: { en?: string, de?: string }[] }[] }

    expect(list.items.map(item => item.optionNames)).toEqual([[], [{ en: 'Size', de: 'Grösse' }, { en: 'Theme' }]])
  })
})

describe('[T-010] the photo of a variant', () => {
  it('[T-010][AC8] a ready photo of the library is saved by create, the options save, the single and the bulk save, and comes back ready to show', async () => {
    const env2 = await setup({ fresh: true })
    const second = await env.readyPhoto(env2.storeId)
    const product = await (await env2.create({ options: [sizeOption], variants: [{ priceRappen: 100, mediaId: env2.photo, values: { size: 's' } }, { priceRappen: 100, values: { size: 'l' } }] })).json() as View

    expect(product.variants.map(v => v.mediaId)).toEqual([env2.photo, null])
    expect(product.variants.map(v => v.photo?.id ?? null)).toEqual([env2.photo, null])
    const [small, large] = product.variants
    const single = await (await env2.patchVariant(product.id, large!.id, { mediaId: second })).json() as View
    expect(single.variants.map(v => v.mediaId)).toEqual([env2.photo, second])
    const bulk = await (await env2.patchVariants(product.id, { variants: [{ id: small!.id, mediaId: null }, { id: large!.id, mediaId: env2.photo }] })).json() as View
    expect(bulk.variants.map(v => v.mediaId)).toEqual([null, env2.photo])
    expect(bulk.variants.map(v => v.photo?.id ?? null)).toEqual([null, env2.photo])

    const sized = { ref: product.options[0]!.id, name: { en: 'Size' }, values: [...product.options[0]!.values.map(value => ({ ref: value.id, label: value.label })), { ref: 'm', label: { en: 'Medium' } }] }
    const saved = await (await env2.putOptions(product.id, bulk.rowVersion, { options: [sized], newVariants: [{ priceRappen: 100, mediaId: second, values: { [sized.ref]: 'm' } }] })).json() as View
    expect(saved.variants.at(-1)!.mediaId).toBe(second)
    expect((await env2.postVariant(product.id, { priceRappen: 100, mediaId: second, values: { [sized.ref]: sized.values[0]!.ref } })).status).toBe(422)
  })

  it('[T-010][AC8] a photo of another store and a retired one are refused, and nothing is written', async () => {
    const env2 = await setup({ fresh: true })
    const elsewhere = await env.readyPhoto((await setup({ fresh: true })).storeId)
    const retired = await env.readyPhoto(env2.storeId, 'retired')
    const product = await (await env2.create({ variants: [{ priceRappen: 100 }] })).json() as View
    const only = product.variants[0]!

    for (const [mediaId, type] of [[elsewhere, 'media-invalid'], [retired, 'media-retired']] as const) {
      const single = await env2.patchVariant(product.id, only.id, { mediaId })
      expect(single.status).toBe(422)
      expect(((await single.json()) as Problem).type).toBe(type)
      expect((await env2.patchVariants(product.id, { variants: [{ id: only.id, mediaId }] })).status).toBe(422)
      expect((await env2.create({ variants: [{ priceRappen: 100, mediaId }] })).status).toBe(422)
    }
    expect((await env2.get(product.id)).variants[0]!.mediaId).toBeNull()
  })

  it('[T-010][AC8] a photo still processing is saved on a variant, and publish waits for it', async () => {
    const env2 = await setup({ fresh: true })
    const processing = await env.readyPhoto(env2.storeId, 'processing')
    const product = await (await env2.create({ variants: [{ priceRappen: 100 }] })).json() as View
    const saved = await env2.patchVariant(product.id, product.variants[0]!.id, { mediaId: processing })

    expect(saved.status).toBe(200)
    expect(((await saved.json()) as View).variants[0]!.mediaId).toBe(processing)
    const published = await env2.call(`${env2.products}/${product.id}/publish`, { method: 'POST', headers: { ...env2.owner.headers, 'If-Match': String(product.rowVersion) } })

    expect(published.status).toBe(422)
    expect(((await published.json()) as Problem).type).toBe('media-processing')
  })
})
