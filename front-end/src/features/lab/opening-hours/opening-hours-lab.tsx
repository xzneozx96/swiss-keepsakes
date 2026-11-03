import type { HoursSpan } from '@/features/places/lib/form'

import { Button } from '@heroui/react'
import { Link } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'

import { copy } from './copy'
import { sampleWeek } from './model'
import { WeekRows } from './option-a-rows'

type Option = keyof typeof copy.options

/** The editor body's height now, measured, so each option states its real size. */
function useHeight() {
  const ref = useRef<HTMLDivElement>(null)
  const [height, setHeight] = useState(0)

  useEffect(() => {
    const el = ref.current

    if (!el)
      return

    const observer = new ResizeObserver(() => setHeight(Math.round(el.getBoundingClientRect().height)))

    observer.observe(el)

    return () => observer.disconnect()
  }, [])

  return { ref, height }
}

function OptionShell({ option, children }: {
  option: Option
  children: (hours: HoursSpan[], onChange: (hours: HoursSpan[]) => void) => React.ReactNode
}) {
  const [hours, setHours] = useState(sampleWeek)
  const { ref, height } = useHeight()
  const o = copy.options[option]

  return (
    <section aria-labelledby={`hours-${option}`} className="flex min-w-0 flex-col gap-3 rounded-3xl bg-surface p-4 shadow-surface" data-option={option}>
      <header className="flex flex-col gap-1">
        <h2 className="flex items-center gap-2 text-heading" id={`hours-${option}`}>
          <span aria-hidden className="grid size-6 place-items-center rounded-full bg-accent text-xs font-semibold text-accent-foreground">{o.id}</span>
          {o.title}
        </h2>
        <p className="text-sm text-pretty text-muted">{o.why}</p>
        <p className="text-xs text-muted tabular-nums" data-height>{`Height: ${height} px on this screen`}</p>
      </header>
      <div ref={ref} className="min-w-0">{children(hours, setHours)}</div>
      <details className="rounded-xl border border-separator px-3 py-2 text-xs">
        <summary className="cursor-pointer font-medium">{`${copy.samePrefix}: ${copy.spansUnit(hours.length)}`}</summary>
        <pre className="mt-2 max-h-40 overflow-auto text-[11px] leading-snug" data-json>
          {JSON.stringify(hours.map(({ day, opens, closes }) => ({ day, opens, closes })))}
        </pre>
      </details>
    </section>
  )
}

export function OpeningHoursLab() {
  const [resetKey, setResetKey] = useState(0)

  return (
    <div className="flex flex-1 flex-col gap-8 bg-default/40 px-4 py-8 lg:px-8">
      <header className="flex max-w-3xl flex-col gap-2">
        <Link className="text-label text-muted underline underline-offset-4" to="/lab">{copy.back}</Link>
        <h1 className="text-heading">{copy.title}</h1>
        <p className="text-sm text-pretty text-muted">{copy.intro}</p>
        <details className="text-sm">
          <summary className="cursor-pointer font-medium">{copy.practiceTitle}</summary>
          <ul className="mt-2 flex list-disc flex-col gap-1 ps-5 text-muted">
            {copy.practice.map(line => <li key={line}>{line}</li>)}
          </ul>
        </details>
        <Button className="w-fit" size="sm" variant="secondary" onPress={() => setResetKey(k => k + 1)}>{copy.reset}</Button>
      </header>
      <div key={resetKey} className="grid max-w-xl items-start gap-6">
        <OptionShell option="a">{(hours, onChange) => <WeekRows hours={hours} onChange={onChange} />}</OptionShell>
      </div>
    </div>
  )
}
