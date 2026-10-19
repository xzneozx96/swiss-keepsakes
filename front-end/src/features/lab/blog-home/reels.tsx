import type { Article } from '@/features/content/types'

import { Link } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

import { CloseIcon, PickupIcon, PlayIcon } from '@/components/icons'
import { photoUrl } from '@/lib/photos'

import { AuthorChip, CategoryPill } from './chips'
import { useBlogData } from './data'

export type ReelsStyle = 'auto' | 'player' | 'viewer' | 'moving'

const STORY_MS = 5000

const labels = {
  en: {
    read: 'Read the story',
    previous: 'Previous story',
    next: 'Next story',
    close: 'Close',
    watch: 'Watch',
  },
  de: {
    read: 'Geschichte lesen',
    previous: 'Vorherige Geschichte',
    next: 'Nächste Geschichte',
    close: 'Schliessen',
    watch: 'Ansehen',
  },
}

/** True while at least 60% of the element is on screen. */
function useVisible<T extends Element>() {
  const ref = useRef<T>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current

    if (!el)
      return
    const observer = new IntersectionObserver(
      ([entry]) => setVisible(Boolean(entry?.isIntersecting)),
      { threshold: 0.6 },
    )

    observer.observe(el)

    return () => observer.disconnect()
  }, [])

  return [ref, visible] as const
}

/** Press and hold pauses, like Instagram. */
function useHold() {
  const [held, setHeld] = useState(false)
  const release = () => setHeld(false)

  return [
    held,
    {
      onPointerDown: () => setHeld(true),
      onPointerUp: release,
      onPointerCancel: release,
      onPointerLeave: release,
    },
  ] as const
}

/**
 * One segment per story. The running segment's CSS animation is the timer: when it
 * ends, the story advances. With reduced motion the animation never runs, so nothing
 * advances on its own.
 */
function Segments({
  count,
  index,
  playing,
  onDone,
}: {
  count: number
  index: number
  playing: boolean
  onDone?: () => void
}) {
  return (
    <div aria-hidden className="flex gap-1">
      {Array.from({ length: count }, (_, i) => (
        <span
          key={i}
          className="h-[3px] flex-1 overflow-hidden rounded-full bg-white/35"
        >
          {i < index && <span className="block h-full w-full bg-white" />}
          {i === index && (
            <span
              key={`${index}-${count}`}
              className={`block h-full w-full bg-white ${onDone ? 'blog-reel-run' : 'blog-reel-still'}`}
              style={{
                animationDuration: `${STORY_MS}ms`,
                animationPlayState: playing ? 'running' : 'paused',
              }}
              onAnimationEnd={onDone}
            />
          )}
        </span>
      ))}
    </div>
  )
}

function ReelInfo({ article }: { article: Article }) {
  const { areaOf } = useBlogData()

  return (
    <div className="flex flex-col gap-2">
      <CategoryPill glass article={article} />
      <h3 className="font-serif text-[22px] leading-7 font-medium text-balance text-white">
        {article.title}
      </h3>
      <p className="flex items-center gap-1 text-[12px] font-medium text-white/80">
        <PickupIcon size={14} />
        {areaOf(article)}
      </p>
    </div>
  )
}

/** A tall 9:16 story card; `moving` gives the photo a slow Ken Burns drift. */
function ReelCard({
  article,
  top,
  badge,
  moving,
  delay = 0,
}: {
  article: Article
  top?: React.ReactNode
  badge?: React.ReactNode
  moving?: boolean
  delay?: number
}) {
  return (
    <div className="relative aspect-[9/16] overflow-hidden rounded-[28px] bg-gradient-to-b from-hero-sky to-surface-tertiary">
      <img
        alt=""
        className={`absolute inset-0 size-full object-cover ${moving ? 'blog-kenburns' : ''}`}
        decoding="async"
        loading="lazy"
        src={photoUrl(article.photo)}
        style={moving ? { animationDelay: `${delay}s` } : undefined}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/45 via-transparent to-black/80" />
      <div className="absolute inset-x-3 top-3 flex flex-col gap-2.5">
        {top}
        <div className="flex items-center justify-between gap-2">
          <AuthorChip article={article} />
          {badge}
        </div>
      </div>
      <div className="absolute inset-x-4 bottom-4">
        <ReelInfo article={article} />
      </div>
    </div>
  )
}

const railClass
  = '-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-px-4 px-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'

/** 1 · Auto-play rail: the rail plays itself, one story every five seconds, and loops. */
function AutoRail({ articles }: { articles: Article[] }) {
  const [index, setIndex] = useState(0)
  const [held, hold] = useHold()
  const [sectionRef, visible] = useVisible<HTMLDivElement>()
  const railRef = useRef<HTMLUListElement>(null)
  const settleRef = useRef(0)

  const scrollToCard = (i: number) => {
    const rail = railRef.current
    const card = rail?.children[i] as HTMLElement | undefined

    if (!rail || !card)
      return
    rail.scrollBy({
      left:
        card.getBoundingClientRect().left
        - rail.getBoundingClientRect().left
        - 16,
      behavior: 'smooth',
    })
  }

  // A swipe by hand moves the play head to the card that ends up first.
  const onScroll = () => {
    window.clearTimeout(settleRef.current)
    settleRef.current = window.setTimeout(() => {
      const rail = railRef.current

      if (!rail)
        return
      const left = rail.getBoundingClientRect().left + 16
      const cards = [...rail.children] as HTMLElement[]
      const nearest = cards.reduce(
        (best, card, i) =>
          Math.abs(card.getBoundingClientRect().left - left)
          < Math.abs((cards[best]?.getBoundingClientRect().left ?? 0) - left)
            ? i
            : best,
        0,
      )

      setIndex(nearest)
    }, 140)
  }

  const next = () => {
    const to = (index + 1) % articles.length

    setIndex(to)
    scrollToCard(to)
  }

  return (
    <div ref={sectionRef}>
      <ul ref={railRef} className={railClass} onScroll={onScroll} {...hold}>
        {articles.map((article, i) => (
          <li key={article.id} className="w-[64%] shrink-0 snap-start">
            <Link
              className="block rounded-[28px] outline-none focus-visible:focus-ring"
              params={{ slug: article.slug }}
              to="/stories/$slug"
            >
              <ReelCard
                article={article}
                top={(
                  <Segments
                    count={articles.length}
                    index={i}
                    playing={i === index && visible && !held}
                    onDone={i === index ? next : undefined}
                  />
                )}
              />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}

/** The Instagram-style player: tap the left third to go back, the rest to go on, hold to pause. */
function StoryPlayer({
  articles,
  start = 0,
  fullscreen,
  onClose,
}: {
  articles: Article[]
  start?: number
  fullscreen?: boolean
  onClose?: () => void
}) {
  const { language } = useBlogData()
  const l = labels[language]
  const [index, setIndex] = useState(start)
  const [held, hold] = useHold()
  const [ref, visible] = useVisible<HTMLDivElement>()
  const article = articles[index]

  const go = (step: 1 | -1) => {
    const to = index + step

    if (to >= articles.length) {
      if (onClose)
        onClose()
      else setIndex(0)
    }
    else {
      setIndex(Math.max(0, to))
    }
  }

  useEffect(() => {
    if (!fullscreen)
      return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape')
        onClose?.()
      if (event.key === 'ArrowRight')
        go(1)
      if (event.key === 'ArrowLeft')
        go(-1)
    }

    window.addEventListener('keydown', onKey)

    return () => window.removeEventListener('keydown', onKey)
  })

  if (!article)
    return null

  return (
    <div
      ref={ref}
      className={`relative overflow-hidden bg-black select-none ${fullscreen ? 'h-dvh w-full' : 'aspect-[4/5] rounded-[28px]'}`}
      {...hold}
    >
      {articles.map((a, i) => (
        <img
          key={a.id}
          alt=""
          className={`absolute inset-0 size-full object-cover transition-[opacity,transform] duration-700 ease-out ${i === index ? 'scale-100 opacity-100' : 'scale-105 opacity-0'}`}
          decoding="async"
          src={photoUrl(a.photo)}
        />
      ))}
      <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/85" />

      <button
        aria-label={l.previous}
        className="absolute inset-y-0 left-0 z-10 w-1/3 outline-none focus-visible:focus-ring"
        type="button"
        onClick={() => go(-1)}
      />
      <button
        aria-label={l.next}
        className="absolute inset-y-0 right-0 z-10 w-2/3 outline-none focus-visible:focus-ring"
        type="button"
        onClick={() => go(1)}
      />

      <div
        className={`pointer-events-none absolute inset-x-3 z-20 flex flex-col gap-2.5 ${fullscreen ? 'top-[calc(env(safe-area-inset-top,0px)+12px)]' : 'top-3'}`}
      >
        <Segments
          count={articles.length}
          index={index}
          playing={(fullscreen || visible) && !held}
          onDone={() => go(1)}
        />
        <div className="flex items-center justify-between">
          <AuthorChip article={article} />
          {onClose && (
            <button
              aria-label={l.close}
              className="pointer-events-auto flex size-9 items-center justify-center rounded-full bg-black/30 text-white outline-none focus-visible:focus-ring"
              type="button"
              onClick={onClose}
            >
              <CloseIcon size={20} />
            </button>
          )}
        </div>
      </div>

      <div
        className={`absolute inset-x-4 z-20 flex flex-col gap-4 ${fullscreen ? 'bottom-[calc(env(safe-area-inset-bottom,0px)+24px)]' : 'bottom-4'}`}
      >
        <div className="pointer-events-none">
          <ReelInfo article={article} />
        </div>
        <Link
          className="flex h-11 items-center justify-center self-start rounded-full bg-white px-5 text-sm font-semibold text-foreground outline-none focus-visible:focus-ring active:scale-95"
          params={{ slug: article.slug }}
          to="/stories/$slug"
        >
          {l.read}
        </Link>
      </div>
    </div>
  )
}

/** 3 · Tap to watch: still covers on a rail; a tap opens the full-screen player at that story. */
function ViewerRail({ articles }: { articles: Article[] }) {
  const { language } = useBlogData()
  const [open, setOpen] = useState<number | null>(null)

  useEffect(() => {
    if (open === null)
      return
    const previous = document.body.style.overflow

    document.body.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = previous
    }
  }, [open])

  return (
    <>
      <ul className={railClass}>
        {articles.map((article, i) => (
          <li key={article.id} className="w-[46%] shrink-0 snap-start">
            <button
              aria-label={`${labels[language].watch}: ${article.title}`}
              className="block w-full rounded-[28px] text-left outline-none focus-visible:focus-ring active:scale-[0.98]"
              type="button"
              onClick={() => setOpen(i)}
            >
              <ReelCard
                article={article}
                badge={(
                  <span className="flex size-8 items-center justify-center rounded-full bg-white/25 text-white backdrop-blur-md">
                    <PlayIcon size={16} weight="Filled" />
                  </span>
                )}
              />
            </button>
          </li>
        ))}
      </ul>
      {open !== null
        && createPortal(
          <div
            aria-modal
            className="fixed inset-0 z-[60] flex justify-center bg-black"
            role="dialog"
          >
            <div className="w-full max-w-[430px]">
              <StoryPlayer
                fullscreen
                articles={articles}
                start={open}
                onClose={() => setOpen(null)}
              />
            </div>
          </div>,
          document.body,
        )}
    </>
  )
}

/** 4 · Moving photos: no timer at all; each photo drifts slowly so the rail feels alive. */
function MovingRail({ articles }: { articles: Article[] }) {
  return (
    <ul className={railClass}>
      {articles.map((article, i) => (
        <li key={article.id} className="w-[64%] shrink-0 snap-start">
          <Link
            className="block rounded-[28px] outline-none focus-visible:focus-ring active:scale-[0.98]"
            params={{ slug: article.slug }}
            to="/stories/$slug"
          >
            <ReelCard moving article={article} delay={-i * 2.3} />
          </Link>
        </li>
      ))}
    </ul>
  )
}

export function Reels({
  style,
  articles,
}: {
  style: ReelsStyle
  articles: Article[]
}) {
  if (style === 'auto')
    return <AutoRail articles={articles} />
  if (style === 'player')
    return <StoryPlayer articles={articles} />
  if (style === 'viewer')
    return <ViewerRail articles={articles} />

  return <MovingRail articles={articles} />
}
