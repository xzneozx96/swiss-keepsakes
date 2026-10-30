import type { PublicMapItem } from '@sk/api-contract'
import type { Language } from '@sk/domain/shared'
import type { PlaceForm } from '../lib/form'
import type { CardExtras } from '@/features/map/components/place-card'

import { useMemo, useState } from 'react'

import { MapCredits } from '@/components/aerial-map/map-credits'
import { useAerialMap } from '@/components/aerial-map/use-aerial-map'
import { IPhoneMockup } from '@/components/iphone-mockup'
import { LocaleOverride, useLocale } from '@/contexts/locale-context'
import { useCategories } from '@/features/categories/api/queries'
import { PinMap } from '@/features/map/components/pin-map'
import { PlaceCardRow } from '@/features/map/components/place-card'
import { MapStatusLayer } from '@/features/map/components/status-layer'
import { CARD_ROW_BOTTOM, CARD_ROW_HEIGHT, CONTROLS } from '@/features/map/lib/layout'
import { useMedia, useStoryOptions } from '../api/queries'
import { photoIds } from '../lib/form'
import { PREVIEW_PIN_ID, previewItem, tipIn } from '../lib/preview'

const NO_PINS: PublicMapItem[] = []
const NO_LANGUAGES: readonly Language[] = []
const SELECTED = new Set([PREVIEW_PIN_ID])
const noop = () => undefined

/** The address of the first photo: the smallest copy wide enough for the card's 84 px thumbnail on a sharp screen. */
function useCoverSrc(storeId: string, mediaId: string | undefined) {
  const media = useMedia(storeId, mediaId ?? null)
  const copy = media.data?.variants.find(variant => variant.width >= 160) ?? media.data?.variants.at(-1)

  return copy?.url ?? media.data?.publicUrl ?? undefined
}

/** The guest map the way a guest sees this place: its pin selected and its card open, drawn by the guest map's own parts. */
function DraftMap({ form, storeId, language }: { form: PlaceForm, storeId: string, language: Language }) {
  const { t } = useLocale()
  const stories = useStoryOptions(storeId)
  const cover = useCoverSrc(storeId, photoIds(form)[0])
  const categories = useCategories(storeId, 'map')
  const [now] = useState(() => new Date())
  const storyLanguages = stories.data?.items.find(option => option.groupId === form.mainStoryGroupId)?.publishedLanguages ?? NO_LANGUAGES
  const untitled = t('places.row.untitled')
  const { item, located } = useMemo(() => previewItem(form, language, { storyLanguages, untitled, now }), [form, language, storyLanguages, untitled, now])
  const extras = useMemo<CardExtras>(() => {
    const names = new Map((categories.data?.items ?? []).map(category => [category.id, category.name[language] ?? category.name[language === 'en' ? 'de' : 'en'] ?? '']))

    return { tip: tipIn(form, language), categories: form.categoryIds.flatMap(id => names.get(id) || []) }
  }, [categories.data, form, language])
  const pins = useMemo(() => (located ? [item] : NO_PINS), [item, located])
  const { containerRef, map, maplibre, state, drawn, retry } = useAerialMap({
    options: {
      center: located ? [item.longitude, item.latitude] : [8.3068, 47.0535],
      zoom: 16,
      minZoom: 12,
      maxZoom: 18.5,
      interactive: false,
    },
  })

  return (
    <div className="relative h-full overflow-hidden bg-[#c9d3c6]" inert={state !== 'error'}>
      {/* MapLibre makes its container `position: relative`, so it sits in a sized box. */}
      <div className="absolute inset-0">
        <div ref={containerRef} className="size-full" />
      </div>
      <PinMap
        filtered={false}
        insetBottom={CARD_ROW_BOTTOM + CARD_ROW_HEIGHT}
        insetTop={CONTROLS}
        litIds={SELECTED}
        map={map}
        maplibre={maplibre}
        photoOf={() => cover}
        pins={pins}
        selectedId={located ? PREVIEW_PIN_ID : undefined}
        onSelect={noop}
      />
      <MapStatusLayer status={state === 'error' ? 'failed' : drawn ? undefined : 'map-loading'} onRetry={retry} />
      <MapCredits className="absolute start-3 top-14 z-10 max-w-[calc(100%-6rem)]" />
      <PlaceCardRow extrasOf={() => extras} photoOf={() => cover} pins={[item]} selectedId={item.id} onClose={noop} onSelect={noop} />
    </div>
  )
}

/**
 * The review's phone: the draft on the guest map in the iPhone mockup, in the language chosen at its side. The
 * mockup, MapLibre and the map parts load only when the review opens (`React.lazy` in `step-review.tsx`).
 */
export default function PlacePreview({ form, storeId, language, label }: { form: PlaceForm, storeId: string, language: Language, label: string }) {
  return (
    <IPhoneMockup fitPage label={label} reserve={104}>
      <LocaleOverride language={language}>
        <DraftMap form={form} language={language} storeId={storeId} />
      </LocaleOverride>
    </IPhoneMockup>
  )
}
