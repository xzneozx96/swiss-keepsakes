import type { PublicCategory, PublicLanguage, PublicStoryList } from '@sk/api-contract'

import { rankByTags } from '@sk/domain/content'
import { useInfiniteQuery } from '@tanstack/react-query'
import { useHydrated, useNavigate } from '@tanstack/react-router'
import { ChipRow } from '@/components/chip-row'
import { EmptyState } from '@/components/empty-state'
import { ContentIcon } from '@/components/icons'
import { InfiniteList } from '@/components/infinite-list'

import {
  BackButton,
  CartButton,
  CompactBar,
} from '@/components/layout/cart-button'
import { LanguageButton } from '@/components/layout/language-button'

import { Media } from '@/components/media'
import { useLocale } from '@/contexts/locale-context'
import { useOnboardingAnswers } from '@/features/onboarding/hooks/use-onboarding-answers'
import { useBack } from '@/hooks/use-back'
import { useScrolledPast } from '@/hooks/use-scrolled-past'
import { publicStoriesQuery } from '../api/public-stories-query'
import { useRowSlide } from '../hooks/use-row-slide'
import { offeredCategories } from '../lib/category-filter'
import { coverSrc } from '../lib/cover-src'
import { StoryCard } from './story-card'

const ALL = 'all'

/** The single-choice category row (ADR-030): All, then the offered categories. */
function CategoryChips({
  options,
  selected,
  onChange,
}: {
  options: { slug: string, label: string }[]
  selected: string | null
  onChange: (slug: string | null) => void
}) {
  const { t } = useLocale()
  const items = [{ id: ALL, label: t('stories.filterAll') }, ...options.map(o => ({ id: o.slug, label: o.label }))]

  return <ChipRow items={items} label={t('stories.filter')} selected={selected ?? ALL} onChange={id => onChange(id === ALL ? null : id)} />
}

/** How long the pages of the list count as fresh. The API's pages are cached for 30 s (ADR-006), so the server's first page is not read again at once. */
const FRESH_MS = 30_000

/**
 * C19 Stories (spec §4.11, ADR-006, ADR-033): the published stories from the API, one per row, ten a page with infinite scroll.
 * `first` is the first page the route read on the server for `category` (null when that read failed). The server orders
 * newest first; once the page is hydrated the guest's answers re-rank each page that has arrived, inside that page, so rows
 * already on screen do not move when the next page loads, and the rows that move slide. `categories` is the blog category
 * tree (null when its read failed: no filter row). `category` is the slug the route applied.
 */
export function StoriesPage({
  first,
  lang,
  categories = null,
  category = null,
  onCategoryChange,
  onRetry,
}: {
  first: PublicStoryList | null
  lang: PublicLanguage
  categories?: PublicCategory[] | null
  category?: string | null
  onCategoryChange?: (slug: string | null) => void
  onRetry: () => void
}) {
  const { t, language, intlLocale } = useLocale()
  const navigate = useNavigate()
  const back = useBack(() => void navigate({ to: '/$lang', params: { lang: language }, replace: true }))
  const [bannerEnd, scrolledPast] = useScrolledPast<HTMLDivElement>()
  const answers = useOnboardingAnswers()
  // The first render matches the server's; the answers are applied after hydration (tanstack-start.md, rule 10).
  const hydrated = useHydrated()
  const stories = useInfiniteQuery({
    ...publicStoriesQuery(lang, category),
    staleTime: FRESH_MS,
    enabled: first !== null,
    initialData: first ? { pages: [first], pageParams: [undefined] } : undefined,
  })
  const options = categories ? offeredCategories(categories, language) : []
  const pages = stories.data?.pages ?? null
  // The answers rank inside each page only (ADR-033, section 9).
  // A story that moved onto a later page while the guest scrolled shows once.
  const ordered = pages && [...new Map(pages.flatMap(page => (hydrated ? rankByTags(page.items, answers) : page.items)).map(story => [story.id, story])).values()]
  const slide = useRowSlide(ordered?.map(story => story.id) ?? [])

  const total = pages?.at(-1)?.total ?? 0
  const isOne = (count: number) => new Intl.PluralRules(intlLocale).select(count) === 'one'
  const countLabel = t(isOne(total) ? 'stories.count.one' : 'stories.count.other', { count: total })

  return (
    <div className="flex flex-1 flex-col">
      <CompactBar
        leading={<BackButton label={t('detail.back')} onPress={back} />}
        title={t('stories.title')}
        visible={scrolledPast}
      >
        <LanguageButton tone="bar" />
        <CartButton tone="bar" />
      </CompactBar>
      <Media alt="" className="h-[260px]" photo="lucerne-old-town">
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/10 to-black/70"
        />
        <div className="absolute inset-x-4 top-[calc(env(safe-area-inset-top,0px)+12px)] flex items-center gap-2">
          <BackButton label={t('detail.back')} tone="pill" onPress={back} />
          <span className="flex-1" />
          <LanguageButton />
          <CartButton />
        </div>
        <header className="absolute inset-x-4 bottom-10 flex flex-col gap-1 text-white">
          <h1 className="font-serif text-display">{t('stories.title')}</h1>
          <p className="text-body text-white/85">{t('stories.intro')}</p>
          {total > 0 && (
            <p className="text-label text-white/85 tabular-nums">
              {countLabel}
            </p>
          )}
        </header>
      </Media>
      <div ref={bannerEnd} aria-hidden className="h-px" />
      <div className="relative -mt-6 flex flex-col gap-5 rounded-t-3xl bg-background px-4 pt-5 pb-4">
        {ordered === null
          ? (
              <EmptyState
                alert
                action={{ label: t('stories.retry'), onPress: onRetry }}
                icon={ContentIcon}
                message={t('stories.error')}
              />
            )
          : (
              <>
                {options.length > 0 && onCategoryChange && (ordered.length > 0 || category !== null) && <CategoryChips options={options} selected={category} onChange={onCategoryChange} />}
                {ordered.length === 0
                  ? category === null
                    ? (
                        <EmptyState
                          action={{ label: t('placeholder.backHome'), to: '/$lang', params: { lang: language } }}
                          icon={ContentIcon}
                          message={t('stories.empty')}
                        />
                      )
                    : <EmptyState icon={ContentIcon} message={t('stories.emptyCategory')} />
                  : (
                      <InfiniteList
                        announce={added => t(isOne(added) ? 'stories.more.one' : 'stories.more.other', { count: added })}
                        count={ordered.length}
                        endText={t(isOne(total) ? 'stories.end.one' : 'stories.end.other', { count: total })}
                        hasMore={stories.hasNextPage}
                        isFailed={stories.isFetchNextPageError}
                        isLoading={stories.isFetchingNextPage}
                        onLoadMore={() => void stories.fetchNextPage()}
                      >
                        <ul className="flex flex-col gap-7">
                          {ordered.map(story => (
                            <li key={story.id} ref={slide(story.id)}>
                              <StoryCard
                                excerpt={story.excerpt}
                                meta={t('home.stories.read', { minutes: story.readMinutes })}
                                photo={coverSrc(story.cover)}
                                slug={story.slug}
                                tag={story.fallback ? { code: story.language.toUpperCase(), label: t(`stories.language.${story.language}`) } : undefined}
                                title={story.title}
                              />
                            </li>
                          ))}
                        </ul>
                      </InfiniteList>
                    )}
              </>
            )}
      </div>
    </div>
  )
}
