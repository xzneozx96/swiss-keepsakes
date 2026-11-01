import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { LocaleProvider } from '@/contexts/locale-context'
import { LinksCard, RelatedCard } from '@/features/content/merchant/components/article-links'

type Editor = Parameters<typeof LinksCard>[0]['editor']

const story = { slug: 's', title: 'A story', photo: null }
const editor = (items: unknown[]) => ({ links: { items, isFull: false, move: vi.fn(), remove: vi.fn() }, related: { items, isFull: false, move: vi.fn(), remove: vi.fn() }, form: { links: items, related: items } }) as unknown as Editor

function renderCards(items: unknown[], onAdd = vi.fn()) {
  render(
    <LocaleProvider>
      <LinksCard editor={editor(items)} onAdd={onAdd} />
      <RelatedCard editor={editor(items)} languageName="English" onAdd={onAdd} />
    </LocaleProvider>,
  )

  return onAdd
}

describe('article links and related stories: empty states', () => {
  it('with nothing chosen each card shows its empty state with the one Add action', async () => {
    const onAdd = renderCards([])

    expect(screen.getAllByRole('button')).toHaveLength(2)
    await userEvent.click(screen.getByRole('button', { name: 'Add keepsake or tour' }))
    await userEvent.click(screen.getByRole('button', { name: 'Add story' }))
    expect(onAdd).toHaveBeenCalledTimes(2)
  })

  it('once something is chosen the empty text is gone and the Add button stays under the list', () => {
    renderCards([{ ...story, link: { kind: 'tour', id: 't' }, name: 'A tour', meta: '', photo: null }])

    expect(screen.queryByText(/No keepsakes or tours linked/)).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Add keepsake or tour' })).toBeInTheDocument()
  })
})
