import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { PhotoOrder } from '@/components/photo-order'

const labels = {
  list: 'Photos, in order',
  cover: 'Cover',
  move: (name: string, position: number, count: number) => `Move ${name}, position ${position} of ${count}`,
  moved: (name: string, position: number, count: number) => `${name} moved to ${position} of ${count}`,
  remove: (name: string) => `Remove ${name}`,
}

function Harness({ start = ['a', 'b', 'c'] }: { start?: string[] }) {
  const [ids, setIds] = useState(start)

  return <PhotoOrder items={ids.map(id => ({ id, name: `Photo ${id}`, thumbnail: <span /> }))} labels={labels} onChange={setIds} />
}

const names = () => screen.getAllByRole('listitem').map(item => item.querySelector('[title]')!.textContent)

describe('shared PhotoOrder', () => {
  it('lists the photos in order and says Cover under the first only', () => {
    render(<Harness />)

    expect(names()).toEqual(['Photo a', 'Photo b', 'Photo c'])
    expect(screen.getAllByText('Cover')).toHaveLength(1)
    expect(screen.getAllByRole('listitem')[0]).toHaveTextContent('Cover')
  })

  it('moves a photo with the arrow keys on its grip, keeps the focus on it and announces where it went', async () => {
    render(<Harness />)
    const grip = screen.getByRole('button', { name: 'Move Photo c, position 3 of 3' })

    grip.focus()
    await userEvent.keyboard('{ArrowUp}{ArrowUp}')

    expect(names()).toEqual(['Photo c', 'Photo a', 'Photo b'])
    expect(screen.getAllByRole('listitem')[0]).toHaveTextContent('Cover')
    expect(screen.getByRole('button', { name: 'Move Photo c, position 1 of 3' })).toHaveFocus()
    expect(screen.getByText('Photo c moved to 1 of 3')).toBeInTheDocument()
  })

  it('does not move the first one up or the last one down', async () => {
    render(<Harness />)

    screen.getByRole('button', { name: /Move Photo a/ }).focus()
    await userEvent.keyboard('{ArrowUp}')
    expect(names()).toEqual(['Photo a', 'Photo b', 'Photo c'])
  })

  it('removes a photo, and the next one becomes the cover', async () => {
    render(<Harness />)

    await userEvent.click(screen.getByRole('button', { name: 'Remove Photo a' }))

    expect(names()).toEqual(['Photo b', 'Photo c'])
    expect(screen.getAllByRole('listitem')[0]).toHaveTextContent('Cover')
  })

  it('truncates a long name on one line and keeps the whole name as its title', () => {
    const long = 'a-very-long-file-name-from-the-phone-gallery-2026-10-30-final-final-v2.jpeg'

    render(<PhotoOrder items={[{ id: 'a', name: long, thumbnail: <span />, note: <span /> }]} labels={labels} onChange={() => {}} />)

    expect(screen.getByText(long)).toHaveClass('truncate')
    expect(screen.getByText(long)).toHaveAttribute('title', long)
  })

  it('shows a note under a row, such as a photo that is still processing', () => {
    render(<PhotoOrder items={[{ id: 'a', name: 'Photo 1', thumbnail: <span />, note: <span className="text-xs">Processing the photo…</span> }]} labels={labels} onChange={() => {}} />)

    expect(screen.getByText('Processing the photo…')).toBeInTheDocument()
  })
})

describe('shared PhotoOrder pending rows', () => {
  const pending = (over = {}) => ({
    items: [{ id: 'p1', name: 'bridge.jpg', previewUrl: 'blob:p1', status: 'uploading' as const, label: 'Uploading…' }],
    list: 'Photos being added',
    retryText: 'Retry',
    retry: (name: string) => `Retry ${name}`,
    onRetry: () => {},
    onRemove: () => {},
    ...over,
  })

  it('shows a row after the ordered list with its picture, state and Remove, and no grip', () => {
    render(<PhotoOrder items={[{ id: 'a', name: 'Photo a', thumbnail: <span /> }]} labels={labels} pending={pending()} onChange={() => {}} />)
    const row = within(screen.getByRole('list', { name: 'Photos being added' })).getByRole('listitem')

    expect(row.querySelector('img')).toHaveAttribute('src', 'blob:p1')
    expect(row).toHaveTextContent('Uploading…')
    expect(within(row).queryByRole('button', { name: /Move/ })).not.toBeInTheDocument()
    expect(within(row).queryByRole('button', { name: /Retry/ })).not.toBeInTheDocument()
    expect(within(row).getByRole('button', { name: 'Remove bridge.jpg' })).toBeInTheDocument()
    expect(screen.getAllByText('Cover')).toHaveLength(1)
    expect(within(screen.getByRole('list', { name: 'Photos, in order' })).getAllByRole('listitem')).toHaveLength(1)
  })

  it('is never the cover: with only pending rows there is no ordered list and no Cover', () => {
    render(<PhotoOrder items={[]} labels={labels} pending={pending()} onChange={() => {}} />)

    expect(screen.queryByRole('list', { name: 'Photos, in order' })).not.toBeInTheDocument()
    expect(screen.queryByText('Cover')).not.toBeInTheDocument()
  })

  it('a failed row says so with its reason and has Retry and Remove that report the row', async () => {
    const onRetry = vi.fn()
    const onRemove = vi.fn()

    render(<PhotoOrder items={[]} labels={labels} pending={pending({ items: [{ id: 'p1', name: 'bridge.jpg', previewUrl: 'blob:p1', status: 'failed', label: 'Upload failed', detail: 'This photo is too large.' }], onRetry, onRemove })} onChange={() => {}} />)

    expect(screen.getByRole('alert')).toHaveTextContent('Upload failed')
    expect(screen.getByText('This photo is too large.')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Retry bridge.jpg' }))
    await userEvent.click(screen.getByRole('button', { name: 'Remove bridge.jpg' }))
    expect(onRetry).toHaveBeenCalledWith('p1')
    expect(onRemove).toHaveBeenCalledWith('p1')
  })
})
