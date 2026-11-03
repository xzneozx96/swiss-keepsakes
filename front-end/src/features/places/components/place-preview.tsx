import type { PublicMapItem } from '@sk/api-contract'
import type { Language } from '@sk/domain/shared'
import type { PlaceForm } from '../lib/form'
import type { CardExtras } from '@/features/map/components/place-card'

import { useQueries } from '@tanstack/react-query'
import { useMemo, useState } from 'react'

import { IPhoneMockup } from '@/components/iphone-mockup'
import { MapView } from '@/components/map/map-view'
import { PhotoPin } from '@/components/map/pin-faces'
import { PinLayer } from '@/components/map/pin-layer'
import { LocaleOverride, useLocale } from '@/contexts/locale-context'
import { useCategories } from '@/features/categories/api/queries'
import { useDataClient } from '@/features/data-client'
import { PlaceCardRow } from '@/features/map/components/place-card'
import { PlaceSheet } from '@/features/map/components/place-sheet'
import { CARD_ROW_HEIGHT, CONTROLS } from '@/features/map/lib/layout'
import { mediaQueries, useMediaFile } from '@/features/media/api/queries'
import { useStoryOptions, useStoryVersion } from '../api/queries'
import { photoIds } from '../lib/form'
import { PREVIEW_PIN_ID, previewDetail, previewItem } from '../lib/preview'
import { StorySheet } from './story-sheet'

const NO_PINS: PublicMapItem[] = []
const NO_LANGUAGES: readonly Language[] = []
const noop = () => undefined
/** The card row leaves room under it for the credits in the corner (8 px and their two lines, 36 px, when unfolded): the preview has no tab bar or music button. */
const CARD_BOTTOM = 40
/** The credits sit in the map's bottom right corner (px from the edges), folded to the round ⓘ after the first touch. */
const CREDITS_BOTTOM = 8
const LUCERNE: [number, number] = [8.3068, 47.0535]
const PREVIEW_INSETS = { top: CONTROLS, bottom: CARD_BOTTOM + CARD_ROW_HEIGHT }

/** The address of the first photo: the smallest copy wide enough for the card's 84 px thumbnail on a sharp screen. */
function useCoverSrc(storeId: string, mediaId: string | undefined) {
  const media = useMediaFile(storeId, mediaId ?? null)
  const copy = media.data?.variants.find(variant => variant.width >= 160) ?? media.data?.variants.at(-1)

  return copy?.url ?? media.data?.publicUrl ?? undefined
}

/** The addresses of the draft's photos in the merchant's order, a copy wide enough for the sheet's carousel; a photo that is not ready yet is left out. */
function usePhotoSrcs(storeId: string, ids: string[]) {
  const client = useDataClient()

  return useQueries({
    queries: ids.map(id => mediaQueries.file(client, storeId, id)),
    combine: results => results.flatMap((result) => {
      const copy = result.data?.variants.find(variant => variant.width >= 800) ?? result.data?.variants.at(-1)
      const src = copy?.url ?? result.data?.publicUrl

      return src ? [{ src, alt: null }] : []
    }),
  })
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

    return { categories: form.categoryIds.flatMap(id => names.get(id) || []), mapsLink: form.mapsLink.trim() === '' ? null : form.mapsLink.trim() }
  }, [categories.data, form, language])
  const pins = useMemo(() => (located ? [item] : NO_PINS), [item, located])
  const [frame, setFrame] = useState<HTMLDivElement | null>(null)
  const [storyOpen, setStoryOpen] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)
  const photos = usePhotoSrcs(storeId, photoIds(form))
  const option = stories.data?.items.find(candidate => candidate.groupId === form.mainStoryGroupId)
  const storyTitle = option ? (option.title[language] ?? option.title[language === 'en' ? 'de' : 'en'] ?? '') : ''
  const detail = useMemo(
    () => previewDetail(form, language, { storyTitle, hasStory: storyLanguages.includes(language), photos, untitled, now }),
    [form, language, photos, storyTitle, storyLanguages, untitled, now],
  )
  // The story options carry no text: the sheet reads the version in the previewed language once it opens.
  const story = useStoryVersion(storeId, form.mainStoryGroupId, language, storyOpen)

  return (
    // `transform-gpu` makes this box the containing block of the sheet, which is `position: fixed`: it fills the phone's screen and not the page. HeroUI sets `--visual-viewport-height` inline on the sheet's backdrop to the page's window height, so a value set here would lose. The box is a size container, and `[data-sheet-screen]` in globals.css pins that variable on the backdrop to the box's own height: the backdrop fills the screen and `sheet-max` follows the phone's real size, whatever the window.
    <div ref={setFrame} className="relative h-full transform-gpu overflow-hidden" data-sheet-screen="">
      <MapView
        inert
        className="relative h-full"
        creditsBottom={CREDITS_BOTTOM}
        insets={PREVIEW_INSETS}
        interactive={false}
        label={t('map.heading')}
        overlay={(
          <PlaceCardRow bottom={CARD_BOTTOM} directions={located} extrasOf={() => extras} photoOf={() => cover} pins={[item]} selectedId={item.id} onMore={() => setMoreOpen(true)} onSelect={noop} />
        )}
        view={{ center: located ? [item.longitude, item.latitude] : LUCERNE, zoom: 16, minZoom: 12, maxZoom: 18.5 }}
      >
        <DraftPin cover={cover} located={located} pins={pins} />
      </MapView>
      <PlaceSheet
        container={frame ?? undefined}
        detail={detail}
        directions={located}
        isOpen={moreOpen}
        item={item}
        position={{ index: 0, count: 1 }}
        onClose={() => setMoreOpen(false)}
        onReadStory={() => {
          setMoreOpen(false)
          setStoryOpen(true)
        }}
        onStep={noop}
      />
      <StorySheet container={frame} error={story.error} isOpen={storyOpen} language={language} loading={story.isPending && story.fetchStatus !== 'idle'} text={story.data} title={storyTitle || item.title} onClose={() => setStoryOpen(false)} />
    </div>
  )
}

/** The pin of the draft, on the map around it. */
function DraftPin({ located, pins, cover }: { located: boolean, pins: PublicMapItem[], cover: string | undefined }) {
  const places = useMemo(() => pins.map(pin => ({ ...pin, coordinates: [pin.longitude, pin.latitude] as [number, number] })), [pins])

  return (
    <PinLayer
      followSelected
      pins={places}
      renderPin={(pin, state) => <PhotoPin dimmed={false} emphasized={false} id={pin.id} label={pin.title} title={pin.title} photoSrc={cover} selected={state.selected} onPress={noop} />}
      selectedId={located ? PREVIEW_PIN_ID : undefined}
    />
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
