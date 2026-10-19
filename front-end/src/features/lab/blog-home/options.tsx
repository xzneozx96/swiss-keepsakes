import type { CategoryFilter } from './data'
import type { Effect } from './effects'
import type { Article } from '@/features/content/types'

import { ScrollShadow } from '@heroui/react'
import { Link } from '@tanstack/react-router'
import { useState } from 'react'

import { Media } from '@/components/media'
import { useDemoNow } from '@/features/demo'
import { categories, categoryPhoto, useBlogData } from './data'

import { CoverEffects } from './effects'
import {
  AuthorsCard,
  CategoryChips,
  ChristmasRail,
  CompactRow,
  EmptyFeed,
  FeedCard,
  GentleLinkLine,
  SectionHeading,
  ShopStrip,
  StoryMeta,
  TopBar,
} from './shared'

export interface BlogHomeOptionProps {
  effect: Effect
  /** Advent edition only: the December day to preview. */
  today?: number
}

function useFeed(cover: Article | undefined, filter: CategoryFilter) {
  const { articles, categoryOf } = useBlogData()

  return articles.filter(
    a => a.id !== cover?.id && (filter === 'all' || categoryOf(a) === filter),
  )
}

/** A · Cover story: one full-bleed story, category chips, a vertical feed, then the shop. */
export function CoverHome({ effect }: BlogHomeOptionProps) {
  const { c, articles, linkOf } = useBlogData()
  const [filter, setFilter] = useState<CategoryFilter>('all')
  const cover
    = articles.find(a => a.slug === 'musegg-morning') ?? articles[0]
  const feed = useFeed(cover, filter).slice(0, 5)
  const coverLink = cover && linkOf(cover)

  return (
    <div className="flex flex-col gap-9 pb-10">
      <div className="flex flex-col gap-3">
        <TopBar />
        {cover && (
          <section className="flex flex-col gap-2 px-4">
            <Link
              className="relative block overflow-hidden rounded-[28px] outline-none focus-visible:focus-ring"
              params={{ slug: cover.slug }}
              to="/stories/$slug"
            >
              <Media alt="" className="aspect-[4/5]" photo={cover.photo}>
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/5" />
                <CoverEffects effect={effect} />
                <div className="absolute inset-x-5 bottom-5 z-20 flex flex-col gap-2 text-white">
                  <span className="self-start rounded-full bg-white/90 px-2.5 py-0.5 text-[12px] font-medium text-foreground">
                    {c.cover}
                  </span>
                  <h1 className="font-serif text-display text-balance">
                    {cover.title}
                  </h1>
                  <p className="line-clamp-2 text-sm text-white/85">
                    {cover.excerpt}
                  </p>
                  <p className="text-label text-white/85">
                    {c.by} {cover.author.name} · {c.minRead(cover.readMinutes)}
                  </p>
                </div>
              </Media>
            </Link>
            {coverLink && (
              <div className="px-1">
                <GentleLinkLine link={coverLink} />
              </div>
            )}
          </section>
        )}
      </div>

      <section className="flex flex-col gap-4">
        <SectionHeading seeAll={c.allStories} title={c.latest} />
        <CategoryChips value={filter} onChange={setFilter} />
        <div aria-live="polite" className="flex flex-col gap-7 px-4">
          {feed.map(article => (
            <FeedCard key={article.id} article={article} />
          ))}
        </div>
        {feed.length === 0 && <EmptyFeed />}
      </section>

      <ChristmasRail />
      <ShopStrip />
      <AuthorsCard />
    </div>
  )
}

/** B · Story circles: category circles like Instagram, a swipeable featured deck, then a compact list. */
export function CirclesHome({ effect }: BlogHomeOptionProps) {
  const { c, articles } = useBlogData()
  const [filter, setFilter] = useState<CategoryFilter>('all')
  const featured = articles.slice(0, 4)
  const list = useFeed(undefined, filter).filter(
    a => filter !== 'all' || !featured.includes(a),
  )

  return (
    <div className="flex flex-col gap-8 pb-10">
      <div className="flex flex-col gap-4">
        <TopBar />
        <ScrollShadow hideScrollBar orientation="horizontal" size={24}>
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
                  aria-pressed={filter === item}
                  className="group flex w-[68px] shrink-0 flex-col items-center gap-1.5 rounded-xl outline-none focus-visible:focus-ring"
                  type="button"
                  onClick={() => setFilter(filter === item ? 'all' : item)}
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
                  <span className="line-clamp-2 text-center text-[12px] leading-4 font-medium">
                    {c.category[item]}
                  </span>
                </button>
              ))}
          </div>
        </ScrollShadow>
      </div>

      {filter === 'all' && (
        <section className="flex flex-col gap-3">
          <SectionHeading title={c.featured} />
          <div className="relative">
            <ScrollShadow hideScrollBar orientation="horizontal" size={0}>
              <ul className="flex snap-x snap-mandatory gap-3 px-4 pb-1">
                {featured.map(article => (
                  <li key={article.id} className="w-[82%] shrink-0 snap-center">
                    <Link
                      className="block overflow-hidden rounded-[28px] outline-none focus-visible:focus-ring"
                      params={{ slug: article.slug }}
                      to="/stories/$slug"
                    >
                      <Media
                        alt=""
                        className="aspect-[4/5]"
                        photo={article.photo}
                      >
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/15 to-transparent" />
                        <div className="absolute inset-x-4 bottom-4 z-20 flex flex-col gap-1.5">
                          <StoryMeta light article={article} />
                          <h3 className="font-serif text-[24px] leading-[30px] font-medium text-balance text-white">
                            {article.title}
                          </h3>
                        </div>
                      </Media>
                    </Link>
                  </li>
                ))}
              </ul>
            </ScrollShadow>
            <div className="pointer-events-none absolute inset-0">
              <CoverEffects effect={effect} />
            </div>
          </div>
        </section>
      )}

      <section className="flex flex-col gap-3">
        <SectionHeading
          seeAll={c.allStories}
          title={filter === 'all' ? c.latest : c.category[filter]}
        />
        <div aria-live="polite" className="flex flex-col gap-4 px-4">
          {list.map(article => (
            <CompactRow key={article.id} article={article} />
          ))}
        </div>
        {list.length === 0 && <EmptyFeed />}
      </section>

      <ChristmasRail />
      <ShopStrip />
      <AuthorsCard />
    </div>
  )
}

/** C · Today's edition: a dated masthead, one lead story, numbered short reads, the writers' picks. */
export function EditionHome({ effect }: BlogHomeOptionProps) {
  const { c, articles, authors, language, linkOf } = useBlogData()
  const now = useDemoNow()
  const lead = articles[0]
  const short = articles.slice(1, 6)
  const picks = authors
    .map(author => ({
      author,
      article: articles.find(
        a => a.author.name === author.name && a.id !== lead?.id,
      ),
    }))
    .filter((p): p is { author: Article['author'], article: Article } =>
      Boolean(p.article),
    )
  const leadLink = lead && linkOf(lead)
  const date = new Intl.DateTimeFormat(language === 'de' ? 'de-CH' : 'en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(now)

  return (
    <div className="flex flex-col gap-9 pb-10">
      <div className="flex flex-col gap-5">
        <TopBar />
        <header className="flex flex-col items-center gap-1 border-y border-foreground/80 mx-4 py-3 text-center">
          <p className="font-serif text-[28px] leading-9 font-medium">
            {c.journal}
          </p>
          <p className="text-label text-muted first-letter:uppercase">
            {date} · Luzern
          </p>
        </header>

        {lead && (
          <section className="flex flex-col gap-3 px-4">
            <Link
              className="flex flex-col gap-3 rounded-3xl outline-none focus-visible:focus-ring"
              params={{ slug: lead.slug }}
              to="/stories/$slug"
            >
              <Media
                alt=""
                className="aspect-[3/2] rounded-3xl"
                photo={lead.photo}
              >
                <CoverEffects effect={effect} />
              </Media>
              <div className="flex flex-col gap-1.5">
                <StoryMeta article={lead} />
                <h1 className="font-serif text-display text-balance">
                  {lead.title}
                </h1>
                <p className="text-[15px] leading-6 text-foreground/80">
                  {lead.excerpt}
                </p>
                <p className="text-label text-muted">
                  {c.by} {lead.author.name}
                </p>
              </div>
            </Link>
            {leadLink && <GentleLinkLine link={leadLink} />}
          </section>
        )}
      </div>

      <section className="flex flex-col gap-4">
        <SectionHeading seeAll={c.allStories} title={c.shortReads} />
        <ol className="flex flex-col divide-y divide-separator px-4">
          {short.map((article, i) => (
            <li key={article.id} className="py-3 first:pt-0">
              <CompactRow article={article} index={i + 1} />
            </li>
          ))}
        </ol>
      </section>

      {picks.length > 0 && (
        <section className="flex flex-col gap-3">
          <SectionHeading title={c.picks} />
          <div className="grid grid-cols-2 gap-3 px-4">
            {picks.slice(0, 2).map(({ author, article }) => (
              <Link
                key={author.name}
                className="flex flex-col gap-2 rounded-3xl outline-none focus-visible:focus-ring"
                params={{ slug: article.slug }}
                to="/stories/$slug"
              >
                <Media
                  alt=""
                  className="aspect-square rounded-3xl"
                  photo={article.photo}
                >
                  <span className="absolute top-2 left-2 flex items-center gap-1.5 rounded-full bg-white/95 py-0.5 pr-2.5 pl-0.5 text-[12px] font-medium">
                    <span className="flex size-5 items-center justify-center rounded-full bg-accent-soft font-serif text-accent-soft-foreground">
                      {author.name.charAt(0)}
                    </span>
                    {c.pickOf(author.name)}
                  </span>
                </Media>
                <h3 className="line-clamp-3 px-1 font-serif text-[16px] leading-[22px] font-medium">
                  {article.title}
                </h3>
              </Link>
            ))}
          </div>
        </section>
      )}

      <ChristmasRail />
      <ShopStrip />
      <AuthorsCard />
    </div>
  )
}

/** D · Advent edition: December only. The calendar is the hero; one door opens per day. */
export function AdventHome({ effect, today = 1 }: BlogHomeOptionProps) {
  const { c, articles } = useBlogData()
  const doorStory = (day: number) => articles[(day - 1) % articles.length]
  const todays = doorStory(today)
  const rest = articles.filter(a => a.id !== todays?.id).slice(0, 4)

  return (
    <div className="flex flex-col gap-8 pb-10">
      <div className="flex flex-col gap-3">
        <TopBar />
        <section className="mx-4 overflow-hidden rounded-[28px] bg-[#1d2433] text-white">
          <Media alt="" className="h-52" photo="lucerne-night">
            <div className="absolute inset-0 bg-gradient-to-t from-[#1d2433] via-[#1d2433]/30 to-transparent" />
            <CoverEffects effect={effect} />
            <div className="absolute inset-x-5 bottom-3 z-20 flex flex-col gap-1">
              <h1 className="font-serif text-display">{c.adventTitle}</h1>
              <p className="text-sm text-white/85">{c.adventSub}</p>
            </div>
          </Media>
          <ol className="grid grid-cols-6 gap-1.5 p-4 pt-3">
            {Array.from({ length: 24 }, (_, i) => i + 1).map((day) => {
              const story = doorStory(day)
              const open = day <= today && story

              return (
                <li key={day}>
                  {open
                    ? (
                        <Link
                          aria-label={`${c.door(day)}: ${story.title}`}
                          className={`block overflow-hidden rounded-xl outline-none focus-visible:focus-ring ${day === today ? 'ring-2 ring-[#ffd27a] ring-offset-2 ring-offset-[#1d2433]' : ''}`}
                          params={{ slug: story.slug }}
                          to="/stories/$slug"
                        >
                          <Media
                            alt=""
                            className="aspect-square"
                            photo={story.photo}
                          >
                            <div className="absolute inset-0 bg-black/30" />
                            <span className="absolute bottom-0.5 left-1.5 font-serif text-[15px] font-medium text-white">
                              {day}
                            </span>
                          </Media>
                        </Link>
                      )
                    : (
                        <span
                          aria-label={c.opensOn(day)}
                          className="flex aspect-square items-center justify-center rounded-xl border border-white/15 bg-white/5 font-serif text-[15px] text-white/70"
                          role="img"
                        >
                          {day}
                        </span>
                      )}
                </li>
              )
            })}
          </ol>
        </section>
      </div>

      {todays && (
        <section className="flex flex-col gap-3">
          <SectionHeading subtitle={c.door(today)} title={c.todaysDoor} />
          <div className="px-4">
            <FeedCard article={todays} />
          </div>
        </section>
      )}

      <section className="flex flex-col gap-3">
        <SectionHeading seeAll={c.allStories} title={c.moreStories} />
        <div className="flex flex-col gap-4 px-4">
          {rest.map(article => (
            <CompactRow key={article.id} article={article} />
          ))}
        </div>
      </section>

      <ShopStrip />
      <AuthorsCard />
    </div>
  )
}
