import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { SheetFrame } from '@/components/sheet-frame'
import { LocaleProvider } from '@/contexts/locale-context'

const view = vi.hoisted(() => ({ wide: true }))

vi.mock('@/hooks/use-is-wide', () => ({ useIsWide: () => view.wide }))

const footer = [
  <button key="save" type="button">Save</button>,
  <button key="cancel" type="button">Cancel</button>,
]

function open(path: string, props: { container?: Element, onClose?: () => void } = {}) {
  window.history.pushState({}, '', path)
  return render(
    <LocaleProvider>
      <SheetFrame isOpen footer={footer} title="Edit" onClose={() => undefined} {...props}>
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
    expect(screen.getByRole('button', { name: 'Save' }).parentElement).toHaveClass('flex-row-reverse')
    expect(screen.getByRole('dialog')).toHaveTextContent('Edit')
    expect(screen.getByText('Body')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument()
  })

  it('closes from the close button and from Escape', async () => {
    const onClose = vi.fn()

    open('/store/content/categories', { onClose })
    await userEvent.click(screen.getByRole('button', { name: 'Close' }))
    expect(onClose).toHaveBeenCalledTimes(1)
    await userEvent.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalledTimes(2)
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
