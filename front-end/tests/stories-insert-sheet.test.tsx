import type { MediaNodeInput } from '@/features/stories/lib/media-block'

import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { InsertSheet } from '@/features/stories/components/insert-sheet'
import { libraryItem, photoId, renderWithStore, secondPhotoId, serveMedia, setUpStoryMedia, storeId } from './stories-media-harness'

vi.hoisted(() => vi.stubEnv('VITE_API_ENABLED', 'true'))

const AUDIO = '0198a000-0000-7000-8000-0000000000a1'

beforeEach(async () => {
  await setUpStoryMedia()
  serveMedia([
    libraryItem({ name: 'Ready.JPG', alt: { en: 'The Chapel Bridge at sunrise' } }),
    libraryItem({ id: secondPhotoId, name: 'Busy.JPG', status: 'processing' }),
    libraryItem({ id: AUDIO, kind: 'audio', name: 'Rathaus-Glocken.mp3', contentType: 'audio/mpeg', variants: [], width: null, height: null, alt: { en: 'Town hall bells' } }),
  ])
})

function renderSheet(over: Partial<Parameters<typeof InsertSheet>[0]> = {}) {
  const inserted: MediaNodeInput[] = []
  const onClose = vi.fn()
  const onInsert = vi.fn((node: MediaNodeInput) => {
    inserted.push(node)

    return true
  })

  renderWithStore(<InsertSheet firstTab="image" getMediaCount={() => 0} isOpen language="en" storeId={storeId} onClose={onClose} onInsert={onInsert} {...over} />)

  return { inserted, onClose, onInsert }
}

const done = (name: string) => screen.getByRole('button', { name })

describe('[E4.3][AC45] the Insert sheet', () => {
  it('[E4.3][AC45] AC-1 choosing a ready photo and pressing Insert photo calls onInsert with an image node holding the library id and the library description as alt', async () => {
    const { inserted, onClose } = renderSheet()

    expect(done('Insert photo')).toBeDisabled()
    await userEvent.click(await screen.findByRole('checkbox', { name: 'Ready.JPG' }))
    await userEvent.click(done('Insert photo'))
    expect(inserted).toEqual([{ type: 'image', attrs: { mediaId: photoId, alt: 'The Chapel Bridge at sunrise', caption: '' } }])
    expect(onClose).toHaveBeenCalled()
  })

  it('[E4.3][AC45] AC-1 a processing photo cannot be chosen, so Insert photo stays off', async () => {
    renderSheet()
    const busy = await screen.findByRole('checkbox', { name: 'Busy.JPG, Processing' })

    expect(busy).toBeDisabled()
    expect(done('Insert photo')).toBeDisabled()
  })

  it('[E4.3][AC45] AC-2 Insert video is off for an empty field and a Vimeo link, on for a YouTube link, and the node holds the 11-character id and the title', async () => {
    const { inserted } = renderSheet({ firstTab: 'video' })
    const field = screen.getByRole('textbox', { name: 'YouTube link' })

    expect(done('Insert video')).toBeDisabled()
    await userEvent.type(field, 'https://vimeo.com/123')
    expect(done('Insert video')).toBeDisabled()
    await userEvent.clear(field)
    await userEvent.type(field, 'https://www.youtube.com/watch?v=dQw4w9WgXcQ')
    await userEvent.type(screen.getByRole('textbox', { name: 'Title' }), 'Bells')
    await userEvent.click(done('Insert video'))
    expect(inserted).toEqual([{ type: 'video', attrs: { youtubeId: 'dQw4w9WgXcQ', title: 'Bells', caption: '' } }])
  })

  it('[E4.3][AC45] AC-3 the Recording tab opens from firstTab "audio" and inserts an audio node with the library title', async () => {
    const { inserted } = renderSheet({ firstTab: 'audio' })

    expect(screen.getByRole('tab', { name: 'Recording' })).toHaveAttribute('aria-selected', 'true')
    await userEvent.click(await screen.findByRole('button', { name: /Rathaus-Glocken\.mp3/ }))
    await userEvent.click(done('Insert recording'))
    expect(inserted).toEqual([{ type: 'audio', attrs: { mediaId: AUDIO, title: 'Town hall bells', caption: '' } }])
  })

  it('[E4.3][AC45] AC-6 with getMediaCount at 100 the sheet shows the limit message, Insert is off and onInsert is never called', async () => {
    const { onInsert } = renderSheet({ getMediaCount: () => 100 })

    expect(screen.getByText('A story holds at most 100 photos, videos and recordings. Remove one first.')).toBeInTheDocument()
    await userEvent.click(await screen.findByRole('checkbox', { name: 'Ready.JPG' }))
    expect(done('Insert photo')).toBeDisabled()
    expect(onInsert).not.toHaveBeenCalled()
  })

  it('[E4.3][AC45] AC-6 a press when onInsert answers false shows the message and keeps the sheet open', async () => {
    const onInsert = vi.fn(() => false)
    const { onClose } = renderSheet({ onInsert })

    await userEvent.click(await screen.findByRole('checkbox', { name: 'Ready.JPG' }))
    expect(screen.queryByText(/A story holds at most/)).not.toBeInTheDocument()
    await userEvent.click(done('Insert photo'))
    expect(screen.getByText('A story holds at most 100 photos, videos and recordings. Remove one first.')).toBeInTheDocument()
    expect(onClose).not.toHaveBeenCalled()
  })

  it('[E4.3][AC45] the sheet has no nested sheet: the Photo tab renders the wall inline', async () => {
    renderSheet()
    const dialog = await screen.findByRole('dialog')

    expect(await within(dialog).findByRole('checkbox', { name: 'Ready.JPG' })).toBeInTheDocument()
    expect(screen.getAllByRole('dialog')).toHaveLength(1)
  })
})
