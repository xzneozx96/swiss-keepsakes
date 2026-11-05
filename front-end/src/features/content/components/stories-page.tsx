import type { PublicCategory, PublicStoryCard } from '@sk/api-contract'

import { rankByTags } from '@sk/domain/content'
import { useHydrated, useNavigate } from '@tanstack/react-router'
import { ChipRow } from '@/components/chip-row'
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
import { useOnboardingAnswers } from '@/features/onboarding/hooks/use-onboarding-answers'
import { useBack } from '@/hooks/use-back'
import { useScrolledPast } from '@/hooks/use-scrolled-past'
import { useRowSlide } from '../hooks/use-row-slide'
import { filterStories, offeredCategories, resolveCategory } from '../lib/category-filter'
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

/**
 * C19 Stories (spec §4.11, ADR-006): the published stories from the API, one per row. The server renders them in the order
 * the API sends (newest first); once the page is hydrated the guest's answers re-rank them, and the rows that move slide.
 * `stories` is null when the read failed. `categories` is the blog category tree (null when its read failed: no filter row);
 * `category` is the slug in the address, applied only when a story here has it. The filter runs first, then the answers rank
 * what is left.
 */
export function StoriesPage({
  stories,
  categories = null,
  category,
  onCategoryChange,
  onRetry,
}: {
  stories: PublicStoryCard[] | null
  categories?: PublicCategory[] | null
  category?: string
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
  const options = stories && categories ? offeredCategories(categories, stories, language) : []
  const chosen = resolveCategory(options, category)
  const filtered = stories && categories ? filterStories(stories, categories, chosen) : stories
  const ordered = filtered && hydrated ? rankByTags(filtered, answers) : filtered
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
