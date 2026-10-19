import { useEffect } from 'react'

import {
  getMusic,
  setMusic,
  useMusic,
} from '@/components/background-music-store'
import { MusicIcon } from '@/components/icons'
import { useLocale } from '@/contexts/locale-context'

/**
 * Round trigger that opens the music player sheet. Stacked on the trip assistant button
 * (`stacked`) or alone in its slot; the shell hides its own copy while one is stacked.
 * Ink like the assistant button it replaced; while the track plays the icon fills. Still, so
 * there is nothing to animate and nothing for prefers-reduced-motion to switch off.
 */
export function MusicLauncher({ stacked = false }: { stacked?: boolean }) {
  const { t } = useLocale()
  const { playing, sheetOpen } = useMusic()

  useEffect(() => {
    if (!stacked)
      return
    setMusic({ stacked: getMusic().stacked + 1 })

    return () => setMusic({ stacked: getMusic().stacked - 1 })
  }, [stacked])

  return (
    <button
      data-music-ui
      aria-expanded={sheetOpen}
      aria-haspopup="dialog"
      aria-label={t('music.title')}
      className="pointer-events-auto mr-1 flex size-12 items-center justify-center rounded-full bg-foreground text-background shadow-overlay outline-none transition-transform focus-visible:focus-ring active:scale-95"
      type="button"
      onClick={() => setMusic({ sheetOpen: true })}
    >
      <MusicIcon
        aria-hidden
        size={22}
        weight={playing ? 'Filled' : 'Outline'}
      />
    </button>
  )
}
