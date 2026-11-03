import type { StoryGroupDetail } from '@sk/api-contract'
import type { StoryFields } from '../lib/draft'
import type { GroupFields } from '../lib/group-fields'
import type { StoryLanguage } from '../lib/search-params'

import { Button } from '@heroui/react'
import { storyBodyPinIds } from '@sk/domain/content'
import { useState } from 'react'

import { PickupIcon, TrashIcon } from '@/components/icons'
import { Media } from '@/components/media'
import { useLocale } from '@/contexts/locale-context'
import { usePinOptions } from '../hooks/use-pin-options'
import { placesSummary } from '../lib/details-summary'
import { LinkedRowsSkeleton } from './linked-rows-skeleton'
import { CollapsibleCard } from './story-details-panel'
import { PlacesSheet } from './story-places-sheet'

/**
 * The pins the story is about (shared by both languages): one row per saved id, in the order they were chosen, and a button
 * that opens the picker. A pin that is a draft or hidden says so; an id the pin list no longer has is an "Unknown pin" row
 * that can be removed. A note names pins linked in the text that are not tagged here (a pin link does not tag the place).
 */
export function PlacesCard({ storeId, group, language, body, onChange }: {
  storeId: string
  group: StoryGroupDetail
  language: StoryLanguage
  body: StoryFields['body']
  onChange: (patch: Partial<GroupFields>) => void
}) {
  const { t } = useLocale()
  const { pins, isLoading, isError } = usePinOptions(storeId, language)
  const [sheetOpen, setSheetOpen] = useState(false)
  const byId = new Map(pins.map(pin => [pin.id, pin]))
  const nameOf = (id: string) => byId.get(id)?.name ?? t('storyMedia.pin.unknown')
  const untagged = isLoading || isError
    ? []
    : storyBodyPinIds(body as Parameters<typeof storyBodyPinIds>[0]).filter(id => !group.placeIds.includes(id) && byId.has(id))

  return (
    <CollapsibleCard icon={PickupIcon} id="pins" summary={isLoading ? '' : placesSummary(t, group.placeIds.map(nameOf))} title={t('storyLists.places.title')}>
      <p className="text-xs text-pretty text-muted">{t('storyLists.places.help')}</p>
      {isLoading && group.placeIds.length > 0 && <LinkedRowsSkeleton count={Math.min(group.placeIds.length, 5)} grip={false} />}
      {!isLoading && group.placeIds.length > 0 && (
        <ul aria-label={t('storyLists.places.list')} className="flex flex-col">
          {group.placeIds.map((id) => {
            const pin = byId.get(id)
            const name = nameOf(id)

            return (
              <li key={id} className="flex items-center gap-2 py-1.5">
                <Media alt="" className="size-11 shrink-0 rounded-xl" photo={pin?.photo ?? undefined}>
                  {!pin?.photo && <PickupIcon aria-hidden className="absolute inset-0 m-auto text-foreground/60" size={20} />}
                </Media>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-sm font-medium" title={name}>{name}</span>
                  {pin && pin.status !== 'published' && <span className="truncate text-xs text-muted">{t('storyLists.places.notPublished')}</span>}
                </span>
                <Button
                  isIconOnly
                  aria-label={t('storyLists.remove', { name })}
                  className="shrink-0 text-danger max-lg:size-11"
                  size="sm"
                  variant="tertiary"
                  onPress={() => onChange({ placeIds: group.placeIds.filter(item => item !== id) })}
                >
                  <TrashIcon aria-hidden size={16} />
                </Button>
              </li>
            )
          })}
        </ul>
      )}
      {untagged.length > 0 && <p className="text-xs text-pretty text-muted">{t('storyLists.places.untagged', { names: untagged.map(nameOf).join(', ') })}</p>}
      <Button className="self-start max-lg:h-11" size="sm" variant="secondary" onPress={() => setSheetOpen(true)}>
        {t('storyLists.places.choose')}
      </Button>
      {sheetOpen && (
        <PlacesSheet
          language={language}
          storeId={storeId}
          value={group.placeIds}
          onClose={() => setSheetOpen(false)}
          onSave={(placeIds) => {
            onChange({ placeIds })
            setSheetOpen(false)
          }}
        />
      )}
    </CollapsibleCard>
  )
}
