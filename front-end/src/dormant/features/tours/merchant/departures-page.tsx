import type { Departure, Tour } from '@sk/domain/bookings'
import type { DeparturePhase, TourWork } from './lib/work'
import type { DataTableColumn } from '@/components/data-table'
import type { EmptyStateProps } from '@/components/empty-state'
import type { StatusTone } from '@/components/status-chip'
import type { MessageKey } from '@/i18n/en'

import { departureSeats } from '@sk/domain/bookings'

import { pickText } from '@sk/domain/shared'
import { Link } from '@tanstack/react-router'

import { DataTable } from '@/components/data-table'
import { DateTile } from '@/components/date-tile'
import {
  ArrowUpRightIcon,
  BookingsIcon,
  ChevronRightIcon,
} from '@/components/icons'

import { MerchantPageHeader } from '@/components/layout/merchant-page-header'
import { Media } from '@/components/media'
import { RowActions } from '@/components/row-actions'
import { StatusChip } from '@/components/status-chip'
import { useLocale } from '@/contexts/locale-context'
import { useSimulatedLoading } from '@/hooks/use-simulated-loading'
import { useTours } from '../hooks/use-tours'
import { departureBookings, departurePhase, tourWork } from './lib/work'
import {
  phaseChip,
  ticketSurface,
  ToneLine,
  useTourFormatting,
} from './shared'
import { useOverdueCheck } from './use-overdue-check'

interface Row {
  departure: Departure
  tour?: Tour
  phase: DeparturePhase
  seats: ReturnType<typeof departureSeats>
  work: TourWork
}

const attention: {
  key: MessageKey
  tone: StatusTone
  count: (w: TourWork) => number
}[] = [
  {
    key: 'tourMerchant.attention.toRecord',
    tone: 'warning',
    count: w => w.toRecord.length,
  },
  {
    key: 'tourMerchant.attention.overdue',
    tone: 'danger',
    count: w => w.overdue.length,
  },
  {
    key: 'tourMerchant.attention.owing',
    tone: 'warning',
    count: w => w.owing.length,
  },
  {
    key: 'tourMerchant.attention.reconcile',
    tone: 'danger',
    count: w => w.reconcile.length,
  },
]

function Attention({ work }: { work: TourWork }) {
  const { t } = useLocale()
  const items = attention.filter(a => a.count(work) > 0)

  if (!items.length)
    return <span className="text-sm text-muted">{t('tourMerchant.none')}</span>

  return (
    <div className="flex flex-wrap gap-2">
      {items.map(a => (
        <StatusChip key={a.key} tone={a.tone}>
          {t(a.key, { count: a.count(work) })}
        </StatusChip>
      ))}
    </div>
  )
}

/** Free seats only mean something for a departure guests can still book. */
function bookable(phase: DeparturePhase) {
  return phase === 'open' || phase === 'closed'
}

/**
 * Phones: one ticket per departure, in the M03 pickup-ticket look (1.10b, 1.10c). Date tile,
 * tour and start; the tour photo, beside it the phase and what needs the merchant as coloured
 * dots and words; seats and money in the dashed footer, one fact per row. The whole ticket
 * opens M06.
 */
function DepartureCards({ rows }: { rows: Row[] }) {
  const { t, language } = useLocale()
  const { date, money, weekday, day, month } = useTourFormatting()

  return (
    <ul className="flex flex-col gap-5 lg:hidden">
      {rows.map(({ departure, tour, phase, seats, work }) => {
        const items = attention.filter(a => a.count(work) > 0)

        return (
          <li key={departure.id}>
            <Link
              className={`${ticketSurface} outline-none hover:bg-surface-secondary focus-visible:focus-ring`}
              params={{ departureId: departure.id }}
              to="/store/bookings/departures/$departureId"
            >
              <div className="flex items-center gap-4 p-4">
                <DateTile
                  date={{
                    weekday: weekday(departure.startsAt),
                    day: day(departure.startsAt),
                    month: month(departure.startsAt),
                  }}
                  muted={phase === 'cancelled'}
                  // Coordinator D1: the lg tile carries M03's 30px day number.
                  size="lg"
                />
                <div className="min-w-0 flex-1">
                  <h3 className="text-lg leading-tight font-semibold">
                    {tour && pickText(tour.name, language).text}
                  </h3>
                  <p className="mt-2 text-xs text-muted tabular-nums">
                    {date(departure.startsAt)}
                  </p>
                </div>
                <ChevronRightIcon
                  aria-hidden
                  className="shrink-0 text-muted"
                  size={18}
                />
              </div>
              {/* The tour photo where M03 shows the product photo, same size and radius. */}
              <div className="flex items-center gap-3 p-4">
                <Media
                  alt=""
                  className="size-14 shrink-0 rounded-lg"
                  photo={tour?.photos[0]}
                />
                <div className="flex min-w-0 flex-1 flex-col gap-2">
                  <ToneLine tone={phaseChip[phase].tone}>
                    {t(phaseChip[phase].key)}
                  </ToneLine>
                  {items.length
                    ? (
                        items.map(a => (
                          <ToneLine key={a.key} tone={a.tone}>
                            {t(a.key, { count: a.count(work) })}
                          </ToneLine>
                        ))
                      )
                    : (
                        <ToneLine tone="neutral">{t('tourMerchant.none')}</ToneLine>
                      )}
                </div>
              </div>
              <dl className="flex flex-col gap-2 border-t border-dashed border-separator px-4 py-3.5 text-sm">
                {[
                  [
                    t('tourMerchant.booked'),
                    t('tourMerchant.seatsOf', {
                      count: seats.confirmed,
                      capacity: seats.capacity,
                    }),
                  ],
                  [t('tourMerchant.holds'), seats.held],
                  [
                    t('tourMerchant.available'),
                    bookable(phase) ? seats.available : '—',
                  ],
                  [t('tourMerchant.toCollect'), money(work.toCollect)],
                ].map(([label, value], index) => (
                  <div
                    key={label}
                    className="flex items-baseline justify-between gap-4"
                  >
                    <dt className="shrink-0 text-muted">{label}</dt>
                    <dd
                      className={`text-end tabular-nums ${index === 0 ? 'font-semibold' : 'text-muted'}`}
                    >
                      {value}
                    </dd>
                  </div>
                ))}
              </dl>
            </Link>
          </li>
        )
      })}
    </ul>
  )
}

function DepartureTable({
  rows,
  label,
  empty,
  isLoading,
}: {
  rows: Row[]
  label: string
  isLoading?: boolean
  /** Shown inside the table (a card on phones) when `rows` is empty. */
  empty?: EmptyStateProps
}) {
  const { t, language } = useLocale()
  const { date, money } = useTourFormatting()
  // Fixed shares, so the Upcoming and Ended tables line up column by column.
  const columns: DataTableColumn<Row>[] = [
    {
      id: 'departure',
      header: t('tourMerchant.departure'),
      headerClassName: 'w-[28%]',
      isRowHeader: true,
      skeleton: 'two-line',
      render: ({ departure, tour, phase }) => (
        <>
          <span className="block font-semibold">
            {tour && pickText(tour.name, language).text}
          </span>
          <span className="flex flex-wrap items-center gap-2 text-label text-muted tabular-nums">
            {date(departure.startsAt)}
            {phase !== 'open' && (
              <StatusChip tone={phaseChip[phase].tone}>
                {t(phaseChip[phase].key)}
              </StatusChip>
            )}
          </span>
        </>
      ),
    },
    {
      // Booked, holds and free share one column, so the row keeps room for its chips.
      id: 'seats',
      header: t('tourMerchant.seats'),
      headerClassName: 'w-[20%]',
      cellClassName: 'tabular-nums',
      render: ({ phase, seats }) => (
        <>
          <span className="block whitespace-nowrap">
            {t('tourMerchant.seatsBooked', {
              count: seats.confirmed,
              capacity: seats.capacity,
            })}
          </span>
          <span className="block text-label whitespace-nowrap text-muted">
            {t('tourMerchant.seatsDetail', {
              held: seats.held,
              free: bookable(phase) ? seats.available : '—',
            })}
          </span>
        </>
      ),
    },
    {
      id: 'toCollect',
      header: t('tourMerchant.toCollect'),
      headerClassName: 'w-[16%]',
      cellClassName: 'whitespace-nowrap tabular-nums',
      render: ({ work }) => money(work.toCollect),
    },
    {
      id: 'attention',
      header: t('tourMerchant.needsAttention'),
      headerClassName: 'w-[28%]',
      skeleton: 'chip',
      render: ({ work }) => <Attention work={work} />,
    },
  ]

  return (
    <DataTable
      cards={page => <DepartureCards rows={page} />}
      columns={columns}
      contentClassName="table-fixed"
      empty={empty}
      getRowHref={({ departure }) =>
        `#/store/bookings/departures/${departure.id}`}
      getRowId={({ departure }) => departure.id}
      isLoading={isLoading}
      label={label}
      rowActions={{
        render: ({ departure, tour }) => (
          <RowActions
            actions={[
              {
                id: 'open',
                label: t('rowAction.openDeparture'),
                icon: ArrowUpRightIcon,
                href: `#/store/bookings/departures/${departure.id}`,
              },
            ]}
            label={t('table.rowActions', {
              name: tour ? pickText(tour.name, language).text : departure.id,
            })}
          />
        ),
        headerClassName: 'w-[8%]',
      }}
      rows={rows}
    />
  )
}

/**
 * M05 Departure schedule: upcoming departures soonest first, then ended ones newest first.
 * Seats come from the same selector as the guest flow (C10). Each departure opens M06.
 */
export function TourDeparturesPage() {
  const { data, departures, tours, now } = useTours()
  const { t } = useLocale()

  const isLoading = useSimulatedLoading()

  useOverdueCheck()
  const rows: Row[] = departures.map((departure) => {
    const tour = tours.find(item => item.id === departure.tourId)

    return {
      departure,
      tour,
      phase: departurePhase(departure, tour, now),
      seats: departureSeats(data, departure.id, now),
      work: tourWork(departureBookings(data, departure.id), now),
    }
  })
  const byStart = (a: Row, b: Row) =>
    Date.parse(a.departure.startsAt) - Date.parse(b.departure.startsAt)
  const upcoming = rows.filter(r => r.phase !== 'ended').sort(byStart)
  const ended = rows
    .filter(r => r.phase === 'ended')
    .sort((a, b) => byStart(b, a))

  const noDepartures = {
    icon: BookingsIcon,
    message: t('tourMerchant.noDepartures'),
  }

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <MerchantPageHeader
        description={t('tourMerchant.departuresIntro')}
        title={t('tourMerchant.departures')}
      />
      {rows.length === 0 && (
        <DepartureTable
          empty={noDepartures}
          isLoading={isLoading}
          label={t('tourMerchant.departures')}
          rows={[]}
        />
      )}
      {[
        { id: 'upcoming', title: t('tourMerchant.upcoming'), rows: upcoming },
        { id: 'ended', title: t('tourMerchant.ended'), rows: ended },
      ]
        .filter(group => group.rows.length > 0)
        .map(group => (
          <section
            key={group.id}
            aria-labelledby={`departures-${group.id}`}
            className="flex flex-col gap-3"
          >
            <h2 className="text-heading" id={`departures-${group.id}`}>
              {group.title}
            </h2>
            <DepartureTable
              isLoading={isLoading}
              label={group.title}
              rows={group.rows}
            />
          </section>
        ))}
    </div>
  )
}
