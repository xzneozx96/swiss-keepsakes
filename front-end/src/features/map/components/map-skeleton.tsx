import { Skeleton } from '@heroui/react'

/** The two controls of the screen (Categories, Map or List) while the map and its places load: the same pills at the same place. */
export function MapControlsSkeleton() {
  return (
    <div aria-hidden className="absolute inset-x-0 top-0 z-10 flex items-start gap-2 px-3 pt-3" data-skeleton="map-controls">
      <Skeleton className="h-8 w-28 rounded-full" />
      <span className="flex-1" />
      <Skeleton className="h-8 w-20 rounded-full" />
    </div>
  )
}
