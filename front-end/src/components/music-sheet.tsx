import { Drawer } from "@heroui/react";
import { useEffect, useState } from "react";

import coverUrl from "@/assets/audio/background-swiss-keepsakes-cover.jpg?url";
import {
  musicControls,
  setMusic,
  useMusic,
} from "@/components/background-music-store";
import { PauseIcon, PlayIcon } from "@/components/icons";
import { useLocale } from "@/contexts/locale-context";

const SEEK_STEP = 5;

const clock = (seconds: number) =>
  Number.isFinite(seconds)
    ? `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`
    : "–:–";

/**
 * The position slider: a slim 4px track filled with `--range-color`, drawn on the native range input so
 * touch, mouse and keys come for free. The input is 44px tall for the touch target; the thumb is
 * always shown, since a touch screen has no hover to reveal it.
 */
const rangeClass =
  "h-11 w-full cursor-pointer appearance-none bg-transparent outline-none disabled:cursor-default disabled:opacity-40 focus-visible:focus-ring rounded-full " +
  "[&::-webkit-slider-runnable-track]:h-1 [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-runnable-track]:bg-[linear-gradient(to_right,var(--range-color)_var(--fill),var(--default)_var(--fill))] " +
  "[&::-webkit-slider-thumb]:-mt-[5px] [&::-webkit-slider-thumb]:size-3.5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-0 [&::-webkit-slider-thumb]:bg-[var(--range-color)] [&::-webkit-slider-thumb]:shadow-surface " +
  "[&::-moz-range-track]:h-1 [&::-moz-range-track]:rounded-full [&::-moz-range-track]:bg-default [&::-moz-range-progress]:h-1 [&::-moz-range-progress]:rounded-full [&::-moz-range-progress]:bg-[var(--range-color)] " +
  "[&::-moz-range-thumb]:size-3.5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-[var(--range-color)]";

function Range({
  label,
  value,
  max,
  valueText,
  disabled,
  step = "any",
  onChange,
  onStep,
}: {
  label: string;
  value: number;
  max: number;
  valueText: string;
  disabled?: boolean;
  step?: number | "any";
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
      style={
        {
          "--fill": fill,
          "--range-color": "var(--accent)",
        } as React.CSSProperties
      }
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
          <Drawer.Header className="flex items-center justify-end">
            <Drawer.Heading className="sr-only">
              {t("music.title")}
            </Drawer.Heading>
            <Drawer.CloseTrigger aria-label={t("music.close")} />
          </Drawer.Header>
          <Drawer.Body className="flex flex-col gap-3 overflow-y-auto pb-[calc(env(safe-area-inset-bottom,0px)+20px)]">
            <div className="flex items-center gap-3">
              <img
                alt=""
                className="size-16 shrink-0 rounded-xl object-cover shadow-sm"
                height={64}
                src={coverUrl}
                width={64}
              />
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="truncate font-serif text-lg leading-tight text-foreground">
                  Swiss Keepsakes
                </span>
                <span className="text-sm leading-snug text-muted">
                  {t("music.description")}
                </span>
                <span aria-live="polite" className="sr-only">
                  {t(`music.status.${status}`)}
                </span>
              </div>
              <button
                aria-label={t(active ? "music.pause" : "music.play")}
                className="flex size-12 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground outline-none transition-transform focus-visible:focus-ring active:scale-95"
                type="button"
                onClick={() =>
                  active ? musicControls.pause() : musicControls.play()
                }
              >
                {active ? (
                  <PauseIcon aria-hidden size={24} weight="Filled" />
                ) : (
                  <PlayIcon aria-hidden size={24} weight="Filled" />
                )}
              </button>
            </div>

            <SeekBar />
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
