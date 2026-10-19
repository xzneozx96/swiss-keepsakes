import type { Key } from '@heroui/react'
import type { StoryCategory } from '../types'

import { ScrollShadow, Skeleton, Tag, TagGroup } from '@heroui/react'
import { useNavigate } from '@tanstack/react-router'

import { EmptyState } from '@/components/empty-state'
import { ContentIcon } from '@/components/icons'
import {
  BackButton,
  CartButton,
  CompactBar,
} from '@/components/layout/cart-button'

import { Media } from '@/components/media'

import { useLocale } from '@/contexts/locale-context'
import {
  CategoryThumb,
  categoryThumbItemClass,
} from '@/features/catalog/components/category-thumb'
import { useDemo } from '@/features/demo'
import { useBack } from '@/hooks/use-back'
import { useScrolledPast } from '@/hooks/use-scrolled-past'
import { useSimulatedLoading } from '@/hooks/use-simulated-loading'
import { publishedArticles } from '../lib/articles'
import { ALL_STORIES_PHOTO, storyCategoryPhoto } from '../lib/categories'
import { STORY_CATEGORIES } from '../types'
import { StoryCard } from './story-card'

const ALL = 'all'

/**
 * C19 Stories (spec §4.11, §5.1): the C02 list layout with a photo banner and one story per
 * row. Only stories published in the current language; never the other language's (R02).
 * The category row is the C02 filter (shared CategoryThumb); the home opens it pre-filtered.
 */
export function StoriesPage({
  category,
  onCategoryChange,
}: {
  category?: StoryCategory
  onCategoryChange: (category: StoryCategory | undefined) => void
}) {
  const { t, language, intlLocale } = useLocale()
  const { state } = useDemo()
  const isLoading = useSimulatedLoading()
  const navigate = useNavigate()
  const back = useBack(() => void navigate({ to: '/', replace: true }))
  const [bannerEnd, scrolledPast] = useScrolledPast<HTMLDivElement>()

  const published = publishedArticles(state.data.articles, language)
  const stories = category
    ? published.filter(s => s.category === category)
    : published
  const countLabel = t(
    new Intl.PluralRules(intlLocale).select(stories.length) === 'one'
      ? 'stories.count.one'
      : 'stories.count.other',
    { count: stories.length },
  )
  const title = category
    ? t(`stories.category.${category}`)
    : t('stories.title')

  const filterItems = [
    { id: ALL, name: t('stories.all'), photo: ALL_STORIES_PHOTO },
    ...STORY_CATEGORIES.map(c => ({
      id: c,
      name: t(`stories.category.${c}`),
      photo: storyCategoryPhoto[c],
    })),
  ]

  const onSelectionChange = (keys: 'all' | Set<Key>) => {
    const [first] = keys === 'all' ? [] : [...keys]

    // Single selection never clears: tapping the selected tile keeps it selected (as C02).
    if (first !== undefined)
      onCategoryChange(first === ALL ? undefined : (first as StoryCategory))
  }

  return (
    <div className="flex flex-1 flex-col">
      <CompactBar
        leading={<BackButton label={t('detail.back')} onPress={back} />}
        title={title}
        visible={scrolledPast}
      >
        <CartButton tone="bar" />
      </CompactBar>
      <Media
        alt=""
        className="h-[260px]"
        photo={category ? storyCategoryPhoto[category] : 'lucerne-old-town'}
      >
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/10 to-black/70"
        />
        <div className="absolute inset-x-4 top-[calc(env(safe-area-inset-top,0px)+12px)] flex items-center gap-2">
          <BackButton label={t('detail.back')} tone="pill" onPress={back} />
          <span className="flex-1" />
          <CartButton />
        </div>
        <header className="absolute inset-x-4 bottom-10 flex flex-col gap-1 text-white">
          <h1 className="font-serif text-display">{title}</h1>
          <p className="text-body text-white/85">{t('stories.intro')}</p>
          {!isLoading && stories.length > 0 && (
            <p className="text-label text-white/85 tabular-nums">
              {countLabel}
            </p>
          )}
        </header>
      </Media>
      <div ref={bannerEnd} aria-hidden className="h-px" />
      <div className="relative -mt-6 flex flex-col gap-5 rounded-t-3xl bg-background px-4 pt-5 pb-4">
        {published.length > 0 && (
          <TagGroup
            aria-label={t('stories.filter')}
            selectedKeys={new Set([category ?? ALL])}
            selectionMode="single"
            onSelectionChange={onSelectionChange}
          >
            <ScrollShadow
              hideScrollBar
              className="-mx-4"
              orientation="horizontal"
              size={40}
            >
              <TagGroup.List className="flex-nowrap gap-1 px-4 pt-2 pb-1">
                {filterItems.map(item => (
                  <Tag
                    key={item.id}
                    className={`${categoryThumbItemClass} bg-transparent p-0 before:hidden hover:bg-transparent data-[selected=true]:bg-transparent data-[selected=true]:font-semibold data-[selected=true]:text-foreground`}
                    id={item.id}
                    textValue={item.name}
                  >
                    <CategoryThumb name={item.name} photo={item.photo} />
                  </Tag>
                ))}
              </TagGroup.List>
            </ScrollShadow>
          </TagGroup>
        )}
        {isLoading
          ? (
              <ul className="flex flex-col gap-7">
                {Array.from({ length: 3 }, (_, i) => (
                  <li key={i} className="flex flex-col gap-2.5">
                    <Skeleton className="aspect-[4/3] rounded-3xl" />
                    <Skeleton className="h-5 w-4/5 rounded-lg" />
                    <Skeleton className="h-4 w-3/5 rounded-lg" />
                  </li>
                ))}
              </ul>
            )
          : stories.length === 0
            ? (
                <EmptyState
                  action={
                    category
                      ? undefined
                      : { label: t('placeholder.backHome'), to: '/' }
                  }
                  icon={ContentIcon}
                  message={t(category ? 'stories.emptyCategory' : 'stories.empty')}
                />
              )
            : (
                <ul className="flex flex-col gap-7">
                  {stories.map(story => (
                    <li key={story.id}>
                      <StoryCard
                        excerpt={story.excerpt}
                        meta={[
                          story.place,
                          t('home.stories.read', { minutes: story.readMinutes }),
                        ]
                          .filter(Boolean)
                          .join(' · ')}
                        photo={story.photo}
                        slug={story.slug}
                        title={story.title}
                      />
                    </li>
                  ))}
                </ul>
              )}
      </div>
    </div>
  )
}
