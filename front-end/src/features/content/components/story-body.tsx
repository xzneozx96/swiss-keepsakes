import type { PublicStory } from '@sk/api-contract'
import type { Language } from '@sk/domain/shared'

import { pinLinkHref } from '@sk/domain/content'
import { safeHref } from '@sk/domain/shared'
import { Fragment, useState } from 'react'

import { useLocale } from '@/contexts/locale-context'
import { headingsOf } from '../lib/story-body'
import { sectionAnchor } from './article-contents'
import { AudioPlayer } from './audio-player'

type Body = PublicStory['body']
type Block = Body['content'][number]
type Inline = NonNullable<Extract<Block, { type: 'paragraph' }>['content']>[number]
type ListBlock = Extract<Block, { type: 'bulletList' | 'orderedList' }>
type Place = PublicStory['places'][number]
type Variants = Extract<Block, { type: 'image' }>['attrs']['variants']

const EXTERNAL = /^https?:\/\//i
const LINK_CLASS = 'underline underline-offset-4'
const PIN_CLASS = 'underline decoration-accent decoration-2 underline-offset-4'

/** The pin's map address (ADR-011). A pin the story does not carry (hidden, expired, unpublished) gives null, so its text stays plain. */
function pinHref(pinId: string, places: readonly Place[], language: Language) {
  const place = places.find(p => p.id === pinId)

  return place ? pinLinkHref({ published: true, website: null, slug: place.slug }, language) : null
}

function Inlines({ nodes, places, language }: { nodes: readonly Inline[] | undefined, places: readonly Place[], language: Language }) {
  return (nodes ?? []).map((node, index) => {
    if (node.type === 'hardBreak')
      return <br key={index} />

    // eslint-disable-next-line array-callback-return -- the switch covers every mark type, and TypeScript checks that each case returns
    const content = (node.marks ?? []).reduce<React.ReactNode>((inner, mark) => {
      switch (mark.type) {
        case 'bold':
          return <strong>{inner}</strong>
        case 'italic':
          return <em>{inner}</em>
        case 'link': {
          const href = safeHref(mark.attrs.href)

          if (!href)
            return inner

          // Only a web address to another site opens in a new tab; a mail link stays in the page.
          return EXTERNAL.test(href)
            ? <a className={LINK_CLASS} href={href} rel="noopener noreferrer" target="_blank">{inner}</a>
            : <a className={LINK_CLASS} href={href}>{inner}</a>
        }
        case 'pinLink': {
          const href = pinHref(mark.attrs.pinId, places, language)

          return href ? <a className={PIN_CLASS} href={href}>{inner}</a> : inner
        }
      }
    }, node.text)

    return <Fragment key={index}>{content}</Fragment>
  })
}

/** The 640 px copy when the image has one (the column is at most about 560 px), else the largest copy, else the original. */
function imageSrc(url: string, variants: Variants) {
  const widest = [...variants].sort((a, b) => a.width - b.width)

  return (widest.find(v => v.width >= 640) ?? widest.at(-1))?.url ?? url
}

function Figure({ children, caption }: { children: React.ReactNode, caption: string }) {
  return (
    <figure className="flex flex-col gap-2">
      {children}
      {caption && <figcaption className="text-label text-muted">{caption}</figcaption>}
    </figure>
  )
}

/**
 * A YouTube video that loads only when the reader presses play: before that the page draws a neutral poster and makes
 * no request to YouTube, and the player comes from youtube-nocookie.com.
 */
function VideoBlock({ youtubeId, title, caption }: Extract<Block, { type: 'video' }>['attrs']) {
  const { t } = useLocale()
  const [playing, setPlaying] = useState(false)

  return (
    <Figure caption={caption}>
      <div className="relative aspect-video overflow-hidden rounded-2xl bg-foreground">
        {playing
          ? (
              <iframe
                allowFullScreen
                allow="autoplay; encrypted-media; picture-in-picture"
                className="absolute inset-0 size-full"
                src={`https://www.youtube-nocookie.com/embed/${encodeURIComponent(youtubeId)}?autoplay=1&rel=0`}
                title={title}
              />
            )
          : (
              <button
                aria-label={t('article.video.play', { title })}
                className="group absolute inset-0 flex items-center justify-center outline-none focus-visible:focus-ring"
                type="button"
                onClick={() => setPlaying(true)}
              >
                <span className="flex size-16 items-center justify-center rounded-full bg-white/95 text-foreground shadow-overlay transition-transform group-active:scale-95">
                  <svg aria-hidden className="size-7" viewBox="0 0 24 24">
                    <path d="M8.5 5 20 12 8.5 19Z" fill="currentColor" stroke="currentColor" strokeLinejoin="round" strokeWidth="2" />
                  </svg>
                </span>
                <span className="absolute inset-x-4 bottom-3 flex flex-col items-start text-start text-white">
                  <span className="line-clamp-1 text-sm font-semibold">{title}</span>
                  <span className="text-xs text-white/80">{t('article.video.source')}</span>
                </span>
              </button>
            )}
      </div>
    </Figure>
  )
}

function BlockView({ block, ids, places, language }: { block: Block, ids: Map<Block, string>, places: readonly Place[], language: Language }) {
  const inlines = <Inlines language={language} nodes={'content' in block ? block.content as Inline[] | undefined : undefined} places={places} />

  switch (block.type) {
    case 'paragraph':
      return <p className="text-body">{inlines}</p>
    case 'heading': {
      const id = sectionAnchor(ids.get(block) ?? 'section')

      return block.attrs.level === 3
        ? <h3 className="scroll-mt-[124px] pt-3 font-serif text-heading text-balance" id={id}>{inlines}</h3>
        : <h2 className="scroll-mt-[124px] pt-5 font-serif text-title text-balance" id={id}>{inlines}</h2>
    }
    case 'blockquote':
      return (
        <blockquote className="flex flex-col gap-3 border-s-2 border-foreground ps-4 font-serif text-lg italic">
          {block.content.map((inner, index) => <BlockView key={index} block={inner} ids={ids} language={language} places={places} />)}
        </blockquote>
      )
    case 'bulletList':
    case 'orderedList':
      return <ListView language={language} list={block} places={places} />
    case 'image': {
      const { url, variants, alt, caption } = block.attrs

      // A photo that is not ready has no address: nothing is drawn.
      if (!url)
        return null

      return (
        <Figure caption={caption}>
          <img
            alt={alt}
            className="w-full rounded-2xl bg-surface-secondary"
            decoding="async"
            loading="lazy"
            sizes="(min-width: 640px) 560px, 100vw"
            src={imageSrc(url, variants)}
            srcSet={variants.length > 0 ? variants.map(v => `${v.url} ${v.width}w`).join(', ') : undefined}
          />
        </Figure>
      )
    }
    case 'video':
      return <VideoBlock {...block.attrs} />
    case 'audio': {
      const { url, title, caption } = block.attrs

      if (!url)
        return null

      return <AudioPlayer caption={caption} preload="none" src={url} title={title} />
    }
  }
}

function ListView({ list, places, language }: { list: ListBlock, places: readonly Place[], language: Language }) {
  const List = list.type === 'orderedList' ? 'ol' : 'ul'

  return (
    <List className={`flex flex-col gap-1 ps-6 text-body ${list.type === 'orderedList' ? 'list-decimal' : 'list-disc'}`}>
      {list.content.map((item, index) => (
        <li key={index}>
          {item.content.map((inner, i) =>
            inner.type === 'paragraph'
              ? (
                  <p key={i}>
                    <Inlines language={language} nodes={inner.content} places={places} />
                  </p>
                )
              : <ListView key={i} language={language} list={inner} places={places} />)}
        </li>
      ))}
    </List>
  )
}

/**
 * The story body as the guest page draws it: one component per node and mark over the public document, no stored HTML
 * and no `dangerouslySetInnerHTML`. A node the page does not know draws nothing.
 */
export function StoryBody({ body, places, language }: { body: Body, places: readonly Place[], language: Language }) {
  const ids = new Map<Block, string>(headingsOf(body).map(h => [h.node, h.id]))

  return body.content.map((block, index) => <BlockView key={index} block={block} ids={ids} language={language} places={places} />)
}
