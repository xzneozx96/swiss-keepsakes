import { useEffect } from "react";

import {
  getMusic,
  setMusic,
  useMusic,
} from "@/components/background-music-store";
import { MusicIcon } from "@/components/icons";
import { useLocale } from "@/contexts/locale-context";

/**
 * Round trigger that opens the music player sheet. Stacked on the trip assistant button
 * (`stacked`) or alone in its slot; the shell hides its own copy while one is stacked.
 * While the track plays the button takes a soft accent tint: still, so there is nothing to
 * animate and nothing for prefers-reduced-motion to switch off.
 */
export function MusicLauncher({ stacked = false }: { stacked?: boolean }) {
  const { t } = useLocale();
  const { playing, sheetOpen } = useMusic();

  useEffect(() => {
    if (!stacked) return;
    setMusic({ stacked: getMusic().stacked + 1 });

    return () => setMusic({ stacked: getMusic().stacked - 1 });
  }, [stacked]);

  return (
    <button
      data-music-ui
      aria-expanded={sheetOpen}
      aria-haspopup="dialog"
      aria-label={t("music.title")}
      className={`pointer-events-auto mr-1 flex size-12 items-center justify-center rounded-full shadow-overlay outline-none transition-transform focus-visible:focus-ring active:scale-95 ${
        playing
          ? "bg-[color-mix(in_oklab,var(--accent)_14%,var(--surface))] text-accent"
          : "bg-surface text-foreground"
      }`}
      type="button"
      onClick={() => setMusic({ sheetOpen: true })}
    >
      <MusicIcon
        aria-hidden
        size={22}
        weight={playing ? "Filled" : "Outline"}
      />
    </button>
  );
}
