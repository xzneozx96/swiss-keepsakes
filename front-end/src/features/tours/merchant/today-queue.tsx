import type { TourBooking } from '../types'
import type { TourWork } from './lib/work'
import type { IconComponent } from '@/components/icons'
import type { MessageKey } from '@/i18n/en'

import { Link } from '@tanstack/react-router'

import {
  ChevronRightIcon,
  ClockIcon,
  PayLaterIcon,
  StatusDangerIcon,
  TourIcon,
} from '@/components/icons'
import { StatCard } from '@/components/stat-card'

import { useLocale } from '@/contexts/locale-context'
import { zurichDate } from '@/features/catalog/lib/pickup'

import { Widget } from '@/features/merchant/today/components/overview-analytics'
import { pickText } from '@/lib/localized'
import { useTours } from '../hooks/use-tours'
import { balanceOverdue, departureSeats } from '../lib/selectors'
import { balanceToCollect, departurePhase, tourWork } from './lib/work'
import { useTourFormatting } from './shared'

const cellLink
  = 'outline-none hover:bg-surface-secondary/50 focus-visible:focus-ring focus-visible:ring-inset'

const tasks: {
  id: Exclude<keyof TourWork, 'toCollect'>
  title: MessageKey
  hint: MessageKey
  icon: IconComponent
}[] = [
  {
    id: 'toRecord',
    title: 'tourMerchant.task.toRecord',
    hint: 'tourMerchant.task.toRecordHint',
    icon: ClockIcon,
  },
  {
    id: 'overdue',
    title: 'tourMerchant.task.overdue',
    hint: 'tourMerchant.task.overdueHint',
    icon: StatusDangerIcon,
  },
  {
    id: 'owing',
    title: 'tourMerchant.task.owing',
    hint: 'tourMerchant.task.owingHint',
    icon: PayLaterIcon,
  },
  {
    id: 'reconcile',
    title: 'tourMerchant.task.reconcile',
    hint: 'tourMerchant.task.reconcileHint',
    icon: StatusDangerIcon,
  },
]

/** One booking opens M07, one departure opens M06, anything wider opens M05. */
function TaskLink({
  bookings,
  className,
  label,
  children,
}: {
  bookings: TourBooking[]
  className: string
  label: string
  children: React.ReactNode
}) {
  const departures = new Set(bookings.map(b => b.departureId))

  if (bookings.length === 1) {
    return (
      <Link
        aria-label={label}
        className={className}
        params={{ bookingId: bookings[0].id }}
        to="/store/bookings/$bookingId"
      >
        {children}
      </Link>
    )
  }
  if (departures.size === 1) {
    return (
      <Link
        aria-label={label}
        className={className}
        params={{ departureId: bookings[0].departureId }}
        to="/store/bookings/departures/$departureId"
      >
        {children}
      </Link>
    )
  }

  return (
    <Link aria-label={label} className={className} to="/store/bookings">
      {children}
    </Link>
  )
}

/**
 * M02 tour work, inside the Today part of Overview, in the M02 widget look (1.9t): each open
 * task (results to record, overdue balances, delivered but owed, payments to reconcile) is its
 * own stat card with the round arrow button; the next departures sit in a widget like Next
 * pickups; the tour balance still to collect is its own card. Tour money stays a separate
 * figure from the gift "Still to collect" (AC19: no double counting, goods and tours apart).
 */
/** The tours' tasks with work open (or all four, as tiles at 0, with `showAll`). */
export function TourTaskTiles({
  showAll = false,
  className = 'lg:grid-cols-4 lg:gap-4',
}: {
  showAll?: boolean
  /** The list's columns from 1024px. */
  className?: string
}) {
  const { data, now } = useTours()
  const { t } = useLocale()
  const work = tourWork(data.bookings, now)
  const open = showAll
    ? tasks
    : tasks.filter(task => work[task.id].length > 0)

  if (!open.length)
    return null

  return (
    // Each li is a subgrid row of the list, so names, counts and hints line up across a row
    // even when a German hint wraps (as M04 KeyFacts).
    <ul className={`grid grid-cols-2 gap-3 ${className}`}>
      {open.map((task) => {
        const count = work[task.id].length
        const title = t(task.title)

        return (
          <li
            key={task.id}
            className="row-span-3 grid min-w-0 grid-rows-subgrid"
          >
            <StatCard
              isLarge
              isLink
              isSubgrid
              as={({ className, children }) => (
                <TaskLink
                  bookings={work[task.id]}
                  className={className}
                  label={t('tourMerchant.taskLabel', { title, count })}
                >
                  {children}
                </TaskLink>
              )}
              icon={task.icon}
              isMuted={!count}
              label={title}
              value={count}
            >
              <span aria-hidden className="text-xs text-pretty text-muted">
                {t(task.hint)}
              </span>
            </StatCard>
          </li>
        )
      })}
    </ul>
  )
}

/** Next departures: the next four open or closed departures; each opens M06. */
export function NextDeparturesWidget({ className = 'lg:col-span-3' }) {
  const { departures, data, tours, now } = useTours()
  const { t, language } = useLocale()
  const { weekday, day, month, time } = useTourFormatting()
  const today = zurichDate(now)
  const next = departures
    .filter((d) => {
      const phase = departurePhase(
        d,
        tours.find(tour => tour.id === d.tourId),
        now,
      )

      return phase === 'open' || phase === 'closed'
    })
    .sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt))
    .slice(0, 4)

  return (
    <Widget
      actions={(
        <Link
          className="inline-flex h-8 shrink-0 items-center gap-0.5 rounded-md text-xs font-medium text-muted outline-none hover:text-foreground focus-visible:focus-ring active:opacity-60"
          to="/store/bookings"
        >
          {t('tourMerchant.back')}
          <ChevronRightIcon aria-hidden size={14} />
        </Link>
      )}
      className={className}
      id="today-tours-next"
      title={t('tourMerchant.nextDepartures')}
    >
      {next.length === 0
        ? (
            <p className="text-sm text-muted">{t('tourMerchant.todayEmpty')}</p>
          )
        : (
            <ul className="-mx-2 -my-1.5 flex flex-col">
              {next.map((departure) => {
                const tour = tours.find(item => item.id === departure.tourId)
                const seats = departureSeats(data, departure.id, now)
                const isToday = zurichDate(new Date(departure.startsAt)) === today

                return (
                  <li key={departure.id}>
                    <Link
                      className={`flex items-center gap-3 rounded-2xl px-2 py-2.5 ${cellLink}`}
                      params={{ departureId: departure.id }}
                      to="/store/bookings/departures/$departureId"
                    >
                      {/* The Next pickups date tile; the start time moves to the sub-line. */}
                      <span
                        className={`flex w-12 shrink-0 flex-col items-center rounded-xl py-1.5 ${
                          isToday
                            ? 'bg-foreground text-background'
                            : 'bg-surface-secondary'
                        }`}
                      >
                        <span className="text-xs leading-4 font-medium">
                          {isToday
                            ? t('merchantToday.pickups.today')
                            : weekday(departure.startsAt)}
                        </span>
                        <span className="text-lg leading-6 font-semibold tabular-nums">
                          {day(departure.startsAt)}
                        </span>
                        <span className="text-xs leading-4">
                          {month(departure.startsAt)}
                        </span>
                      </span>
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className="flex min-w-0 items-center gap-2 font-medium">
                          <TourIcon
                            aria-hidden
                            className="shrink-0 text-muted"
                            size={16}
                          />
                          <span className="truncate">
                            {tour && pickText(tour.name, language).text}
                          </span>
                        </span>
                        <span className="text-sm text-muted tabular-nums">
                          {time(departure.startsAt)} ·{' '}
                          {t('tourMerchant.seatsBooked', {
                            count: seats.confirmed,
                            capacity: seats.capacity,
                          })}
                          {seats.held > 0
                            && ` · ${t('tourMerchant.onHold', { held: seats.held })}`}
                        </span>
                      </span>
                      <ChevronRightIcon
                        aria-hidden
                        className="shrink-0 text-muted"
                        size={18}
                      />
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}
    </Widget>
  )
}

type CollectStage = 'upcoming' | 'overdue' | 'owing'

/** Each stage in a status colour, as the gift card: due later info, overdue danger, owed warning. */
const collectStages: {
  id: CollectStage
  label: MessageKey
  shade: string
}[] = [
  {
    id: 'upcoming',
    label: 'tourMerchant.collect.upcoming',
    shade: 'bg-(--status-info-fill)',
  },
  {
    id: 'overdue',
    label: 'tourMerchant.collect.overdue',
    shade: 'bg-(--status-danger-fill)',
  },
  {
    id: 'owing',
    label: 'tourMerchant.collect.owing',
    shade: 'bg-(--status-warning-fill)',
  },
]

function stageOf(booking: TourBooking, now: Date): CollectStage {
  if (booking.status === 'delivered')
    return 'owing'

  return balanceOverdue(booking, now) ? 'overdue' : 'upcoming'
}

/**
 * The tour balance still to collect, apart from the gifts' (AC19), in the gift Still to
 * collect look: the total, one stacked bar by stage, a legend that opens the bookings, and
 * the next balance that falls due.
 */
export function TourCollectWidget({ className = 'lg:col-span-2' }) {
  const { data, now } = useTours()
  const { t } = useLocale()
  const { money, dayMonth } = useTourFormatting()
  const owed = data.bookings.filter(b => balanceToCollect(b) > 0)
  const total = owed.reduce((sum, b) => sum + balanceToCollect(b), 0)
  const parts = collectStages
    .map((stage) => {
      const list = owed.filter(b => stageOf(b, now) === stage.id)
      const amount = list.reduce((sum, b) => sum + balanceToCollect(b), 0)

      return { ...stage, list, amount, share: total ? amount / total : 0 }
    })
    .filter(p => p.list.length > 0)
  const next = owed
    .filter(b => stageOf(b, now) === 'upcoming')
    .sort((a, b) => Date.parse(a.balanceDueAt) - Date.parse(b.balanceDueAt))[0]

  return (
    <Widget
      className={className}
      description={t(
        parts.length
          ? 'tourMerchant.collect.hint'
          : 'tourMerchant.collect.none',
      )}
      footer={
        next
        && t('tourMerchant.collect.next', {
          date: dayMonth(next.balanceDueAt),
          amount: money(balanceToCollect(next)),
        })
      }
      id="today-tours-collect"
      title={t('tourMerchant.todayCollect')}
    >
      <p className="text-3xl font-semibold tracking-tight tabular-nums">
        {money(total)}
      </p>
      {parts.length > 0 && (
        <>
          <div
            aria-hidden
            className="mt-4 flex h-3 gap-0.5 overflow-hidden rounded-full"
          >
            {parts.map(p => (
              <span
                key={p.id}
                className={`h-full min-w-1.5 ${p.shade}`}
                style={{ flexGrow: p.share, flexBasis: 0 }}
              />
            ))}
          </div>
          <ul className="mt-3 flex flex-col">
            {parts.map(p => (
              <li key={p.id}>
                <TaskLink
                  bookings={p.list}
                  className={`-mx-2 flex items-center gap-3 rounded-xl px-2 py-2 ${cellLink}`}
                  label={`${t(p.label)}, ${money(p.amount)}`}
                >
                  <span
                    aria-hidden
                    className={`size-2.5 shrink-0 rounded-full ${p.shade}`}
                  />
                  <span className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-2">
                    <span className="text-sm font-medium">{t(p.label)}</span>
                    {' '}
                    <span className="text-xs text-muted">
                      {t(
                        p.list.length === 1
                          ? 'tourMerchant.collect.bookings.one'
                          : 'tourMerchant.collect.bookings.other',
                        { count: p.list.length },
                      )}
                    </span>
                  </span>
                  <span className="shrink-0 text-sm font-medium tabular-nums">
                    {money(p.amount)}
                  </span>
                </TaskLink>
              </li>
            ))}
          </ul>
        </>
      )}
    </Widget>
  )
}
