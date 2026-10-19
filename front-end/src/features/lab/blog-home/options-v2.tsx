import type { CategoryFilter } from './data'
import type { Effect } from './effects'
import type { BlogHomeOptionProps } from './options'
import type { Language } from '@/contexts/locale-context'
import type { Article } from '@/features/content/types'

import { ScrollShadow } from '@heroui/react'
import { Link } from '@tanstack/react-router'
import { useState } from 'react'

import { ChevronRightIcon } from '@/components/icons'
import { Media } from '@/components/media'
import { useLocale } from '@/contexts/locale-context'

import { ProductCard } from '@/features/catalog/components/product-card'
import { AdviceBanner } from '@/features/discovery/components/advice-banner'
import { Hero } from '@/features/discovery/components/hero'
import { Rail } from '@/features/discovery/components/section'
import { StoryRow } from '@/features/discovery/components/story-row'
import { VictorinoxShowcase } from '@/features/discovery/components/victorinox-showcase'
import { useDiscoveryView } from '@/features/discovery/hooks/use-discovery-view'
import { TourCard } from '@/features/tours/discovery/tour-card'
import { categories, categoryPhoto, useBlogData } from './data'
import { CoverEffects } from './effects'
import { CompactRow, FeedCard, StoryMeta } from './shared'

type StoryHomeProps = BlogHomeOptionProps

type Chapter = 'stories' | 'tours' | 'victorinox' | 'keepsakes'

const chapterCopy: Record<
  Language,
  Record<Chapter, { eyebrow: string, title: string, line: string }>
> = {
  en: {
    stories: {
      eyebrow: 'Start with a story',
      title: 'Luzerne, told by locals',
      line: 'The places we love, where we eat and the views worth the climb.',
    },
    tours: {
      eyebrow: 'Then go and see it',
      title: 'Walk the stories with us',
      line: 'Small guided walks and day trips to the places behind the stories.',
    },
    victorinox: {
      eyebrow: 'Swiss craft, made nearby',
      title: 'A knife with a story',
      line: 'Born in Ibach, a short trip up the lake, and engraved with your name.',
    },
    keepsakes: {
      eyebrow: 'And bring it home',
      title: 'Keepsakes from Luzerne',
      line: 'Little things from local makers that carry the trip home.',
    },
  },
  de: {
    stories: {
      eyebrow: 'Beginne mit einer Geschichte',
      title: 'Luzern, von Einheimischen erzählt',
      line: 'Orte, die wir lieben, wo wir essen und welche Aussicht sich lohnt.',
    },
    tours: {
      eyebrow: 'Dann sieh es dir an',
      title: 'Erlebe die Geschichten mit uns',
      line: 'Kleine Führungen und Tagesausflüge zu den Orten hinter den Geschichten.',
    },
    victorinox: {
      eyebrow: 'Schweizer Handwerk aus der Nähe',
      title: 'Ein Messer mit Geschichte',
      line: 'Entstanden in Ibach, nur eine kurze Fahrt den See hinauf, und mit deinem Namen graviert.',
    },
    keepsakes: {
      eyebrow: 'Und nimm es mit nach Hause',
      title: 'Andenken aus Luzern',
      line: 'Kleine Dinge von lokalen Herstellern, die die Reise nach Hause tragen.',
    },
  },
}

/** Three wordings for the tiles section, one per option, so they can be compared. */
const bridgeCopy: Record<
  Language,
  Record<
    'discover' | 'bring' | 'streets',
    { title: string, subtitle: string }
  > & { tours: string, victorinox: string, keepsakes: string }
> = {
  en: {
    discover: {
      title: 'Discover Luzerne, bring it home',
      subtitle: 'See the places for yourself, then keep a piece of them.',
    },
    bring: {
      title: 'Bring Luzerne home',
      subtitle:
        'Discover it on foot, keep it in your pocket, give it as a gift.',
    },
    streets: {
      title: 'From the stories to the streets',
      subtitle: 'Go and find the places, then take a little Luzerne home.',
    },
    tours: 'Go and see it',
    victorinox: 'Swiss craft',
    keepsakes: 'Take it home',
  },
  de: {
    discover: {
      title: 'Luzern entdecken, mit nach Hause nehmen',
      subtitle: 'Erlebe die Orte selbst und behalte ein Stück davon.',
    },
    bring: {
      title: 'Ein Stück Luzern für zu Hause',
      subtitle: 'Zu Fuss entdecken, in der Tasche tragen, verschenken.',
    },
    streets: {
      title: 'Von den Geschichten auf die Strassen',
      subtitle: 'Finde die Orte und nimm ein wenig Luzern mit nach Hause.',
    },
    tours: 'Selbst erleben',
    victorinox: 'Schweizer Handwerk',
    keepsakes: 'Mitnehmen',
  },
}

function ChapterHeading({
  chapter,
  number,
  seeAll,
}: {
  chapter: Chapter
  number: number
  seeAll?: { label: string, to: '/stories' | '/tours' | '/gifts' }
}) {
  const { language } = useBlogData()
  const c = chapterCopy[language][chapter]

  return (
    <div className="flex items-end justify-between gap-4">
      <div className="flex min-w-0 flex-col gap-1">
        <p className="flex items-center gap-2 text-[12px] font-semibold tracking-[0.14em] text-accent-soft-foreground uppercase">
          <span className="font-serif text-[15px] tracking-normal text-accent">
            {String(number).padStart(2, '0')}
          </span>
          {c.eyebrow}
        </p>
        <h2 className="font-serif text-[24px] leading-[30px] font-medium text-balance">
          {c.title}
        </h2>
        <p className="text-sm text-muted">{c.line}</p>
      </div>
      {seeAll && (
        <Link
          className="flex shrink-0 items-center gap-0.5 rounded-md py-1 text-sm font-medium text-muted outline-none focus-visible:focus-ring"
          to={seeAll.to}
        >
          {seeAll.label}
          <ChevronRightIcon size={16} />
        </Link>
      )}
    </div>
  )
}

/** Story categories as Instagram-style circles; tapping one filters the stories, tapping again clears it. */
function StoryCircles({
  value,
  onChange,
}: {
  value: CategoryFilter
  onChange: (value: CategoryFilter) => void
}) {
  const { c } = useBlogData()

  return (
    <ScrollShadow
      hideScrollBar
      className="-mx-4"
      orientation="horizontal"
      size={24}
    >
      <div
        aria-label={c.latest}
        className="flex gap-3.5 px-4 pb-1"
        role="group"
      >
        {categories
          .filter(item => item !== 'all')
          .map(item => (
            <button
              key={item}
              aria-pressed={value === item}
              className="group flex w-[68px] shrink-0 flex-col items-center gap-1.5 rounded-xl outline-none focus-visible:focus-ring"
              type="button"
              onClick={() => onChange(value === item ? 'all' : item)}
            >
              <span className="rounded-full bg-gradient-to-tr from-[#f4b860] via-accent to-[#a3241a] p-[2.5px] group-aria-pressed:from-foreground group-aria-pressed:via-foreground group-aria-pressed:to-foreground">
                <span className="block rounded-full bg-background p-[2px]">
                  <Media
                    alt=""
                    className="size-[58px] rounded-full"
                    photo={categoryPhoto[item]}
                  />
                </span>
              </span>
              <span className="line-clamp-2 text-center text-[12px] leading-4 font-medium group-aria-pressed:font-semibold">
                {c.category[item]}
              </span>
            </button>
          ))}
      </div>
    </ScrollShadow>
  )
}

/** The tiles the owner liked, with discovery wording. Tiles jump to their chapter when it is on the page. */
function DiscoverTiles({
  wording,
  jump,
}: {
  wording: 'discover' | 'bring' | 'streets'
  jump: boolean
}) {
  const { language } = useBlogData()
  const b = bridgeCopy[language]
  const tiles = [
    {
      id: 'tours',
      label: language === 'de' ? 'Touren' : 'Tours',
      caption: b.tours,
      photo: 'rigi-vitznau-train',
    },
    {
      id: 'victorinox',
      label: 'Victorinox',
      caption: b.victorinox,
      photo: 'victorinox-spartan',
    },
    {
      id: 'keepsakes',
      label: language === 'de' ? 'Andenken' : 'Keepsakes',
      caption: b.keepsakes,
      photo: 'postcards',
    },
  ] as const
  const tileClass
    = 'relative block overflow-hidden rounded-3xl text-left outline-none focus-visible:focus-ring active:scale-[0.98]'
  const face = (t: (typeof tiles)[number]) => (
    <Media alt="" className="aspect-[3/4]" photo={t.photo}>
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
      <span className="absolute inset-x-2.5 bottom-2.5 flex flex-col text-white">
        <span className="text-[12px] leading-4 text-white/85">{t.caption}</span>
        <span className="text-sm font-medium">{t.label}</span>
      </span>
    </Media>
  )

  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-col gap-0.5">
        <h2 className="text-heading">{b[wording].title}</h2>
        <p className="text-label text-muted">{b[wording].subtitle}</p>
      </div>
      <div className="grid grid-cols-3 gap-2.5">
        {tiles.map(t =>
          jump
            ? (
                <button
                  key={t.id}
                  className={tileClass}
                  type="button"
                  onClick={() =>
                    document
                      .getElementById(`chapter-${t.id}`)
                      ?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                >
                  {face(t)}
                </button>
              )
            : t.id === 'tours'
              ? (
                  <Link key={t.id} className={tileClass} to="/tours">
                    {face(t)}
                  </Link>
                )
              : (
                  <Link
                    key={t.id}
                    className={tileClass}
                    search={
                      t.id === 'victorinox' ? { subcategory: 'victorinox' } : {}
                    }
                    to="/gifts"
                  >
                    {face(t)}
                  </Link>
                ),
        )}
      </div>
    </section>
  )
}

function useStories(filter: CategoryFilter) {
  const { articles, categoryOf } = useBlogData()

  return articles.filter(a => filter === 'all' || categoryOf(a) === filter)
}

function EmptyStories() {
  const { c } = useBlogData()

  return (
    <p className="rounded-3xl bg-surface p-5 text-sm text-muted shadow-surface">
      {c.empty}
    </p>
  )
}

function HeroWithEffect({ effect }: { effect: Effect }) {
  const view = useDiscoveryView()

  return (
    <div className="relative -mx-4 px-4">
      <Hero {...view.hero} />
      {/* The lights hang across the Chapel Bridge photo, clear of the top row and the greeting. */}
      <CoverEffects effect={effect} lightsClassName="bottom-[148px]" />
    </div>
  )
}

function ToursChapter({
  number,
  withStory,
}: {
  number: number
  withStory?: boolean
}) {
  const view = useDiscoveryView()

  return (
    <section className="flex scroll-mt-4 flex-col gap-4" id="chapter-tours">
      <ChapterHeading
        chapter="tours"
        number={number}
        seeAll={{ label: view.tours.seeAll, to: '/tours' }}
      />
      {withStory && view.tours.story && <StoryRow {...view.tours.story} />}
      <Rail label={view.tours.title}>
        {view.tours.items.map(tour => (
          <li key={tour.id}>
            <TourCard layout="carousel" tour={tour} />
          </li>
        ))}
      </Rail>
    </section>
  )
}

function VictorinoxChapter({ number }: { number: number }) {
  const view = useDiscoveryView()

  return (
    <section
      className="flex scroll-mt-4 flex-col gap-4"
      id="chapter-victorinox"
    >
      <ChapterHeading chapter="victorinox" number={number} />
      <VictorinoxShowcase isLoading={false} {...view.victorinox} />
    </section>
  )
}

function KeepsakesChapter({
  number,
  withStory,
}: {
  number: number
  withStory?: boolean
}) {
  const view = useDiscoveryView()
  const { t } = useLocale()
  const { articles, linkOf } = useBlogData()
  const giftStory = articles.find(
    a => a.slug !== 'victorinox-story' && linkOf(a)?.kind === 'gift',
  )

  return (
    <section className="flex scroll-mt-4 flex-col gap-4" id="chapter-keepsakes">
      <ChapterHeading
        chapter="keepsakes"
        number={number}
        seeAll={{ label: view.keepsakes.seeAll, to: '/gifts' }}
      />
      {withStory && giftStory && (
        <StoryRow
          meta={t('home.storyRow', { minutes: giftStory.readMinutes })}
          photo={giftStory.photo}
          slug={giftStory.slug}
          title={giftStory.title}
        />
      )}
      <Rail label={view.keepsakes.title}>
        {view.keepsakes.items.map(item => (
          <li key={item.slug} className="flex">
            <ProductCard {...item} layout="carousel" />
          </li>
        ))}
      </Rail>
    </section>
  )
}

function Closing() {
  const view = useDiscoveryView()

  return <AdviceBanner {...view.advice} />
}

const page = 'flex flex-col gap-10 px-4 pb-10'

/**
 * R2-A · Chapters: hero, then the story chapter (circles, a lead story, three more),
 * the tiles as a bridge that jumps to the next chapters, then Tours, Victorinox and Keepsakes.
 */
export function ChaptersHome({ effect }: StoryHomeProps) {
  const { c } = useBlogData()
  const [filter, setFilter] = useState<CategoryFilter>('all')
  const stories = useStories(filter)
  const [lead, ...more] = stories

  return (
    <div className={page}>
      <HeroWithEffect effect={effect} />

      <section className="flex flex-col gap-4" id="chapter-stories">
        <ChapterHeading
          chapter="stories"
          number={1}
          seeAll={{ label: c.allStories, to: '/stories' }}
        />
        <StoryCircles value={filter} onChange={setFilter} />
        <div aria-live="polite" className="flex flex-col gap-5">
          {lead ? <FeedCard article={lead} /> : <EmptyStories />}
          {more.slice(0, 3).map(article => (
            <CompactRow key={article.id} article={article} />
          ))}
        </div>
      </section>

      <DiscoverTiles jump wording="discover" />
      <ToursChapter number={2} />
      <VictorinoxChapter number={3} />
      <KeepsakesChapter number={4} />
      <Closing />
    </div>
  )
}

function PortraitStory({ article }: { article: Article }) {
  return (
    <Link
      className="block overflow-hidden rounded-[28px] outline-none focus-visible:focus-ring"
      params={{ slug: article.slug }}
      to="/stories/$slug"
    >
      <Media alt="" className="aspect-[4/5]" photo={article.photo}>
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/15 to-transparent" />
        <div className="absolute inset-x-4 bottom-4 flex flex-col gap-1.5">
          <StoryMeta light article={article} />
          <h3 className="font-serif text-[23px] leading-[29px] font-medium text-balance text-white">
            {article.title}
          </h3>
        </div>
      </Media>
    </Link>
  )
}

/**
 * R2-B · Storybook: the circles sit right under the hero, the stories swipe like a book
 * of large portrait cards, and the tiles close the page as "Bring Luzerne home".
 */
export function StorybookHome({ effect }: StoryHomeProps) {
  const { c } = useBlogData()
  const [filter, setFilter] = useState<CategoryFilter>('all')
  const stories = useStories(filter)

  return (
    <div className={page}>
      <div className="flex flex-col gap-6">
        <HeroWithEffect effect={effect} />
        <StoryCircles value={filter} onChange={setFilter} />
      </div>

      <section className="flex flex-col gap-4" id="chapter-stories">
        <ChapterHeading
          chapter="stories"
          number={1}
          seeAll={{ label: c.allStories, to: '/stories' }}
        />
        {stories.length > 0
          ? (
              <ScrollShadow
                hideScrollBar
                className="-mx-4"
                orientation="horizontal"
                size={0}
              >
                <ul
                  aria-live="polite"
                  className="flex snap-x snap-mandatory gap-3 px-4 pb-1"
                >
                  {stories.slice(0, 6).map(article => (
                    <li key={article.id} className="w-[80%] shrink-0 snap-center">
                      <PortraitStory article={article} />
                    </li>
                  ))}
                </ul>
              </ScrollShadow>
            )
          : (
              <EmptyStories />
            )}
      </section>

      <ToursChapter number={2} />
      <VictorinoxChapter number={3} />
      <KeepsakesChapter number={4} />
      <DiscoverTiles jump={false} wording="bring" />
      <Closing />
    </div>
  )
}

/**
 * R2-C · Story threads: like A, but every later chapter opens with the story behind it,
 * so the page reads as one walk from the stories to the shop.
 */
export function ThreadsHome({ effect }: StoryHomeProps) {
  const { c } = useBlogData()
  const [filter, setFilter] = useState<CategoryFilter>('all')
  const stories = useStories(filter).slice(0, 4)

  return (
    <div className={page}>
      <HeroWithEffect effect={effect} />

      <section className="flex flex-col gap-4" id="chapter-stories">
        <ChapterHeading
          chapter="stories"
          number={1}
          seeAll={{ label: c.allStories, to: '/stories' }}
        />
        <StoryCircles value={filter} onChange={setFilter} />
        <div aria-live="polite" className="grid grid-cols-2 gap-x-3 gap-y-5">
          {stories.map(article => (
            <Link
              key={article.id}
              className="flex flex-col gap-2 rounded-3xl outline-none focus-visible:focus-ring"
              params={{ slug: article.slug }}
              to="/stories/$slug"
            >
              <Media
                alt=""
                className="aspect-[4/5] rounded-3xl"
                photo={article.photo}
              />
              <div className="flex flex-col gap-0.5 px-0.5">
                <h3 className="line-clamp-3 font-serif text-[16px] leading-[22px] font-medium">
                  {article.title}
                </h3>
                <p className="text-label text-muted">
                  {c.minRead(article.readMinutes)}
                </p>
              </div>
            </Link>
          ))}
        </div>
        {stories.length === 0 && <EmptyStories />}
      </section>

      <DiscoverTiles jump wording="streets" />
      <ToursChapter withStory number={2} />
      <VictorinoxChapter number={3} />
      <KeepsakesChapter withStory number={4} />
      <Closing />
    </div>
  )
}
