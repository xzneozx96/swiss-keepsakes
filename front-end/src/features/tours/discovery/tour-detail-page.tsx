import type { Tour } from '@sk/domain/bookings'

import { Button } from '@heroui/react'
import { firstPhoto, openingText, pickDoc, pickText } from '@sk/domain/shared'
import { useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { EmptyState } from '@/components/empty-state'
import {
  InfoIcon,
  TourIcon,
} from '@/components/icons'
import { BackButton, CompactBar } from '@/components/layout/cart-button'
import { LanguageButton } from '@/components/layout/language-button'
import {
  ListingDetailHeader,
  ListingFavouriteButton,
} from '@/components/listings/listing-detail-header'
import { Media } from '@/components/media'
import { PhotoGallery } from '@/components/photo-gallery'
import { useLocale } from '@/contexts/locale-context'
import { StorySheet } from '@/features/catalog/components/story-sheet'
import { useFavourite } from '@/features/catalog/hooks/use-favourites'
import { TourComments } from '@/features/tours/discovery/tour-comments'
import { TourItinerarySheet } from '@/features/tours/discovery/tour-itinerary-sheet'
import { TourKeepsakes } from '@/features/tours/discovery/tour-keepsakes'
import { useTourComments } from '@/features/tours/hooks/use-tour-comments'
import { useTours } from '@/features/tours/hooks/use-tours'
import { useBack } from '@/hooks/use-back'
import { useScrolledPast } from '@/hooks/use-scrolled-past'

export function TourDetailPage({ slug }: { slug: string }) {
  const { tours } = useTours()
  const { language, t } = useLocale()
  const tour = tours.find(item => item.slug === slug)

  if (!tour?.published) {
    return (
      <EmptyState
        action={{ label: t('tourDiscovery.browse'), to: '/$lang/tours', params: { lang: language } }}
        icon={TourIcon}
        message={t('tourDiscovery.notFound')}
      />
    )
  }

  return <TourDetail tour={tour} />
}

/**
 * C09. `preview` is M13's guest preview: the same page for a draft, with every action that
 * would leave the page or write demo state (back, save, book) switched off.
 */
export function TourDetail({
  tour,
  preview = false,
}: {
  tour: Tour
  preview?: boolean
}) {
  const { t, language, intlLocale } = useLocale()
  const navigate = useNavigate()
  const { comments, lang: commentsLang } = useTourComments(tour.id)
  const { saved, toggle } = useFavourite(`tour:${tour.id}`)
  const favourite = {
    isSaved: saved,
    onToggle: () => {
      if (!preview)
        toggle()
    },
    label: t(saved ? 'card.unsave' : 'card.save', {
      name: pickText(tour.name, language).text,
    }),
  }
  const plural = (count: number) =>
    new Intl.PluralRules(intlLocale).select(count) === 'one' ? 'one' : 'other'
  const hoursText = new Intl.NumberFormat(intlLocale).format(tour.durationMinutes / 60)
  const [photoEnd, scrolledPast] = useScrolledPast<HTMLDivElement>()
  const name = pickText(tour.name, language)
  const text = (value: Tour['name']) => pickText(value, language).text
  const [storyOpen, setStoryOpen] = useState(false)
  // The page's one language notice (below) covers the story too.
  const storyBody = tour.longStory && pickDoc(tour.longStory.body, language)
  const longStory = tour.longStory
    && storyBody && {
    label: t('detail.story.label'),
    title: text(tour.longStory.title),
    body: storyBody.doc,
  }
  const goBack = useBack(() => void navigate({ to: '/$lang/tours', params: { lang: language }, replace: true }))
  const back = () => {
    if (!preview)
      goBack()
  }
  const fallback = [
    tour.name,
    tour.summary,
    tour.description,
    ...(tour.longStory ? [tour.longStory.title] : []),
    // The body counts as text in the language it is written in (rich text, not a string).
    ...(storyBody ? [{ [storyBody.language]: 'story' }] : []),
    tour.meetingPoint,
    tour.conditions,
    ...tour.itinerary.flatMap(stop => [stop.name, stop.description]),
    ...(tour.sections ?? []).flatMap(section => [
      section.title,
      ...(section.body ? [section.body] : []),
      ...(section.items ?? []).flatMap(item => [
        item.text,
        ...(item.detail ? [item.detail] : []),
      ]),
    ]),
  ]
    .map(value => pickText(value, language))
    .find(value => value.isFallback)

  return (
    <div className="flex flex-1 flex-col">
      <CompactBar
        leading={<BackButton label={t('tourDiscovery.back')} onPress={back} />}
        title={name.text}
        visible={scrolledPast}
      >
        <ListingFavouriteButton favourite={favourite} tone="bar" />
        <LanguageButton tone="bar" />
      </CompactBar>
      <PhotoGallery
        className="aspect-[4/3.4]"
        labels={{
          gallery: t('tourDiscovery.gallery', { name: name.text }),
          photo: (n, count) => t('tourDiscovery.photo', { n, count }),
          previous: t('tourDiscovery.previous'),
          next: t('tourDiscovery.nextPhoto'),
          close: t('tourDiscovery.close'),
        }}
        photos={tour.photos}
      >
        <div className="pointer-events-none absolute inset-x-4 top-[calc(env(safe-area-inset-top,0px)+12px)] z-10 flex items-center gap-2 [&>*]:pointer-events-auto">
          <BackButton
            label={t('tourDiscovery.back')}
            tone="pill"
            onPress={back}
          />
          <span className="flex-1" />
          <ListingFavouriteButton favourite={favourite} tone="pill" />
          <LanguageButton tone="pill" />
        </div>
      </PhotoGallery>
      <div ref={photoEnd} aria-hidden className="h-px" />
      <div className="relative -mt-6 flex flex-1 flex-col rounded-t-3xl bg-background px-6 pt-7 pb-5">
        <ListingDetailHeader
          name={name.text}
          stats={[
            ...(tour.itinerary.length > 0
              ? [{
                  value: String(tour.itinerary.length),
                  label: t(`tourDetail.stops.${plural(tour.itinerary.length)}`),
                }]
              : []),
            {
              value: t('tourDiscovery.duration', { hours: hoursText }),
              label: t('tourDiscovery.durationLabel'),
            },
            ...(comments.length > 0
              ? [{
                  value: String(comments.length),
                  label: t(`tourDetail.commentsLabel.${plural(comments.length)}`),
                }]
              : []),
          ]}
          subtitle={text(tour.summary)}
        />
        {fallback && (
          <p className="flex items-start gap-2 border-t border-separator pt-7 text-sm">
            <InfoIcon aria-hidden className="mt-0.5 shrink-0" size={16} />
            {t(
              fallback.language === 'en'
                ? 'tourDiscovery.onlyInEnglish'
                : 'tourDiscovery.onlyInGerman',
            )}
          </p>
        )}
        <section
          className={`flex flex-col gap-3 py-7 ${fallback ? '' : 'border-t border-separator'}`}
        >
          <h2 className="font-serif text-title">{t('tourDiscovery.about')}</h2>
          <p className="text-body">{text(tour.description)}</p>
          {longStory && (
            <>
              <button
                className="mt-2 flex flex-col gap-3 rounded-3xl text-start outline-none focus-visible:focus-ring"
                type="button"
                onClick={() => setStoryOpen(true)}
              >
                <Media
                  alt=""
                  className="aspect-[16/9] w-full rounded-3xl"
                  photo={firstPhoto(longStory.body)}
                />
                <span className="text-label tracking-wide text-muted uppercase">
                  {longStory.label}
                </span>
                <span className="font-serif text-title text-balance">
                  {longStory.title}
                </span>
                <span className="line-clamp-3 text-body text-muted">
                  {openingText(longStory.body)}
                </span>
              </button>
              <Button
                fullWidth
                className="mt-1"
                size="lg"
                variant="secondary"
                onPress={() => setStoryOpen(true)}
              >
                {t('detail.story.read')}
              </Button>
              <StorySheet
                closeLabel={t('detail.sheet.close')}
                isOpen={storyOpen}
                story={longStory}
                onOpenChange={setStoryOpen}
              />
            </>
          )}
        </section>
        {/* A tour added in M13 has no stops yet (no map positions): no itinerary section. */}
        {tour.itinerary.length > 0 && <TourItinerarySheet tour={tour} />}
        <TourComments comments={comments} lang={commentsLang} tourName={name.text} />
        <TourKeepsakes />
      </div>
    </div>
  )
}
