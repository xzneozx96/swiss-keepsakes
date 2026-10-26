import type { BalancePart, MonthBar } from '../hooks/use-partner-dashboard'
import type { MixSide } from '../hooks/use-partner-overview'
import type { ReportGroupView } from './partner-report'
import type { DeltaView } from '@/components/stat-card'

import { numberFormat } from '@sk/domain/shared'
import { useState } from 'react'

import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts'
import { DeltaChip } from '@/components/stat-card'
import { useLocale } from '@/contexts/locale-context'
import { Widget } from '@/features/merchant/today/components/overview-analytics'

const noAnimation = { isAnimationActive: false } as const
const pct = (share: number) => `${(share * 100).toFixed(2)}%`

/** A donut of up to four parts, from 12 o'clock clockwise; `active` dims the others. */
export function Donut({
  parts,
  active,
  onActive,
  children,
  className,
  inner = '72%',
}: {
  inner?: string
  parts: { id: string, amount: number, colour: string }[]
  active: number | null
  onActive: (index: number | null) => void
  children: React.ReactNode
  className: string
}) {
  const total = parts.reduce((sum, p) => sum + p.amount, 0)

  return (
    <div aria-hidden className={`relative shrink-0 ${className}`}>
      <ResponsiveContainer height="100%" width="100%">
        <PieChart accessibilityLayer={false}>
          <Pie
            {...noAnimation}
            cornerRadius={6}
            data={
              total
                ? parts.map(p => ({ name: p.id, value: p.amount }))
                : [{ name: 'none', value: 1 }]
            }
            dataKey="value"
            endAngle={-270}
            innerRadius={inner}
            outerRadius="100%"
            paddingAngle={total ? 2 : 0}
            startAngle={90}
            stroke="none"
            onMouseEnter={(_, index) => total && onActive(index)}
            onMouseLeave={() => onActive(null)}
          >
            {total
              ? (
                  parts.map((p, i) => (
                    <Cell
                      key={p.id}
                      fill={p.colour}
                      fillOpacity={active === null || active === i ? 1 : 0.3}
                    />
                  ))
                )
              : (
                  <Cell fill="var(--chart-track)" />
                )}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-4 text-center">
        {children}
      </div>
    </div>
  )
}

/**
 * The hero: everything the partner has earned since the first order, its 30-day change, and
 * a donut of where it stands (paid out, still to pay, estimated on open orders) with a row
 * for each part, as the Sales overview's status split. Hovering or focusing a part names it
 * in the middle of the ring. Not tied to the period below.
 */
export function BalanceHero({
  balance,
  className,
}: {
  balance: {
    earned: string
    delta: DeltaView | null
    sentence: string
    description: string
    parts: BalancePart[]
  }
  className: string
}) {
  const { t, intlLocale } = useLocale()
  const [active, setActive] = useState<number | null>(null)
  const total = balance.parts.reduce((sum, p) => sum + p.amount, 0)
  const shown = active === null ? null : balance.parts[active]
  const percent = numberFormat(intlLocale, { style: 'percent' })

  return (
    <section
      aria-labelledby="dash-balance"
      className={`flex min-w-0 flex-col gap-5 rounded-3xl bg-surface p-5 shadow-surface ${className}`}
    >
      <div className="flex flex-col">
        <h2 className="font-semibold" id="dash-balance">
          {t('partnerDash.balance.title')}
        </h2>
        <p className="text-xs text-pretty text-muted">{balance.description}</p>
      </div>
      <div className="flex flex-col gap-2">
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="text-4xl font-semibold tracking-tight tabular-nums md:text-5xl">
            {balance.earned}
          </span>
          {balance.delta && <DeltaChip {...balance.delta} />}
        </p>
        <p className="text-sm text-pretty text-muted">{balance.sentence}</p>
      </div>
      <div
        aria-label={t('partnerDash.balance.parts')}
        className="flex flex-col items-center gap-4"
        role="group"
      >
        <Donut
          active={active}
          className="size-44"
          parts={balance.parts}
          onActive={setActive}
        >
          <span className="text-xs text-muted">
            {shown ? shown.label : t('partnerDash.balance.earned')}
          </span>
          <span className="text-lg font-semibold tabular-nums">
            {shown
              ? total
                ? percent.format(shown.amount / total)
                : '–'
              : balance.earned}
          </span>
        </Donut>
        <ul className="flex w-full flex-col divide-y divide-separator">
          {balance.parts.map((p, i) => (
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
                  <span className="text-xs text-pretty text-muted">
                    {t('partnerDash.balance.share', {
                      share: total ? percent.format(p.amount / total) : '–',
                    })}
                    {p.caption ? ` · ${p.caption}` : ''}
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
 * What the partner earned in each of the last months, all time and not tied to the period
 * picker. A month with orders opens as a custom range; the month the page shows is tinted, the
 * running month is lighter, and months before the first order stay empty.
 */
export function MonthsWidget({
  months,
  title,
  className,
  onSelect,
}: {
  months: MonthBar[]
  title: string
  className: string
  onSelect: (monthStart: string) => void
}) {
  const { t, intlLocale } = useLocale()
  const amount = numberFormat(intlLocale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
  // The tallest bar stops short of the top, so its value label stays inside the card.
  const max = Math.max(1, ...months.map(m => m.value ?? 0)) / 0.88

  return (
    <Widget
      className={className}
      description={t('partnerDash.months.description')}
      id="dash-months"
      title={title}
    >
      <div className="flex min-h-56 flex-1 items-stretch gap-2" role="group">
        {months.map((m) => {
          const share = m.value === null ? 0 : m.value / max
          const fill = m.isShown
            ? 'bg-(--chart-1-mid)'
            : m.isCurrent
              ? 'bg-(--chart-1-light)'
              : 'bg-(--chart-1)'

          return (
            <button
              key={m.id}
              aria-label={m.ariaLabel}
              aria-pressed={m.isShown}
              className={`flex min-w-0 flex-1 cursor-pointer flex-col items-center rounded-xl px-1 pb-2 outline-none enabled:hover:bg-foreground/5 focus-visible:focus-ring disabled:cursor-default ${m.isShown ? 'bg-foreground/5' : ''}`}
              disabled={m.value === null}
              type="button"
              onClick={() => onSelect(m.id)}
            >
              <span className="relative flex w-full flex-1 items-end justify-center">
                <span
                  className="absolute inset-x-0 mb-1 text-center text-xs font-medium text-muted tabular-nums"
                  style={{ bottom: `${(share * 100).toFixed(2)}%` }}
                >
                  {m.value === null ? '–' : amount.format(m.value)}
                </span>
                {m.value !== null && (
                  <span
                    aria-hidden
                    className={`w-full max-w-9 rounded-t-lg ${fill}`}
                    style={{
                      height: `${Math.max(share * 100, 2).toFixed(2)}%`,
                    }}
                  />
                )}
              </span>
              <span
                aria-hidden
                className={`mt-2 text-xs ${m.isShown || m.isCurrent ? 'font-semibold text-foreground' : 'text-muted'}`}
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

/**
 * Keepsakes, in the Sales overview's split card: a donut with the period's total, a tile
 * (commission, share, how much is recorded against estimated), then each product group
 * ranked as divider rows in the keepsakes colour.
 */
export function MixWidget({
  mix,
  groups,
  groupsHeading,
  className,
}: {
  mix: { total: string, isEmpty: boolean, parts: MixSide[] }
  groups: ReportGroupView[]
  groupsHeading: string
  className: string
}) {
  const { t } = useLocale()
  const [active, setActive] = useState<number | null>(null)
  const shown = active === null ? null : mix.parts[active]
  const keepsakesColour = mix.parts[0]

  return (
    <Widget
      className={className}
      description={t('partnerDash.mix.description')}
      id="dash-mix"
      title={t('partnerDash.mix.title')}
    >
      {mix.isEmpty
        ? (
            <p className="py-6 text-center text-sm text-muted">
              {t('partnerDash.mix.empty')}
            </p>
          )
        : (
            <div className="flex flex-col gap-5">
              <div className="grid grid-cols-1 items-center gap-6 sm:grid-cols-[14rem_1fr]">
                <Donut
                  active={active}
                  className="mx-auto size-56"
                  inner="74%"
                  parts={mix.parts}
                  onActive={setActive}
                >
                  <span className="text-xs text-muted">
                    {shown ? shown.label : t('partnerDash.mix.total')}
                  </span>
                  <span className="text-xl leading-tight font-semibold tracking-tight tabular-nums">
                    {shown ? shown.value : mix.total}
                  </span>
                </Donut>
                <div className="grid grid-cols-1 gap-3">
                  {mix.parts.map((p, i) => (
                    <section
                      key={p.id}
                      aria-labelledby={`dash-mix-${p.id}`}
                      className={`flex flex-col gap-2.5 rounded-2xl border px-4 py-3.5 transition-colors ${
                        active === i ? 'border-foreground/30' : 'border-separator'
                      }`}
                      onBlur={() => setActive(null)}
                      onFocus={() => setActive(i)}
                      onMouseEnter={() => setActive(i)}
                      onMouseLeave={() => setActive(null)}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <h4
                          className="flex items-center gap-2 font-semibold"
                          id={`dash-mix-${p.id}`}
                        >
                          <span
                            aria-hidden
                            className="size-2.5 rounded-full"
                            style={{ background: p.colour }}
                          />
                          {p.label}
                        </h4>
                        <span className="text-xl font-semibold tracking-tight tabular-nums">
                          {p.value}
                        </span>
                      </div>
                      <span
                        aria-hidden
                        className="flex h-1.5 overflow-hidden rounded-full"
                        style={{ background: p.track }}
                      >
                        <span
                          className="h-full rounded-full"
                          style={{
                            width: pct(p.recordedShare),
                            background: p.colour,
                          }}
                        />
                      </span>
                      <div className="flex flex-col gap-1 text-xs text-muted tabular-nums">
                        <span>{p.orders}</span>
                        <span className="flex flex-wrap justify-between gap-x-4">
                          <span>
                            {t('partnerDash.filter.recorded')}
                            {' '}
                            <span className="font-medium text-foreground">
                              {p.recorded}
                            </span>
                          </span>
                          <span>
                            {t('partnerDash.filter.estimated')}
                            {' '}
                            <span className="font-medium text-foreground">
                              {p.estimated}
                            </span>
                          </span>
                        </span>
                      </div>
                    </section>
                  ))}
                </div>
              </div>
              {groups.length > 0 && (
                <div className="flex flex-col gap-1">
                  <h4 className="text-xs font-medium text-muted">
                    {groupsHeading}
                  </h4>
                  <ul className="flex flex-col divide-y divide-separator">
                    {groups.map(g => (
                      <li key={g.id} className="flex items-center gap-3 py-3">
                        <span
                          aria-hidden
                          className="size-3 shrink-0 rounded-full"
                          style={{ background: keepsakesColour.colour }}
                        />
                        <span className="flex min-w-0 flex-1 flex-col">
                          <span className="truncate font-medium">{g.name}</span>
                          <span className="text-xs text-pretty text-muted">
                            {g.summary}
                            {g.estimated ? ` · ${g.estimated}` : ''}
                          </span>
                        </span>
                        <span className="shrink-0 font-semibold tabular-nums">
                          {g.commission}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
    </Widget>
  )
}
