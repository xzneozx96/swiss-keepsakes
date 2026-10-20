import { Skeleton } from '@heroui/react'

import { useLocale } from '@/contexts/locale-context'

import { useTourRecords } from '@/features/tours/api/queries'

import {
  NextDeparturesWidget,
  TourCollectWidget,
  TourTaskTiles,
} from '@/features/tours/merchant/today-queue'
import { useOverdueCheck } from '@/features/tours/merchant/use-overdue-check'
import { useSimulatedLoading } from '@/hooks/use-simulated-loading'
import { useMerchantToday } from '../hooks/use-merchant-today'
import { AlertRow, CollectWidget, PickupsWidget, Tile } from './merchant-today'
import { WidgetSkeleton } from './overview-pages'

/** A task tile while loading: icon, name, count. */
function TileSkeleton() {
  return (
    <div
      aria-hidden
      className="flex h-40 flex-col justify-between rounded-3xl bg-surface p-4 shadow-surface"
    >
      <div className="flex justify-between">
        <Skeleton className="size-9 rounded-xl" />
        <Skeleton className="size-8 rounded-full" />
      </div>
      <div className="flex flex-col gap-2">
        <Skeleton className="h-3.5 w-3/5 rounded-lg" />
        <Skeleton className="h-7 w-8 rounded-lg" />
      </div>
    </div>
  )
}

/** A list row while loading: the date tile and two lines (Next pickups, Next departures). */
function RowsSkeleton() {
  return (
    <ul className="flex flex-col gap-4">
      {[0, 1, 2, 3].map(i => (
        <li key={i} className="flex items-center gap-3">
          <Skeleton className="h-16 w-12 shrink-0 rounded-xl" />
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-4 w-1/2 rounded-lg" />
            <Skeleton className="h-3 w-1/3 rounded-lg" />
          </div>
        </li>
      ))}
    </ul>
  )
}

/** Still to collect while loading: total, stacked bar, three legend rows. */
function CollectSkeleton() {
  return (
    <>
      <Skeleton className="h-8 w-40 rounded-lg" />
      <Skeleton className="mt-4 h-3 w-full rounded-full" />
      <div className="mt-4 flex flex-col gap-3">
        {[0, 1, 2].map(i => (
          <div key={i} className="flex justify-between gap-3">
            <Skeleton className="h-3.5 w-2/5 rounded-lg" />
            <Skeleton className="h-3.5 w-16 rounded-lg" />
          </div>
        ))}
      </div>
    </>
  )
}

/** Today while loading: the same bento, gifts left and tours right. */
function TodaySkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-x-6">
      {[0, 1].map(col => (
        <div key={col} className="flex flex-col gap-4">
          <Skeleton className="h-6 w-20 rounded-lg" />
          <div className="grid grid-cols-2 gap-3 lg:gap-4">
            {[0, 1, 2, 3].map(i => (
              <TileSkeleton key={i} />
            ))}
          </div>
          <WidgetSkeleton>
            <RowsSkeleton />
          </WidgetSkeleton>
          <WidgetSkeleton>
            <CollectSkeleton />
          </WidgetSkeleton>
        </div>
      ))}
    </div>
  )
}

/** A column heading over the gifts or the tours half of Today. */
function ColumnHeading({ id, title }: { id: string, title: string }) {
  return (
    <h2 className="text-heading" id={id}>
      {title}
    </h2>
  )
}

/**
 * M02 Overview › Today (owner review 15.10.2026) as a bento: gifts on the left, tours on the
 * right, each row's boxes the same height (tasks, the next pickups or departures, then what
 * is still to collect). A shop without tours shows the gifts half only.
 */
export function TodayOverview() {
  const { t } = useLocale()
  const today = useMerchantToday()
  const hasTours = useTourRecords(data => data.tours.length > 0)
  const isLoading = useSimulatedLoading()
  const alerts = today.tiles.filter(
    tile => (tile.id === 'overdue' || tile.id === 'owing') && tile.count > 0,
  )
  const strip = today.tiles.filter(
    tile => tile.id !== 'overdue' && tile.id !== 'owing',
  )

  useOverdueCheck()

  if (isLoading)
    return <TodaySkeleton />

  return (
    <div className="flex flex-col gap-4">
      {alerts.length > 0 && (
        <ul className="flex flex-col divide-y divide-separator overflow-hidden rounded-3xl bg-surface shadow-surface">
          {alerts.map(a => (
            <li key={a.id}>
              <AlertRow {...a} />
            </li>
          ))}
        </ul>
      )}
      {hasTours
        ? (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-x-6">
              <div className="hidden lg:block">
                <ColumnHeading id="today-gifts" title={t('salesOverview.gifts')} />
              </div>
              <div className="hidden lg:block">
                <ColumnHeading
                  id="today-tours-column"
                  title={t('salesOverview.tours')}
                />
              </div>
              {/* Phones read gifts, then tours (order-*); from 1024px the halves sit side by side. */}
              <h2 className="order-1 text-heading lg:hidden">
                {t('salesOverview.gifts')}
              </h2>
              <ul className="order-2 grid auto-rows-fr grid-cols-2 gap-3 lg:order-none lg:gap-4">
                {strip.map(tile => (
                  <li key={tile.id} className="min-w-0">
                    <Tile {...tile} />
                  </li>
                ))}
              </ul>
              <h2 className="order-5 text-heading lg:hidden">
                {t('salesOverview.tours')}
              </h2>
              <TourTaskTiles showAll className="order-6 lg:order-none lg:gap-4" />
              <div className="order-3 flex lg:order-none [&>section]:flex-1">
                <PickupsWidget {...today.pickups} />
              </div>
              <div className="order-7 flex lg:order-none [&>section]:flex-1">
                <NextDeparturesWidget className="" />
              </div>
              <div className="order-4 flex lg:order-none [&>section]:flex-1">
                <CollectWidget {...today.collect} />
              </div>
              <div className="order-8 flex lg:order-none [&>section]:flex-1">
                <TourCollectWidget className="" />
              </div>
            </div>
          )
        : (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-x-6">
              <ul className="grid auto-rows-fr grid-cols-2 gap-3 lg:col-span-2 lg:grid-cols-4 lg:gap-4">
                {strip.map(tile => (
                  <li key={tile.id} className="min-w-0">
                    <Tile {...tile} />
                  </li>
                ))}
              </ul>
              <div className="flex [&>section]:flex-1">
                <PickupsWidget {...today.pickups} />
              </div>
              <div className="flex [&>section]:flex-1">
                <CollectWidget {...today.collect} />
              </div>
            </div>
          )}
    </div>
  )
}
