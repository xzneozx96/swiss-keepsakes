import { toast } from '@heroui/react'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { writeStored } from '@/lib/storage'
import { list, listItem, media, problem, product, productId, renderKeepsakes, setUpHarness, state, storeId, writes } from './keepsakes-harness'

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

afterEach(() => vi.restoreAllMocks())

const nameField = () => screen.findByLabelText('Name (English)', undefined, SLOW)

const next = () => userEvent.click(screen.getByRole('button', { name: 'Next' }))

/** Details, then Options (none), then Variants: the one variant of a keepsake with no option. */
async function toVariants(name = 'Knife') {
  await userEvent.type(await nameField(), name)
  await next()
  await screen.findByRole('region', { name: 'Options' })
  await next()
  await screen.findByRole('heading', { level: 2, name: 'One variant' })
}

/** The price field commits on blur, so tab out of it. */
async function typePrice(value: string) {
  const price = screen.getByLabelText('Price for One variant')

  await userEvent.clear(price)
  await userEvent.type(price, value)
  await userEvent.tab()
}

const language = { current: 'en' }

const stepButtons = () => within(screen.getByRole('navigation', { name: language.current === 'de' ? 'Schritte' : 'Steps' })).getAllByRole('button')

describe('[E6.1][create] a new keepsake in the stepped editor, in English', () => {
  it('[T-005] opens in the same editor as a saved keepsake: four steps, a Draft chip, the bar not saved yet, and Review closed', async () => {
    renderKeepsakes('/store/products/gifts/new')

    await nameField()
    expect(screen.getByRole('heading', { level: 1, name: 'New keepsake' })).toBeInTheDocument()
    expect(within(screen.getByTestId('keepsake-status')).getByText('Draft')).toBeInTheDocument()
    expect(stepButtons().map(button => button.getAttribute('aria-label')?.replace(/,.*$/, ''))).toEqual(['1. Details', '2. Options', '3. Variants', '4. Review and publish'])
    expect(stepButtons().map(button => (button as HTMLButtonElement).disabled)).toEqual([true, true, true, true])
    expect(screen.queryByText('1. Details', { selector: 'li' })).not.toBeInTheDocument()
    expect(screen.getByText('Not saved yet')).toBeInTheDocument()
    expect(screen.getAllByRole('heading', { level: 2 }).map(h => h.textContent).filter(text => !text?.startsWith('Step'))).toEqual(['Name and text', 'Photos', 'Partner\'s commission rate (%)'])
    expect(screen.queryByRole('button', { name: 'Previous step' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^Save/ })).not.toBeInTheDocument()
  })

  it('[T-005] Next needs a name in one language, and says so at the name field', async () => {
    renderKeepsakes('/store/products/gifts/new')

    await nameField()
    await next()

    expect(await screen.findByText('Add a name in English or German to create the keepsake.')).toBeInTheDocument()
    expect(screen.getByText(/Step 1 of 4/)).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Name and text' })).toBeVisible()
    expect(screen.getByRole('button', { name: '1. Details, Has errors' })).toBeInTheDocument()
  })

  it('[T-005] a name in German alone is enough, and the text is not required to make a draft', async () => {
    renderKeepsakes('/store/products/gifts/new')

    await nameField()
    await userEvent.click(screen.getByRole('tab', { name: /Deutsch/ }))
    await userEvent.type(await screen.findByLabelText('Name (Deutsch)'), 'Messer')
    await next()
    await screen.findByRole('region', { name: 'Options' })
    await next()

    expect(await screen.findByRole('heading', { level: 2, name: 'One variant' })).toBeInTheDocument()
    expect(screen.getByText(/Step 3 of 4/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '1. Details, Done' })).toBeInTheDocument()
  })

  it('[T-005] holds the three steps in the browser: nothing is sent before Create keepsake, and the steps reached can be opened again', async () => {
    renderKeepsakes('/store/products/gifts/new')

    await toVariants()
    await typePrice('39')
    expect(writes()).toHaveLength(0)
    expect(state.calls.some(call => call.method !== 'GET')).toBe(false)
    await userEvent.click(screen.getByRole('button', { name: '1. Details, Done' }))
    expect(await nameField()).toHaveValue('Knife')
    expect(stepButtons().map(button => (button as HTMLButtonElement).disabled)).toEqual([true, false, false, true])
    await userEvent.click(screen.getByRole('button', { name: /^3\. Variants/ }))
    expect(await screen.findByLabelText('Price for One variant')).toHaveValue('CHF\u00A039.00')
    expect(writes()).toHaveLength(0)
  })

  it('[T-005] the last step needs a code and a price, suggests a code from the name, and Create keepsake makes a draft and opens Review and publish', async () => {
    const success = vi.spyOn(toast, 'success')
    const router = renderKeepsakes('/store/products/gifts/new')

    await toVariants()
    expect(screen.queryByRole('button', { name: 'Next' })).not.toBeInTheDocument()
    await userEvent.click(await screen.findByRole('button', { name: 'Create keepsake' }))

    expect(await screen.findByText('Add a SKU code.')).toBeInTheDocument()
    expect(screen.getByText('Add a price above CHF 0.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '3. Variants, Has errors' })).toBeInTheDocument()
    expect(writes()).toHaveLength(0)
    await userEvent.click(screen.getByRole('button', { name: 'Use KNIFE' }))
    expect(screen.getByLabelText('SKU code for One variant')).toHaveValue('KNIFE')
    await typePrice('39')
    await userEvent.click(screen.getByRole('button', { name: 'Create keepsake' }))

    await waitFor(() => expect(writes()).toHaveLength(1))
    expect(writes()[0]).toMatchObject({ method: 'POST', path: base, body: { name: { en: 'Knife' }, text: {}, photoIds: [], commissionRate: 0, options: [], variants: [{ skuCode: 'KNIFE', priceRappen: 3900, values: {} }] } })
    expect(writes()[0]!.key).toBeTruthy()
    expect(await screen.findByTestId('review-screen', undefined, SLOW)).toBeInTheDocument()
    expect(router.state.location.pathname).toBe(`/store/products/gifts/${productId}`)
    expect(router.state.location.search).toMatchObject({ step: 'review' })
    expect(within(screen.getByTestId('keepsake-status')).getByText('Draft')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^4\. Review and publish/ })).toHaveAttribute('aria-current', 'step')
    expect(success).toHaveBeenCalledExactlyOnceWith('Knife created as a draft with 1 variant.')
  })

  it('[T-005] the commission set in Details goes with the create request', async () => {
    renderKeepsakes('/store/products/gifts/new')

    await userEvent.type(await nameField(), 'Knife')
    const increase = screen.getAllByRole('button', { name: /increase|increment/i })[0]!

    for (let i = 0; i < 15; i++)
      await userEvent.click(increase)
    await next()
    await screen.findByRole('region', { name: 'Options' })
    await next()
    await userEvent.type(await screen.findByLabelText('SKU code for One variant'), 'K-1')
    await typePrice('10')
    await userEvent.click(screen.getByRole('button', { name: 'Create keepsake' }))

    await waitFor(() => expect(writes()).toHaveLength(1))
    expect(writes()[0]!.body).toMatchObject({ commissionRate: 0.15 })
  })

  it('[T-005] pressing Create keepsake twice makes one keepsake', async () => {
    renderKeepsakes('/store/products/gifts/new')

    await toVariants()
    await userEvent.type(screen.getByLabelText('SKU code for One variant'), 'K-1')
    await typePrice('10')
    await userEvent.dblClick(screen.getByRole('button', { name: 'Create keepsake' }))

    await waitFor(() => expect(writes().length).toBeGreaterThan(0))
    await screen.findByTestId('review-screen', undefined, SLOW)
    expect(writes().filter(call => call.method === 'POST')).toHaveLength(1)
  })

  it('[T-005] refuses a code that is not letters and digits before any request, and says a taken code is used in the shop above the step', async () => {
    const answer = state.answer
    const danger = vi.spyOn(toast, 'danger')

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
    expect(screen.queryByTestId('review-screen')).not.toBeInTheDocument()
    expect(danger).not.toHaveBeenCalled()
  })

  it('[T-005] Back goes to the step before with what was typed, and the arrow asks before it drops it', async () => {
    renderKeepsakes('/store/products/gifts/new')

    await toVariants()
    await userEvent.click(await screen.findByRole('button', { name: 'Previous step' }))
    await userEvent.click(await screen.findByRole('button', { name: 'Previous step' }))
    expect(await nameField()).toHaveValue('Knife')
    await userEvent.click(screen.getByRole('button', { name: 'Back to Keepsakes' }))
    const dialog = await screen.findByRole('alertdialog')

    expect(dialog).toHaveTextContent('Discard this keepsake?')
    expect(dialog).toHaveTextContent('What you entered for this keepsake is not saved anywhere yet.')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Keep editing' }))
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument())
    expect(nameField()).resolves.toHaveValue('Knife')
    await userEvent.click(screen.getByRole('button', { name: 'Back to Keepsakes' }))
    await userEvent.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Discard keepsake' }))

    expect(await screen.findByTestId('keepsake-list')).toBeInTheDocument()
    expect(writes()).toHaveLength(0)
  })

  it('[T-005] leaves at once when nothing was typed', async () => {
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
    await next()
    await screen.findByRole('heading', { level: 2, name: 'Options' })
    expect(document.body.textContent).not.toMatch(/engrav|sub-?categor|deposit|pay later/i)
    await next()
    await screen.findByLabelText('SKU code for One variant')
    expect(document.body.textContent).not.toMatch(/engrav|sub-?categor|deposit|pay later/i)
  })
})

describe('[T-005] photos on a new keepsake', () => {
  const added = '0198a000-0000-7000-8000-0000000000e2'
  const uploaded = { ...media, id: added }

  /** The upload of one file; the file's PUT answers only when `release` runs, so the photo is "still uploading". */
  function holdUpload() {
    let release = () => {}
    const gate = new Promise<void>((resolve) => {
      release = resolve
    })
    const answer = state.answer

    state.answer = (call) => {
      if (call.path === `/api/store/${storeId}/media/uploads`)
        return Response.json({ uploadKey: 'k/u.jpg', url: 'https://storage.test/uploads/k/u.jpg', method: 'PUT', headers: { 'Content-Type': 'image/jpeg' }, expiresAt: '2026-10-30T09:00:00.000Z', kind: 'image' })
      if (call.path.startsWith('/uploads/'))
        return gate.then(() => new Response(null, { status: 200 })) as unknown as Response
      if (call.path === `/api/store/${storeId}/media/confirm`)
        return Response.json({ ...uploaded, status: 'processing', publicUrl: null, variants: [] }, { status: 201 })
      if (call.path === `/api/store/${storeId}/media/${added}`)
        return Response.json(uploaded)

      return answer(call)
    }

    return release
  }

  it('[T-005] refuses Create keepsake while a photo is still uploading, and makes it with the photo once the upload is done', { timeout: 20_000 }, async () => {
    const release = holdUpload()

    renderKeepsakes('/store/products/gifts/new')

    await userEvent.type(await nameField(), 'Knife')
    await userEvent.upload(screen.getByTestId('photo-input'), new File(['x'], 'knife.jpg', { type: 'image/jpeg' }))
    await next()
    await screen.findByRole('region', { name: 'Options' })
    await next()
    await userEvent.type(await screen.findByLabelText('SKU code for One variant'), 'K-1')
    await typePrice('10')
    await userEvent.click(screen.getByRole('button', { name: 'Create keepsake' }))

    expect(await screen.findByText('A photo is still uploading. Wait until it is done, then create the keepsake.')).toBeInTheDocument()
    expect(writes().filter(call => call.method === 'POST' && call.path === base)).toHaveLength(0)
    release()
    await waitFor(() => expect(state.calls.map(call => call.path)).toContain(`/api/store/${storeId}/media/confirm`), SLOW)
    await userEvent.click(screen.getByRole('button', { name: 'Create keepsake' }))

    await waitFor(() => expect(writes().filter(call => call.method === 'POST' && call.path === base)).toHaveLength(1), SLOW)
    expect(writes().find(call => call.path === base)!.body).toMatchObject({ photoIds: [added] })
  })
})

describe('[E6.1][i18n] a new keepsake in German', () => {
  beforeEach(() => {
    writeStored('sk.language', 'de')
    language.current = 'de'
  })

  afterEach(() => {
    language.current = 'en'
  })

  it('[E6.1][i18n] shows the steps, the refusals and the discard confirm in German', async () => {
    renderKeepsakes('/store/products/gifts/new')

    await screen.findByRole('heading', { level: 1, name: 'Neues Andenken' }, SLOW)
    expect(screen.getByText(/Schritt 1 von 4/)).toBeInTheDocument()
    expect(screen.getByText('Noch nicht gespeichert')).toBeInTheDocument()
    expect(stepButtons().map(button => button.getAttribute('aria-label')?.replace(/,.*$/, ''))).toEqual(['1. Details', '2. Optionen', '3. Varianten', '4. Prüfen und veröffentlichen'])
    await userEvent.click(screen.getByRole('button', { name: 'Weiter' }))
    expect(await screen.findByText('Geben Sie einen Namen auf Englisch oder Deutsch ein, um das Andenken zu erstellen.')).toBeInTheDocument()
    await userEvent.type(screen.getByLabelText('Name (English)'), 'Knife')
    await userEvent.click(screen.getByRole('button', { name: 'Weiter' }))
    await screen.findByRole('region', { name: 'Optionen' })
    await userEvent.click(screen.getByRole('button', { name: 'Weiter' }))
    await userEvent.click(await screen.findByRole('button', { name: 'Andenken erstellen' }))
    expect(await screen.findByText('Geben Sie einen SKU-Code ein.')).toBeInTheDocument()
    expect(screen.getByText('Geben Sie einen Preis über CHF 0 ein.')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Zurück zu Andenken' }))

    expect(await screen.findByRole('alertdialog')).toHaveTextContent('Dieses Andenken verwerfen?')
    expect(document.body.textContent).not.toMatch(/keepsakes\.[a-z]|steps\.[a-z]/)
    expect(document.body.textContent).not.toMatch(/gravur|unterkategorie|anzahlung|später zahlen/i)
  })
})
