import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { writeStored } from '@/lib/storage'
import { list, listItem, problem, product, productId, renderKeepsakes, setUpHarness, state, storeId, variantId, writes } from './keepsakes-harness'

vi.hoisted(() => vi.stubEnv('VITE_API_ENABLED', 'true'))

vi.mock('@/hooks/use-is-wide', () => ({ useIsWide: () => false }))

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

async function openEditor() {
  const router = renderKeepsakes(`/store/products/gifts/${productId}`)

  await nameField()

  return router
}

const optionsCard = () => screen.getByRole('region', { name: 'Options' })
const variantsCard = () => screen.getByRole('region', { name: 'Variants' })

async function openMenu(card: HTMLElement, label: string, item: string) {
  await userEvent.click(within(card).getAllByRole('button', { name: label })[0]!)
  await userEvent.click(await screen.findByRole('menuitem', { name: item }))
}

describe('[E6.2][AC52] the Options card', () => {
  it('[E6.2][AC52] lists each option with its German name, its values as chips and the variants that use it', async () => {
    await openEditor()

    const grid = within(optionsCard()).getByRole('grid', { name: 'Options' })

    expect(within(grid).getByText('Size')).toBeInTheDocument()
    expect(within(grid).getByText('Grösse')).toHaveAttribute('lang', 'de')
    expect(within(grid).getByText('Small')).toBeInTheDocument()
    expect(within(grid).getByText('Lion Monument')).toBeInTheDocument()
    expect(within(grid).getAllByText('3 variants')).toHaveLength(2)
    expect(within(grid).getByText('No German name')).toBeInTheDocument()
  })

  it('[E6.2][AC52] says so when a keepsake has no option', async () => {
    current = product()
    serve()
    await openEditor()

    expect(within(optionsCard()).getByText('No options: this keepsake is sold as one variant.')).toBeInTheDocument()
    expect(within(variantsCard()).queryByRole('button', { name: 'Create' })).not.toBeInTheDocument()
  })

  it('[E6.2][AC52] Delete is refused while a variant uses the option, archived ones too, and names the variants', async () => {
    await openEditor()

    await openMenu(optionsCard(), 'Actions for Theme', 'Delete')

    expect(await within(optionsCard()).findByRole('alert')).toHaveTextContent('Can’t delete Theme. Used by 3 variants (VX-S-SWAN, VX-L-SWAN, VX-S-LION). Every variant has one of its values.')
    expect(writes()).toHaveLength(0)
  })

  it('[E6.2][AC52] an option that no variant uses asks first, then goes in one save on the version that was opened', async () => {
    current = product({ options, variants: [] })
    serve(call => (call.method === 'PUT' ? Response.json(product({ options: [options[1]!], variants: [], rowVersion: 2 })) : undefined))
    await openEditor()

    await openMenu(optionsCard(), 'Actions for Size', 'Delete')
    const dialog = await screen.findByRole('alertdialog')

    expect(dialog).toHaveTextContent('Delete the option Size?')
    expect(dialog).toHaveTextContent('Its values go too. No variant uses them.')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Delete option' }))

    await waitFor(() => expect(writes()).toHaveLength(1))
    expect(writes()[0]).toMatchObject({ method: 'PUT', path: `${detail}/options`, ifMatch: '1' })
    expect((writes()[0]!.body as { options: { ref: string }[] }).options.map(o => o.ref)).toEqual([optTheme])
    expect(writes()[0]!.key).toBeTruthy()
  })
})

describe('[E6.2][AC52] the options sheet N14', () => {
  it('[E6.2][AC52] Edit opens one option, adds a value and saves the whole list in one request; Cancel saves nothing', async () => {
    serve(call => (call.method === 'PUT' ? Response.json(product({ options, variants, rowVersion: 2 })) : undefined))
    await openEditor()

    await openMenu(optionsCard(), 'Actions for Size', 'Edit')
    let dialog = await screen.findByRole('dialog', { name: 'Edit Size' })

    expect(within(dialog).getByText('Values in the order guests see them. German names are optional; without one, German readers see the English.')).toBeInTheDocument()
    expect(within(dialog).queryByRole('region', { name: 'Theme' })).not.toBeInTheDocument()
    expect(within(dialog).getByRole('button', { name: 'Save options' })).toBeDisabled()
    await userEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }))
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Edit Size' })).not.toBeInTheDocument())
    expect(writes()).toHaveLength(0)

    await openMenu(optionsCard(), 'Actions for Size', 'Edit')
    dialog = await screen.findByRole('dialog', { name: 'Edit Size' })
    await userEvent.click(within(dialog).getByRole('button', { name: 'Add a value' }))
    const english = within(dialog).getAllByLabelText('English')

    await userEvent.type(english.at(-1)!, 'XL')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save options' }))

    await waitFor(() => expect(writes()).toHaveLength(1))
    const body = writes()[0]!.body as { options: { ref: string, name: object, values: { ref: string, label: object, swatch: string | null }[] }[], variantValues: unknown[] }

    expect(writes()[0]).toMatchObject({ method: 'PUT', ifMatch: '1' })
    expect(body.options.map(o => o.ref)).toEqual([optSize, optTheme])
    expect(body.options[0]!.name).toEqual({ en: 'Size', de: 'Grösse' })
    expect(body.options[0]!.values.slice(0, 2).map(v => v.ref)).toEqual([vSmall, vLarge])
    expect(body.options[0]!.values[2]).toMatchObject({ label: { en: 'XL' }, swatch: null })
    expect(body.variantValues).toEqual([])
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Edit Size' })).not.toBeInTheDocument())
  })

  it('[E6.2][AC52] a value that a variant uses cannot be deleted, and the refusal sits at the value and names the variants', async () => {
    await openEditor()

    await openMenu(optionsCard(), 'Actions for Theme', 'Edit')
    const dialog = await screen.findByRole('dialog', { name: 'Edit Theme' })

    await userEvent.click(within(dialog).getByRole('button', { name: 'Delete Lion Monument' }))

    expect(await within(dialog).findByText('Can’t delete Lion Monument. Used by 1 variant (VX-S-LION). Archive or change those first.')).toBeInTheDocument()
    expect(within(dialog).getByText('Lion Monument', { selector: 'span' })).toBeInTheDocument()
    expect(writes()).toHaveLength(0)
  })

  it('[E6.2][AC52] Add option: a new option needs a value for every variant, Give all fills them, and it all saves in one request', async () => {
    serve(call => (call.method === 'PUT' ? Response.json(product({ options, variants, rowVersion: 2 })) : undefined))
    await openEditor()

    await userEvent.click(within(optionsCard()).getByRole('button', { name: 'Add option' }))
    const dialog = await screen.findByRole('dialog', { name: 'Add an option' })

    await userEvent.type(within(dialog).getByLabelText('Option name (English)'), 'Colour')
    await userEvent.type(within(dialog).getByLabelText('English'), 'Red')
    expect(await within(dialog).findByRole('heading', { name: 'A colour for each of your 3 variants' })).toBeInTheDocument()
    expect(within(dialog).getByText(/3 still need one\./)).toBeInTheDocument()
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save options' }))

    expect(await within(dialog).findByText(/Not saved\. 3 things need a fix: VX-S-SWAN needs a colour\./)).toBeInTheDocument()
    expect(writes()).toHaveLength(0)
    await userEvent.click(within(dialog).getByRole('button', { name: 'Red' }))
    expect(within(dialog).getByText(/All set\./)).toBeInTheDocument()
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save options' }))

    await waitFor(() => expect(writes()).toHaveLength(1))
    const body = writes()[0]!.body as { options: { ref: string, values: { ref: string }[] }[], variantValues: { variantId: string, values: Record<string, string> }[] }
    const colour = body.options[2]!

    expect(body.options.map(o => o.ref).slice(0, 2)).toEqual([optSize, optTheme])
    expect(colour.values).toHaveLength(1)
    expect(body.variantValues.map(entry => entry.variantId).sort()).toEqual([v1, v2, v3])
    for (const entry of body.variantValues)
      expect(entry.values).toEqual({ [colour.ref]: colour.values[0]!.ref })
  })

  it('[E6.2][AC52] a refusal from the API shows in the sheet in the merchant\'s words and nothing closes', async () => {
    serve(call => (call.method === 'PUT'
      ? refused([{ in: 'body', path: `options.${optTheme}.values.${vLion}`, message: 'x', code: 'value-in-use', params: { value: 'Lion Monument', count: 1, codes: 'VX-S-LION', more: 0 } }])
      : undefined))
    await openEditor()

    await openMenu(optionsCard(), 'Actions for Size', 'Edit')
    const dialog = await screen.findByRole('dialog', { name: 'Edit Size' })

    await userEvent.click(within(dialog).getByRole('button', { name: 'Add a value' }))
    const english = within(dialog).getAllByLabelText('English')

    await userEvent.type(english.at(-1)!, 'XL')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save options' }))

    expect(await within(dialog).findByText(/Not saved\. 1 thing needs a fix: Can’t delete Lion Monument/)).toBeInTheDocument()
    expect(dialog).toBeInTheDocument()
  })

  it('[E6.2][412] a stale save says so, and the page asks for a reload', async () => {
    serve(call => (call.method === 'PUT' ? problem(412, 'precondition-failed') : undefined))
    await openEditor()

    await openMenu(optionsCard(), 'Actions for Size', 'Edit')
    const dialog = await screen.findByRole('dialog', { name: 'Edit Size' })

    await userEvent.click(within(dialog).getByRole('button', { name: 'Add a value' }))
    const english = within(dialog).getAllByLabelText('English')

    await userEvent.type(english.at(-1)!, 'XL')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save options' }))

    expect(await within(dialog).findByText(/Someone saved this keepsake after you opened it/)).toBeInTheDocument()
    expect(await screen.findByRole('button', { name: 'Reload', hidden: true })).toBeInTheDocument()
  })
})

describe('[E6.2][AC52] the Variants card N15', () => {
  it('[E6.2][AC52] has one column per option, the tabs with counts, and says how many combinations are sold', async () => {
    await openEditor()

    const card = variantsCard()
    const grid = within(card).getByRole('grid', { name: 'Variants' })

    expect(within(grid).getAllByRole('columnheader').map(h => h.textContent)).toEqual(['Variant', 'Size', 'Theme', 'Price', 'Status', 'Actions'])
    expect(within(card).getByRole('tab', { name: /All/ })).toHaveTextContent('2')
    expect(within(card).getByRole('tab', { name: /For sale/ })).toHaveTextContent('1')
    expect(within(card).getByRole('tab', { name: /Hidden/ })).toHaveTextContent('1')
    expect(within(card).getByRole('tab', { name: /Archived/ })).toHaveTextContent('1')
    expect(within(grid).getByText('VX-S-SWAN').closest('a')).toHaveAttribute('href', `/store/products/gifts/${productId}/variants/${v1}`)
    expect(within(card).getByText('Only these combinations are sold: 2 of 4 possible. Stock is set in Inventory.')).toBeInTheDocument()
    expect(within(grid).queryByText('VX-S-LION')).not.toBeInTheDocument()
  })

  it('[E6.2][AC52] the Archived tab lists archived variants and offers no action, so there is no restore', async () => {
    await openEditor()

    await userEvent.click(within(variantsCard()).getByRole('tab', { name: /Archived/ }))

    const grid = within(variantsCard()).getByRole('grid', { name: 'Variants' })

    expect(within(grid).getByText('VX-S-LION')).toBeInTheDocument()
    expect(within(grid).queryByRole('button', { name: 'Actions for VX-S-LION' })).not.toBeInTheDocument()
    expect(document.body.textContent).not.toMatch(/restore/i)
  })

  it('[E6.2][AC52] Create variant: a combination that is sold is refused at the values, archived twins say so, and nothing is sent', async () => {
    await openEditor()

    await userEvent.click(within(variantsCard()).getByRole('button', { name: 'Create' }))
    const dialog = await screen.findByRole('dialog', { name: 'Create variant' })

    await userEvent.click(within(dialog).getByRole('row', { name: 'Small' }))
    await userEvent.click(within(dialog).getByRole('row', { name: 'Swan' }))
    await userEvent.type(within(dialog).getByLabelText('SKU code'), 'vx-dup')
    await userEvent.type(within(dialog).getByLabelText('Price'), '39')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Create variant' }))

    expect(await within(dialog).findByText('Small · Swan is already sold as VX-S-SWAN. Each combination is sold once.')).toBeInTheDocument()
    await userEvent.click(within(dialog).getByRole('row', { name: 'Lion Monument' }))
    expect(await within(dialog).findByText(/Small · Lion Monument is already VX-S-LION, archived\./)).toBeInTheDocument()
    expect(writes()).toHaveLength(0)
  })

  it('[E6.2][AC52] Create variant: a missing value, a bad code and no price are refused at their fields', async () => {
    await openEditor()

    await userEvent.click(within(variantsCard()).getByRole('button', { name: 'Create' }))
    const dialog = await screen.findByRole('dialog', { name: 'Create variant' })

    await userEvent.click(within(dialog).getByRole('row', { name: 'Large' }))
    await userEvent.type(within(dialog).getByLabelText('SKU code'), 'bad code')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Create variant' }))

    expect(await within(dialog).findByText('A variant needs a theme.')).toBeInTheDocument()
    expect(within(dialog).getByText('Letters and digits, joined by - _ or . (like VX-S-SWAN).')).toBeInTheDocument()
    expect(within(dialog).getByText('Add a price above CHF 0.')).toBeInTheDocument()
    expect(writes()).toHaveLength(0)
  })

  it('[E6.2][AC52] Create variant sends one request with the value of every option, for sale', async () => {
    serve(call => (call.method === 'POST' && call.path === `${detail}/variants` ? Response.json(product({ options, variants }), { status: 201 }) : undefined))
    await openEditor()

    await userEvent.click(within(variantsCard()).getByRole('button', { name: 'Create' }))
    const dialog = await screen.findByRole('dialog', { name: 'Create variant' })

    await userEvent.click(within(dialog).getByRole('row', { name: 'Large' }))
    await userEvent.click(within(dialog).getByRole('row', { name: 'Lion Monument' }))
    await userEvent.click(await within(dialog).findByRole('button', { name: 'Use VX-L-LION' }))
    await userEvent.type(within(dialog).getByLabelText('Price'), '49')
    await userEvent.tab()
    await userEvent.click(within(dialog).getByRole('button', { name: 'Create variant' }))

    await waitFor(() => expect(writes()).toHaveLength(1))
    expect(writes()[0]).toMatchObject({ method: 'POST', path: `${detail}/variants`, ifMatch: null, body: { skuCode: 'VX-L-LION', priceRappen: 4900, status: 'published', values: { [optSize]: vLarge, [optTheme]: vLion } } })
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Create variant' })).not.toBeInTheDocument())
  })

  it('[E6.2][AC52] a code another keepsake uses is refused at the code field', async () => {
    serve(call => (call.method === 'POST' ? problem(409, 'sku-code-taken') : undefined))
    await openEditor()

    await userEvent.click(within(variantsCard()).getByRole('button', { name: 'Create' }))
    const dialog = await screen.findByRole('dialog', { name: 'Create variant' })

    await userEvent.click(within(dialog).getByRole('row', { name: 'Large' }))
    await userEvent.click(within(dialog).getByRole('row', { name: 'Lion Monument' }))
    await userEvent.type(within(dialog).getByLabelText('SKU code'), 'vx-9')
    await userEvent.type(within(dialog).getByLabelText('Price'), '10')
    await userEvent.tab()
    await userEvent.click(within(dialog).getByRole('button', { name: 'Create variant' }))

    expect(await within(dialog).findByText('VX-9 is already used in your shop.')).toBeInTheDocument()
  })

  it('[E6.2][AC52] Archive asks first, then sends the status; a variant with reserved units is refused with the number', async () => {
    serve(call => (call.method === 'PATCH' && call.path === `${detail}/variants/${v1}`
      ? refused([{ in: 'body', path: 'status', message: 'x', code: 'variant-reserved', params: { code: 'VX-S-SWAN', count: 2 } }])
      : undefined))
    await openEditor()

    await openMenu(variantsCard(), 'Actions for VX-S-SWAN', 'Archive')
    const dialog = await screen.findByRole('alertdialog')

    expect(dialog).toHaveTextContent('Archive VX-S-SWAN?')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Archive variant' }))

    await waitFor(() => expect(writes()).toHaveLength(1))
    expect(writes()[0]).toMatchObject({ method: 'PATCH', path: `${detail}/variants/${v1}`, body: { status: 'archived' } })
    expect(await within(variantsCard()).findByRole('alert')).toHaveTextContent('Can’t archive VX-S-SWAN. 2 units are reserved by open orders.')
  })
})

describe('[E6.2][AC52] the preview', () => {
  it('[E6.2][AC52] the preview shows a group of cards for each option, and a combination that is not for sale is Not sold', async () => {
    current = product({ options, variants, warnings: [{ code: 'option-labels', card: 'options', count: 3 }] })
    serve()
    await openEditor()

    await userEvent.click(screen.getByRole('button', { name: 'Review' }))
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

describe('[E6.2][AC52] the create flow with options', () => {
  it('[E6.2][AC52] Options then every combination ticked; the unticked one is not sold, and it all goes in one request', async () => {
    serve(call => (call.method === 'POST' && call.path === base ? Response.json(product({ options, variants }), { status: 201 }) : undefined))
    renderKeepsakes('/store/products/gifts/new')

    await userEvent.type(await nameField(), 'Card')
    await userEvent.click(screen.getByRole('button', { name: 'Next: Options' }))
    expect(await screen.findByText('Step 2 of 3 · Options')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Add an option' }))
    await userEvent.type(screen.getByLabelText('Option name (English)'), 'Colour')
    await userEvent.type(screen.getByLabelText('English'), 'Navy')
    await userEvent.click(screen.getByRole('button', { name: 'Add a value' }))
    await userEvent.type(screen.getAllByLabelText('English')[1]!, 'Black')
    await userEvent.click(screen.getByRole('button', { name: 'Next: Variants' }))

    expect(await screen.findByRole('heading', { level: 2, name: '2 of 2 combinations ticked' })).toBeInTheDocument()
    expect(screen.getByLabelText('SKU code for Navy')).toHaveValue('VX-N')
    await userEvent.click(screen.getByRole('checkbox', { name: /Black/ }))
    expect(await screen.findByRole('heading', { level: 2, name: '1 of 2 combinations ticked' })).toBeInTheDocument()
    expect(screen.getByText('Not sold')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Create keepsake' }))
    expect(await screen.findByText('Add a price above CHF 0.')).toBeInTheDocument()
    expect(writes()).toHaveLength(0)
    await userEvent.type(screen.getByLabelText('Price for Navy'), '39')
    await userEvent.tab()
    await userEvent.click(screen.getByRole('button', { name: 'Create keepsake' }))

    await waitFor(() => expect(writes()).toHaveLength(1))
    const body = writes()[0]!.body as { options: { ref: string, name: object, values: { ref: string, label: object }[] }[], variants: { skuCode: string, priceRappen: number, values: Record<string, string> }[] }

    expect(body.options).toHaveLength(1)
    expect(body.options[0]!.name).toEqual({ en: 'Colour' })
    expect(body.options[0]!.values.map(v => v.label)).toEqual([{ en: 'Navy' }, { en: 'Black' }])
    expect(body.variants).toEqual([{ skuCode: 'VX-N', priceRappen: 3900, values: { [body.options[0]!.ref]: body.options[0]!.values[0]!.ref } }])
  })

  it('[E6.2][AC52] Next on Options is refused with the problems, and an option needs a value', async () => {
    renderKeepsakes('/store/products/gifts/new')

    await userEvent.type(await nameField(), 'Card')
    await userEvent.click(screen.getByRole('button', { name: 'Next: Options' }))
    await userEvent.click(await screen.findByRole('button', { name: 'Add an option' }))
    await userEvent.click(screen.getByRole('button', { name: 'Next: Variants' }))

    expect(await screen.findByText(/Not saved\. 2 things need a fix: Name the option in English or German\. Name the value in English or German\./)).toBeInTheDocument()
    expect(screen.getByText('Step 2 of 3 · Options')).toBeInTheDocument()
    expect(writes()).toHaveLength(0)
  })

  it('[E6.2][AC52] the Variants step offers Tick at least one combination, and Price for all ticked fills every price', async () => {
    renderKeepsakes('/store/products/gifts/new')

    await userEvent.type(await nameField(), 'Card')
    await userEvent.click(screen.getByRole('button', { name: 'Next: Options' }))
    await userEvent.click(await screen.findByRole('button', { name: 'Add an option' }))
    await userEvent.type(screen.getByLabelText('Option name (English)'), 'Colour')
    await userEvent.type(screen.getByLabelText('English'), 'Navy')
    await userEvent.click(screen.getByRole('button', { name: 'Add a value' }))
    await userEvent.type(screen.getAllByLabelText('English')[1]!, 'Black')
    await userEvent.click(screen.getByRole('button', { name: 'Next: Variants' }))
    await screen.findByRole('heading', { level: 2, name: '2 of 2 combinations ticked' })

    await userEvent.type(screen.getByLabelText('Price for all ticked'), '25')
    await userEvent.tab()
    await userEvent.click(screen.getByRole('button', { name: 'Apply' }))
    expect((screen.getByLabelText('Price for Navy') as HTMLInputElement).value).toMatch(/CHF.?25/)
    expect((screen.getByLabelText('Price for Black') as HTMLInputElement).value).toMatch(/CHF.?25/)
    await userEvent.click(screen.getByRole('checkbox', { name: /Navy/ }))
    await userEvent.click(screen.getByRole('checkbox', { name: /Black/ }))
    await userEvent.click(screen.getByRole('button', { name: 'Create keepsake' }))

    expect(await screen.findByText('Tick at least one combination.')).toBeInTheDocument()
    expect(writes()).toHaveLength(0)
  })
})

describe('[E6.2][i18n] the option screens in German', () => {
  beforeEach(() => writeStored('sk.language', 'de'))

  it('[E6.2][i18n] shows the options table, the delete refusal, the sheet and the variants card in German, with no key left over', async () => {
    renderKeepsakes(`/store/products/gifts/${productId}`)
    const card = await screen.findByRole('region', { name: 'Optionen' }, SLOW)

    const table = within(card).getByRole('grid', { name: 'Optionen' })

    expect(within(table).getByText('Grösse')).toBeInTheDocument()
    expect(within(table).getByText('Size')).toHaveAttribute('lang', 'en')
    expect(within(table).getByText('Klein')).toBeInTheDocument()
    expect(within(table).getAllByText('3 Varianten')).toHaveLength(2)
    expect(within(table).getByText('Kein deutscher Name')).toBeInTheDocument()
    await openMenu(card, 'Aktionen für Theme', 'Löschen')
    expect(await within(card).findByRole('alert')).toHaveTextContent('Theme kann nicht gelöscht werden. Verwendet von 3 Varianten (VX-S-SWAN, VX-L-SWAN, VX-S-LION). Jede Variante hat einen ihrer Werte.')
    await userEvent.click(within(card).getByRole('button', { name: 'Option hinzufügen' }))
    const dialog = await screen.findByRole('dialog', { name: 'Option hinzufügen' })

    expect(within(dialog).getByRole('button', { name: 'Optionen speichern' })).toBeInTheDocument()
    await userEvent.type(within(dialog).getByLabelText('Optionsname (Englisch)'), 'Colour')
    await userEvent.type(within(dialog).getByLabelText('Englisch'), 'Red')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Optionen speichern' }))
    expect(await within(dialog).findByText(/Nicht gespeichert\. 3 Punkte müssen korrigiert werden: VX-S-SWAN braucht einen Wert für colour\./)).toBeInTheDocument()
    await userEvent.click(within(dialog).getByRole('button', { name: 'Abbrechen' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())

    const variantsRegion = screen.getByRole('region', { name: 'Varianten' })

    expect(within(variantsRegion).getByRole('tab', { name: /Archiviert/ })).toBeInTheDocument()
    expect(within(variantsRegion).getByText('Nur diese Kombinationen werden verkauft: 2 von 4 möglichen. Der Bestand wird im Inventar gesetzt.')).toBeInTheDocument()
    await userEvent.click(within(variantsRegion).getByRole('button', { name: 'Erstellen' }))
    expect(await screen.findByRole('dialog', { name: 'Variante erstellen' })).toBeInTheDocument()
    expect(document.body.textContent).not.toMatch(/keepsakes\.[a-z]/)
    expect(document.body.textContent).not.toMatch(/gravur|unterkategorie|anzahlung|später zahlen/i)
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
