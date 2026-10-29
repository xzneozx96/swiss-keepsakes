import { render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { SheetFrame } from '@/components/sheet-frame'
import { LocaleProvider } from '@/contexts/locale-context'

const view = vi.hoisted(() => ({ wide: true }))

vi.mock('@/hooks/use-is-wide', () => ({ useIsWide: () => view.wide }))

function open(path: string, props: { container?: Element } = {}) {
  window.history.pushState({}, '', path)
  return render(
    <LocaleProvider>
      <SheetFrame isOpen footer={<button type="button">Save</button>} title="Edit" onClose={() => undefined} {...props}>
        <p>Body</p>
      </SheetFrame>
    </LocaleProvider>,
  )
}

const isModal = () => document.querySelector('.modal__dialog') !== null
const isDrawer = () => document.querySelector('.drawer__dialog') !== null

beforeEach(() => {
  view.wide = true
})
afterEach(() => window.history.pushState({}, '', '/'))

describe('sheet frame', () => {
  it('opens as a centered dialog without a handle on desktop in the merchant area', () => {
    open('/store/content/categories')
    expect(isModal()).toBe(true)
    expect(isDrawer()).toBe(false)
    expect(document.querySelector('.drawer__handle')).toBeNull()
    expect(screen.getByRole('dialog')).toHaveTextContent('Edit')
    expect(screen.getByText('Body')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument()
  })

  it('does the same in the Super Admin area', () => {
    open('/admin/stores')
    expect(isModal()).toBe(true)
  })

  it('stays the bottom sheet on a phone, with its handle', () => {
    view.wide = false
    open('/store/content/categories')
    expect(isDrawer()).toBe(true)
    expect(isModal()).toBe(false)
    expect(document.querySelector('.drawer__handle')).not.toBeNull()
  })

  it('stays the bottom sheet on desktop for guest screens', () => {
    open('/en/gifts')
    expect(isDrawer()).toBe(true)
    expect(isModal()).toBe(false)
  })

  it('stays the bottom sheet when it renders inside a container (the lab phone frame)', () => {
    const frame = document.body.appendChild(document.createElement('div'))

    open('/store/content/categories', { container: frame })
    expect(isDrawer()).toBe(true)
    expect(isModal()).toBe(false)
  })
})
