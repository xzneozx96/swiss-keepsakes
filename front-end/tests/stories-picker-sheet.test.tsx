import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { LinkedRowsSkeleton } from '@/features/stories/components/linked-rows-skeleton'
import { PickerSheet } from '@/features/stories/components/picker-sheet'
import { renderWithStore, setUpStoryMedia } from './stories-media-harness'

vi.hoisted(() => vi.stubEnv('VITE_API_ENABLED', 'true'))

beforeEach(setUpStoryMedia)

describe('[E4.3][AC33] the shared picker sheet and row skeleton', () => {
  it('[E4.3][AC33] the done button runs onDone and Cancel runs onClose', async () => {
    const onDone = vi.fn()
    const onClose = vi.fn()

    renderWithStore(
      <PickerSheet doneLabel="Save 2 of 3" title="Choose" onClose={onClose} onDone={onDone}>
        <p>Body</p>
      </PickerSheet>,
    )

    await userEvent.click(await screen.findByRole('button', { name: 'Save 2 of 3' }))
    expect(onDone).toHaveBeenCalledOnce()
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('[E4.3][AC33] the skeleton renders the asked number of rows and is hidden from a screen reader', () => {
    const { container } = renderWithStore(<LinkedRowsSkeleton count={3} />)

    expect(container.querySelectorAll('li')).toHaveLength(3)
    expect(container.querySelector('ul')).toHaveAttribute('aria-hidden', 'true')
  })
})
