import type { CategoryFilter } from './data'
import type { Effect } from './effects'
import type { StoriesStyle } from './stories-styles'
import type { Language } from '@/contexts/locale-context'

import { buttonVariants, ScrollShadow } from '@heroui/react'
import { Link, useNavigate } from '@tanstack/react-router'

import { ChevronRightIcon, StoryIcon } from '@/components/icons'
import { BackButton, CartButton } from '@/components/layout/cart-button'
import { Media } from '@/components/media'
import { useLocale } from '@/contexts/locale-context'
import { ProductCard } from '@/features/catalog/components/product-card'

import { AdviceBanner } from '@/features/discovery/components/advice-banner'
import { Hero } from '@/features/discovery/components/hero'
import { Rail } from '@/features/discovery/components/section'
import { VictorinoxShowcase } from '@/features/discovery/components/victorinox-showcase'
import { useDiscoveryView } from '@/features/discovery/hooks/use-discovery-view'
import { TourCard } from '@/features/tours/discovery/tour-card'
import { useBack } from '@/hooks/use-back'
import { categories, categoryPhoto, useBlogData } from './data'
import { CoverEffects } from './effects'
import { FeedCard } from './shared'
import { StoriesBlock } from './stories-styles'
import { TrailList } from './trail'

export type Voice = 'we' | 'brand' | 'me'
export type TilesMode = 'map' | 'recap'

type Act = 'read' | 'walk' | 'keep'

interface VoiceCopy {
  hello: string
  heroTitle: string
  narrator: string
  acts: Record<Act, { title: string, line: string }>
  mapTitle: string
  mapSubtitle: string
  recapTitle: string
  recapSubtitle: string
  askTitle: string
  askBody: string
}

const voices: Record<Language, Record<Voice, VoiceCopy>> = {
  en: {
    we: {
      hello: 'Grüezi!',
      heroTitle: 'This is our Luzerne. Read it, walk it, keep it.',
      narrator:
        'We’re Lukas and Sonja. We run Swiss Keepsakes and write about the corners of Luzerne we keep going back to.',
      acts: {
        read: {
          title: 'The Luzerne we know',
          line: 'Stories about the places we love, where we eat and the views worth the climb.',
        },
        walk: {
          title: 'Come and see it with us',
          line: 'Each tour follows places from our stories.',
        },
        keep: {
          title: 'Take a piece of Luzerne home',
          line: 'Swiss craft from just up the lake, and small things from local makers.',
        },
      },
      mapTitle: 'How we’ll show you Luzerne',
      mapSubtitle: 'Three steps, in the order we’d take a friend.',
      recapTitle: 'Ready when you are',
      recapSubtitle: 'See it with us, or take a piece of it home.',
      askTitle: 'Not sure where to start? Ask us.',
      askBody: 'Tell us your days in Luzerne and we’ll plan them with you.',
    },
    brand: {
      hello: 'Grüezi!',
      heroTitle:
        'Discover Luzerne with Swiss Keepsakes. Read it, walk it, keep it.',
      narrator:
        'Swiss Keepsakes is a small shop in Luzerne. Its team writes about the city it calls home.',
      acts: {
        read: {
          title: 'Luzerne, story by story',
          line: 'Places worth knowing, where to eat and the views worth the climb.',
        },
        walk: {
          title: 'See it on a tour',
          line: 'Every tour follows places from the stories.',
        },
        keep: {
          title: 'Take a piece of Luzerne home',
          line: 'Swiss craft from just up the lake, and small things from local makers.',
        },
      },
      mapTitle: 'Three ways to discover Luzerne',
      mapSubtitle: 'Read the stories, walk the places, keep a piece.',
      recapTitle: 'Luzerne, to see and to keep',
      recapSubtitle: 'Book a tour or take a piece of the city home.',
      askTitle: 'Not sure where to start?',
      askBody:
        'Tell Swiss Keepsakes your days in Luzerne and get a plan from locals.',
    },
    me: {
      hello: 'Grüezi, I’m Sonja!',
      heroTitle: 'This is my Luzerne. Read it, walk it, keep it.',
      narrator:
        'I run Swiss Keepsakes and write about the corners of Luzerne I keep going back to.',
      acts: {
        read: {
          title: 'The Luzerne I know',
          line: 'Stories about the places I love, where I eat and the views worth the climb.',
        },
        walk: {
          title: 'Come and see it for yourself',
          line: 'Our guides take you to the places in my stories.',
        },
        keep: {
          title: 'Take a piece of Luzerne home',
          line: 'Swiss craft from just up the lake, and small things from local makers.',
        },
      },
      mapTitle: 'How I’ll show you Luzerne',
      mapSubtitle: 'Three steps, in the order I’d take a friend.',
      recapTitle: 'Ready when you are',
      recapSubtitle: 'Go and see it, or take a piece of it home.',
      askTitle: 'Not sure where to start? Ask me.',
      askBody: 'Tell me your days in Luzerne and I’ll help you plan them.',
    },
  },
  de: {
    we: {
      hello: 'Grüezi!',
      heroTitle: 'Das ist unser Luzern. Lesen, erleben, mitnehmen.',
      narrator:
        'Wir sind Lukas und Sonja. Wir führen Swiss Keepsakes und schreiben über die Ecken Luzerns, zu denen wir immer wieder zurückkehren.',
      acts: {
        read: {
          title: 'Das Luzern, das wir kennen',
          line: 'Geschichten über Orte, die wir lieben, wo wir essen und welche Aussicht sich lohnt.',
        },
        walk: {
          title: 'Komm und erlebe es mit uns',
          line: 'Jede Tour führt zu Orten aus unseren Geschichten.',
        },
        keep: {
          title: 'Ein Stück Luzern für zu Hause',
          line: 'Schweizer Handwerk von gleich um die Ecke und kleine Dinge von lokalen Herstellern.',
        },
      },
      mapTitle: 'So zeigen wir dir Luzern',
      mapSubtitle: 'Drei Schritte, so wie wir es mit Freunden machen.',
      recapTitle: 'Bereit, wenn du es bist',
      recapSubtitle: 'Erlebe es mit uns oder nimm ein Stück davon mit.',
      askTitle: 'Weisst du nicht, wo anfangen? Frag uns.',
      askBody:
        'Erzähl uns von deinen Tagen in Luzern, und wir planen sie mit dir.',
    },
    brand: {
      hello: 'Grüezi!',
      heroTitle:
        'Entdecke Luzern mit Swiss Keepsakes. Lesen, erleben, mitnehmen.',
      narrator:
        'Swiss Keepsakes ist ein kleiner Laden in Luzern. Das Team schreibt über die Stadt, die es sein Zuhause nennt.',
      acts: {
        read: {
          title: 'Luzern, Geschichte für Geschichte',
          line: 'Orte, die man kennen sollte, wo man isst und welche Aussicht sich lohnt.',
        },
        walk: {
          title: 'Erlebe es auf einer Tour',
          line: 'Jede Tour führt zu Orten aus den Geschichten.',
        },
        keep: {
          title: 'Ein Stück Luzern für zu Hause',
          line: 'Schweizer Handwerk von gleich um die Ecke und kleine Dinge von lokalen Herstellern.',
        },
      },
      mapTitle: 'Drei Wege, Luzern zu entdecken',
      mapSubtitle: 'Geschichten lesen, Orte erleben, ein Stück mitnehmen.',
      recapTitle: 'Luzern zum Erleben und Mitnehmen',
      recapSubtitle: 'Buche eine Tour oder nimm ein Stück der Stadt mit.',
      askTitle: 'Weisst du nicht, wo anfangen?',
      askBody:
        'Erzähl Swiss Keepsakes von deinen Tagen in Luzern und erhalte einen Plan von Einheimischen.',
    },
    me: {
      hello: 'Grüezi, ich bin Sonja!',
      heroTitle: 'Das ist mein Luzern. Lesen, erleben, mitnehmen.',
      narrator:
        'Ich führe Swiss Keepsakes und schreibe über die Ecken Luzerns, zu denen ich immer wieder zurückkehre.',
      acts: {
        read: {
          title: 'Das Luzern, das ich kenne',
          line: 'Geschichten über Orte, die ich liebe, wo ich esse und welche Aussicht sich lohnt.',
        },
        walk: {
          title: 'Komm und erlebe es selbst',
          line: 'Unsere Guides führen dich zu den Orten aus meinen Geschichten.',
        },
        keep: {
          title: 'Ein Stück Luzern für zu Hause',
          line: 'Schweizer Handwerk von gleich um die Ecke und kleine Dinge von lokalen Herstellern.',
        },
      },
      mapTitle: 'So zeige ich dir Luzern',
      mapSubtitle: 'Drei Schritte, so wie ich es mit Freunden mache.',
      recapTitle: 'Bereit, wenn du es bist',
      recapSubtitle: 'Erlebe es selbst oder nimm ein Stück davon mit.',
      askTitle: 'Weisst du nicht, wo anfangen? Frag mich.',
      askBody:
        'Erzähl mir von deinen Tagen in Luzern, und ich helfe dir beim Planen.',
    },
  },
}

const common = {
  en: {
    acts: { read: 'Read it', walk: 'Walk it', keep: 'Keep it' } as Record<
      Act,
      string
    >,
    steps: {
      read: {
        title: 'Read the stories',
        line: 'Where to eat, what to see and the views worth the climb.',
      },
      walk: {
        title: 'Walk the places',
        line: 'Small tours to the places in the stories.',
      },
      keep: {
        title: 'Keep a piece',
        line: 'A Swiss knife or a keepsake to take home.',
      },
    } as Record<Act, { title: string, line: string }>,
    search: 'Search stories and places',
    fromStory: 'From the story',
    moreKeepsakes: 'More keepsakes',
    allStories: 'All stories',
    showAllStories: (n: number) =>
      n === 1 ? `Show ${n} story` : `Show all ${n} stories`,
    listTitle: 'Local stories',
    listIntro: 'The places we love around Luzerne, one story at a time.',
    count: (n: number) => (n === 1 ? '1 story' : `${n} stories`),
    tours: 'Tours',
    keepsakes: 'Keepsakes',
    toursCaption: 'Go and see it',
    vxCaption: 'Swiss craft',
    keepsakesCaption: 'Take it home',
  },
  de: {
    acts: { read: 'Lesen', walk: 'Erleben', keep: 'Mitnehmen' } as Record<
      Act,
      string
    >,
    steps: {
      read: {
        title: 'Die Geschichten lesen',
        line: 'Wo man isst, was man sieht und welche Aussicht sich lohnt.',
      },
      walk: {
        title: 'Die Orte erleben',
        line: 'Kleine Touren zu den Orten aus den Geschichten.',
      },
      keep: {
        title: 'Ein Stück mitnehmen',
        line: 'Ein Schweizer Messer oder ein Andenken für zu Hause.',
      },
    } as Record<Act, { title: string, line: string }>,
    search: 'Geschichten und Orte suchen',
    fromStory: 'Aus der Geschichte',
    moreKeepsakes: 'Weitere Andenken',
    allStories: 'Alle Geschichten',
    showAllStories: (n: number) =>
      n === 1 ? `${n} Geschichte anzeigen` : `Alle ${n} Geschichten anzeigen`,
    listTitle: 'Lokale Geschichten',
    listIntro:
      'Orte rund um Luzern, die wir lieben, eine Geschichte nach der anderen.',
    count: (n: number) => (n === 1 ? '1 Geschichte' : `${n} Geschichten`),
    tours: 'Touren',
    keepsakes: 'Andenken',
    toursCaption: 'Selbst erleben',
    vxCaption: 'Schweizer Handwerk',
    keepsakesCaption: 'Mitnehmen',
  },
}

const circleClass
  = 'group flex w-[72px] shrink-0 snap-start flex-col items-center gap-1.5 rounded-xl outline-none focus-visible:focus-ring'

/**
 * The warm ring marks a circle to tap: every circle on the home, and the chosen one on
 * the story list. The other circles on the list get a plain light-grey ring.
 */
function CircleFace({
  item,
  label,
  highlighted,
}: {
  item: CategoryFilter
  label: string
  highlighted: boolean
}) {
  return (
    <>
      <span
        className={`rounded-full p-[2.5px] ${highlighted ? 'bg-gradient-to-tr from-[#f4b860] via-accent to-[#a3241a]' : 'bg-separator'}`}
      >
        <span className="block rounded-full bg-background p-[2px]">
          {item === 'all'
            ? (
                <span className="flex size-[58px] items-center justify-center rounded-full bg-accent-soft text-accent-soft-foreground">
                  <StoryIcon size={26} />
                </span>
              )
            : (
                <Media
                  alt=""
                  className="size-[58px] rounded-full"
                  photo={categoryPhoto[item]}
                />
              )}
        </span>
      </span>
      <span className="line-clamp-2 text-center text-[12px] leading-4 font-medium">
        {label}
      </span>
    </>
  )
}

/**
 * Story categories as circles in one sideways-scrolling row, "All stories" first.
 * On the home they open the story list with that category; on the list they filter it.
 */
export function StoryCircles({
  mode,
  value = 'all',
  voice,
}: {
  mode: 'link' | 'filter'
  value?: CategoryFilter
  voice: Voice
}) {
  const { c, language } = useBlogData()
  const navigate = useNavigate()
  const label = (item: CategoryFilter) =>
    item === 'all' ? common[language].allStories : c.category[item]

  return (
    <ScrollShadow
      hideScrollBar
      className="-mx-4"
      orientation="horizontal"
      size={24}
    >
      <ul
        aria-label={common[language].listTitle}
        className="flex w-max snap-x gap-3 px-4 pt-1.5 pb-1"
      >
        {categories.map(item => (
          <li key={item}>
            {mode === 'link'
              ? (
                  <Link
                    className={circleClass}
                    search={{ category: item, voice }}
                    to="/lab/blog-home/stories"
                  >
                    <CircleFace highlighted item={item} label={label(item)} />
                  </Link>
                )
              : (
                  <button
                    aria-pressed={value === item}
                    className={circleClass}
                    type="button"
                    onClick={() =>
                      navigate({
                        to: '/lab/blog-home/stories',
                        search: { category: item, voice },
                        replace: true,
                      })}
                  >
                    <CircleFace
                      highlighted={value === item}
                      item={item}
                      label={label(item)}
                    />
                  </button>
                )}
          </li>
        ))}
      </ul>
    </ScrollShadow>
  )
}

function ActHeading({
  act,
  number,
  voice,
  seeAll,
}: {
  act: Act
  number: number
  voice: Voice
  seeAll?: { label: string, to: '/tours' | '/gifts' }
}) {
  const { language } = useLocale()
  const copy = voices[language][voice].acts[act]

  return (
    <div className="flex items-end justify-between gap-4">
      <div className="flex min-w-0 flex-col gap-1">
        <p className="flex items-center gap-2 text-[12px] font-semibold tracking-[0.14em] text-accent-soft-foreground uppercase">
          <span className="font-serif text-[15px] tracking-normal text-accent">
            {String(number).padStart(2, '0')}
          </span>
          {common[language].acts[act]}
        </p>
        <h2 className="font-serif text-[24px] leading-[30px] font-medium text-balance">
          {copy.title}
        </h2>
        <p className="text-sm text-muted">{copy.line}</p>
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

const tileClass
  = 'relative block overflow-hidden rounded-3xl text-left outline-none focus-visible:focus-ring active:scale-[0.98]'

function TileFace({
  photo,
  caption,
  label,
}: {
  photo: string
  caption: string
  label: string
}) {
  return (
    <Media alt="" className="aspect-[3/4]" photo={photo}>
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
      <span className="absolute inset-x-2.5 bottom-2.5 flex flex-col text-white">
        <span className="text-[12px] leading-4 text-white/85">{caption}</span>
        <span className="text-sm leading-5 font-medium">{label}</span>
      </span>
    </Media>
  )
}

/** Tiles at the top: the three acts as a journey map; each tile scrolls to its act. */
function JourneyMap({ voice }: { voice: Voice }) {
  const { language } = useLocale()
  const v = voices[language][voice]
  const k = common[language]
  const steps: { act: Act, photo: string, color: string }[] = [
    { act: 'read', photo: 'musegg-wall', color: '#d52b1e' },
    { act: 'walk', photo: 'rigi-vitznau-train', color: '#1f5fa8' },
    { act: 'keep', photo: 'victorinox-spartan', color: '#3a7d7c' },
  ]

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-col gap-0.5">
        <h2 className="text-heading">{v.mapTitle}</h2>
        <p className="text-label text-muted">{v.mapSubtitle}</p>
      </div>
      <TrailList
        stops={steps.map(({ act, photo, color }) => ({
          key: act,
          photo,
          color,
          eyebrow: k.acts[act],
          title: k.steps[act].title,
          meta: k.steps[act].line,
          action: {
            onClick: () =>
              document
                .getElementById(`act-${act}`)
                ?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
          },
        }))}
      />
    </section>
  )
}

/** Tiles at the end: Tours, Victorinox and Keepsakes as a recap before the epilogue. */
function Recap({ voice }: { voice: Voice }) {
  const { language } = useLocale()
  const v = voices[language][voice]
  const k = common[language]

  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-col gap-0.5">
        <h2 className="text-heading">{v.recapTitle}</h2>
        <p className="text-label text-muted">{v.recapSubtitle}</p>
      </div>
      <div className="grid grid-cols-3 gap-2.5">
        <Link className={tileClass} to="/tours">
          <TileFace
            caption={k.toursCaption}
            label={k.tours}
            photo="rigi-vitznau-train"
          />
        </Link>
        <Link
          className={tileClass}
          search={{ subcategory: 'victorinox' }}
          to="/gifts"
        >
          <TileFace
            caption={k.vxCaption}
            label="Victorinox"
            photo="victorinox-spartan"
          />
        </Link>
        <Link className={tileClass} to="/gifts">
          <TileFace
            caption={k.keepsakesCaption}
            label={k.keepsakes}
            photo="postcards"
          />
        </Link>
      </div>
    </section>
  )
}

function Narrator({ voice }: { voice: Voice }) {
  const { language } = useLocale()
  const { authors } = useBlogData()
  const people
    = voice === 'me'
      ? authors.filter(a => a.name.startsWith('Ng'))
      : voice === 'we'
        ? authors
        : []

  return (
    <div className="flex items-center gap-3 rounded-3xl bg-hero-cream p-4">
      {people.length > 0
        ? (
            <span className="flex shrink-0 -space-x-2">
              {people.map(p => (
                <span
                  key={p.name}
                  className="flex size-10 items-center justify-center rounded-full bg-accent-soft font-serif text-lg text-accent-soft-foreground ring-2 ring-hero-cream"
                >
                  {p.name.charAt(0)}
                </span>
              ))}
            </span>
          )
        : (
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-accent font-serif text-lg text-white">
              S
            </span>
          )}
      <p className="text-sm text-foreground/85">
        {voices[language][voice].narrator}
      </p>
    </div>
  )
}

/**
 * R3 · Read it, walk it, keep it: one narrator, one journey. Hero welcome, three acts
 * (stories, tours tied to their stories, then Victorinox and keepsakes as one ending)
 * and "ask us" as the epilogue. The tiles open the page as a map or close it as a recap.
 */
export function JourneyHome({
  effect,
  voice,
  tiles,
  storiesStyle,
}: {
  effect: Effect
  voice: Voice
  tiles: TilesMode
  storiesStyle: StoriesStyle
}) {
  const { language } = useLocale()
  const view = useDiscoveryView()
  const { articles } = useBlogData()
  const v = voices[language][voice]
  const k = common[language]
  const storyForTour = (tourId: string) =>
    articles.find(a =>
      a.links.some(l => l.kind === 'tour' && l.id === tourId),
    )

  return (
    <div className="flex flex-col gap-10 px-4 pb-10">
      <div className="flex flex-col gap-5">
        <div className="relative -mx-4 px-4">
          <Hero
            {...view.hero}
            hello={v.hello}
            searchPrompt={k.search}
            title={v.heroTitle}
          />
          <CoverEffects effect={effect} lightsClassName="bottom-[148px]" />
        </div>
        <Narrator voice={voice} />
      </div>

      {tiles === 'map' && <JourneyMap voice={voice} />}

      <section className="flex scroll-mt-4 flex-col gap-4" id="act-read">
        <ActHeading act="read" number={1} voice={voice} />
        <StoryCircles mode="link" voice={voice} />
        <StoriesBlock articles={articles} style={storiesStyle} />
        {/* Same treatment as "Show all {count} reviews" and the comments' show-all button. */}
        <Link
          className={`${buttonVariants({ variant: 'secondary', size: 'lg', fullWidth: true })} transition-transform active:scale-[0.98]`}
          search={{ category: 'all', voice }}
          to="/lab/blog-home/stories"
        >
          {k.showAllStories(articles.length)}
        </Link>
      </section>

      <section className="flex scroll-mt-4 flex-col gap-4" id="act-walk">
        <ActHeading
          act="walk"
          number={2}
          seeAll={{ label: view.tours.seeAll, to: '/tours' }}
          voice={voice}
        />
        <Rail label={v.acts.walk.title}>
          {view.tours.items.map((tour) => {
            const story = storyForTour(tour.id)

            return (
              <li key={tour.id} className="flex flex-col gap-2">
                <TourCard layout="carousel" tour={tour} />
                {story && (
                  <Link
                    className="flex w-60 items-center gap-2 rounded-xl px-1 text-label outline-none focus-visible:focus-ring"
                    params={{ slug: story.slug }}
                    to="/stories/$slug"
                  >
                    <StoryIcon className="shrink-0 text-accent" size={16} />
                    <span className="min-w-0">
                      <span className="text-muted">{k.fromStory}: </span>
                      <span className="underline decoration-separator underline-offset-4">
                        {story.title}
                      </span>
                    </span>
                  </Link>
                )}
              </li>
            )
          })}
        </Rail>
      </section>

      <section className="flex scroll-mt-4 flex-col gap-4" id="act-keep">
        <ActHeading act="keep" number={3} voice={voice} />
        <VictorinoxShowcase isLoading={false} {...view.victorinox} />
        <div className="flex items-end justify-between gap-4 pt-2">
          <h3 className="text-heading">{k.moreKeepsakes}</h3>
          <Link
            className="flex shrink-0 items-center gap-0.5 rounded-md py-1 text-sm font-medium text-muted outline-none focus-visible:focus-ring"
            to="/gifts"
          >
            {view.keepsakes.seeAll}
            <ChevronRightIcon size={16} />
          </Link>
        </div>
        <Rail label={k.moreKeepsakes}>
          {view.keepsakes.items.map(item => (
            <li key={item.slug} className="flex">
              <ProductCard {...item} layout="carousel" />
            </li>
          ))}
        </Rail>
      </section>

      {tiles === 'recap' && <Recap voice={voice} />}

      <AdviceBanner {...view.advice} body={v.askBody} title={v.askTitle} />
    </div>
  )
}

/** Lab copy of the C19 story list with the category circles as its filter. */
export function StoryListLab({
  category,
  voice,
}: {
  category: CategoryFilter
  voice: Voice
}) {
  const { t, language } = useLocale()
  const navigate = useNavigate()
  const back = useBack(
    () =>
      void navigate({
        to: '/lab/blog-home',
        search: {
          option: 'R3',
          effect: 'snow',
          tiles: 'map',
          voice,
          stories: 'reels-moving',
        },
        replace: true,
      }),
  )
  const { articles, categoryOf, c } = useBlogData()
  const k = common[language]
  const stories = articles.filter(
    a => category === 'all' || categoryOf(a) === category,
  )

  return (
    <div className="flex flex-1 flex-col">
      <Media alt="" className="h-[240px]" photo="lucerne-old-town">
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
          <h1 className="font-serif text-display">{k.listTitle}</h1>
          <p className="text-body text-white/85">{k.listIntro}</p>
        </header>
      </Media>
      <div className="relative -mt-6 flex flex-col gap-5 rounded-t-3xl bg-background px-4 pt-5 pb-10">
        <StoryCircles mode="filter" value={category} voice={voice} />
        <p aria-live="polite" className="text-label text-muted tabular-nums">
          {category === 'all' ? k.allStories : c.category[category]} ·{' '}
          {k.count(stories.length)}
        </p>
        {stories.length === 0
          ? (
              <p className="rounded-3xl bg-surface p-5 text-sm text-muted shadow-surface">
                {c.empty}
              </p>
            )
          : (
              <ul className="flex flex-col gap-7">
                {stories.map(article => (
                  <li key={article.id}>
                    <FeedCard article={article} />
                  </li>
                ))}
              </ul>
            )}
      </div>
    </div>
  )
}
