import type { Call } from './keepsakes-harness'

import { toast } from '@heroui/react'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { writeStored } from '@/lib/storage'
import { list, listItem, problem, product, productId, renderKeepsakes, setUpHarness, state, storeId, variantId, writes } from './keepsakes-harness'

vi.hoisted(() => vi.stubEnv('VITE_API_ENABLED', 'true'))

afterEach(() => vi.restoreAllMocks())

const base = `/api/store/${storeId}/products`
const detail = `${base}/${productId}`
const SLOW = { timeout: 8000 }
const id = (n: number) => `0198a000-0000-7000-8000-0000000000${n.toString(16).padStart(2, '0')}`

interface Variant { id: string, skuCode: string, priceRappen: number, status: 'published' | 'draft' | 'archived', values: Record<string, string> }
interface OptionBody { ref: string, name: { en?: string, de?: string }, values: { ref: string, label: { en?: string, de?: string }, swatch: string | null }[] }
interface OptionsPut { options: OptionBody[], variantValues?: { variantId: string, values: Record<string, string> }[], newVariants?: { skuCode: string, priceRappen: number, values: Record<string, string> }[] }

let current: ReturnType<typeof product>

/**
 * A small fake server for the keepsake: reads answer with `current`, the options save builds the keepsake the way the API
 * does (the refs of the body become the ids, the new variants are for sale), a bulk change moves the rows it names, and a
 * single variant change moves one row.
 */
function serve(extra: (call: Call) => Response | undefined = () => undefined) {
  state.answer = (call) => {
    const custom = extra(call)

    if (custom)
      return custom
    if (call.method === 'GET' && call.path === detail)
      return Response.json(current)
    if (call.method === 'GET' && call.path === base)
      return Response.json(list([listItem()]))
    if (call.method === 'PUT' && call.path === `${detail}/options`) {
      const body = call.body as OptionsPut
      const variants: Variant[] = [
        ...current.variants.map(variant => ({ ...variant, values: { ...variant.values, ...body.variantValues?.find(row => row.variantId === variant.id)?.values } })),
        ...(body.newVariants ?? []).map((made, index) => ({ id: id(0xE0 + index), skuCode: made.skuCode, priceRappen: made.priceRappen, status: 'published' as const, values: made.values })),
      ]

      current = product({ ...current, options: body.options.map(option => ({ id: option.ref, name: option.name, values: option.values.map(value => ({ id: value.ref, label: value.label, swatch: value.swatch })) })), variants, rowVersion: current.rowVersion + 1 })

      return Response.json(current)
    }
    if (call.method === 'PATCH' && call.path === `${detail}/variants`) {
      const rows = (call.body as { variants: { id: string, priceRappen?: number, status?: Variant['status'] }[] }).variants

      current = product({ ...current, variants: current.variants.map((variant) => { const row = rows.find(r => r.id === variant.id); return row ? { ...variant, ...(row.priceRappen !== undefined && { priceRappen: row.priceRappen }), ...(row.status && { status: row.status }) } : variant }) })

      return Response.json(current)
    }
    if (call.method === 'PATCH' && call.path.startsWith(`${detail}/variants/`)) {
      const body = call.body as Partial<Variant>

      current = product({ ...current, variants: current.variants.map(variant => (call.path.endsWith(variant.id) ? { ...variant, ...body } : variant)) })

      return Response.json(current)
    }

    return undefined
  }
}

beforeEach(async () => {
  current = product()
  await setUpHarness()
  serve()
})

const nameField = () => screen.findByLabelText('Name (English)', undefined, SLOW)

async function openStep() {
  const router = renderKeepsakes(`/store/products/gifts/${productId}?step=options`)

  await screen.findByRole('region', { name: 'Options' }, SLOW)

  return router
}

const optionsBlock = () => screen.getByRole('region', { name: 'Options' })
const variantsBlock = () => screen.getByRole('region', { name: 'Variants' })
const rows = () => within(variantsBlock()).getAllByTestId('variant-row')
const addField = () => screen.getByLabelText(/^Add values to/)
const typeValue = async (text: string) => userEvent.type(addField(), text)
const puts = () => writes().filter(call => call.method === 'PUT')
const patches = () => writes().filter(call => call.method === 'PATCH')

/** Add option, its name and its values; the open option is left open. */
async function startOption(name: string, values: string[]) {
  await userEvent.click(screen.getAllByRole('button', { name: /^Add (another )?option$/ })[0]!)
  await userEvent.type(await screen.findByRole('combobox', { name: 'Option name in English' }), name)
  for (const value of values)
    await typeValue(value)
}

const done = () => userEvent.click(within(optionsBlock()).getByRole('button', { name: 'Done' }))

describe('[T-008][AC3] a first option on a keepsake with no option', () => {
  it('[T-008][AC3] the values make rows to come, muted, and Done saves the option with the combinations in one request', async () => {
    await openStep()
    await startOption('Size', ['XS', 'S', 'M', 'L'])

    expect(within(optionsBlock()).getAllByRole('textbox', { name: /^Value \d$/ }).map(input => (input as HTMLInputElement).value)).toEqual(['XS', 'S', 'M', 'L'])
    expect(await screen.findByText('3 new variants')).toBeInTheDocument()
    expect(screen.getAllByTestId('variant-preview')).toHaveLength(3)
    expect(writes()).toHaveLength(0)
    await done()

    await waitFor(() => expect(puts()).toHaveLength(1))
    const body = puts()[0]!.body as OptionsPut

    expect(puts()[0]).toMatchObject({ method: 'PUT', path: `${detail}/options`, ifMatch: '1' })
    expect(body.options).toHaveLength(1)
    expect(body.options[0]!.name).toEqual({ en: 'Size' })
    expect(body.options[0]!.values.map(value => value.label)).toEqual([{ en: 'XS' }, { en: 'S' }, { en: 'M' }, { en: 'L' }])
    // The one variant becomes XS and keeps its code; the others are new, for sale at its price.
    const [xs, s, m, l] = body.options[0]!.values.map(value => value.ref)

    expect(body.variantValues).toEqual([{ variantId, values: { [body.options[0]!.ref]: xs } }])
    expect(body.newVariants).toEqual([
      { skuCode: 'VX-S', priceRappen: 3900, values: { [body.options[0]!.ref]: s } },
      { skuCode: 'VX-M', priceRappen: 3900, values: { [body.options[0]!.ref]: m } },
      { skuCode: 'VX-L', priceRappen: 3900, values: { [body.options[0]!.ref]: l } },
    ])
    expect(await within(optionsBlock()).findByTestId('option-row')).toHaveTextContent('Size')
    expect(within(optionsBlock()).getByTestId('option-row')).toHaveTextContent('XSSML')
    await waitFor(() => expect(rows()).toHaveLength(4))
    expect(screen.queryByRole('region', { name: 'Price' })).not.toBeInTheDocument()
    expect(screen.queryByTestId('variant-preview')).not.toBeInTheDocument()
    expect(await screen.findByText(/^Saved \d/)).toBeInTheDocument()
  })

  it('[T-008] Done on an option with no name or no value is refused at the option and sends nothing', async () => {
    await openStep()
    await userEvent.click(screen.getByRole('button', { name: 'Add option' }))
    await userEvent.click(screen.getByRole('button', { name: 'Done' }))

    expect(await screen.findByText('Name the option in English or German.')).toBeInTheDocument()
    expect(screen.getByText('This option needs at least one value.')).toBeInTheDocument()
    expect(writes()).toHaveLength(0)
  })

  it('[T-008] a value typed twice is named at once, and a pasted list makes several rows', async () => {
    await openStep()
    await userEvent.click(screen.getByRole('button', { name: 'Add option' }))
    await userEvent.type(await screen.findByRole('combobox', { name: 'Option name in English' }), 'Size')
    await userEvent.click(addField())
    await userEvent.paste('Small, Medium, Large')

    expect(within(optionsBlock()).getAllByRole('textbox', { name: /^Value \d$/ })).toHaveLength(3)
    await userEvent.type(addField(), 'medium')
    expect(await screen.findByText('medium is already a value of Size. Each value is listed once.')).toBeInTheDocument()
  })

  it('[T-008] the name offers Size, Colour, Theme and Material', async () => {
    await openStep()
    await userEvent.click(screen.getByRole('button', { name: 'Add option' }))
    await userEvent.click(await screen.findByRole('button', { name: /Show suggestions/ }))

    expect((await screen.findAllByRole('option')).map(option => option.textContent)).toEqual(['Size', 'Colour', 'Theme', 'Material'])
    await userEvent.click(screen.getByRole('option', { name: 'Theme' }))
    expect(screen.getByRole('combobox', { name: 'Option name in English' })).toHaveValue('Theme')
  })

  it('[T-008] Cancel on an option that was only just added takes it away, and Delete asks for no confirm then', async () => {
    await openStep()
    await startOption('Size', ['XS'])
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(screen.queryByTestId('option-editor')).not.toBeInTheDocument()
    expect(screen.getByText(/No options: this keepsake is sold as one variant/)).toBeInTheDocument()
    await startOption('Colour', ['Red'])
    await userEvent.click(screen.getByRole('button', { name: 'Delete option' }))
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(writes()).toHaveLength(0)
  })
})

describe('[T-008] options and variants of a keepsake that has them', () => {
  const optSize = id(0xC1)
  const optColour = id(0xC4)
  const size = ['XS', 'S', 'M', 'L'].map((label, index) => ({ id: id(0xC2 + index * 0x10), label: { en: label }, swatch: null }))
  const colour = ['Red', 'Blue'].map((label, index) => ({ id: id(0xC5 + index * 0x10), label: { en: label }, swatch: null }))
  const sizeOption = { id: optSize, name: { en: 'Size', de: 'Grösse' }, values: size.map(value => ({ ...value, label: { ...value.label, de: value.label.en } })) }
  const colourOption = { id: optColour, name: { en: 'Colour' }, values: colour }
  const all = size.flatMap((s, i) => colour.map((c, j) => ({ id: id(0xA0 + i * 2 + j), skuCode: `VX-${s.label.en}-${c.label.en}`.toUpperCase(), priceRappen: 4000, status: 'published' as const, values: { [optSize]: s.id, [optColour]: c.id } })))

  beforeEach(() => {
    current = product({ options: [sizeOption, colourOption], variants: all })
    serve()
  })

  it('[T-008][AC4] a second option makes the rows grouped by the first, and a group folds', async () => {
    current = product({ options: [sizeOption], variants: all.filter(variant => variant.values[optColour] === colour[0]!.id).map(variant => ({ ...variant, values: { [optSize]: variant.values[optSize]! } })) })
    serve()
    await openStep()
    expect(rows()).toHaveLength(4)
    await startOption('Colour', ['Red', 'Blue'])

    expect(await screen.findByText('4 new variants')).toBeInTheDocument()
    await done()
    await waitFor(() => expect(puts()).toHaveLength(1))
    const body = puts()[0]!.body as OptionsPut

    expect(body.options.map(option => option.name)).toEqual([{ en: 'Size', de: 'Grösse' }, { en: 'Colour' }])
    expect(body.variantValues).toHaveLength(4)
    expect(body.newVariants).toHaveLength(4)
    await waitFor(() => expect(rows()).toHaveLength(8))
    const groups = within(variantsBlock()).getAllByTestId('variant-group')

    expect(groups.map(group => group.getAttribute('aria-label'))).toEqual(['XS', 'S', 'M', 'L'])
    expect(groups[0]).toHaveTextContent('2 variants · CHF 40.00')
    await userEvent.click(within(groups[0]!).getByRole('button', { name: /^XS/ }))
    expect(within(groups[0]!).queryAllByTestId('variant-row')).toHaveLength(0)
    expect(rows()).toHaveLength(6)
  })

  it('[T-008][AC5] selecting by a value and setting a price sends one request and the rows show the new price', async () => {
    await openStep()

    await userEvent.click(within(variantsBlock()).getByRole('button', { name: /^Select/ }))
    await userEvent.click(await screen.findByRole('option', { name: 'Size: M' }))
    expect(await screen.findByText('2 selected')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Set price' }))
    await userEvent.type(screen.getByLabelText('New price, CHF'), '45')
    await userEvent.click(screen.getByRole('button', { name: 'Apply' }))

    await waitFor(() => expect(patches()).toHaveLength(1))
    expect(patches()[0]).toMatchObject({ path: `${detail}/variants`, ifMatch: null, body: { variants: [{ id: all[4]!.id, priceRappen: 4500 }, { id: all[5]!.id, priceRappen: 4500 }] } })
    await waitFor(() => expect(within(variantsBlock()).getAllByLabelText(/^Price of M/).map(input => (input as HTMLInputElement).value)).toEqual(['45.00', '45.00']))
    expect(within(variantsBlock()).getAllByLabelText(/^Price of XS/).map(input => (input as HTMLInputElement).value)).toEqual(['40.00', '40.00'])
  })

  it('[T-008] All and None tick every row or none, and a group box ticks its rows', async () => {
    await openStep()

    await userEvent.click(within(variantsBlock()).getByRole('button', { name: /^Select/ }))
    await userEvent.click(await screen.findByRole('option', { name: 'All' }))
    expect(await screen.findByText('8 selected')).toBeInTheDocument()
    await userEvent.click(within(variantsBlock()).getByRole('button', { name: /^Select/ }))
    await userEvent.click(await screen.findByRole('option', { name: 'None' }))
    expect(screen.queryByTestId('bulk-bar')).not.toBeInTheDocument()
    await userEvent.click(within(variantsBlock()).getByRole('checkbox', { name: 'Select all S' }))
    expect(await screen.findByText('2 selected')).toBeInTheDocument()
  })

  it('[T-008] Hidden and For sale change the status of the selection in one request', async () => {
    await openStep()

    await userEvent.click(within(variantsBlock()).getByRole('checkbox', { name: 'Select XS / Red' }))
    await userEvent.click(within(variantsBlock()).getByRole('checkbox', { name: 'Select XS / Blue' }))
    await userEvent.click(within(screen.getByTestId('bulk-bar')).getByRole('button', { name: 'Hidden' }))

    await waitFor(() => expect(patches()).toHaveLength(1))
    expect(patches()[0]!.body).toEqual({ variants: [{ id: all[0]!.id, status: 'draft' }, { id: all[1]!.id, status: 'draft' }] })
    await waitFor(() => expect(within(rows()[0]!).getByText('Hidden')).toBeInTheDocument())
  })

  it('[T-008][AC6] Archive asks first, then sends one request for the selection and the rows go to the archived fold', async () => {
    await openStep()

    await userEvent.click(within(variantsBlock()).getByRole('checkbox', { name: 'Select XS / Red' }))
    await userEvent.click(within(variantsBlock()).getByRole('checkbox', { name: 'Select S / Red' }))
    await userEvent.click(within(screen.getByTestId('bulk-bar')).getByRole('button', { name: 'Archive' }))
    const dialog = await screen.findByRole('alertdialog')

    expect(dialog).toHaveTextContent('Archive 2 variants?')
    expect(patches()).toHaveLength(0)
    await userEvent.click(within(dialog).getByRole('button', { name: 'Archive variant' }))

    await waitFor(() => expect(patches()).toHaveLength(1))
    expect(patches()[0]!.body).toEqual({ variants: [{ id: all[0]!.id, status: 'archived' }, { id: all[2]!.id, status: 'archived' }] })
    await waitFor(() => expect(rows()).toHaveLength(6))
    expect(within(variantsBlock()).getByText('2 archived')).toBeInTheDocument()
    // Archived keeps its combination (ADR-017): it is not "not sold" and cannot be added back.
    expect(screen.queryByTestId('not-sold')).not.toBeInTheDocument()
  })

  it('[T-008] a refusal of the archive (units reserved) stays in the dialog', async () => {
    serve(call => (call.method === 'PATCH' && call.path.startsWith(`${detail}/variants`)
      ? Response.json({ type: 'validation-failed', status: 422, title: 'x', instance: '/x', requestId: 'r', errors: [{ path: 'variants.0', code: 'variant-reserved', params: { code: 'VX-XS-RED', count: 2 } }] }, { status: 422 })
      : undefined))
    await openStep()

    await userEvent.click(within(variantsBlock()).getByRole('checkbox', { name: 'Select XS / Red' }))
    await userEvent.click(within(screen.getByTestId('bulk-bar')).getByRole('button', { name: 'Archive' }))
    await userEvent.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Archive variant' }))

    expect(await within(screen.getByRole('alertdialog')).findByText(/Can’t archive VX-XS-RED/)).toBeInTheDocument()
    expect(screen.getByRole('alertdialog')).toBeInTheDocument()
  })

  it('[T-008][AC6] a combination that no variant holds is listed as Not sold, and Add back creates it in one request', async () => {
    current = product({ options: [sizeOption, colourOption], variants: all.slice(1) })
    serve()
    await openStep()

    const line = await screen.findByTestId('not-sold')

    expect(line).toHaveTextContent('Not sold: 1')
    await userEvent.click(within(line).getByRole('button', { name: 'Add back' }))

    await waitFor(() => expect(puts()).toHaveLength(1))
    const body = puts()[0]!.body as OptionsPut

    expect(body.options.map(option => option.ref)).toEqual([optSize, optColour])
    expect(body.variantValues).toBeUndefined()
    expect(body.newVariants).toEqual([{ skuCode: 'VX-X-RED', priceRappen: 4000, values: { [optSize]: size[0]!.id, [optColour]: colour[0]!.id } }])
    await waitFor(() => expect(screen.queryByTestId('not-sold')).not.toBeInTheDocument())
    expect(rows()).toHaveLength(8)
  })

  it('[T-008][AC2] a price changed in a row saves when the field is left, as one variant request, and says nothing but Saved', async () => {
    const success = vi.spyOn(toast, 'success')

    await openStep()
    const price = within(variantsBlock()).getByLabelText('Price of XS / Red, CHF')

    await userEvent.clear(price)
    await userEvent.type(price, '41.5')
    expect(writes()).toHaveLength(0)
    await userEvent.tab()

    await waitFor(() => expect(patches()).toHaveLength(1))
    expect(patches()[0]).toMatchObject({ path: `${detail}/variants/${all[0]!.id}`, body: { priceRappen: 4150 } })
    expect(success).not.toHaveBeenCalled()
  })

  it('[T-008] a value that a variant uses cannot be deleted: its icon is off and the row says why', async () => {
    await openStep()
    await userEvent.click(within(optionsBlock()).getAllByRole('button', { name: 'Edit' })[0]!)

    const button = within(optionsBlock()).getByRole('button', { name: 'Can’t delete XS: Used by 2 variants' })

    expect(button).toBeDisabled()
    expect(within(optionsBlock()).getAllByText('Used by 2 variants')).toHaveLength(4)
  })

  it('[T-008] a new value on an option that was there makes the combinations, and Edit then Done saves them in one request', async () => {
    await openStep()
    await userEvent.click(within(optionsBlock()).getAllByRole('button', { name: 'Edit' })[0]!)
    await typeValue('XL')

    expect(await screen.findByText('2 new variants')).toBeInTheDocument()
    await done()

    await waitFor(() => expect(puts()).toHaveLength(1))
    const body = puts()[0]!.body as OptionsPut

    expect(body.variantValues).toBeUndefined()
    expect(body.newVariants!.map(made => made.values[optColour])).toEqual([colour[0]!.id, colour[1]!.id])
    expect(body.newVariants!.map(made => made.skuCode)).toEqual(['VX-X-RED', 'VX-X-BLUE'])
  })

  it('[T-008] an option that variants use is refused at once, naming them, and nothing is sent', async () => {
    await openStep()
    await userEvent.click(within(optionsBlock()).getAllByRole('button', { name: 'Edit' })[0]!)
    await userEvent.click(within(optionsBlock()).getByRole('button', { name: 'Delete option' }))

    expect(await within(optionsBlock()).findByText(/Can’t delete Size\. Used by 8 variants/)).toBeInTheDocument()
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(writes()).toHaveLength(0)
  })

  it('[T-008] Edit on a row opens the sheet, and Archive there asks first and archives that one variant', async () => {
    await openStep()
    await userEvent.click(within(variantsBlock()).getByRole('button', { name: 'Edit XS / Red' }))
    const sheet = await screen.findByRole('dialog', { name: 'Edit XS / Red' })

    await userEvent.click(within(sheet).getByRole('button', { name: 'Archive' }))
    const dialog = await screen.findByRole('alertdialog')

    expect(dialog).toHaveTextContent('Archive XS / Red?')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Archive variant' }))

    await waitFor(() => expect(patches()).toHaveLength(1))
    expect(patches()[0]).toMatchObject({ path: `${detail}/variants/${all[0]!.id}`, body: { status: 'archived' } })
    await waitFor(() => expect(rows()).toHaveLength(7))
  })

  it('[T-008] a refusal of the options save shows at the option in the merchant’s words, and the option stays open', async () => {
    serve(call => (call.method === 'PUT'
      ? Response.json({ type: 'validation-failed', status: 422, title: 'x', instance: '/x', requestId: 'r', errors: [{ path: 'newVariants.0', code: 'combination-taken', params: { code: 'VX-XL-RED', archived: 1 } }] }, { status: 422 })
      : undefined))
    await openStep()
    await userEvent.click(within(optionsBlock()).getAllByRole('button', { name: 'Edit' })[0]!)
    await typeValue('XL')
    await done()

    expect(await screen.findByText(/already VX-XL-RED, archived/)).toBeInTheDocument()
    expect(screen.getByTestId('option-editor')).toBeInTheDocument()
  })

  it('[T-008] a stale save says so and the page asks for a reload', async () => {
    serve(call => (call.method === 'PUT' ? problem(412, 'precondition-failed') : undefined))
    await openStep()
    await userEvent.click(within(optionsBlock()).getAllByRole('button', { name: 'Edit' })[0]!)
    await typeValue('XL')
    await done()

    expect(await screen.findByRole('button', { name: 'Reload' })).toBeInTheDocument()
  })

  it('[T-008] the arrow keys on an option’s grip move it and save the new order at once, which regroups the rows', async () => {
    await openStep()
    const grips = within(optionsBlock()).getAllByRole('button', { name: /^Move/ })

    grips[1]!.focus()
    await userEvent.keyboard('{ArrowUp}')

    await waitFor(() => expect(puts()).toHaveLength(1))
    expect((puts()[0]!.body as OptionsPut).options.map(option => option.ref)).toEqual([optColour, optSize])
    expect((puts()[0]!.body as OptionsPut).newVariants).toBeUndefined()
  })
})

describe('[T-008][AC7] one language switch for the editor', () => {
  it('[T-008][AC7] the switch in the head changes the Name and text card and the options to German fields with the English names beside them, and no card has tabs', async () => {
    current = product({
      options: [{ id: id(0xC1), name: { en: 'Size', de: 'Grösse' }, values: [{ id: id(0xC2), label: { en: 'Small' }, swatch: null }] }],
      variants: [{ id: variantId, skuCode: 'VX-S', priceRappen: 3900, status: 'published', values: { [id(0xC1)]: id(0xC2) } }],
    })
    serve()
    renderKeepsakes(`/store/products/gifts/${productId}`)
    await nameField()

    expect(screen.getAllByRole('tab')).toHaveLength(2)
    expect(within(screen.getByRole('region', { name: 'Name and text' })).queryByRole('tab')).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('tab', { name: /Deutsch/ }))
    expect(await screen.findByLabelText('Name (Deutsch)')).toHaveValue('')
    await userEvent.click(screen.getByRole('button', { name: 'Next' }))
    await userEvent.click(await within(await screen.findByRole('region', { name: 'Options' })).findByRole('button', { name: 'Edit' }))

    const editor = screen.getByTestId('option-editor')

    expect(within(editor).queryByRole('tab')).not.toBeInTheDocument()
    expect(within(editor).getByRole('combobox', { name: 'Option name in German' })).toHaveValue('Grösse')
    expect(within(editor).getByText('Size')).toHaveAttribute('lang', 'en')
    expect(within(editor).getByText('Small')).toHaveAttribute('lang', 'en')
    expect(within(editor).getByLabelText('German name for Small')).toHaveValue('')
    expect(within(editor).queryByLabelText(/^Add values to/)).not.toBeInTheDocument()
    await userEvent.type(within(editor).getByLabelText('German name for Small'), 'Klein')
    await done()

    await waitFor(() => expect(puts()).toHaveLength(1))
    expect((puts()[0]!.body as OptionsPut).options[0]!.values[0]!.label).toEqual({ en: 'Small', de: 'Klein' })
  })
})

describe('[T-008][AC9] a new keepsake: the same step, held in the browser', () => {
  const next = () => userEvent.click(screen.getByRole('button', { name: 'Next' }))

  async function toOptions() {
    renderKeepsakes('/store/products/gifts/new')
    await userEvent.type(await nameField(), 'Knife')
    await next()
    await screen.findByRole('region', { name: 'Price' })
    const card = screen.getByRole('region', { name: 'Price' })

    await userEvent.type(within(card).getByLabelText('Price, CHF'), '39')
    await userEvent.tab()
  }

  beforeEach(() => {
    serve(call => (call.method === 'POST' && call.path === base ? Response.json(product(), { status: 201 }) : undefined))
  })

  it('[T-008][AC9] an option with values makes its rows in the draft with the price of the Price card, sends nothing, and the create request carries the right variants', async () => {
    await toOptions()
    await startOption('Size', ['S', 'M'])
    expect(await screen.findByText('1 new variant')).toBeInTheDocument()
    await done()

    await waitFor(() => expect(rows()).toHaveLength(2))
    expect(within(variantsBlock()).getAllByLabelText(/^Price of/).map(input => (input as HTMLInputElement).value)).toEqual(['39.00', '39.00'])
    expect(writes()).toHaveLength(0)
    expect(screen.queryByRole('region', { name: 'Price' })).not.toBeInTheDocument()
    await next()
    await screen.findByTestId('review-screen', undefined, SLOW)
    await userEvent.click(screen.getByRole('button', { name: 'Save as draft' }))

    await waitFor(() => expect(writes()).toHaveLength(1))
    const body = writes()[0]!.body as { options: OptionBody[], variants: { skuCode: string, priceRappen: number, values: Record<string, string> }[] }
    const [ref] = body.options

    expect(body.options).toHaveLength(1)
    expect(body.variants).toEqual([
      { skuCode: 'VX-S', priceRappen: 3900, values: { [ref!.ref]: ref!.values[0]!.ref } },
      { skuCode: 'VX-M', priceRappen: 3900, values: { [ref!.ref]: ref!.values[1]!.ref } },
    ])
  })

  it('[T-008][AC6] removing rows leaves them out of the request, Not sold lists them and Add back makes them again', async () => {
    await toOptions()
    await startOption('Size', ['S', 'M', 'L'])
    await done()
    await waitFor(() => expect(rows()).toHaveLength(3))

    await userEvent.click(within(variantsBlock()).getByRole('checkbox', { name: 'Select M' }))
    await userEvent.click(within(variantsBlock()).getByRole('checkbox', { name: 'Select L' }))
    await userEvent.click(within(screen.getByTestId('bulk-bar')).getByRole('button', { name: 'Remove variant' }))
    const dialog = await screen.findByRole('alertdialog')

    expect(dialog).toHaveTextContent('Remove 2 variants?')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Remove variant' }))
    await waitFor(() => expect(rows()).toHaveLength(1))
    expect(await screen.findByTestId('not-sold')).toHaveTextContent('Not sold: 2')
    expect(writes()).toHaveLength(0)
    await userEvent.click(within(screen.getByTestId('not-sold')).getByRole('button', { name: 'Add back' }))

    await waitFor(() => expect(rows()).toHaveLength(3))
    expect(screen.queryByTestId('not-sold')).not.toBeInTheDocument()
    expect(writes()).toHaveLength(0)
  })

  it('[T-008] a row removed stays out of the create request', async () => {
    await toOptions()
    await startOption('Size', ['S', 'M'])
    await done()
    await waitFor(() => expect(rows()).toHaveLength(2))
    await userEvent.click(within(variantsBlock()).getByRole('checkbox', { name: 'Select M' }))
    await userEvent.click(within(screen.getByTestId('bulk-bar')).getByRole('button', { name: 'Remove variant' }))
    await userEvent.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Remove variant' }))
    await waitFor(() => expect(rows()).toHaveLength(1))
    await next()
    await screen.findByTestId('review-screen', undefined, SLOW)
    await userEvent.click(screen.getByRole('button', { name: 'Save as draft' }))

    await waitFor(() => expect(writes()).toHaveLength(1))
    expect((writes()[0]!.body as { variants: unknown[] }).variants).toHaveLength(1)
  })

  it('[T-008] Next with an option still open asks to finish it with Done first and stays', async () => {
    await toOptions()
    await startOption('Size', ['S', 'M'])
    await next()

    expect(await screen.findByText('Finish the option with Done first.')).toBeInTheDocument()
    expect(screen.getByText(/Step 2 of 3/)).toBeInTheDocument()
  })

  it('[T-008] an option that was Done and edited again, with a value taken away, takes the variants of that value with it', async () => {
    await toOptions()
    await startOption('Size', ['S', 'M'])
    await done()
    await waitFor(() => expect(rows()).toHaveLength(2))
    await userEvent.click(within(optionsBlock()).getByRole('button', { name: 'Edit' }))
    await userEvent.click(within(optionsBlock()).getByRole('button', { name: 'Remove M' }))
    await done()

    await waitFor(() => expect(rows()).toHaveLength(1))
    expect(writes()).toHaveLength(0)
  })
})

describe('[T-008][i18n] the merged step in German', () => {
  beforeEach(() => writeStored('sk.language', 'de'))

  it('[T-008][i18n] the Price card, the options and the variants read in German, with no key left over', async () => {
    renderKeepsakes(`/store/products/gifts/${productId}?step=options`)

    await screen.findByRole('region', { name: 'Preis' }, SLOW)
    await userEvent.click(screen.getByRole('button', { name: 'Option hinzufügen' }))
    await userEvent.type(await screen.findByRole('combobox', { name: 'Optionsname auf Englisch' }), 'Size')
    await userEvent.type(screen.getByLabelText(/^Werte zu Size hinzufügen/), 'S')
    await userEvent.type(screen.getByLabelText(/^Werte zu Size hinzufügen/), 'M')
    expect(await screen.findByText('1 neue Variante')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Fertig' })).toBeInTheDocument()
    expect(document.body.textContent).not.toMatch(/keepsakes\.[a-z]|steps\.[a-z]/)
  })
})

describe('[E6.2][AC52] the preview', () => {
  it('[E6.2][AC52] the preview shows a group of cards for each option, and a combination that is not for sale is Not sold', async () => {
    const [size, small, large, theme, swan, lion] = [id(0xC1), id(0xC2), id(0xC3), id(0xC4), id(0xC5), id(0xC6)]

    current = product({
      options: [
        { id: size, name: { en: 'Size', de: 'Grösse' }, values: [{ id: small, label: { en: 'Small', de: 'Klein' }, swatch: null }, { id: large, label: { en: 'Large', de: 'Gross' }, swatch: null }] },
        { id: theme, name: { en: 'Theme' }, values: [{ id: swan, label: { en: 'Swan' }, swatch: null }, { id: lion, label: { en: 'Lion Monument' }, swatch: null }] },
      ],
      variants: [
        { id: id(0xD1), skuCode: 'VX-S-SWAN', priceRappen: 3900, status: 'published', values: { [size]: small, [theme]: swan } },
        { id: id(0xD2), skuCode: 'VX-L-SWAN', priceRappen: 4900, status: 'draft', values: { [size]: large, [theme]: swan } },
        { id: id(0xD3), skuCode: 'VX-S-LION', priceRappen: 3900, status: 'archived', values: { [size]: small, [theme]: lion } },
      ],
      warnings: [{ code: 'option-labels', card: 'options', count: 3 }],
    })
    serve()
    renderKeepsakes(`/store/products/gifts/${productId}`)
    await nameField()
    await userEvent.click(screen.getByRole('button', { name: /^3\. Review and publish/ }))
    const preview = await screen.findByTestId('keepsake-preview', undefined, SLOW)

    expect(within(preview).getByRole('region', { name: 'Size' })).toHaveTextContent('Small')
    expect(within(within(preview).getByRole('region', { name: 'Size' })).getByText('Not sold')).toBeInTheDocument()
    expect(within(within(preview).getByRole('region', { name: 'Theme' })).getByText('Not sold')).toBeInTheDocument()
    expect(preview).not.toHaveTextContent('VX-S-SWAN')
  })
})
