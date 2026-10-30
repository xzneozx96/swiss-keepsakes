import type { Position } from './sample'
import type { LinkReader } from './use-link-reader'

import { useState } from 'react'

import { CheckIcon, LinkIcon, StatusDangerIcon, TrashIcon } from '@/components/icons'
import { MapControlButton, MapControlGroup } from '@/components/map-controls'
import { MapLinkPill } from '@/components/map-link-pill'
import { useLocale } from '@/contexts/locale-context'
import { MapPicker } from '@/features/places/components/map-picker'
import { LocationBlock, MapFailed } from './parts'

/** The answer as a small chip under the pill, over the map. */
function AnswerChip({ line }: { line: NonNullable<LinkReader['line']> }) {
  const Icon = line.tone === 'danger' ? StatusDangerIcon : CheckIcon
  const tone = line.tone === 'danger' ? 'text-danger' : line.tone === 'success' ? 'text-success' : 'text-muted'

  return (
    <p aria-live="polite" className={`pointer-events-auto flex w-fit max-w-[calc(100%-3.5rem)] items-start gap-1.5 rounded-2xl bg-overlay px-3 py-1.5 text-sm shadow-overlay ${tone}`}>
      {line.tone !== 'muted' && <Icon aria-hidden className="mt-0.5 shrink-0" size={14} />}
      <span className="text-foreground">{line.text}</span>
    </p>
  )
}

/** Option A: the map fills the card, the link is a pill floating on it, and removing the position is a round icon in the map controls. */
export function OptionA({ position, onPlace, onRemove, reader }: {
  position: Position | null
  onPlace: (position: Position) => void
  onRemove: () => void
  reader: LinkReader
}) {
  const { t } = useLocale()
  const [failed, setFailed] = useState(false)

  return (
    <LocationBlock>
      {failed
        ? <MapFailed />
        : (
            <MapPicker
              className="h-90"
              lat={position?.lat ?? null}
              lng={position?.lng ?? null}
              overlay={(
                <>
                  <div className="absolute inset-x-3 top-3 flex flex-col gap-2">
                    <MapLinkPill
                      clearLabel={t('places.mapsLink.clear')}
                      icon={LinkIcon}
                      inputMode="url"
                      isInvalid={reader.isInvalid}
                      label={t('places.mapsLink.label')}
                      placeholder="https://maps.app.goo.gl/…"
                      value={reader.value}
                      onChange={reader.handlers.onChange}
                      onBlur={reader.handlers.onBlur}
                      onClear={reader.clear}
                      onKeyDown={reader.handlers.onKeyDown}
                      onPaste={reader.handlers.onPaste}
                    />
                    {reader.line && <AnswerChip line={reader.line} />}
                  </div>
                  {position && (
                    <div className="absolute end-3 top-[3.75rem]">
                      <MapControlGroup label={t('places.map.label')}>
                        <MapControlButton icon={TrashIcon} label={t('places.map.clear')} tone="danger" onPress={onRemove} />
                      </MapControlGroup>
                    </div>
                  )}
                </>
              )}
              onFailed={() => setFailed(true)}
              onPlace={({ lat, lng }) => onPlace({ lat, lng })}
            />
          )}
    </LocationBlock>
  )
}
