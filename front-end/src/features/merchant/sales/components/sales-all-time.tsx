import type { SalesOverviewView } from '../hooks/use-sales-overview'

import { numberFormat } from '@sk/domain/shared'

import { useState } from 'react'

import { DeltaChip } from '@/components/stat-card'
import { useLocale } from '@/contexts/locale-context'
import { Widget } from '@/features/merchant/today/components/overview-analytics'
import { Donut } from '@/features/partners/report/components/dashboard-widgets'
import { MIX_COLOURS } from './sales-overview'

type AllTime = SalesOverviewView['allTime']

/**
 * The all-time hero, as the partner report's: everything sold since the first order, its
 * 30-day change, and a ring of where it stands (collected, still unpaid) with a row for each
 * part. Not tied to the period picker below.
 */
function TotalHero({
  allTime,
  className,
}: {
  allTime: AllTime
  className: string
}) {
  const { t, intlLocale } = useLocale()
  const [active, setActive] = useState<number | null>(null)
  const total = allTime.parts.reduce((sum, p) => sum + p.amount, 0)
  const shown = active === null ? null : allTime.parts[active]
  const percent = numberFormat(intlLocale, { style: 'percent' })

  return (
    <section
      aria-labelledby="sales-all-time"
      className={`flex min-w-0 flex-col gap-5 rounded-3xl bg-surface p-5 shadow-surface ${className}`}
    >
      <div className="flex flex-col">
        <h2 className="font-semibold" id="sales-all-time">
          {t('salesOverview.allTime.title')}
        </h2>
        <p className="text-xs text-pretty text-muted">
          {t('salesOverview.allTime.since', { date: allTime.since })}
        </p>
      </div>
      <div className="flex flex-col gap-2">
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="text-4xl font-semibold tracking-tight tabular-nums md:text-5xl">
            {allTime.total}
          </span>
          {allTime.delta && <DeltaChip {...allTime.delta} />}
        </p>
        <p className="text-sm text-pretty text-muted">{allTime.sentence}</p>
      </div>
      <div
        aria-label={t('salesOverview.allTime.parts')}
        className="flex flex-col items-center gap-4"
        role="group"
      >
        <Donut
          active={active}
          className="size-44"
          parts={allTime.parts}
          onActive={setActive}
        >
          <span className="text-xs text-muted">
            {shown ? shown.label : t('salesOverview.allTime.title')}
          </span>
          <span className="text-base font-semibold tabular-nums">
            {shown
              ? total
                ? percent.format(shown.amount / total)
                : '–'
              : allTime.total}
          </span>
        </Donut>
        <ul className="flex w-full flex-col divide-y divide-separator">
          {allTime.parts.map((p, i) => (
            <li key={p.id}>
              <button
                aria-pressed={active === i}
                className={`flex w-full items-center gap-3 px-1 py-3 text-start outline-none transition-colors focus-visible:focus-ring ${
                  active === i ? 'bg-surface-secondary' : ''
                }`}
                type="button"
                onBlur={() => setActive(null)}
                onClick={() => setActive(i)}
                onFocus={() => setActive(i)}
                onMouseEnter={() => setActive(i)}
                onMouseLeave={() => setActive(null)}
              >
                <span
                  aria-hidden
                  className="size-3 shrink-0 rounded-full"
                  style={{ background: p.colour }}
                />
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="font-medium text-pretty">{p.label}</span>
                  <span className="text-xs text-muted">
                    {t('salesOverview.allTime.share', {
                      share: total ? percent.format(p.amount / total) : '–',
                    })}
                  </span>
                </span>
                <span className="shrink-0 font-semibold tabular-nums">
                  {p.value}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

/**
 * What was sold in each of the last seven months, keepsakes red under tours teal, all time and
 * not tied to the period picker. A month with sales opens as a custom range; the month on
 * screen is tinted, and months before the first order stay empty.
 */
function MonthlySales({
  allTime,
  current,
  className,
  onSelect,
}: {
  allTime: AllTime
  /** First day of the range on screen, to tint its month. */
  current: string
  className: string
  onSelect: (monthStart: string) => void
}) {
  const { t, intlLocale } = useLocale()
  const amount = numberFormat(intlLocale, {
    maximumFractionDigits: 0,
  })
  // The tallest bar stops short of the top, so its value label stays inside the card.
  const max = Math.max(1, ...allTime.months.map(m => m.total)) / 0.88

  return (
    <Widget
      className={className}
      description={t('salesOverview.months.description')}
      id="sales-months"
      title={t('salesOverview.months.title')}
    >
      <ul className="mb-3 flex gap-4 text-xs text-muted">
        {[t('salesOverview.gifts'), t('salesOverview.tours')].map((name, p) => (
          <li key={name} className="flex items-center gap-1.5">
            <span
              aria-hidden
              className="size-2.5 rounded-sm"
              style={{ background: MIX_COLOURS[p] }}
            />
            {name}
          </li>
        ))}
      </ul>
      <div className="flex min-h-56 flex-1 items-stretch gap-2" role="group">
        {allTime.months.map((m) => {
          const isShown = current === m.id

          return (
            <button
              key={m.id}
              aria-label={m.ariaLabel}
              aria-pressed={isShown}
              className={`flex min-w-0 flex-1 cursor-pointer flex-col items-center rounded-xl px-1 pb-2 outline-none enabled:hover:bg-foreground/5 focus-visible:focus-ring disabled:cursor-default ${isShown ? 'bg-foreground/5' : ''}`}
              disabled={!m.hasData}
              type="button"
              onClick={() => onSelect(m.id)}
            >
              <span className="relative flex w-full flex-1 items-end justify-center">
                <span
                  className="absolute inset-x-0 mb-1 text-center text-xs font-medium text-muted tabular-nums"
                  style={{ bottom: `${((m.total / max) * 100).toFixed(2)}%` }}
                >
                  {m.hasData ? amount.format(m.total / 100) : '–'}
                </span>
                {m.hasData && (
                  <span
                    aria-hidden
                    className={`flex w-full max-w-9 flex-col justify-end gap-0.5 ${m.isCurrent ? 'opacity-70' : ''}`}
                    style={{
                      height: `${Math.max((m.total / max) * 100, 2).toFixed(2)}%`,
                    }}
                  >
                    {m.tours > 0 && (
                      <span
                        className={`min-h-1 rounded-t-lg ${m.goods > 0 ? '' : 'rounded-b-lg'}`}
                        style={{
                          flexGrow: m.tours,
                          flexBasis: 0,
                          background: MIX_COLOURS[1],
                        }}
                      />
                    )}
                    {m.goods > 0 && (
                      <span
                        className={`min-h-1 rounded-b-lg ${m.tours > 0 ? '' : 'rounded-t-lg'}`}
                        style={{
                          flexGrow: m.goods,
                          flexBasis: 0,
                          background: MIX_COLOURS[0],
                        }}
                      />
                    )}
                  </span>
                )}
              </span>
              <span
                aria-hidden
                className={`mt-2 text-xs ${isShown || m.isCurrent ? 'font-semibold text-foreground' : 'text-muted'}`}
              >
                {m.tick}
              </span>
            </button>
          )
        })}
      </div>
    </Widget>
  )
}

/** The all-time row of Overview › Sales: the total with where it stands, and sales per month. */
export function SalesAllTime({
  view,
  onMonthSelect,
}: {
  view: SalesOverviewView
  onMonthSelect: (monthStart: string) => void
}) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
      <TotalHero allTime={view.allTime} className="lg:col-span-5" />
      <MonthlySales
        allTime={view.allTime}
        className="lg:col-span-7"
        current={view.current.start}
        onSelect={onMonthSelect}
      />
    </div>
  )
}
