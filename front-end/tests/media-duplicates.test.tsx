import { QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { LocaleProvider } from '@/contexts/locale-context'
import { ApiFeedbackBridge, DataClientProvider } from '@/features/data-client'
import { DemoProvider } from '@/features/demo'
import { PhotosField } from '@/features/media/components/photos-field'
import { findDuplicates, sha256Hex } from '@/features/media/lib/duplicates'
import { photoId, media as readyMedia, setUpHarness, state, storeId } from './keepsakes-harness'
import { item as libraryItem, page as libraryPage, renderMedia } from './media-harness'

vi.hoisted(() => vi.stubEnv('VITE_API_ENABLED', 'true'))

const toasts = vi.hoisted(() => ({ success: vi.fn(), danger: vi.fn(), warning: vi.fn(), info: vi.fn() }))

vi.mock('@heroui/react', async (original) => {
  const actual = await original<typeof import('@heroui/react')>()

  return { ...actual, toast: Object.assign(vi.fn(), toasts) }
})

const base = `/api/store/${storeId}/media`
const grant = { uploadKey: 'k/u.jpg', url: 'https://storage.test/uploads/k/u.jpg', method: 'PUT', headers: { 'Content-Type': 'image/jpeg' }, expiresAt: '2026-10-30T09:00:00.000Z', kind: 'image' }
const id = (n: number) => `0198a000-0000-7000-8000-0000000000${(n + 16).toString(16).padStart(2, '0')}`
const existingId = id(90)
const SLOW = { timeout: 8000 }

// The SHA-256 of the three bytes "abc", the standard test vector.
const ABC_HASH = 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad'
const file = (name: string, bytes = 'abc', type = 'image/jpeg') => new File([bytes], name, { type })

/** A ready library photo with these bytes, as the lookup answers it. */
async function matchOf(source: File, over: Record<string, unknown> = {}) {
  return { ...readyMedia, id: existingId, name: 'Kapellbruecke-Sunrise.JPG', sha256: await sha256Hex(source), ...over }
}

let lookups: { sha256: string[] }[]
let known: Record<string, unknown>[]

/** The library holds `known`; the lookup answers the ones whose hash was asked; uploads succeed with a new id each. */
function serve({ failLookup = false } = {}) {
  let confirmed = 0

  state.answer = (call) => {
    if (call.path === `${base}/lookup` && failLookup)
      return Response.json({ type: 'internal-error', title: 'Something went wrong' }, { status: 500 })
    if (call.path === `${base}/lookup`) {
      const body = call.body as { sha256: string[] }

      lookups.push(body)

      return Response.json({ items: known.filter(match => body.sha256.includes(match.sha256 as string)) })
    }
    if (call.path === `${base}/uploads`)
      return Response.json(grant)
    if (call.method === 'PUT')
      return new Response(null, { status: 200 })
    if (call.path === `${base}/confirm`) {
      confirmed += 1

      return Response.json({ ...readyMedia, id: id(confirmed), name: `photo-${confirmed}.jpg`, status: 'processing', publicUrl: null, variants: [] }, { status: 201 })
    }
    if (call.method === 'GET' && call.path.startsWith(`${base}/`)) {
      const mediaId = call.path.split('/').at(-1)!

      return Response.json({ ...readyMedia, id: mediaId, name: mediaId === existingId ? 'Kapellbruecke-Sunrise.JPG' : `photo-${Number.parseInt(mediaId.slice(-2), 16) - 16}.jpg` })
    }

    return undefined
  }
}

const requests = (path: string) => state.calls.filter(call => call.path === path)

beforeEach(async () => {
  window.scrollTo = vi.fn()
  HTMLElement.prototype.setPointerCapture = vi.fn()
  HTMLElement.prototype.releasePointerCapture = vi.fn()
  vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:file')
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
  Object.values(toasts).forEach(mock => mock.mockClear())
  lookups = []
  known = []
  await setUpHarness()
  serve()
})

afterEach(() => vi.restoreAllMocks())

describe('[AC-dup] hashing and the one lookup', () => {
  it('[AC-dup] the SHA-256 of a file is the hex digest of its bytes', async () => {
    expect(await sha256Hex(file('IMG_0001.jpg'))).toBe(ABC_HASH)
    expect(await sha256Hex(file('other-name.png', 'abc'))).toBe(ABC_HASH)
    expect(await sha256Hex(file('IMG_0001.jpg', 'abd'))).not.toBe(ABC_HASH)
  })

  it('[AC-dup] several files make one lookup with each distinct hash once, and a match is found whatever the names', async () => {
    const asked: string[][] = []
    const picked = [file('IMG_0001.jpg', 'a'), file('IMG_0002.jpg', 'b'), file('copy-of-a.jpg', 'a')]
    const hashA = await sha256Hex(picked[0]!)
    const lookup = async (sha256: string[]) => {
      asked.push(sha256)

      return [{ ...(await matchOf(picked[0]!)), sha256: hashA! }] as never
    }

    const found = await findDuplicates(picked, lookup)

    expect(asked).toHaveLength(1)
    expect(asked[0]).toHaveLength(2)
    expect(found.map(entry => entry.file.name)).toEqual(['IMG_0001.jpg', 'copy-of-a.jpg'])
  })

  it('[AC-dup] no lookup is made without a file, and a failing lookup finds nothing so the upload goes on', async () => {
    const lookup = vi.fn(async () => {
      throw new Error('offline')
    })

    expect(await findDuplicates([], lookup)).toEqual([])
    expect(lookup).not.toHaveBeenCalled()
    expect(await findDuplicates([file('a.jpg')], lookup)).toEqual([])
    expect(await findDuplicates([file('a.jpg')], async () => ({}) as never)).toEqual([])
  })
})

let added: string[]

/** The block with the caller's state, as the keepsake and place editors keep it. */
function Host({ initial = [] }: { initial?: string[] }) {
  const [ids, setIds] = useState(initial)

  return (
    <PhotosField
      emptyText="Nothing yet."
      ids={ids}
      max={12}
      storeId={storeId}
      onAdd={(mediaId) => {
        added.push(mediaId)
        setIds(current => [...current, mediaId])
      }}
      onChange={setIds}
    />
  )
}

function renderHost(initial: string[] = []) {
  added = []
  render(
    <QueryClientProvider client={state.demo.queryClient}>
      <DataClientProvider client={state.demo.dataClient}>
        <LocaleProvider>
          <ApiFeedbackBridge feedback={state.demo.feedback} />
          <DemoProvider store={state.demo.store}>
            <Host initial={initial} />
          </DemoProvider>
        </LocaleProvider>
      </DataClientProvider>
    </QueryClientProvider>,
  )
}

const input = () => screen.getByTestId('photo-input')
const dialog = () => screen.findByRole('dialog', undefined, SLOW)
const rows = () => within(screen.getByRole('list', { name: 'Photos, in order' })).getAllByRole('listitem')
const names = () => rows().map(row => row.querySelector('[title]')!.textContent)

describe('[AC-dup] the photos block asks before it uploads a duplicate', () => {
  it('[AC-dup] new files upload with no question, one lookup for all of them, and the same name with other content is no duplicate', async () => {
    known = [await matchOf(file('IMG_0001.jpg', 'something else'))]
    renderHost()
    await userEvent.upload(input(), [file('IMG_0001.jpg', 'a'), file('IMG_0002.jpg', 'b'), file('IMG_0003.jpg', 'c')])

    await waitFor(() => expect(names()).toEqual(['photo-1.jpg', 'photo-2.jpg', 'photo-3.jpg']), SLOW)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(lookups).toHaveLength(1)
    expect(lookups[0]!.sha256).toHaveLength(3)
    expect(requests(`${base}/uploads`)).toHaveLength(3)
  })

  it('[AC-dup] a file the library has asks first: the existing photo is the default, it is added and nothing is uploaded', async () => {
    const picked = file('IMG_0001.jpg')

    known = [await matchOf(picked)]
    renderHost()
    await userEvent.upload(input(), picked)

    const sheet = await dialog()

    expect(within(sheet).getByText('Already in your library')).toBeInTheDocument()
    expect(within(sheet).getByText('Kapellbruecke-Sunrise.JPG')).toBeInTheDocument()
    expect(within(sheet).getByText('You picked: IMG_0001.jpg')).toBeInTheDocument()
    expect(within(sheet).getByRole('radio', { name: 'Use the existing photo' })).toBeChecked()
    expect(requests(`${base}/uploads`)).toHaveLength(0)
    await userEvent.click(within(sheet).getByRole('button', { name: 'Continue' }))

    await waitFor(() => expect(names()).toEqual(['Kapellbruecke-Sunrise.JPG']), SLOW)
    expect(added).toEqual([existingId])
    expect(requests(`${base}/uploads`)).toHaveLength(0)
    expect(state.calls.some(call => call.method === 'PUT')).toBe(false)
  })

  it('[AC-dup] Upload a copy uploads the file as it does today', async () => {
    const picked = file('IMG_0001.jpg')

    known = [await matchOf(picked)]
    renderHost()
    await userEvent.upload(input(), picked)
    const sheet = await dialog()

    await userEvent.click(within(sheet).getByRole('radio', { name: 'Upload a copy' }))
    await userEvent.click(within(sheet).getByRole('button', { name: 'Continue' }))

    await waitFor(() => expect(names()).toEqual(['photo-1.jpg']), SLOW)
    expect(added).toEqual([id(1)])
    expect(requests(`${base}/uploads`)).toHaveLength(1)
  })

  it('[AC-dup] a mixed pick: the new file uploads, the duplicate uses the existing photo, with one question', async () => {
    const duplicate = file('IMG_0001.jpg', 'a')

    known = [await matchOf(duplicate)]
    renderHost()
    await userEvent.upload(input(), [file('IMG_0002.jpg', 'b'), duplicate])
    const sheet = await dialog()

    expect(within(sheet).getAllByRole('listitem')).toHaveLength(1)
    await userEvent.click(within(sheet).getByRole('button', { name: 'Continue' }))

    await waitFor(() => expect(names()).toHaveLength(2), SLOW)
    expect(new Set(added)).toEqual(new Set([id(1), existingId]))
    expect(requests(`${base}/uploads`)).toHaveLength(1)
    expect(lookups).toHaveLength(1)
  })

  it('[AC-dup] two duplicates: a choice for each, or one for all', async () => {
    const first = file('IMG_0001.jpg', 'a')
    const second = file('IMG_0002.jpg', 'b')

    known = [await matchOf(first), await matchOf(second, { id: id(91), name: 'Pilatus.JPG' })]
    renderHost()
    await userEvent.upload(input(), [first, second])
    const sheet = await dialog()

    expect(within(sheet).getByText('2 of the photos you picked are already in your library. Use the existing ones, or upload them again as copies?')).toBeInTheDocument()
    expect(within(sheet).getAllByRole('radio', { name: 'Use the existing photo' })).toHaveLength(2)
    await userEvent.click(within(sheet).getAllByRole('radio', { name: 'Upload a copy' })[1]!)
    expect(within(sheet).getAllByRole('radio', { name: 'Use the existing photo' })[0]).toBeChecked()
    await userEvent.click(within(sheet).getByRole('button', { name: 'Upload all as copies' }))
    expect(within(sheet).getAllByRole('radio', { name: 'Upload a copy' })[0]).toBeChecked()
    await userEvent.click(within(sheet).getByRole('button', { name: 'Use the existing ones' }))
    await userEvent.click(within(sheet).getAllByRole('radio', { name: 'Upload a copy' })[0]!)
    await userEvent.click(within(sheet).getByRole('button', { name: 'Continue' }))

    await waitFor(() => expect(names()).toHaveLength(2), SLOW)
    expect(new Set(added)).toEqual(new Set([id(1), id(91)]))
    expect(requests(`${base}/uploads`)).toHaveLength(1)
  })

  it('[AC-dup] Cancel adds and uploads nothing, new files of the pick included', async () => {
    const duplicate = file('IMG_0001.jpg', 'a')

    known = [await matchOf(duplicate)]
    renderHost()
    await userEvent.upload(input(), [file('IMG_0002.jpg', 'b'), duplicate])
    await userEvent.click(within(await dialog()).getByRole('button', { name: 'Cancel' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(screen.getByText('Nothing yet.')).toBeInTheDocument()
    expect(added).toEqual([])
    expect(requests(`${base}/uploads`)).toHaveLength(0)
  })

  it('[AC-dup] a photo that is already on the page is not added twice', async () => {
    const picked = file('IMG_0001.jpg')

    known = [await matchOf(picked, { id: photoId })]
    renderHost([photoId])
    await userEvent.upload(input(), picked)
    await userEvent.click(within(await dialog()).getByRole('button', { name: 'Continue' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(added).toEqual([])
    expect(names()).toHaveLength(1)
  })

  it('[AC-dup] a lookup that fails does not block the upload', async () => {
    serve({ failLookup: true })
    renderHost()
    await userEvent.upload(input(), file('IMG_0001.jpg'))

    await waitFor(() => expect(names()).toEqual(['photo-1.jpg']), SLOW)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})

describe('[AC-dup] the library sheet asks before it uploads a duplicate', () => {
  it('[AC-dup] Upload a photo in the sheet with a file the library has: Use the existing photo chooses it, nothing is uploaded', async () => {
    const picked = file('IMG_0001.jpg')
    const existing = await matchOf(picked)
    const answer = state.answer

    known = [existing]
    state.answer = call => (call.method === 'GET' && call.path.startsWith(`${base}?`) ? Response.json(libraryPage([libraryItem({ id: existingId, name: 'Kapellbruecke-Sunrise.JPG' })])) : answer(call))
    renderHost()
    await userEvent.click(screen.getByRole('button', { name: 'Choose from library' }))
    await userEvent.upload(await screen.findByTestId('picker-input'), picked)

    const sheet = await screen.findByRole('dialog', { name: 'Already in your library' }, SLOW)

    await userEvent.click(within(sheet).getByRole('button', { name: 'Continue' }))
    await waitFor(() => expect(screen.getByRole('checkbox', { name: 'Kapellbruecke-Sunrise.JPG' })).toBeChecked(), SLOW)
    expect(requests(`${base}/uploads`)).toHaveLength(0)
    await userEvent.click(screen.getByRole('button', { name: 'Add selected' }))
    await waitFor(() => expect(added).toEqual([existingId]))
  })
})

describe('[AC-dup] the Media library upload asks before it uploads a duplicate', () => {
  const answerLibrary = (matches: Record<string, unknown>[]) => {
    state.answer = (call) => {
      if (call.path === `${base}/lookup`) {
        const body = call.body as { sha256: string[] }

        lookups.push(body)

        return Response.json({ items: matches.filter(match => body.sha256.includes(match.sha256 as string)) })
      }
      if (call.method === 'GET' && call.path.startsWith(`${base}?`))
        return Response.json(libraryPage([libraryItem()]))
      if (call.path === `${base}/uploads`)
        return Response.json(grant)
      if (call.method === 'PUT')
        return new Response(null, { status: 200 })
      if (call.path === `${base}/confirm`)
        return Response.json({ id: id(1), kind: 'image', status: 'processing', contentType: 'image/jpeg', byteSize: 3, width: null, height: null, publicUrl: null, variants: [], name: 'x', sha256: undefined }, { status: 201 })

      return undefined
    }
  }

  it('[AC-dup] Use the existing photo uploads nothing, shows the existing file by searching its name, and outlines it', async () => {
    const picked = file('IMG_0001.jpg')

    answerLibrary([{ ...(await matchOf(picked)), id: photoId }])
    renderMedia()
    await screen.findByRole('list', { name: 'Photos' })
    await userEvent.upload(screen.getByTestId('upload-input'), picked)
    const sheet = await dialog()

    await userEvent.click(within(sheet).getByRole('button', { name: 'Continue' }))

    await waitFor(() => expect(toasts.info).toHaveBeenCalledWith('Already in your library, not uploaded again: Kapellbruecke-Sunrise.JPG.'), SLOW)
    expect(requests(`${base}/uploads`)).toHaveLength(0)
    await waitFor(() => expect(state.calls.some(call => call.method === 'GET' && call.path.includes(`${base}?`) && call.path.includes('q=Kapellbruecke-Sunrise.JPG'))).toBe(true), SLOW)
    await waitFor(() => expect(document.querySelector(`[data-media="${photoId}"] .border-accent`)).not.toBeNull())
  })

  it('[AC-dup] Upload a copy uploads it, and a new file is uploaded with no question', async () => {
    const picked = file('IMG_0001.jpg')

    answerLibrary([{ ...(await matchOf(picked)), id: photoId }])
    renderMedia()
    await screen.findByRole('list', { name: 'Photos' })
    await userEvent.upload(screen.getByTestId('upload-input'), file('IMG_0002.jpg', 'new bytes'))
    await waitFor(() => expect(requests(`${base}/uploads`)).toHaveLength(1), SLOW)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    await userEvent.upload(screen.getByTestId('upload-input'), picked)
    const sheet = await dialog()

    await userEvent.click(within(sheet).getByRole('radio', { name: 'Upload a copy' }))
    await userEvent.click(within(sheet).getByRole('button', { name: 'Continue' }))

    await waitFor(() => expect(requests(`${base}/uploads`)).toHaveLength(2), SLOW)
    expect(toasts.info).not.toHaveBeenCalled()
  })
})
