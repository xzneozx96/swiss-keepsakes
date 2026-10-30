import type { Position } from './sample'
import type { LinkReader } from './use-link-reader'
import type { MapPickerControls } from '@/features/places/components/map-picker'

import { Button } from '@heroui/react'
import { useRef, useState } from 'react'

import { RecenterIcon, TrashIcon } from '@/components/icons'
import { useLocale } from '@/contexts/locale-context'
import { MapPicker } from '@/features/places/components/map-picker'
import { copy } from './copy'
import { LinkField, LocationBlock, MapFailed } from './parts'
import { knownPlaceName } from './sample'

/** The place as read out: the street name when it is known, the coordinates muted under it, or nothing yet. */
function ReadOut({ position }: { position: Position | null }) {
  const name = knownPlaceName(position, copy.placeName)

  return (
    <div aria-live="polite" className="flex min-h-12 flex-col justify-center gap-0.5" data-testid="location-readout">
      {position
        ? (
            <>
              {name && <p className="text-sm font-medium">{name}</p>}
              <p className="text-xs text-muted tabular-nums">{copy.coordinates(position.lat, position.lng)}</p>
            </>
          )
        : <p className="text-sm text-muted">{copy.noPosition}</p>}
    </div>
  )
}

/** Option B: the map at the left, a panel at the right with the field, the read-out and two quiet buttons; on a phone the panel stacks over the map. */
export function OptionB({ position, onPlace, onRemove, reader }: {
  position: Position | null
  onPlace: (position: Position) => void
  onRemove: () => void
  reader: LinkReader
}) {
  const { t } = useLocale()
  const [failed, setFailed] = useState(false)
  const pickerRef = useRef<MapPickerControls>(null)

  return (
    <LocationBlock>
      <div className="@container">
        <div className="flex flex-col gap-4 @md:flex-row @md:items-stretch">
          <div className="flex min-w-0 flex-col gap-3 @md:order-last @md:w-2/5">
            <LinkField reader={reader} />
            <ReadOut position={position} />
            {reader.line && <p aria-live="polite" className={`text-sm ${reader.line.tone === 'success' ? 'text-success' : reader.line.tone === 'danger' ? 'text-danger' : 'text-muted'}`}>{reader.line.text}</p>}
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="tertiary" onPress={() => pickerRef.current?.recenter()}>
                <RecenterIcon aria-hidden size={16} />
                {copy.recenter}
              </Button>
              {position && (
                <Button size="sm" variant="tertiary" onPress={onRemove}>
                  <TrashIcon aria-hidden size={16} />
                  {t('places.map.clear')}
                </Button>
              )}
            </div>
          </div>
          <div className="min-w-0 @md:w-3/5">
            {failed
              ? <MapFailed />
              : (
                  <MapPicker
                    className="h-72 @md:h-full @md:min-h-80"
                    controlsRef={pickerRef}
                    lat={position?.lat ?? null}
                    lng={position?.lng ?? null}
                    onFailed={() => setFailed(true)}
                    onPlace={({ lat, lng }) => onPlace({ lat, lng })}
                  />
                )}
          </div>
        </div>
      </div>
    </LocationBlock>
  )
}
