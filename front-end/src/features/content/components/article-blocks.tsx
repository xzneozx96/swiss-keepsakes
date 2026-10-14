import type { ArticleBlock } from "../types";

import { ProgressBar } from "@heroui/react";
import { useEffect, useRef, useState } from "react";

import { Media } from "@/components/media";
import { useLocale } from "@/contexts/locale-context";
import { audioUrl } from "@/lib/audio";

/**
 * Play and pause. The triangle's centroid, not its box, sits on the circle's centre (owner
 * review 14.10.2026): a box-centred triangle looks pushed left, so the box sits right.
 */
function PlayGlyph({
  playing,
  className = "size-5",
}: {
  playing: boolean;
  className?: string;
}) {
  return playing ? (
    <svg aria-hidden className={className} viewBox="0 0 24 24">
      <rect fill="currentColor" height="14" rx="1.5" width="4" x="6" y="5" />
      <rect fill="currentColor" height="14" rx="1.5" width="4" x="14" y="5" />
    </svg>
  ) : (
    <svg aria-hidden className={className} viewBox="0 0 24 24">
      <path
        d="M8.5 5 20 12 8.5 19Z"
        fill="currentColor"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  );
}

/**
 * A YouTube video that loads only when the reader taps play: until then the page makes no
 * request to YouTube beyond the poster, and the player comes from youtube-nocookie.com.
 */
function VideoBlock({
  youtubeId,
  title,
  caption,
}: Extract<ArticleBlock, { type: "video" }>) {
  const { t } = useLocale();
  const [playing, setPlaying] = useState(false);

  return (
    <figure className="flex flex-col gap-2">
      <div className="relative aspect-video overflow-hidden rounded-2xl bg-foreground">
        {playing ? (
          <iframe
            allowFullScreen
            allow="autoplay; encrypted-media; picture-in-picture"
            className="absolute inset-0 size-full"
            src={`https://www.youtube-nocookie.com/embed/${youtubeId}?autoplay=1&rel=0`}
            title={title}
          />
        ) : (
          <button
            aria-label={t("article.video.play", { title })}
            className="group absolute inset-0 outline-none focus-visible:focus-ring"
            type="button"
            onClick={() => setPlaying(true)}
          >
            <img
              alt=""
              className="size-full object-cover opacity-90"
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
                {t("article.video.source")}
              </span>
            </span>
          </button>
        )}
      </div>
      <figcaption className="text-label text-muted">{caption}</figcaption>
    </figure>
  );
}

const clock = (seconds: number) =>
  `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;

/** Pre-recorded audio (PRD §11: never AI audio), with an ink progress bar. */
function AudioBlock({
  audio,
  title,
  caption,
}: Extract<ArticleBlock, { type: "audio" }>) {
  const { t } = useLocale();
  const ref = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const src = audioUrl(audio);

  useEffect(() => {
    const el = ref.current;

    return () => el?.pause();
  }, []);

  if (!src) return null;

  return (
    <figure className="flex flex-col gap-2">
      <div className="flex items-center gap-3 rounded-2xl bg-surface p-3 shadow-surface">
        <button
          aria-label={t(
            playing ? "article.audio.pause" : "article.audio.play",
            {
              title,
            },
          )}
          className="flex size-12 shrink-0 items-center justify-center rounded-full bg-foreground text-background outline-none transition-transform focus-visible:focus-ring active:scale-95"
          type="button"
          onClick={() =>
            playing ? ref.current?.pause() : void ref.current?.play()
          }
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
          preload="metadata"
          src={src}
          onEnded={() => {
            setPlaying(false);
            setTime(0);
          }}
          onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
          onPause={() => setPlaying(false)}
          onPlay={() => setPlaying(true)}
          onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
        />
      </div>
      <figcaption className="text-label text-muted">{caption}</figcaption>
    </figure>
  );
}

/** One section's content in reading order (C20). */
export function ArticleBlocks({ blocks }: { blocks: ArticleBlock[] }) {
  return blocks.map((block, i) => {
    switch (block.type) {
      case "paragraph":
        return (
          <p key={i} className="text-body">
            {block.text}
          </p>
        );
      case "image":
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
        );
      case "video":
        return <VideoBlock key={i} {...block} />;
      case "audio":
        return <AudioBlock key={i} {...block} />;
    }
  });
}
