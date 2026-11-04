import type { ReactNode } from 'react'
import type { EditorCase, Lang, SaveState } from './cases'

import { Button, Input, Label, TextField } from '@heroui/react'

import { ArrowRightIcon, BackIcon, StatusSuccessIcon } from '@/components/icons'
import { LanguageVersionSwitch } from '@/components/language-version-switch'
import { RowActions } from '@/components/row-actions'
import { StatusText } from '@/components/status-text'
import { StepMark } from '@/components/step-marks'
import { WarningBanner } from '@/components/warning-banner'

export type Kind = 'desktop' | 'phone'

/** What a case frame hands to an option: the case, the open language and step, and their setters. */
export interface HeaderProps {
  c: EditorCase
  kind: Kind
  lang: Lang
  onLang: (lang: Lang) => void
  step: string
  onStep: (id: string) => void
}

const LANGUAGES = [
  { id: 'en' as const, label: 'English', short: 'EN' },
  { id: 'de' as const, label: 'Deutsch', short: 'DE' },
]

const saveTone = { muted: 'text-muted', warning: 'font-medium text-warning', success: 'text-muted' } as const

/** The save state in words: "No changes", "Unsaved changes" (warning), "Saved 10:07" with a green tick. */
export function SaveText({ save }: { save: SaveState }) {
  return (
    <span aria-live="polite" className={`flex min-w-0 items-center gap-1 text-xs whitespace-nowrap @5xl:text-sm ${saveTone[save.tone]}`} role="status">
      {save.tone === 'success' && <StatusSuccessIcon aria-hidden className="shrink-0 text-success" size={14} />}
      <span className="truncate">{save.text}</span>
    </span>
  )
}

/** One line under the title: the status as dot text, a "·", the save state. The same line for both save models. */
export function MetaLine({ c }: { c: EditorCase }) {
  return (
    <span className="flex min-w-0 items-center gap-1.5">
      <StatusText tone={c.status.tone}>{c.status.label}</StatusText>
      <span aria-hidden className="text-xs text-muted">·</span>
      <SaveText save={c.save} />
    </span>
  )
}

/** The shared EN | DE switch with each version's completeness; compact in a header, full width with its line on a phone. */
export function LangSwitch({ c, lang, onLang, compact }: Pick<HeaderProps, 'c' | 'lang' | 'onLang'> & { compact: boolean }) {
  return <LanguageVersionSwitch compact={compact} label="Language version" languages={LANGUAGES} selected={lang} status={c.languages} onChange={onLang} />
}

export function BackButton({ c, variant = 'ghost' }: { c: EditorCase, variant?: 'ghost' | 'tertiary' }) {
  return (
    <Button isIconOnly aria-label={c.backLabel} className="size-11 shrink-0" variant={variant}>
      <BackIcon aria-hidden size={20} />
    </Button>
  )
}

/** Previous and next step, icon only. */
export function StepArrows({ c, step, onStep }: Pick<HeaderProps, 'c' | 'step' | 'onStep'>) {
  const index = c.steps.findIndex(s => s.id === step)

  return (
    <span className="flex shrink-0 items-center gap-1">
      <Button isIconOnly aria-label="Previous step" isDisabled={index <= 0} size="sm" variant="tertiary" onPress={() => onStep(c.steps[index - 1]!.id)}>
        <BackIcon aria-hidden size={18} />
      </Button>
      <Button isIconOnly aria-label="Next step" isDisabled={index >= c.steps.length - 1} size="sm" variant="tertiary" onPress={() => onStep(c.steps[index + 1]!.id)}>
        <ArrowRightIcon aria-hidden size={18} />
      </Button>
    </span>
  )
}

/** The screen's one red action; the phone gets the short label and a 44 px height. */
export function Primary({ c, kind }: { c: EditorCase, kind: Kind }) {
  return (
    <Button aria-label={c.primary.label} className={`shrink-0 ${kind === 'phone' ? 'h-11' : ''}`} isDisabled={c.primary.isDisabled}>
      {kind === 'phone' ? c.primary.short : c.primary.label}
    </Button>
  )
}

export function More({ c }: { c: EditorCase }) {
  return <RowActions actions={c.menu} label={`More actions for ${c.title}`} />
}

/** A thin vertical rule between groups of a bar. */
export function Rule() {
  return <span aria-hidden className="h-6 w-px shrink-0 bg-separator" />
}

/** The step list of the approved StepLayout, drawn for the lab frame (the real one switches on the viewport, not the frame). */
function StepRail({ c, step, onStep }: Pick<HeaderProps, 'c' | 'step' | 'onStep'>) {
  return (
    <nav aria-label="Steps" className="sticky top-24 w-60 shrink-0">
      <ol className="flex flex-col gap-2">
        {c.steps.map((s, i) => {
          const isCurrent = s.id === step

          return (
            <li key={s.id}>
              <button
                aria-current={isCurrent ? 'step' : undefined}
                className={`flex w-full items-center gap-3 rounded-2xl p-1.5 text-start text-sm outline-none hover:bg-surface-secondary focus-visible:focus-ring ${isCurrent ? 'bg-surface-secondary font-semibold' : ''}`}
                type="button"
                onClick={() => onStep(s.id)}
              >
                <StepMark index={i} isCurrent={isCurrent} status={s.status} />
                {s.label}
              </button>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

/** The phone's step line of the approved StepLayout: "Step 2 of 6 · Content", with the arrows when the bar has none. */
export function PhoneStepLine({ c, step, onStep, arrows }: Pick<HeaderProps, 'c' | 'step' | 'onStep'> & { arrows: boolean }) {
  const index = c.steps.findIndex(s => s.id === step)

  return (
    <div className="flex min-h-11 items-center gap-2">
      <p className="min-w-0 flex-1 truncate text-sm">
        <span className="text-muted">{`Step ${index + 1} of ${c.steps.length} · `}</span>
        <span className="font-semibold">{c.steps[index]!.label}</span>
      </p>
      {arrows && <StepArrows c={c} step={step} onStep={onStep} />}
    </div>
  )
}

/** A white block with two filled fields, standing in for the step's content. */
function Block({ c, kind }: { c: EditorCase, kind: Kind }) {
  return (
    <section className={`flex flex-col gap-4 bg-surface p-4 @5xl:p-6 ${kind === 'phone' ? '-mx-4 border-y border-separator' : 'rounded-3xl shadow-surface'}`}>
      <h2 className="font-semibold">{c.block}</h2>
      {c.fields.map(([label, value]) => (
        <TextField key={label} defaultValue={value}>
          <Label>{label}</Label>
          <Input />
        </TextField>
      ))}
    </section>
  )
}

/** Text lines that only give the page height, so the frame scrolls and the bar's pinning shows. */
function Filler({ kind }: { kind: Kind }) {
  return (
    <section aria-hidden className={`flex flex-col gap-3 bg-surface p-4 @5xl:p-6 ${kind === 'phone' ? '-mx-4 border-y border-separator' : 'rounded-3xl shadow-surface'}`}>
      <span className="h-4 w-40 rounded-full bg-default" />
      {['w-11/12', 'w-full', 'w-5/6', 'w-10/12', 'w-2/3', 'w-9/12', 'w-1/2'].map(w => <span key={w} className={`h-3 rounded-full bg-surface-secondary ${w}`} />)}
    </section>
  )
}

/** Stand-in page under the header: the step list on the left (desktop, step editors), the step's blocks on the right. */
export function PageBody({ c, kind, step, onStep, rail, top }: Pick<HeaderProps, 'c' | 'kind' | 'step' | 'onStep'> & { rail: boolean, top?: ReactNode }) {
  return (
    <div className={`flex items-start gap-8 ${kind === 'phone' ? 'px-4 pt-3 pb-8' : 'pt-6 pb-10'}`}>
      {rail && kind === 'desktop' && <StepRail c={c} step={step} onStep={onStep} />}
      <div className="flex min-w-0 flex-1 flex-col gap-4 @5xl:gap-6">
        {top}
        <Block c={c} kind={kind} />
        <Filler kind={kind} />
      </div>
    </div>
  )
}

const NOTICE = <WarningBanner action={{ label: 'Set up store', to: '/lab' }} closeLabel="Close" dismissKey="sk.lab.editorHeaderNotice" title="Your store is not open for sale yet." />

/**
 * A screen of the merchant shell, drawn at a fixed size so the header can be judged in place. Desktop: the store notice
 * stays at the top (as the shell's sticky notice) and the page scrolls under it. Phone: the notice scrolls away, the bar
 * pins to the top, and the tab bar sits at the bottom. `lead` scrolls with the page; `bar` pins.
 */
export function Frame({ kind, lead, bar, children }: { kind: Kind, lead?: ReactNode, bar: ReactNode, children: ReactNode }) {
  if (kind === 'phone') {
    return (
      <div className="@container flex h-[720px] w-full max-w-[375px] shrink-0 flex-col overflow-hidden rounded-[2rem] border border-separator bg-background">
        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="px-4">{NOTICE}</div>
          {lead}
          <div className="sticky top-0 z-30">{bar}</div>
          {children}
        </div>
        <TabBarStub />
      </div>
    )
  }

  return (
    <div className="@container flex h-[520px] w-full flex-col overflow-hidden rounded-3xl border border-separator bg-background">
      <div className="mx-auto w-full max-w-6xl shrink-0 px-8">{NOTICE}</div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-6xl px-8">
          {lead}
          <div className="sticky top-0 z-30 -mx-8">{bar}</div>
          {children}
        </div>
      </div>
    </div>
  )
}

/** The merchant phone tab bar, as a flat stand-in. */
function TabBarStub() {
  return (
    <div aria-hidden className="grid h-16 shrink-0 grid-cols-4 border-t border-separator bg-surface text-[11px] text-muted">
      {['Today', 'Orders', 'Products', 'More'].map(label => (
        <span key={label} className={`flex flex-col items-center justify-center gap-1 ${label === 'Products' ? 'font-semibold text-foreground' : ''}`}>
          <span className={`size-5 rounded-md ${label === 'Products' ? 'bg-foreground' : 'bg-default'}`} />
          {label}
        </span>
      ))}
    </div>
  )
}
