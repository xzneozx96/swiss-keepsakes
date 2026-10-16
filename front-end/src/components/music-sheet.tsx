import { Drawer } from "@heroui/react";
import { useEffect, useState } from "react";

import {
  musicControls,
  setMusic,
  useMusic,
} from "@/components/background-music-store";
import {
  BackTenIcon,
  ForwardTenIcon,
  MusicIcon,
  MusicOffIcon,
  MusicOnIcon,
  PauseIcon,
  PlayIcon,
} from "@/components/icons";
import { useLocale } from "@/contexts/locale-context";

const SEEK_STEP = 5;
const SKIP_SECONDS = 10;

const clock = (seconds: number) =>
  Number.isFinite(seconds)
    ? `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`
    : "–:–";

/**
 * The two sliders: a slim 4px track filled with `--range-color`, drawn on the native range input so
 * touch, mouse and keys come for free. The input is 44px tall for the touch target; the thumb shows
 * on hover, drag and keyboard focus only.
 */
const rangeClass =
  "h-11 w-full cursor-pointer appearance-none bg-transparent outline-none disabled:cursor-default disabled:opacity-40 focus-visible:focus-ring rounded-full " +
  "[&::-webkit-slider-runnable-track]:h-1 [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-runnable-track]:bg-[linear-gradient(to_right,var(--range-color)_var(--fill),var(--default)_var(--fill))] " +
  "[&::-webkit-slider-thumb]:-mt-[5px] [&::-webkit-slider-thumb]:size-3.5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-0 [&::-webkit-slider-thumb]:bg-[var(--range-color)] [&::-webkit-slider-thumb]:shadow-surface " +
  "[&::-webkit-slider-thumb]:scale-0 [&::-webkit-slider-thumb]:transition-transform motion-reduce:[&::-webkit-slider-thumb]:transition-none " +
  "hover:[&::-webkit-slider-thumb]:scale-100 active:[&::-webkit-slider-thumb]:scale-100 focus-visible:[&::-webkit-slider-thumb]:scale-100 " +
  "[&::-moz-range-track]:h-1 [&::-moz-range-track]:rounded-full [&::-moz-range-track]:bg-default [&::-moz-range-progress]:h-1 [&::-moz-range-progress]:rounded-full [&::-moz-range-progress]:bg-[var(--range-color)] " +
  "[&::-moz-range-thumb]:size-3.5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-[var(--range-color)] " +
  "[&::-moz-range-thumb]:scale-0 hover:[&::-moz-range-thumb]:scale-100 active:[&::-moz-range-thumb]:scale-100 focus-visible:[&::-moz-range-thumb]:scale-100";

function Range({
  label,
  value,
  max,
  valueText,
  disabled,
  step = "any",
  color = "var(--accent)",
  onChange,
  onStep,
}: {
  label: string;
  value: number;
  max: number;
  valueText: string;
  disabled?: boolean;
  step?: number | "any";
  color?: string;
  onChange: (value: number) => void;
  /** Arrow key presses; without it the range keeps its own key handling. */
  onStep?: (direction: 1 | -1) => void;
}) {
  const fill = max > 0 ? `${Math.min(100, (value / max) * 100)}%` : "0%";

  return (
    <input
      aria-label={label}
      aria-valuetext={valueText}
      className={rangeClass}
      disabled={disabled}
      max={max}
      min={0}
      step={step}
      style={{ "--fill": fill, "--range-color": color } as React.CSSProperties}
      type="range"
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      onKeyDown={(e) => {
        // Arrow keys move by a useful amount (5 s) instead of the range's default sliver.
        const dir =
          e.key === "ArrowRight" || e.key === "ArrowUp"
            ? 1
            : e.key === "ArrowLeft" || e.key === "ArrowDown"
              ? -1
              : 0;

        if (!dir || !onStep) return;
        e.preventDefault();
        onStep(dir);
      }}
    />
  );
}

/** Jump by `delta` seconds, kept inside the track; nothing happens before its length is known. */
function skip(delta: number) {
  const audio = musicControls.audio;

  if (!audio || !Number.isFinite(audio.duration)) return;
  musicControls.seek(
    Math.min(Math.max(audio.currentTime + delta, 0), audio.duration),
  );
}

export function MusicSheet() {
  const { t } = useLocale();
  const { enabled, blocked, sheetOpen } = useMusic();
  const active = enabled && !blocked;
  const status = !enabled ? "paused" : blocked ? "blocked" : "playing";

  useEffect(() => {
    if (sheetOpen) musicControls.loadMetadata();
  }, [sheetOpen]);

  return (
    <Drawer.Backdrop
      isOpen={sheetOpen}
      onOpenChange={(open) => setMusic({ sheetOpen: open })}
    >
      <Drawer.Content className="mx-auto max-w-[430px]" placement="bottom">
        <Drawer.Dialog data-music-ui className="flex sheet-max flex-col">
          <Drawer.Handle />
          <Drawer.Header className="flex items-center justify-between">
            <Drawer.Heading className="font-serif text-title">
              {t("music.title")}
            </Drawer.Heading>
            <Drawer.CloseTrigger aria-label={t("music.close")} />
          </Drawer.Header>
          <Drawer.Body className="flex flex-col gap-5 overflow-y-auto pb-[calc(env(safe-area-inset-bottom,0px)+24px)]">
            {/* Cover art: a Swiss-red gradient and a large note, in place of artwork the track does not have. */}
            <div
              aria-hidden
              className="mx-auto flex aspect-square w-[60%] max-w-[260px] items-center justify-center rounded-2xl bg-[radial-gradient(circle_at_28%_22%,color-mix(in_oklab,var(--accent)_70%,white),transparent_60%),linear-gradient(150deg,var(--accent),color-mix(in_oklab,var(--accent)_62%,var(--foreground)))] text-accent-foreground shadow-overlay"
            >
              <MusicIcon size={88} weight="Filled" />
            </div>

            <div className="flex flex-col gap-0.5">
              <span className="font-serif text-2xl leading-tight text-foreground">
                A Little of You
              </span>
              <span className="text-sm text-muted">bachhac</span>
              <span aria-live="polite" className="text-sm text-muted">
                {t(`music.status.${status}`)}
              </span>
            </div>

            <SeekBar />

            <div className="grid grid-cols-3 items-center justify-items-center">
              <button
                aria-label={t("music.back")}
                className="flex size-12 items-center justify-center rounded-full text-foreground outline-none transition-transform focus-visible:focus-ring active:scale-95"
                type="button"
                onClick={() => skip(-SKIP_SECONDS)}
              >
                <BackTenIcon aria-hidden size={30} />
              </button>
              <button
                aria-label={t(active ? "music.pause" : "music.play")}
                className="flex size-16 items-center justify-center rounded-full bg-accent text-accent-foreground outline-none transition-transform focus-visible:focus-ring active:scale-95"
                type="button"
                onClick={() =>
                  active ? musicControls.pause() : musicControls.play()
                }
              >
                {active ? (
                  <PauseIcon aria-hidden size={30} weight="Filled" />
                ) : (
                  <PlayIcon aria-hidden size={30} weight="Filled" />
                )}
              </button>
              <button
                aria-label={t("music.forward")}
                className="flex size-12 items-center justify-center rounded-full text-foreground outline-none transition-transform focus-visible:focus-ring active:scale-95"
                type="button"
                onClick={() => skip(SKIP_SECONDS)}
              >
                <ForwardTenIcon aria-hidden size={30} />
              </button>
            </div>

            <VolumeRow />
          </Drawer.Body>
        </Drawer.Dialog>
      </Drawer.Content>
    </Drawer.Backdrop>
  );
}

/** Position slider with m:ss labels; keeps up with the audio element without re-rendering anything else. */
function SeekBar() {
  const { t, intlLocale } = useLocale();
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(NaN);

  useEffect(() => {
    const audio = musicControls.audio;

    if (!audio) return;
    const read = () => {
      setTime(audio.currentTime);
      setDuration(audio.duration);
    };
    const events = [
      "timeupdate",
      "durationchange",
      "loadedmetadata",
      "seeked",
    ] as const;

    read();
    for (const type of events) audio.addEventListener(type, read);

    return () => {
      for (const type of events) audio.removeEventListener(type, read);
    };
  }, []);

  const known = Number.isFinite(duration) && duration > 0;
  const spoken = (seconds: number) => {
    const unit = (n: number, u: "minute" | "second") =>
      new Intl.NumberFormat(intlLocale, {
        style: "unit",
        unit: u,
        unitDisplay: "long",
      }).format(n);

    return `${unit(Math.floor(seconds / 60), "minute")} ${unit(Math.floor(seconds % 60), "second")}`;
  };

  return (
    <div className="flex flex-col">
      <Range
        disabled={!known}
        label={t("music.seek")}
        max={known ? duration : 0}
        value={Math.min(time, known ? duration : 0)}
        valueText={t("music.time.of", {
          current: spoken(time),
          total: known ? spoken(duration) : "–",
        })}
        onChange={(v) => {
          setTime(v);
          musicControls.seek(v);
        }}
        onStep={(dir) => {
          const next = Math.min(Math.max(time + dir * SEEK_STEP, 0), duration);

          setTime(next);
          musicControls.seek(next);
        }}
      />
      <div className="flex justify-between text-xs text-muted tabular-nums">
        <span>{clock(time)}</span>
        <span>{clock(duration)}</span>
      </div>
    </div>
  );
}

function VolumeRow() {
  const { t, intlLocale } = useLocale();
  const { level, muted } = useMusic();
  const shown = muted ? 0 : Math.round(level * 100);

  return (
    <div className="flex items-center gap-2">
      <button
        aria-label={t(muted ? "music.unmute" : "music.mute")}
        className="flex size-11 shrink-0 items-center justify-center rounded-full text-muted outline-none transition-transform focus-visible:focus-ring active:scale-95"
        type="button"
        onClick={() => musicControls.toggleMute()}
      >
        {muted ? (
          <MusicOffIcon aria-hidden size={20} />
        ) : (
          <MusicOnIcon aria-hidden size={20} />
        )}
      </button>
      <Range
        color="var(--foreground)"
        label={t("music.volume")}
        max={100}
        step={1}
        value={shown}
        valueText={new Intl.NumberFormat(intlLocale, {
          style: "percent",
        }).format(shown / 100)}
        onChange={(v) => musicControls.setLevel(v / 100)}
      />
    </div>
  );
}
