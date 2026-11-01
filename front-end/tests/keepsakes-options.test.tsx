import { toast } from '@heroui/react'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { writeStored } from '@/lib/storage'
import { list, listItem, problem, product, productId, renderKeepsakes, setUpHarness, state, storeId, variantId, writes } from './keepsakes-harness'

vi.hoisted(() => vi.stubEnv('VITE_API_ENABLED', 'true'))

// jsdom is not wide, so the phone view renders; the option tests that need the laptop view turn it on.
const view = vi.hoisted(() => ({ wide: false }))

vi.mock('@/hooks/use-is-wide', () => ({ useIsWide: () => view.wide }))

afterEach(() => {
  vi.restoreAllMocks()
  view.wide = false
})

const base = `/api/store/${storeId}/products`
const detail = `${base}/${productId}`
const SLOW = { timeout: 8000 }
const id = (n: number) => `0198a000-0000-7000-8000-0000000000${n.toString(16).padStart(2, '0')}`
const optSize = id(0xC1)
const vSmall = id(0xC2)
const vLarge = id(0xC3)
const optTheme = id(0xC4)
const vSwan = id(0xC5)
const vLion = id(0xC6)
const v1 = id(0xD1)
const v2 = id(0xD2)
const v3 = id(0xD3)

const options = [
  { id: optSize, name: { en: 'Size', de: 'Grösse' }, values: [{ id: vSmall, label: { en: 'Small', de: 'Klein' }, swatch: null }, { id: vLarge, label: { en: 'Large', de: 'Gross' }, swatch: null }] },
  { id: optTheme, name: { en: 'Theme' }, values: [{ id: vSwan, label: { en: 'Swan' }, swatch: null }, { id: vLion, label: { en: 'Lion Monument' }, swatch: null }] },
]
// Small and Swan for sale, Large and Swan hidden, Small and Lion archived: three of the four combinations are taken.
const variants = [
  { id: v1, skuCode: 'VX-S-SWAN', priceRappen: 3900, status: 'published', values: { [optSize]: vSmall, [optTheme]: vSwan } },
  { id: v2, skuCode: 'VX-L-SWAN', priceRappen: 4900, status: 'draft', values: { [optSize]: vLarge, [optTheme]: vSwan } },
  { id: v3, skuCode: 'VX-S-LION', priceRappen: 3900, status: 'archived', values: { [optSize]: vSmall, [optTheme]: vLion } },
]

let current: ReturnType<typeof product>

function serve(extra: (call: (typeof state.calls)[number]) => Response | undefined = () => undefined) {
  state.answer = (call) => {
    const custom = extra(call)

    if (custom)
      return custom
    if (call.method === 'GET' && call.path === detail)
      return Response.json(current)
    if (call.method === 'GET' && call.path === base)
      return Response.json(list([listItem()]))

    return undefined
  }
}

const refused = (errors: object[]) => Response.json({ type: 'validation-failed', status: 422, title: 'x', instance: '/x', requestId: 'r', errors }, { status: 422 })

beforeEach(async () => {
  current = product({ options, variants })
  await setUpHarness()
  serve()
})

const nameField = () => screen.findByLabelText('Name (English)', undefined, SLOW)

async function openEditor(step?: 'options' | 'variants') {
  const router = renderKeepsakes(`/store/products/gifts/${productId}${step ? `?step=${step}` : ''}`)

  await nameField()

  return router
}

const optionsCard = () => screen.getByRole('region', { name: 'Options' })
const variantsCard = () => screen.getByRole('region', { name: 'Variants' })

const optionList = () => within(optionsCard()).getByRole('navigation', { name: 'Options' })
const optionDetail = () => within(optionsCard()).getByTestId('option-detail')
const saveLine = () => within(optionsCard()).getByTestId('save-line')
const optionsBody = () => writes()[0]!.body as { options: { ref: string, name: object, values: { ref: string, label: object, swatch: string | null }[] }[], variantValues: { variantId: string, values: Record<string, string> }[] }
const addValues = (text: string) => userEvent.type(within(optionDetail()).getByPlaceholderText('Add a value and press Enter'), `${text}{Enter}`)
const saved = (extra: Record<string, unknown> = {}) => serve(call => (call.method === 'PUT' ? Response.json(product({ options, variants, rowVersion: 2, ...extra })) : undefined))

describe('[T-007A] the Options step on a laptop: the list and the chosen option', () => {
  beforeEach(() => {
    view.wide = true
  })

  it('[T-007A] shows the options as a list with their values on one line, and the chosen one whole beside it with the variants that use each value', async () => {
    await openEditor('options')

    expect(within(optionsCard()).getByText('What guests choose between, like size or colour.')).toBeInTheDocument()
    expect(within(optionList()).getByRole('button', { name: /^Size/ })).toHaveAttribute('aria-current', 'true')
    expect(within(optionList()).getByText('Small, Large')).toBeInTheDocument()
    expect(within(optionList()).getByText('Swan, Lion Monument')).toBeInTheDocument()
    expect(within(optionDetail()).getByLabelText('Option name (English)')).toHaveValue('Size')
    const values = within(optionDetail()).getByRole('list', { name: 'Values of Size, in the order guests see them' })

    expect(within(values).getByRole('button', { name: 'Rename Small' })).toBeInTheDocument()
    expect(within(values).getByRole('button', { name: 'Rename Large' })).toBeInTheDocument()
    expect(within(values).getByText('2 variants')).toBeInTheDocument()
    expect(within(values).getByText('1 variant')).toBeInTheDocument()
    expect(within(saveLine()).getByRole('status')).toHaveTextContent('All changes saved')
    expect(within(saveLine()).queryByRole('button', { name: 'Save' })).not.toBeInTheDocument()

    await userEvent.click(within(optionList()).getByRole('button', { name: /^Theme/ }))
    expect(within(optionDetail()).getByLabelText('Option name (English)')).toHaveValue('Theme')
    expect(within(optionDetail()).getByRole('button', { name: 'Rename Lion Monument' })).toBeInTheDocument()
  })

  it('[T-007A] says so when a keepsake has no option, and Add option starts one on its name field', async () => {
    current = product()
    serve()
    await openEditor('options')

    expect(within(optionsCard()).getByText(/^No options: this keepsake is sold as one variant\./)).toBeInTheDocument()
    expect(within(optionsCard()).queryByTestId('save-line')).not.toBeInTheDocument()
    await userEvent.click(within(optionsCard()).getByRole('button', { name: 'Add option' }))

    await waitFor(() => expect(within(optionDetail()).getByLabelText('Option name (English)')).toHaveFocus())
    expect(within(optionList()).getByText('Unnamed option')).toBeInTheDocument()
    expect(within(saveLine()).getByRole('status')).toHaveTextContent('Unsaved changes')
  })

  it('[T-007A][AC-1] adds an option with its values from one field, in order, and saves the whole list in one request', async () => {
    const success = vi.spyOn(toast, 'success')

    current = product({ options, variants: [] })
    serve(call => (call.method === 'PUT' ? Response.json(product({ options, variants: [], rowVersion: 2 })) : undefined))
    await openEditor('options')

    await userEvent.click(within(optionsCard()).getByRole('button', { name: 'Add option' }))
    await userEvent.type(within(optionDetail()).getByLabelText('Option name (English)'), 'Finish')
    await addValues('Matte, Glossy')
    await addValues('Satin')
    await userEvent.click(within(saveLine()).getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(writes()).toHaveLength(1))
    expect(writes()[0]).toMatchObject({ method: 'PUT', path: `${detail}/options`, ifMatch: '1' })
    expect(optionsBody().options.map(o => o.ref).slice(0, 2)).toEqual([optSize, optTheme])
    expect(optionsBody().options[2]!.name).toEqual({ en: 'Finish' })
    expect(optionsBody().options[2]!.values.map(v => v.label)).toEqual([{ en: 'Matte' }, { en: 'Glossy' }, { en: 'Satin' }])
    expect(optionsBody().variantValues).toEqual([])
    await waitFor(() => expect(within(saveLine()).getByRole('status')).toHaveTextContent('All changes saved'))
    expect(success).toHaveBeenCalledExactlyOnceWith('Options saved.')
  })

  it('[T-007A] a tap renames a value in place and keeps its German name; Save sends it with the version that was opened', async () => {
    saved()
    await openEditor('options')

    await userEvent.click(within(optionDetail()).getByRole('button', { name: 'Rename Large' }))
    const field = within(optionDetail()).getByLabelText('Rename Large')

    await waitFor(() => expect(field).toHaveFocus())
    await userEvent.clear(field)
    await userEvent.type(field, 'Big{Enter}')

    expect(within(optionDetail()).getByRole('button', { name: 'Rename Big' })).toBeInTheDocument()
    expect(within(saveLine()).getByRole('status')).toHaveTextContent('Unsaved changes')
    await userEvent.click(within(saveLine()).getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(writes()).toHaveLength(1))
    expect(writes()[0]).toMatchObject({ ifMatch: '1' })
    expect(optionsBody().options[0]!.values[1]).toMatchObject({ ref: vLarge, label: { en: 'Big', de: 'Gross' } })
  })

  it('[T-007A][AC-2] an option with no name in either language, or a value twice in one option, is named at the field and nothing is sent', async () => {
    await openEditor('options')

    await userEvent.click(within(optionsCard()).getByRole('button', { name: 'Add option' }))
    await addValues('Red, red')
    expect(await within(optionDetail()).findByText('red is already in the list.')).toBeInTheDocument()
    await userEvent.clear(within(optionDetail()).getByPlaceholderText('Add a value and press Enter'))
    await addValues('Blue')
    await userEvent.click(within(optionDetail()).getByRole('button', { name: 'Rename Blue' }))
    await userEvent.clear(within(optionDetail()).getByLabelText('Rename Blue'))
    await userEvent.type(within(optionDetail()).getByLabelText('Rename Blue'), 'RED{Enter}')

    expect(await within(optionDetail()).findByText('RED is already a value of this option. Each value is listed once.')).toBeInTheDocument()
    expect(within(optionList()).getByRole('button', { name: /Needs a look/ })).toBeInTheDocument()
    await userEvent.click(within(saveLine()).getByRole('button', { name: 'Save' }))

    expect(await within(optionDetail()).findByText('Name the option in English or German.')).toBeInTheDocument()
    expect(within(saveLine()).getByText('Not saved. 3 things to fix, shown above.')).toBeInTheDocument()
    expect(within(optionDetail()).getByText('3 variants still need a value for this option.')).toBeInTheDocument()
    expect(writes()).toHaveLength(0)
  })

  it('[T-007A][AC-3] a new option on a keepsake with variants asks for a value of it on every variant, archived too, and saves them in the same request', async () => {
    saved()
    await openEditor('options')

    await userEvent.click(within(optionsCard()).getByRole('button', { name: 'Add option' }))
    await userEvent.type(within(optionDetail()).getByLabelText('Option name (English)'), 'Colour')
    await addValues('Red, Blue')
    const panel = await within(optionDetail()).findByTestId('assign-panel')

    expect(within(panel).getByText('Your 3 variants each need a value for Colour')).toBeInTheDocument()
    expect(within(panel).getByText('0 of 3 set')).toBeInTheDocument()
    await userEvent.click(within(saveLine()).getByRole('button', { name: 'Save' }))

    expect(await within(panel).findByText('3 variants still need a value for Colour.')).toBeInTheDocument()
    expect(writes()).toHaveLength(0)
    await userEvent.click(within(panel).getByRole('button', { name: 'Choose per variant' }))
    expect(within(panel).getByText('VX-S-LION · archived')).toBeInTheDocument()
    expect(within(panel).getByText('VX-L-SWAN · hidden')).toBeInTheDocument()
    await userEvent.click(within(panel).getByRole('button', { name: 'All Red' }))
    expect(within(panel).getByText('All 3 set')).toBeInTheDocument()
    expect(within(panel).queryByText(/still need a value/)).not.toBeInTheDocument()
    await userEvent.click(within(saveLine()).getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(writes()).toHaveLength(1))
    const colour = optionsBody().options[2]!

    expect(colour.values).toHaveLength(2)
    expect(optionsBody().variantValues.map(entry => entry.variantId).sort()).toEqual([v1, v2, v3])
    for (const entry of optionsBody().variantValues)
      expect(entry.values).toEqual({ [colour.ref]: colour.values[0]!.ref })
  })

  it('[T-007A][AC-4] a value that a variant uses cannot be removed: the refusal sits at the value and names the variants', async () => {
    await openEditor('options')
    await userEvent.click(within(optionList()).getByRole('button', { name: /^Theme/ }))

    await userEvent.click(within(optionDetail()).getByRole('button', { name: 'Remove Lion Monument' }))

    expect(await within(optionDetail()).findByText('Can’t delete Lion Monument. Used by 1 variant (VX-S-LION). Archive or change those first.')).toBeInTheDocument()
    expect(within(optionDetail()).getByRole('button', { name: 'Rename Lion Monument' })).toBeInTheDocument()
    expect(within(optionList()).getByRole('button', { name: /Needs a look/ })).toBeInTheDocument()
    expect(within(saveLine()).getByRole('status')).toHaveTextContent('All changes saved')
    expect(writes()).toHaveLength(0)
  })

  it('[T-007A][AC-4] an option that variants use cannot be deleted: it is refused with no question, and names the variants, archived ones too', async () => {
    await openEditor('options')
    await userEvent.click(within(optionList()).getByRole('button', { name: /^Theme/ }))

    await userEvent.click(within(optionDetail()).getByRole('button', { name: 'Delete option' }))

    expect(await within(optionDetail()).findByText('Can’t delete Theme. Used by 3 variants (VX-S-SWAN, VX-L-SWAN, VX-S-LION). Every variant has one of its values.')).toBeInTheDocument()
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(writes()).toHaveLength(0)
  })

  it('[T-007A] an option that no variant uses asks first, goes from the list at once, and is deleted for good with Save; Discard brings it back', async () => {
    current = product({ options, variants: [] })
    serve(call => (call.method === 'PUT' ? Response.json(product({ options: [options[1]!], variants: [], rowVersion: 2 })) : undefined))
    await openEditor('options')

    await userEvent.click(within(optionDetail()).getByRole('button', { name: 'Delete option' }))
    let dialog = await screen.findByRole('alertdialog')

    expect(dialog).toHaveTextContent('Delete the option Size?')
    expect(dialog).toHaveTextContent('Its values go too. No variant uses them.')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Delete option' }))
    await waitFor(() => expect(within(optionList()).queryByRole('button', { name: /^Size/ })).not.toBeInTheDocument())
    expect(within(optionDetail()).getByLabelText('Option name (English)')).toHaveValue('Theme')
    expect(writes()).toHaveLength(0)

    await userEvent.click(within(saveLine()).getByRole('button', { name: 'Discard' }))
    expect(within(optionList()).getByRole('button', { name: /^Size/ })).toBeInTheDocument()
    await userEvent.click(within(optionDetail()).getByRole('button', { name: 'Delete option' }))
    dialog = await screen.findByRole('alertdialog')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Delete option' }))
    await userEvent.click(within(saveLine()).getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(writes()).toHaveLength(1))
    expect(optionsBody().options.map(o => o.ref)).toEqual([optTheme])
    expect(writes()[0]!.key).toBeTruthy()
    await waitFor(() => expect(within(optionList()).queryByRole('button', { name: /^Size/ })).not.toBeInTheDocument())
  })

  it('[T-007A] German names are a closed section with a count; open, they are a translation list that saves with the option', async () => {
    saved()
    await openEditor('options')
    await userEvent.click(within(optionList()).getByRole('button', { name: /^Theme/ }))

    const toggle = within(optionDetail()).getByRole('button', { name: 'German names (optional) · 3 missing' })

    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(within(optionDetail()).queryByPlaceholderText('German')).not.toBeInTheDocument()
    await userEvent.click(toggle)
    expect(within(optionDetail()).getByText('Left empty, German readers see the English.')).toBeInTheDocument()
    const fields = within(optionDetail()).getAllByPlaceholderText('German')

    expect(fields).toHaveLength(3)
    expect(fields[0]).toHaveAttribute('lang', 'de')
    await userEvent.type(fields[0]!, 'Motiv')
    await userEvent.type(fields[2]!, 'Löwendenkmal')
    expect(within(optionDetail()).getByRole('button', { name: 'German names (optional) · 1 missing' })).toBeInTheDocument()
    await userEvent.click(within(saveLine()).getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(writes()).toHaveLength(1))
    expect(optionsBody().options[1]!.name).toEqual({ en: 'Theme', de: 'Motiv' })
    expect(optionsBody().options[1]!.values[1]!.label).toEqual({ en: 'Lion Monument', de: 'Löwendenkmal' })
  })

  it('[T-007A][AC-8] the arrow keys on a value’s grip move it, keep the focus on it and say the new position', async () => {
    saved()
    await openEditor('options')

    const grip = within(optionDetail()).getByRole('button', { name: 'Move Small. Position 1 of 2. Use the up and down arrow keys.' })

    grip.focus()
    await userEvent.keyboard('{ArrowDown}')

    expect(await within(optionDetail()).findByRole('status')).toHaveTextContent('Small moved to position 2 of 2.')
    await waitFor(() => expect(within(optionDetail()).getByRole('button', { name: 'Move Small. Position 2 of 2. Use the up and down arrow keys.' })).toHaveFocus())
    await userEvent.click(within(saveLine()).getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(writes()).toHaveLength(1))
    expect(optionsBody().options[0]!.values.map(v => v.ref)).toEqual([vLarge, vSmall])
  })

  it('[T-007A] colour swatches switch on for all values of an option and are sent with them', async () => {
    saved()
    await openEditor('options')

    expect(within(optionDetail()).queryByRole('button', { name: /^Colour of Small/ })).not.toBeInTheDocument()
    await userEvent.click(within(optionDetail()).getByRole('switch', { name: 'Show values as colour swatches' }))
    expect(within(optionDetail()).getByRole('button', { name: 'Colour of Small: #888888' })).toBeInTheDocument()
    await userEvent.click(within(saveLine()).getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(writes()).toHaveLength(1))
    expect(optionsBody().options[0]!.values.map(v => v.swatch)).toEqual(['#888888', '#888888'])
  })

  it('[T-007A] a refusal from the API shows in the merchant’s words at the value, and nothing closes or is lost', async () => {
    const danger = vi.spyOn(toast, 'danger')

    serve(call => (call.method === 'PUT'
      ? refused([{ in: 'body', path: `options.${optTheme}.values.${vLion}`, message: 'x', code: 'value-in-use', params: { value: 'Lion Monument', count: 1, codes: 'VX-S-LION', more: 0 } }])
      : undefined))
    await openEditor('options')
    await addValues('XL')
    await userEvent.click(within(saveLine()).getByRole('button', { name: 'Save' }))

    expect(await within(saveLine()).findByText('Not saved. One thing to fix, shown above.')).toBeInTheDocument()
    await userEvent.click(within(optionList()).getByRole('button', { name: /Needs a look/ }))
    expect(within(optionDetail()).getByText(/Can’t delete Lion Monument/)).toBeInTheDocument()
    expect(within(saveLine()).getByRole('button', { name: 'Save' })).toBeInTheDocument()
    expect(danger).not.toHaveBeenCalled()
  })

  it('[E6.2][412] a stale save says so, and the page asks for a reload', async () => {
    serve(call => (call.method === 'PUT' ? problem(412, 'precondition-failed') : undefined))
    await openEditor('options')

    await addValues('XL')
    await userEvent.click(within(saveLine()).getByRole('button', { name: 'Save' }))

    expect(await within(saveLine()).findByText(/Someone saved this keepsake after you opened it/)).toBeInTheDocument()
    expect(await screen.findByRole('button', { name: 'Reload', hidden: true })).toBeInTheDocument()
  })
})

describe('[T-007A] the Options step on a phone: the list, and an option in the shared sheet', () => {
  it('[T-007A] shows only the list; a tap opens the option in a sheet with Save and Cancel, and Cancel puts everything back', async () => {
    await openEditor('options')

    expect(within(optionsCard()).queryByTestId('option-detail')).not.toBeInTheDocument()
    await userEvent.click(within(optionList()).getByRole('button', { name: /^Size/ }))
    const dialog = await screen.findByRole('dialog', { name: 'Edit Size' })

    expect(within(dialog).getByLabelText('Option name (English)')).toHaveValue('Size')
    await userEvent.type(within(dialog).getByPlaceholderText('Add a value and press Enter'), 'XL{Enter}')
    expect(within(dialog).getByRole('button', { name: 'Rename XL' })).toBeInTheDocument()
    await userEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }))

    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Edit Size' })).not.toBeInTheDocument())
    expect(within(optionList()).getByText('Small, Large')).toBeInTheDocument()
    expect(within(saveLine()).getByRole('status')).toHaveTextContent('All changes saved')
    expect(writes()).toHaveLength(0)
  })

  it('[T-007A] Save in the sheet sends the whole list in one request and closes it', async () => {
    const success = vi.spyOn(toast, 'success')

    saved()
    await openEditor('options')

    await userEvent.click(within(optionList()).getByRole('button', { name: /^Size/ }))
    const dialog = await screen.findByRole('dialog', { name: 'Edit Size' })

    await userEvent.type(within(dialog).getByPlaceholderText('Add a value and press Enter'), 'XL{Enter}')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(writes()).toHaveLength(1))
    expect(writes()[0]).toMatchObject({ method: 'PUT', ifMatch: '1' })
    expect(optionsBody().options[0]!.values[2]).toMatchObject({ label: { en: 'XL' }, swatch: null })
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Edit Size' })).not.toBeInTheDocument())
    expect(success).toHaveBeenCalledExactlyOnceWith('Options saved.')
  })

  it('[T-007A] Add option opens an empty option in the sheet; Save with no name is refused in the sheet, and Cancel leaves no option behind', async () => {
    await openEditor('options')

    await userEvent.click(within(optionList()).getByRole('button', { name: 'Add option' }))
    const dialog = await screen.findByRole('dialog', { name: 'Add an option' })

    await waitFor(() => expect(within(dialog).getByLabelText('Option name (English)')).toHaveFocus())
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save' }))
    expect(await within(dialog).findByText('Name the option in English or German.')).toBeInTheDocument()
    expect(within(dialog).getByText('Not saved. 2 things to fix, shown above.')).toBeInTheDocument()
    expect(writes()).toHaveLength(0)
    await userEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }))

    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Add an option' })).not.toBeInTheDocument())
    expect(within(optionList()).queryByText('Unnamed option')).not.toBeInTheDocument()
  })

  it('[T-007A] a delete that a variant forbids is refused in the sheet', async () => {
    await openEditor('options')

    await userEvent.click(within(optionList()).getByRole('button', { name: /^Theme/ }))
    const dialog = await screen.findByRole('dialog', { name: 'Edit Theme' })

    await userEvent.click(within(dialog).getByRole('button', { name: 'Delete option' }))
    expect(await within(dialog).findByText(/Can’t delete Theme\. Used by 3 variants/)).toBeInTheDocument()
    expect(writes()).toHaveLength(0)
  })

  it('[T-007A] options that are typed and not saved stay when another step opens and the page comes back', async () => {
    view.wide = true
    await openEditor('options')

    await addValues('XL')
    await userEvent.click(screen.getByRole('button', { name: 'Next' }))
    await screen.findByRole('region', { name: 'Variants' })
    await userEvent.click(screen.getByRole('button', { name: 'Previous step' }))

    expect(await within(optionDetail()).findByRole('button', { name: 'Rename XL' })).toBeInTheDocument()
    expect(within(saveLine()).getByRole('status')).toHaveTextContent('Unsaved changes')
  })
})

/** A value of an option, picked in the app's select. */
async function choose(form: HTMLElement, option: string, value: string) {
  await userEvent.click(within(form).getByRole('button', { name: new RegExp(option) }))
  await userEvent.click(await screen.findByRole('option', { name: new RegExp(value) }))
}

const row = (name: RegExp) => within(variantsCard()).getByRole('button', { name })

async function newVariant() {
  await userEvent.click(within(variantsCard()).getAllByRole('button', { name: 'Add variant' })[0]!)

  return screen.findByRole('form', { name: 'New variant' })
}

describe('[T-007B] the Variants step: the list and the chosen variant', () => {
  it('[T-007B] lists the variants for sale and hidden with price and status as coloured text, and folds the archived one away', async () => {
    await openEditor('variants')

    const card = variantsCard()

    expect(row(/Small · Swan/)).toHaveTextContent('CHF 39.00 · On sale')
    expect(within(row(/Small · Swan/)).getByText('On sale')).toHaveClass('text-success')
    expect(row(/Large · Swan/)).toHaveTextContent('CHF 49.00 · Hidden')
    expect(within(row(/Large · Swan/)).getByText('Hidden')).toHaveClass('text-muted')
    expect(within(card).queryByRole('button', { name: /Lion Monument/ })).not.toBeInTheDocument()
    expect(within(card).getByText('1 archived')).toBeInTheDocument()
    expect(within(card).getByText('Kept for old orders. An archived variant can’t be put back on sale.')).toBeInTheDocument()
    expect(within(card).getByText('Only these combinations are sold: 2 of 4 possible. Stock is set in Inventory.')).toBeInTheDocument()
    expect(within(card).getByText('Choose a variant to change it, or add one.')).toBeInTheDocument()
    expect(document.body.textContent).not.toMatch(/restore|in stock \d|sold out/i)
  })

  it('[T-007B] opening a variant shows its name, values, price and code, and All variants goes back', async () => {
    await openEditor('variants')

    await userEvent.click(row(/Small · Swan/))
    const form = await screen.findByRole('form', { name: 'Edit Small · Swan' })

    expect(within(form).getByRole('heading', { level: 4, name: 'Small · Swan' })).toBeInTheDocument()
    expect(within(form).getByText('Stock is set in Inventory.')).toBeInTheDocument()
    expect(within(form).getByLabelText('Price, CHF')).toHaveValue('39.00')
    expect(within(form).getByLabelText('SKU code')).toHaveValue('VX-S-SWAN')
    expect(within(form).getByRole('switch', { name: 'On sale' })).toBeChecked()
    await userEvent.click(within(form).getByRole('button', { name: 'All variants' }))
    expect(screen.queryByRole('form', { name: 'Edit Small · Swan' })).not.toBeInTheDocument()
  })

  it('[T-007B][AC-6] a value that would repeat a combination stays listed, disabled, and says which combination exists', async () => {
    await openEditor('variants')

    const form = await newVariant()

    await choose(form, 'Theme', 'Swan')
    await userEvent.click(within(form).getByRole('button', { name: /Size/ }))
    const small = await screen.findByRole('option', { name: /Small/ })

    expect(small).toHaveAttribute('aria-disabled', 'true')
    expect(small).toHaveTextContent('Small · Swan already exists')
    expect(screen.getByRole('option', { name: /Large/ })).toHaveAttribute('aria-disabled', 'true')
    expect(writes()).toHaveLength(0)
  })

  it('[T-007B][AC-6] an archived combination stays taken: Small and Lion Monument is disabled too', async () => {
    await openEditor('variants')

    const form = await newVariant()

    await choose(form, 'Size', 'Small')
    await userEvent.click(within(form).getByRole('button', { name: /Theme/ }))

    expect(await screen.findByRole('option', { name: /Lion Monument/ })).toHaveAttribute('aria-disabled', 'true')
  })

  it('[T-007B][AC-6] the API refusing a combination names the existing variant, archived ones included', async () => {
    serve(call => (call.method === 'POST' && call.path === `${detail}/variants`
      ? refused([{ in: 'body', path: 'values', message: 'x', code: 'combination-taken', params: { code: 'VX-S-LION', archived: 1 } }])
      : undefined))
    await openEditor('variants')

    const form = await newVariant()

    await choose(form, 'Size', 'Large')
    await choose(form, 'Theme', 'Lion Monument')
    await userEvent.type(within(form).getByLabelText('Price, CHF'), '49')
    await userEvent.click(within(form).getByRole('button', { name: 'Add variant' }))

    expect(await within(form).findByText(/Large · Lion Monument is already VX-S-LION, archived\./)).toBeInTheDocument()
  })

  it('[T-007B][AC-5] Add variant sends one request with the value of every option, the code made from them and the price, for sale', async () => {
    const success = vi.spyOn(toast, 'success')
    serve(call => (call.method === 'POST' && call.path === `${detail}/variants` ? Response.json(product({ options, variants }), { status: 201 }) : undefined))
    await openEditor('variants')

    const form = await newVariant()

    expect(within(form).getByText('Starts with 0 in stock. Stock is set in Inventory.')).toBeInTheDocument()
    await choose(form, 'Size', 'Large')
    await choose(form, 'Theme', 'Lion Monument')
    expect(within(form).getByRole('heading', { level: 4, name: 'Large · Lion Monument' })).toBeInTheDocument()
    expect(within(form).getByLabelText('SKU code')).toHaveAttribute('placeholder', 'VX-L-LION')
    await userEvent.type(within(form).getByLabelText('Price, CHF'), '49')
    await userEvent.click(within(form).getByRole('button', { name: 'Add variant' }))

    await waitFor(() => expect(writes()).toHaveLength(1))
    expect(writes()[0]).toMatchObject({ method: 'POST', path: `${detail}/variants`, ifMatch: null, body: { skuCode: 'VX-L-LION', priceRappen: 4900, status: 'published', values: { [optSize]: vLarge, [optTheme]: vLion } } })
    await waitFor(() => expect(screen.queryByRole('form', { name: 'New variant' })).not.toBeInTheDocument())
    expect(success).toHaveBeenCalledExactlyOnceWith('VX-L-LION created.')
  })

  it('[T-007B] a missing value, a bad code and no price are refused at their fields before any request', async () => {
    await openEditor('variants')

    const form = await newVariant()

    await choose(form, 'Size', 'Large')
    await userEvent.type(within(form).getByLabelText('SKU code'), 'bad code')
    await userEvent.click(within(form).getByRole('button', { name: 'Add variant' }))

    expect(await within(form).findByText(/needs a theme\./)).toBeInTheDocument()
    expect(within(form).getByText('Letters and digits, joined by - _ or . (like VX-S-SWAN).')).toBeInTheDocument()
    expect(within(form).getByText('Add a price above CHF 0.')).toBeInTheDocument()
    expect(writes()).toHaveLength(0)
  })

  it('[T-007B] a code another keepsake uses is refused at the code field', async () => {
    serve(call => (call.method === 'POST' ? problem(409, 'sku-code-taken') : undefined))
    await openEditor('variants')

    const form = await newVariant()

    await choose(form, 'Size', 'Large')
    await choose(form, 'Theme', 'Lion Monument')
    await userEvent.type(within(form).getByLabelText('SKU code'), 'vx-9')
    await userEvent.type(within(form).getByLabelText('Price, CHF'), '10')
    await userEvent.click(within(form).getByRole('button', { name: 'Add variant' }))

    expect(await within(form).findByText('VX-9 is already used in your shop.')).toBeInTheDocument()
  })

  it('[T-007B] a changed price saves with the code, the status and the values, and the list shows it', async () => {
    const success = vi.spyOn(toast, 'success')
    const next = variants.map(variant => (variant.id === v1 ? { ...variant, priceRappen: 4500 } : variant))

    serve(call => (call.method === 'PATCH' && call.path === `${detail}/variants/${v1}` ? Response.json(product({ options, variants: next })) : undefined))
    await openEditor('variants')

    await userEvent.click(row(/Small · Swan/))
    const form = await screen.findByRole('form', { name: 'Edit Small · Swan' })

    await userEvent.clear(within(form).getByLabelText('Price, CHF'))
    await userEvent.type(within(form).getByLabelText('Price, CHF'), '45')
    await userEvent.click(within(form).getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(writes()).toHaveLength(1))
    expect(writes()[0]).toMatchObject({ method: 'PATCH', path: `${detail}/variants/${v1}`, ifMatch: null, body: { skuCode: 'VX-S-SWAN', priceRappen: 4500, status: 'published', values: { [optSize]: vSmall, [optTheme]: vSwan } } })
    expect(await screen.findByRole('button', { name: /Small · Swan/ })).toHaveTextContent('CHF 45.00')
    expect(success).toHaveBeenCalledExactlyOnceWith('VX-S-SWAN saved.')
  })

  it('[T-007B] the On sale switch off hides the variant', async () => {
    const next = variants.map(variant => (variant.id === v1 ? { ...variant, status: 'draft' } : variant))

    serve(call => (call.method === 'PATCH' ? Response.json(product({ options, variants: next })) : undefined))
    await openEditor('variants')

    await userEvent.click(row(/Small · Swan/))
    const form = await screen.findByRole('form', { name: 'Edit Small · Swan' })

    await userEvent.click(within(form).getByRole('switch', { name: 'On sale' }))
    await userEvent.click(within(form).getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(writes()).toHaveLength(1))
    expect(writes()[0]!.body).toMatchObject({ status: 'draft' })
    expect(await screen.findByRole('button', { name: /Small · Swan/ })).toHaveTextContent('Hidden')
  })

  it('[T-007B] Archive asks first, then sends the status; a variant with reserved units is refused with the number, in the detail', async () => {
    const danger = vi.spyOn(toast, 'danger')
    serve(call => (call.method === 'PATCH' && call.path === `${detail}/variants/${v1}`
      ? refused([{ in: 'body', path: 'status', message: 'x', code: 'variant-reserved', params: { code: 'VX-S-SWAN', count: 2 } }])
      : undefined))
    await openEditor('variants')

    await userEvent.click(row(/Small · Swan/))
    const form = await screen.findByRole('form', { name: 'Edit Small · Swan' })

    await userEvent.click(within(form).getByRole('button', { name: 'Archive variant' }))
    const dialog = await screen.findByRole('alertdialog')

    expect(dialog).toHaveTextContent('Archive VX-S-SWAN?')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Archive variant' }))

    await waitFor(() => expect(writes()).toHaveLength(1))
    expect(writes()[0]).toMatchObject({ method: 'PATCH', path: `${detail}/variants/${v1}`, body: { status: 'archived' } })
    expect(await within(form).findByRole('alert')).toHaveTextContent('Can’t archive VX-S-SWAN. 2 units are reserved by open orders.')
    expect(danger).not.toHaveBeenCalled()
  })

  it('[T-007B] a keepsake with no variant shows the empty state with Add variant', async () => {
    current = product({ options, variants: [] })
    serve()
    await openEditor('variants')

    const card = variantsCard()

    expect(within(card).getByText('No variants yet.')).toBeInTheDocument()
    await userEvent.click(within(card).getByRole('button', { name: 'Add variant' }))
    expect(await screen.findByRole('form', { name: 'New variant' })).toBeInTheDocument()
  })

  it('[T-007B] once every combination exists there is no Add variant, only the choice to open one', async () => {
    current = product({ options, variants: [...variants, { id: id(0xD4), skuCode: 'VX-L-LION', priceRappen: 4900, status: 'published', values: { [optSize]: vLarge, [optTheme]: vLion } }] })
    serve()
    await openEditor('variants')

    expect(within(variantsCard()).queryByRole('button', { name: 'Add variant' })).not.toBeInTheDocument()
    expect(within(variantsCard()).getByText('Choose a variant to change it.')).toBeInTheDocument()
  })
})

describe('[E6.2][AC52] the preview', () => {
  it('[E6.2][AC52] the preview shows a group of cards for each option, and a combination that is not for sale is Not sold', async () => {
    current = product({ options, variants, warnings: [{ code: 'option-labels', card: 'options', count: 3 }] })
    serve()
    await openEditor()

    await userEvent.click(screen.getByRole('button', { name: /^4\. Review and publish/ }))
    const preview = await screen.findByTestId('keepsake-preview', undefined, SLOW)

    expect(within(preview).getByRole('region', { name: 'Size' })).toHaveTextContent('Small')
    expect(within(within(preview).getByRole('region', { name: 'Size' })).getByText('Not sold')).toBeInTheDocument()
    expect(within(within(preview).getByRole('region', { name: 'Theme' })).getByText('Not sold')).toBeInTheDocument()
    expect(preview).not.toHaveTextContent('VX-S-SWAN')
  })
})

describe('[E6.2][AC52] the variant page', () => {
  async function openPage(variant = v1) {
    renderKeepsakes(`/store/products/gifts/${productId}/variants/${variant}`)
    await screen.findByTestId('variant-page', undefined, SLOW)
  }

  it('[E6.2][AC52] shows the option values, the code, the price and the status, with a way back to the keepsake', async () => {
    await openPage()

    expect(screen.getByRole('heading', { level: 1, name: 'Small / Swan' })).toBeInTheDocument()
    expect(screen.getAllByRole('heading', { level: 2 }).map(h => h.textContent)).toEqual(['Details', 'Media'])
    expect(screen.queryAllByRole('heading', { level: 3 })).toEqual([])
    expect(screen.getByText('For sale')).toBeInTheDocument()
    expect(screen.getByText('VX-S-SWAN')).toBeInTheDocument()
    expect(screen.getByText('Size')).toBeInTheDocument()
    expect(screen.getByText('Theme')).toBeInTheDocument()
    expect(screen.getByText(/CHF\s*39/)).toBeInTheDocument()
    expect(screen.getByText('No photo of its own: guests see the keepsake’s photos.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Back to Victorinox Classic' })).toBeInTheDocument()
  })

  it('[E6.2][AC52] Edit opens the sheet on its values and saves the new combination in one request', async () => {
    serve(call => (call.method === 'PATCH' ? Response.json(product({ options, variants })) : undefined))
    await openPage()

    await userEvent.click(screen.getByRole('button', { name: 'Actions for VX-S-SWAN' }))
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Edit' }))
    const dialog = await screen.findByRole('dialog', { name: 'Edit Small / Swan' })

    await userEvent.click(within(dialog).getByRole('row', { name: 'Large' }))
    await userEvent.click(within(dialog).getByRole('row', { name: 'Lion Monument' }))
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(writes()).toHaveLength(1))
    expect(writes()[0]).toMatchObject({ method: 'PATCH', path: `${detail}/variants/${v1}`, body: { skuCode: 'VX-S-SWAN', priceRappen: 3900, status: 'published', values: { [optSize]: vLarge, [optTheme]: vLion } } })
  })

  it('[E6.2][AC52] an archived variant shows as archived and has no menu', async () => {
    await openPage(v3)

    expect(screen.getByText('Archived')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^Actions for/ })).not.toBeInTheDocument()
  })

  it('[E6.2][AC52] a variant that is not there says so', async () => {
    renderKeepsakes(`/store/products/gifts/${productId}/variants/${id(0xEE)}`)

    expect(await screen.findByText('This variant no longer exists.', undefined, SLOW)).toBeInTheDocument()
  })
})

/** A new keepsake on its Options step: a name, then Next. */
async function toNewOptions() {
  renderKeepsakes('/store/products/gifts/new')
  await userEvent.type(await nameField(), 'Card')
  await userEvent.click(screen.getByRole('button', { name: 'Next' }))
  expect(await screen.findByText(/Step 2 of 4/)).toBeInTheDocument()
}

async function addColour() {
  await userEvent.click(await screen.findByRole('button', { name: 'Add option' }))
  await userEvent.type(screen.getByLabelText('Option name (English)'), 'Colour')
  await userEvent.type(screen.getByPlaceholderText('Add a value and press Enter'), 'Navy, Black{Enter}')
}

describe('[T-007A][AC-7] a new keepsake with options: the same control, held in the browser', () => {
  beforeEach(() => {
    view.wide = true
  })

  it('[T-007A] has the list and the option and no Save line; the variant takes a value of it, and it all goes in one request at step 4', async () => {
    serve(call => (call.method === 'POST' && call.path === base ? Response.json(product({ options, variants }), { status: 201 }) : undefined))
    await toNewOptions()
    await addColour()

    expect(within(optionsCard()).getByRole('navigation', { name: 'Options' })).toHaveTextContent('Navy, Black')
    expect(within(optionsCard()).queryByRole('button', { name: 'Save' })).not.toBeInTheDocument()
    expect(within(optionsCard()).queryByText(/Unsaved changes|All changes saved/)).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Next' }))
    await screen.findByRole('region', { name: 'Variants' })
    await userEvent.click(screen.getAllByRole('button', { name: 'Add variant' })[0]!)
    const form = await screen.findByRole('form', { name: 'New variant' })

    await userEvent.click(within(form).getByRole('button', { name: /Colour/ }))
    await userEvent.click(await screen.findByRole('option', { name: 'Navy' }))
    expect(within(form).getByLabelText('SKU code')).toHaveAttribute('placeholder', 'VX-N')
    await userEvent.type(within(form).getByLabelText('Price, CHF'), '39')
    await userEvent.click(within(form).getByRole('button', { name: 'Add variant' }))
    expect(await screen.findByRole('button', { name: /Navy/ })).toHaveTextContent('CHF 39.00 · On sale')
    expect(writes()).toHaveLength(0)
    await userEvent.click(screen.getByRole('button', { name: 'Next' }))
    await screen.findByTestId('review-screen', undefined, SLOW)
    await userEvent.click(screen.getByRole('button', { name: 'Save as draft' }))

    await waitFor(() => expect(writes()).toHaveLength(1))
    const body = writes()[0]!.body as { options: { ref: string, name: object, values: { ref: string, label: object }[] }[], variants: { skuCode: string, priceRappen: number, values: Record<string, string> }[] }

    expect(body.options).toHaveLength(1)
    expect(body.options[0]!.name).toEqual({ en: 'Colour' })
    expect(body.options[0]!.values.map(v => v.label)).toEqual([{ en: 'Navy' }, { en: 'Black' }])
    expect(body.variants).toEqual([{ skuCode: 'VX-N', priceRappen: 3900, values: { [body.options[0]!.ref]: body.options[0]!.values[0]!.ref } }])
  })

  it('[T-007A] Next on Options is refused with what is wrong, shown at the option, and the step stays', async () => {
    await toNewOptions()
    await userEvent.click(await screen.findByRole('button', { name: 'Add option' }))
    await userEvent.click(screen.getByRole('button', { name: 'Next' }))

    expect(await screen.findByText('2 things to fix, shown above.')).toBeInTheDocument()
    expect(screen.getByText('Name the option in English or German.')).toBeInTheDocument()
    expect(screen.getByText('This option needs at least one value.')).toBeInTheDocument()
    expect(screen.getByText(/Step 2 of 4/)).toBeInTheDocument()
    expect(writes()).toHaveLength(0)
  })

  it('[T-007B] an option changed after a variant was added leaves the variant needing a value, and Next refuses it', async () => {
    await toNewOptions()
    await addColour()
    await userEvent.click(screen.getByRole('button', { name: 'Next' }))
    await screen.findByRole('region', { name: 'Variants' })
    await userEvent.click(screen.getAllByRole('button', { name: 'Add variant' })[0]!)
    const form = await screen.findByRole('form', { name: 'New variant' })

    await userEvent.click(within(form).getByRole('button', { name: /Colour/ }))
    await userEvent.click(await screen.findByRole('option', { name: 'Navy' }))
    await userEvent.type(within(form).getByLabelText('Price, CHF'), '39')
    await userEvent.click(within(form).getByRole('button', { name: 'Add variant' }))
    await userEvent.click(screen.getByRole('button', { name: 'Previous step' }))
    await userEvent.click(await screen.findByRole('button', { name: /^Colour/ }))
    await userEvent.click(await screen.findByRole('button', { name: 'Remove Navy' }))
    await userEvent.type(screen.getByPlaceholderText('Add a value and press Enter'), 'Red{Enter}')
    await userEvent.click(screen.getByRole('button', { name: 'Next' }))
    await screen.findByRole('region', { name: 'Variants' })

    expect(await screen.findByRole('button', { name: /…/ })).toHaveTextContent('Needs a value')
    await userEvent.click(screen.getByRole('button', { name: 'Next' }))
    expect(await screen.findByText('1 variant needs a value. Open it to choose.')).toBeInTheDocument()
    expect(screen.getByText(/Step 3 of 4/)).toBeInTheDocument()
    expect(writes()).toHaveLength(0)
  })

  it('[T-007A] going back to Options keeps the option that was typed', async () => {
    await toNewOptions()
    await addColour()
    await userEvent.click(screen.getByRole('button', { name: 'Next' }))
    await screen.findByRole('region', { name: 'Variants' })
    await userEvent.click(screen.getByRole('button', { name: 'Previous step' }))

    expect(await screen.findByLabelText('Option name (English)')).toHaveValue('Colour')
    expect(screen.getByRole('button', { name: 'Rename Navy' })).toBeInTheDocument()
  })
})

describe('[T-007A][AC-7] a new keepsake on a phone: the option opens in the sheet and Done keeps it in the browser', () => {
  it('[T-007A] Add option opens the sheet, Done is refused until the option has a name and a value, and then the list shows it', async () => {
    await toNewOptions()

    await userEvent.click(await screen.findByRole('button', { name: 'Add option' }))
    const dialog = await screen.findByRole('dialog', { name: 'Add an option' })

    await userEvent.click(within(dialog).getByRole('button', { name: 'Done' }))
    expect(await within(dialog).findByText('2 things to fix, shown above.')).toBeInTheDocument()
    await userEvent.type(within(dialog).getByLabelText('Option name (English)'), 'Colour')
    await userEvent.type(within(dialog).getByPlaceholderText('Add a value and press Enter'), 'Navy{Enter}')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Done' }))

    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Add an option' })).not.toBeInTheDocument())
    expect(within(optionsCard()).getByRole('navigation', { name: 'Options' })).toHaveTextContent('Navy')
    expect(writes()).toHaveLength(0)
  })

  it('[T-007A] Cancel in the sheet puts back the option as it was when the sheet opened', async () => {
    await toNewOptions()
    await userEvent.click(await screen.findByRole('button', { name: 'Add option' }))
    let dialog = await screen.findByRole('dialog', { name: 'Add an option' })

    await userEvent.type(within(dialog).getByLabelText('Option name (English)'), 'Colour')
    await userEvent.type(within(dialog).getByPlaceholderText('Add a value and press Enter'), 'Navy{Enter}')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Done' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())

    await userEvent.click(within(optionsCard()).getByRole('button', { name: /^Colour/ }))
    dialog = await screen.findByRole('dialog', { name: 'Edit Colour' })
    await userEvent.type(within(dialog).getByPlaceholderText('Add a value and press Enter'), 'Black{Enter}')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(within(optionsCard()).getByRole('navigation', { name: 'Options' })).toHaveTextContent('Navy')
    expect(within(optionsCard()).getByRole('navigation', { name: 'Options' })).not.toHaveTextContent('Black')
  })
})

describe('[E6.2][i18n] the option screens in German', () => {
  beforeEach(() => writeStored('sk.language', 'de'))

  it('[T-007A][i18n] shows the Options step, its refusals, the German section and the variants card in German, with no key left over', async () => {
    view.wide = true
    renderKeepsakes(`/store/products/gifts/${productId}?step=options`)
    const card = await screen.findByRole('region', { name: 'Optionen' }, SLOW)
    const list = within(card).getByRole('navigation', { name: 'Optionen' })

    expect(within(card).getByText('Zwischen diesen Optionen wählen Gäste, etwa Grösse oder Farbe.')).toBeInTheDocument()
    expect(within(list).getByText('Klein, Gross')).toBeInTheDocument()
    expect(within(list).getByText('Swan, Lion Monument')).toBeInTheDocument()
    expect(within(card).getByLabelText('Optionsname (Englisch)')).toHaveValue('Size')
    expect(within(card).getByTestId('save-line')).toHaveTextContent('Alle Änderungen gespeichert')
    expect(within(card).getByRole('button', { name: 'Deutsche Namen · alle gesetzt' })).toBeInTheDocument()
    await userEvent.click(within(list).getByRole('button', { name: /^Theme/ }))
    await userEvent.click(within(card).getByRole('button', { name: 'Deutsche Namen (freiwillig) · 3 fehlen' }))
    expect(within(card).getByText('Ohne deutschen Namen sehen deutsche Leser den englischen.')).toBeInTheDocument()
    expect(within(card).getAllByPlaceholderText('Deutsch')).toHaveLength(3)
    await userEvent.click(within(card).getByRole('button', { name: 'Lion Monument entfernen' }))
    expect(await within(card).findByText('Lion Monument kann nicht gelöscht werden. Verwendet von 1 Variante (VX-S-LION). Archivieren oder ändern Sie diese zuerst.')).toBeInTheDocument()
    await userEvent.click(within(card).getByRole('button', { name: 'Option löschen' }))
    expect(await within(card).findByText(/Theme kann nicht gelöscht werden\. Verwendet von 3 Varianten/)).toBeInTheDocument()
    await userEvent.click(within(card).getByRole('button', { name: 'Option hinzufügen' }))
    await userEvent.type(within(card).getByPlaceholderText('Wert eingeben und Enter drücken'), 'Red, red{Enter}')
    expect(await within(card).findByText('red steht schon in der Liste.')).toBeInTheDocument()
    await userEvent.click(within(card).getByRole('button', { name: 'Speichern' }))
    expect(await within(card).findByText('Nicht gespeichert. 2 Punkte müssen korrigiert werden, siehe oben.')).toBeInTheDocument()
    expect(within(card).getByText('Benennen Sie die Option auf Englisch oder Deutsch.')).toBeInTheDocument()
    await userEvent.click(within(card).getByRole('button', { name: 'Verwerfen' }))

    await userEvent.click(screen.getByRole('button', { name: 'Weiter' }))
    const variantsRegion = await screen.findByRole('region', { name: 'Varianten' })

    expect(within(variantsRegion).getByText('Nur diese Kombinationen werden verkauft: 2 von 4 möglichen. Der Bestand wird im Inventar gesetzt.')).toBeInTheDocument()
    expect(within(variantsRegion).getByText('1 archiviert')).toBeInTheDocument()
    await userEvent.click(within(variantsRegion).getAllByRole('button', { name: 'Variante hinzufügen' })[0]!)
    expect(await screen.findByRole('form', { name: 'Neue Variante' })).toBeInTheDocument()
    expect(document.body.textContent).not.toMatch(/keepsakes\.[a-z]/)
    expect(document.body.textContent).not.toMatch(/gravur|unterkategorie|anzahlung|später zahlen/i)
  }, 30_000)

  it('[T-007A][i18n] the phone sheet and the assign panel read in German', async () => {
    renderKeepsakes(`/store/products/gifts/${productId}?step=options`)
    const card = await screen.findByRole('region', { name: 'Optionen' }, SLOW)

    await userEvent.click(within(card).getByRole('button', { name: 'Option hinzufügen' }))
    const dialog = await screen.findByRole('dialog', { name: 'Option hinzufügen' })

    await userEvent.type(within(dialog).getByLabelText('Optionsname (Englisch)'), 'Colour')
    await userEvent.type(within(dialog).getByPlaceholderText('Wert eingeben und Enter drücken'), 'Red{Enter}')
    const panel = await within(dialog).findByTestId('assign-panel')

    expect(within(panel).getByText('Ihre 3 Varianten brauchen je einen Wert für Colour')).toBeInTheDocument()
    await userEvent.click(within(panel).getByRole('button', { name: 'Alle Red' }))
    expect(within(panel).getByText('Alle 3 gesetzt')).toBeInTheDocument()
    await userEvent.click(within(dialog).getByRole('button', { name: 'Abbrechen' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(document.body.textContent).not.toMatch(/keepsakes\.[a-z]/)
  }, 30_000)

  it('[E6.2][i18n] shows the variant page in German', async () => {
    renderKeepsakes(`/store/products/gifts/${productId}/variants/${v1}`)
    await screen.findByTestId('variant-page', undefined, SLOW)

    expect(screen.getByRole('button', { name: 'Zurück zu Victorinox Classic' })).toBeInTheDocument()
    expect(screen.getByText('Im Verkauf')).toBeInTheDocument()
    expect(screen.getByText('SKU-Code')).toBeInTheDocument()
    expect(screen.getByText('Kein eigenes Foto: Gäste sehen die Fotos des Andenkens.')).toBeInTheDocument()
    expect(screen.getByText('Klein / Swan')).toBeInTheDocument()
    expect(document.body.textContent).not.toMatch(/keepsakes\.[a-z]/)
  })
})

void variantId
