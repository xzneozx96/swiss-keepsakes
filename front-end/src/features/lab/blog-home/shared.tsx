import type { CategoryFilter, GentleLink } from './data'
import type { Article } from '@/features/content/types'

import { ScrollShadow } from '@heroui/react'
import { Link } from '@tanstack/react-router'

import logo from '@/assets/brand/swiss-keepsakes-logo.png'

import {
  AccountIcon,
  CartIcon,
  ChevronRightIcon,
  GiftIcon,
  SearchIcon,
  SparkleIcon,
  StoryIcon,
  TourIcon,
} from '@/components/icons'
import { Media } from '@/components/media'
import { useLocale } from '@/contexts/locale-context'
import { categories, christmasIdeas, useBlogData } from './data'

const iconButton
  = 'flex size-10 items-center justify-center rounded-full bg-surface shadow-surface outline-none focus-visible:focus-ring active:scale-95'

export function TopBar() {
  const { c } = useBlogData()

  return (
    <div className="flex items-center gap-2 px-4 pt-3">
      <div className="min-w-0 flex-1">
        <img
          alt="Swiss Keepsakes"
          className="h-auto max-h-10 w-full max-w-[200px] object-contain object-left"
          src={logo}
        />
      </div>
      <Link aria-label={c.search} className={iconButton} to="/search">
        <SearchIcon size={20} />
      </Link>
      <Link aria-label="Cart" className={iconButton} to="/cart">
        <CartIcon size={20} />
      </Link>
    </div>
  )
}

export function StoryMeta({
  article,
  light,
}: {
  article: Article
  light?: boolean
}) {
  const { c, categoryOf, areaOf } = useBlogData()

  return (
    <p className={`text-label ${light ? 'text-white/85' : 'text-muted'}`}>
      <span
        className={`font-medium ${light ? 'text-white' : 'text-accent-soft-foreground'}`}
      >
        {c.category[categoryOf(article)]}
      </span>
      {' · '}
      {areaOf(article)}
      {' · '}
      {c.minRead(article.readMinutes)}
    </p>
  )
}

/** The quiet shop link under a story: one line, no button. */
export function GentleLinkLine({ link }: { link: GentleLink }) {
  const { c } = useBlogData()
  const label = (
    <>
      <span className="text-muted">
        {link.kind === 'tour' ? c.tour : c.keepsake}
        :
      </span>
      {' '}
      <span className="underline decoration-separator underline-offset-4">
        {link.name}
      </span>
    </>
  )
  const className
    = 'inline-flex items-center gap-1 self-start rounded-md text-label outline-none focus-visible:focus-ring'

  return link.kind === 'tour'
    ? (
        <Link className={className} params={{ slug: link.slug }} to="/tours/$slug">
          <TourIcon className="text-muted" size={14} />
          <span>{label}</span>
        </Link>
      )
    : (
        <Link className={className} params={{ slug: link.slug }} to="/gifts/$slug">
          <GiftIcon className="text-muted" size={14} />
          <span>{label}</span>
        </Link>
      )
}

export function SectionHeading({
  title,
  subtitle,
  seeAll,
}: {
  title: string
  subtitle?: string
  seeAll?: string
}) {
  return (
    <div className="flex items-end justify-between gap-4 px-4">
      <div className="flex min-w-0 flex-col gap-0.5">
        <h2 className="text-heading">{title}</h2>
        {subtitle && <p className="text-label text-muted">{subtitle}</p>}
      </div>
      {seeAll && (
        <Link
          className="flex shrink-0 items-center gap-0.5 rounded-md py-1 text-sm font-medium text-muted outline-none focus-visible:focus-ring"
          to="/stories"
        >
          {seeAll}
          <ChevronRightIcon size={16} />
        </Link>
      )}
    </div>
  )
}

export function CategoryChips({
  value,
  onChange,
}: {
  value: CategoryFilter
  onChange: (value: CategoryFilter) => void
}) {
  const { c } = useBlogData()

  return (
    <ScrollShadow hideScrollBar orientation="horizontal" size={24}>
      <div aria-label={c.latest} className="flex gap-2 px-4 pb-1" role="group">
        {categories.map(item => (
          <button
            key={item}
            aria-pressed={value === item}
            className="h-9 shrink-0 rounded-full border border-separator bg-surface px-4 text-sm font-medium outline-none focus-visible:focus-ring aria-pressed:border-foreground aria-pressed:bg-foreground aria-pressed:text-background"
            type="button"
            onClick={() => onChange(item)}
          >
            {c.category[item]}
          </button>
        ))}
      </div>
    </ScrollShadow>
  )
}

/** Big vertical feed card: photo, meta, serif title, excerpt and an optional shop line. */
export function FeedCard({ article }: { article: Article }) {
  const { linkOf } = useBlogData()
  const link = linkOf(article)

  return (
    <article className="flex flex-col gap-2.5">
      <Link
        className="flex flex-col gap-2.5 rounded-3xl outline-none focus-visible:focus-ring active:scale-[0.99]"
        params={{ slug: article.slug }}
        to="/stories/$slug"
      >
        <Media
          alt=""
          className="aspect-[16/10] rounded-3xl"
          photo={article.photo}
        />
        <div className="flex flex-col gap-1 px-1">
          <StoryMeta article={article} />
          <h3 className="font-serif text-[21px] leading-7 font-medium text-balance">
            {article.title}
          </h3>
          <p className="line-clamp-2 text-sm text-foreground/75">
            {article.excerpt}
          </p>
        </div>
      </Link>
      {link && (
        <div className="px-1">
          <GentleLinkLine link={link} />
        </div>
      )}
    </article>
  )
}

/** Compact news-app row: text left, square photo right. */
export function CompactRow({
  article,
  index,
}: {
  article: Article
  index?: number
}) {
  return (
    <Link
      className="flex items-start gap-3 rounded-2xl py-1 outline-none focus-visible:focus-ring active:opacity-70"
      params={{ slug: article.slug }}
      to="/stories/$slug"
    >
      {index !== undefined && (
        <span className="w-7 shrink-0 font-serif text-[26px] leading-8 text-accent">
          {String(index).padStart(2, '0')}
        </span>
      )}
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <h3 className="line-clamp-3 font-serif text-[17px] leading-6 font-medium text-balance">
          {article.title}
        </h3>
        <StoryMeta article={article} />
      </div>
      <Media
        alt=""
        className="size-[84px] shrink-0 rounded-2xl"
        photo={article.photo}
      />
    </Link>
  )
}

export function EmptyFeed() {
  const { c } = useBlogData()

  return (
    <p className="mx-4 rounded-3xl bg-surface p-5 text-sm text-muted shadow-surface">
      {c.empty}
    </p>
  )
}

/** December topics as a rail; every card is marked as an idea because none is written yet. */
export function ChristmasRail() {
  const { c, language } = useBlogData()

  return (
    <section className="flex flex-col gap-3">
      <SectionHeading subtitle={c.christmasSub} title={c.christmasTitle} />
      <ScrollShadow hideScrollBar orientation="horizontal" size={24}>
        <ul className="flex snap-x snap-mandatory gap-3 px-4 pb-1">
          {christmasIdeas[language].map(idea => (
            <li key={idea.title} className="w-44 shrink-0 snap-start">
              <Media
                alt=""
                className="aspect-[3/4] rounded-3xl"
                photo={idea.photo}
              >
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                <span className="absolute top-2.5 left-2.5 rounded-full bg-white/90 px-2 py-0.5 text-[12px] font-medium">
                  {c.idea}
                </span>
                <h3 className="absolute inset-x-3 bottom-3 font-serif text-[17px] leading-6 font-medium text-white">
                  {idea.title}
                </h3>
              </Media>
            </li>
          ))}
        </ul>
      </ScrollShadow>
    </section>
  )
}

/** The shop, demoted to one calm section: Tours, Victorinox and Keepsakes as photo tiles. */
export function ShopStrip() {
  const { c } = useBlogData()
  const { t } = useLocale()
  const tile
    = 'relative flex flex-col overflow-hidden rounded-3xl outline-none focus-visible:focus-ring active:scale-[0.98]'
  const label
    = 'absolute inset-x-2.5 bottom-2.5 text-sm font-medium text-white'
  const shade = (
    <div className="absolute inset-0 bg-gradient-to-t from-black/65 to-transparent" />
  )

  return (
    <section className="flex flex-col gap-3">
      <SectionHeading subtitle={c.shopSub} title={c.shopTitle} />
      <div className="grid grid-cols-3 gap-2.5 px-4">
        <Link className={tile} to="/tours">
          <Media alt="" className="aspect-[3/4]" photo="rigi-vitznau-train">
            {shade}
            <span className={label}>{t('nav.tours')}</span>
          </Media>
        </Link>
        <Link
          className={tile}
          search={{ subcategory: 'victorinox' }}
          to="/gifts"
        >
          <Media alt="" className="aspect-[3/4]" photo="victorinox-spartan">
            {shade}
            <span className={label}>{c.victorinox}</span>
          </Media>
        </Link>
        <Link className={tile} to="/gifts">
          <Media alt="" className="aspect-[3/4]" photo="postcards">
            {shade}
            <span className={label}>{t('nav.gifts')}</span>
          </Media>
        </Link>
      </div>
    </section>
  )
}

export function AuthorsCard() {
  const { c, authors } = useBlogData()

  return (
    <section className="mx-4 flex flex-col gap-3 rounded-3xl bg-surface p-5 shadow-surface">
      <h2 className="text-heading">{c.whoTitle}</h2>
      <p className="text-sm text-foreground/80">{c.whoBody}</p>
      <ul className="flex flex-col gap-2.5">
        {authors.map(author => (
          <li key={author.name} className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-full bg-accent-soft font-serif text-lg text-accent-soft-foreground">
              {author.name.charAt(0)}
            </span>
            <span className="flex flex-col">
              <span className="text-sm font-medium">{author.name}</span>
              <span className="text-label text-muted">{author.role}</span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}

/** Lab copy of the guest tab bar with the first tab renamed to Stories. */
export function LabTabBar() {
  const { t, language } = useLocale()
  const item
    = 'flex h-[60px] flex-col items-center justify-center gap-0.5 text-[11px] leading-4 font-medium text-muted outline-none focus-visible:focus-ring'

  return (
    <nav
      aria-label="Sample tab bar"
      className="sticky bottom-0 z-30 border-t border-separator bg-surface/95 backdrop-blur"
    >
      <ul className="grid grid-cols-5">
        <li>
          <span className={`${item} text-accent`}>
            <StoryIcon size={26} weight="Filled" />
            {language === 'de' ? 'Geschichten' : 'Stories'}
          </span>
        </li>
        <li>
          <Link className={item} to="/gifts">
            <GiftIcon size={26} />
            {t('nav.gifts')}
          </Link>
        </li>
        <li className="relative">
          <Link className={`${item} justify-end pb-[7px]`} to="/plan">
            <span
              aria-hidden
              className="absolute -top-7 flex size-14 items-center justify-center rounded-full bg-assistant text-white shadow-[0_10px_18px_-6px_rgba(213,43,30,0.5)]"
            >
              <SparkleIcon
                className="animate-sparkle"
                size={26}
                weight="Filled"
              />
            </span>
            {t('nav.assistant')}
          </Link>
        </li>
        <li>
          <Link className={item} to="/tours">
            <TourIcon size={26} />
            {t('nav.tours')}
          </Link>
        </li>
        <li>
          <Link className={item} to="/account">
            <AccountIcon size={26} />
            {t('nav.account')}
          </Link>
        </li>
      </ul>
    </nav>
  )
}
