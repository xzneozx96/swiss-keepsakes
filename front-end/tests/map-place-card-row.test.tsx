import type { PublicMapItem } from '@sk/api-contract'

import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { LocaleProvider } from '@/contexts/locale-context'
import { PlaceCardRow } from '@/features/map/components/place-card'
import { CARD_ROW_BOTTOM } from '@/features/map/lib/layout'

const pin: PublicMapItem = {
  id: '00000000-0000-4000-8000-000000000101',
  slug: 'chapel-bridge',
  latitude: 47.05,
  longitude: 8.3,
  title: 'Chapel Bridge',
  language: 'en',
  categoryIds: [],
  stayTag: 'both',
  interests: [],
  nextDate: null,
  hasMainStory: false,
  mainStorySlug: null,
  photoKey: null,
}

function row(bottom?: number) {
  window.HTMLElement.prototype.scrollTo = vi.fn()
  render(
    <LocaleProvider>
      <PlaceCardRow bottom={bottom} pins={[pin]} selectedId={pin.id} onClose={() => {}} onSelect={() => {}} />
    </LocaleProvider>,
  )

  return screen.getByRole('region', { name: '1 place' })
}

describe('[E4.6][AC42] the card row position', () => {
  it('clears the guest tab bar and the music button by default', () => {
    expect(row().style.bottom).toContain(`${CARD_ROW_BOTTOM}px`)
  })

  it('sits where the screen asks, for a screen without them (the place editor\'s preview)', () => {
    expect(row(29).style.bottom).toContain('29px')
  })
})
