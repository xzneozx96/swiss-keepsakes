import type { PublicStory } from '@sk/api-contract'

import { dateTimeFormat } from '@sk/domain/shared'
import { Link } from '@tanstack/react-router'

import { BackButton, CartButton, CompactBar } from '@/components/layout/cart-button'
import { useLocale } from '@/contexts/locale-context'
import { OnboardingCard } from '@/features/onboarding/components/onboarding-card'
import { useScrolledPast } from '@/hooks/use-scrolled-past'
import { StoryBody } from './story-body'
import { StoryKeepsakes } from './story-keepsakes'
import { StoryPlaces } from './story-places'
import { StoryRelated } from './story-related'

// Language names stay in their own language, so they are not dictionary keys (as in the language sheet).
const NAMES = { en: 'English', de: 'Deutsch' } as const

type Story = PublicStory

/** The cover as the page's banner: every copy offered, the largest as the fallback address. */
function coverImage(cover: Story['cover']) {
  if (!cover)
    return null

  return {
    src: cover.variants.at(-1)?.url ?? cover.url,
    srcSet: cover.variants.length > 0 ? cover.variants.map(v => `${v.url} ${v.width}w`).join(', ') : undefined,
  }
}

/**
 * C20 Story (spec §4.11, ADR-001): the cover with the title, the author, the date and reading time, the body drawn from the story document, and a link to the other language's version. The server renders all of
 * it. Under the body: the places it tags, its keepsake cards and related stories (each block is left out when empty); comments come with E5.3.
 */
export function StoryPage({ story, onBack }: { story: Story, onBack: () => void }) {
  const { t, intlLocale } = useLocale()
  const [coverEnd, scrolledPast] = useScrolledPast<HTMLDivElement>()
  const cover = coverImage(story.cover)
  const others = story.versions.filter(version => version.language !== story.language)
  // The zone is fixed, so the server and the browser print the same day.
  const date = dateTimeFormat(intlLocale, { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Zurich' }).format(new Date(story.publishedAt))

  return (
    <div className="flex flex-1 flex-col">
      <OnboardingCard />
      <CompactBar
        leading={<BackButton label={t('detail.back')} onPress={onBack} />}
        title={story.title}
        visible={scrolledPast}
      >
        <CartButton tone="bar" />
      </CompactBar>

      <div className="relative h-[min(68dvh,540px)] overflow-hidden bg-gradient-to-b from-hero-sky via-hero-cream to-surface-tertiary">
        {cover && (
          <img
            alt=""
            className="absolute inset-0 size-full object-cover"
            decoding="async"
            fetchPriority="high"
            sizes="(min-width: 640px) 560px, 100vw"
            src={cover.src}
            srcSet={cover.srcSet}
          />
        )}
        <div aria-hidden className="absolute inset-0 bg-gradient-to-b from-black/35 via-black/5 to-black/75" />
        <div className="absolute inset-x-4 top-[calc(env(safe-area-inset-top,0px)+12px)] flex items-center gap-2">
          <BackButton label={t('detail.back')} tone="pill" onPress={onBack} />
          <span className="flex-1" />
          <CartButton tone="pill" />
        </div>
        <header className="absolute inset-x-6 bottom-12 flex flex-col gap-2 text-white" lang={story.language}>
          <h1 className="font-serif text-display text-balance">{story.title}</h1>
          <p className="text-body text-white/85">{story.excerpt}</p>
        </header>
      </div>
      <div ref={coverEnd} aria-hidden className="h-px" />

      <div className="relative -mt-6 flex flex-1 flex-col rounded-t-3xl bg-background px-6 pt-7 pb-[calc(env(safe-area-inset-bottom,0px)+24px)]">
        <div className="flex flex-col gap-1" lang={story.language}>
          <span className="font-semibold">{story.authorName}</span>
          <span className="text-sm text-muted tabular-nums">{t('article.meta', { date, minutes: story.readMinutes })}</span>
        </div>

        {others.length > 0 && (
          <nav aria-label={t('shell.language.title')} className="mt-3 flex flex-wrap items-center gap-x-2 text-sm text-muted">
            <span>{t('article.otherLanguage')}</span>
            {others.map(version => (
              <Link
                key={version.language}
                className="inline-flex min-h-11 items-center font-medium text-foreground underline underline-offset-4"
                hrefLang={version.language}
                lang={version.language}
                params={{ lang: version.language, slug: version.slug }}
                to="/$lang/stories/$slug"
              >
                {NAMES[version.language]}
              </Link>
            ))}
          </nav>
        )}

        <div className="mt-6 flex flex-col">
          <div className="flex flex-col gap-4" lang={story.language}>
            <StoryBody body={story.body} language={story.language} places={story.places} />
          </div>
        </div>

        <StoryPlaces language={story.language} places={story.places} />
        <StoryKeepsakes keepsakes={story.keepsakes} language={story.language} />
        <StoryRelated stories={story.related} />
      </div>
    </div>
  )
}
