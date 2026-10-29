import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { writeStored } from '@/lib/storage'
import { list, listItem, problem, product, productId, renderKeepsakes, setUpHarness, state, storeId, writes } from './keepsakes-harness'

vi.hoisted(() => vi.stubEnv('VITE_API_ENABLED', 'true'))

const base = `/api/store/${storeId}/products`
const SLOW = { timeout: 8000 }

beforeEach(async () => {
  await setUpHarness()
  state.answer = (call) => {
    if (call.method === 'POST' && call.path === base)
      return Response.json(product({ name: (call.body as { name: object }).name }), { status: 201 })
    if (call.method === 'GET' && call.path === `${base}/${productId}`)
      return Response.json(product())
    if (call.method === 'GET' && call.path === base)
      return Response.json(list([listItem()]))

    return undefined
  }
})

const nameField = () => screen.findByLabelText('Name (English)', undefined, SLOW)

/** Details, then Options (none), then Variants: the one variant of a keepsake with no option. */
async function toVariants(name = 'Knife') {
  await userEvent.type(await nameField(), name)
  await userEvent.click(screen.getByRole('button', { name: 'Next: Options' }))
  await userEvent.click(await screen.findByRole('button', { name: 'Next: Variants' }))
  await screen.findByRole('heading', { level: 2, name: 'One variant' })
}

/** The price field commits on blur, so tab out of it. */
async function typePrice(value: string) {
  const price = screen.getByLabelText('Price for One variant')

  await userEvent.clear(price)
  await userEvent.type(price, value)
  await userEvent.tab()
}

describe('[E6.1][create] the create flow in English', () => {
  it('[E6.1][create] starts on Details with the steps named, and needs a name in one language to go on', async () => {
    renderKeepsakes('/store/products/gifts/new')

    await nameField()
    expect(screen.getByRole('heading', { level: 1, name: 'New keepsake' })).toBeInTheDocument()
    expect(screen.getByText('Step 1 of 3 · Details')).toBeInTheDocument()
    expect(screen.getAllByRole('listitem').map(item => item.textContent)).toEqual(['1. Details', '2. Options', '3. Variants'])
    await userEvent.click(screen.getByRole('button', { name: 'Next: Options' }))

    expect(await screen.findByText('Add a name in English or German to create the keepsake.')).toBeInTheDocument()
    expect(screen.getByText('Step 1 of 3 · Details')).toBeInTheDocument()
  })

  it('[E6.1][create] a name in German alone is enough, and the text is not required to make a draft', async () => {
    renderKeepsakes('/store/products/gifts/new')

    await nameField()
    await userEvent.click(screen.getByRole('tab', { name: /Deutsch/ }))
    await userEvent.type(await screen.findByLabelText('Name (Deutsch)'), 'Messer')
    await userEvent.click(screen.getByRole('button', { name: 'Next: Options' }))
    await userEvent.click(await screen.findByRole('button', { name: 'Next: Variants' }))

    expect(await screen.findByRole('heading', { level: 2, name: 'One variant' })).toBeInTheDocument()
    expect(screen.getByText('Step 3 of 3 · Variants')).toBeInTheDocument()
  })

  it('[E6.1][create] the last step needs a code and a price, suggests a code from the name, and Create keepsake makes a draft and opens it', async () => {
    renderKeepsakes('/store/products/gifts/new')

    await toVariants()
    await userEvent.click(await screen.findByRole('button', { name: 'Create keepsake' }))

    expect(await screen.findByText('Add a SKU code.')).toBeInTheDocument()
    expect(screen.getByText('Add a price above CHF 0.')).toBeInTheDocument()
    expect(writes()).toHaveLength(0)
    await userEvent.click(screen.getByRole('button', { name: 'Use KNIFE' }))
    expect(screen.getByLabelText('SKU code for One variant')).toHaveValue('KNIFE')
    await typePrice('39')
    await userEvent.click(screen.getByRole('button', { name: 'Create keepsake' }))

    await waitFor(() => expect(writes()).toHaveLength(1))
    expect(writes()[0]).toMatchObject({ method: 'POST', path: base, body: { name: { en: 'Knife' }, text: {}, photoIds: [], options: [], variants: [{ skuCode: 'KNIFE', priceRappen: 3900, values: {} }] } })
    expect(writes()[0]!.key).toBeTruthy()
    expect(await screen.findByTestId('keepsake-editor', undefined, SLOW)).toBeInTheDocument()
    expect(screen.getByText('Draft')).toBeInTheDocument()
  })

  it('[E6.1][create] refuses a code that is not letters and digits before any request, and says a taken code is used in the shop', async () => {
    const answer = state.answer

    state.answer = call => (call.method === 'POST' ? problem(409, 'sku-code-taken') : answer(call))
    renderKeepsakes('/store/products/gifts/new')

    await toVariants()
    await userEvent.type(await screen.findByLabelText('SKU code for One variant'), 'bad code')
    await typePrice('10')
    await userEvent.click(screen.getByRole('button', { name: 'Create keepsake' }))
    expect(await screen.findByText('Letters and digits, joined by - _ or . (like VX-S-SWAN).')).toBeInTheDocument()
    expect(writes()).toHaveLength(0)
    await userEvent.clear(screen.getByLabelText('SKU code for One variant'))
    await userEvent.type(screen.getByLabelText('SKU code for One variant'), 'vx-1')
    await userEvent.click(screen.getByRole('button', { name: 'Create keepsake' }))

    expect(await screen.findByText('This SKU code is already used in your shop.')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1, name: 'New keepsake' })).toBeInTheDocument()
  })

  it('[E6.1][create] Back goes to Details with what was typed, and the arrow asks before it drops it', async () => {
    renderKeepsakes('/store/products/gifts/new')

    await toVariants()
    await userEvent.click(await screen.findByRole('button', { name: 'Back' }))
    await userEvent.click(await screen.findByRole('button', { name: 'Back' }))
    expect(await nameField()).toHaveValue('Knife')
    await userEvent.click(screen.getByRole('button', { name: 'Back to Keepsakes' }))
    const dialog = await screen.findByRole('alertdialog')

    expect(dialog).toHaveTextContent('Discard this keepsake?')
    expect(dialog).toHaveTextContent('What you entered for this keepsake is not saved anywhere yet.')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Keep editing' }))
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument())
    await userEvent.click(screen.getByRole('button', { name: 'Back to Keepsakes' }))
    await userEvent.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Discard keepsake' }))

    expect(await screen.findByTestId('keepsake-list')).toBeInTheDocument()
    expect(writes()).toHaveLength(0)
  })

  it('[E6.1][create] leaves at once when nothing was typed', async () => {
    renderKeepsakes('/store/products/gifts/new')

    await nameField()
    await userEvent.click(screen.getByRole('button', { name: 'Back to Keepsakes' }))

    expect(await screen.findByTestId('keepsake-list')).toBeInTheDocument()
  })

  it('[E6.1][AC55] has no engraving, sub-category, deposit or pay-later field on any step', async () => {
    renderKeepsakes('/store/products/gifts/new')

    await nameField()
    expect(document.body.textContent).not.toMatch(/engrav|sub-?categor|deposit|pay later/i)
    await userEvent.type(screen.getByLabelText('Name (English)'), 'Knife')
    await userEvent.click(screen.getByRole('button', { name: 'Next: Options' }))
    await screen.findByRole('heading', { level: 2, name: 'Options' })
    expect(document.body.textContent).not.toMatch(/engrav|sub-?categor|deposit|pay later/i)
    await userEvent.click(screen.getByRole('button', { name: 'Next: Variants' }))
    await screen.findByLabelText('SKU code for One variant')
    expect(document.body.textContent).not.toMatch(/engrav|sub-?categor|deposit|pay later/i)
  })
})

describe('[E6.1][i18n] the create flow in German', () => {
  beforeEach(() => writeStored('sk.language', 'de'))

  it('[E6.1][i18n] shows both steps, the refusals and the discard confirm in German', async () => {
    renderKeepsakes('/store/products/gifts/new')

    await screen.findByRole('heading', { level: 1, name: 'Neues Andenken' }, SLOW)
    expect(screen.getByText('Schritt 1 von 3 · Details')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Weiter: Optionen' }))
    expect(await screen.findByText('Geben Sie einen Namen auf Englisch oder Deutsch ein, um das Andenken zu erstellen.')).toBeInTheDocument()
    await userEvent.type(screen.getByLabelText('Name (English)'), 'Knife')
    await userEvent.click(screen.getByRole('button', { name: 'Weiter: Optionen' }))
    await userEvent.click(await screen.findByRole('button', { name: 'Weiter: Varianten' }))
    await userEvent.click(await screen.findByRole('button', { name: 'Andenken erstellen' }))
    expect(await screen.findByText('Geben Sie einen SKU-Code ein.')).toBeInTheDocument()
    expect(screen.getByText('Geben Sie einen Preis über CHF 0 ein.')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Zurück zu Andenken' }))

    expect(await screen.findByRole('alertdialog')).toHaveTextContent('Dieses Andenken verwerfen?')
    expect(document.body.textContent).not.toMatch(/keepsakes\.[a-z]/)
    expect(document.body.textContent).not.toMatch(/gravur|unterkategorie|anzahlung|später zahlen/i)
  })
})
