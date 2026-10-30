import type { Position } from './sample'
import type { LinkReader } from './use-link-reader'
import type { MapPickerControls } from '@/features/places/components/map-picker'

import { useRef, useState } from 'react'

import { RecenterIcon, TrashIcon } from '@/components/icons'
import { MapControlButton, MapControlGroup } from '@/components/map-controls'
import { useLocale } from '@/contexts/locale-context'
import { MapPicker } from '@/features/places/components/map-picker'
import { copy } from './copy'
import { LinkField, LocationBlock, MapFailed } from './parts'

/** Option C: the link as a normal field with its help line, a 12 px gap, then the map in its own frame with recenter and remove as a small control group. */
export function OptionC({ position, onPlace, onRemove, reader }: {
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
      <div className="flex flex-col gap-3">
        <LinkField reader={reader} />
        {failed
          ? <MapFailed />
          : (
              <MapPicker
                className="h-72 lg:h-80"
                controlsRef={pickerRef}
                lat={position?.lat ?? null}
                lng={position?.lng ?? null}
                overlay={(
                  <div className="absolute end-3 top-3">
                    <MapControlGroup label={t('places.map.label')}>
                      <MapControlButton icon={RecenterIcon} label={copy.recenter} onPress={() => pickerRef.current?.recenter()} />
                      {position && <MapControlButton icon={TrashIcon} label={t('places.map.clear')} tone="danger" onPress={onRemove} />}
                    </MapControlGroup>
                  </div>
                )}
                onFailed={() => setFailed(true)}
                onPlace={({ lat, lng }) => onPlace({ lat, lng })}
              />
            )}
      </div>
    </LocationBlock>
  )
}
