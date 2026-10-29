import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { writeStored } from '@/lib/storage'
import { list, listItem, media, photoId, problem, product, productId, renderKeepsakes, setUpHarness, state, storeId, variantId, writes } from './keepsakes-harness'

vi.hoisted(() => vi.stubEnv('VITE_API_ENABLED', 'true'))

// jsdom is not wide, so the phone view would render; one test turns the laptop view on.
const view = vi.hoisted(() => ({ wide: false }))

vi.mock('@/hooks/use-is-wide', () => ({ useIsWide: () => view.wide }))

const base = `/api/store/${storeId}/products`
const detail = `${base}/${productId}`
const SLOW = { timeout: 8000 }
const AUTOSAVE = { timeout: 5000 }

let current: ReturnType<typeof product>

/** A fake server: reads answer with `current`, a save moves it on one version, and `extra` answers anything else. */
function serve(extra: (call: (typeof state.calls)[number]) => Response | undefined = () => undefined) {
  state.answer = (call) => {
    const custom = extra(call)

    if (custom)
      return custom
    if (call.method === 'GET' && call.path === detail)
      return Response.json(current)
    if (call.method === 'GET' && call.path === base)
      return Response.json(list([listItem()]))
    if (call.method === 'PATCH' && call.path === detail) {
      const body = call.body as { name?: object, text?: object, photoIds?: string[], commissionRate?: number }

      current = product({ ...current, ...(body.name && { name: body.name }), ...(body.text && { text: body.text }), commissionRate: body.commissionRate ?? current.commissionRate, rowVersion: current.rowVersion + 1 })

      return Response.json(current)
    }

    return undefined
  }
}

beforeEach(async () => {
  view.wide = false
  current = product()
  await setUpHarness()
  serve()
})

const nameField = () => screen.findByLabelText('Name (English)', undefined, SLOW)

const reviewButton = () => screen.getByRole('button', { name: view.wide ? 'Review and publish' : 'Review' })

async function openEditor() {
  const router = renderKeepsakes(`/store/products/gifts/${productId}`)

  await nameField()

  return router
}

describe('[E6.1][AC55] M12 the edit screen in English', () => {
  it('[E6.1] shows the cards in order and the status with the save state in the bar', async () => {
    await openEditor()

    expect(screen.getAllByRole('heading', { level: 2 }).map(h => h.textContent)).toEqual(['Name and text', 'Media', 'Options', 'Variants', 'Partner\'s commission rate (%)'])
    expect(screen.getByRole('heading', { level: 1, name: 'Victorinox Classic' })).toBeInTheDocument()
    expect(screen.getByText('Draft')).toBeInTheDocument()
    expect(screen.getByText(/^Saved \d/)).toBeInTheDocument()
    expect(screen.getByText('No options: this keepsake is sold as one variant.')).toBeInTheDocument()
    expect(reviewButton()).toBeInTheDocument()
  })

  it('[E6.1][AC55] has no engraving, sub-category, deposit, pay-later or payment-deadline field', async () => {
    await openEditor()

    expect(document.body.textContent).not.toMatch(/engrav|sub-?categor|deposit|pay later|payment deadline|deadline/i)
  })

  it('[E6.1][variant] shows the one variant with its code, price and status, and no stock', async () => {
    await openEditor()

    const grid = screen.getByRole('grid', { name: 'Variants' })

    expect(within(grid).getByText('VX-1')).toBeInTheDocument()
    expect(within(grid).getByText(/CHF\s*39/)).toBeInTheDocument()
    expect(within(grid).getByText('For sale')).toBeInTheDocument()
    expect(within(screen.getByRole('region', { name: 'Variants' })).queryByText(/in stock|reserved|available/i)).not.toBeInTheDocument()
  })
})

describe('[E6.1][autosave] M12 autosave and leaving', () => {
  it('[E6.1][autosave] saves the typed name 1.5 s later with the row version, then again with the next one', async () => {
    await openEditor()

    const field = await nameField()

    await userEvent.clear(field)
    await userEvent.type(field, 'Classic SD')
    expect(screen.getByText('Unsaved changes')).toBeInTheDocument()
    await waitFor(() => expect(writes()).toHaveLength(1), AUTOSAVE)
    expect(writes()[0]).toMatchObject({ method: 'PATCH', path: detail, ifMatch: '1', body: { name: { en: 'Classic SD' }, text: { en: 'A Swiss knife.' }, photoIds: [photoId], commissionRate: 0.1 } })
    expect(writes()[0]!.key).toBeTruthy()
    await waitFor(() => expect(screen.getByText(/^Saved \d/)).toBeInTheDocument())
    await userEvent.type(field, '!')
    await waitFor(() => expect(writes()).toHaveLength(2), AUTOSAVE)
    expect(writes()[1]).toMatchObject({ ifMatch: '2', body: { name: { en: 'Classic SD!' } } })
    expect(writes()[1]!.key).not.toBe(writes()[0]!.key)
  })

  it('[E6.1][autosave] one save carries every edit made within the 1.5 s', async () => {
    await openEditor()

    await userEvent.type(await nameField(), ' II')
    await userEvent.type(screen.getByLabelText('Text (English)'), ' Sharp.')
    await waitFor(() => expect(writes()).toHaveLength(1), AUTOSAVE)
    expect(writes()[0]!.body).toMatchObject({ name: { en: 'Victorinox Classic II' }, text: { en: 'A Swiss knife. Sharp.' } })
  })

  it('[E6.1][autosave] sends only the languages that have text', async () => {
    await openEditor()

    await userEvent.click(screen.getByRole('tab', { name: /Deutsch/ }))
    await userEvent.type(await screen.findByLabelText('Name (Deutsch)'), 'Klassik')
    await waitFor(() => expect(writes()).toHaveLength(1), AUTOSAVE)
    expect(writes()[0]!.body).toMatchObject({ name: { en: 'Victorinox Classic', de: 'Klassik' }, text: { en: 'A Swiss knife.' } })
  })

  it('[E6.1][412] a stale save shows the reload message, stops saving, and Reload starts again from the server copy', async () => {
    serve(call => (call.method === 'PATCH' ? problem(412, 'precondition-failed') : undefined))
    await openEditor()

    await userEvent.type(await nameField(), ' II')
    const alert = await screen.findByRole('alert', undefined, AUTOSAVE)

    expect(alert).toHaveTextContent('Someone saved this keepsake after you opened it')
    expect(screen.getByText('Not saved')).toBeInTheDocument()
    await userEvent.type(await nameField(), '!')
    await new Promise(resolve => setTimeout(resolve, 1800))
    expect(writes()).toHaveLength(1)

    serve()
    current = product({ name: { en: 'Their name' }, rowVersion: 5 })
    await userEvent.click(within(alert).getByRole('button', { name: 'Reload' }))
    await waitFor(() => expect(screen.getByLabelText('Name (English)')).toHaveValue('Their name'))
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('[E6.1][autosave] another failure offers a retry that saves what was typed', async () => {
    let failing = true

    serve(call => (call.method === 'PATCH' && failing ? problem(500, 'internal-error') : undefined))
    await openEditor()

    await userEvent.type(await nameField(), ' II')
    const alert = await screen.findByRole('alert', undefined, AUTOSAVE)

    expect(alert).toHaveTextContent('Something went wrong')
    failing = false
    await userEvent.click(within(alert).getByRole('button', { name: 'Try again' }))
    await waitFor(() => expect(writes()).toHaveLength(2))
    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument())
  })

  it('[E6.1][autosave] Back with saved edits leaves at once', async () => {
    await openEditor()

    await userEvent.click(screen.getByRole('button', { name: 'Back to Keepsakes' }))

    expect(await screen.findByTestId('keepsake-list')).toBeInTheDocument()
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
  })

  it('[E6.1][autosave] Back with unsaved edits asks first, Keep editing stays, Leave goes and saves what was typed', async () => {
    await openEditor()

    await userEvent.type(await nameField(), ' II')
    await userEvent.click(screen.getByRole('button', { name: 'Back to Keepsakes' }))
    const dialog = await screen.findByRole('alertdialog')

    expect(dialog).toHaveTextContent('Leave without saving?')
    expect(dialog).toHaveTextContent('Your last edits are not saved yet. If you leave now, they are lost.')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Keep editing' }))
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument())
    expect(screen.getByTestId('keepsake-editor')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Back to Keepsakes' }))
    await userEvent.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Leave without saving' }))

    expect(await screen.findByTestId('keepsake-list')).toBeInTheDocument()
    await waitFor(() => expect(writes()).toHaveLength(1))
  })

  it.each([
    ['stale', 412, 'precondition-failed'],
    ['failed', 500, 'internal-error'],
  ] as const)('[E6.1][autosave] Back after a %s save still asks first, because the typed edits are not saved', async (_state, status, type) => {
    serve(call => (call.method === 'PATCH' ? problem(status, type) : undefined))
    await openEditor()

    await userEvent.type(await nameField(), ' II')
    await screen.findByRole('alert', undefined, AUTOSAVE)
    await userEvent.click(screen.getByRole('button', { name: 'Back to Keepsakes' }))
    const dialog = await screen.findByRole('alertdialog')

    expect(dialog).toHaveTextContent('Leave without saving?')
    expect(screen.queryByTestId('keepsake-list')).not.toBeInTheDocument()
    await userEvent.click(within(dialog).getByRole('button', { name: 'Keep editing' }))
    expect(screen.getByTestId('keepsake-editor')).toBeInTheDocument()
    expect(screen.getByLabelText('Name (English)')).toHaveValue('Victorinox Classic II')
  })

  it('[E6.1][autosave] the commission saves with the rest, as a fraction', async () => {
    await openEditor()

    await userEvent.click(screen.getAllByRole('button', { name: /increase|increment/i })[0]!)
    await waitFor(() => expect(writes()).toHaveLength(1), AUTOSAVE)
    expect(writes()[0]!.body).toMatchObject({ commissionRate: 0.11 })
  })

  it('[E6.1][autosave] a photo added is uploaded, confirmed, waited for and saved with the rest', { timeout: 20_000 }, async () => {
    const added = '0198a000-0000-7000-8000-0000000000e2'
    const uploaded = { ...media, id: added }

    serve((call) => {
      if (call.path === `/api/store/${storeId}/media/uploads`)
        return Response.json({ uploadKey: 'k/u.jpg', url: 'https://storage.test/uploads/k/u.jpg', method: 'PUT', headers: { 'Content-Type': 'image/jpeg' }, expiresAt: '2026-10-30T09:00:00.000Z', kind: 'image' })
      if (call.path.startsWith('/uploads/'))
        return new Response(null, { status: 200 })
      if (call.path === `/api/store/${storeId}/media/confirm`)
        return Response.json({ ...uploaded, status: 'processing', publicUrl: null, variants: [] }, { status: 201 })
      if (call.path === `/api/store/${storeId}/media/${added}`)
        return Response.json(uploaded)

      return undefined
    })
    await openEditor()

    await userEvent.upload(screen.getByTestId('photo-input'), new File(['x'], 'knife.jpg', { type: 'image/jpeg' }))
    await waitFor(() => expect(writes().some(call => call.method === 'PATCH'), document.body.textContent?.slice(-400)).toBe(true), { timeout: 8000 })
    const save = writes().find(call => call.method === 'PATCH')!

    expect(save.body).toMatchObject({ photoIds: [photoId, added] })
    expect(state.calls.map(call => call.path)).toContain(`/api/store/${storeId}/media/${added}`)
    expect(screen.getAllByRole('listitem').some(item => item.textContent?.includes('Photo 2'))).toBe(true)
  })

  it('[E6.1][autosave] a file that is not a photo is refused before any request', async () => {
    await openEditor()

    await userEvent.upload(screen.getByTestId('photo-input'), new File(['x'], 'doc.pdf', { type: 'application/pdf' }), { applyAccept: false })

    expect(await screen.findByText('Use a JPEG, PNG or WebP photo.')).toBeInTheDocument()
    expect(state.calls.some(call => call.path.includes('/media/'))).toBe(false)
  })

  it('[E6.1][autosave] removing a photo and moving one with the arrow keys save the new order', async () => {
    const second = '0198a000-0000-7000-8000-0000000000e2'

    current = product({ photos: [media, { ...media, id: second }] })
    await openEditor()

    const grip = screen.getByRole('button', { name: /Move Photo 1, position 1 of 2/ })

    grip.focus()
    await userEvent.keyboard('{ArrowDown}')
    await waitFor(() => expect(writes()).toHaveLength(1), AUTOSAVE)
    expect(writes()[0]!.body).toMatchObject({ photoIds: [second, photoId] })
    await userEvent.click(screen.getByRole('button', { name: 'Remove Photo 1' }))
    await waitFor(() => expect(writes()).toHaveLength(2), AUTOSAVE)
    expect(writes()[1]!.body).toMatchObject({ photoIds: [photoId] })
  })
})

describe('[E6.1][variant] the default variant', () => {
  const save = (over: object = {}) => product({ ...current, ...over })

  it('[E6.1][variant] the sheet edits the code and the price and saves them with the status', async () => {
    serve(call => (call.method === 'PATCH' && call.path === `${detail}/variants/${variantId}` ? Response.json(save({ variants: [{ id: variantId, skuCode: 'VX-2', priceRappen: 4500, status: 'published' }] })) : undefined))
    await openEditor()

    await userEvent.click(screen.getAllByRole('button', { name: 'Actions for VX-1' })[0]!)
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Edit' }))
    const dialog = await screen.findByRole('dialog', { name: 'Edit VX-1' })
    const code = within(dialog).getByLabelText('SKU code')

    await userEvent.clear(code)
    await userEvent.type(code, 'vx-2')
    const price = within(dialog).getByLabelText('Price')

    await userEvent.clear(price)
    await userEvent.type(price, '45')
    await userEvent.tab()
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(writes()).toHaveLength(1))
    expect(writes()[0]).toMatchObject({ method: 'PATCH', path: `${detail}/variants/${variantId}`, ifMatch: null, body: { skuCode: 'VX-2', priceRappen: 4500, status: 'published' } })
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Edit VX-1' })).not.toBeInTheDocument())
    expect(within(screen.getByRole('grid', { name: 'Variants' })).getByText('VX-2')).toBeInTheDocument()
  })

  it('[E6.1][variant] a code the shop already uses is refused at the field, and a bad one before any request', async () => {
    serve(call => (call.method === 'PATCH' && call.path.includes('/variants/') ? problem(409, 'sku-code-taken') : undefined))
    await openEditor()

    await userEvent.click(screen.getAllByRole('button', { name: 'Actions for VX-1' })[0]!)
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Edit' }))
    const dialog = await screen.findByRole('dialog', { name: 'Edit VX-1' })
    const code = within(dialog).getByLabelText('SKU code')

    await userEvent.clear(code)
    await userEvent.type(code, 'bad code')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save' }))
    expect(await within(dialog).findByText('Letters and digits, joined by - _ or . (like VX-S-SWAN).')).toBeInTheDocument()
    expect(writes()).toHaveLength(0)
    await userEvent.clear(code)
    await userEvent.type(code, 'vx-9')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save' }))

    expect(await within(dialog).findByText('VX-9 is already used in your shop.')).toBeInTheDocument()
    expect(dialog).toBeInTheDocument()
  })

  it('[E6.1][variant] Hide from guests changes the status at once and the card lists it under Hidden', async () => {
    serve(call => (call.method === 'PATCH' && call.path.includes('/variants/') ? Response.json(save({ variants: [{ id: variantId, skuCode: 'VX-1', priceRappen: 3900, status: 'draft' }], blocking: [{ code: 'variant-for-sale', card: 'variants' }] })) : undefined))
    await openEditor()

    await userEvent.click(screen.getAllByRole('button', { name: 'Actions for VX-1' })[0]!)
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Hide from guests' }))

    await waitFor(() => expect(writes()).toHaveLength(1))
    expect(writes()[0]!.body).toEqual({ status: 'draft' })
    expect(await within(screen.getByRole('grid', { name: 'Variants' })).findByText('Hidden')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('tab', { name: /For sale/ }))
    expect(await screen.findAllByText('No variants here.')).not.toHaveLength(0)
  })
})

describe('[E6.1][review] Review and publish', () => {
  it('[E6.1][review] opens from the bar after the save, and Back to editing returns', async () => {
    const router = await openEditor()

    await userEvent.click(reviewButton())

    expect(await screen.findByTestId('review-screen', undefined, SLOW)).toBeInTheDocument()
    expect(router.state.location.search).toMatchObject({ view: 'review' })
    expect(screen.getByText('Ready · 1 to look at')).toBeInTheDocument()
    expect(screen.getByTestId('keepsake-preview')).toHaveTextContent('Victorinox Classic')
    expect(screen.getByTestId('keepsake-preview')).toHaveTextContent(/CHF\s*39/)
    await userEvent.click(screen.getByRole('button', { name: 'Back to editing' }))

    expect(await screen.findByLabelText('Name (English)')).toBeInTheDocument()
  })

  it('[E6.1][review] a laptop shows the guest page in the iPhone mockup beside the publish card', async () => {
    view.wide = true
    await openEditor()

    await userEvent.click(reviewButton())
    const review = await screen.findByTestId('review-screen', undefined, SLOW)

    expect(within(review).getByText('Goes live in English. Deutsch readers see it with a note.')).toBeInTheDocument()
    expect(within(review).getByTestId('publish-checks')).toBeInTheDocument()
    expect(within(review).getByText(/No Deutsch name and text/)).toBeInTheDocument()
    expect(within(review).getByRole('button', { name: 'Publish' })).toBeEnabled()
    expect(within(review).getByText('The web address is made from the name when you publish.')).toBeInTheDocument()
  })

  it('[E6.1][checks] blocking checks switch Publish off, name what is missing and Edit jumps to the card with the error', async () => {
    current = product({ photos: [], blocking: [{ code: 'photos', card: 'photos' }, { code: 'variant-for-sale', card: 'variants' }] })
    view.wide = true
    await openEditor()

    await userEvent.click(reviewButton())
    const review = await screen.findByTestId('review-screen', undefined, SLOW)

    expect(within(review).getByText('2 things stop publishing')).toBeInTheDocument()
    expect(within(review).getByText('Add at least one photo.')).toBeInTheDocument()
    expect(within(review).getByText('Put at least one variant on sale.')).toBeInTheDocument()
    expect(within(review).getByRole('button', { name: 'Publish' })).toBeDisabled()
    expect(within(review).getByText('Fix what stops publishing first.')).toBeInTheDocument()
    await userEvent.click(within(review).getAllByRole('button', { name: 'Edit' })[0]!)

    expect(await screen.findByLabelText('Name (English)')).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent('No photos yet. Add one to publish; the first is the cover.')
  })

  it('[E6.1][checks] the phone bar opens the checks by itself when something blocks', async () => {
    current = product({ blocking: [{ code: 'language', card: 'basics' }] })
    await openEditor()

    await userEvent.click(reviewButton())
    const checks = await screen.findByTestId('publish-checks', undefined, SLOW)

    expect(checks).toHaveTextContent('Add the name and the text in English or German.')
    expect(screen.getAllByText('1 thing stops publishing').length).toBeGreaterThan(0)
    expect(screen.getAllByRole('button', { name: 'Publish' }).every(button => button.hasAttribute('disabled'))).toBe(true)
  })

  it('[E6.1][AC30] Publish sends the row version, and the screen then shows Published with Unpublish', async () => {
    serve(call => (call.method === 'POST' && call.path === `${detail}/publish` ? Response.json(product({ status: 'published', rowVersion: 2, slug: { en: 'victorinox-classic' }, warnings: [] })) : undefined))
    await openEditor()

    await userEvent.click(reviewButton())
    await userEvent.click(await within(await screen.findByTestId('review-screen', undefined, SLOW)).findByRole('button', { name: 'Publish' }))

    await waitFor(() => expect(writes()).toHaveLength(1))
    expect(writes()[0]).toMatchObject({ method: 'POST', path: `${detail}/publish`, ifMatch: '1' })
    expect(await screen.findByText('Published')).toBeInTheDocument()
    expect(await screen.findByRole('button', { name: 'Unpublish' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Publish' })).not.toBeInTheDocument()
  })

  it('[E6.1][checks] a refused publish sends the merchant back to the fields', async () => {
    serve(call => (call.method === 'POST' && call.path === `${detail}/publish` ? problem(422, 'publish-incomplete') : undefined))
    await openEditor()

    await userEvent.click(reviewButton())
    await userEvent.click(await within(await screen.findByTestId('review-screen', undefined, SLOW)).findByRole('button', { name: 'Publish' }))

    expect(await screen.findByLabelText('Name (English)')).toBeInTheDocument()
  })

  it('[E6.1][review] a published keepsake with edits says so and offers Publish changes', async () => {
    current = product({ status: 'published', hasUnpublishedEdits: true, slug: { en: 'victorinox-classic' } })
    await openEditor()

    expect(screen.getByText('Published · edits not live')).toBeInTheDocument()
    await userEvent.click(reviewButton())
    const bar = await screen.findByTestId('review-screen', undefined, SLOW)

    expect(within(bar).getByRole('button', { name: 'Publish changes' })).toBeEnabled()
    expect(within(bar).queryByRole('button', { name: 'Unpublish' })).not.toBeInTheDocument()
  })

  it('[E6.1][review] Unpublish asks first, then sends the row version and returns to Draft', async () => {
    current = product({ status: 'published', slug: { en: 'victorinox-classic' } })
    serve(call => (call.method === 'POST' && call.path === `${detail}/unpublish` ? Response.json(product({ status: 'draft', rowVersion: 2 })) : undefined))
    await openEditor()

    await userEvent.click(reviewButton())
    await userEvent.click(await screen.findByRole('button', { name: 'Unpublish' }, SLOW))
    const dialog = await screen.findByRole('alertdialog')

    expect(dialog).toHaveTextContent('Unpublish this keepsake?')
    expect(dialog).toHaveTextContent('Open orders stay as they are.')
    expect(writes()).toHaveLength(0)
    await userEvent.click(within(dialog).getByRole('button', { name: 'Unpublish' }))

    await waitFor(() => expect(writes()).toHaveLength(1))
    expect(writes()[0]).toMatchObject({ method: 'POST', path: `${detail}/unpublish`, ifMatch: '1' })
    expect(await screen.findByText('Draft')).toBeInTheDocument()
  })
})

describe('[E6.1][412] a keepsake that is not there', () => {
  it('[E6.1] says so with a way back to the list', async () => {
    state.answer = call => (call.path === detail ? problem(404, 'not-found') : undefined)
    renderKeepsakes(`/store/products/gifts/${productId}`)

    expect(await screen.findByText('This keepsake no longer exists.', undefined, SLOW)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Back to Keepsakes' })).toHaveAttribute('href', '/store/products')
  })
})

describe('[E6.1][i18n] M12 in German', () => {
  beforeEach(() => writeStored('sk.language', 'de'))

  it('[E6.1][i18n] shows the edit screen, its cards and the variants in German, with no engraving and no key left over', async () => {
    renderKeepsakes(`/store/products/gifts/${productId}`)

    await screen.findByLabelText('Name (English)', undefined, SLOW)
    await screen.findByRole('heading', { level: 2, name: 'Name und Text' }, SLOW)
    expect(screen.getAllByRole('heading', { level: 2 }).map(h => h.textContent)).toEqual(['Name und Text', 'Medien', 'Optionen', 'Varianten', 'Provisionssatz für Partner (%)'])
    expect(screen.getByText('Keine Optionen: Dieses Andenken wird als eine Variante verkauft.')).toBeInTheDocument()
    expect(screen.getAllByText('Im Verkauf').length).toBeGreaterThan(0)
    expect(screen.getByRole('button', { name: 'Prüfen' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Zurück zu Andenken' })).toBeInTheDocument()
    expect(document.body.textContent).not.toMatch(/keepsakes\.[a-z]/)
    expect(document.body.textContent).not.toMatch(/gravur|unterkategorie|anzahlung|später zahlen|zahlungsfrist/i)
  })

  it('[E6.1][i18n] shows Review and publish with its checks and warnings in German', async () => {
    current = product({ photos: [], blocking: [{ code: 'photos', card: 'photos' }], warnings: [{ code: 'other-language', card: 'basics', language: 'de' }, { code: 'commission-zero', card: 'commission' }] })
    view.wide = true
    renderKeepsakes(`/store/products/gifts/${productId}?view=review`)

    const review = await screen.findByTestId('review-screen', undefined, SLOW)

    expect(await within(review).findByText('1 Punkt verhindert das Veröffentlichen', undefined, SLOW)).toBeInTheDocument()
    expect(within(review).getByText('Fügen Sie mindestens ein Foto hinzu.')).toBeInTheDocument()
    expect(within(review).getByText('Die Provision beträgt 0 %: Partner verdienen nichts daran.')).toBeInTheDocument()
    expect(within(review).getByRole('button', { name: 'Veröffentlichen' })).toBeDisabled()
    expect(document.body.textContent).not.toMatch(/keepsakes\.[a-z]/)
  })
})
