import { Skeleton } from '@heroui/react'
import { Link } from '@tanstack/react-router'
import { useId } from 'react'

import { ErrorNotice } from '@/components/error-notice'
import { PickupIcon } from '@/components/icons'
import { useLocale } from '@/contexts/locale-context'
import { categoryIconComponents } from '@/features/categories/lib/category-icons'
import { useMapData } from '@/features/map/api/queries'
import { serviceTiles } from '../lib/service-tiles'
import { SectionHeading } from './section-heading'

const TILE = 'flex min-h-[78px] w-full flex-col items-start justify-between gap-2 rounded-2xl bg-surface p-3 text-start shadow-surface'
const GRID = 'grid grid-cols-3 gap-2'

/** The grid of the block while the map reads load: the same three columns and tile boxes, an icon and a name line in each. */
function TilesSkeleton() {
  return (
    <ul aria-hidden className={GRID} data-skeleton="service-tiles">
      {Array.from({ length: 6 }, (_, index) => (
        <li key={index} className="flex">
          <div className={TILE}>
            <Skeleton className="size-[22px] rounded-md" />
            <Skeleton className="h-4 w-16 rounded-md" />
          </div>
        </li>
      ))}
    </ul>
  )
}

/**
 * "Sorted before you unpack": the map categories with Show on the home on, in the merchant's order, each a tile that opens the map
 * filtered to that category and its sub-categories. A category with no published place has no tile; with no tile the block is
 * not drawn. No count is printed. The read is the guest map's own (one cached list), so a failure here is shown here only.
 */
export function ServiceTiles() {
  const { t, language } = useLocale()
  const headingId = useId()
  const { categories, pins, isPending, isFailed, retry } = useMapData(language)
  const tiles = serviceTiles(categories, pins, language)

  if (!isPending && !isFailed && tiles.length === 0)
    return null

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-3">
      <SectionHeading body={t('homePage.services.body')} id={headingId} title={t('homePage.services.title')} />
      {isFailed
        ? <ErrorNotice compact message={t('homePage.services.failed')} onRetry={retry} />
        : isPending
          ? <TilesSkeleton />
          : (
              <ul className={GRID}>
                {tiles.map((tile) => {
                  const Icon = tile.icon ? categoryIconComponents[tile.icon] : PickupIcon

                  return (
                    <li key={tile.id} className="flex">
                      <Link
                        className={`${TILE} outline-none focus-visible:focus-ring motion-safe:transition-transform motion-safe:active:scale-[0.97]`}
                        params={{ lang: language }}
                        search={{ category: tile.slug }}
                        to="/$lang/map"
                      >
                        <span aria-hidden className="text-accent">
                          <Icon size={22} />
                        </span>
                        <span className="flex flex-col gap-0.5">
                          <span className="text-[13px] leading-4 font-semibold text-balance" lang={tile.nameLanguage ?? undefined}>{tile.name}</span>
                          {tile.nameLanguage && (
                            <span className="w-fit rounded-full bg-surface-secondary px-2 py-0.5 text-[11px] leading-4 font-medium text-muted">
                              {t(`map.card.onlyIn.${tile.nameLanguage}`)}
                            </span>
                          )}
                        </span>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            )}
    </section>
  )
}
