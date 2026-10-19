import { Modal } from "@heroui/react";
import { useCallback, useRef, useState } from "react";

import {
  ChevronLeftIcon,
  ChevronRightIcon,
  CloseIcon,
} from "@/components/icons";
import { photoUrl } from "@/lib/photos";

export interface PhotoGalleryLabels {
  /** Carousel name, e.g. "Photos of Kapellbrücke pocket knife". */
  gallery: string;
  /** "Photo {n} of {count}" for each slide; also opens the viewer. */
  photo: (n: number, count: number) => string;
  previous: string;
  next: string;
  close: string;
}

interface PhotoGalleryProps {
  photos: string[];
  labels: PhotoGalleryLabels;
  className?: string;
  /** Overlays on the top of the gallery (back, heart, cart); positioned by the caller. */
  children?: React.ReactNode;
}

const trackClass =
  "flex size-full snap-x snap-mandatory overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden";

/** Index of the slide that fills the scroller, from its scroll position. */
const slideIndex = (el: HTMLElement) =>
  Math.round(el.scrollLeft / Math.max(1, el.clientWidth));

/**
 * Detail-page photo gallery for every kind of listing (gifts, tours, stays): swipe
 * between photos (native scroll snap) with an "n / N" counter, and tap a photo to
 * view all of them fullscreen (Airbnb pattern). Arrow buttons serve mouse and keyboard.
 */
export function PhotoGallery({
  photos,
  labels,
  className = "",
  children,
}: PhotoGalleryProps) {
  const [index, setIndex] = useState(0);
  const [viewerAt, setViewerAt] = useState<number | null>(null);
  const count = photos.length;

  return (
    <div
      aria-label={labels.gallery}
      aria-roledescription="carousel"
      className={`relative overflow-hidden bg-gradient-to-b from-hero-sky via-hero-cream to-surface-tertiary ${className}`}
      role="region"
    >
      {/* Overlays come first so Back and the other actions lead the tab order. */}
      {children}
      <div
        className={trackClass}
        onScroll={(e) => setIndex(slideIndex(e.currentTarget))}
      >
        {photos.map((slug, i) => (
          <button
            key={slug}
            aria-label={labels.photo(i + 1, count)}
            className="relative size-full shrink-0 snap-center outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-inset"
            type="button"
            onClick={() => setViewerAt(i)}
          >
            <img
              alt=""
              className="absolute inset-0 size-full object-cover"
              decoding="async"
              loading={i === 0 ? "eager" : "lazy"}
              src={photoUrl(slug)}
            />
          </button>
        ))}
      </div>
      {count > 1 && (
        <span
          aria-hidden
          className="pill pointer-events-none absolute end-4 bottom-10 rounded-lg px-2.5 py-1 text-xs font-medium tabular-nums"
        >
          {index + 1} / {count}
        </span>
      )}

      <PhotoViewer
        labels={labels}
        photos={photos}
        startAt={viewerAt}
        onClose={() => setViewerAt(null)}
      />
    </div>
  );
}

/**
 * Fullscreen photo viewer (Modal size full): swipe or use the arrows; Escape closes.
 * Opens on `startAt`; null keeps it closed. Also used for guest photos in reviews.
 */
export function PhotoViewer({
  photos,
  labels,
  startAt,
  onClose,
}: {
  photos: string[];
  labels: PhotoGalleryLabels;
  startAt: number | null;
  onClose: () => void;
}) {
  const [index, setIndex] = useState(startAt ?? 0);
  const trackRef = useRef<HTMLDivElement>(null);
  const count = photos.length;

  const goTo = (i: number) =>
    trackRef.current?.scrollTo({
      left: i * trackRef.current.clientWidth,
      behavior: "smooth",
    });

  // Jump to the tapped photo once the track is in the DOM. Stable per opening, so
  // re-renders while swiping never pull the track back.
  const attachTrack = useCallback(
    (el: HTMLDivElement | null) => {
      trackRef.current = el;
      if (el && startAt !== null) {
        el.scrollLeft = startAt * el.clientWidth;
        setIndex(startAt);
      }
    },
    [startAt],
  );

  const arrow =
    "glass absolute top-1/2 hidden size-11 -translate-y-1/2 items-center justify-center rounded-full outline-none focus-visible:focus-ring disabled:opacity-0 sm:flex";

  return (
    <Modal.Backdrop
      className="bg-black"
      isOpen={startAt !== null}
      onOpenChange={(open) => !open && onClose()}
    >
      <Modal.Container size="full">
        <Modal.Dialog
          aria-label={labels.gallery}
          className="relative flex size-full flex-col bg-black p-0 text-white"
        >
          <div className="flex h-14 shrink-0 items-center justify-between px-4 pt-[env(safe-area-inset-top,0px)]">
            <button
              aria-label={labels.close}
              className="glass flex size-11 items-center justify-center rounded-full outline-none focus-visible:focus-ring"
              type="button"
              onClick={onClose}
            >
              <CloseIcon size={22} />
            </button>
            <span
              aria-live="polite"
              className="text-sm font-medium tabular-nums"
            >
              {labels.photo(index + 1, count)}
            </span>
            <span className="size-11" />
          </div>
          <div className="relative min-h-0 flex-1">
            <div
              ref={attachTrack}
              className={trackClass}
              onScroll={(e) => setIndex(slideIndex(e.currentTarget))}
            >
              {photos.map((slug) => (
                <div
                  key={slug}
                  className="flex size-full shrink-0 snap-center items-center justify-center"
                >
                  <img
                    alt=""
                    className="max-h-full max-w-full object-contain"
                    decoding="async"
                    loading="lazy"
                    src={photoUrl(slug)}
                  />
                </div>
              ))}
            </div>
            <button
              aria-label={labels.previous}
              className={`${arrow} start-4`}
              disabled={index === 0}
              type="button"
              onClick={() => goTo(index - 1)}
            >
              <ChevronLeftIcon size={22} />
            </button>
            <button
              aria-label={labels.next}
              className={`${arrow} end-4`}
              disabled={index === count - 1}
              type="button"
              onClick={() => goTo(index + 1)}
            >
              <ChevronRightIcon size={22} />
            </button>
          </div>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}
