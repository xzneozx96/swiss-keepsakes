import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { writeStored } from '@/lib/storage'
import { item, other, page, photoId, problem, renderMedia, setUpHarness, state, storeId, third, uses, writes } from './media-harness'

vi.hoisted(() => vi.stubEnv('VITE_API_ENABLED', 'true'))

const toasts = vi.hoisted(() => ({ success: vi.fn(), danger: vi.fn(), warning: vi.fn() }))

vi.mock('@heroui/react', async (original) => {
  const actual = await original<typeof import('@heroui/react')>()

  return { ...actual, toast: Object.assign(vi.fn(), toasts) }
})

const base = `/api/store/${storeId}/media`
const SLOW = { timeout: 8000 }

beforeEach(async () => {
  toasts.success.mockClear()
  toasts.danger.mockClear()
  toasts.warning.mockClear()
  await setUpHarness()
})

interface Answers {
  list?: (path: string) => Response
  uses?: Response
  other?: (call: { method: string, path: string, body: unknown }) => Response | undefined
}

/** Answers the library list, the where-used read of a file, and anything else the test hands over. */
function answerWith({ list, uses: usesAnswer, other: extra }: Answers = {}) {
  state.answer = (call) => {
    if (call.path === '/api/me')
      return undefined
    if (call.method === 'GET' && call.path.startsWith(`${base}?`))
      return list ? list(call.path) : Response.json(page([item()]))
    if (call.method === 'GET' && call.path.endsWith('/uses'))
      return usesAnswer ?? Response.json(uses())

    return extra?.(call)
  }
}

const listCalls = () => state.calls.filter(call => call.method === 'GET' && call.path.startsWith(`${base}?`))
const sheet = () => screen.findByRole('dialog')

describe('[E4.11][AC51] the media library in English', () => {
  it('[E4.11][AC51] shows the photo wall: names, the unused badge, a status chip, and the count on each tab', async () => {
    answerWith({
      list: () => Response.json(page([
        item({ name: 'Sunrise.JPG' }),
        item({ id: other, name: 'Lonely.jpg', usage: { pages: 0, published: 0, drafts: 0 } }),
        item({ id: third, name: 'Old-banner.jpg', status: 'retired' }),
      ], { kinds: { image: 31, audio: 2, pdf: 1 } })),
    })
    renderMedia()

    const wall = await screen.findByRole('list', { name: 'Photos' })

    expect(within(wall).getAllByRole('listitem')).toHaveLength(3)
    expect(within(wall).getByRole('button', { name: 'Sunrise.JPG' })).toBeInTheDocument()
    expect(within(wall).getByText('Unused')).toBeInTheDocument()
    expect(within(wall).getByText('Retired')).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Photos · 31' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Audio · 2' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'PDFs · 1' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Media' })).toBeInTheDocument()
  })

  it('[E4.11][AC51] asks for 24 photos a page, newest first from the server, and 10 on the Audio tab', async () => {
    answerWith({ list: path => Response.json(page(path.includes('kind=audio') ? [item({ id: other, kind: 'audio', name: 'Alphorn.mp3', contentType: 'audio/mpeg', width: null, height: null, variants: [], durationSeconds: 13 })] : [item()])) })
    renderMedia()

    await screen.findByRole('list', { name: 'Photos' })
    expect(listCalls().at(-1)!.path).toContain('kind=image')
    expect(listCalls().at(-1)!.path).toContain('pageSize=24')
    await userEvent.click(screen.getByRole('tab', { name: /Audio/ }))

    await screen.findByRole('list', { name: 'Audio' })
    expect(listCalls().at(-1)!.path).toContain('kind=audio')
    expect(listCalls().at(-1)!.path).toContain('pageSize=10')
  })

  it('[E4.11][AC51] an audio list row shows the name, the description or "No description", and the usage line', async () => {
    answerWith({
      list: () => Response.json(page([
        item({ kind: 'audio', name: 'Alphorn.mp3', alt: {}, usage: { pages: 3, published: 2, drafts: 1 } }),
        item({ id: other, kind: 'audio', name: 'Cowbells.mp3', alt: { en: 'Cowbells in Pilatus' }, usage: { pages: 1, published: 0, drafts: 1 } }),
        item({ id: third, kind: 'audio', name: 'Silence.mp3', usage: { pages: 0, published: 0, drafts: 0 } }),
      ])),
    })
    renderMedia('/store/content/media?kind=audio')

    const rows = await screen.findByRole('list', { name: 'Audio' })

    expect(within(rows).getByText('3 pages · 2 published')).toBeInTheDocument()
    expect(within(rows).getByText('1 page · draft only')).toBeInTheDocument()
    expect(within(rows).getAllByText('Unused')).toHaveLength(1)
    expect(within(rows).getByText('No description')).toBeInTheDocument()
    expect(within(rows).getByText('Cowbells in Pilatus')).toBeInTheDocument()
  })

  it('[E4.11][AC51] the Retire item of a used file is off and its label gives the reason', async () => {
    answerWith({ list: () => Response.json(page([item({ kind: 'pdf', name: 'Walk.pdf', usage: { pages: 3, published: 2, drafts: 1 } }), item({ id: other, kind: 'pdf', name: 'Solo.pdf', usage: { pages: 1, published: 1, drafts: 0 } })])) })
    renderMedia('/store/content/media?kind=pdf')

    await screen.findByRole('list', { name: 'PDFs' })
    await userEvent.click(screen.getByRole('button', { name: 'Actions for Walk.pdf' }))

    expect(await screen.findByRole('menuitem', { name: 'Retire (used on 3 pages)' })).toHaveAttribute('aria-disabled', 'true')
  })

  it('[E4.11][AC51] the empty state of a new shop, and the no-match state', async () => {
    answerWith({ list: () => Response.json(page([], { kinds: { image: 0, audio: 0, pdf: 0 } })) })
    renderMedia()
    expect(await screen.findByText('No files yet. Upload photos, recordings or tour PDFs; several at once is fine.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Upload' })).toBeInTheDocument()
  })

  it('[E4.11][AC51] a search or a filter that matches nothing says so', async () => {
    answerWith({ list: () => Response.json(page([], { kinds: { image: 5, audio: 0, pdf: 0 } })) })
    renderMedia('/store/content/media?q=fondue')

    expect(await screen.findByText('No file matches. Try another word or clear the filters.')).toBeInTheDocument()
  })

  it('[E4.11][AC51] a search is sent as the name search, a moment after the last key', async () => {
    answerWith()
    renderMedia()

    await screen.findByRole('list', { name: 'Photos' })
    await userEvent.type(screen.getByRole('searchbox', { name: 'Search by name' }), 'sunrise')

    await waitFor(() => expect(listCalls().at(-1)!.path).toContain('q=sunrise'))
    expect(listCalls().filter(call => call.path.includes('q=')).length).toBeLessThanOrEqual(2)
  })

  it('[E4.11][AC51] the filters of the address are sent and shown as chips', async () => {
    answerWith()
    renderMedia('/store/content/media?use=unused,drafts&status=ready')

    await screen.findByRole('list', { name: 'Photos' })

    expect(listCalls().at(-1)!.path).toContain('use=unused%2Cdrafts')
    expect(listCalls().at(-1)!.path).toContain('status=ready')
    for (const chip of ['Unused', 'Only in drafts', 'Ready'])
      expect(screen.getByRole('button', { name: new RegExp(chip) })).toBeInTheDocument()
  })

  it('[E4.11][AC51] shows tiles shaped like the wall while the list is on its way', async () => {
    answerWith({ list: () => new Promise<Response>(() => undefined) as unknown as Response })
    renderMedia()

    await waitFor(() => expect(document.querySelectorAll('ul[aria-hidden="true"] li')).toHaveLength(12))
  })

  it('[E4.11][AC51] a failed read says so', async () => {
    answerWith({ list: () => problem(500, 'internal-error') })
    renderMedia()

    expect(await screen.findByText('The media library could not be loaded.')).toBeInTheDocument()
  })
})

describe('[E4.11][AC51] the detail sheet', () => {
  it('[E4.11][AC51] names where a file is used, published first, and keeps Retire off with the reason under the preview', async () => {
    answerWith()
    renderMedia()

    await userEvent.click(await screen.findByRole('button', { name: 'Kapellbruecke-Sunrise.JPG' }))
    const dialog = await sheet()

    expect(await within(dialog).findByText('On published pages (2)')).toBeInTheDocument()
    expect(within(dialog).getByText('Only in drafts (1)')).toBeInTheDocument()
    expect(within(dialog).getByText('Guests do not see these yet.')).toBeInTheDocument()
    expect(within(dialog).getByText('Lucerne in a day')).toBeInTheDocument()
    expect(within(dialog).getByText('Story · EN · cover')).toBeInTheDocument()
    expect(within(dialog).getByText('Tour · cover')).toBeInTheDocument()
    expect(within(dialog).getByText('Fondue set')).toBeInTheDocument()
    expect(within(dialog).getByText('Keepsake · photo')).toBeInTheDocument()
    const retire = within(dialog).getByRole('button', { name: 'Retire' })

    expect(retire).toBeDisabled()
    expect(retire).toHaveAttribute('aria-describedby', `retire-${photoId}`)
    expect(within(dialog).getByText('Used on 3 pages. Remove it from them, or replace it, before you can retire it.')).toHaveAttribute('id', `retire-${photoId}`)
    expect(within(dialog).getByRole('button', { name: 'Replace' })).toBeEnabled()
    expect(state.calls.some(call => call.path === `${base}/${photoId}/uses`)).toBe(true)
  })

  it('[E4.11][AC51] says no page uses a file that no page uses, and shows the info rows', async () => {
    answerWith({ list: () => Response.json(page([item({ usage: { pages: 0, published: 0, drafts: 0 } })])), uses: Response.json(uses({ published: [], drafts: [] })) })
    renderMedia()

    await userEvent.click(await screen.findByRole('button', { name: 'Kapellbruecke-Sunrise.JPG' }))
    const dialog = await sheet()

    expect(await within(dialog).findByText('No page uses this file.')).toBeInTheDocument()
    expect(within(dialog).getByRole('button', { name: 'Retire' })).toBeEnabled()
    expect(within(dialog).getByText('IMG_4032.JPG')).toBeInTheDocument()
    expect(within(dialog).getByText('4032 × 3024')).toBeInTheDocument()
    expect(within(dialog).getByText('3.2 MB')).toBeInTheDocument()
    expect(within(dialog).getByText('v1')).toBeInTheDocument()
  })

  it('[E4.11][AC51] renames a file and sends the name and both descriptions; a blank name cannot be saved', async () => {
    answerWith({ other: call => (call.method === 'PATCH' ? Response.json(item({ name: 'Bridge at dawn' })) : undefined) })
    renderMedia()

    await userEvent.click(await screen.findByRole('button', { name: 'Kapellbruecke-Sunrise.JPG' }))
    const dialog = await sheet()
    const name = within(dialog).getByRole('textbox', { name: 'Name' })
    const save = within(dialog).getByRole('button', { name: 'Save name and description' })

    expect(save).toBeDisabled()
    await userEvent.clear(name)
    expect(await within(dialog).findByText('Give the file a name.')).toBeInTheDocument()
    expect(save).toBeDisabled()
    await userEvent.type(name, 'Bridge at dawn')
    await userEvent.click(save)

    await waitFor(() => expect(writes()).toHaveLength(1))
    expect(writes()[0]).toMatchObject({ method: 'PATCH', path: `${base}/${photoId}`, body: { name: 'Bridge at dawn', alt: { en: 'The Chapel Bridge at sunrise', de: '' } } })
    expect(writes()[0]!.key).toBeTruthy()
    await waitFor(() => expect(toasts.success).toHaveBeenCalledWith('Name and description saved.'))
  })

  it('[E4.11][AC51] says German guests see no description yet when only English is filled', async () => {
    answerWith()
    renderMedia()

    await userEvent.click(await screen.findByRole('button', { name: 'Kapellbruecke-Sunrise.JPG' }))

    expect(within(await sheet()).getByText('Guests reading German see no description yet.')).toBeInTheDocument()
  })

  it('[E4.11][AC51] a retired file is read-only with no Replace or Retire', async () => {
    answerWith({ list: () => Response.json(page([item({ status: 'retired', usage: { pages: 0, published: 0, drafts: 0 } })])), uses: Response.json(uses({ published: [], drafts: [] })) })
    renderMedia()

    await userEvent.click(await screen.findByRole('button', { name: 'Kapellbruecke-Sunrise.JPG' }))
    const dialog = await sheet()

    expect(within(dialog).getByText('Retired. Pages can no longer choose it, and it cannot come back.')).toBeInTheDocument()
    expect(within(dialog).queryByRole('button', { name: 'Retire' })).not.toBeInTheDocument()
    expect(within(dialog).queryByRole('button', { name: 'Replace' })).not.toBeInTheDocument()
    expect(within(dialog).queryByRole('button', { name: 'Save name and description' })).not.toBeInTheDocument()
    expect(within(dialog).getByRole('textbox', { name: 'Name' })).toHaveAttribute('readonly')
  })
})

describe('[E4.11][AC51] retiring', () => {
  const unused = { usage: { pages: 0, published: 0, drafts: 0 } }

  it('[E4.11][AC51] confirms, then retires an unused file and says so', async () => {
    answerWith({ list: () => Response.json(page([item(unused)])), uses: Response.json(uses({ published: [], drafts: [] })), other: call => (call.method === 'POST' ? Response.json(item({ ...unused, status: 'retired' })) : undefined) })
    renderMedia()

    await userEvent.click(await screen.findByRole('button', { name: 'Kapellbruecke-Sunrise.JPG' }))
    await userEvent.click(within(await sheet()).getByRole('button', { name: 'Retire' }))
    const confirm = await screen.findByRole('alertdialog')

    expect(within(confirm).getByText('Retire Kapellbruecke-Sunrise.JPG?')).toBeInTheDocument()
    expect(within(confirm).getByText('No page uses it. Retired files leave the library and the pickers, and cannot come back.')).toBeInTheDocument()
    await userEvent.click(within(confirm).getByRole('button', { name: 'Retire file' }))

    await waitFor(() => expect(writes()).toHaveLength(1))
    expect(writes()[0]).toMatchObject({ method: 'POST', path: `${base}/${photoId}/retire` })
    await waitFor(() => expect(toasts.success).toHaveBeenCalledWith('Kapellbruecke-Sunrise.JPG retired.'))
  })

  it('[E4.11][AC51] a retire that loses the race to a draft shows "Not retired" in the sheet and keeps Retire off', async () => {
    let retired = false
    answerWith({
      list: () => Response.json(page([retired ? item({ usage: { pages: 1, published: 0, drafts: 1 } }) : item(unused)])),
      uses: Response.json(uses({ published: [], drafts: [{ pageKind: 'story', pageId: other, language: 'de', title: { de: 'Luzern an einem Tag' }, role: 'cover', published: false, thumbnailUrl: null }] })),
      other: (call) => {
        if (call.method !== 'POST')
          return undefined
        retired = true

        return Response.json({ type: 'media-in-use', status: 409, title: 'x', instance: '/x', requestId: 'req-1', pages: 1 }, { status: 409 })
      },
    })
    renderMedia()

    await userEvent.click(await screen.findByRole('button', { name: 'Kapellbruecke-Sunrise.JPG' }))
    await userEvent.click(within(await sheet()).getByRole('button', { name: 'Retire' }))
    await userEvent.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Retire file' }))

    const dialog = await sheet()

    expect(await within(dialog).findByText('Not retired')).toBeInTheDocument()
    expect(within(dialog).getByText('While you were deciding, a page started to use this file. A file in use cannot be retired.')).toBeInTheDocument()
    await waitFor(() => expect(within(dialog).getByRole('button', { name: 'Retire' })).toBeDisabled())
    expect(within(dialog).getByText('Used on 1 page. Remove it from there, or replace it, before you can retire it.')).toBeInTheDocument()
    expect(toasts.success).not.toHaveBeenCalled()
  })

  it('[E4.11][AC51] Select mode retires only the unused files and keeps the used ones', async () => {
    answerWith({
      list: () => Response.json(page([item({ name: 'Used.jpg' }), item({ id: other, name: 'Free-one.jpg', ...unused }), item({ id: third, name: 'Free-two.jpg', ...unused })])),
      other: call => (call.method === 'POST' ? Response.json(item({ status: 'retired' })) : undefined),
    })
    renderMedia()

    await screen.findByRole('list', { name: 'Photos' })
    await userEvent.click(screen.getByRole('button', { name: 'Select' }))
    for (const name of ['Used.jpg', 'Free-one.jpg', 'Free-two.jpg'])
      await userEvent.click(screen.getByRole('button', { name: `Select ${name}` }))

    expect(screen.getByText('3 selected')).toBeInTheDocument()
    expect(screen.getByText('1 in use, kept')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Retire 2' }))
    const confirm = await screen.findByRole('alertdialog')

    expect(within(confirm).getByText('Retire 2')).toBeInTheDocument()
    expect(within(confirm).getByText(/1 in use, kept\./)).toBeInTheDocument()
    await userEvent.click(within(confirm).getByRole('button', { name: 'Retire file' }))

    await waitFor(() => expect(writes()).toHaveLength(2))
    expect(writes().map(call => call.path).sort()).toEqual([`${base}/${other}/retire`, `${base}/${third}/retire`].sort())
    await waitFor(() => expect(toasts.success).toHaveBeenCalledWith('2 files retired. 1 in use were kept.'))
  })

  it('[E4.11][AC51] Select is on the photo wall only', async () => {
    answerWith()
    renderMedia('/store/content/media?kind=pdf')

    await screen.findByRole('list', { name: 'PDFs' })
    expect(screen.queryByRole('button', { name: 'Select' })).not.toBeInTheDocument()
  })
})

describe('[E4.11][AC51] replacing', () => {
  const grant = { uploadKey: `${storeId}/k.png`, url: 'https://storage.test/uploads/k', method: 'PUT', headers: { 'Content-Type': 'image/png' }, expiresAt: '2026-10-30T10:15:00.000Z', kind: 'image' }

  function replaceAnswers() {
    answerWith({
      other: (call) => {
        if (call.path === `${base}/uploads`)
          return Response.json(grant)
        if (call.path === 'https://storage.test/uploads/k' || call.path === '/uploads/k')
          return new Response(null, { status: 200 })
        if (call.path === `${base}/${photoId}/replace`)
          return Response.json(item({ version: 2, fileName: 'new.png' }))

        return undefined
      },
    })
  }

  it('[E4.11][AC51] says how many pages change, then sends the new file and reports the live version', async () => {
    replaceAnswers()
    renderMedia()

    await userEvent.click(await screen.findByRole('button', { name: 'Kapellbruecke-Sunrise.JPG' }))
    await userEvent.click(within(await sheet()).getByRole('button', { name: 'Replace' }))
    const confirm = await screen.findByRole('alertdialog')

    expect(within(confirm).getByText('Every page that uses it shows the new file: 2 published and 1 only in drafts (3 in all). Guests see the change on the published ones at once.')).toBeInTheDocument()
    await userEvent.click(within(confirm).getByRole('button', { name: 'Choose new file' }))
    await userEvent.upload(screen.getByTestId('replace-input'), new File(['png'], 'new.png', { type: 'image/png' }))

    await waitFor(() => expect(toasts.success).toHaveBeenCalledWith('Version 2 is live on 3 pages.'))
    const paths = writes().map(call => call.path).filter(path => path.startsWith(base))

    expect(paths).toEqual([`${base}/uploads`, `${base}/${photoId}/replace`])
    expect(writes().find(call => call.path.endsWith('/replace'))).toMatchObject({ body: { uploadKey: grant.uploadKey, fileName: 'new.png' } })
    expect(writes().find(call => call.path.endsWith('/uploads'))).toMatchObject({ body: { contentType: 'image/png', byteSize: 3 } })
  })

  it('[E4.11][AC51] a PDF dialog adds that a tour has exactly one PDF', async () => {
    answerWith({ list: () => Response.json(page([item({ kind: 'pdf', name: 'Walk.pdf' })])) })
    renderMedia('/store/content/media?kind=pdf')

    await userEvent.click(await screen.findByRole('button', { name: /^Walk\.pdf/ }))
    await userEvent.click(within(await sheet()).getByRole('button', { name: 'Replace' }))

    expect(await screen.findByText('A tour has exactly one PDF; the new file takes its place.')).toBeInTheDocument()
  })

  it('[E4.11][AC51] a file of another kind is refused with no request', async () => {
    replaceAnswers()
    renderMedia()

    await userEvent.click(await screen.findByRole('button', { name: 'Kapellbruecke-Sunrise.JPG' }))
    await userEvent.click(within(await sheet()).getByRole('button', { name: 'Replace' }))
    await userEvent.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Choose new file' }))
    await userEvent.upload(screen.getByTestId('replace-input'), new File(['%PDF-'], 'guide.pdf', { type: 'application/pdf' }))

    await waitFor(() => expect(toasts.warning).toHaveBeenCalledWith('Not replaced: guide.pdf, Choose a file of the same kind (Photos).'))
    expect(writes()).toHaveLength(0)
  })

  it('[E4.11][AC51] a refused replacement says why', async () => {
    answerWith({ other: call => (call.path === `${base}/uploads` ? Response.json(grant) : call.path.endsWith('/replace') ? problem(409, 'media-already-retired') : new Response(null, { status: 200 })) })
    renderMedia()

    await userEvent.click(await screen.findByRole('button', { name: 'Kapellbruecke-Sunrise.JPG' }))
    await userEvent.click(within(await sheet()).getByRole('button', { name: 'Replace' }))
    await userEvent.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Choose new file' }))
    await userEvent.upload(screen.getByTestId('replace-input'), new File(['png'], 'new.png', { type: 'image/png' }))

    await waitFor(() => expect(toasts.danger).toHaveBeenCalledWith('Not replaced: Kapellbruecke-Sunrise.JPG. Try again.', { description: 'This file is retired and cannot change.' }))
  })

  it.each([
    [422, 'media-content-mismatch', 'The file is not the type its name says. Choose another file.'],
    [412, 'precondition-failed', 'Someone replaced this file while you were sending yours. Open it again and check which version is live.'],
    [409, 'media-not-ready', 'This file is still being processed. Wait until it is ready.'],
  ] as const)('[E4.11][AC51] a replacement refused with %i %s says why, not the generic message', async (status, type, description) => {
    answerWith({ other: call => (call.path === `${base}/uploads` ? Response.json(grant) : call.path.endsWith('/replace') ? problem(status, type) : new Response(null, { status: 200 })) })
    renderMedia()

    await userEvent.click(await screen.findByRole('button', { name: 'Kapellbruecke-Sunrise.JPG' }))
    await userEvent.click(within(await sheet()).getByRole('button', { name: 'Replace' }))
    await userEvent.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Choose new file' }))
    await userEvent.upload(screen.getByTestId('replace-input'), new File(['png'], 'new.png', { type: 'image/png' }))

    await waitFor(() => expect(toasts.danger).toHaveBeenCalledWith('Not replaced: Kapellbruecke-Sunrise.JPG. Try again.', { description }))
  })
})

describe('[E4.11][AC51] uploading', () => {
  const big = () => {
    const file = new File(['x'], 'huge.jpg', { type: 'image/jpeg' })

    Object.defineProperty(file, 'size', { value: 21 * 1024 * 1024 })

    return file
  }

  it('[E4.11][AC51] refuses by type and size before any request, with one toast for the refused files and one for the accepted', async () => {
    answerWith({
      other: (call) => {
        if (call.path === `${base}/uploads`)
          return Response.json({ uploadKey: `${storeId}/k.png`, url: 'https://storage.test/uploads/k', method: 'PUT', headers: {}, expiresAt: '2026-10-30T10:15:00.000Z', kind: 'image' })
        if (call.path.endsWith('/confirm'))
          return Response.json({ id: other, kind: 'image', status: 'processing', contentType: 'image/png', byteSize: 3, width: null, height: null, publicUrl: null, variants: [] }, { status: 201 })

        return new Response(null, { status: 200 })
      },
    })
    renderMedia()

    await screen.findByRole('list', { name: 'Photos' })
    await userEvent.upload(screen.getByTestId('upload-input'), [new File(['png'], 'Kapellbruecke Night.png', { type: 'image/png' }), big(), new File(['heic'], 'IMG_1.heic', { type: 'image/heic' })])

    await waitFor(() => expect(toasts.success).toHaveBeenCalledWith('1 file uploaded. It shows as processing until its sizes are built.'))
    expect(toasts.warning).toHaveBeenCalledTimes(1)
    expect(toasts.warning).toHaveBeenCalledWith('2 files refused: huge.jpg, too large (max 20 MB); IMG_1.heic, type not accepted (JPEG, PNG, WebP, MP3, M4A or PDF).')
    const requested = writes().filter(call => call.path === `${base}/uploads`)

    expect(requested).toHaveLength(1)
    expect(writes().find(call => call.path.endsWith('/confirm'))).toMatchObject({ body: { fileName: 'Kapellbruecke Night.png' } })
  })

  it('[E4.11][AC51] a PDF over 30 MB and audio over 50 MB are refused, an M4A is accepted', async () => {
    answerWith({ other: call => (call.path === `${base}/uploads` ? problem(500, 'internal-error') : new Response(null, { status: 200 })) })
    renderMedia()

    await screen.findByRole('list', { name: 'Photos' })
    const sized = (name: string, type: string, mb: number) => {
      const file = new File(['x'], name, { type })

      Object.defineProperty(file, 'size', { value: mb * 1024 * 1024 + 1 })

      return file
    }

    await userEvent.upload(screen.getByTestId('upload-input'), [sized('guide.pdf', 'application/pdf', 30), sized('talk.mp3', 'audio/mpeg', 50)])
    await waitFor(() => expect(toasts.warning).toHaveBeenCalledWith('2 files refused: guide.pdf, too large (max 30 MB); talk.mp3, too large (max 50 MB).'))
    expect(writes()).toHaveLength(0)

    await userEvent.upload(screen.getByTestId('upload-input'), new File(['m4a'], 'walk.m4a', { type: 'audio/x-m4a' }))
    await waitFor(() => expect(writes().some(call => call.path === `${base}/uploads`)).toBe(true))
    expect(writes().find(call => call.path === `${base}/uploads`)).toMatchObject({ body: { contentType: 'audio/mp4' } })
  })
})

// The German tests load the lazy German chunk and run slower than the default wait under load.
describe('[E4.11][AC51] the media library in German', () => {
  beforeEach(() => writeStored('sk.language', 'de'))

  it('[E4.11][AC51] shows the title, the tabs with their counts, the tiles and the badges in German', async () => {
    answerWith({ list: () => Response.json(page([item({ name: 'Sonnenaufgang.jpg' }), item({ id: other, name: 'Einsam.jpg', usage: { pages: 0, published: 0, drafts: 0 } })], { kinds: { image: 12, audio: 2, pdf: 1 } })) })
    renderMedia()

    const wall = await screen.findByRole('list', { name: 'Fotos' }, SLOW)

    expect(screen.getByRole('heading', { name: 'Medien' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Fotos · 12' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Audio · 2' })).toBeInTheDocument()
    expect(within(wall).getByText('Unbenutzt')).toBeInTheDocument()
    expect(screen.getByRole('searchbox', { name: 'Nach Name suchen' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Hochladen' })).toBeInTheDocument()
    expect(document.body.textContent).not.toMatch(/media\.[a-z]+\.[a-z]/)
  })

  it('[E4.11][AC51] the sheet, the retire reason and the replace dialog read in German', async () => {
    answerWith()
    renderMedia()

    await userEvent.click(await screen.findByRole('button', { name: 'Kapellbruecke-Sunrise.JPG' }, SLOW))
    const dialog = await sheet()

    expect(await within(dialog).findByText('Auf veröffentlichten Seiten (2)', undefined, SLOW)).toBeInTheDocument()
    expect(within(dialog).getByText('Nur in Entwürfen (1)')).toBeInTheDocument()
    expect(within(dialog).getByText('Geschichte · EN · Titelbild')).toBeInTheDocument()
    expect(within(dialog).getByText('Auf 3 Seiten verwendet. Entfernen Sie sie dort oder ersetzen Sie sie, bevor Sie sie ausser Dienst nehmen können.')).toBeInTheDocument()
    expect(within(dialog).getByRole('button', { name: 'Ersetzen' })).toBeInTheDocument()
    await userEvent.click(within(dialog).getByRole('button', { name: 'Ersetzen' }))

    expect(await screen.findByText('Jede Seite, die sie verwendet, zeigt die neue Datei: 2 veröffentlicht und 1 nur in Entwürfen (3 insgesamt). Gäste sehen die Änderung auf den veröffentlichten Seiten sofort.')).toBeInTheDocument()
    expect(document.body.textContent).not.toMatch(/media\.[a-z]+\.[a-z]/)
  })

  it('[E4.11][AC51] upload refusals read in German', async () => {
    answerWith()
    renderMedia()

    await screen.findByRole('list', { name: 'Fotos' }, SLOW)
    await userEvent.upload(screen.getByTestId('upload-input'), new File(['heic'], 'IMG_1.heic', { type: 'image/heic' }))

    await waitFor(() => expect(toasts.warning).toHaveBeenCalledWith('1 Datei abgelehnt: IMG_1.heic, Typ nicht akzeptiert (JPEG, PNG, WebP, MP3, M4A oder PDF).'))
  })
})
