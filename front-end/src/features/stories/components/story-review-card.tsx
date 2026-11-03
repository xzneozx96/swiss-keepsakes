import type { StoryGroupDetail } from '@sk/api-contract'
import type { StoryFields } from '../lib/draft'
import type { GroupFields } from '../lib/group-fields'
import type { StoryLanguage } from '../lib/search-params'

import { Button, Label, Switch } from '@heroui/react'
import { formatShortDate } from '@sk/domain/shared'
import { useState } from 'react'

import { CheckIcon } from '@/components/icons'
import { useLocale } from '@/contexts/locale-context'
import { zurichToday } from '@/features/map/lib/next-date'
import { Field } from '@/features/places/components/fields'
import { usePinOptions } from '../hooks/use-pin-options'
import { reviewSummary } from '../lib/details-summary'
import { MAX_PLACES } from '../lib/linked-lists'
import { PinChoiceSheet } from './pin-choice-sheet'
import { CollapsibleCard } from './story-details-panel'

/**
 * Whether the story is an editorial review: the switch, the one place it is about and the day the facts were checked.
 * The kind and the place are shared by both languages and save together in one group save, so a review switched on with
 * no place yet stays in the editor (the card says it stops publishing) until a place is chosen. The check date belongs to
 * the language version. A day after today is refused and not saved.
 */
export function ReviewCard({ storeId, group, language, fields, onGroupChange, onFieldsChange }: {
  storeId: string
  group: StoryGroupDetail
  language: StoryLanguage
  fields: StoryFields
  onGroupChange: (patch: Partial<GroupFields> | ((current: GroupFields) => Partial<GroupFields>)) => void
  onFieldsChange: (patch: Partial<StoryFields>) => void
}) {
  const { t, intlLocale } = useLocale()
  const isReview = group.kind === 'editorial_review'
  const placeId = group.subjectPlaceId
  const { pins, isLoading } = usePinOptions(storeId, language, placeId !== null)
  const [today] = useState(() => zurichToday(new Date()))
  // A day after today is shown with its error and never reaches the draft.
  const [refused, setRefused] = useState<string>()
  const [sheetOpen, setSheetOpen] = useState(false)
  // The place a review names joins the story's places; at the cap the choice is refused, as in the Places sheet.
  // Only the refused pin is kept: the message shows while the list is still at the cap without it.
  const [capRefused, setCapRefused] = useState<string>()
  const full = capRefused !== undefined && group.placeIds.length >= MAX_PLACES && !group.placeIds.includes(capRefused)
  const placeName = placeId ? (pins.find(pin => pin.id === placeId)?.name ?? t('storyMedia.pin.unknown')) : undefined
  const summary = placeId && isLoading ? '' : reviewSummary(t, { isReview, placeName, checkedOn: fields.checkedOn, formatDay: day => formatShortDate(day, today, intlLocale) })

  return (
    <CollapsibleCard icon={CheckIcon} id="review" summary={summary} title={t('storyDetails.review.title')}>
      <Switch
        className="min-h-11 lg:min-h-9"
        isSelected={isReview}
        onChange={(on) => {
          setCapRefused(undefined)
          onGroupChange(on ? { kind: 'editorial_review' } : { kind: 'story', subjectPlaceId: null })
        }}
      >
        <Switch.Content className="items-center">
          <Switch.Control>
            <Switch.Thumb />
          </Switch.Control>
          <Label className="text-sm">{t('storyDetails.review.switch')}</Label>
        </Switch.Content>
      </Switch>
      <p className="-mt-2 text-xs text-pretty text-muted">{t('storyDetails.review.help')}</p>
      {isReview && (
        <>
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">{t('storyDetails.review.place')}</span>
            {placeName && <span className="text-sm">{placeName}</span>}
            <Button className="self-start max-lg:h-11" size="sm" variant="secondary" onPress={() => setSheetOpen(true)}>
              {t(placeId ? 'storyDetails.review.placeChange' : 'storyDetails.review.placeChoose')}
            </Button>
            {full && <p className="text-xs text-pretty text-danger">{t('storyLists.places.full', { count: MAX_PLACES })}</p>}
          </div>
          <Field
            error={refused ? 'storyDetails.review.future' : undefined}
            label={t('storyDetails.review.date')}
            type="date"
            value={refused ?? fields.checkedOn ?? ''}
            onChange={(day) => {
              const future = day > today

              setRefused(future ? day : undefined)
              if (!future)
                onFieldsChange({ checkedOn: day === '' ? null : day })
            }}
          />
          <PinChoiceSheet
            current={placeId ?? undefined}
            doneLabel={t('storyDetails.review.placeDone')}
            isOpen={sheetOpen}
            language={language}
            storeId={storeId}
            title={t('storyDetails.review.placeSheet')}
            onChoose={(pin) => {
              const atCap = !group.placeIds.includes(pin.id) && group.placeIds.length >= MAX_PLACES

              setCapRefused(atCap ? pin.id : undefined)
              if (!atCap) {
                onGroupChange(current => ({
                  kind: 'editorial_review',
                  subjectPlaceId: pin.id,
                  placeIds: current.placeIds.includes(pin.id) ? current.placeIds : [...current.placeIds, pin.id],
                }))
              }
            }}
            onClose={() => setSheetOpen(false)}
          />
        </>
      )}
    </CollapsibleCard>
  )
}
