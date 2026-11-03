import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { ListAction, ListHeader, ListSearch, ListToolbar } from '@/components/layout/list-toolbar'
import { LocaleProvider } from '@/contexts/locale-context'

describe('listToolbar', () => {
  it('puts the start slot left and the search right from 1024 px, and stacks them on phones with the filters first', () => {
    render(<ListToolbar search={<input aria-label="Find" />} filters={<button type="button">Filters</button>} />)

    const toolbar = screen.getByTestId('list-toolbar')
    const tabs = screen.getByRole('button', { name: 'Filters' })
    const find = screen.getByRole('textbox', { name: 'Find' })

    expect(toolbar).toHaveClass('max-lg:contents', 'lg:flex', 'lg:items-center', 'lg:justify-between')
    expect(tabs.compareDocumentPosition(find) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(find.parentElement).toHaveClass('w-full', 'lg:w-80', 'lg:ms-auto')
    expect(tabs.parentElement).toHaveClass('max-lg:contents')
    expect(tabs.parentElement).not.toHaveClass('lg:ms-auto')
  })

  it('with tabs and filters makes two lines: the tabs alone, then the filters at the left and the search at the right, in that DOM order', () => {
    render(<ListToolbar filters={<button type="button">Filters</button>} search={<input aria-label="Find" />} tabs={<div role="tablist">Tabs</div>} />)

    const toolbar = screen.getByTestId('list-toolbar')
    const tabs = screen.getByRole('tablist')
    const filters = screen.getByRole('button', { name: 'Filters' })
    const find = screen.getByRole('textbox', { name: 'Find' })
    const line = filters.closest('[data-testid="list-toolbar-line"]')

    expect(toolbar).toHaveClass('max-lg:contents', 'lg:flex', 'lg:flex-col')
    expect(line).toHaveClass('lg:flex', 'lg:items-center', 'lg:justify-between')
    expect(line).toContainElement(find)
    expect(line).not.toContainElement(tabs)
    expect(tabs.compareDocumentPosition(filters) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(filters.compareDocumentPosition(find) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('with tabs only, or filters only, keeps one line with the tabs or filters at the left', () => {
    const { rerender } = render(<ListToolbar search={<input aria-label="Find" />} tabs={<div role="tablist">Tabs</div>} />)

    expect(screen.getByTestId('list-toolbar')).toHaveClass('lg:flex', 'lg:items-center', 'lg:justify-between')
    expect(screen.queryByTestId('list-toolbar-line')).not.toBeInTheDocument()
    expect(screen.getByTestId('list-toolbar')).toContainElement(screen.getByRole('tablist'))
    rerender(<ListToolbar filters={<button type="button">Filters</button>} search={<input aria-label="Find" />} />)
    expect(screen.getByTestId('list-toolbar')).not.toHaveClass('lg:flex-col')
    expect(screen.queryByTestId('list-toolbar-line')).not.toBeInTheDocument()
  })

  it('keeps the search at the right when there is no start slot, and renders nothing for an empty toolbar', () => {
    const { rerender } = render(<ListToolbar search={<input aria-label="Find" />} />)

    expect(screen.getByRole('textbox', { name: 'Find' }).parentElement).toHaveClass('lg:ms-auto')
    rerender(<ListToolbar />)
    expect(screen.queryByTestId('list-toolbar')).not.toBeInTheDocument()
  })

  it('draws the shared search field with its label and reports typing', () => {
    render(<ListSearch label="Search things" value="abc" onChange={() => undefined} />)

    expect(screen.getByRole('searchbox', { name: 'Search things' })).toHaveValue('abc')
  })
})

describe('listHeader and ListAction', () => {
  it('shows the title, the intro and the action, and stacks them on phones with a full-width action', () => {
    render(
      <LocaleProvider>
        <ListHeader action={<ListAction onPress={() => undefined}>Add thing</ListAction>} description="Intro" title="Things" />
      </LocaleProvider>,
    )

    expect(screen.getByRole('heading', { level: 1, name: 'Things' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Add thing' })).toHaveClass('shrink-0', 'max-lg:h-11', 'max-lg:w-full')
    expect(screen.getByText('Intro').parentElement?.parentElement).toHaveClass('max-lg:flex-col', 'max-lg:items-stretch')
  })
})
