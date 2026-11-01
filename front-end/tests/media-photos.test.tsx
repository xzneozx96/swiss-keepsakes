import { QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { LocaleProvider } from '@/contexts/locale-context'
import { ApiFeedbackBridge, DataClientProvider } from '@/features/data-client'
import { DemoProvider } from '@/features/demo'
import { PhotosField } from '@/features/media/components/photos-field'
import { writeStored } from '@/lib/storage'
import { photoId, problem, media as readyMedia, setUpHarness, state, storeId } from './keepsakes-harness'
import { item as libraryItem, page as libraryPage } from './media-harness'

vi.hoisted(() => vi.stubEnv('VITE_API_ENABLED', 'true'))

const grant = { uploadKey: 'k/u.jpg', url: 'https://storage.test/uploads/k/u.jpg', method: 'PUT', headers: { 'Content-Type': 'image/jpeg' }, expiresAt: '2026-10-30T09:00:00.000Z', kind: 'image' }
const id = (n: number) => `0198a000-0000-7000-8000-0000000000${(n + 16).toString(16).padStart(2, '0')}`
/** The library name the test server gives a file: photo-1.jpg for id(1). */
const nameOf = (mediaId: string) => `photo-${Number.parseInt(mediaId.slice(-2), 16) - 16}.jpg`
const processing = (mediaId: string) => ({ ...readyMedia, id: mediaId, name: nameOf(mediaId), status: 'processing', publicUrl: null, variants: [] })

let changes: string[][]
let added: string[]
let release: () => void
let hold: Promise<void> | undefined

afterEach(() => vi.restoreAllMocks())

/** The block with the caller's state, as the keepsake and place editors keep it. */
function Host({ initial = [], max = 12, showError = false }: { initial?: string[], max?: number, showError?: boolean }) {
  const [ids, setIds] = useState(initial)

  return (
    <PhotosField
      emptyText="Nothing yet."
      ids={ids}
      max={max}
      showError={showError}
      storeId={storeId}
      onAdd={(mediaId) => {
        added.push(mediaId)
        setIds(current => [...current, mediaId])
      }}
      onChange={(next) => {
        changes.push(next)
        setIds(next)
      }}
    />
  )
}

function renderHost(props: Parameters<typeof Host>[0] = {}) {
  render(
    <QueryClientProvider client={state.demo.queryClient}>
      <DataClientProvider client={state.demo.dataClient}>
        <LocaleProvider>
          <ApiFeedbackBridge feedback={state.demo.feedback} />
          <DemoProvider store={state.demo.store}>
            <Host {...props} />
          </DemoProvider>
        </LocaleProvider>
      </DataClientProvider>
    </QueryClientProvider>,
  )
}

/** Uploads succeed, one new media id per confirm, ready at the first read, unless the test says otherwise. */
function serveUploads(over: (call: (typeof state.calls)[number]) => Response | undefined = () => undefined) {
  let confirmed = 0

  state.answer = (call) => {
    const custom = over(call)

    if (custom)
      return custom
    if (call.path === `/api/store/${storeId}/media/uploads`)
      return Response.json(grant)
    if (call.method === 'PUT')
      return new Response(null, { status: 200 })
    if (call.path === `/api/store/${storeId}/media/confirm`) {
      confirmed += 1

      return Response.json(processing(id(confirmed)), { status: 201 })
    }
    if (call.method === 'GET' && call.path.startsWith(`/api/store/${storeId}/media/`)) {
      const mediaId = call.path.split('/').at(-1)!

      return Response.json({ ...readyMedia, id: mediaId, name: nameOf(mediaId) })
    }

    return undefined
  }
}

beforeEach(async () => {
  window.scrollTo = vi.fn()
  HTMLElement.prototype.setPointerCapture = vi.fn()
  HTMLElement.prototype.releasePointerCapture = vi.fn()
  vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:file')
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
  changes = []
  added = []
  hold = undefined
  release = () => {}
  await setUpHarness()
  serveUploads()
})

const file = (name: string, type = 'image/jpeg') => new File(['abc'], name, { type })
const input = () => screen.getByTestId('photo-input')
const pendingRows = () => within(screen.getByRole('list', { name: 'Photos being added' })).getAllByRole('listitem')
const rows = () => within(screen.getByRole('list', { name: 'Photos, in order' })).getAllByRole('listitem')
const names = () => rows().map(row => row.querySelector('[title]')!.textContent)

describe('[T-002] the shared photos block', () => {
  it('[T-002][AC-1] several files in one choice: a row for each at once, each becomes a photo, the first is the cover', async () => {
    serveUploads(call => (call.path === `/api/store/${storeId}/media/uploads` && hold ? hold.then(() => Response.json(grant)) as never : undefined))
    renderHost()
    expect(screen.getByText('Nothing yet.')).toBeInTheDocument()
    hold = new Promise<void>((resolve) => {
      release = resolve
    })
    await userEvent.upload(input(), [file('a.jpg'), file('b.jpg'), file('c.jpg')])

    expect(pendingRows().map(row => row.querySelector('[title]')!.textContent)).toEqual(['a.jpg', 'b.jpg', 'c.jpg'])
    expect(screen.getAllByText('Uploading…')).toHaveLength(3)
    expect(screen.queryByText('Nothing yet.')).not.toBeInTheDocument()
    release()

    await waitFor(() => expect(names()).toEqual(['photo-1.jpg', 'photo-2.jpg', 'photo-3.jpg']))
    expect(added).toHaveLength(3)
    expect(rows()[0]).toHaveTextContent('Cover')
    expect(screen.getAllByText('Cover')).toHaveLength(1)
    expect(screen.queryByRole('list', { name: 'Photos being added' })).not.toBeInTheDocument()
  })

  it('[T-002][AC-2] one of three files fails: its row stays with Retry and Remove, the other two are photos', async () => {
    let uploads = 0

    serveUploads((call) => {
      if (call.path === `/api/store/${storeId}/media/uploads`) {
        uploads += 1

        return uploads === 2 ? problem(503, 'storage-unavailable') : Response.json(grant)
      }

      return undefined
    })
    renderHost()
    await userEvent.upload(input(), [file('a.jpg'), file('b.jpg'), file('c.jpg')])

    await waitFor(() => expect(names()).toHaveLength(2))
    const [row] = pendingRows()

    expect(row).toHaveTextContent('b.jpg')
    expect(row).toHaveTextContent('Upload failed')
    expect(within(row!).getByRole('button', { name: 'Remove b.jpg' })).toBeInTheDocument()
    expect(added).toHaveLength(2)
    await userEvent.click(within(row!).getByRole('button', { name: 'Retry uploading b.jpg' }))

    await waitFor(() => expect(names()).toHaveLength(3))
    expect(added).toHaveLength(3)
    expect(screen.queryByRole('list', { name: 'Photos being added' })).not.toBeInTheDocument()
  })

  it('[T-002][AC-3] a PDF is refused in words before any request, and nothing is added', async () => {
    renderHost()
    await userEvent.upload(input(), file('doc.pdf', 'application/pdf'), { applyAccept: false })

    const [row] = pendingRows()

    expect(row).toHaveTextContent('doc.pdf')
    expect(row).toHaveTextContent('This type of file is not allowed. Use a JPEG, PNG or WebP photo.')
    expect(state.calls.some(call => call.path.includes('/media/'))).toBe(false)
    expect(added).toEqual([])
  })

  it('[T-002][AC-3] a photo above the size limit is refused in words before any request', async () => {
    renderHost()
    const big = file('huge.jpg')

    Object.defineProperty(big, 'size', { value: 50 * 1024 * 1024 })
    await userEvent.upload(input(), big)

    expect(pendingRows()[0]).toHaveTextContent('This photo is too large.')
    expect(state.calls.some(call => call.path.includes('/media/'))).toBe(false)
    expect(added).toEqual([])
  })

  it('[T-002][AC-3] a refusal by the server shows its reason on the row', async () => {
    serveUploads(call => (call.path === `/api/store/${storeId}/media/uploads` ? problem(422, 'media-content-mismatch') : undefined))
    renderHost()
    await userEvent.upload(input(), file('fake.jpg'))

    await waitFor(() => expect(pendingRows()[0]).toHaveTextContent('This type of file is not allowed. Use a JPEG, PNG or WebP photo.'))
    expect(added).toEqual([])
  })

  it('[T-002][AC-4] at the limit Add photo is replaced by the line that says so, and the line names the limit', () => {
    renderHost({ initial: Array.from({ length: 12 }, (_, n) => id(n)) })

    expect(screen.queryByTestId('photo-input')).not.toBeInTheDocument()
    expect(screen.getByText('Up to 12 photos: the main photo and 11 more.')).toBeInTheDocument()
  })

  it('[T-002][AC-4] the limit is an input, and a pick above the room only takes what fits', async () => {
    renderHost({ initial: [id(0), id(1)], max: 3 })
    await userEvent.upload(input(), [file('a.jpg'), file('b.jpg')])

    await waitFor(() => expect(names()).toHaveLength(3))
    expect(added).toHaveLength(1)
    expect(screen.getByText('Up to 3 photos: the main photo and 2 more.')).toBeInTheDocument()
  })

  it('[T-002][AC-5] the arrow keys on a grip move a photo, the new place is announced, Cover follows, Remove takes it off', async () => {
    renderHost({ initial: [id(0), id(1), id(2)] })
    await waitFor(() => expect(names()).toEqual(['photo-0.jpg', 'photo-1.jpg', 'photo-2.jpg']))
    screen.getByRole('button', { name: /^Move photo-2\.jpg,/ }).focus()
    await userEvent.keyboard('{ArrowUp}{ArrowUp}')

    expect(changes.at(-1)).toEqual([id(2), id(0), id(1)])
    expect(screen.getByText('photo-2.jpg moved to position 1 of 3.')).toBeInTheDocument()
    expect(rows()[0]).toHaveTextContent('Cover')
    await userEvent.click(screen.getByRole('button', { name: 'Remove photo-2.jpg' }))

    expect(changes.at(-1)).toEqual([id(0), id(1)])
    expect(names()).toEqual(['photo-0.jpg', 'photo-1.jpg'])
  })

  it('[T-002] a row says "Photo n" until the file\'s name is read, then the name, and keeps "Photo n" when the read fails', async () => {
    let open = () => {}
    const gate = new Promise<void>((resolve) => {
      open = resolve
    })

    state.answer = (call) => {
      if (call.method !== 'GET' || !call.path.includes('/media/'))
        return undefined
      const mediaId = call.path.split('/').at(-1)!

      if (mediaId === id(2))
        return problem(500, 'internal-error')

      return gate.then(() => Response.json({ ...readyMedia, id: mediaId, name: nameOf(mediaId) })) as never
    }
    renderHost({ initial: [id(0), id(1), id(2)] })

    expect(names()).toEqual(['Photo 1', 'Photo 2', 'Photo 3'])
    expect(screen.getByRole('button', { name: /^Move Photo 1,/ })).toBeInTheDocument()
    open()

    await waitFor(() => expect(names()).toEqual(['photo-0.jpg', 'photo-1.jpg', 'Photo 3']))
    expect(rows()[0]).toHaveTextContent('Cover')
    expect(rows()[0]!.querySelector('[title]')).toHaveAttribute('title', 'photo-0.jpg')
    expect(screen.getByRole('button', { name: 'Remove photo-1.jpg' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Remove Photo 3' })).toBeInTheDocument()
  })

  it('[T-002][AC-7] a photo the server is still processing is a row with a spinner and a processing note', async () => {
    state.answer = call => (call.method === 'GET' && call.path.includes('/media/') ? Response.json(processing(call.path.split('/').at(-1)!)) : undefined)
    renderHost({ initial: [photoId] })

    expect(await screen.findByText('Processing…')).toBeInTheDocument()
    expect(rows()[0]!.querySelector('.spinner')).not.toBeNull()
  })

  it('[T-002][AC-7] after a blocked publish the empty text is shown as an alert', () => {
    renderHost({ showError: true })

    expect(screen.getByRole('alert')).toHaveTextContent('Nothing yet.')
  })

  it('[T-002] says its words in German', async () => {
    writeStored('sk.language', 'de')
    renderHost({ initial: [id(0)] })

    await userEvent.upload(input(), file('doc.pdf', 'application/pdf'), { applyAccept: false })
    expect(await screen.findByText('Dieser Dateityp ist nicht erlaubt. Verwenden Sie ein JPEG-, PNG- oder WebP-Foto.')).toBeInTheDocument()
  })
})

describe('[T-002] empty state and Choose from library', () => {
  const library = [id(5), id(6), id(7)].map((mediaId, n) => libraryItem({ id: mediaId, name: `lib-${n + 1}.jpg` }))
  let listCalls: string[]

  /** The store's library: three ready photos, the upload answers of the block as they were. */
  function serveLibrary(items = library) {
    const uploads = state.answer

    listCalls = []
    state.answer = (call) => {
      if (call.method === 'GET' && call.path.startsWith(`/api/store/${storeId}/media?`)) {
        listCalls.push(call.path)

        return Response.json(libraryPage(items))
      }

      return uploads(call)
    }
  }
  const choice = (name: string) => screen.findByRole('checkbox', { name })
  const openLibrary = () => userEvent.click(screen.getByRole('button', { name: 'Choose from library' }))
  const addSelected = () => userEvent.click(screen.getByRole('button', { name: 'Add selected' }))

  it('[T-002][AC-8] with no photo the empty state says what goes here and offers Upload photos and Choose from library; both stay once a photo exists', () => {
    renderHost()

    expect(screen.getByText('Nothing yet.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Upload photos' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Choose from library' })).toBeInTheDocument()
  })

  it('[T-002][AC-8] once a photo exists the empty text is gone and the two actions remain', () => {
    renderHost({ initial: [id(0)] })

    expect(screen.queryByText('Nothing yet.')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Upload photos' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Choose from library' })).toBeInTheDocument()
  })

  it('[T-002][AC-9] the sheet lists the library as checkboxes named by file; Add selected hands over the ids in the order chosen', async () => {
    serveLibrary()
    renderHost()
    await openLibrary()
    expect(screen.getByRole('button', { name: 'Add selected' })).toBeDisabled()
    expect(await screen.findByRole('list', { name: 'Photos in the library' })).toBeInTheDocument()

    await userEvent.click(await choice('lib-3.jpg'))
    await userEvent.click(await choice('lib-1.jpg'))
    expect(screen.getByText('2 of 12 selected')).toBeInTheDocument()
    await addSelected()

    await waitFor(() => expect(added).toEqual([id(7), id(5)]))
    await waitFor(() => expect(screen.queryByRole('checkbox', { name: 'lib-1.jpg' })).not.toBeInTheDocument())
    expect(names()).toEqual(['photo-7.jpg', 'photo-5.jpg'].map(name => name))
  })

  it('[T-002][AC-9] only the room that is left can be chosen: the other photos are disabled until one is cleared', async () => {
    serveLibrary()
    renderHost({ initial: [id(0)], max: 3 })
    await openLibrary()

    await userEvent.click(await choice('lib-1.jpg'))
    await userEvent.click(await choice('lib-2.jpg'))
    expect(screen.getByText('2 of 2 selected')).toBeInTheDocument()
    expect(await choice('lib-3.jpg')).toBeDisabled()

    await userEvent.click(await choice('lib-1.jpg'))
    expect(await choice('lib-3.jpg')).toBeEnabled()
  })

  it('[T-002][AC-9] a photo the page already has is shown as chosen and cannot be chosen twice', async () => {
    serveLibrary()
    renderHost({ initial: [id(5)] })
    await openLibrary()

    const used = await choice('lib-1.jpg, already added')

    expect(used).toBeChecked()
    expect(used).toBeDisabled()
    await userEvent.click(await choice('lib-2.jpg'))
    await addSelected()
    await waitFor(() => expect(added).toEqual([id(6)]))
  })

  it('[T-002][AC-9] a search that finds nothing says so, and an empty library says what to do', async () => {
    serveLibrary([])
    renderHost()
    await openLibrary()

    expect(await screen.findByText('No photos in the library yet. Upload some, then they show here.')).toBeInTheDocument()
    expect(listCalls.length).toBeGreaterThan(0)
  })

  it('[T-002][AC-9] says its words in German', async () => {
    writeStored('sk.language', 'de')
    serveLibrary()
    renderHost()

    expect(screen.getByRole('button', { name: 'Fotos hochladen' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Aus der Bibliothek wählen' }))
    expect(await choice('lib-1.jpg')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Auswahl hinzufügen' })).toBeInTheDocument()
  })
})
