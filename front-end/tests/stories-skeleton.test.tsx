import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { StoriesSkeleton } from '@/features/content/components/stories-skeleton'

describe('[E4.4][AC30] stories loading', () => {
  it('draws a row of rounded chips, 44 px high, above the story rows', () => {
    const { container } = render(<StoriesSkeleton />)

    const chips = container.querySelectorAll('[data-skeleton="chip"]')
    expect(chips.length).toBeGreaterThanOrEqual(4)
    for (const chip of chips) {
      expect(chip.className).toContain('h-11')
      expect(chip.className).toContain('rounded-xl')
    }
    const row = container.querySelector('[data-skeleton="chips"]')!
    expect(row.compareDocumentPosition(container.querySelector('[data-skeleton="story"]')!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })
})
