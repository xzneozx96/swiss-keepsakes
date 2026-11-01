import type { Inline, StoryBlock } from '../lib/story-text'

import { ArticleBlocks } from '@/features/content/components/article-blocks'

function Inlines({ nodes }: { nodes: (Inline | 'break')[] }) {
  return nodes.map((node, i) => {
    if (node === 'break')
      return <br key={i} />
    let content: React.ReactNode = node.text

    if (node.bold)
      content = <strong>{content}</strong>
    if (node.italic)
      content = <em>{content}</em>

    return node.href
      ? <a key={i} className="underline underline-offset-4" href={node.href} rel="noopener" target="_blank">{content}</a>
      : <span key={i}>{content}</span>
  })
}

function Block({ block }: { block: StoryBlock }) {
  switch (block.type) {
    case 'paragraph':
      return (
        <p className="text-body">
          <Inlines nodes={block.inlines} />
        </p>
      )
    case 'heading': {
      const Heading = block.level === 3 ? 'h4' : 'h3'

      return (
        <Heading className={block.level === 3 ? 'pt-2 font-serif text-heading text-balance' : 'pt-3 font-serif text-title text-balance'}>
          <Inlines nodes={block.inlines} />
        </Heading>
      )
    }
    case 'quote':
      return (
        <blockquote className="flex flex-col gap-3 border-s-2 border-foreground ps-4 font-serif text-lg italic">
          <Blocks blocks={block.blocks} />
        </blockquote>
      )
    case 'list': {
      const List = block.ordered ? 'ol' : 'ul'

      return (
        <List className={`flex flex-col gap-1 ps-6 text-body ${block.ordered ? 'list-decimal' : 'list-disc'}`}>
          {block.items.map((item, i) => (
            <li key={i}>
              <Blocks blocks={item} />
            </li>
          ))}
        </List>
      )
    }
    case 'image':
      return (
        <figure className="flex flex-col gap-2">
          <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-gradient-to-b from-hero-sky via-hero-cream to-surface-tertiary">
            <img alt={block.alt} className="absolute inset-0 size-full object-cover" decoding="async" loading="lazy" src={block.src} />
          </div>
          {block.caption && <figcaption className="text-label text-muted">{block.caption}</figcaption>}
        </figure>
      )
    case 'video':
      return <ArticleBlocks blocks={[block]} />
    case 'audio':
      return (
        <figure className="flex flex-col gap-2">
          {block.title && <span className="text-sm font-semibold">{block.title}</span>}
          {/* The clip has no speech, so it has no captions. */}
          {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
          <audio controls className="w-full" preload="metadata" src={block.src} />
          {block.caption && <figcaption className="text-label text-muted">{block.caption}</figcaption>}
        </figure>
      )
  }
}

function Blocks({ blocks }: { blocks: StoryBlock[] }) {
  return blocks.map((block, i) => <Block key={i} block={block} />)
}

/** The body of a story in the place preview's sheet, drawn in the guest story page's type. */
export function StoryBody({ blocks }: { blocks: StoryBlock[] }) {
  return (
    <div className="flex flex-col gap-4">
      <Blocks blocks={blocks} />
    </div>
  )
}
