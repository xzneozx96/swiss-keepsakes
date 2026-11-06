import type { Tour } from '@sk/domain/bookings'
import type { ReactNode } from 'react'

import type { TourTab } from '@/features/tours/discovery/lib/search-params'

import { Button } from '@heroui/react'
import { firstPhoto, openingText, pickDoc, pickText } from '@sk/domain/shared'
import { useNavigate } from '@tanstack/react-router'
import { useRef, useState } from 'react'
import { DetailTabs } from '@/components/detail-tabs'
import { EmptyState } from '@/components/empty-state'
import {
  InfoIcon,
  MessageIcon,
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
import { tourTabs } from '@/features/tours/discovery/lib/search-params'
import { TourComments } from '@/features/tours/discovery/tour-comments'
import { TourFactsCard } from '@/features/tours/discovery/tour-facts-card'
import { TourItineraryTab } from '@/features/tours/discovery/tour-itinerary-tab'
import { TourKeepsakes } from '@/features/tours/discovery/tour-keepsakes'
import { useTourComments } from '@/features/tours/hooks/use-tour-comments'
import { useTours } from '@/features/tours/hooks/use-tours'
import { useBack } from '@/hooks/use-back'
import { useScrolledPast } from '@/hooks/use-scrolled-past'

/** The selected tab and how to change it: the route keeps it in `?tab=`; without them the page keeps it itself (M13's preview). */
interface TabControl {
  tab?: TourTab
  onTabChange?: (tab: TourTab) => void
}

export function TourDetailPage({ slug, tab, onTabChange }: { slug: string } & TabControl) {
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

  return <TourDetail tab={tab} tour={tour} onTabChange={onTabChange} />
}

/**
 * C09. `preview` is M13's guest preview: the same page for a draft, with every action that
 * would leave the page or write demo state (back, save, book) switched off.
 */
export function TourDetail({
  tour,
  preview = false,
  tab: routeTab,
  onTabChange,
}: {
  tour: Tour
  preview?: boolean
} & TabControl) {
  const { t, language } = useLocale()
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
  const [photoEnd, scrolledPast] = useScrolledPast<HTMLDivElement>()
  const name = pickText(tour.name, language)
  const text = (value: Tour['name']) => pickText(value, language).text
  const [storyOpen, setStoryOpen] = useState(false)
  const [localTab, setLocalTab] = useState<TourTab>('overview')
  const tab = onTabChange ? (routeTab ?? 'overview') : localTab
  const tabsTopRef = useRef<HTMLDivElement>(null)
  const changeTab = (next: TourTab) => {
    // Scrolled past the tab bar, the new tab starts at the bar instead of wherever the old one left the page. The bar is
    // the first child of the Tabs root and sticks inside it, so the root's top is where the bar would sit unpinned and
    // the bar's computed `top` is where it docks. Only the routed page scrolls the window: M13's preview lives in a frame.
    if (onTabChange) {
      const root = tabsTopRef.current?.firstElementChild
      const bar = root?.querySelector('[role=tablist]')?.closest('.sticky')
      const docked = bar ? Number.parseFloat(getComputedStyle(bar).top) || 0 : 0
      const delta = (root?.getBoundingClientRect().top ?? 0) - docked
      if (delta < 0)
        window.scrollBy({ top: delta })
      onTabChange(next)
    }
    else {
      setLocalTab(next)
    }
  }
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

  const panels: Record<TourTab, ReactNode> = {
    overview: (
      <>
        <TourFactsCard tour={tour} />
        <section
          className="flex flex-col gap-3 pb-7"
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
        <TourKeepsakes />
      </>
    ),
    itinerary: <TourItineraryTab tour={tour} />,
    comments: comments.length > 0
      ? <TourComments comments={comments} lang={commentsLang} tourName={name.text} />
      : <EmptyState compact icon={MessageIcon} message={t('tourDetail.comments.empty')} />,
  }

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
        {/* Title and subtitle start-aligned, with no stats row: the duration and stops moved into the Overview tab's card,
            the comment count into the Comments tab (owner, 06.11.2026). */}
        <ListingDetailHeader align="start" name={name.text} subtitle={text(tour.summary)} />
        {fallback && (
          <p className="mt-6 flex items-start gap-2 border-t border-separator pt-7 text-sm">
            <InfoIcon aria-hidden className="mt-0.5 shrink-0" size={16} />
            {t(
              fallback.language === 'en'
                ? 'tourDiscovery.onlyInEnglish'
                : 'tourDiscovery.onlyInGerman',
            )}
          </p>
        )}
        {/* The tabs share the page's one header; the sticky bar docks under the CompactBar (56px plus the notch). */}
        <div ref={tabsTopRef} className="-mx-6 flow-root">
          <DetailTabs<TourTab>
            line
            gutter="px-6"
            label={t('tourDetail.tabs.label')}
            selected={tab}
            stick="bar-safe"
            tabs={tourTabs.map(id => ({
              id,
              label: id === 'comments' && comments.length > 0
                ? t('tourDetail.tab.commentsCount', { count: comments.length })
                : t(`tourDetail.tab.${id}`),
              panel: panels[id],
            }))}
            onChange={changeTab}
          />
        </div>
      </div>
    </div>
  )
}
