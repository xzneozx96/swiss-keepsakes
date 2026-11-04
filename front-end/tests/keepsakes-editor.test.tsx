import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { toast } from '@heroui/react'
import { act, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { en } from '@/i18n/en'
import { writeStored } from '@/lib/storage'
import { doc, list, listItem, media, photoId, problem, product, productId, renderKeepsakes, setUpHarness, state, storeId, variantId, writes } from './keepsakes-harness'

vi.hoisted(() => vi.stubEnv('VITE_API_ENABLED', 'true'))

// jsdom is not wide, so the phone view would render; one test turns the laptop view on.
const view = vi.hoisted(() => ({ wide: false }))

vi.mock('@/hooks/use-is-wide', () => ({ useIsWide: () => view.wide }))

const base = `/api/store/${storeId}/products`
const detail = `${base}/${productId}`
const SLOW = { timeout: 8000 }
const AUTOSAVE = { timeout: 5000 }

let current: ReturnType<typeof product>

afterEach(() => vi.restoreAllMocks())

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

/** The editor on a step; the controls of Details are mounted in every step (that step is only hidden), so the name field is the ready signal. */
async function openEditor(step?: 'options' | 'variants') {
  const router = renderKeepsakes(`/store/products/${productId}${step ? `?step=${step}` : ''}`)

  await nameField()

  return router
}

/** The shared editor header: Back, the name, the status and save line, the red action. */
function editorHeader() {
  return document.querySelector<HTMLElement>('[data-editor-header]')!
}

describe('[E6.1][AC55] M12 the edit screen in English', () => {
  it('[T-003] lays the editor out like the place editor: the step list, white blocks, the name, the status and the bar', async () => {
    await openEditor()

    const steps = within(screen.getByRole('navigation', { name: 'Steps' }))

    expect(steps.getAllByRole('button').map(button => button.getAttribute('aria-label'))).toEqual(['1. Details, Done', '2. Options and variants, Done', '3. Review and publish, Done'])
    expect(screen.getAllByRole('heading', { level: 3 }).map(h => h.textContent)).toEqual(['Name and text', 'Photos', 'Partner\'s commission rate (%)'])
    expect(screen.getAllByRole('heading', { level: 2 }).map(h => h.id)).toEqual(['step-title'])
    expect(screen.getByRole('heading', { level: 1, name: 'Victorinox Classic' })).toBeInTheDocument()
    expect(within(editorHeader()).getByText('Draft')).toBeInTheDocument()
    expect(screen.getByText(/^Saved \d/)).toBeInTheDocument()
  })

  it('[T-003] shows "Step 1 of 3 · Details", a progress bar and All steps for a phone', async () => {
    await openEditor()

    expect(screen.getByText(/Step 1 of 3/)).toBeInTheDocument()
    expect(screen.getByRole('progressbar', { name: 'Progress through the steps' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'All steps' }))
    const sheet = await screen.findByRole('dialog', { name: 'Steps' })

    await userEvent.click(within(sheet).getByRole('button', { name: /Options and variants/ }))
    expect(await screen.findByRole('region', { name: 'Options' })).toBeInTheDocument()
    expect(screen.queryByRole('dialog', { name: 'Steps' })).not.toBeInTheDocument()
  })

  it('[T-003] the bar has Next and no Save button; Next opens Options and the address names the step; Back returns', async () => {
    const router = await openEditor()

    expect(screen.queryByRole('button', { name: /^Save/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Previous step' })).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Next' }))
    expect(await screen.findByRole('region', { name: 'Options' })).toBeInTheDocument()
    expect(router.state.location.search).toMatchObject({ step: 'options' })
    await userEvent.click(screen.getByRole('button', { name: 'Next' }))
    expect(await screen.findByTestId('review-screen', undefined, SLOW)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Previous step' }))
    await userEvent.click(screen.getByRole('button', { name: 'Previous step' }))
    expect(router.state.location.search.step).toBeUndefined()
    expect(screen.getByRole('region', { name: 'Name and text' })).toBeVisible()
  })

  it('[T-003][T-008][AC1] the step in the address opens that step, the old ?step=variants address opens the merged one, and Details is not on screen then', async () => {
    await openEditor('variants')

    expect(await screen.findByRole('region', { name: 'Options' })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Price' })).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Name and text' })).not.toBeInTheDocument()
    expect(screen.getByText(/^Saved \d/)).toBeInTheDocument()
  })

  it('[T-003] the Options step says so when there is no option', async () => {
    await openEditor('options')

    expect(await screen.findByText('No options: this keepsake is sold as one variant. Add one if it comes in versions, like a size or a colour.')).toBeInTheDocument()
  })

  it('[E6.1][AC55] has no engraving, sub-category, deposit, pay-later or payment-deadline field', async () => {
    await openEditor()

    expect(document.body.textContent).not.toMatch(/engrav|sub-?categor|deposit|pay later|payment deadline|deadline/i)
  })

  it('[T-008][AC2] shows the price of a keepsake with no option in a Price card, with its code and status, and no stock', async () => {
    await openEditor('options')

    const card = await screen.findByRole('region', { name: 'Price' })

    expect(within(card).getByLabelText('Price, CHF')).toHaveValue('39.00')
    expect(within(card).getByLabelText('SKU code')).toHaveValue('VX-1')
    expect(within(card).getByRole('button', { name: /Status/ })).toHaveTextContent('For sale')
    expect(within(card).queryByText(/\d+ in stock|reserved|available/i)).not.toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Variants' })).not.toBeInTheDocument()
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
    expect(writes()[0]).toMatchObject({ method: 'PATCH', path: detail, ifMatch: '1', body: { name: { en: 'Classic SD' }, text: { en: doc('A Swiss knife.') }, photoIds: [photoId], commissionRate: 0.1 } })
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
    await userEvent.type(await screen.findByLabelText('Description (English)', undefined, SLOW), ' Sharp.')
    await waitFor(() => expect(writes()).toHaveLength(1), AUTOSAVE)
    expect(writes()[0]!.body).toMatchObject({ name: { en: 'Victorinox Classic II' } })
    // jsdom puts the caret at the start of the text, so the typed words come first; what matters is the document shape.
    const saved = (writes()[0]!.body as { text: { en: { type: string, content: { type: string, content: { type: string, text: string }[] }[] } } }).text.en

    expect(saved).toMatchObject({ type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text' }] }] })
    expect(saved.content[0]!.content.map(node => node.text).join('')).toContain('Sharp.')
    expect(saved.content[0]!.content.map(node => node.text).join('')).toContain('A Swiss knife.')
  })

  it('[DESC-rich] a description over 1200 characters says so at the field and is not saved', async () => {
    await openEditor()

    const field = await screen.findByLabelText('Description (English)', undefined, SLOW)
    const editor = (field as HTMLElement & { editor: { commands: { setContent: (content: string, options: { emitUpdate: boolean }) => void } } }).editor

    act(() => editor.commands.setContent(`<p>${'a'.repeat(1201)}</p>`, { emitUpdate: true }))
    expect(await screen.findByText('Too long to save: shorten it to 1200 characters.')).toBeInTheDocument()
    expect(screen.getByText(/1201 \/ 1200/)).toBeInTheDocument()
    await new Promise(resolve => setTimeout(resolve, 2200))
    expect(writes()).toHaveLength(0)
    expect(screen.getByText('Unsaved changes')).toBeInTheDocument()
    act(() => editor.commands.setContent(`<p>${'a'.repeat(1200)}</p>`, { emitUpdate: true }))
    await waitFor(() => expect(writes()).toHaveLength(1), AUTOSAVE)
    expect(screen.queryByText('Too long to save: shorten it to 1200 characters.')).not.toBeInTheDocument()
  }, 20_000)

  it('[E6.1][autosave] sends only the languages that have text', async () => {
    await openEditor()

    await userEvent.click(screen.getByRole('tab', { name: /Deutsch/ }))
    await userEvent.type(await screen.findByLabelText('Name (Deutsch)'), 'Klassik')
    await waitFor(() => expect(writes()).toHaveLength(1), AUTOSAVE)
    expect(writes()[0]!.body).toMatchObject({ name: { en: 'Victorinox Classic', de: 'Klassik' }, text: { en: doc('A Swiss knife.') } })
  })

  it('[E6.1][412] a stale save shows the reload message, stops saving, and Reload starts again from the server copy', async () => {
    const danger = vi.spyOn(toast, 'danger')
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
    expect(danger).not.toHaveBeenCalled()
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

  it('[E6.1][autosave] Back with unsaved edits asks first, Keep editing stays, Save and leave goes and saves what was typed', async () => {
    await openEditor()

    await userEvent.type(await nameField(), ' II')
    await userEvent.click(screen.getByRole('button', { name: 'Back to Keepsakes' }))
    const dialog = await screen.findByRole('alertdialog')

    expect(dialog).toHaveTextContent('Save your changes?')
    expect(dialog).toHaveTextContent('Your changes are saved when you leave.')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Keep editing' }))
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument())
    expect(screen.getByTestId('keepsake-editor')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Back to Keepsakes' }))
    await userEvent.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Save and leave' }))

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

  it('[E6.1][autosave] a photo added is uploaded, confirmed and saved with the rest, and it shows as processing until it is ready', { timeout: 20_000 }, async () => {
    const added = '0198a000-0000-7000-8000-0000000000e2'
    const uploaded = { ...media, id: added, name: 'knife.jpg' }
    let reads = 0

    serve((call) => {
      if (call.path === `/api/store/${storeId}/media/uploads`)
        return Response.json({ uploadKey: 'k/u.jpg', url: 'https://storage.test/uploads/k/u.jpg', method: 'PUT', headers: { 'Content-Type': 'image/jpeg' }, expiresAt: '2026-10-30T09:00:00.000Z', kind: 'image' })
      if (call.path.startsWith('/uploads/'))
        return new Response(null, { status: 200 })
      if (call.path === `/api/store/${storeId}/media/confirm`)
        return Response.json({ ...uploaded, status: 'processing', publicUrl: null, variants: [] }, { status: 201 })
      if (call.path === `/api/store/${storeId}/media/${added}`) {
        reads += 1

        return Response.json(reads === 1 ? { ...uploaded, status: 'processing', publicUrl: null, variants: [] } : uploaded)
      }

      return undefined
    })
    await openEditor()

    await userEvent.upload(screen.getByTestId('photo-input'), new File(['x'], 'knife.jpg', { type: 'image/jpeg' }))
    await waitFor(() => expect(writes().some(call => call.method === 'PATCH'), document.body.textContent?.slice(-400)).toBe(true), { timeout: 8000 })
    const save = writes().find(call => call.method === 'PATCH')!

    expect(save.body).toMatchObject({ photoIds: [photoId, added] })
    expect(state.calls.map(call => call.path)).toContain(`/api/store/${storeId}/media/${added}`)
    expect(screen.getAllByRole('listitem').some(item => item.textContent?.includes('knife.jpg'))).toBe(true)
    expect(await screen.findByText('Processing…')).toBeInTheDocument()
    await waitFor(() => expect(screen.queryByText('Processing…')).not.toBeInTheDocument(), { timeout: 8000 })
  })

  it('[T-002] several photos picked together are all saved with the keepsake', { timeout: 20_000 }, async () => {
    let confirmed = 0

    serve((call) => {
      if (call.path === `/api/store/${storeId}/media/uploads`)
        return Response.json({ uploadKey: 'k/u.jpg', url: 'https://storage.test/uploads/k/u.jpg', method: 'PUT', headers: { 'Content-Type': 'image/jpeg' }, expiresAt: '2026-10-30T09:00:00.000Z', kind: 'image' })
      if (call.path.startsWith('/uploads/'))
        return new Response(null, { status: 200 })
      if (call.path === `/api/store/${storeId}/media/confirm`) {
        confirmed += 1

        return Response.json({ ...media, id: `0198a000-0000-7000-8000-0000000000f${confirmed}` }, { status: 201 })
      }

      return undefined
    })
    await openEditor()

    await userEvent.upload(screen.getByTestId('photo-input'), [new File(['x'], 'a.jpg', { type: 'image/jpeg' }), new File(['y'], 'b.jpg', { type: 'image/jpeg' }), new File(['z'], 'c.jpg', { type: 'image/jpeg' })])
    await waitFor(() => expect(writes().at(-1)?.body).toMatchObject({ photoIds: expect.arrayContaining([photoId]) }), { timeout: 8000 })
    await waitFor(() => expect(writes().at(-1)!.body).toMatchObject({ photoIds: [photoId, expect.any(String), expect.any(String), expect.any(String)] }), { timeout: 8000 })
    expect(new Set((writes().at(-1)!.body as { photoIds: string[] }).photoIds).size).toBe(4)
  })

  it('[E6.1][autosave] a file that is not a photo is refused before any request', async () => {
    await openEditor()

    await userEvent.upload(screen.getByTestId('photo-input'), new File(['x'], 'doc.pdf', { type: 'application/pdf' }), { applyAccept: false })

    expect(await screen.findByText('This type of file is not allowed. Use a JPEG, PNG or WebP photo.')).toBeInTheDocument()
    expect(state.calls.some(call => call.path.includes('/media/') && call.method !== 'GET')).toBe(false)
    expect(writes()).toHaveLength(0)
  })

  it('[E6.1][autosave] removing a photo and moving one with the arrow keys save the new order', async () => {
    const second = '0198a000-0000-7000-8000-0000000000e2'

    current = product({ photos: [media, { ...media, id: second }] })
    await openEditor()

    const grip = await screen.findByRole('button', { name: /Move photo\.jpg, position 1 of 2/ })

    grip.focus()
    await userEvent.keyboard('{ArrowDown}')
    await waitFor(() => expect(writes()).toHaveLength(1), AUTOSAVE)
    expect(writes()[0]!.body).toMatchObject({ photoIds: [second, photoId] })
    await userEvent.click(await screen.findByRole('button', { name: 'Remove photo-e2.jpg' }))
    await waitFor(() => expect(writes()).toHaveLength(2), AUTOSAVE)
    expect(writes()[1]!.body).toMatchObject({ photoIds: [photoId] })
  })
})

describe('[T-008][AC2] the Price card saves the one variant', () => {
  const save = (over: object = {}) => product({ ...current, ...over })

  it('[T-008][AC2] a changed price saves when the field is left, with the version-free variant request, no toast, and the bar says Saved', async () => {
    const success = vi.spyOn(toast, 'success')
    serve(call => (call.method === 'PATCH' && call.path === `${detail}/variants/${variantId}` ? Response.json(save({ variants: [{ id: variantId, skuCode: 'VX-1', mediaId: null, photo: null, priceRappen: 4500, status: 'published', values: {} }] })) : undefined))
    await openEditor('options')

    const price = within(await screen.findByRole('region', { name: 'Price' })).getByLabelText('Price, CHF')

    await userEvent.clear(price)
    await userEvent.type(price, '45')
    expect(writes()).toHaveLength(0)
    await userEvent.tab()

    await waitFor(() => expect(writes()).toHaveLength(1))
    expect(writes()[0]).toMatchObject({ method: 'PATCH', path: `${detail}/variants/${variantId}`, ifMatch: null, body: { priceRappen: 4500 } })
    expect(await screen.findByText(/^Saved \d/)).toBeInTheDocument()
    expect(success).not.toHaveBeenCalled()
  })

  it('[T-008][AC2] a price that is not above 0 is named at the field and nothing is sent', async () => {
    await openEditor('options')

    const price = within(await screen.findByRole('region', { name: 'Price' })).getByLabelText('Price, CHF')

    await userEvent.clear(price)
    await userEvent.tab()

    expect(await screen.findByText('Add a price above CHF 0.')).toBeInTheDocument()
    expect(writes()).toHaveLength(0)
  })

  it('[T-008] the status is chosen in the card and saves at once', async () => {
    const success = vi.spyOn(toast, 'success')
    serve(call => (call.method === 'PATCH' && call.path === `${detail}/variants/${variantId}` ? Response.json(save({ variants: [{ id: variantId, skuCode: 'VX-1', mediaId: null, photo: null, priceRappen: 3900, status: 'draft', values: {} }] })) : undefined))
    await openEditor('options')

    const card = await screen.findByRole('region', { name: 'Price' })

    await userEvent.click(within(card).getByRole('button', { name: /Status/ }))
    await userEvent.click(await screen.findByRole('option', { name: 'Hidden' }))

    await waitFor(() => expect(writes()).toHaveLength(1))
    expect(writes()[0]).toMatchObject({ method: 'PATCH', body: { status: 'draft' } })
    await waitFor(() => expect(success).toHaveBeenCalledExactlyOnceWith('VX-1: hidden.'))
  })

  it('[E6.1][variant] a code the shop already uses is refused at the field, and a bad one before any request', async () => {
    const danger = vi.spyOn(toast, 'danger')
    serve(call => (call.method === 'PATCH' && call.path.includes('/variants/') ? problem(409, 'sku-code-taken') : undefined))
    await openEditor('options')

    const code = within(await screen.findByRole('region', { name: 'Price' })).getByLabelText('SKU code')

    await userEvent.clear(code)
    await userEvent.type(code, 'bad code')
    await userEvent.tab()
    expect(await screen.findByText('Letters and digits, joined by - _ or . (like 1.6795-XS-RED).')).toBeInTheDocument()
    expect(writes()).toHaveLength(0)
    await userEvent.clear(code)
    await userEvent.type(code, 'vx-9')
    await userEvent.tab()

    expect(await screen.findByText('VX-9 is already used in your shop.')).toBeInTheDocument()
    expect(danger).not.toHaveBeenCalled()
  })
})

/** The step list's button for Review and publish: it saves what is typed, then opens the step. */
const openReview = () => userEvent.click(screen.getByRole('button', { name: /^3\. Review and publish/ }))

describe('[E6.1][review] Review and publish, the last step', () => {
  it('[T-004] is the last step of the list, and the header\'s red action opens it (Details autosave; owner, 04.11.2026)', async () => {
    const router = await openEditor()

    const steps = within(screen.getByRole('navigation', { name: 'Steps' }))

    expect(steps.getAllByRole('button').map(button => button.getAttribute('aria-label')?.replace(/,.*$/, ''))).toEqual(['1. Details', '2. Options and variants', '3. Review and publish'])
    await userEvent.click(within(editorHeader()).getByRole('button', { name: 'Review and publish' }))
    expect(await screen.findByTestId('review-screen', undefined, SLOW)).toBeInTheDocument()
    expect(router.state.location.search).toMatchObject({ step: 'review' })
    expect(within(editorHeader()).queryByRole('button', { name: 'Review and publish' })).not.toBeInTheDocument()
  })

  it('[T-004] opens from the step list, shows the preview and the checks, and Back returns to Options and variants', async () => {
    const router = await openEditor()

    await openReview()

    expect(await screen.findByTestId('review-screen', undefined, SLOW)).toBeInTheDocument()
    expect(router.state.location.search).toMatchObject({ step: 'review' })
    expect(screen.getAllByText('Ready · 1 to look at').length).toBeGreaterThan(0)
    expect(screen.getByTestId('keepsake-preview')).toHaveTextContent('Victorinox Classic')
    expect(screen.getByTestId('keepsake-preview')).toHaveTextContent(/CHF\s*39/)
    expect(screen.queryByRole('button', { name: 'Next' })).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Previous step' }))

    expect(await screen.findByRole('region', { name: 'Options' })).toBeInTheDocument()
    expect(router.state.location.search).toMatchObject({ step: 'options' })
  })

  it('[T-004] the old ?view=review address opens the step', async () => {
    renderKeepsakes(`/store/products/${productId}?view=review`)

    expect(await screen.findByTestId('review-screen', undefined, SLOW)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^3\. Review and publish/ })).toHaveAttribute('aria-current', 'step')
  })

  it('[T-004] saves what is typed before the step opens', async () => {
    await openEditor()

    await userEvent.type(await nameField(), ' II')
    await openReview()

    await screen.findByTestId('review-screen', undefined, SLOW)
    const saves = writes()

    expect(saves).toHaveLength(1)
    expect(saves[0]).toMatchObject({ method: 'PATCH', body: { name: { en: 'Victorinox Classic II' } } })
    expect(await screen.findByTestId('keepsake-preview')).toHaveTextContent('Victorinox Classic II')
  })

  it('[T-004] does not open while the typed edits cannot be saved', async () => {
    serve(call => (call.method === 'PATCH' ? problem(412, 'precondition-failed') : undefined))
    await openEditor()

    await userEvent.type(await nameField(), ' II')
    await openReview()

    expect(await screen.findByRole('alert', undefined, AUTOSAVE)).toHaveTextContent('Someone saved this keepsake after you opened it')
    expect(screen.queryByTestId('review-screen')).not.toBeInTheDocument()
  })

  it('[T-004] a laptop shows the guest page in the iPhone mockup beside the publish card, and the card offers Publish', async () => {
    view.wide = true
    await openEditor()

    await openReview()
    const review = await screen.findByTestId('review-screen', undefined, SLOW)

    expect(within(review).queryByText(/Goes live/)).not.toBeInTheDocument()
    expect(within(review).queryByText(/stand-in/)).not.toBeInTheDocument()
    expect(within(review).getByTestId('publish-checks')).toBeInTheDocument()
    expect(within(review).getByText(/No Deutsch name and text/)).toBeInTheDocument()
    expect(within(review).getByRole('button', { name: 'Publish' })).toBeEnabled()
    expect(within(editorHeader()).queryByRole('button', { name: 'Publish' })).not.toBeInTheDocument()
  })

  it('[T-004] blocking checks switch Publish off, name what is missing and Edit goes to the Details step with the Photos block', async () => {
    current = product({ photos: [], blocking: [{ code: 'photos', card: 'photos' }, { code: 'variant-for-sale', card: 'variants' }] })
    view.wide = true
    await openEditor()

    await openReview()
    const review = await screen.findByTestId('review-screen', undefined, SLOW)

    expect(within(review).getByText('2 things stop publishing')).toBeInTheDocument()
    expect(within(review).getByText('Add at least one photo.')).toBeInTheDocument()
    expect(within(review).getByText('Put at least one variant on sale.')).toBeInTheDocument()
    expect(within(review).getByRole('button', { name: 'Publish' })).toBeDisabled()
    await userEvent.click(within(review).getAllByRole('button', { name: 'Edit' })[0]!)

    expect(await screen.findByRole('region', { name: 'Photos' })).toBeVisible()
    expect(screen.getByRole('alert')).toHaveTextContent('No photos yet. Add one to publish; the first is the cover.')
    expect(screen.getByRole('button', { name: '1. Details, Has errors' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '3. Review and publish, Has errors' })).toBeInTheDocument()
    await waitFor(() => expect(document.getElementById('photos')!.contains(document.activeElement)).toBe(true))
  })

  it('[T-004][T-008] Edit on a variants check opens the merged step', async () => {
    current = product({ blocking: [{ code: 'variant-for-sale', card: 'variants' }] })
    view.wide = true
    const router = await openEditor()

    await openReview()
    await userEvent.click(within(await screen.findByTestId('review-screen', undefined, SLOW)).getByRole('button', { name: 'Edit' }))

    expect(await screen.findByRole('region', { name: 'Options' })).toBeInTheDocument()
    expect(router.state.location.search).toMatchObject({ step: 'options' })
  })

  it('[T-004] on a phone the header says what the checks say, the step line has Back, and the checks and Publish sit in the step', async () => {
    current = product({ blocking: [{ code: 'language', card: 'basics' }] })
    await openEditor()

    await openReview()
    const checks = await screen.findByTestId('publish-checks', undefined, SLOW)

    expect(checks).toHaveTextContent('Add the name and the text in English or German.')
    expect(within(editorHeader()).getByText('1 thing stops publishing')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Previous step' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Publish' })).toBeDisabled()
    expect(screen.getAllByRole('button', { name: 'Publish' })).toHaveLength(1)
  })

  it('[T-004][AC30] Publish sends the row version, and the editor then shows Published with Unpublish in the card', async () => {
    const success = vi.spyOn(toast, 'success')
    serve(call => (call.method === 'POST' && call.path === `${detail}/publish` ? Response.json(product({ status: 'published', rowVersion: 2, slug: { en: 'victorinox-classic' }, warnings: [] })) : undefined))
    await openEditor()

    await openReview()
    await screen.findByTestId('review-screen', undefined, SLOW)
    await userEvent.click(within(await screen.findByTestId('review-screen')).getByRole('button', { name: 'Publish' }))

    await waitFor(() => expect(writes()).toHaveLength(1))
    expect(writes()[0]).toMatchObject({ method: 'POST', path: `${detail}/publish`, ifMatch: '1' })
    expect(await within(editorHeader()).findByText('Published')).toBeInTheDocument()
    expect(await screen.findByRole('button', { name: 'Unpublish keepsake' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Publish' })).not.toBeInTheDocument()
    expect(success).toHaveBeenCalledExactlyOnceWith('Published in English. Guests see it within about a minute.')
  })

  it('[T-004] a refused publish sends the merchant back to the step with the error', async () => {
    const danger = vi.spyOn(toast, 'danger')
    serve(call => (call.method === 'POST' && call.path === `${detail}/publish` ? problem(422, 'publish-incomplete') : undefined))
    await openEditor()

    await openReview()
    await screen.findByTestId('review-screen', undefined, SLOW)
    await userEvent.click(within(await screen.findByTestId('review-screen')).getByRole('button', { name: 'Publish' }))

    expect(await screen.findByRole('region', { name: 'Name and text' })).toBeVisible()
    expect(screen.queryByTestId('review-screen')).not.toBeInTheDocument()
    expect(danger).toHaveBeenCalledExactlyOnceWith('This keepsake cannot be published yet. See what is missing.')
  })

  it('[T-004] a published keepsake with edits says so and the card offers Publish changes and Unpublish', async () => {
    current = product({ status: 'published', hasUnpublishedEdits: true, slug: { en: 'victorinox-classic' } })
    await openEditor()

    expect(screen.getByText('Published · edits not live')).toBeInTheDocument()
    await openReview()
    const review = await screen.findByTestId('review-screen', undefined, SLOW)

    expect(within(review).getByRole('button', { name: 'Publish changes' })).toBeEnabled()
    expect(within(review).getByRole('button', { name: 'Unpublish keepsake' })).toBeInTheDocument()
  })

  it('[T-007B] Unpublish waits inside its dialog: a refusal stays there with no toast, and an answer closes it and makes the keepsake a draft', async () => {
    const danger = vi.spyOn(toast, 'danger')
    let refuse = true

    current = product({ status: 'published', slug: { en: 'victorinox-classic' } })
    serve(call => (call.method === 'POST' && call.path === `${detail}/unpublish`
      ? (refuse ? problem(404, 'not-found') : Response.json(product({ status: 'draft', rowVersion: 2 })))
      : undefined))
    await openEditor()

    await openReview()
    const review = await screen.findByTestId('review-screen', undefined, SLOW)

    await userEvent.click(within(review).getByRole('button', { name: 'Unpublish keepsake' }))
    const dialog = await screen.findByRole('alertdialog')

    await userEvent.click(within(dialog).getByRole('button', { name: 'Unpublish' }))
    expect(await within(dialog).findByRole('alert')).toHaveTextContent(en['keepsakes.problem.notFound'])
    expect(danger).not.toHaveBeenCalled()
    refuse = false
    await userEvent.click(within(dialog).getByRole('button', { name: 'Unpublish' }))

    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument())
    expect(await within(editorHeader()).findByText('Draft')).toBeInTheDocument()
  })

  it('[T-004] a live keepsake with no edits has only Unpublish in the card', async () => {
    current = product({ status: 'published', slug: { en: 'victorinox-classic' } })
    await openEditor()

    await openReview()
    await screen.findByTestId('review-screen', undefined, SLOW)

    expect(screen.queryByRole('button', { name: /^Publish/ })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Unpublish keepsake' })).toBeInTheDocument()
  })

  it('[T-004] Unpublish asks first, then sends the row version and returns to Draft; cancelling changes nothing', async () => {
    current = product({ status: 'published', slug: { en: 'victorinox-classic' } })
    const success = vi.spyOn(toast, 'success')
    serve(call => (call.method === 'POST' && call.path === `${detail}/unpublish` ? Response.json(product({ status: 'draft', rowVersion: 2 })) : undefined))
    await openEditor()

    await openReview()
    await userEvent.click(await screen.findByRole('button', { name: 'Unpublish keepsake' }, SLOW))
    const cancelled = await screen.findByRole('alertdialog')

    await userEvent.click(within(cancelled).getByRole('button', { name: 'Cancel' }))
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument())
    expect(writes()).toHaveLength(0)
    await userEvent.click(screen.getByRole('button', { name: 'Unpublish keepsake' }))
    const dialog = await screen.findByRole('alertdialog')

    expect(dialog).toHaveTextContent('Unpublish this keepsake?')
    expect(dialog).toHaveTextContent('Guests no longer see it in English or German')
    expect(dialog).toHaveTextContent('Open orders stay as they are.')
    expect(writes()).toHaveLength(0)
    await userEvent.click(within(dialog).getByRole('button', { name: 'Unpublish' }))

    await waitFor(() => expect(writes()).toHaveLength(1))
    expect(writes()[0]).toMatchObject({ method: 'POST', path: `${detail}/unpublish`, ifMatch: '1' })
    expect(await within(editorHeader()).findByText('Draft')).toBeInTheDocument()
    expect(success).toHaveBeenCalledExactlyOnceWith('The keepsake is a draft again.')
  })

  it('[T-004] the editor loads the review step lazily, so the mockup is not in the first step\'s code', () => {
    const source = readFileSync(resolve(__dirname, '../src/features/keepsakes/components/keepsake-editor.tsx'), 'utf8')

    expect(source).toContain('lazy(() => import(\'./review-screen\'))')
    expect(source).not.toMatch(/from '\.\/review-screen'/)
    expect(readFileSync(resolve(__dirname, '../src/features/keepsakes/components/review-screen.tsx'), 'utf8')).toContain('from \'@/components/iphone-mockup\'')
  })
})

describe('[E6.1][412] a keepsake that is not there', () => {
  it('[E6.1] says so with a way back to the list', async () => {
    state.answer = call => (call.path === detail ? problem(404, 'not-found') : undefined)
    renderKeepsakes(`/store/products/${productId}`)

    expect(await screen.findByText('This keepsake no longer exists.', undefined, SLOW)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Back to Keepsakes' })).toHaveAttribute('href', '/store/products')
  })
})

describe('[E6.1][i18n] M12 in German', () => {
  beforeEach(() => writeStored('sk.language', 'de'))

  it('[E6.1][i18n] shows the editor, its steps, blocks and variants in German, with no engraving and no key left over', async () => {
    renderKeepsakes(`/store/products/${productId}`)

    await screen.findByLabelText('Name (English)', undefined, SLOW)
    await screen.findByRole('heading', { level: 3, name: 'Name und Text' }, SLOW)
    expect(within(screen.getByRole('navigation', { name: 'Schritte' })).getAllByRole('button').map(button => button.getAttribute('aria-label'))).toEqual(['1. Details, Erledigt', '2. Optionen und Varianten, Erledigt', '3. Prüfen und veröffentlichen, Erledigt'])
    expect(screen.getAllByRole('heading', { level: 3 }).map(h => h.textContent)).toEqual(['Name und Text', 'Fotos', 'Provisionssatz für Partner (%)'])
    expect(screen.getByText(/Schritt 1 von 3/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Weiter' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Zurück zu Andenken' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Weiter' }))
    expect(await screen.findByText('Keine Optionen: Dieses Andenken wird als eine Variante verkauft. Fügen Sie eine hinzu, wenn es in Versionen kommt, etwa als Grösse oder Farbe.')).toBeInTheDocument()
    expect(await screen.findByRole('region', { name: 'Preis' })).toBeInTheDocument()
    expect(document.body.textContent).not.toMatch(/keepsakes\.[a-z]|steps\.[a-z]/)
    expect(document.body.textContent).not.toMatch(/gravur|unterkategorie|anzahlung|später zahlen|zahlungsfrist/i)
  })

  it('[E6.1][i18n] shows Review and publish with its checks and warnings in German', async () => {
    current = product({ photos: [], blocking: [{ code: 'photos', card: 'photos' }], warnings: [{ code: 'other-language', card: 'basics', language: 'de' }, { code: 'commission-zero', card: 'commission' }] })
    view.wide = true
    renderKeepsakes(`/store/products/${productId}?step=review`)

    const review = await screen.findByTestId('review-screen', undefined, SLOW)

    expect(await within(review).findByText('1 Punkt verhindert das Veröffentlichen', undefined, SLOW)).toBeInTheDocument()
    expect(within(review).getByText('Fügen Sie mindestens ein Foto hinzu.')).toBeInTheDocument()
    expect(within(review).getByText('Die Provision beträgt 0 %: Partner verdienen nichts daran.')).toBeInTheDocument()
    expect(within(review).getByRole('button', { name: 'Veröffentlichen' })).toBeDisabled()
    expect(document.body.textContent).not.toMatch(/keepsakes\.[a-z]/)
  })
})
