import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { Block } from '@/components/form-block'
import { StepBar } from '@/components/step-bar'
import { StepLayout } from '@/components/step-layout'
import { stepsEn } from '@/components/step-messages'
import { stepsDe } from '@/components/step-messages.de'
import { loadDictionary, LocaleProvider } from '@/contexts/locale-context'
import { de } from '@/i18n/de'
import { en } from '@/i18n/en'

const steps = [
  { id: 'basics', label: 'Basics', status: 'done' as const },
  { id: 'options', label: 'Options', status: 'warning' as const },
  { id: 'review', label: 'Review', status: 'todo' as const },
]

// The tour and gift editors open a step only once it has been reached; the later ones stay disabled.
const reached = (id: string) => id !== 'review'

beforeEach(() => {
  window.localStorage.clear()
})

afterEach(() => {
  window.localStorage.clear()
})

function renderLayout(onGo = vi.fn()) {
  render(
    <LocaleProvider>
      <StepLayout canGo={reached} current="options" steps={steps} onGo={onGo}>
        <p>Step body</p>
      </StepLayout>
    </LocaleProvider>,
  )

  return onGo
}

describe('[T-001] the shared step layout', () => {
  it('lists the steps and opens only the reached ones, not the current one', async () => {
    const onGo = renderLayout()
    const list = within(screen.getByRole('navigation', { name: 'Steps' }))

    expect(list.getByRole('button', { name: '1. Basics, Done' })).toBeEnabled()
    expect(list.getByRole('button', { name: '2. Options, Needs attention' })).toBeDisabled()
    expect(list.getByRole('button', { name: '3. Review' })).toBeDisabled()
    expect(list.getByRole('button', { name: '2. Options, Needs attention' })).toHaveAttribute('aria-current', 'step')

    await userEvent.click(list.getByRole('button', { name: '1. Basics, Done' }))
    expect(onGo).toHaveBeenCalledWith('basics')
  })

  it('gives a phone the step number in the title, a progress bar and the All steps sheet', async () => {
    const onGo = renderLayout()

    expect(screen.getByRole('heading', { level: 2, name: /^Step 2 of 3\s*·\s*Options$/ })).toBeInTheDocument()
    expect(screen.getByRole('progressbar', { name: 'Progress through the steps' })).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'All steps' }))
    const sheet = await screen.findByRole('dialog')

    expect(within(sheet).getByText('Current step')).toBeInTheDocument()
    expect(within(sheet).getByRole('button', { name: /Review/ })).toBeDisabled()

    await userEvent.click(within(sheet).getByRole('button', { name: /Basics/ }))
    expect(onGo).toHaveBeenCalledWith('basics')
  })

  it('keeps the title for screen readers only from 1024px when quietTitle is set', () => {
    render(
      <LocaleProvider>
        <StepLayout quietTitle canGo={reached} current="basics" steps={steps} onGo={vi.fn()}>
          <p>Step body</p>
        </StepLayout>
      </LocaleProvider>,
    )

    expect(screen.getByRole('heading', { level: 2 })).toHaveClass('lg:sr-only')
  })

  it('speaks German: the step list, "Alle Schritte", "Schritt n von m" and the status words', async () => {
    window.localStorage.setItem('sk.language', JSON.stringify('de'))
    await loadDictionary('de')
    renderLayout()

    const list = within(screen.getByRole('navigation', { name: 'Schritte' }))

    expect(list.getByRole('button', { name: '1. Basics, Erledigt' })).toBeInTheDocument()
    expect(list.getByRole('button', { name: '2. Options, Braucht Aufmerksamkeit' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: /^Schritt 2 von 3\s*·\s*Options$/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Alle Schritte' })).toBeInTheDocument()
  })
})

describe('[T-001] the shared step bar', () => {
  function renderBar(props: Partial<Parameters<typeof StepBar>[0]> = {}) {
    const onBack = vi.fn()
    const onForward = vi.fn()
    const save = vi.fn()

    render(
      <LocaleProvider>
        <StepBar isSaving={false} primary={{ label: 'Save', onPress: save }} status="No changes" tone="muted" onBack={onBack} onForward={onForward} {...props} />
      </LocaleProvider>,
    )

    return { onBack, onForward, save }
  }

  it('shows the status text and calls Back, Next and the red action', async () => {
    const { onBack, onForward, save } = renderBar()

    expect(screen.getByRole('status')).toHaveTextContent('No changes')
    await userEvent.click(screen.getByRole('button', { name: 'Previous step' }))
    await userEvent.click(screen.getByRole('button', { name: 'Next' }))
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(onBack).toHaveBeenCalledOnce()
    expect(onForward).toHaveBeenCalledOnce()
    expect(save).toHaveBeenCalledOnce()
  })

  it('turns the secondary and red actions off while a save is on its way', () => {
    renderBar({ isSaving: true, secondary: { label: 'Save draft', onPress: vi.fn() } })

    expect(screen.getByRole('button', { name: 'Save draft' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Next' })).toBeEnabled()
  })
})

describe('[T-001] the shared block', () => {
  it('draws an icon tile, a title and a help line for a block that groups fields', () => {
    render(
      <Block hint="One line on what it is for" title="Name and text">
        <input aria-label="Name" />
      </Block>,
    )

    expect(screen.getByRole('region', { name: 'Name and text' })).toBeInTheDocument()
    expect(screen.getByText('One line on what it is for')).toBeInTheDocument()
    expect(screen.getByTestId('place-block')).toHaveClass('rounded-3xl', 'bg-surface', 'shadow-surface')
  })

  it('has no header when the block holds one field', () => {
    render(
      <Block>
        <input aria-label="Address" />
      </Block>,
    )

    expect(screen.queryByRole('heading')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Address')).toBeInTheDocument()
  })
})

describe('[T-001] the stepper messages', () => {
  it('has one shared English and German pair per key, and no key with the old products.steps prefix', () => {
    expect(Object.keys(stepsDe).sort()).toEqual(Object.keys(stepsEn).sort())
    expect(Object.keys(stepsEn).every(key => key.startsWith('steps.'))).toBe(true)
    expect(Object.keys(en).filter(key => key.startsWith('products.steps'))).toEqual([])
    expect(Object.keys(de).filter(key => key.startsWith('products.steps'))).toEqual([])
    for (const key of Object.keys(stepsEn)) {
      expect(en).toHaveProperty([key])
      expect(de).toHaveProperty([key])
    }
  })
})
