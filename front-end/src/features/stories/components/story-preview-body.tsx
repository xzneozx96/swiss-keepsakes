import type { PreviewHeading } from '../lib/preview-rules'
import type { Inline, StoryBlock } from '@/features/places/lib/story-text'

import { ArticleBlocks } from '@/features/content/components/article-blocks'
import { sectionAnchor } from '@/features/content/components/article-contents'

/** A link in the preview opens in a new tab, so a click never leaves an unsaved editor. */
const linkProps = { target: '_blank', rel: 'noopener' } as const

function InlineText({ inline }: { inline: Inline }) {
  let content: React.ReactNode = inline.text

  if (inline.bold)
    content = <strong>{content}</strong>
  if (inline.italic)
    content = <em>{content}</em>
  if (inline.pinHref)
    return <a className="underline decoration-accent decoration-2 underline-offset-4" href={inline.pinHref} {...linkProps}>{content}</a>
  if (inline.href)
    return <a className="underline underline-offset-4" href={inline.href} {...linkProps}>{content}</a>

  return content
}

function Inlines({ inlines }: { inlines: (Inline | 'break')[] }) {
  return inlines.map((inline, index) => (inline === 'break' ? <br key={index} /> : <InlineText key={index} inline={inline} />))
}

function Block({ block, ids }: { block: StoryBlock, ids: Map<StoryBlock, string> }) {
  switch (block.type) {
    case 'paragraph':
      return (
        <p className="text-body">
          <Inlines inlines={block.inlines} />
        </p>
      )
    case 'heading': {
      const id = sectionAnchor(ids.get(block) ?? 'story-preview-h')

      return block.level === 3
        ? (
            <h3 className="scroll-mt-[124px] pt-3 font-serif text-heading text-balance" id={id}>
              <Inlines inlines={block.inlines} />
            </h3>
          )
        : (
            <h2 className="scroll-mt-[124px] pt-5 font-serif text-title text-balance" id={id}>
              <Inlines inlines={block.inlines} />
            </h2>
          )
    }
    case 'quote':
      return (
        <blockquote className="flex flex-col gap-3 border-s-2 border-foreground ps-4 font-serif text-lg italic">
          {block.blocks.map((inner, index) => <Block key={index} block={inner} ids={ids} />)}
        </blockquote>
      )
    case 'list': {
      const List = block.ordered ? 'ol' : 'ul'

      return (
        <List className={`flex flex-col gap-1 ps-6 text-body ${block.ordered ? 'list-decimal' : 'list-disc'}`}>
          {block.items.map((item, index) => (
            <li key={index} className="[&>p]:text-body">{item.map((inner, i) => <Block key={i} block={inner} ids={ids} />)}</li>
          ))}
        </List>
      )
    }
    case 'image':
      return <ArticleBlocks blocks={[{ type: 'image', photo: block.src, caption: block.caption }]} />
    case 'video':
      return <ArticleBlocks blocks={[{ type: 'video', youtubeId: block.youtubeId, title: block.title, caption: block.caption }]} />
    case 'audio':
      return (
        <figure className="flex flex-col gap-2">
          {block.title && <figcaption className="font-semibold">{block.title}</figcaption>}
          {/* A recording has no speech to caption. */}
          {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
          <audio controls className="w-full" preload="metadata" src={block.src} />
          {block.caption && <p className="text-label text-muted">{block.caption}</p>}
        </figure>
      )
  }
}

/**
 * The story body as the guest page draws it. Photo and video go through C20's own `ArticleBlocks`. A recording is a
 * native player: C20's audio block only knows the bundled sample files, and a library recording has a served address.
 */
export function StoryPreviewBody({ blocks, headings }: { blocks: StoryBlock[], headings: PreviewHeading[] }) {
  const ids = new Map(headings.map(heading => [heading.block, heading.id]))

  return blocks.map((block, index) => <Block key={index} block={block} ids={ids} />)
}
