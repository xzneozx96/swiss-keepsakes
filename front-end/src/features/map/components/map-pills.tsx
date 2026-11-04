import { Button } from '@heroui/react'

import { BulletListIcon, FilterIcon, PickupIcon } from '@/components/icons'
import { useMap } from '@/components/map/map-context'
import { useLocale } from '@/contexts/locale-context'
import { MapControlsSkeleton } from './map-skeleton'

export type MapPillsView = 'map' | 'list'

/** The Categories and Map or List buttons over the map: skeletons while the map draws or the places are on the way, nothing when there are none. */
export function MapPills({ chosenCount, dataPending, hasPins, view, onFilter, onView }: {
  chosenCount: number
  dataPending: boolean
  hasPins: boolean
  view: MapPillsView
  onFilter: () => void
  onView: () => void
}) {
  const { t } = useLocale()
  const { state, drawn } = useMap()

  if (state === 'loading' || !drawn || dataPending)
    return <MapControlsSkeleton />
  if (!hasPins)
    return null

  return (
    <div className="absolute inset-x-0 top-0 z-10 flex items-start gap-2 px-3 pt-3">
      <Button aria-haspopup="dialog" className="pill min-h-11 shadow-sm" size="sm" variant="secondary" onPress={onFilter}>
        <FilterIcon size={16} />
        {chosenCount > 0 ? t('map.categoriesCount', { count: chosenCount }) : t('map.categories')}
      </Button>
      <span className="flex-1" />
      <Button className="pill min-h-11 shadow-sm" size="sm" variant="secondary" onPress={onView}>
        {view === 'map' ? <BulletListIcon size={16} /> : <PickupIcon size={16} />}
        {t(view === 'map' ? 'map.view.list' : 'map.view.map')}
      </Button>
    </div>
  )
}
