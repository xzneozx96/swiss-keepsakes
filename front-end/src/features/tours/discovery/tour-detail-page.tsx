import type { Tour } from '@sk/domain/bookings'

import { Accordion, Button } from '@heroui/react'
import { firstPhoto, openingText, pickDoc, pickText } from '@sk/domain/shared'
import { ClientOnly, useNavigate } from '@tanstack/react-router'
import { lazy, Suspense, useState } from 'react'
import { EmptyState } from '@/components/empty-state'
import {
  ClockIcon,
  InfoIcon,
  PickupIcon,
  TourIcon,
} from '@/components/icons'
import { BackButton, CompactBar } from '@/components/layout/cart-button'
import { LanguageButton } from '@/components/layout/language-button'
import {
  ListingDetailHeader,
  ListingFavouriteButton,
} from '@/components/listings/listing-detail-header'
import { ListingReviews } from '@/components/listings/listing-reviews'
import { Media } from '@/components/media'
import { PhotoGallery } from '@/components/photo-gallery'
import { useLocale } from '@/contexts/locale-context'
import { usePickupPlaces } from '@/features/catalog/api/queries'
import { SellerRow } from '@/features/catalog/components/seller-row'
import { StorySheet } from '@/features/catalog/components/story-sheet'
import { useFavourite } from '@/features/catalog/hooks/use-favourites'
import { useProductReviews } from '@/features/catalog/hooks/use-product-reviews'
import { shop } from '@/features/catalog/seed'
import { TourKeepsakes } from '@/features/tours/discovery/tour-keepsakes'
import { TourSections } from '@/features/tours/discovery/tour-sections'
import { useTours } from '@/features/tours/hooks/use-tours'
import { useBack } from '@/hooks/use-back'
import { useScrolledPast } from '@/hooks/use-scrolled-past'

const WHITESPACE = /\s/g

// The map needs the browser (WebGL) and a large library: its chunk loads on the client only (AGENTS rule 9).
const TourItineraryMap = lazy(() =>
  import('@/features/tours/map/tour-itinerary-map').then(m => ({ default: m.TourItineraryMap })),
)

/** Stands in for the map in the server HTML and while its chunk loads. It only reserves the map frame's height; the map's heading and notes appear when it loads. */
const mapPlaceholder = <div aria-hidden className="h-[min(72svh,640px)] min-h-[460px] rounded-3xl bg-surface-secondary" />

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
  // The first pickup place is the shop itself, as on C03's seller row.
  const shopPlace = usePickupPlaces(places => places[0])
  const navigate = useNavigate()
  const reviews = useProductReviews(`tour:${tour.id}`, { kind: 'tour' })
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
  const plural
    = new Intl.PluralRules(intlLocale).select(reviews.count) === 'one'
      ? 'one'
      : 'other'
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
  const sections = [
    {
      id: 'meeting',
      title: t('tourDiscovery.meeting'),
      body: text(tour.meetingPoint),
    },
    {
      id: 'conditions',
      title: t('tourDiscovery.conditions'),
      body: text(tour.conditions),
    },
    {
      id: 'cancellation',
      title: t('tourDiscovery.cancellation'),
      body: text(tour.cancellationPolicy),
    },
  ]
  const fallback = [
    tour.name,
    tour.summary,
    tour.description,
    ...(tour.longStory ? [tour.longStory.title] : []),
    // The body counts as text in the language it is written in (rich text, not a string).
    ...(storyBody ? [{ [storyBody.language]: 'story' }] : []),
    tour.meetingPoint,
    tour.conditions,
    tour.excluded,
    tour.cancellationPolicy,
    ...tour.included,
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
          stats={{
            primary: {
              value: t('tourDiscovery.duration', {
                hours: tour.durationMinutes / 60,
              }),
              label: t('tourDiscovery.durationLabel'),
            },
            rating: reviews.count
              ? { value: reviews.averageText, label: reviews.averageLabel }
              : {
                  value: t('detail.stats.new'),
                  label: t('detail.reviews.none'),
                },
            hasRating: reviews.count > 0,
            ratingValue: reviews.average,
            reviews: {
              value: String(reviews.count),
              label: t(`detail.stats.reviews.${plural}`),
            },
          }}
          subtitle={text(tour.summary)}
        />
        <section className="py-5">
          <SellerRow
            address={shopPlace.address}
            contacts={[
              {
                kind: 'call',
                label: t('detail.seller.call'),
                href: `tel:${shop.phone.replace(WHITESPACE, '')}`,
              },
              {
                kind: 'email',
                label: t('detail.seller.email'),
                href: `mailto:${shop.email}?subject=${encodeURIComponent(t('detail.seller.emailSubject', { name: name.text }))}`,
              },
            ]}
            hours={text(shopPlace.openingHours)}
            name={shop.name}
            sub={t('tourDetail.operatorSub')}
            title={t('tourDetail.operatorTitle', { shop: shop.name })}
          />
        </section>
        <ul className="flex flex-col gap-5 border-t border-separator py-7">
          {[
            {
              icon: ClockIcon,
              title: t('tourDiscovery.duration', {
                hours: tour.durationMinutes / 60,
              }),
              body: t('tourDiscovery.smallGroup'),
            },
            {
              icon: PickupIcon,
              title: t('tourDiscovery.meeting'),
              body: text(tour.meetingPoint),
            },
          ].map(({ icon: Icon, title, body }) => (
            <li key={title} className="flex gap-4">
              <Icon aria-hidden className="mt-0.5 shrink-0" size={26} />
              <div className="flex flex-col gap-0.5">
                <span className="font-semibold">{title}</span>
                <span className="text-sm text-muted">{body}</span>
              </div>
            </li>
          ))}
        </ul>
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
        <ListingReviews
          id="tour-reviews"
          reviews={{
            ...reviews,
            title: t('detail.reviews.title'),
            favourite: reviews.isFavourite
              ? {
                  title: t('detail.favourite.title'),
                  body: t('tourDetail.favouriteBody', {
                    rating: reviews.averageText,
                  }),
                }
              : undefined,
            showAllLabel: t(`detail.reviews.showAll.${plural}`, {
              count: reviews.count,
            }),
            showMoreLabel: t('detail.reviews.showMore'),
            overallLabel: t('detail.reviews.overall'),
            sheetTitle: t('detail.reviews.listTitle', { name: name.text }),
            closeLabel: t('detail.sheet.close'),
            rule: t('tourDetail.reviewsRule'),
            empty: t('tourDiscovery.noReviews'),
          }}
        />
        {/* A tour added in M13 has no stops yet (no map positions): no itinerary section. */}
        {tour.itinerary.length > 0 && (
          <section className="flex flex-col gap-4 border-t border-separator py-7">
            {/* `data-client-only` marks what the server does not render, so the e2e specs can leave it out when they compare text. */}
            <div data-client-only>
              <ClientOnly fallback={mapPlaceholder}>
                <Suspense fallback={mapPlaceholder}>
                  <TourItineraryMap key={tour.id} tour={tour} />
                </Suspense>
              </ClientOnly>
            </div>
          </section>
        )}
        <TourSections checkedOn={tour.checkedOn} sections={tour.sections} />
        <section className="flex flex-col gap-3 border-t border-separator py-7">
          <h2 className="font-serif text-title">
            {t('tourDiscovery.included')}
          </h2>
          <ul className="list-disc space-y-2 ps-5 text-body">
            {tour.included.map((item, index) => (
              <li key={index}>{text(item)}</li>
            ))}
          </ul>
          <h3 className="pt-2 font-semibold">{t('tourDiscovery.excluded')}</h3>
          <p className="text-sm text-muted">{text(tour.excluded)}</p>
        </section>
        <Accordion
          allowsMultipleExpanded
          className="border-t border-separator [&_.accordion\_\_body-inner]:px-0 [&_.accordion\_\_trigger]:px-0 [&_.accordion\_\_trigger]:py-5"
        >
          {sections.map(section => (
            <Accordion.Item key={section.id} id={section.id}>
              <Accordion.Heading>
                <Accordion.Trigger>
                  <span className="flex-1 text-start font-serif text-card-title">
                    {section.title}
                  </span>
                  <Accordion.Indicator />
                </Accordion.Trigger>
              </Accordion.Heading>
              <Accordion.Panel>
                <Accordion.Body className="text-sm">
                  {section.body}
                </Accordion.Body>
              </Accordion.Panel>
            </Accordion.Item>
          ))}
        </Accordion>
        <TourKeepsakes ids={tour.keepsakeIds} />
      </div>
    </div>
  )
}
