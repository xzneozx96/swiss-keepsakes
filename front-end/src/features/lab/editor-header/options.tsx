import type { StepStatus } from '@sk/domain/catalog'
import type { HeaderProps } from './parts'

import { Tabs } from '@heroui/react'

import { StatusDangerIcon, StatusSuccessIcon, StatusWarningIcon } from '@/components/icons'
import { TabRow } from '@/components/page-tabs'
import { StatusText } from '@/components/status-text'
import { BackButton, Frame, LangSwitch, MetaLine, More, PageBody, PhoneStepLine, Primary, Rule, SaveText, StepArrows } from './parts'

const BLUR_BAR = 'border-b border-separator bg-background/90 backdrop-blur-xl'

/** Title and the one meta line, the left half of a one-line bar. */
function TitleBlock({ c, kind }: Pick<HeaderProps, 'c' | 'kind'>) {
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-0.5 leading-tight">
      <h1 className={`truncate font-semibold ${kind === 'phone' ? 'text-[15px]' : 'text-base'}`} title={c.title}>{c.title}</h1>
      <MetaLine c={c} />
    </div>
  )
}

/**
 * A · One line. The story editor's bar for every editor: Back, the name over one status line, and the controls in a
 * row at the right (switch, step arrows, the red action, ⋯). The floating save bar goes away.
 */
export function OptionOneLine(p: HeaderProps) {
  const { c, kind } = p
  const steps = c.hasArrows
  const bar = kind === 'desktop'
    ? (
        <div className={BLUR_BAR}>
          <div className="flex h-16 items-center gap-3 px-6">
            <BackButton c={c} />
            <TitleBlock c={c} kind={kind} />
            <LangSwitch compact c={c} lang={p.lang} onLang={p.onLang} />
            {steps && (
              <>
                <Rule />
                <StepArrows c={c} step={p.step} onStep={p.onStep} />
              </>
            )}
            <Rule />
            <Primary c={c} kind={kind} />
            <More c={c} />
          </div>
        </div>
      )
    : (
        <div className={BLUR_BAR}>
          <div className="flex h-16 items-center gap-1.5 px-2">
            <BackButton c={c} />
            <TitleBlock c={c} kind={kind} />
            <Primary c={c} kind={kind} />
            <More c={c} />
          </div>
        </div>
      )

  return (
    <Frame bar={bar} kind={kind}>
      <PageBody
        c={c}
        kind={kind}
        rail={steps}
        step={p.step}
        top={kind === 'phone' && (
          <>
            <LangSwitch c={c} compact={false} lang={p.lang} onLang={p.onLang} />
            {steps && <PhoneStepLine arrows c={c} step={p.step} onStep={p.onStep} />}
          </>
        )}
        onStep={p.onStep}
      />
    </Frame>
  )
}

/**
 * B · Name, then the bar. The big name and status stay where the keepsake editor has them and scroll away; the
 * white save bar moves up from the bottom and pins under the store notice, carrying the switch, the save state,
 * the arrows and the red action.
 */
export function OptionNameThenBar(p: HeaderProps) {
  const { c, kind } = p
  const steps = c.hasArrows

  if (kind === 'phone') {
    const bar = (
      <div className="bg-background/90 backdrop-blur-xl">
        <div className="flex h-14 items-center gap-2 px-2">
          <BackButton c={c} />
          <h1 className="min-w-0 truncate text-[17px] font-semibold" title={c.title}>{c.title}</h1>
          <StatusText tone={c.status.tone}>{c.status.label}</StatusText>
          <span className="ms-auto">
            <More c={c} />
          </span>
        </div>
        <div className="px-3 pb-2">
          <div className="flex items-center gap-2 rounded-2xl bg-surface py-1.5 ps-2 pe-1.5 shadow-surface">
            <LangSwitch compact c={c} lang={p.lang} onLang={p.onLang} />
            <span className="min-w-0 flex-1">
              <SaveText save={c.save} />
            </span>
            <Primary c={c} kind={kind} />
          </div>
        </div>
      </div>
    )

    return (
      <Frame bar={bar} kind={kind}>
        <PageBody c={c} kind={kind} rail={steps} step={p.step} top={steps && <PhoneStepLine arrows c={c} step={p.step} onStep={p.onStep} />} onStep={p.onStep} />
      </Frame>
    )
  }

  const lead = (
    <header className="flex items-start gap-3 pt-6 pb-2">
      <span className="-ms-2">
        <BackButton c={c} variant="tertiary" />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-1.5 pt-0.5">
        <h1 className="text-title text-pretty [overflow-wrap:anywhere]">{c.title}</h1>
        <StatusText tone={c.status.tone}>{c.status.label}</StatusText>
      </div>
      <More c={c} />
    </header>
  )
  const bar = (
    <div className="bg-background/90 px-8 py-3 backdrop-blur-xl">
      <div className="flex items-center gap-3 rounded-2xl bg-surface py-2 ps-2 pe-3 shadow-surface">
        <LangSwitch compact c={c} lang={p.lang} onLang={p.onLang} />
        <Rule />
        <span className="min-w-0 flex-1">
          <SaveText save={c.save} />
        </span>
        {steps && <StepArrows c={c} step={p.step} onStep={p.onStep} />}
        <Primary c={c} kind={kind} />
      </div>
    </div>
  )

  return (
    <Frame bar={bar} kind={kind} lead={lead}>
      <PageBody c={c} kind={kind} rail={steps} step={p.step} onStep={p.onStep} />
    </Frame>
  )
}

const stepIcon: Partial<Record<StepStatus, { Icon: typeof StatusSuccessIcon, className: string, text: string }>> = {
  done: { Icon: StatusSuccessIcon, className: 'text-success', text: 'done' },
  warning: { Icon: StatusWarningIcon, className: 'text-warning', text: 'needs a look' },
  error: { Icon: StatusDangerIcon, className: 'text-danger', text: 'has errors' },
}

/** The steps (or the story's two screens) as the app's thin-pill tabs, a status icon after each. */
function StepTabs({ c, step, onStep }: Pick<HeaderProps, 'c' | 'step' | 'onStep'>) {
  return (
    <Tabs selectedKey={step} onSelectionChange={key => onStep(String(key))}>
      <TabRow
        label="Steps"
        tabs={c.steps.map((s, i) => {
          const mark = stepIcon[s.status]

          return {
            id: s.id,
            label: c.hasArrows ? `${i + 1} ${s.label}` : s.label,
            marker: mark && (
              <span className="ms-1.5 inline-flex">
                <mark.Icon aria-hidden className={`shrink-0 ${mark.className}`} size={14} />
                <span className="sr-only">{`, ${mark.text}`}</span>
              </span>
            ),
          }
        })}
      />
    </Tabs>
  )
}

/**
 * C · Steps in the header. One pinned header in two rows: Back, name and status line, switch, the red action and ⋯;
 * under it the steps as tabs. The left step list and the arrows go; the story's Write and Review become the same tabs.
 */
export function OptionStepsInHeader(p: HeaderProps) {
  const { c, kind } = p
  const bar = kind === 'desktop'
    ? (
        <div className={BLUR_BAR}>
          <div className="flex h-16 items-center gap-3 px-6">
            <BackButton c={c} />
            <TitleBlock c={c} kind={kind} />
            <LangSwitch compact c={c} lang={p.lang} onLang={p.onLang} />
            <Rule />
            <Primary c={c} kind={kind} />
            <More c={c} />
          </div>
          <div className="px-6 pb-3 ps-[4.75rem]">
            <StepTabs c={c} step={p.step} onStep={p.onStep} />
          </div>
        </div>
      )
    : (
        <div className={BLUR_BAR}>
          <div className="flex h-16 items-center gap-1.5 px-2">
            <BackButton c={c} />
            <TitleBlock c={c} kind={kind} />
            <Primary c={c} kind={kind} />
            <More c={c} />
          </div>
          <div className="overflow-x-auto px-4 pb-2 [scrollbar-width:none]">
            <StepTabs c={c} step={p.step} onStep={p.onStep} />
          </div>
        </div>
      )

  return (
    <Frame bar={bar} kind={kind}>
      <PageBody c={c} kind={kind} rail={false} step={p.step} top={kind === 'phone' && <LangSwitch c={c} compact={false} lang={p.lang} onLang={p.onLang} />} onStep={p.onStep} />
    </Frame>
  )
}
