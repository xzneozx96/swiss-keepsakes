import type { Position } from './sample'
import type { LinkReader } from './use-link-reader'

import { useState } from 'react'

import { MapPicker } from '@/features/places/components/map-picker'
import { LinkField, LocationBlock, MapFailed } from './parts'

/** Option C: the link as a normal field with its help line, a 12 px gap, then the map in its own frame with recenter and remove as a small control group. */
export function OptionC({ position, onPlace, onRemove, reader }: {
  position: Position | null
  onPlace: (position: Position) => void
  onRemove: () => void
  reader: LinkReader
}) {
  const [failed, setFailed] = useState(false)

  return (
    <LocationBlock>
      <div className="flex flex-col gap-3">
        <LinkField reader={reader} />
        {failed
          ? <MapFailed />
          : (
              <MapPicker
                className="h-72 lg:h-80"
                lat={position?.lat ?? null}
                lng={position?.lng ?? null}
                onFailed={() => setFailed(true)}
                onPlace={({ lat, lng }) => onPlace({ lat, lng })}
                onRemove={onRemove}
              />
            )}
      </div>
    </LocationBlock>
  )
}
