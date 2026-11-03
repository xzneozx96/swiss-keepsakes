import { screen, within } from '@testing-library/react'
import { expect } from 'vitest'

/** The shared header and toolbar of a merchant list screen: the action in the Media style, the filters or tabs before the search. */
export function expectListChrome({ action, start, search }: { action?: HTMLElement, start?: HTMLElement, search?: HTMLElement }) {
  const toolbar = screen.getByTestId('list-toolbar')

  if (action)
    expect(action).toHaveClass('shrink-0', 'max-lg:h-11', 'max-lg:w-full')
  if (start)
    expect(toolbar).toContainElement(start)
  if (search) {
    expect(toolbar).toContainElement(search)
    expect(search.closest('.lg\\:ms-auto')).toHaveClass('lg:w-80')
  }
  if (start && search)
    expect(start.compareDocumentPosition(search) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()

  return within(toolbar)
}
