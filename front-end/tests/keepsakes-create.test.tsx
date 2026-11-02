import { toast } from '@heroui/react'
import { cleanup, screen, waitFor, within } from '@testing-library/react'
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

/** Details, then Options and variants (no option yet): the Price card is the step's first block. */
async function toOptions(name = 'Knife') {
  await userEvent.type(await nameField(), name)
  await next()
  await screen.findByRole('region', { name: 'Price' })
}

/** The price of the one variant of a keepsake with no option, and its code when one is given: each is kept when the field is left. */
async function setPrice(price: string, code?: string) {
  const card = screen.getByRole('region', { name: 'Price' })

  if (code)
    await userEvent.type(within(card).getByLabelText('SKU code'), code)
  await userEvent.type(within(card).getByLabelText('Price, CHF'), price)
  await userEvent.tab()
}

/** Review and publish of a new keepsake: the step bar's two actions. */
const saveDraft = () => userEvent.click(screen.getByRole('button', { name: 'Save as draft' }))
const publish = () => userEvent.click(screen.getByRole('button', { name: 'Publish' }))

const language = { current: 'en' }

const stepButtons = () => within(screen.getByRole('navigation', { name: language.current === 'de' ? 'Schritte' : 'Steps' })).getAllByRole('button')

describe('[E6.1][create] a new keepsake in the stepped editor, in English', () => {
  it('[T-005] opens in the same editor as a saved keepsake: three steps, a Draft chip, the bar not saved yet, and Review closed', async () => {
    renderKeepsakes('/store/products/gifts/new')

    await nameField()
    expect(screen.getByRole('heading', { level: 1, name: 'New keepsake' })).toBeInTheDocument()
    expect(within(screen.getByTestId('keepsake-status')).getByText('Draft')).toBeInTheDocument()
    expect(stepButtons().map(button => button.getAttribute('aria-label')?.replace(/,.*$/, ''))).toEqual(['1. Details', '2. Options and variants', '3. Review and publish'])
    expect(stepButtons().map(button => (button as HTMLButtonElement).disabled)).toEqual([true, true, true])
    expect(screen.queryByText('1. Details', { selector: 'li' })).not.toBeInTheDocument()
    expect(screen.getByText('Not saved yet')).toBeInTheDocument()
    expect(screen.getAllByRole('heading', { level: 3 }).map(h => h.textContent)).toEqual(['Name and text', 'Photos', 'Partner\'s commission rate (%)'])
    expect(screen.queryByRole('button', { name: 'Previous step' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^Save/ })).not.toBeInTheDocument()
  })

  it('[T-005] Next needs a name in one language, and says so at the name field', async () => {
    renderKeepsakes('/store/products/gifts/new')

    await nameField()
    await next()

    expect(await screen.findByText('Add a name in English or German to create the keepsake.')).toBeInTheDocument()
    expect(screen.getByText(/Step 1 of 3/)).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Name and text' })).toBeVisible()
    expect(screen.getByRole('button', { name: '1. Details, Has errors' })).toBeInTheDocument()
  })

  it('[T-005] a name in German alone is enough, and the text is not required to make a draft', async () => {
    renderKeepsakes('/store/products/gifts/new')

    await nameField()
    await userEvent.click(screen.getByRole('tab', { name: /Deutsch/ }))
    await userEvent.type(await screen.findByLabelText('Name (Deutsch)'), 'Messer')
    await next()

    expect(await screen.findByRole('region', { name: 'Options' })).toBeInTheDocument()
    expect(screen.getByText(/Step 2 of 3/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '1. Details, Done' })).toBeInTheDocument()
  })

  it('[T-007B] Next on Options and variants goes to Review and publish and sends nothing; the bar then offers Publish and Save as draft', async () => {
    renderKeepsakes('/store/products/gifts/new')

    await toOptions()
    expect(screen.queryByRole('button', { name: 'Create keepsake' })).not.toBeInTheDocument()
    await setPrice('39')
    await next()

    expect(await screen.findByTestId('review-screen', undefined, SLOW)).toBeInTheDocument()
    expect(screen.getByText(/Step 3 of 3/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Publish' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Save as draft' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Next' })).not.toBeInTheDocument()
    expect(state.calls.some(call => call.method !== 'GET')).toBe(false)
  })

  it('[T-008] Next with no price stays on Options and variants and names it; the price is held in the browser and the steps can be opened again', async () => {
    renderKeepsakes('/store/products/gifts/new')

    await toOptions()
    await next()
    expect(await screen.findByText('1 variant needs a price or a code.')).toBeInTheDocument()
    expect(screen.getAllByText('Add a price above CHF 0.').length).toBeGreaterThan(0)
    expect(screen.getByText(/Step 2 of 3/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '2. Options and variants, Has errors' })).toBeInTheDocument()
    await setPrice('39')
    expect(writes()).toHaveLength(0)
    await userEvent.click(screen.getByRole('button', { name: '1. Details, Done' }))
    expect(await nameField()).toHaveValue('Knife')
    await userEvent.click(screen.getByRole('button', { name: /^2\. Options and variants/ }))
    expect(await within(await screen.findByRole('region', { name: 'Price' })).findByLabelText('Price, CHF')).toHaveValue('39.00')
    expect(writes()).toHaveLength(0)
  })

  it('[T-007B] a new keepsake has no status in the Price card, since the create request has none, and says so', async () => {
    renderKeepsakes('/store/products/gifts/new')

    await toOptions()
    const card = screen.getByRole('region', { name: 'Price' })

    expect(within(card).queryByRole('button', { name: /Status/ })).not.toBeInTheDocument()
    expect(within(card).getByText('A new keepsake starts with every variant on sale. Hide one after you save the keepsake.')).toBeInTheDocument()
    expect(within(card).getByLabelText('SKU code')).toHaveAttribute('placeholder', 'KNIFE')
  })

  it('[T-007B] Save as draft makes a hidden draft in one request and opens the saved editor on Review and publish', async () => {
    const success = vi.spyOn(toast, 'success')
    const router = renderKeepsakes('/store/products/gifts/new')

    await toOptions()
    await setPrice('39')
    await next()
    await screen.findByTestId('review-screen', undefined, SLOW)
    await saveDraft()

    await waitFor(() => expect(writes()).toHaveLength(1))
    expect(writes()[0]).toMatchObject({ method: 'POST', path: base, body: { name: { en: 'Knife' }, text: {}, photoIds: [], commissionRate: 0, options: [], variants: [{ skuCode: 'KNIFE', priceRappen: 3900, values: {} }] } })
    expect(writes()[0]!.key).toBeTruthy()
    await waitFor(() => expect(router.state.location.pathname).toBe(`/store/products/gifts/${productId}`), SLOW)
    expect(router.state.location.search).toMatchObject({ step: 'review' })
    expect(await screen.findByTestId('review-screen', undefined, SLOW)).toBeInTheDocument()
    expect(within(screen.getByTestId('keepsake-status')).getByText('Draft')).toBeInTheDocument()
    expect(writes().filter(call => call.path.endsWith('/publish'))).toHaveLength(0)
    expect(success).toHaveBeenCalledExactlyOnceWith('Knife created as a draft with 1 variant.')
  })

  it('[T-007B] Publish makes the keepsake, then publishes it with the version it was made at', { timeout: 20_000 }, async () => {
    const success = vi.spyOn(toast, 'success')
    const answer = state.answer

    const added = '0198a000-0000-7000-8000-0000000000e2'

    state.answer = (call) => {
      if (call.method === 'POST' && call.path === `${base}/${productId}/publish`)
        return Response.json(product({ status: 'published', rowVersion: 2 }))
      if (call.path === `/api/store/${storeId}/media/uploads`)
        return Response.json({ uploadKey: 'k/u.jpg', url: 'https://storage.test/uploads/k/u.jpg', method: 'PUT', headers: { 'Content-Type': 'image/jpeg' }, expiresAt: '2026-10-30T09:00:00.000Z', kind: 'image' })
      if (call.path.startsWith('/uploads/'))
        return new Response(null, { status: 200 })
      if (call.path === `/api/store/${storeId}/media/confirm`)
        return Response.json({ ...media, id: added }, { status: 201 })
      if (call.path === `/api/store/${storeId}/media/${added}`)
        return Response.json({ ...media, id: added })

      return answer(call)
    }
    const router = renderKeepsakes('/store/products/gifts/new')

    await userEvent.type(await nameField(), 'Knife')
    await userEvent.type(await screen.findByLabelText('Description (English)', undefined, SLOW), 'A knife')
    await userEvent.upload(screen.getByTestId('photo-input'), new File(['x'], 'knife.jpg', { type: 'image/jpeg' }))
    await waitFor(() => expect(state.calls.map(call => call.path)).toContain(`/api/store/${storeId}/media/confirm`), SLOW)
    await next()
    await screen.findByRole('region', { name: 'Price' })
    await setPrice('39')
    await next()
    await screen.findByTestId('review-screen', undefined, SLOW)
    await waitFor(() => expect(screen.getByRole('button', { name: 'Publish' })).toBeEnabled(), SLOW)
    await publish()

    const keepsake = () => writes().filter(call => call.path.startsWith(base))

    await waitFor(() => expect(keepsake()).toHaveLength(2), SLOW)
    expect(keepsake()[0]).toMatchObject({ method: 'POST', path: base })
    expect(keepsake()[1]).toMatchObject({ method: 'POST', path: `${base}/${productId}/publish`, ifMatch: '1' })
    await waitFor(() => expect(router.state.location.pathname).toBe(`/store/products/gifts/${productId}`), SLOW)
    expect(success).toHaveBeenCalledExactlyOnceWith('Published in English. Guests see it within about a minute.')
  })

  it('[T-007B] the draft survives a reload: the name, the price and the step come back, and leaving for good clears them', async () => {
    renderKeepsakes('/store/products/gifts/new')

    await toOptions()
    await setPrice('39')
    cleanup()
    renderKeepsakes('/store/products/gifts/new')

    expect(await within(await screen.findByRole('region', { name: 'Price' }, SLOW)).findByLabelText('Price, CHF')).toHaveValue('39.00')
    expect(screen.getByText(/Step 2 of 3/)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: '1. Details, Done' }))
    expect(await nameField()).toHaveValue('Knife')
    await userEvent.click(screen.getByRole('button', { name: 'Back to Keepsakes' }))
    await userEvent.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Discard keepsake' }))
    await screen.findByTestId('keepsake-list')
    cleanup()
    renderKeepsakes('/store/products/gifts/new')

    expect(await nameField()).toHaveValue('')
  })

  it('[T-007B] Review reads the draft: it blocks Publish for a missing photo and names it, and Edit opens the step', async () => {
    renderKeepsakes('/store/products/gifts/new')

    await toOptions()
    await setPrice('39')
    await next()
    await screen.findByTestId('review-screen', undefined, SLOW)

    expect(within(screen.getByTestId('publish-checks')).getByText('Add at least one photo.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Publish' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Save as draft' })).toBeEnabled()
    await userEvent.click(within(screen.getByTestId('publish-checks')).getAllByRole('button', { name: 'Edit' })[0]!)
    expect(await screen.findByRole('region', { name: 'Photos' })).toBeVisible()
  })

  it('[T-005] the commission set in Details goes with the create request', async () => {
    renderKeepsakes('/store/products/gifts/new')

    await userEvent.type(await nameField(), 'Knife')
    const increase = screen.getAllByRole('button', { name: /increase|increment/i })[0]!

    for (let i = 0; i < 15; i++)
      await userEvent.click(increase)
    await next()
    await screen.findByRole('region', { name: 'Price' })
    await setPrice('10', 'K-1')
    await next()
    await screen.findByTestId('review-screen', undefined, SLOW)
    await saveDraft()

    await waitFor(() => expect(writes()).toHaveLength(1))
    expect(writes()[0]!.body).toMatchObject({ commissionRate: 0.15 })
  })

  it('[T-005] pressing Save as draft twice makes one keepsake', async () => {
    renderKeepsakes('/store/products/gifts/new')

    await toOptions()
    await setPrice('10', 'K-1')
    await next()
    await screen.findByTestId('review-screen', undefined, SLOW)
    await userEvent.dblClick(screen.getByRole('button', { name: 'Save as draft' }))

    await waitFor(() => expect(writes().length).toBeGreaterThan(0))
    await waitFor(() => expect(screen.getByRole('button', { name: /^3\. Review and publish/ })).toHaveAttribute('aria-current', 'step'))
    expect(writes().filter(call => call.method === 'POST')).toHaveLength(1)
  })

  it('[T-007B] a code that is not letters and digits is refused at the field before any request, and a taken one is said to be used in the shop', async () => {
    const answer = state.answer
    const danger = vi.spyOn(toast, 'danger')

    state.answer = call => (call.method === 'POST' ? problem(409, 'sku-code-taken') : answer(call))
    renderKeepsakes('/store/products/gifts/new')

    await toOptions()
    const card = screen.getByRole('region', { name: 'Price' })

    await userEvent.type(within(card).getByLabelText('SKU code'), 'bad code')
    await userEvent.tab()
    expect(await within(card).findByText('Letters and digits, joined by - _ or . (like VX-S-SWAN).')).toBeInTheDocument()
    await userEvent.clear(within(card).getByLabelText('SKU code'))
    await userEvent.type(within(card).getByLabelText('SKU code'), 'vx-1')
    await userEvent.type(within(card).getByLabelText('Price, CHF'), '10')
    await userEvent.tab()
    await next()
    await screen.findByTestId('review-screen', undefined, SLOW)
    await saveDraft()

    expect(await screen.findByText('This SKU code is already used in your shop.')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1, name: 'New keepsake' })).toBeInTheDocument()
    expect(writes().filter(call => call.method === 'POST')).toHaveLength(1)
    expect(danger).not.toHaveBeenCalled()
  })

  it('[T-005] Back goes to the step before with what was typed, and the arrow asks before it drops it', async () => {
    renderKeepsakes('/store/products/gifts/new')

    await toOptions()
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
    await screen.findByRole('heading', { level: 3, name: 'Options' })
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

  it('[T-005] refuses Save as draft while a photo is still uploading, and makes it with the photo once the upload is done', { timeout: 20_000 }, async () => {
    const release = holdUpload()

    renderKeepsakes('/store/products/gifts/new')

    await userEvent.type(await nameField(), 'Knife')
    await userEvent.upload(screen.getByTestId('photo-input'), new File(['x'], 'knife.jpg', { type: 'image/jpeg' }))
    await next()
    await screen.findByRole('region', { name: 'Price' })
    await setPrice('10', 'K-1')
    await next()
    await screen.findByTestId('review-screen', undefined, SLOW)
    await saveDraft()

    expect(await screen.findByText('A photo is still uploading. Wait until it is done, then create the keepsake.')).toBeInTheDocument()
    expect(writes().filter(call => call.method === 'POST' && call.path === base)).toHaveLength(0)
    release()
    await waitFor(() => expect(state.calls.map(call => call.path)).toContain(`/api/store/${storeId}/media/confirm`), SLOW)
    await saveDraft()

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
    expect(screen.getByText(/Schritt 1 von 3/)).toBeInTheDocument()
    expect(screen.getByText('Noch nicht gespeichert')).toBeInTheDocument()
    expect(stepButtons().map(button => button.getAttribute('aria-label')?.replace(/,.*$/, ''))).toEqual(['1. Details', '2. Optionen und Varianten', '3. Prüfen und veröffentlichen'])
    await userEvent.click(screen.getByRole('button', { name: 'Weiter' }))
    expect(await screen.findByText('Geben Sie einen Namen auf Englisch oder Deutsch ein, um das Andenken zu erstellen.')).toBeInTheDocument()
    await userEvent.type(screen.getByLabelText('Name (English)'), 'Knife')
    await userEvent.click(screen.getByRole('button', { name: 'Weiter' }))
    const card = await screen.findByRole('region', { name: 'Preis' })

    await userEvent.click(screen.getByRole('button', { name: 'Weiter' }))
    expect(await screen.findByText('1 Variante braucht einen Preis oder einen Code.')).toBeInTheDocument()
    await userEvent.type(within(card).getByLabelText('Preis, CHF'), '39')
    await userEvent.tab()
    await userEvent.click(screen.getByRole('button', { name: 'Weiter' }))
    await screen.findByTestId('review-screen', undefined, SLOW)
    expect(screen.getByRole('button', { name: 'Als Entwurf speichern' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Veröffentlichen' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Zurück zu Andenken' }))

    expect(await screen.findByRole('alertdialog')).toHaveTextContent('Dieses Andenken verwerfen?')
    expect(document.body.textContent).not.toMatch(/keepsakes\.[a-z]|steps\.[a-z]/)
    expect(document.body.textContent).not.toMatch(/gravur|unterkategorie|anzahlung|später zahlen/i)
  })
})
