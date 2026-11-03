import type { MediaItem } from '@sk/api-contract'

import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { LocaleProvider } from '@/contexts/locale-context'
import { InsertRecording } from '@/features/stories/components/insert-recording'
import { InsertVideo } from '@/features/stories/components/insert-video'
import { libraryItem, renderWithStore, serveExtra, serveMedia, setUpStoryMedia, state, storeId } from './stories-media-harness'

vi.hoisted(() => vi.stubEnv('VITE_API_ENABLED', 'true'))

const toasts = vi.hoisted(() => ({ warning: vi.fn(), danger: vi.fn() }))

vi.mock('@heroui/react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@heroui/react')>()

  return { ...actual, toast: Object.assign(vi.fn(), toasts) }
})

const AUDIO_A = '0198a000-0000-7000-8000-0000000000a1'
const AUDIO_B = '0198a000-0000-7000-8000-0000000000a2'
const NEW_ID = '0198a000-0000-7000-8000-0000000000f2'
const grant = { uploadKey: 'k/u.mp3', url: 'https://storage.test/uploads/k/u.mp3', method: 'PUT', headers: { 'Content-Type': 'audio/mpeg' }, expiresAt: '2026-10-30T09:00:00.000Z', kind: 'audio' }
const audio = (id: string, over: Record<string, unknown> = {}) => libraryItem({ id, kind: 'audio', contentType: 'audio/mpeg', variants: [], width: null, height: null, durationSeconds: 30, name: 'Bells.mp3', alt: {}, ...over })

beforeEach(async () => {
  toasts.warning.mockClear()
  toasts.danger.mockClear()
  await setUpStoryMedia()
})

afterEach(() => vi.restoreAllMocks())

function VideoHost() {
  const [link, setLink] = useState('')
  const [title, setTitle] = useState('')

  return <InsertVideo link={link} title={title} onLink={setLink} onTitle={setTitle} />
}

describe('[E4.3][AC45] the Video panel', () => {
  it('[E4.3][AC45] AC-2 a YouTube link shows the poster and no error', async () => {
    const { container } = render(
      <LocaleProvider>
        <VideoHost />
      </LocaleProvider>,
    )

    await userEvent.type(screen.getByRole('textbox', { name: 'YouTube link' }), 'https://youtu.be/dQw4w9WgXcQ')
    expect(container.querySelector('img')).toHaveAttribute('src', 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg')
    expect(screen.queryByText(/This is not a YouTube link/)).not.toBeInTheDocument()
  })

  it('[E4.3][AC45] AC-2 a Vimeo link shows "This is not a YouTube link. Copy the address from the video’s Share button." and no poster', async () => {
    const { container } = render(
      <LocaleProvider>
        <VideoHost />
      </LocaleProvider>,
    )

    await userEvent.type(screen.getByRole('textbox', { name: 'YouTube link' }), 'https://vimeo.com/123')
    expect(screen.getByText('This is not a YouTube link. Copy the address from the video’s Share button.')).toBeInTheDocument()
    expect(container.querySelector('img')).toBeNull()
  })

  it('[E4.3][AC45] AC-2 an empty field shows the help line only', () => {
    const { container } = render(
      <LocaleProvider>
        <VideoHost />
      </LocaleProvider>,
    )

    expect(screen.getByText('YouTube only. Guests load the video when they press play.')).toBeInTheDocument()
    expect(screen.queryByText(/This is not a YouTube link/)).not.toBeInTheDocument()
    expect(container.querySelector('img')).toBeNull()
  })
})

describe('[E4.3][AC45] the Recording panel', () => {
  const chosen: Pick<MediaItem, 'id' | 'name' | 'alt'>[] = []

  function RecordingHost() {
    const [selected, setSelected] = useState<string | null>(null)

    return <InsertRecording language="en" selected={selected} storeId={storeId} onSelect={(item) => { chosen.push(item); setSelected(item.id) }} />
  }

  beforeEach(() => {
    chosen.length = 0
    serveMedia([audio(AUDIO_A, { alt: { en: 'Church bells at noon' } }), audio(AUDIO_B, { name: 'Alphorn.mp3' })])
  })

  it('[E4.3][AC45] AC-3 the Recording panel lists only the library\'s recordings (the list is asked with kind audio) and shows "Recordings you made. Never AI voices."', async () => {
    renderWithStore(<RecordingHost />)

    expect(await screen.findByRole('button', { name: /Bells\.mp3/ })).toHaveTextContent('Church bells at noon')
    expect(screen.getByText('Recordings you made. Never AI voices.')).toBeInTheDocument()
    const lists = state.calls.filter(call => call.method === 'GET' && call.path.startsWith(`/api/store/${storeId}/media?`))

    expect(lists.length).toBeGreaterThan(0)
    expect(lists.every(call => new URLSearchParams(call.path.split('?')[1]).get('kind') === 'audio')).toBe(true)
  })

  it('[E4.3][AC45] a recording with no description says No description, and a press chooses it', async () => {
    renderWithStore(<RecordingHost />)
    const row = await screen.findByRole('button', { name: /Alphorn\.mp3/ })

    expect(row).toHaveTextContent('No description')
    await userEvent.click(row)
    expect(row).toHaveAttribute('aria-pressed', 'true')
    expect(chosen).toEqual([expect.objectContaining({ id: AUDIO_B, name: 'Alphorn.mp3' })])
  })

  it('[E4.3][AC45] AC-3 uploading a recording chooses it, and a PNG is refused with a toast and no request', async () => {
    serveExtra((call) => {
      if (call.path === `/api/store/${storeId}/media/uploads`)
        return Response.json(grant)
      if (call.method === 'PUT')
        return new Response(null, { status: 200 })
      if (call.path === `/api/store/${storeId}/media/confirm`)
        return Response.json({ ...audio(NEW_ID, { name: 'new.mp3', status: 'processing', publicUrl: null }) }, { status: 201 })

      return undefined
    })
    renderWithStore(<RecordingHost />)
    await screen.findByRole('button', { name: /Alphorn\.mp3/ })
    const input = screen.getByTestId('recording-input')

    await userEvent.setup({ applyAccept: false }).upload(input, new File(['x'], 'pic.png', { type: 'image/png' }))
    await waitFor(() => expect(toasts.warning).toHaveBeenCalled())
    expect(state.calls.some(call => call.path.endsWith('/media/uploads'))).toBe(false)
    expect(chosen).toEqual([])

    await userEvent.upload(input, new File(['x'], 'new.mp3', { type: 'audio/mpeg' }))
    await waitFor(() => expect(chosen).toEqual([expect.objectContaining({ id: NEW_ID, name: 'new.mp3' })]))
  }, 15_000)
})
