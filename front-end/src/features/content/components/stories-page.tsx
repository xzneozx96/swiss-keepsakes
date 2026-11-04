import type { Key } from '@heroui/react'
import type { PublicCategory, PublicStoryCard } from '@sk/api-contract'
import type { InterestCode, RankPrefs } from '@sk/domain/content'

import { Button, ScrollShadow, Tag, TagGroup } from '@heroui/react'
import { useHydrated, useNavigate } from '@tanstack/react-router'
import { EmptyState } from '@/components/empty-state'
import { ContentIcon } from '@/components/icons'

import {
  BackButton,
  CartButton,
  CompactBar,
} from '@/components/layout/cart-button'
import { LanguageButton } from '@/components/layout/language-button'

import { Media } from '@/components/media'
import { useLocale } from '@/contexts/locale-context'
import { useBack } from '@/hooks/use-back'
import { useScrolledPast } from '@/hooks/use-scrolled-past'
import { useOnboardingAnswers } from '../hooks/use-onboarding-answers'
import { useRowSlide } from '../hooks/use-row-slide'
import { filterStories, offeredCategories, resolveCategory } from '../lib/category-filter'
import { rankStories } from '../lib/rank-stories'
import { StoryCard } from './story-card'

const ALL = 'all'

const NO_ANSWERS: RankPrefs = { stay: null, interests: [] }

const hasAnswers = (answers: RankPrefs) => answers.stay != null || (answers.interests ?? []).length > 0

/** The photo a card shows: the 640 px copy when the cover has one (a card is at most about 400 px wide), else the largest copy, else the original. */
function coverSrc(cover: PublicStoryCard['cover']) {
  if (!cover)
    return undefined

  return (cover.variants.find(v => v.width >= 640) ?? cover.variants.at(-1))?.url ?? cover.url
}

/**
 * The line above the list: what the list is sorted for, or that it is newest first. Change opens the answers again
 * (T-E4.5a). Without that opener there is nothing to offer, so the line is not drawn.
 */
function SortLine({ answers, onChange }: { answers: RankPrefs, onChange?: () => void }) {
  const { t } = useLocale()
  if (!onChange)
    return null

  const named = [
    ...(answers.stay ? [t(`stories.sort.stay.${answers.stay}`)] : []),
    ...(answers.interests ?? []).map((code: InterestCode) => t(`places.interest.${code}`)),
  ]

  return (
    <p className="flex flex-wrap items-center text-label text-muted">
      <span>{hasAnswers(answers) ? t('stories.sort.for', { answers: named.join(', ') }) : t('stories.sort.newest')}</span>
      <span aria-hidden className="whitespace-pre"> · </span>
      <Button className="min-h-11 px-1" size="sm" variant="ghost" onPress={onChange}>
        {t(hasAnswers(answers) ? 'stories.sort.change' : 'stories.sort.personalise')}
      </Button>
    </p>
  )
}

/** The single-choice category row (ADR-030): All, then the offered categories. A selected chip shows a check as well as its colour; each chip is 44 px high. */
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
  const items = [{ slug: ALL, label: t('stories.filterAll') }, ...options]

  // Single selection never clears: tapping the selected chip keeps it selected.
  const onSelectionChange = (keys: 'all' | Set<Key>) => {
    const [first] = keys === 'all' ? [] : [...keys]
    if (first !== undefined)
      onChange(first === ALL ? null : String(first))
  }

  return (
    <TagGroup
      aria-label={t('stories.filter')}
      selectedKeys={new Set([selected ?? ALL])}
      selectionMode="single"
      size="lg"
      onSelectionChange={onSelectionChange}
    >
      <ScrollShadow hideScrollBar className="-mx-4" orientation="horizontal" size={40}>
        <TagGroup.List className="flex-nowrap px-4 py-1">
          {items.map(item => (
            <Tag key={item.slug} id={item.slug} textValue={item.label}>
              {({ isSelected }) => (
                <span className="flex min-h-11 items-center gap-1 whitespace-nowrap">
                  {isSelected && (
                    <svg aria-hidden data-testid="chip-check" fill="none" viewBox="0 0 24 24">
                      <path d="M5 12.5l4.5 4.5L19 7.5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" />
                    </svg>
                  )}
                  {item.label}
                </span>
              )}
            </Tag>
          ))}
        </TagGroup.List>
      </ScrollShadow>
    </TagGroup>
  )
}

/**
 * C19 Stories (spec §4.11, ADR-006): the published stories from the API, one per row. The server renders them in the order
 * the API sends (newest first); once the page is hydrated the guest's answers re-rank them, and the rows that move slide.
 * `stories` is null when the read failed. `categories` is the blog category tree (null when its read failed: no filter row);
 * `category` is the slug in the address, applied only when a story here has it. The filter runs first, then the answers rank
 * what is left. `onChangeAnswers` is the onboarding opener (T-E4.5a); without it the sort line is hidden.
 */
export function StoriesPage({
  stories,
  categories = null,
  category,
  onCategoryChange,
  onRetry,
  onChangeAnswers,
}: {
  stories: PublicStoryCard[] | null
  categories?: PublicCategory[] | null
  category?: string
  onCategoryChange?: (slug: string | null) => void
  onRetry: () => void
  onChangeAnswers?: () => void
}) {
  const { t, language, intlLocale } = useLocale()
  const navigate = useNavigate()
  const back = useBack(() => void navigate({ to: '/$lang', params: { lang: language }, replace: true }))
  const [bannerEnd, scrolledPast] = useScrolledPast<HTMLDivElement>()
  const answers = useOnboardingAnswers()
  // The first render matches the server's; the answers are applied after hydration (tanstack-start.md, rule 10).
  const hydrated = useHydrated()
  const options = stories && categories ? offeredCategories(categories, stories, language) : []
  const chosen = resolveCategory(options, category)
  const filtered = stories && categories ? filterStories(stories, categories, chosen) : stories
  const ordered = filtered && hydrated ? rankStories(filtered, answers) : filtered
  const slide = useRowSlide(ordered?.map(story => story.id) ?? [])

  const count = ordered?.length ?? 0
  const countLabel = t(
    new Intl.PluralRules(intlLocale).select(count) === 'one'
      ? 'stories.count.one'
      : 'stories.count.other',
    { count },
  )

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
          {count > 0 && (
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
          : ordered.length === 0
            ? (
                <EmptyState
                  action={{ label: t('placeholder.backHome'), to: '/$lang', params: { lang: language } }}
                  icon={ContentIcon}
                  message={t('stories.empty')}
                />
              )
            : (
                <>
                  {options.length > 0 && onCategoryChange && <CategoryChips options={options} selected={chosen} onChange={onCategoryChange} />}
                  <SortLine answers={hydrated ? answers : NO_ANSWERS} onChange={onChangeAnswers} />
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
                </>
              )}
      </div>
    </div>
  )
}
