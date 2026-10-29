import type { ArticleBlock, ArticleSection } from '@sk/domain/content'
import type { BodyMark, BodyNode, Language, Story } from './story-editor-data'

import { formatShortDate } from '@sk/domain/shared'
import { useRef } from 'react'

import { Media } from '@/components/media'
import { ArticleBlocks } from '@/features/content/components/article-blocks'
import { ArticleContents, sectionAnchor } from '@/features/content/components/article-contents'
import { avatarUrl } from '@/lib/avatars'
import { keepsakes, LAB_TODAY, mediaOf, otherStories, pinById, uploadUrls } from './story-editor-data'
import { contentsList, headingAnchors, readingMinutes } from './story-editor-rules'
import { PhotoById } from './story-editor-sheets'

/**
 * The Review step's preview: the guest story page (C20) as it is today, drawn from the body
 * JSON by a hand-written walker over the allow-list, as the decision asks of the real renderer.
 * Photos, video and audio reuse C20's own `ArticleBlocks`; the contents bar is C20's
 * `ArticleContents`. A node the walker does not know draws nothing.
 */

function withMarks(content: React.ReactNode, marks: BodyMark[] | undefined, language: Language): React.ReactNode {
  return (marks ?? []).reduce<React.ReactNode>((inner, mark) => {
    switch (mark.type) {
      case 'bold':
        return <strong>{inner}</strong>
      case 'italic':
        return <em>{inner}</em>
      case 'link':
        return <a className="underline underline-offset-4" href={String(mark.attrs?.href)} rel="noopener" target="_blank">{inner}</a>
      case 'pinLink': {
        const pin = pinById.get(String(mark.attrs?.pinId))

        // Unpublished pin: plain text. With a website: the website. Otherwise: the map with the pin open.
        if (!pin || pin.status !== 'published')
          return inner
        const href = pin.link || `/${language}/map?place=${pin.slug}`

        return <a className="underline decoration-accent decoration-2 underline-offset-4" href={href} rel="noopener">{inner}</a>
      }
      default:
        return inner
    }
  }, content)
}

function Inline({ nodes, language }: { nodes: BodyNode[] | undefined, language: Language }) {
  return (nodes ?? []).map((n, i) => {
    if (n.type === 'hardBreak')

      return <br key={i} />
    if (n.type !== 'text')
      return null

    return <span key={i}>{withMarks(n.text, n.marks, language)}</span>
  })
}

/** An image, video or audio node as the old block shape, so C20's own components draw it. */
function asBlock(node: BodyNode): ArticleBlock | null {
  const a = node.attrs ?? {}

  if (node.type === 'image')
    return { type: 'image', photo: mediaOf(String(a.mediaId))?.preview ?? '', caption: String(a.caption ?? '') }
  if (node.type === 'video')
    return { type: 'video', youtubeId: String(a.youtubeId), title: String(a.title ?? ''), caption: String(a.caption ?? '') }
  if (node.type === 'audio')
    return { type: 'audio', audio: mediaOf(String(a.mediaId))?.preview ?? '', title: String(a.title ?? ''), caption: String(a.caption ?? '') }

  return null
}

function Block({ node, language, anchor }: { node: BodyNode, language: Language, anchor: Map<BodyNode, string> }) {
  switch (node.type) {
    case 'paragraph':
      return (
        <p className="text-body">
          <Inline language={language} nodes={node.content} />
        </p>
      )
    case 'heading': {
      const id = sectionAnchor(anchor.get(node) ?? 'section')

      return node.attrs?.level === 3
        ? (
            <h3 className="scroll-mt-[124px] pt-3 font-serif text-heading text-balance" id={id}>
              <Inline language={language} nodes={node.content} />
            </h3>
          )
        : (
            <h2 className="scroll-mt-[124px] pt-5 font-serif text-title text-balance" id={id}>
              <Inline language={language} nodes={node.content} />
            </h2>
          )
    }
    case 'blockquote':
      return (
        <blockquote className="flex flex-col gap-3 border-s-2 border-foreground ps-4 font-serif text-lg italic">
          {(node.content ?? []).map((c, i) => <Block key={i} anchor={anchor} language={language} node={c} />)}
        </blockquote>
      )
    case 'bulletList':
    case 'orderedList': {
      const List = node.type === 'bulletList' ? 'ul' : 'ol'

      return (
        <List className={`flex flex-col gap-1 ps-6 text-body ${node.type === 'bulletList' ? 'list-disc' : 'list-decimal'}`}>
          {(node.content ?? []).map((item, i) => (
            <li key={i} className="[&>p]:text-body">
              {(item.content ?? []).map((c, j) => <Block key={j} anchor={anchor} language={language} node={c} />)}
            </li>
          ))}
        </List>
      )
    }
    case 'image':
    case 'video':
    case 'audio': {
      const id = String(node.attrs?.mediaId ?? '')

      if (node.type === 'image' && uploadUrls.has(id)) {
        return (
          <figure className="flex flex-col gap-2">
            <PhotoById alt={String(node.attrs?.alt || node.attrs?.caption || '')} className="aspect-[4/3] rounded-2xl" mediaId={id} />
            <figcaption className="text-label text-muted">{String(node.attrs?.caption ?? '')}</figcaption>
          </figure>
        )
      }
      const block = asBlock(node)

      return block ? <ArticleBlocks blocks={[block]} /> : null
    }
    default:
      return null
  }
}

/** Each heading node to its anchor, walking in the same order as `headingAnchors`. */
function anchorMap(nodes: BodyNode[], anchors: string[]) {
  const map = new Map<BodyNode, string>()
  const visit = (list: BodyNode[] | undefined) => {
    for (const n of list ?? []) {
      if (n.type === 'heading')
        map.set(n, anchors[map.size] ?? 'section')
      visit(n.content)
    }
  }

  visit(nodes)

  return map
}

export function StoryPreview({ story, language }: { story: Story, language: Language }) {
  const v = story.versions[language]
  const bodyRef = useRef<HTMLDivElement>(null)
  const sections: ArticleSection[] = contentsList(v.body).map(c => ({ id: c.anchor, heading: c.text, blocks: [] }))
  const anchor = anchorMap(v.body.content, headingAnchors(v.body).map(h => h.anchor))
  const minutes = readingMinutes(v.body)
  const day = v.publishedOn ?? LAB_TODAY
  const chosen = story.keepsakes.map(id => keepsakes.find(k => k.id === id)).filter(k => k?.published)
  const related = story.related.map(slug => otherStories.find(s => s.slug === slug)).filter(s => s?.versions[language])

  return (
    <article className="flex flex-col bg-background" lang={language}>
      <PhotoById className="h-[440px]" mediaId={v.coverId}>
        <div aria-hidden className="absolute inset-0 bg-gradient-to-b from-black/35 via-black/5 to-black/75" />
        <header className="absolute inset-x-6 bottom-12 flex flex-col gap-2 text-white">
          <h1 className="font-serif text-display text-balance">{v.title || 'Untitled story'}</h1>
          {v.excerpt && <p className="text-body text-white/85">{v.excerpt}</p>}
        </header>
      </PhotoById>
      <div className="relative -mt-6 flex flex-col rounded-t-3xl bg-background px-6 pt-7 pb-8">
        <div className="flex items-center gap-3">
          <img alt="" className="size-12 shrink-0 rounded-full bg-surface-secondary object-cover" decoding="async" src={avatarUrl(story.author)} />
          <span className="min-w-0 font-semibold">{story.author}</span>
        </div>
        <p className="mt-3 text-sm text-muted tabular-nums">
          {`${formatShortDate(day, LAB_TODAY, language === 'de' ? 'de-CH' : 'en-CH')} · ${minutes} min read`}
          {story.kind === 'review' && story.review.checkedOn && ` · Facts checked ${formatShortDate(story.review.checkedOn, LAB_TODAY, 'en-CH')} by ${story.review.writer || story.author}`}
        </p>

        <div className="mt-6 flex flex-col">
          {sections.length > 0 && <ArticleContents bodyRef={bodyRef} label="Contents" sections={sections} />}
          <div ref={bodyRef} className="flex flex-col gap-4 pt-6">
            {v.body.content.map((node, i) => <Block key={i} anchor={anchor} language={language} node={node} />)}
          </div>
        </div>

        {story.pins.length > 0 && (
          <ul aria-label="Places in this story" className="mt-8 flex flex-wrap gap-2">
            {story.pins.map(id => pinById.get(id)).filter(p => p?.status === 'published').map(p => (
              <li key={p!.id} className="rounded-full bg-surface-secondary px-3 py-1.5 text-sm">{p!.name}</li>
            ))}
          </ul>
        )}

        {chosen.length > 0 && (
          <section className="mt-10 flex flex-col gap-4 border-t border-separator pt-7">
            <h2 className="font-serif text-title">Keepsakes from this story</h2>
            <ul className="flex gap-3 overflow-x-auto">
              {chosen.map(k => (
                <li key={k!.id} className="flex w-36 shrink-0 flex-col gap-2">
                  <Media alt="" className="aspect-square rounded-2xl" photo={k!.photo || undefined} />
                  <span className="line-clamp-2 font-serif text-sm">{k!.name}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {related.length > 0 && (
          <section className="mt-10 flex flex-col gap-4 border-t border-separator pt-7">
            <h2 className="font-serif text-title">More to discover</h2>
            <ul className="flex flex-col gap-3">
              {related.map(s => (
                <li key={s!.slug} className="flex items-center gap-3">
                  <Media alt="" className="size-16 shrink-0 rounded-2xl" photo={s!.photo} />
                  <span className="font-serif text-card-title">{s!.title}</span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </article>
  )
}

/**
 * The preview inside a phone outline (375 px wide inside), how most guests read. `fixed`: a real
 * phone shape, 375 × 740 inside or shorter to fit the window, with the story scrolling inside it.
 */
export function PreviewFrame({ story, language, fixed = false }: { story: Story, language: Language, fixed?: boolean }) {
  if (fixed) {
    return (
      <div className="mx-auto h-[min(756px,calc(100dvh-10rem))] w-[391px] shrink-0 overflow-hidden rounded-[2rem] border-8 border-foreground/90 bg-background">
        <div className="h-full overflow-y-auto overscroll-contain [scrollbar-width:thin]" data-preview-scroll="">
          <StoryPreview language={language} story={story} />
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-[391px] overflow-hidden rounded-3xl border border-separator bg-background lg:rounded-[2rem] lg:border-8 lg:border-foreground/90">
      <StoryPreview language={language} story={story} />
    </div>
  )
}
