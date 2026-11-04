import { ProgressBar } from '@heroui/react'
import { useEffect, useRef, useState } from 'react'

import { useLocale } from '@/contexts/locale-context'

/**
 * Play and pause. The triangle's centroid, not its box, sits on the circle's centre (owner
 * review 14.10.2026): a box-centred triangle looks pushed left, so the box sits right.
 */
export function PlayGlyph({
  playing,
  className = 'size-5',
}: {
  playing: boolean
  className?: string
}) {
  return playing
    ? (
        <svg aria-hidden className={className} viewBox="0 0 24 24">
          <rect fill="currentColor" height="14" rx="1.5" width="4" x="6" y="5" />
          <rect fill="currentColor" height="14" rx="1.5" width="4" x="14" y="5" />
        </svg>
      )
    : (
        <svg aria-hidden className={className} viewBox="0 0 24 24">
          <path
            d="M8.5 5 20 12 8.5 19Z"
            fill="currentColor"
            stroke="currentColor"
            strokeLinejoin="round"
            strokeWidth="2"
          />
        </svg>
      )
}

function clock(seconds: number) {
  return `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`
}

/**
 * Pre-recorded audio (PRD §11: never AI audio), with an ink progress bar. The shared player of the story page and the
 * bundled demo articles; `preload` is `metadata` unless the caller wants no request before play.
 */
export function AudioPlayer({
  src,
  title,
  caption,
  preload = 'metadata',
}: {
  src: string
  title: string
  caption: string
  preload?: 'none' | 'metadata'
}) {
  const { t } = useLocale()
  const ref = useRef<HTMLAudioElement>(null)
  const [playing, setPlaying] = useState(false)
  const [time, setTime] = useState(0)
  const [duration, setDuration] = useState(0)

  useEffect(() => {
    const el = ref.current

    return () => el?.pause()
  }, [])

  return (
    <figure className="flex flex-col gap-2">
      <div className="flex items-center gap-3 rounded-2xl bg-surface p-3 shadow-surface">
        <button
          aria-label={t(
            playing ? 'article.audio.pause' : 'article.audio.play',
            {
              title,
            },
          )}
          className="flex size-12 shrink-0 items-center justify-center rounded-full bg-foreground text-background outline-none transition-transform focus-visible:focus-ring active:scale-95"
          type="button"
          onClick={() =>
            playing ? ref.current?.pause() : void ref.current?.play()}
        >
          <PlayGlyph playing={playing} />
        </button>
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <span className="truncate text-sm font-semibold">{title}</span>
          <ProgressBar
            aria-label={title}
            className="w-full"
            color="default"
            maxValue={duration || 1}
            size="sm"
            value={time}
          >
            <ProgressBar.Track>
              <ProgressBar.Fill />
            </ProgressBar.Track>
          </ProgressBar>
          <span className="text-xs text-muted tabular-nums">
            {clock(time)} / {clock(duration)}
          </span>
        </div>
        {/* Captions are not needed: the clip has no speech. */}
        {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
        <audio
          ref={ref}
          preload={preload}
          src={src}
          onEnded={() => {
            setPlaying(false)
            setTime(0)
          }}
          onLoadedMetadata={e => setDuration(e.currentTarget.duration)}
          onPause={() => setPlaying(false)}
          onPlay={() => setPlaying(true)}
          onTimeUpdate={e => setTime(e.currentTarget.currentTime)}
        />
      </div>
      {caption && <figcaption className="text-label text-muted">{caption}</figcaption>}
    </figure>
  )
}
