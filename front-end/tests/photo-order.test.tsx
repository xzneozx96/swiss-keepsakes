import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'

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

const names = () => screen.getAllByRole('listitem').map(item => item.querySelector('.line-clamp-2')!.textContent)

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

  it('shows a note under a row, such as a photo that is still processing', () => {
    render(<PhotoOrder items={[{ id: 'a', name: 'Photo 1', thumbnail: <span />, note: <span className="text-xs">Processing the photo…</span> }]} labels={labels} onChange={() => {}} />)

    expect(screen.getByText('Processing the photo…')).toBeInTheDocument()
  })
})
