import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { LocaleProvider } from '@/contexts/locale-context'
import { StoryHeader } from '@/features/stories/components/story-header'
import { StoryLanguageSwitch } from '@/features/stories/components/story-language-switch'
import { StoryStaleNotice } from '@/features/stories/components/story-stale-notice'

const view = vi.hoisted(() => ({ wide: false }))

vi.mock('@/hooks/use-is-wide', () => ({ useIsWide: () => view.wide }))

const save = { status: 'Saved 14:05', tone: 'success' as const }

function renderHeader(props: Partial<Parameters<typeof StoryHeader>[0]> = {}) {
  const handlers = { onBack: vi.fn(), onReview: vi.fn(), onDelete: vi.fn() }

  render(
    <LocaleProvider>
      <StoryHeader language="en" save={save} screen="write" switchNode={<span data-testid="switch">EN | DE</span>} versionState="draft" {...handlers} {...props} />
    </LocaleProvider>,
  )

  return handlers
}

function renderSwitch(props: Partial<Parameters<typeof StoryLanguageSwitch>[0]> = {}) {
  const onChange = vi.fn()

  render(
    <LocaleProvider>
      <StoryLanguageSwitch selected="en" versions={{ en: { state: 'draft' }, de: { state: 'none' } }} onChange={onChange} {...props} />
    </LocaleProvider>,
  )

  return onChange
}

describe('[E4.3][AC45] story header and switch', () => {
  it('[E4.3][AC45] the title line reads English · Draft and Deutsch · Published', () => {
    const first = renderHeader()

    expect(screen.getByText('English · Draft')).toBeInTheDocument()
    expect(first.onBack).not.toHaveBeenCalled()
    document.body.innerHTML = ''
    renderHeader({ language: 'de', versionState: 'editsNotLive' })
    expect(screen.getByText('Deutsch · Published')).toBeInTheDocument()
  })

  it('[E4.3][AC45] the save status is a polite live region with the given text', () => {
    renderHeader()

    const status = screen.getByRole('status')

    expect(status).toHaveTextContent('Saved 14:05')
    expect(status).toHaveAttribute('aria-live', 'polite')
  })

  it('[E4.3][AC45] AC-4 the switch says Published · edits not live for an edited published version', () => {
    renderSwitch({ selected: 'de', versions: { en: { state: 'draft' }, de: { state: 'editsNotLive' } } })

    expect(screen.getByText('Deutsch · Published · edits not live')).toBeInTheDocument()
  })

  it('[E4.3][AC30] AC-5 the German tab of an English-only story reads Not started and choosing it calls onChange; arrow keys alone do not', async () => {
    const onChange = renderSwitch()
    const german = screen.getByRole('tab', { name: /Deutsch/ })

    expect(german).toHaveTextContent('Not started · choose to start it')
    screen.getByRole('tab', { name: /English/ }).focus()
    await userEvent.keyboard('{ArrowRight}')
    expect(german).toHaveFocus()
    expect(onChange).not.toHaveBeenCalled()
    await userEvent.keyboard('{Enter}')
    expect(onChange).toHaveBeenCalledWith('de')
  })

  it('[E4.3][AC45] laptop shows the compact switch and Review and publish, phone shows Review and no switch in the header', () => {
    view.wide = true
    renderHeader()
    expect(screen.getByTestId('switch')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Review and publish' })).toBeInTheDocument()
    document.body.innerHTML = ''
    view.wide = false
    renderHeader()
    expect(screen.queryByTestId('switch')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Review' })).toBeInTheDocument()
  })

  it('[E4.3][AC45] Review calls onReview and Back calls onBack', async () => {
    const { onBack, onReview } = renderHeader()

    await userEvent.click(screen.getByRole('button', { name: 'Review' }))
    await userEvent.click(screen.getByRole('button', { name: 'Back to Stories' }))
    expect(onReview).toHaveBeenCalledTimes(1)
    expect(onBack).toHaveBeenCalledTimes(1)
  })

  it('[E4.3][AC45] Back is labelled Back to Stories on Write and Back to writing on Review', () => {
    renderHeader()
    expect(screen.getByRole('button', { name: 'Back to Stories' })).toBeInTheDocument()
    document.body.innerHTML = ''
    renderHeader({ screen: 'review' })
    expect(screen.getByRole('button', { name: 'Back to writing' })).toBeInTheDocument()
    expect(screen.getByText('Review and publish')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Review' })).not.toBeInTheDocument()
  })

  it('[E4.3][AC45] the stale notice is an alert with a Reload button', async () => {
    const onReload = vi.fn()

    render(
      <LocaleProvider>
        <StoryStaleNotice onReload={onReload} />
      </LocaleProvider>,
    )

    expect(screen.getByRole('alert')).toHaveTextContent(/someone saved this after you opened it/i)
    await userEvent.click(screen.getByRole('button', { name: 'Reload' }))
    expect(onReload).toHaveBeenCalledTimes(1)
  })
})
