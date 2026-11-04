import type { ArticleBlock } from '@sk/domain/content'

import { useState } from 'react'

import { Media } from '@/components/media'
import { useLocale } from '@/contexts/locale-context'
import { audioUrl } from '@/lib/audio'
import { AudioPlayer, PlayGlyph } from './audio-player'

/**
 * A YouTube video that loads only when the reader taps play: until then the page makes no
 * request to YouTube beyond the poster, and the player comes from youtube-nocookie.com.
 */
function VideoBlock({
  youtubeId,
  title,
  caption,
}: Extract<ArticleBlock, { type: 'video' }>) {
  const { t } = useLocale()
  const [playing, setPlaying] = useState(false)

  return (
    <figure className="flex flex-col gap-2">
      <div className="relative aspect-video overflow-hidden rounded-2xl bg-foreground">
        {playing
          ? (
              <iframe
                allowFullScreen
                allow="autoplay; encrypted-media; picture-in-picture"
                className="absolute inset-0 size-full"
                src={`https://www.youtube-nocookie.com/embed/${youtubeId}?autoplay=1&rel=0`}
                title={title}
              />
            )
          : (
              <button
                aria-label={t('article.video.play', { title })}
                className="group absolute inset-0 outline-none focus-visible:focus-ring"
                type="button"
                onClick={() => setPlaying(true)}
              >
                <img
                  alt=""
                  className="size-full object-cover opacity-90"
                  decoding="async"
                  loading="lazy"
                  src={`https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg`}
                />
                <span className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <span className="absolute start-1/2 top-1/2 flex size-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white/95 text-foreground shadow-overlay transition-transform group-active:scale-95">
                  <PlayGlyph className="size-7" playing={false} />
                </span>
                <span className="absolute inset-x-4 bottom-3 flex flex-col items-start text-start text-white">
                  <span className="line-clamp-1 text-sm font-semibold">
                    {title}
                  </span>
                  <span className="text-xs text-white/80">
                    {t('article.video.source')}
                  </span>
                </span>
              </button>
            )}
      </div>
      <figcaption className="text-label text-muted">{caption}</figcaption>
    </figure>
  )
}

/** Pre-recorded audio (PRD §11: never AI audio) from the bundled sample files. */
function AudioBlock({
  audio,
  title,
  caption,
}: Extract<ArticleBlock, { type: 'audio' }>) {
  const src = audioUrl(audio)

  return src ? <AudioPlayer caption={caption} src={src} title={title} /> : null
}

/** One section's content in reading order (C20). */
export function ArticleBlocks({ blocks }: { blocks: ArticleBlock[] }) {
  // eslint-disable-next-line array-callback-return -- the switch covers every block type, and TypeScript checks that each case returns
  return blocks.map((block, i) => {
    switch (block.type) {
      case 'paragraph':
        return (
          <p key={i} className="text-body">
            {block.text}
          </p>
        )
      case 'image':
        return (
          <figure key={i} className="flex flex-col gap-2">
            <Media
              alt={block.caption}
              className="aspect-[4/3] rounded-2xl"
              photo={block.photo}
            />
            <figcaption className="text-label text-muted">
              {block.caption}
            </figcaption>
          </figure>
        )
      case 'video':
        return <VideoBlock key={i} {...block} />
      case 'audio':
        return <AudioBlock key={i} {...block} />
    }
  })
}
