import type { PublicStoryCard } from '@sk/api-contract'
import type { InterestCode, RankPrefs } from '@sk/domain/content'

import { Button } from '@heroui/react'
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
import { rankStories } from '../lib/rank-stories'
import { StoryCard } from './story-card'

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

/**
 * C19 Stories (spec §4.11, ADR-006): the published stories from the API, one per row. The server renders them in the order
 * the API sends (newest first); once the page is hydrated the guest's answers re-rank them, and the rows that move slide.
 * `stories` is null when the read failed. `onChangeAnswers` is the onboarding opener (T-E4.5a); without it the sort line is hidden.
 */
export function StoriesPage({
  stories,
  onRetry,
  onChangeAnswers,
}: {
  stories: PublicStoryCard[] | null
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
  const ordered = stories && hydrated ? rankStories(stories, answers) : stories
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
