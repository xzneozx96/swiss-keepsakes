import type { StoreCounts } from '../lib/store-counts'

import { Skeleton } from '@heroui/react'

import { ClockIcon, EmailIcon, ShopIcon, StatusSuccessIcon } from '@/components/icons'
import { StatCard } from '@/components/stat-card'
import { useLocale } from '@/contexts/locale-context'

/**
 * The four figures above A01's list, counted from the stores loaded so far. While more pages wait, the first tile
 * says "loaded so far", because every figure can still grow.
 */
export function StoreTiles({ counts, hasMore }: { counts: StoreCounts | undefined, hasMore: boolean }) {
  const { t } = useLocale()
  const tiles = [
    { id: 'total', icon: ShopIcon, label: t(hasMore ? 'stores.tiles.totalMore' : 'stores.tiles.total'), value: counts?.total },
    { id: 'waiting', icon: EmailIcon, label: t('stores.tiles.waiting'), value: counts?.waiting },
    { id: 'onboarding', icon: ClockIcon, label: t('stores.tiles.onboarding'), value: counts?.onboarding },
    { id: 'live', icon: StatusSuccessIcon, label: t('stores.tiles.live'), value: counts?.live },
  ]

  return (
    <dl aria-label={t('stores.tiles.label')} className="grid grid-cols-2 gap-3 lg:grid-cols-4" data-tiles>
      {tiles.map(tile => (
        <StatCard
          key={tile.id}
          isLarge
          icon={tile.icon}
          isMuted={tile.value === 0}
          label={tile.label}
          value={tile.value === undefined
            ? <Skeleton aria-hidden className="inline-block h-8 w-10 rounded-lg align-middle" />
            : <span data-tile={tile.id}>{tile.value}</span>}
        />
      ))}
    </dl>
  )
}
