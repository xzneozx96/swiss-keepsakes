import { useEffect, useRef } from "react";

import trackUrl from "@/assets/audio/background-swiss-keepsakes.mp3?url";
import {
  getMusic,
  musicControls,
  setMusic,
  useMusic,
} from "@/components/background-music-store";
import { MusicLauncher } from "@/components/music-launcher";
import { MusicSheet } from "@/components/music-sheet";
import { useLocale } from "@/contexts/locale-context";

const FADE_MS = 800;
const GESTURES = ["pointerdown", "keydown", "touchend"] as const;

const reducedMotion = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** True while the guest has started a YouTube embed (its player is cross-origin: no media events reach us). */
const videoEmbedOpen = () =>
  document.querySelector('iframe[src*="youtube"]') !== null;

/**
 * Looping background track for the guest app (owner request, 16.10.2026). Mounted once by
 * GuestShell, which stays mounted across guest routes, so the track never restarts when
 * the guest moves between screens or opens the player sheet.
 *
 * Browsers refuse sound before a gesture: the first play() may reject with NotAllowedError.
 * Then one-shot listeners wait for the first real gesture and start it; nothing is shown.
 * Pause in the player (or on a headset) is the guest's "off": remembered, and never overridden by autoplay.
 * The track yields to a hidden tab and to any other media (story audio, video embeds).
 * `showDock` places the launcher in the trip assistant's slot on screens without that button.
 */
export function BackgroundMusic({ showDock }: { showDock: boolean }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const { stacked } = useMusic();
  const { t } = useLocale();

  useEffect(() => {
    const audio = audioRef.current;

    if (!audio) return;

    const others = new Set<HTMLMediaElement>();
    let fade = 0;
    let armed = false;
    // The track is not requested until the page has finished loading, so it never competes with first paint.
    let ready = false;

    const target = () => {
      const { level, muted } = getMusic();

      return muted ? 0 : level;
    };

    const otherMediaPlaying = () => {
      // An element removed while playing (leaving a story) never sends a pause event we can hear.
      for (const el of others) {
        if (!el.isConnected || el.paused || el.ended) others.delete(el);
      }

      return others.size > 0 || videoEmbedOpen();
    };

    const fadeTo = (goal: number, done?: () => void) => {
      clearInterval(fade);
      if (reducedMotion() || document.hidden) {
        audio.volume = goal;
        done?.();

        return;
      }
      const from = audio.volume;
      const ms = (FADE_MS * Math.abs(goal - from)) / (getMusic().level || 1);
      const start = performance.now();

      // A timer, not requestAnimationFrame: frames stop in a background or occluded view.
      fade = window.setInterval(() => {
        const k = ms === 0 ? 1 : Math.min(1, (performance.now() - start) / ms);

        audio.volume = from + (goal - from) * k;
        if (k < 1) return;
        clearInterval(fade);
        done?.();
      }, 40);
    };

    const onGesture = (e: Event) => {
      // The player's own controls decide for themselves what a tap means.
      if ((e.target as Element | null)?.closest?.("[data-music-ui]")) return;
      sync();
    };
    const arm = () => {
      if (armed) return;
      armed = true;
      for (const type of GESTURES)
        document.addEventListener(type, onGesture, {
          capture: true,
          passive: true,
        });
    };
    const disarm = () => {
      if (!armed) return;
      armed = false;
      for (const type of GESTURES)
        document.removeEventListener(type, onGesture, { capture: true });
    };

    const wanted = () => {
      return getMusic().enabled && !document.hidden && !otherMediaPlaying();
    };

    const silence = () => audio.pause();

    function sync(force = false) {
      if (!ready && !force) return;
      if (!wanted()) {
        disarm();
        if (!audio!.paused) fadeTo(0, silence);

        return;
      }
      if (!audio!.paused) {
        fadeTo(target());

        return;
      }
      audio!.volume = 0;
      audio!.play().then(
        () => {
          setMusic({ blocked: false });
          disarm();
          // The world may have changed while the request was in flight.
          if (wanted()) fadeTo(target());
          else audio!.pause();
        },
        (error: unknown) => {
          if (
            error instanceof DOMException &&
            error.name === "NotAllowedError"
          ) {
            setMusic({ blocked: true });
            arm();
          }
          // AbortError (paused mid-request) and a missing or broken file stay silent.
        },
      );
    }

    musicControls.audio = audio;
    musicControls.play = () => {
      setMusic({ enabled: true });
      sync(true);
    };
    musicControls.pause = () => {
      setMusic({ enabled: false });
      sync(true);
    };
    musicControls.seek = (seconds) => {
      audio.currentTime = seconds;
    };
    musicControls.setLevel = (level) => {
      setMusic({ level, muted: false });
      clearInterval(fade);
      if (!audio.paused) audio.volume = level;
    };
    musicControls.toggleMute = () => {
      setMusic({ muted: !getMusic().muted });
      clearInterval(fade);
      if (!audio.paused) audio.volume = target();
    };
    musicControls.loadMetadata = () => {
      // Seeking and the length label need the file's header, not the whole file.
      if (Number.isFinite(audio.duration) || !audio.paused) return;
      audio.preload = "metadata";
      audio.load();
    };

    const onMedia = (e: Event) => {
      const el = e.target;

      if (!(el instanceof HTMLMediaElement) || el === audio) return;
      if (e.type === "play") others.add(el);
      else others.delete(el);
      sync();
    };
    const mediaEvents = ["play", "pause", "ended"] as const;
    const onOwnPlayback = () => setMusic({ playing: !audio.paused });
    const onVisibility = () => sync();

    // Lock-screen and headset controls go through the same paths as the sheet, so they persist the same way.
    const session = "mediaSession" in navigator ? navigator.mediaSession : null;
    const skipBy = (delta: number) => {
      if (Number.isFinite(audio.duration))
        audio.currentTime = Math.min(
          Math.max(audio.currentTime + delta, 0),
          audio.duration,
        );
    };
    const handlers: [MediaSessionAction, MediaSessionActionHandler][] = [
      ["play", () => musicControls.play()],
      ["pause", () => musicControls.pause()],
      [
        "seekto",
        (d) => {
          if (typeof d.seekTime === "number") audio.currentTime = d.seekTime;
        },
      ],
      ["seekbackward", (d) => skipBy(-(d.seekOffset ?? 10))],
      ["seekforward", (d) => skipBy(d.seekOffset ?? 10)],
    ];

    if (session) {
      try {
        session.metadata = new MediaMetadata({
          title: "A Little of You",
          artist: "bachhac",
        });
      } catch {
        // No MediaMetadata: the controls still work without a title.
      }
      for (const [action, handler] of handlers) {
        try {
          session.setActionHandler(action, handler);
        } catch {
          // An action this browser does not know.
        }
      }
    }

    for (const type of mediaEvents)
      document.addEventListener(type, onMedia, true);
    audio.addEventListener("play", onOwnPlayback);
    audio.addEventListener("pause", onOwnPlayback);
    document.addEventListener("visibilitychange", onVisibility);
    // Catches an embed opening or a player leaving the page, neither of which fires on document.
    let frame = 0;
    const observer = new MutationObserver(() => {
      clearTimeout(frame);
      frame = window.setTimeout(() => {
        if (!armed && wanted() === audio.paused) sync();
      }, 50);
    });

    observer.observe(document.body, { childList: true, subtree: true });

    let idle = 0;
    const begin = () => {
      idle = window.setTimeout(() => {
        ready = true;
        sync();
      }, 300);
    };

    if (document.readyState === "complete") begin();
    else window.addEventListener("load", begin, { once: true });

    return () => {
      for (const type of mediaEvents)
        document.removeEventListener(type, onMedia, true);
      audio.removeEventListener("play", onOwnPlayback);
      audio.removeEventListener("pause", onOwnPlayback);
      document.removeEventListener("visibilitychange", onVisibility);
      if (session) {
        session.metadata = null;
        for (const [action] of handlers) {
          try {
            session.setActionHandler(action, null);
          } catch {
            // An action this browser does not know.
          }
        }
      }
      window.removeEventListener("load", begin);
      observer.disconnect();
      clearTimeout(idle);
      clearTimeout(frame);
      clearInterval(fade);
      disarm();
      audio.pause();
      Object.assign(musicControls, {
        audio: null,
        play: () => {},
        pause: () => {},
        seek: () => {},
        setLevel: () => {},
        toggleMute: () => {},
        loadMetadata: () => {},
      });
    };
  }, []);

  return (
    <>
      {/* Decorative loop with no speech: captions do not apply. */}
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <audio
        ref={audioRef}
        loop
        aria-label={t("music.title")}
        preload="none"
        src={trackUrl}
      />
      <MusicSheet />
      {showDock && stacked === 0 && (
        <div className="pointer-events-none fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom,0px)+72px)] z-20 mx-auto flex max-w-[430px] justify-end px-4">
          <MusicLauncher />
        </div>
      )}
    </>
  );
}
